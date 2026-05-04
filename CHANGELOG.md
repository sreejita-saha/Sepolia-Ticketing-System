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
