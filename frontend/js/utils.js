/**
 * utils.js
 * Shared utility functions used across all frontend pages.
 *
 * Provides:
 *   - parseRevertReason(error) — converts blockchain errors to user-friendly messages
 *   - formatEth(weiString) — converts Wei to human-readable ETH
 *   - truncateAddress(address) — shortens addresses to 0x1234…abcd format
 *   - getEtherscanLink(txHash) — generates Etherscan Sepolia tx URL
 *   - clearInputField(element) — securely clears input fields
 */

"use strict";

/**
 * Parses blockchain revert reasons and network errors into user-friendly messages.
 * Handles SETHTicket contract-specific errors and MetaMask/network errors.
 *
 * @param {Error|string} error — the error object or message string
 * @returns {string} — user-friendly error message
 */
function parseRevertReason(error) {
  if (!error) {
    return "An unknown error occurred. Please try again.";
  }

  const errorStr = typeof error === "string" ? error : error.message || String(error);
  const lowerError = errorStr.toLowerCase();

  // Network connection errors
  if (lowerError.includes("network") || lowerError.includes("disconnect") || lowerError.includes("offline")) {
    return "Could not connect to the Sepolia network. Check your internet connection and try again.";
  }

  if (lowerError.includes("net::err") || lowerError.includes("enotfound") || lowerError.includes("econnrefused")) {
    return "Could not connect to the Sepolia network. Check your internet connection and try again.";
  }

  if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
    return "Request timed out. The network may be overloaded. Please try again.";
  }

  // MetaMask / wallet rejections
  if (lowerError.includes("user rejected") || lowerError.includes("user denied") || lowerError.includes("rejected by user")) {
    return "You cancelled the transaction.";
  }

  if (lowerError.includes("user cancelled")) {
    return "You cancelled the transaction.";
  }

  // SETHTicket contract-specific revert reasons
  if (lowerError.includes("incorrect seth amount")) {
    return "The amount you sent does not match the ticket price. Please do not modify the transaction value.";
  }

  if (lowerError.includes("no tickets available from vendor")) {
    return "Sorry, all tickets have been sold.";
  }

  if (lowerError.includes("insufficient token balance")) {
    return "Your wallet does not have enough tickets for this operation.";
  }

  // Generic on-chain reverts
  if (lowerError.includes("sold out")) {
    return "Sorry, all tickets have been sold.";
  }

  if (lowerError.includes("insufficient funds") || lowerError.includes("insufficient balance")) {
    return "Insufficient balance to pay for this transaction and gas fees.";
  }

  if (lowerError.includes("already owns")) {
    return "This wallet already owns a ticket for this event.";
  }

  if (lowerError.includes("paused")) {
    return "Ticket sales are currently paused.";
  }

  if (lowerError.includes("invalid address")) {
    return "The contract address is invalid. Please contact support.";
  }

  if (lowerError.includes("execution reverted")) {
    return "The transaction failed on-chain. Please check your wallet balance and try again.";
  }

  // Fallback: try to extract custom error message from standard revert format
  const revertMatch = errorStr.match(/revert\s+"(.+?)"/i) || errorStr.match(/revert:\s*(.+?)(?:\n|$)/i);
  if (revertMatch && revertMatch[1]) {
    return revertMatch[1].trim();
  }

  // Last resort: generic message
  return "Transaction failed. Please check your connection and try again.";
}

/**
 * Formats a raw Wei value (string) into a human-readable ETH string
 * capped at 6 decimal places, stripping trailing zeros.
 *
 * @param {string} weiString — Wei amount as string
 * @returns {string} — formatted ETH amount
 */
function formatEth(weiString) {
  if (!weiString || weiString === "0") {
    return "0";
  }

  try {
    const web3 = new Web3();
    const eth = parseFloat(web3.utils.fromWei(weiString, "ether"));
    return eth.toFixed(6).replace(/\.?0+$/, "") || "0";
  } catch {
    return "—";
  }
}

/**
 * Truncates an Ethereum address to 0x1234…abcd format for display.
 *
 * @param {string} address — full Ethereum address
 * @returns {string} — truncated address
 */
function truncateAddress(address) {
  if (!address || address.length < 10) {
    return address || "—";
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Generates an Etherscan Sepolia URL for a transaction hash.
 *
 * @param {string} txHash — transaction hash
 * @returns {string} — full Etherscan URL
 */
function getEtherscanLink(txHash) {
  if (!txHash) {
    return "";
  }
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

/**
 * Securely clears an input field's value.
 * Useful for clearing password fields after use.
 *
 * @param {HTMLInputElement} element — the input element to clear
 */
function clearInputField(element) {
  if (!element || !element.value) {
    return;
  }

  element.value = "";
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Validates an Ethereum address format (0x + 40 hex chars).
 * Does not check checksum — accepts both cased variants.
 *
 * @param {string} address — address to validate
 * @returns {boolean} — true if valid format
 */
function isValidEthAddress(address) {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Validates a private key format (0x + 64 hex chars).
 *
 * @param {string} privateKey — private key to validate
 * @returns {boolean} — true if valid format
 */
function isValidPrivateKey(privateKey) {
  return /^0x[0-9a-fA-F]{64}$/.test(privateKey);
}

/**
 * Checks if a string looks like an ENS name (e.g., "vitalik.eth").
 *
 * @param {string} input — string to check
 * @returns {boolean} — true if looks like ENS name
 */
function looksLikeEnsName(input) {
  return /\.eth$/.test(input.toLowerCase());
}

/**
 * Creates a timeout promise that rejects after a specified duration.
 *
 * @param {number} ms — milliseconds to wait
 * @returns {Promise} — promise that rejects after timeout
 */
function createTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Wraps a promise with a timeout using Promise.race.
 *
 * @param {Promise} promise — the promise to wrap
 * @param {number} ms — timeout in milliseconds
 * @returns {Promise} — the original promise or timeout error
 */
function withTimeout(promise, ms) {
  return Promise.race([promise, createTimeout(ms)]);
}
