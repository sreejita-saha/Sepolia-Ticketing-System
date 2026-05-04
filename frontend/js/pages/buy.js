/**
 * buy.js
 * Ticket purchase page with eight transaction states.
 *
 * States handled:
 *   1. IDLE          — page load, ticket price fetched, waiting for wallet
 *   2. WALLET_LOADING — user loading wallet via private key or keystore
 *   3. INSUFFICIENT  — wallet balance < ticket price, button disabled
 *   4. SOLD_OUT      — contract has 0 tickets remaining, button disabled
 *   5. PENDING       — transaction submitted, hash shown, spinner visible
 *   6. SUCCESS       — transaction mined, balance updated, confirmation shown
 *   7. REVERTED      — transaction failed on-chain, revert reason parsed
 *   8. REJECTED      — user rejected in wallet, no gas spent
 *
 * Depends on: Web3.js 1.x (CDN), config.js, utils.js
 */

"use strict";

// ─── Validate dependencies are loaded ──────────────────────────────────────────

if (typeof CONTRACT_ADDRESS === "undefined" || typeof CONTRACT_ABI === "undefined" || typeof RPC_URL === "undefined") {
  throw new Error("buy.js requires config.js to be loaded first.");
}

if (typeof parseRevertReason === "undefined") {
  throw new Error("buy.js requires utils.js to be loaded first.");
}

// ─── DOM references ───────────────────────────────────────────────────────────

const sectionPrice             = document.getElementById("section-price");
const priceValue               = document.getElementById("price-value");
const priceNote                = document.getElementById("price-note");

const sectionWalletLoader      = document.getElementById("section-wallet-loader");
const inputPrivateKey          = document.getElementById("input-private-key");
const inputKeystore            = document.getElementById("input-keystore");
const keystorePasswordGroup    = document.getElementById("keystore-password-group");
const inputKeystorePassword    = document.getElementById("input-keystore-password");
const errorPrivateKey          = document.getElementById("error-private-key");
const errorKeystore            = document.getElementById("error-keystore");
const errorKeystorePassword    = document.getElementById("error-keystore-password");
const btnLoadWallet            = document.getElementById("btn-load-wallet");

const sectionWalletLoaded      = document.getElementById("section-wallet-loaded");
const walletAddress            = document.getElementById("wallet-address");
const walletBalance            = document.getElementById("wallet-balance");
const btnChangeWallet          = document.getElementById("btn-change-wallet");

const sectionInsufficientBalance = document.getElementById("section-insufficient-balance");
const insufficientBalanceDetail  = document.getElementById("insufficient-balance-detail");

const sectionSoldOut           = document.getElementById("section-sold-out");

const sectionBuyButton         = document.getElementById("section-buy-button");
const btnBuy                   = document.getElementById("btn-buy");

const sectionPending           = document.getElementById("section-pending");
const pendingTxHash            = document.getElementById("pending-tx-hash");

const sectionSuccess           = document.getElementById("section-success");
const successTxHash            = document.getElementById("success-tx-hash");
const successTicketBalance     = document.getElementById("success-ticket-balance");
const btnBuyAnother            = document.getElementById("btn-buy-another");

const sectionReverted          = document.getElementById("section-reverted");
const revertedDetail           = document.getElementById("reverted-detail");
const revertedReason           = document.getElementById("reverted-reason");
const revertedTxHash           = document.getElementById("reverted-tx-hash");
const btnTryAgainReverted      = document.getElementById("btn-try-again-reverted");

const sectionRejected          = document.getElementById("section-rejected");
const btnTryAgainRejected      = document.getElementById("btn-try-again-rejected");

// ─── Module state ─────────────────────────────────────────────────────────────

let web3 = null;
let contract = null;

let ticketPrice = null;              // Wei as string
let currentWallet = null;            // { address, privateKey }
let keystoreFileData = null;         // Parsed keystore JSON
let currentTransaction = null;       // In-flight transaction hash

// ─── Initialisation ───────────────────────────────────────────────────────────

function initWeb3() {
  web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
  contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
}

async function loadTicketPrice() {
  try {
    priceNote.textContent = "Loading ticket price from contract…";
    ticketPrice = await contract.methods.ticketPrice().call();
    const ethPrice = web3.utils.fromWei(ticketPrice, "ether");
    priceValue.textContent = parseFloat(ethPrice).toFixed(6).replace(/\.?0+$/, "") || "0";
    priceNote.textContent = "";
  } catch (err) {
    priceNote.textContent = "Failed to load ticket price. Contract may not be deployed.";
  }
}

// ─── Helper functions ──────────────────────────────────────────────────────────

function clearErrors() {
  errorPrivateKey.textContent = "";
  errorKeystore.textContent = "";
  errorKeystorePassword.textContent = "";
}

function hideAllSections() {
  sectionWalletLoader.classList.add("card--hidden");
  sectionWalletLoaded.classList.add("card--hidden");
  sectionInsufficientBalance.classList.add("card--hidden");
  sectionSoldOut.classList.add("card--hidden");
  sectionBuyButton.classList.add("card--hidden");
  sectionPending.classList.add("card--hidden");
  sectionSuccess.classList.add("card--hidden");
  sectionReverted.classList.add("card--hidden");
  sectionRejected.classList.add("card--hidden");
}

// ─── Wallet loading ───────────────────────────────────────────────────────────

inputKeystore.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) {
    keystorePasswordGroup.classList.remove("card--hidden");
    errorKeystore.textContent = "";
  } else {
    keystorePasswordGroup.classList.add("card--hidden");
    keystoreFileData = null;
  }
});

btnLoadWallet.addEventListener("click", async () => {
  clearErrors();
  const privateKeyInput = inputPrivateKey.value.trim();
  const keystoreFile = inputKeystore.files?.[0];
  const keystorePassword = inputKeystorePassword.value;

  if (!privateKeyInput && !keystoreFile) {
    errorPrivateKey.textContent = "Enter a private key or select a keystore file.";
    return;
  }

  if (privateKeyInput) {
    try {
      if (!privateKeyInput.startsWith("0x")) {
        errorPrivateKey.textContent = "Private key must start with 0x";
        return;
      }
      if (!/^0x[0-9a-fA-F]{64}$/.test(privateKeyInput)) {
        errorPrivateKey.textContent = "Invalid private key format. Must be 0x followed by 64 hex characters.";
        return;
      }

      const account = web3.eth.accounts.privateKeyToAccount(privateKeyInput);
      currentWallet = { address: account.address, privateKey: privateKeyInput };
      await loadWalletBalance();
    } catch (err) {
      errorPrivateKey.textContent = "Failed to load wallet from private key.";
    }
  } else if (keystoreFile) {
    try {
      if (!keystorePassword) {
        errorKeystorePassword.textContent = "Enter your keystore password to decrypt.";
        return;
      }

      const fileText = await keystoreFile.text();
      keystoreFileData = JSON.parse(fileText);

      const account = await web3.eth.accounts.decrypt(keystoreFileData, keystorePassword);
      currentWallet = { address: account.address, privateKey: account.privateKey };
      await loadWalletBalance();
    } catch (err) {
      errorKeystorePassword.textContent = "Failed to decrypt keystore. Check your password.";
    }
  }
});

async function loadWalletBalance() {
  try {
    const balance = await web3.eth.getBalance(currentWallet.address);

    sectionWalletLoader.classList.add("card--hidden");
    sectionWalletLoaded.classList.remove("card--hidden");
    walletAddress.textContent = truncateAddress(currentWallet.address);
    walletBalance.textContent = formatEth(balance);

    inputPrivateKey.value = "";
    inputKeystore.value = "";
    inputKeystorePassword.value = "";
    keystorePasswordGroup.classList.add("card--hidden");

    await checkPurchaseConditions(balance);
  } catch (err) {
    errorPrivateKey.textContent = "Failed to fetch wallet balance. Check your connection.";
  }
}

btnChangeWallet.addEventListener("click", () => {
  currentWallet = null;
  keystoreFileData = null;
  hideAllSections();
  sectionPrice.classList.remove("card--hidden");
  sectionWalletLoader.classList.remove("card--hidden");
});

// ─── Purchase conditions check ─────────────────────────────────────────────────

async function checkPurchaseConditions(walletBalance) {
  hideAllSections();
  sectionPrice.classList.remove("card--hidden");
  sectionWalletLoaded.classList.remove("card--hidden");

  if (!ticketPrice) {
    return;
  }

  try {
    const ticketsRemaining = await contract.methods.ticketsRemaining().call();

    if (BigInt(ticketsRemaining) === 0n) {
      sectionSoldOut.classList.remove("card--hidden");
      return;
    }

    if (BigInt(walletBalance) < BigInt(ticketPrice)) {
      insufficientBalanceDetail.textContent = `Your SETH balance (${formatEth(walletBalance)}) is lower than the ticket price (${formatEth(ticketPrice)}).`;
      sectionInsufficientBalance.classList.remove("card--hidden");
      return;
    }

    sectionBuyButton.classList.remove("card--hidden");
  } catch (err) {
    // If we can't check tickets remaining, still show buy button
    sectionBuyButton.classList.remove("card--hidden");
  }
}

// ─── Transaction submission ───────────────────────────────────────────────────

btnBuy.addEventListener("click", async () => {
  if (!currentWallet || !ticketPrice) {
    return;
  }

  try {
    const nonce = await web3.eth.getTransactionCount(currentWallet.address);
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
      nonce: nonce,
      gasPrice: gasPrice,
      gas: 100000,
      to: CONTRACT_ADDRESS,
      value: ticketPrice,
      data: contract.methods.buyTicket().encodeABI(),
      chainId: 11155111
    };

    const signedTx = web3.eth.accounts.signTransaction(tx, currentWallet.privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    currentTransaction = receipt.transactionHash;
    showPending(receipt.transactionHash);
    await waitForConfirmation(receipt.transactionHash);
  } catch (err) {
    handleTransactionError(err);
  }
};

// ─── Transaction state handlers ────────────────────────────────────────────────

function showPending(txHash) {
  hideAllSections();
  sectionPending.classList.remove("card--hidden");
  pendingTxHash.href = getEtherscanLink(txHash);
  pendingTxHash.textContent = truncateAddress(txHash);
}

async function waitForConfirmation(txHash) {
  let receipt = null;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes with 5-second intervals

  while (attempts < maxAttempts) {
    try {
      receipt = await web3.eth.getTransactionReceipt(txHash);
      if (receipt) {
        break;
      }
    } catch (err) {
      // Ignore errors, keep polling
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  if (!receipt) {
    showError("Transaction timeout", "Your transaction may still be processing. Check Etherscan manually.", txHash);
    return;
  }

  if (receipt.status === true || receipt.status === "0x1") {
    await showSuccess(txHash);
  } else {
    await showReverted(txHash);
  }
}

async function showSuccess(txHash) {
  try {
    const ticketBalance = await contract.methods.balanceOf(currentWallet.address).call();

    hideAllSections();
    sectionSuccess.classList.remove("card--hidden");
    successTxHash.href = getEtherscanLink(txHash);
    successTxHash.textContent = truncateAddress(txHash);
    successTicketBalance.textContent = ticketBalance.toString();

    currentWallet = null;
  } catch (err) {
    hideAllSections();
    sectionSuccess.classList.remove("card--hidden");
    successTxHash.href = getEtherscanLink(txHash);
    successTxHash.textContent = truncateAddress(txHash);
    successTicketBalance.textContent = "—";
  }
}

async function showReverted(txHash) {
  let revertReason = "An unknown error occurred.";

  try {
    const tx = await web3.eth.getTransaction(txHash);
    const receipt = await web3.eth.getTransactionReceipt(txHash);

    if (tx && receipt) {
      try {
        await web3.eth.call({ ...tx }, receipt.blockNumber);
      } catch (callErr) {
        revertReason = parseRevertReason(callErr);
      }
    }
  } catch (err) {
    revertReason = parseRevertReason(err);
  }

  hideAllSections();
  sectionReverted.classList.remove("card--hidden");
  revertedReason.textContent = revertReason;
  revertedTxHash.href = getEtherscanLink(txHash);
  revertedTxHash.textContent = truncateAddress(txHash);
}

function handleTransactionError(err) {
  const message = err.message || String(err);

  if (message.includes("User denied") || message.includes("rejected")) {
    showRejected();
  } else {
    showError("Transaction failed", parseRevertReason(err), null);
  }
}

function showRejected() {
  hideAllSections();
  sectionRejected.classList.remove("card--hidden");
}

function showError(heading, detail, txHash) {
  hideAllSections();
  sectionReverted.classList.remove("card--hidden");
  document.getElementById("reverted-detail").textContent = detail;
  document.getElementById("reverted-reason").textContent = heading;

  if (txHash) {
    revertedTxHash.href = getEtherscanLink(txHash);
    revertedTxHash.textContent = truncateAddress(txHash);
  }
}

// ─── Recovery buttons ───────────────────────────────────────────────────────────

btnBuyAnother.addEventListener("click", () => {
  currentWallet = null;
  hideAllSections();
  sectionPrice.classList.remove("card--hidden");
  sectionWalletLoader.classList.remove("card--hidden");
});

btnTryAgainReverted.addEventListener("click", () => {
  if (currentWallet) {
    hideAllSections();
    sectionPrice.classList.remove("card--hidden");
    sectionWalletLoaded.classList.remove("card--hidden");
    sectionBuyButton.classList.remove("card--hidden");
  }
});

btnTryAgainRejected.addEventListener("click", () => {
  if (currentWallet) {
    hideAllSections();
    sectionPrice.classList.remove("card--hidden");
    sectionWalletLoaded.classList.remove("card--hidden");
    sectionBuyButton.classList.remove("card--hidden");
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

initWeb3();
loadTicketPrice();
hideAllSections();
sectionPrice.classList.remove("card--hidden");
sectionWalletLoader.classList.remove("card--hidden");
