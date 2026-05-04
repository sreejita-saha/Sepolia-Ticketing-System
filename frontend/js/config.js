/**
 * config.js
 * Single source of truth for contract address, ABI, and network config.
 * All pages import from here — never inline these values in page scripts.
 *
 * Update CONTRACT_ADDRESS after each deployment.
 */

"use strict";

// Sepolia testnet chain ID (decimal)
const CHAIN_ID = 11155111;

// Deployed contract address on Sepolia — replace after first deployment
const CONTRACT_ADDRESS = "0x6b3e0817e054e63ea344EDb1eF074ab35b8F40bE";

// Sepolia public JSON-RPC endpoint via Alchemy (CORS-enabled for browser requests)
// For production, replace with your own Alchemy/Infura API key
const RPC_URL = "https://sepolia.drpc.org";

/**
 * Minimal ABI — only the functions the frontend actually calls.
 * Extend this as more contract functions are added.
 *
 * Expected contract functions used by the balance page:
 *   balanceOf(address)          → uint256   ticket token balance
 *   totalSupply()               → uint256   tokens minted so far
 *   maxSupply() / ticketCap()   → uint256   max tokens (remaining = max - total)
 *
 * The SETH balance of an address is read directly from the chain via
 * eth_getBalance — it is not a contract function.
 */
const CONTRACT_ABI = [
  {
    "name": "balanceOf",
    "type": "function",
    "stateMutability": "view",
    "inputs":  [{ "name": "owner", "type": "address" }],
    "outputs": [{ "name": "",      "type": "uint256" }]
  },
  {
    "name": "totalSupply",
    "type": "function",
    "stateMutability": "view",
    "inputs":  [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "ticketCap",
    "type": "function",
    "stateMutability": "view",
    "inputs":  [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "ticketPrice",
    "type": "function",
    "stateMutability": "view",
    "inputs":  [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "ticketsRemaining",
    "type": "function",
    "stateMutability": "view",
    "inputs":  [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "buyTicket",
    "type": "function",
    "stateMutability": "payable",
    "inputs":  [],
    "outputs": []
  }
];
