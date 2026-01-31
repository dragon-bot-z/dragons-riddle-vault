// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Dragon's Riddle Vault
 * @author Dragon Bot Z 🐉
 * @notice Onchain riddle game where the dragon poses riddles and brave solvers compete for treasure
 * @dev Answer verification uses keccak256(lowercase(trim(answer))) for case-insensitive matching
 */
contract DragonsRiddleVault is Ownable, ReentrancyGuard {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event RiddleCreated(
        uint256 indexed riddleId,
        string question,
        uint256 prize,
        uint256 attemptFee,
        uint256 deadline
    );
    
    event AttemptMade(
        uint256 indexed riddleId,
        address indexed solver,
        bool correct
    );
    
    event RiddleSolved(
        uint256 indexed riddleId,
        address indexed winner,
        string answer,
        uint256 reward
    );
    
    event RiddleReclaimed(
        uint256 indexed riddleId,
        uint256 amount
    );
    
    event HintAdded(
        uint256 indexed riddleId,
        string hint,
        uint256 hintIndex
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct Riddle {
        string question;
        bytes32 answerHash;     // keccak256(normalized answer)
        uint256 prize;          // Initial prize from dragon
        uint256 attemptFees;    // Accumulated fees from attempts
        uint256 attemptFee;     // Fee per attempt
        uint256 deadline;       // Unix timestamp when riddle expires
        address winner;         // Address of solver (zero if unsolved)
        bool solved;            // Whether riddle has been solved
        bool reclaimed;         // Whether prize was reclaimed after expiry
        string[] hints;         // Optional hints added over time
        uint256 attemptCount;   // Total attempts made
    }
    
    mapping(uint256 => Riddle) public riddles;
    uint256 public riddleCount;
    
    // Dragon's cut of attempt fees (in basis points, e.g., 500 = 5%)
    uint256 public dragonCut = 500; // 5% default
    uint256 public constant MAX_DRAGON_CUT = 2000; // 20% max
    
    // Track attempts per riddle per address
    mapping(uint256 => mapping(address => uint256)) public attempts;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor() Ownable(msg.sender) {}
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DRAGON FUNCTIONS (Owner)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a new riddle with a prize
     * @param question The riddle question
     * @param answerHash keccak256 hash of the normalized answer
     * @param attemptFee Fee required for each attempt (can be 0)
     * @param duration How long the riddle is active (in seconds)
     */
    function createRiddle(
        string calldata question,
        bytes32 answerHash,
        uint256 attemptFee,
        uint256 duration
    ) external payable onlyOwner returns (uint256 riddleId) {
        require(msg.value > 0, "Must provide prize");
        require(bytes(question).length > 0, "Question cannot be empty");
        require(duration >= 1 hours, "Duration too short");
        require(duration <= 30 days, "Duration too long");
        
        riddleId = riddleCount++;
        
        Riddle storage riddle = riddles[riddleId];
        riddle.question = question;
        riddle.answerHash = answerHash;
        riddle.prize = msg.value;
        riddle.attemptFee = attemptFee;
        riddle.deadline = block.timestamp + duration;
        
        emit RiddleCreated(riddleId, question, msg.value, attemptFee, riddle.deadline);
    }
    
    /**
     * @notice Add a hint to an existing riddle
     * @param riddleId The riddle to add hint to
     * @param hint The hint text
     */
    function addHint(uint256 riddleId, string calldata hint) external onlyOwner {
        Riddle storage riddle = riddles[riddleId];
        require(!riddle.solved, "Already solved");
        require(block.timestamp < riddle.deadline, "Riddle expired");
        require(bytes(hint).length > 0, "Hint cannot be empty");
        
        riddle.hints.push(hint);
        emit HintAdded(riddleId, hint, riddle.hints.length - 1);
    }
    
    /**
     * @notice Reclaim prize from unsolved expired riddle
     * @param riddleId The riddle to reclaim from
     */
    function reclaimPrize(uint256 riddleId) external onlyOwner nonReentrant {
        Riddle storage riddle = riddles[riddleId];
        require(!riddle.solved, "Riddle was solved");
        require(!riddle.reclaimed, "Already reclaimed");
        require(block.timestamp > riddle.deadline, "Riddle not expired");
        
        riddle.reclaimed = true;
        uint256 total = riddle.prize + riddle.attemptFees;
        
        emit RiddleReclaimed(riddleId, total);
        
        (bool success,) = owner().call{value: total}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @notice Update the dragon's cut of attempt fees
     * @param newCut New cut in basis points
     */
    function setDragonCut(uint256 newCut) external onlyOwner {
        require(newCut <= MAX_DRAGON_CUT, "Cut too high");
        dragonCut = newCut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SOLVER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Attempt to solve a riddle
     * @param riddleId The riddle to solve
     * @param answer Your answer (will be normalized: lowercase, trimmed)
     * @return correct Whether the answer was correct
     */
    function solve(uint256 riddleId, string calldata answer) 
        external 
        payable 
        nonReentrant 
        returns (bool correct) 
    {
        Riddle storage riddle = riddles[riddleId];
        require(!riddle.solved, "Already solved");
        require(block.timestamp < riddle.deadline, "Riddle expired");
        require(msg.value >= riddle.attemptFee, "Insufficient fee");
        
        riddle.attemptCount++;
        attempts[riddleId][msg.sender]++;
        
        // Add fee to pot
        riddle.attemptFees += msg.value;
        
        // Check answer (normalized)
        bytes32 submittedHash = keccak256(abi.encodePacked(_normalize(answer)));
        correct = (submittedHash == riddle.answerHash);
        
        emit AttemptMade(riddleId, msg.sender, correct);
        
        if (correct) {
            riddle.solved = true;
            riddle.winner = msg.sender;
            
            // Calculate reward: prize + attempt fees (minus dragon's cut of fees)
            uint256 dragonFee = (riddle.attemptFees * dragonCut) / 10000;
            uint256 reward = riddle.prize + riddle.attemptFees - dragonFee;
            
            emit RiddleSolved(riddleId, msg.sender, answer, reward);
            
            // Send dragon's cut
            if (dragonFee > 0) {
                (bool s1,) = owner().call{value: dragonFee}("");
                require(s1, "Dragon fee failed");
            }
            
            // Send winner's reward
            (bool s2,) = msg.sender.call{value: reward}("");
            require(s2, "Reward transfer failed");
        }
        
        // Refund excess payment
        if (msg.value > riddle.attemptFee) {
            uint256 refund = msg.value - riddle.attemptFee;
            riddle.attemptFees -= refund;
            (bool s3,) = msg.sender.call{value: refund}("");
            require(s3, "Refund failed");
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get full riddle info
     */
    function getRiddle(uint256 riddleId) external view returns (
        string memory question,
        uint256 totalPrize,
        uint256 attemptFee,
        uint256 deadline,
        bool solved,
        address winner,
        string[] memory hints,
        uint256 attemptCount
    ) {
        Riddle storage r = riddles[riddleId];
        return (
            r.question,
            r.prize + r.attemptFees,
            r.attemptFee,
            r.deadline,
            r.solved,
            r.winner,
            r.hints,
            r.attemptCount
        );
    }
    
    /**
     * @notice Get all active riddles
     */
    function getActiveRiddles() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < riddleCount; i++) {
            if (!riddles[i].solved && block.timestamp < riddles[i].deadline) {
                count++;
            }
        }
        
        uint256[] memory active = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < riddleCount; i++) {
            if (!riddles[i].solved && block.timestamp < riddles[i].deadline) {
                active[idx++] = i;
            }
        }
        return active;
    }
    
    /**
     * @notice Check if an answer would be correct (for testing)
     * @dev This doesn't reveal the answer, just lets you verify hashing
     */
    function hashAnswer(string calldata answer) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_normalize(answer)));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Normalize a string: lowercase and trim whitespace
     * @dev Only handles ASCII letters (A-Z -> a-z) and trims spaces
     */
    function _normalize(string calldata input) internal pure returns (string memory) {
        bytes memory b = bytes(input);
        
        // Find start (skip leading spaces)
        uint256 start = 0;
        while (start < b.length && b[start] == 0x20) start++;
        
        // Find end (skip trailing spaces)
        uint256 end = b.length;
        while (end > start && b[end - 1] == 0x20) end--;
        
        // Build normalized string
        bytes memory result = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            bytes1 char = b[i];
            // Convert uppercase to lowercase (A=65, Z=90)
            if (char >= 0x41 && char <= 0x5A) {
                result[i - start] = bytes1(uint8(char) + 32);
            } else {
                result[i - start] = char;
            }
        }
        
        return string(result);
    }
}
