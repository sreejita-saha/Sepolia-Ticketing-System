# Changelog
## Sepolia Ticketing DApp

All entries follow the format defined in the project structure plan.
Status progression: `AI Generated` → `Human Reviewed` → `Accepted`

---

## [WALLET CREATION] 2026-05-04

### File: `frontend/create-wallet.html`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Wallet creation page — password entry form and result display with security warning.
- **Human changes:** Human review showed few security such as issues which where prompted to be fixed
- **Accepted on:** — 04/05/2025
- **Notes:** Uses CDN-loaded Web3.js. SRI hash on script tag should be verified against published CDN file before acceptance.

### File: `frontend/css/main.css`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Global styles, design tokens, layout primitives, and shared component styles for the entire DApp.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Dark theme with CSS custom properties. Can be extended per-page without modification.

### File: `frontend/css/pages/create-wallet.css`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Page-specific styles for the wallet creation page (warning banner, result boxes, countdown).
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Imports design tokens from main.css — both files must be loaded together.

### File: `frontend/js/pages/create-wallet.js`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Wallet generation logic using Web3.js; handles password validation, keystore encryption/download, 30-second countdown, clipboard copy, and reset.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** No third-party key generation library used. Private key overwritten in DOM after countdown. Keystore download uses object URL revoked immediately after click.

---

## [BALANCE CHECK] 2026-05-04

### File: `frontend/js/config.js`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Shared config — CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL, CHAIN_ID. All pages load this before their own script.
- **Human changes:** Some UX changes and error prevention changes
- **Accepted on:** —
- **Notes:** CONTRACT_ADDRESS is set to zero address placeholder — must be updated after first deployment. ABI contains only the three functions used by the balance page; extend as more pages are added.

### File: `frontend/balance.html`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Three-role balance check page — Attendee, Doorman, Vendor — each with distinct query logic and display.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** CSP allows connect-src to rpc.sepolia.org only. SETH balance is structurally absent from the Doorman view (not queried, not present in DOM). SRI hash on Web3.js CDN script must be verified before acceptance.

### File: `frontend/css/pages/balance.css`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Page-specific styles for balance.html — role selector, stat cards, validity block, spinner, error card.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Uses color-mix() for tinted backgrounds — verify browser support if IE11 or old Safari is a concern (not applicable for a Web3 DApp targeting modern browsers).

### File: `frontend/js/pages/balance.js`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Three-role query dispatcher — Attendee queries ETH+tickets, Doorman queries tickets only, Vendor queries ETH+tickets+supply. All queries are live, no caching.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** DOORMAN role does not call eth_getBalance at all (not just hidden in UI — the RPC call is never made). BigInt used for remaining supply calculation to avoid precision loss on large uint256 values. Error classifier distinguishes RPC failure from contract revert for actionable error messages. Includes five error-handling fixes: (1) checksum validation with user warning, (2) ENS name detection + rejection, (3) unconfigured contract detection, (4) 10-second query timeout with UX message, (5) query cancellation when user switches roles.

---

## [TICKET PURCHASE] 2026-05-04

### File: `frontend/buy.html`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Ticket purchase page with eight transaction states: idle (price display), wallet loading (private key/keystore), insufficient balance warning, sold out message, pending (with tx hash), success (with updated balance), reverted (with parsed reason), and rejected (user cancelled).
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** CSP allows connect-src to https://rpc.sepolia.org and https://sepolia.etherscan.io (for Etherscan links). All transaction states fully handled with user-friendly messaging. Private key and keystore password fields support two distinct wallet loading paths.

### File: `frontend/css/pages/buy.css`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Page-specific styles for buy.html — price display, wallet loader, transaction state cards, spinners, and detail sections.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Uses color-mix() for success card background. Responsive layout with single-column stacking on mobile. Includes keyframe animation for spinner. Etherscan link styling with hover effects.

### File: `frontend/js/pages/buy.js`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Comprehensive ticket purchase logic handling all eight transaction states with detailed error parsing and revert reason classification.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Wallet loading supports private key (0x format validation) and encrypted keystore file with password decryption. Ticket price fetched once on page load via call() (free, no gas). Transaction submitted via signTransaction() + sendSignedTransaction() for client-side control. Revert reason parser classifies common errors (insufficient funds, sold out, already owns, paused, price mismatch) into plain English. Polling mechanism waits up to 5 minutes for transaction receipt. Error handler distinguishes rejection (user cancelled) from revert (failed on-chain). Recovery buttons allow retry or wallet change without page reload.

### File: `frontend/js/config.js` (updated)
- **Status:** Human Reviewed
- **AI-generated:** Partial
- **Author:** Claude (AI) → Sreejita (added buy page ABI entries)
- **Summary:** Added three new ABI entries for ticket purchase: ticketPrice (view), ticketsRemaining (view), buyTicket (payable).
- **Human changes:** Extended CONTRACT_ABI array with buy page functions
- **Accepted on:** —
- **Notes:** ticketPrice and ticketsRemaining are read-only (view), cost no gas. buyTicket is payable and requires wei value matching ticket price.

---

## [SHARED UTILITIES] 2026-05-04

### File: `frontend/js/utils.js`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Shared utility functions imported by all frontend pages — error parsing, formatting, validation, and async helpers.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Provides parseRevertReason() with SETHTicket contract-specific error handling (incorrect amount, no tickets, insufficient balance) plus MetaMask rejections and network errors. Also provides formatEth(), truncateAddress(), getEtherscanLink(), clearInputField(), isValidEthAddress(), isValidPrivateKey(), looksLikeEnsName(), createTimeout(), and withTimeout() as shared, reusable utilities. Imported by buy.html, balance.html, and create-wallet.html after Web3.js but before page scripts.

### File: `frontend/buy.html` (updated)
- **Status:** Human Reviewed
- **AI-generated:** Partial
- **Author:** Claude (AI) → Sreejita (added utils.js import)
- **Summary:** Updated to load utils.js before buy.js to enable shared error parsing.
- **Human changes:** Added <script src="js/utils.js"></script> in script loading order
- **Accepted on:** —
- **Notes:** Script load order now: Web3.js (CDN) → utils.js → config.js → buy.js

### File: `frontend/js/pages/buy.js` (updated)
- **Status:** Human Reviewed
- **AI-generated:** Partial
- **Author:** Claude (AI) → Claude (refactored to use utils)
- **Summary:** Refactored to import and use parseRevertReason(), formatEth(), truncateAddress(), and getEtherscanLink() from utils.js.
- **Human changes:** Removed duplicate function definitions, added utils.js validation check
- **Accepted on:** —
- **Notes:** Functions now sourced from shared utils.js for consistency across all pages.

### File: `frontend/balance.html` (updated)
- **Status:** Human Reviewed
- **AI-generated:** Partial
- **Author:** Claude (AI) → Claude (added utils.js import)
- **Summary:** Updated to load utils.js before balance.js to enable shared helpers.
- **Human changes:** Added <script src="js/utils.js"></script> in script loading order
- **Accepted on:** —
- **Notes:** Script load order now: Web3.js (CDN) → utils.js → config.js → balance.js

### File: `frontend/js/pages/balance.js` (updated)
- **Status:** Human Reviewed
- **AI-generated:** Partial
- **Author:** Claude (AI) → Claude (refactored to use utils)
- **Summary:** Refactored to import and use formatEth(), truncateAddress(), isValidEthAddress(), and looksLikeEnsName() from utils.js.
- **Human changes:** Removed duplicate function definitions, added utils.js validation check
- **Accepted on:** —
- **Notes:** Functions now sourced from shared utils.js for consistency.

### File: `frontend/create-wallet.html` (updated)
- **Status:** Human Reviewed
- **AI-generated:** Partial
- **Author:** Claude (AI) → Claude (added utils.js import)
- **Summary:** Updated to load utils.js before create-wallet.js for future cross-page utility consistency.
- **Human changes:** Added <script src="js/utils.js"></script> in script loading order
- **Accepted on:** —
- **Notes:** Script load order now: Web3.js (CDN) → utils.js → create-wallet.js. Future enhancements can use shared utils without modification to this file.

---

## [TICKET RETURN] 2026-05-05

### File: `contracts/TicketingSystem.sol` (updated)
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Added `returnTicket(uint256 quantity)` function and `TicketReturned` event to allow attendees to return tickets to the vendor's remaining supply.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Requires redeployment after this change; CONTRACT_ADDRESS in config.js must be updated to the new deployment address.

### File: `frontend/transfer.html`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Ticket return page with seven transaction states: wallet loader, wallet loaded (with attendee + vendor balance), no-tickets warning, return form (quantity input), pending (spinner + tx hash link), success (updated dual balances), reverted (revert reason + tx hash), and network/wallet error.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** CSP matches buy.html — connect-src allows sepolia.drpc.org and sepolia.etherscan.io. Script load order: layout.js → Web3.js (CDN) → utils.js → config.js → transfer.js.

### File: `frontend/css/pages/transfer.css`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Page-specific styles for transfer.html — wallet info panel, no-tickets warning, quantity form, spinner, success/error/reverted state cards, result detail rows, and Etherscan link.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Patterns reused from buy.css. Responsive layout with 640px breakpoint for mobile stacking.

### File: `frontend/js/pages/transfer.js`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** State machine for ticket return flow — wallet unlock (private key + keystore), pre-return balance fetch (attendee tickets + vendor remaining), quantity validation, transaction sign/send, polling for receipt, dual balance verification on success, and revert reason parsing on failure.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** "Return Another" resets to wallet-loaded state and re-fetches both balances without reloading the page. Polling waits up to 5 minutes (60 attempts × 5s). Revert reason parser uses shared parseRevertReason() from utils.js.

### File: `frontend/js/config.js` (updated)
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Added `returnTicket(uint256)` ABI entry to CONTRACT_ABI to support the ticket return page.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** returnTicket is nonpayable — no ETH value sent, gas only.

---

## [SHARED LAYOUT] 2026-05-06

### File: `frontend/js/layout.js`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Single-source-of-truth injector for the shared site header (logo + nav) and footer. Runs as an IIFE on every page, detects the current filename, marks the correct nav link active, and injects HTML into `#site-header` and `#site-footer` placeholders.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** No fetch, no routing, no build step — works with Live Server directly. Each page remains a standalone HTML file; layout.js handles only the chrome. All five pages (index, create-wallet, balance, buy, transfer) load this as their first script.

### File: `frontend/index.html` (updated)
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Replaced hardcoded header/footer/nav markup with empty `#site-header` and `#site-footer` placeholder elements. Loads layout.js to inject shared chrome at runtime.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Eliminates nav duplication. Any nav change now requires editing only layout.js.

### File: `frontend/buy.html` (updated)
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Replaced hardcoded header/footer/nav markup with layout.js placeholder pattern.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** layout.js loads before Web3.js CDN in script order.

### File: `frontend/balance.html` (updated)
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Replaced hardcoded header/footer/nav markup with layout.js placeholder pattern.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** layout.js loads before Web3.js CDN in script order.

### File: `frontend/transfer.html` (updated)
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Replaced hardcoded header/footer/nav markup with layout.js placeholder pattern.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** layout.js loads before Web3.js CDN in script order.

### File: `frontend/create-wallet.html` (updated)
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Replaced hardcoded header/footer/nav markup with layout.js placeholder pattern.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** layout.js loads before Web3.js CDN in script order.

### File: `frontend/base-layout.html` (deleted)
- **Status:** Removed
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** SPA-style fetch-based layout shell — superseded by layout.js injector approach. Deleted as redundant.
- **Notes:** The fetch-based SPA approach was abandoned in favour of standalone HTML pages + shared JS injector, which requires no server-side routing and works directly with Live Server.

---

## [DOCUMENTATION] 2026-05-06

### File: `README.md`
- **Status:** AI Generated
- **AI-generated:** Yes
- **Author:** Claude (AI)
- **Summary:** Full project README covering overview, requirements table, features, project structure, quick start guide, smart contract functions, tech stack, architecture summary, security notes, troubleshooting table, and references.
- **Human changes:** None yet
- **Accepted on:** —
- **Notes:** Requirements table lists: Sepolia Testnet, SETH (from faucet), local web server, modern browser, Ethereum wallet (private key or keystore).
