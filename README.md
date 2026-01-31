# 🐉 Dragon's Riddle Vault

Onchain riddle game where the Dragon poses riddles and brave solvers compete for treasure.

## How It Works

1. **Dragon Creates Riddles** - The Dragon (contract owner) posts riddles with ETH prizes
2. **Solvers Attempt Answers** - Anyone can pay the attempt fee and try to solve
3. **Correct Answer Wins** - First solver with the correct answer claims the entire pot (prize + all attempt fees)
4. **Failed Attempts Build Pot** - Every wrong answer adds to the treasure hoard
5. **Unsolved Riddles Return** - If no one solves before deadline, Dragon reclaims the treasure

## Features

- ✅ Case-insensitive answer matching (trimmed and lowercased)
- ✅ Configurable attempt fees (can be 0 for free riddles)
- ✅ Time-limited riddles (1 hour to 30 days)
- ✅ Hint system - Dragon can add hints over time
- ✅ Dragon's cut - Small % of attempt fees goes to treasury (default 5%)
- ✅ Reentrancy protected
- ✅ Fully tested

## Usage

### For the Dragon (Contract Owner)

```solidity
// Create a riddle
// Answer: "fire" → hash with: keccak256(abi.encodePacked("fire"))
bytes32 answerHash = 0x...;
vault.createRiddle{value: 0.1 ether}(
    "I dance but have no legs, I breathe but have no lungs. What am I?",
    answerHash,
    0.001 ether,  // attempt fee
    1 days        // duration
);

// Add a hint
vault.addHint(0, "Think about what keeps you warm");

// Reclaim unsolved riddle after deadline
vault.reclaimPrize(0);
```

### For Solvers

```solidity
// Check the riddle
(string question, uint256 prize, uint256 fee, uint256 deadline, 
 bool solved, address winner, string[] hints, uint256 attempts) = vault.getRiddle(0);

// Attempt to solve
vault.solve{value: 0.001 ether}(0, "fire");

// Helper: verify your answer hash matches
bytes32 myHash = vault.hashAnswer("fire");
```

## Development

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to Base Sepolia
export PRIVATE_KEY=your_private_key
export BASESCAN_API_KEY=your_api_key
npm run deploy:sepolia

# Deploy to Base mainnet
npm run deploy:base
```

## Contract Architecture

```
DragonsRiddleVault
├── Riddle Creation (owner only)
│   ├── createRiddle() - Post riddle with prize
│   └── addHint() - Add hints to active riddles
├── Solving (anyone)
│   └── solve() - Submit answer and pay fee
├── Reclaim (owner only)
│   └── reclaimPrize() - Claim expired riddles
└── Views
    ├── getRiddle() - Full riddle info
    ├── getActiveRiddles() - List of unsolved riddles
    └── hashAnswer() - Helper to hash answers
```

## Security Considerations

- **Brute Force Prevention**: Use complex answers (phrases, not single words)
- **MEV Protection**: Consider commit-reveal in v2 for high-value riddles
- **Answer Entropy**: The Dragon should craft riddles with non-obvious answers

## Deployed Contracts

| Network | Address |
|---------|---------|
| Base Sepolia | *Coming soon* |
| Base | *Coming soon* |

## Author

Built by [Dragon Bot Z](https://x.com/Dragon_Bot_Z) 🐉

*Part of the dragon's eternal quest to challenge brave adventurers.*
