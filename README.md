# Sepolia Ticketing System

A Web3 ticketing DApp running on the Sepolia testnet. Purchase, return, and manage event tickets using Ethereum smart contracts.

## Features

- **Create Wallets** — Generate new Ethereum wallets with encrypted keystores for Sepolia testnet
- **Buy Tickets** — Purchase event tickets directly from the smart contract with exact SETH pricing
- **Check Balance** — Query wallet balances and ticket inventory with role-based views (Attendee, Doorman, Vendor)
- **Return Tickets** — Return purchased tickets to the vendor and reclaim funds
- **Wallet Management** — Support for both private key and encrypted keystore file imports

## Project Structure

```
Sepolia-Ticketing-System/
├── contracts/
│   └── TicketingSystem.sol          # ERC-20 smart contract with ticketing features
├── frontend/
│   ├── base-layout.html             # Base template with header, nav, footer (shared across all pages)
│   ├── pages/                       # Page content (injected into base-layout)
│   │   ├── index.html               # Home page
│   │   ├── create-wallet.html       # Wallet generation page
│   │   ├── buy.html                 # Ticket purchase page
│   │   ├── balance.html             # Balance checker page
│   │   └── transfer.html            # Ticket return page
│   ├── js/
│   │   ├── config.js                # Contract ABI, addresses, RPC config
│   │   ├── utils.js                 # Shared utilities (Web3 init, error handling)
│   │   └── pages/                   # Page-specific JavaScript
│   │       ├── create-wallet.js
│   │       ├── buy.js
│   │       ├── balance.js
│   │       └── transfer.js
│   └── css/
│       ├── main.css                 # Global styles
│       └── pages/                   # Page-specific styles
│           ├── create-wallet.css
│           ├── buy.css
│           ├── balance.css
│           └── transfer.css
└── README.md
```

## Quick Start

### 1. Deploy Contract

- Open [Remix IDE](https://remix.ethereum.org)
- Copy `contracts/TicketingSystem.sol` into Remix
- Compile with Solidity ^0.8.20
- Deploy to Sepolia with:
  - `_initialSupply`: e.g., `100` (whole tickets)
  - `_ticketPrice`: e.g., `10000000000000000` (0.01 SETH in wei)

### 2. Update Config

Edit `frontend/js/config.js`:
```javascript
const CONTRACT_ADDRESS = "0x..."; // Your deployed contract
const TICKET_PRICE_WEI = "10000000000000000"; // Must match contract
const RPC_URL = "https://sepolia.drpc.org"; // Sepolia RPC
```

### 3. Serve Frontend

```bash
# Using VS Code Live Server (install extension)
# OR use any local web server:
npx http-server frontend --port 5500 --cors
```

Open `http://localhost:5500/base-layout.html`

## Key Features Explained

### Wallet Loading
Import existing wallets via private key (hex) or encrypted keystore JSON file. Keystores are decrypted in-browser only.

### Buy Tickets
- Load wallet
- Confirm SETH balance
- Send exact ticket price
- Receive token confirmation on success

### Return Tickets
- Load wallet
- Enter quantity (1–your balance)
- Receive refund confirmation
- See updated vendor supply

### Balance Check
Three role views:
- **Attendee**: Your SETH balance + ticket count
- **Doorman**: VALID/INVALID based on ticket presence
- **Vendor**: SETH balance + tickets + unsold supply

## Smart Contract Functions

### Standard ERC-20
- `transfer()`, `approve()`, `transferFrom()`
- `balanceOf()`, `allowance()`, `totalSupply()`

### Ticketing
- `buyTicket()` — Purchase one ticket (payable, exact price only)
- `returnTicket(uint256)` — Return tickets to vendor
- `ticketsRemaining()` — Query unsold supply
- `withdraw()` — Owner withdraws accumulated SETH

## Tech Stack

- **Smart Contract**: Solidity ^0.8.20 (ERC-20 + custom extensions)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Web3**: Web3.js via CDN
- **Testnet**: Sepolia Ethereum
- **RPC**: DRPC (free, public endpoint)

## Architecture

**Base Layout Pattern**: Single `base-layout.html` injects page content, styles, and scripts dynamically. Each page is isolated in `pages/` with no header/footer duplication.

**State Management**: Simple card visibility toggle via CSS `card--hidden` class. Each page has its own state machine.

## Security Notes

- ✅ Private keys never leave the browser
- ✅ Keystores encrypted with password (bcrypt-like scrypt in ethers.js)
- ✅ Smart contract uses reentrancy guard on withdrawal
- ✅ CSP policy restricts scripts to trusted CDN sources
- ⚠️  Sepolia testnet only — do not use with real mainnet

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid BigNumberish" | Constructor params must be wei integers, not decimals |
| "Insufficient balance" | Get SETH from [Sepolia faucet](https://sepoliafaucet.com) |
| "Contract not found" | Check `CONTRACT_ADDRESS` in config.js |
| Transaction rejected | Approve in wallet, try again |

## References

- [Remix IDE](https://remix.ethereum.org)
- [Sepolia Faucet](https://sepoliafaucet.com)
- [Etherscan Sepolia](https://sepolia.etherscan.io)
- [Web3.js Docs](https://web3js.readthedocs.io)
- [ERC-20 Standard](https://eips.ethereum.org/EIPS/eip-20)
