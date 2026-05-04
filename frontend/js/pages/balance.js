/**
 * balance.js
 * Three-role balance checker for the Sepolia Ticketing DApp.
 *
 * Roles and what each queries from the live Sepolia chain:
 *   ATTENDEE — eth_getBalance (SETH in ETH) + balanceOf (ticket tokens)
 *   DOORMAN  — balanceOf only; SETH balance deliberately withheld (privacy)
 *   VENDOR   — eth_getBalance + balanceOf + totalSupply + ticketCap (remaining supply)
 *
 * All queries go directly to the Sepolia RPC. No results are cached.
 *
 * Depends on: Web3.js 1.x (CDN), config.js (CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL)
 */

"use strict";

// ─── Validate config is loaded ────────────────────────────────────────────────

if (typeof CONTRACT_ADDRESS === "undefined" || typeof CONTRACT_ABI === "undefined" || typeof RPC_URL === "undefined") {
  throw new Error("balance.js requires config.js to be loaded first.");
}

if (typeof truncateAddress === "undefined" || typeof isValidEthAddress === "undefined") {
  throw new Error("balance.js requires utils.js to be loaded first.");
}

// ─── Check for unconfigured contract address ─────────────────────────────────

const IS_CONTRACT_CONFIGURED = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
const PLACEHOLDER_ADDRESS = "0x0000000000000000000000000000000000000000";

// ─── Role definitions ─────────────────────────────────────────────────────────

/**
 * Each role entry describes:
 *   id        — matches data-role attribute on role buttons
 *   label     — human-readable name shown in results heading
 *   hint      — context text shown below the address input
 *   queries   — which chain calls to make (determines logic path, not just display)
 */
const ROLES = {
  attendee: {
    id:      "attendee",
    label:   "Attendee View",
    hint:    "Enter your own wallet address to see your SETH balance and ticket count.",
    queries: { ethBalance: true, ticketBalance: true, supplyInfo: false }
  },
  doorman: {
    id:      "doorman",
    label:   "Doorman View",
    // SETH balance is not queried at all for doorman — not just hidden in the UI.
    // This prevents the data from being present in memory or DevTools network logs.
    hint:    "Enter an attendee's wallet address to verify their ticket. SETH balance is not shown.",
    queries: { ethBalance: false, ticketBalance: true, supplyInfo: false }
  },
  vendor: {
    id:      "vendor",
    label:   "Vendor View",
    hint:    "Enter any address for full data: SETH balance, ticket count, and remaining supply.",
    queries: { ethBalance: true, ticketBalance: true, supplyInfo: true }
  }
};

// ─── DOM references ───────────────────────────────────────────────────────────

const inputAddress       = document.getElementById("input-address");
const errorAddress       = document.getElementById("error-address");
const btnCheck           = document.getElementById("btn-check");
const btnClearResult     = document.getElementById("btn-clear-result");
const roleContextHint    = document.getElementById("role-context-hint");
const inputSectionTitle  = document.getElementById("input-section-title");

const sectionLoading     = document.getElementById("section-loading");
const sectionResult      = document.getElementById("section-result");
const sectionError       = document.getElementById("section-error");

const resultTitle        = document.getElementById("result-title");
const resultAddressBadge = document.getElementById("result-address-badge");

// Role-specific view containers
const viewAttendee       = document.getElementById("view-attendee");
const viewDoorman        = document.getElementById("view-doorman");
const viewVendor         = document.getElementById("view-vendor");

// Attendee fields
const attendeeEthBalance    = document.getElementById("attendee-eth-balance");
const attendeeTicketBalance = document.getElementById("attendee-ticket-balance");

// Doorman fields
const doormanTicketBalance  = document.getElementById("doorman-ticket-balance");
const validityBlock         = document.getElementById("validity-block");
const validityIcon          = document.getElementById("validity-icon");
const validityLabel         = document.getElementById("validity-label");

// Vendor fields
const vendorEthBalance      = document.getElementById("vendor-eth-balance");
const vendorTicketBalance   = document.getElementById("vendor-ticket-balance");
const vendorSupplyRemaining = document.getElementById("vendor-supply-remaining");
const vendorSupplyCap       = document.getElementById("vendor-supply-cap");

// Error section fields
const errorHeading          = document.getElementById("error-heading");
const errorDetail           = document.getElementById("error-detail");

// Role buttons (all three)
const roleBtns = document.querySelectorAll(".role-btn");

// ─── Module state ─────────────────────────────────────────────────────────────

/** The currently active role key: "attendee" | "doorman" | "vendor" */
let activeRole = "attendee";

/** Web3 instance connected to Sepolia RPC — initialised once. */
let web3 = null;

/** Contract instance — initialised once. */
let contract = null;

/** AbortController for the currently in-flight query — allows cancellation. */
let currentQueryAbort = null;

// ─── Initialisation ───────────────────────────────────────────────────────────

function initWeb3() {
  // Use the public Sepolia RPC from config.js.
  // HttpProvider is used (not MetaMask) so the page works read-only without
  // a wallet installed. No signing is performed on this page.
  web3     = new Web3(new Web3.providers.HttpProvider(RPC_URL));
  contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
}

// ─── Role selection ───────────────────────────────────────────────────────────

function selectRole(roleKey) {
  // Fix #5: cancel any in-flight query when the role changes
  if (currentQueryAbort) {
    currentQueryAbort.abort();
    currentQueryAbort = null;
  }

  activeRole = roleKey;
  const role = ROLES[roleKey];

  // Update button pressed states
  roleBtns.forEach(btn => {
    const isActive = btn.dataset.role === roleKey;
    btn.classList.toggle("role-btn--active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });

  // Update the input section label and hint to match the role
  inputSectionTitle.textContent = `Step 2 — Enter ${roleKey === "attendee" ? "Your" : "an"} Wallet Address`;
  roleContextHint.textContent   = role.hint;

  // Clear any previous results or errors when the role changes
  hideAllSections();
  clearAddressError();
}

// ─── Address validation ───────────────────────────────────────────────────────

function setAddressError(message) {
  errorAddress.textContent = message;
}

function clearAddressError() {
  errorAddress.textContent = "";
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function showLoading() {
  sectionLoading.classList.remove("card--hidden");
  sectionResult.classList.add("card--hidden");
  sectionError.classList.add("card--hidden");
  btnCheck.disabled    = true;
  btnCheck.textContent = "Checking…";
}

function hideLoading() {
  sectionLoading.classList.add("card--hidden");
  btnCheck.disabled    = false;
  btnCheck.textContent = "Check";
}

function hideAllSections() {
  sectionLoading.classList.add("card--hidden");
  sectionResult.classList.add("card--hidden");
  sectionError.classList.add("card--hidden");
  viewAttendee.classList.add("card--hidden");
  viewDoorman.classList.add("card--hidden");
  viewVendor.classList.add("card--hidden");
}

function showError(heading, detail) {
  hideLoading();
  sectionError.classList.remove("card--hidden");
  errorHeading.textContent = heading;
  errorDetail.textContent  = detail;
}

// ─── Chain query functions ────────────────────────────────────────────────────

const QUERY_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Fix #4: Wraps an async operation with a timeout.
 * Throws a timeout error if the promise takes longer than QUERY_TIMEOUT_MS.
 * Respects AbortSignal if the query is cancelled (role changed).
 */
function withTimeout(promise, signal) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Query timed out after 10 seconds. The RPC endpoint may be overloaded or unresponsive."));
      }, QUERY_TIMEOUT_MS);

      // If the abort signal fires, clear the timeout and reject immediately
      signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(new Error("Query was cancelled."));
      });
    })
  ]);
}

/**
 * Fetches SETH balance for an address.
 * Returns Wei as a string.
 * Throws on RPC error or timeout.
 */
async function fetchEthBalance(address, signal) {
  return await withTimeout(web3.eth.getBalance(address), signal);
}

/**
 * Fetches ticket token balance for an address from the contract.
 * Returns token count as a BigInt-compatible string.
 * Throws on contract or RPC error or timeout.
 */
async function fetchTicketBalance(address, signal) {
  return await withTimeout(contract.methods.balanceOf(address).call(), signal);
}

/**
 * Fetches total minted supply and the ticket cap from the contract.
 * Returns { totalMinted: string, cap: string, remaining: string }.
 * Throws on contract or RPC error or timeout.
 */
async function fetchSupplyInfo(signal) {
  const [totalMinted, cap] = await Promise.all([
    withTimeout(contract.methods.totalSupply().call(), signal),
    withTimeout(contract.methods.ticketCap().call(), signal)
  ]);
  const remaining = String(BigInt(cap) - BigInt(totalMinted));
  return { totalMinted, cap, remaining };
}

// ─── Role-specific result renderers ──────────────────────────────────────────

/**
 * Renders the attendee view.
 * Queries: eth_getBalance + balanceOf
 */
async function renderAttendeeView(address, signal) {
  const [weiBalance, ticketBalance] = await Promise.all([
    fetchEthBalance(address, signal),
    fetchTicketBalance(address, signal)
  ]);

  attendeeEthBalance.textContent    = formatEth(weiBalance);
  attendeeTicketBalance.textContent = ticketBalance.toString();

  viewAttendee.classList.remove("card--hidden");
}

/**
 * Renders the doorman view.
 * Queries: balanceOf ONLY — eth_getBalance is intentionally not called.
 * VALID = balance >= 1 token.
 */
async function renderDoormanView(address, signal) {
  // eth_getBalance is deliberately NOT called here.
  // See ROLES.doorman.queries and the privacy note in balance.html.
  const ticketBalance = await fetchTicketBalance(address, signal);
  const count         = BigInt(ticketBalance);
  const isValid       = count >= 1n;

  doormanTicketBalance.textContent = ticketBalance.toString();

  // Apply validity styling
  validityBlock.className = `validity-block ${isValid ? "validity-block--valid" : "validity-block--invalid"}`;
  validityIcon.textContent  = isValid ? "✅" : "❌";
  validityLabel.textContent = isValid ? "VALID" : "INVALID";

  viewDoorman.classList.remove("card--hidden");
}

/**
 * Renders the vendor view.
 * Queries: eth_getBalance + balanceOf + totalSupply + ticketCap
 */
async function renderVendorView(address, signal) {
  const [weiBalance, ticketBalance, supplyInfo] = await Promise.all([
    fetchEthBalance(address, signal),
    fetchTicketBalance(address, signal),
    fetchSupplyInfo(signal)
  ]);

  vendorEthBalance.textContent      = formatEth(weiBalance);
  vendorTicketBalance.textContent   = ticketBalance.toString();
  vendorSupplyRemaining.textContent = supplyInfo.remaining;
  vendorSupplyCap.textContent       = supplyInfo.cap;

  viewVendor.classList.remove("card--hidden");
}

// ─── Main query dispatcher ────────────────────────────────────────────────────

async function runQuery() {
  clearAddressError();

  // Fix #3: Check if contract is configured (not the placeholder address)
  if (!IS_CONTRACT_CONFIGURED) {
    showError(
      "App not configured",
      "The contract address in config.js is still the placeholder (0x000...000). Deploy the contract and update config.js with the real address."
    );
    return;
  }

  const rawAddress = inputAddress.value.trim();

  // Edge case: empty field
  if (!rawAddress) {
    setAddressError("Please enter a wallet address.");
    return;
  }

  // Fix #2: Detect ENS names and reject with clear message
  if (looksLikeEnsName(rawAddress)) {
    setAddressError("ENS names are not supported. Enter a full Ethereum address (0x...).");
    return;
  }

  // Edge case: invalid format
  if (!isValidEthAddress(rawAddress)) {
    setAddressError("Invalid Ethereum address. Must start with 0x followed by 40 hex characters.");
    return;
  }

  // Fix #1: Validate checksum and warn user if incorrect (non-fatal — continue with normalized address)
  if (rawAddress !== rawAddress.toLowerCase() && rawAddress !== rawAddress.toUpperCase()) {
    // Mixed case — attempt checksum validation
    try {
      const checksummed = web3.utils.toChecksumAddress(rawAddress);
      if (checksummed !== rawAddress) {
        setAddressError("⚠️ Address checksum is incorrect. Correcting to: " + checksummed);
      }
    } catch {
      // Checksum validation failed — reject
      setAddressError("Invalid address checksum. Please double-check the address.");
      return;
    }
  }

  hideAllSections();
  showLoading();

  // Fix #5: Create abort controller for this query so it can be cancelled if the role changes
  currentQueryAbort = new AbortController();
  const signal = currentQueryAbort.signal;

  try {
    // Normalise to checksum address so RPC calls accept it
    const address = web3.utils.toChecksumAddress(rawAddress);

    resultTitle.textContent        = ROLES[activeRole].label;
    resultAddressBadge.textContent = truncateAddress(address);

    // Dispatch to the correct role renderer — each has its own query set
    // Pass the abort signal so the queries can be cancelled if the role changes
    switch (activeRole) {
      case "attendee": await renderAttendeeView(address, signal); break;
      case "doorman":  await renderDoormanView(address, signal);  break;
      case "vendor":   await renderVendorView(address, signal);   break;
    }

    hideLoading();
    sectionResult.classList.remove("card--hidden");

  } catch (err) {
    // Classify the error to give an actionable message
    const isRpcError      = err.message && (
      err.message.includes("CONNECTION ERROR") ||
      err.message.includes("Invalid JSON") ||
      err.message.includes("net::ERR") ||
      err.message.includes("timed out")
    );
    const isContractError = err.message && (
      err.message.includes("revert") ||
      err.message.includes("execution reverted")
    );
    const isCancelled     = err.message && err.message.includes("cancelled");

    // Fix #5: If the user switched roles, silently ignore the error
    if (isCancelled) {
      hideLoading();
      return;
    }

    if (isRpcError) {
      showError(
        "Cannot reach Sepolia network",
        "The RPC endpoint is not responding or the request timed out after 10 seconds. Check your internet connection or try again shortly."
      );
    } else if (isContractError) {
      showError(
        "Contract query failed",
        "The contract returned an error. The contract address in config.js may be incorrect or the contract may not be deployed yet."
      );
    } else {
      showError(
        "Query failed",
        "An unexpected error occurred. The contract may not be deployed to Sepolia yet, or the address is unreachable."
      );
    }
  }
}

// ─── Reset to query another address ──────────────────────────────────────────

function clearResult() {
  hideAllSections();
  inputAddress.value = "";
  clearAddressError();
}

// ─── Event listeners ──────────────────────────────────────────────────────────

roleBtns.forEach(btn => {
  btn.addEventListener("click", () => selectRole(btn.dataset.role));
});

btnCheck.addEventListener("click", runQuery);
btnClearResult.addEventListener("click", clearResult);

inputAddress.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runQuery();
});

// Clear inline error as user corrects the address
inputAddress.addEventListener("input", clearAddressError);

// ─── Boot ─────────────────────────────────────────────────────────────────────

initWeb3();
selectRole("attendee"); // Set default role on load
