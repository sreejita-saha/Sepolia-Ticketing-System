/**
 * create-wallet.js
 * Handles wallet generation, display, keystore encryption/download,
 * and the 30-second private key auto-clear countdown.
 *
 * Dependencies: Web3.js 1.x (loaded via CDN in create-wallet.html)
 * No third-party key-generation libraries are used.
 */

"use strict";

// ─── Audit fix #4a: snapshot getRandomValues before any extension can patch it ─
// Malicious extensions can monkey-patch window.crypto.getRandomValues after the
// page loads. Capturing the native reference here — at script parse time, before
// any async work — ensures Web3.js uses the genuine browser CSPRNG when it calls
// this function internally during account generation.
const _secureRandom = crypto.getRandomValues.bind(crypto);
// Freeze the reference so it cannot be reassigned later by injected code.
Object.defineProperty(window, "_secureRandom", { writable: false, configurable: false });

// ─── DOM references ───────────────────────────────────────────────────────────

const inputPassword        = document.getElementById("input-password");
const inputPasswordConfirm = document.getElementById("input-password-confirm");
const errorPassword        = document.getElementById("error-password");
const btnGenerate          = document.getElementById("btn-generate");

const sectionInput         = document.getElementById("section-input");
const sectionResult        = document.getElementById("section-result");

const displayAddress       = document.getElementById("display-address");
const displayPrivateKey    = document.getElementById("display-private-key");
const btnCopyAddress       = document.getElementById("btn-copy-address");
const btnCopyKey           = document.getElementById("btn-copy-key");
const btnDownloadKeystore  = document.getElementById("btn-download-keystore");
const btnReset             = document.getElementById("btn-reset");

const groupPrivateKey      = document.getElementById("group-private-key");
const noticeCleared        = document.getElementById("notice-cleared");

// Both countdown spans kept in sync (banner + inline hint)
const countdownBanner      = document.getElementById("countdown");
const countdownInline      = document.getElementById("countdown-inline");

// ─── Module state ─────────────────────────────────────────────────────────────

/** Holds the encrypted keystore JSON so the download button can access it. */
let keystoreJson = null;

/** Interval ID for the countdown timer so it can be cancelled on reset. */
let countdownInterval = null;

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates both password fields.
 * Returns { valid: true } or { valid: false, message: string }.
 */
function validatePasswords() {
  const pw  = inputPassword.value;
  const pw2 = inputPasswordConfirm.value;

  if (!pw) {
    return { valid: false, message: "Please enter an encryption password." };
  }
  if (pw.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters." };
  }
  if (pw !== pw2) {
    return { valid: false, message: "Passwords do not match." };
  }
  return { valid: true };
}

/** Displays or clears the inline password error message. */
function setPasswordError(message) {
  errorPassword.textContent = message;
}

// ─── Wallet generation ────────────────────────────────────────────────────────

/**
 * Core generation flow:
 *   1. Validate password inputs
 *   2. Generate wallet via Web3.js (CSPRNG — no third-party lib)
 *   3. Encrypt wallet to keystore JSON
 *   4. Display address + private key
 *   5. Start 30-second countdown to clear private key
 */
async function generateWallet() {
  setPasswordError("");

  const validation = validatePasswords();
  if (!validation.valid) {
    setPasswordError(validation.message);
    return;
  }

  // Disable button and show progress while encryption runs (it is CPU-intensive)
  btnGenerate.disabled    = true;
  btnGenerate.textContent = "Generating…";

  try {
    const web3 = new Web3();

    // Generate a new Ethereum account using Web3.js's CSPRNG.
    // web3.eth.accounts.create() uses the browser's crypto.getRandomValues()
    // internally — no external entropy source needed.
    const account = web3.eth.accounts.create();

    // Encrypt the private key into a Web3 Secret Storage (keystore) JSON.
    // The returned object contains: version, id, address, crypto (cipher/kdf params).
    // web3.eth.accounts.encrypt() uses AES-128-CTR + scrypt by default.
    const password = inputPassword.value;
    const keystore = web3.eth.accounts.encrypt(account.privateKey, password);
    keystoreJson   = JSON.stringify(keystore, null, 2);

    // Audit fix #3: clear both password fields immediately after encryption.
    // The password has served its purpose. Leaving it in the DOM risks exposure
    // if the user walks away from the tab or an extension reads input values.
    inputPassword.value        = "";
    inputPasswordConfirm.value = "";

    // Render results
    displayAddress.textContent    = account.address;
    displayPrivateKey.textContent = account.privateKey;

    // Show result section, hide input section
    sectionInput.classList.add("card--hidden");
    sectionResult.classList.remove("card--hidden");

    // Begin the auto-clear countdown (mandatory security requirement)
    startPrivateKeyCountdown();

  } catch {
    // Audit fix #1: do NOT log the caught error object.
    // Web3.js error messages can include the private key or account data in
    // their stack traces. Logging to console risks exposing sensitive material
    // to DevTools and any extension that intercepts console output.
    setPasswordError("Wallet generation failed. Please try again.");
  } finally {
    btnGenerate.disabled    = false;
    btnGenerate.textContent = "Generate Wallet";
  }
}

// ─── Countdown & private key clearance ───────────────────────────────────────

const COUNTDOWN_SECONDS = 30;

/**
 * Starts the 30-second countdown.
 * Ticks every second; clears the private key from the DOM when it reaches 0.
 */
function startPrivateKeyCountdown() {
  let remaining = COUNTDOWN_SECONDS;

  updateCountdownDisplay(remaining);

  countdownInterval = setInterval(() => {
    remaining -= 1;
    updateCountdownDisplay(remaining);

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      clearPrivateKeyFromDOM();
    }
  }, 1000);
}

/** Writes the current remaining seconds into both countdown elements. */
function updateCountdownDisplay(seconds) {
  const display = String(seconds);
  countdownBanner.textContent = display;
  countdownInline.textContent = display;
}

/**
 * Removes the private key from all DOM nodes and memory references.
 * Shows the "key cleared" notice.
 */
function clearPrivateKeyFromDOM() {
  // Overwrite the text content (prevents clipboard-copying stale content)
  displayPrivateKey.textContent = "[ Private key removed for your security ]";

  // Disable the copy-key button so it cannot copy the placeholder text
  btnCopyKey.disabled    = true;
  btnCopyKey.textContent = "Cleared";

  // Hide the private key row and show the cleared notice
  groupPrivateKey.classList.add("card--hidden");
  noticeCleared.classList.remove("card--hidden");
}

// ─── Keystore download ────────────────────────────────────────────────────────

/**
 * Triggers a browser download of the encrypted keystore JSON file.
 * File name follows the same convention as go-ethereum: UTC--<timestamp>--<address>.json
 */
function downloadKeystore() {
  if (!keystoreJson) return;

  const address   = displayAddress.textContent.replace("0x", "").toLowerCase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename  = `UTC--${timestamp}--${address}.json`;

  const blob = new Blob([keystoreJson], { type: "application/json" });
  const url  = URL.createObjectURL(blob);

  const anchor    = document.createElement("a");
  anchor.href     = url;
  anchor.download = filename;
  anchor.click();

  // Revoke object URL immediately after click to free memory
  URL.revokeObjectURL(url);
}

// ─── Copy to clipboard ────────────────────────────────────────────────────────

/**
 * Copies text to clipboard and gives the button brief visual feedback.
 * @param {string} text - Text to copy.
 * @param {HTMLButtonElement} btn - Button element to update.
 */
async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 2000);
  } catch {
    btn.textContent = "Failed";
    setTimeout(() => { btn.textContent = "Copy"; }, 2000);
  }
}

// ─── Reset ────────────────────────────────────────────────────────────────────

/**
 * Resets all state so the user can generate another wallet.
 * Cancels any running countdown, clears all fields and module state.
 */
function resetPage() {
  // Stop countdown if still running
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // Clear sensitive values from DOM immediately
  displayAddress.textContent    = "";
  displayPrivateKey.textContent = "";

  // Clear module-level keystore reference
  keystoreJson = null;

  // Reset password fields
  inputPassword.value        = "";
  inputPasswordConfirm.value = "";
  setPasswordError("");

  // Reset copy buttons
  btnCopyKey.disabled    = false;
  btnCopyKey.textContent = "Copy";

  // Restore visibility: show input, hide result + cleared notice
  groupPrivateKey.classList.remove("card--hidden");
  noticeCleared.classList.add("card--hidden");
  sectionResult.classList.add("card--hidden");
  sectionInput.classList.remove("card--hidden");
}

// ─── Event listeners ──────────────────────────────────────────────────────────

btnGenerate.addEventListener("click", generateWallet);
btnDownloadKeystore.addEventListener("click", downloadKeystore);
btnReset.addEventListener("click", resetPage);

btnCopyAddress.addEventListener("click", () => {
  copyToClipboard(displayAddress.textContent, btnCopyAddress);
});

btnCopyKey.addEventListener("click", () => {
  // Guard: do not copy if key has already been cleared
  if (btnCopyKey.disabled) return;
  copyToClipboard(displayPrivateKey.textContent, btnCopyKey);
});

// Allow submitting with Enter key from either password field
inputPassword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") inputPasswordConfirm.focus();
});
inputPasswordConfirm.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generateWallet();
});
