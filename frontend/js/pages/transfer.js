/**
 * transfer.js
 * Ticket return page with transaction state handling.
 *
 * States handled:
 *   1. IDLE          — page load, wallet loader visible
 *   2. WALLET_LOADED — wallet unlocked, transfer form shown
 *   3. NO_TICKETS    — wallet has 0 tickets, inline message
 *   4. PENDING       — transaction submitted, hash shown, spinner visible
 *   5. SUCCESS       — transaction mined, dual balances shown
 *   6. REVERTED      — transaction failed on-chain, revert reason parsed
 *   7. ERROR         — network/wallet error, no tx hash
 *
 * Depends on: Web3.js 1.x (CDN), config.js, utils.js
 */

"use strict";

if (typeof CONTRACT_ADDRESS === "undefined" || typeof CONTRACT_ABI === "undefined" || typeof RPC_URL === "undefined") {
  throw new Error("transfer.js requires config.js to be loaded first.");
}

if (typeof parseRevertReason === "undefined") {
  throw new Error("transfer.js requires utils.js to be loaded first.");
}

// ─── DOM references ───────────────────────────────────────────────────────────

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
const walletTicketBalance      = document.getElementById("wallet-ticket-balance");
const vendorTicketsRemaining   = document.getElementById("vendor-tickets-remaining");
const btnChangeWallet          = document.getElementById("btn-change-wallet");

const sectionNoTickets         = document.getElementById("section-no-tickets");

const sectionTransferForm      = document.getElementById("section-transfer-form");
const inputQuantity            = document.getElementById("input-quantity");
const errorQuantity            = document.getElementById("error-quantity");
const btnSubmitReturn          = document.getElementById("btn-submit-return");

const sectionPending           = document.getElementById("section-pending");
const pendingTxHash            = document.getElementById("pending-tx-hash");

const sectionSuccess           = document.getElementById("section-success");
const successYourBalance       = document.getElementById("success-your-balance");
const successVendorRemaining   = document.getElementById("success-vendor-remaining");
const successTxHash            = document.getElementById("success-tx-hash");
const btnReturnAnother         = document.getElementById("btn-return-another");

const sectionReverted          = document.getElementById("section-reverted");
const revertedDetail           = document.getElementById("reverted-detail");
const revertedReason           = document.getElementById("reverted-reason");
const revertedTxHash           = document.getElementById("reverted-tx-hash");
const btnTryAgain              = document.getElementById("btn-try-again");

const sectionError             = document.getElementById("section-error");
const errorDetail              = document.getElementById("error-detail");
const btnErrorRetry            = document.getElementById("btn-error-retry");

// ─── Module state ─────────────────────────────────────────────────────────────

let web3 = null;
let contract = null;

let currentWallet = null;            // { address, privateKey }
let attendeeBalance = null;          // Current attendee ticket count
let vendorBalance = null;            // Current vendor ticketsRemaining

// ─── Initialisation ───────────────────────────────────────────────────────────

function initWeb3() {
  web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
  contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
}

// ─── Helper functions ──────────────────────────────────────────────────────────

function clearErrors() {
  errorPrivateKey.textContent = "";
  errorKeystore.textContent = "";
  errorKeystorePassword.textContent = "";
  errorQuantity.textContent = "";
}

function hideAllSections() {
  sectionWalletLoader.classList.add("card--hidden");
  sectionWalletLoaded.classList.add("card--hidden");
  sectionNoTickets.classList.add("card--hidden");
  sectionTransferForm.classList.add("card--hidden");
  sectionPending.classList.add("card--hidden");
  sectionSuccess.classList.add("card--hidden");
  sectionReverted.classList.add("card--hidden");
  sectionError.classList.add("card--hidden");
}

// ─── Wallet loading ───────────────────────────────────────────────────────────

inputKeystore.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) {
    keystorePasswordGroup.classList.remove("card--hidden");
    errorKeystore.textContent = "";
  } else {
    keystorePasswordGroup.classList.add("card--hidden");
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
      await loadWalletBalances();
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
      const keystoreData = JSON.parse(fileText);

      const account = await web3.eth.accounts.decrypt(keystoreData, keystorePassword);
      currentWallet = { address: account.address, privateKey: account.privateKey };
      await loadWalletBalances();
    } catch (err) {
      errorKeystorePassword.textContent = "Failed to decrypt keystore. Check your password.";
    }
  }
});

async function loadWalletBalances() {
  try {
    attendeeBalance = await contract.methods.balanceOf(currentWallet.address).call();
    vendorBalance = await contract.methods.ticketsRemaining().call();

    hideAllSections();
    sectionWalletLoaded.classList.remove("card--hidden");
    walletAddress.textContent = truncateAddress(currentWallet.address);
    walletTicketBalance.textContent = attendeeBalance.toString();
    vendorTicketsRemaining.textContent = vendorBalance.toString();

    inputPrivateKey.value = "";
    inputKeystore.value = "";
    inputKeystorePassword.value = "";
    keystorePasswordGroup.classList.add("card--hidden");

    if (BigInt(attendeeBalance) === 0n) {
      sectionNoTickets.classList.remove("card--hidden");
    } else {
      sectionTransferForm.classList.remove("card--hidden");
      inputQuantity.max = attendeeBalance.toString();
    }
  } catch (err) {
    errorPrivateKey.textContent = "Failed to fetch wallet balances. Check your connection.";
  }
}

btnChangeWallet.addEventListener("click", () => {
  currentWallet = null;
  attendeeBalance = null;
  vendorBalance = null;
  hideAllSections();
  sectionWalletLoader.classList.remove("card--hidden");
});

// ─── Quantity validation ────────────────────────────────────────────────────────

btnSubmitReturn.addEventListener("click", async () => {
  errorQuantity.textContent = "";

  const qty = parseInt(inputQuantity.value, 10);

  if (!qty || qty < 1) {
    errorQuantity.textContent = "Quantity must be at least 1.";
    return;
  }

  if (qty > BigInt(attendeeBalance)) {
    errorQuantity.textContent = `You only have ${attendeeBalance} ticket(s).`;
    return;
  }

  try {
    await submitReturn(qty);
  } catch (err) {
    handleError(err);
  }
});

// ─── Transaction submission ────────────────────────────────────────────────────

async function submitReturn(quantity) {
  if (!currentWallet) {
    return;
  }

  try {
    const nonce = await web3.eth.getTransactionCount(currentWallet.address);
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
      nonce: nonce,
      gasPrice: gasPrice,
      gas: 80000,
      to: CONTRACT_ADDRESS,
      value: "0x0",
      data: contract.methods.returnTicket(quantity).encodeABI(),
      chainId: CHAIN_ID
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, currentWallet.privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    showPending(receipt.transactionHash);
    await waitForConfirmation(receipt.transactionHash);
  } catch (err) {
    handleTransactionError(err);
  }
}

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
  const maxAttempts = 60;

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
    showError("Transaction timeout", "Your transaction may still be processing. Check Etherscan manually.");
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
    const newAttendeeBalance = await contract.methods.balanceOf(currentWallet.address).call();
    const newVendorBalance = await contract.methods.ticketsRemaining().call();

    hideAllSections();
    sectionSuccess.classList.remove("card--hidden");
    successYourBalance.textContent = newAttendeeBalance.toString();
    successVendorRemaining.textContent = newVendorBalance.toString();
    successTxHash.href = getEtherscanLink(txHash);
    successTxHash.textContent = truncateAddress(txHash);

    currentWallet = null;
    attendeeBalance = null;
    vendorBalance = null;
  } catch (err) {
    hideAllSections();
    sectionSuccess.classList.remove("card--hidden");
    successYourBalance.textContent = "—";
    successVendorRemaining.textContent = "—";
    successTxHash.href = getEtherscanLink(txHash);
    successTxHash.textContent = truncateAddress(txHash);
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
    showError("Transaction Rejected", "You rejected the transaction in your wallet. No gas was spent.");
  } else {
    showError("Transaction Failed", parseRevertReason(err));
  }
}

function showError(heading, detail) {
  hideAllSections();
  sectionError.classList.remove("card--hidden");
  document.querySelector("#error-detail").textContent = detail;
  document.querySelector(".card--error .card-heading").textContent = heading;
}

function handleError(err) {
  const message = err.message || String(err);

  if (message.includes("network") || message.includes("connection")) {
    showError("Network Error", "Could not connect to the Sepolia network. Check your internet connection.");
  } else if (message.includes("User denied") || message.includes("rejected")) {
    showError("Transaction Rejected", "You rejected the transaction in your wallet. No gas was spent.");
  } else {
    showError("Error", parseRevertReason(err));
  }
}

// ─── Recovery buttons ───────────────────────────────────────────────────────────

btnReturnAnother.addEventListener("click", () => {
  currentWallet = null;
  attendeeBalance = null;
  vendorBalance = null;
  hideAllSections();
  sectionWalletLoader.classList.remove("card--hidden");
});

btnTryAgain.addEventListener("click", () => {
  if (currentWallet && attendeeBalance) {
    hideAllSections();
    sectionWalletLoaded.classList.remove("card--hidden");
    sectionTransferForm.classList.remove("card--hidden");
  }
});

btnErrorRetry.addEventListener("click", () => {
  if (currentWallet && attendeeBalance) {
    hideAllSections();
    sectionWalletLoaded.classList.remove("card--hidden");
    sectionTransferForm.classList.remove("card--hidden");
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

initWeb3();
hideAllSections();
sectionWalletLoader.classList.remove("card--hidden");
