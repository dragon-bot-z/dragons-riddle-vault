import { expect } from "chai";
import hre from "hardhat";

describe("DragonsRiddleVault", function () {
  let vault;
  let owner;
  let solver1;
  let solver2;

  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;
  const ATTEMPT_FEE = hre.ethers.parseEther("0.001"); // 0.001 ETH
  const PRIZE = hre.ethers.parseEther("0.1"); // 0.1 ETH

  beforeEach(async function () {
    [owner, solver1, solver2] = await hre.ethers.getSigners();
    
    const DragonsRiddleVault = await hre.ethers.getContractFactory("DragonsRiddleVault");
    vault = await DragonsRiddleVault.deploy();
    await vault.waitForDeployment();
  });

  describe("Riddle Creation", function () {
    it("should create a riddle with prize", async function () {
      const question = "What has keys but no locks?";
      const answer = "a keyboard";
      const answerHash = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes(answer.toLowerCase().trim())
      );

      await expect(
        vault.createRiddle(question, answerHash, ATTEMPT_FEE, ONE_DAY, {
          value: PRIZE,
        })
      ).to.emit(vault, "RiddleCreated");

      const riddle = await vault.getRiddle(0);
      expect(riddle.question).to.equal(question);
      expect(riddle.totalPrize).to.equal(PRIZE);
      expect(riddle.attemptFee).to.equal(ATTEMPT_FEE);
      expect(riddle.solved).to.equal(false);
    });

    it("should reject riddle without prize", async function () {
      const answerHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"));
      await expect(
        vault.createRiddle("Question?", answerHash, 0, ONE_DAY, { value: 0 })
      ).to.be.revertedWith("Must provide prize");
    });

    it("should only allow owner to create riddles", async function () {
      const answerHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"));
      await expect(
        vault.connect(solver1).createRiddle("Question?", answerHash, 0, ONE_DAY, {
          value: PRIZE,
        })
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Solving", function () {
    beforeEach(async function () {
      const question = "What has keys but no locks?";
      const answer = "a keyboard";
      const answerHash = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes(answer.toLowerCase().trim())
      );
      await vault.createRiddle(question, answerHash, ATTEMPT_FEE, ONE_DAY, {
        value: PRIZE,
      });
    });

    it("should accept correct answer and pay winner", async function () {
      const balanceBefore = await hre.ethers.provider.getBalance(solver1.address);
      
      const tx = await vault.connect(solver1).solve(0, "A Keyboard", {
        value: ATTEMPT_FEE,
      });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await hre.ethers.provider.getBalance(solver1.address);
      
      // Winner gets prize + attempt fee (minus dragon's 5% cut of fee)
      const dragonCut = (ATTEMPT_FEE * 500n) / 10000n;
      const expectedReward = PRIZE + ATTEMPT_FEE - dragonCut;
      
      expect(balanceAfter - balanceBefore + gasUsed).to.equal(expectedReward - ATTEMPT_FEE);

      const riddle = await vault.getRiddle(0);
      expect(riddle.solved).to.equal(true);
      expect(riddle.winner).to.equal(solver1.address);
    });

    it("should reject incorrect answer but keep fee", async function () {
      const tx = await vault.connect(solver1).solve(0, "wrong answer", {
        value: ATTEMPT_FEE,
      });
      
      const riddle = await vault.getRiddle(0);
      expect(riddle.solved).to.equal(false);
      expect(riddle.totalPrize).to.equal(PRIZE + ATTEMPT_FEE); // Fee added to pot
    });

    it("should handle case-insensitive answers", async function () {
      await expect(
        vault.connect(solver1).solve(0, "  A KEYBOARD  ", { value: ATTEMPT_FEE })
      ).to.emit(vault, "RiddleSolved");
    });

    it("should reject solving already solved riddle", async function () {
      await vault.connect(solver1).solve(0, "a keyboard", { value: ATTEMPT_FEE });
      
      await expect(
        vault.connect(solver2).solve(0, "a keyboard", { value: ATTEMPT_FEE })
      ).to.be.revertedWith("Already solved");
    });

    it("should reject insufficient fee", async function () {
      await expect(
        vault.connect(solver1).solve(0, "a keyboard", { value: 0 })
      ).to.be.revertedWith("Insufficient fee");
    });
  });

  describe("Hints", function () {
    it("should allow owner to add hints", async function () {
      const answerHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"));
      await vault.createRiddle("Question?", answerHash, 0, ONE_DAY, { value: PRIZE });

      await expect(vault.addHint(0, "Think about typing")).to.emit(vault, "HintAdded");

      const riddle = await vault.getRiddle(0);
      expect(riddle.hints.length).to.equal(1);
      expect(riddle.hints[0]).to.equal("Think about typing");
    });
  });

  describe("Reclaim", function () {
    it("should allow reclaim after deadline", async function () {
      const answerHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"));
      await vault.createRiddle("Question?", answerHash, 0, ONE_HOUR, { value: PRIZE });

      // Fast forward past deadline
      await hre.network.provider.send("evm_increaseTime", [ONE_HOUR + 1]);
      await hre.network.provider.send("evm_mine");

      const balanceBefore = await hre.ethers.provider.getBalance(owner.address);
      const tx = await vault.reclaimPrize(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await hre.ethers.provider.getBalance(owner.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(PRIZE);
    });

    it("should reject reclaim before deadline", async function () {
      const answerHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"));
      await vault.createRiddle("Question?", answerHash, 0, ONE_DAY, { value: PRIZE });

      await expect(vault.reclaimPrize(0)).to.be.revertedWith("Riddle not expired");
    });
  });

  describe("Hash Helper", function () {
    it("should correctly hash and normalize answers", async function () {
      const hash1 = await vault.hashAnswer("Test Answer");
      const hash2 = await vault.hashAnswer("  test answer  ");
      const hash3 = await vault.hashAnswer("TEST ANSWER");
      
      expect(hash1).to.equal(hash2);
      expect(hash2).to.equal(hash3);
    });
  });
});
