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
