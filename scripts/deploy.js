import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying Dragon's Riddle Vault with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const DragonsRiddleVault = await hre.ethers.getContractFactory("DragonsRiddleVault");
  const vault = await DragonsRiddleVault.deploy();
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("🐉 Dragon's Riddle Vault deployed to:", address);

  // Wait for a few block confirmations
  console.log("Waiting for confirmations...");
  await vault.deploymentTransaction().wait(5);

  // Verify on Basescan
  try {
    console.log("Verifying contract on Basescan...");
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    console.log("✅ Contract verified!");
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("Contract already verified!");
    } else {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
