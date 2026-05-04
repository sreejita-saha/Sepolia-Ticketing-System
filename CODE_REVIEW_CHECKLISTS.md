# Code Review Checklists
## Sepolia Ticketing DApp — Component-Specific Checklists

Use these checklists after AI-generated code is delivered. Tick off each item, add comments where relevant, and only mark the component **Accepted** when all items are checked.

---

## 1. Solidity Smart Contract (TicketingSystem.sol)

### Security Concerns
- [ ] **Reentrancy Protection**
  - Withdrawal logic follows checks-effects-interactions pattern
  - External calls to users happen after state updates
  - Comments: ___________________________

- [ ] **Access Control**
  - Only event creators can modify their events
  - Only contract owner can withdraw fees (if applicable)
  - No role bypass vulnerabilities
  - Comments: ___________________________

- [ ] **Integer Overflow / Underflow**
  - Solidity version is ^0.8.x (built-in overflow protection)
  - No manual arithmetic that could bypass safeguards
  - Comments: ___________________________

- [ ] **Unchecked External Calls**
  - No `call()` without try-catch
  - Transfers use safer patterns (e.g., OpenZeppelin's `SafeTransferFrom` if using ERC-721)
  - Comments: ___________________________

- [ ] **Private Key / Secret Exposure**
  - No private keys, seed phrases, or API keys in contract code
  - Comments: ___________________________

- [ ] **Malicious Input Validation**
  - Event name/description length limits enforced (prevent unbounded storage)
  - Ticket price > 0 (prevent free tickets or underpriced tickets)
  - Event date > block.timestamp (prevent past event dates)
  - Comments: ___________________________

### Edge Cases
- [ ] **Zero Values**
  - Creating event with 0 tickets rejected
  - Buying 0 tickets rejected
  - Setting price to 0 handled explicitly
  - Comments: ___________________________

- [ ] **Boundary Conditions**
  - Buying exactly `ticketCap` tickets succeeds
  - Buying `ticketCap + 1` tickets fails with clear error
  - Comments: ___________________________

- [ ] **State Transitions**
  - Cannot buy tickets after event date passes (if time-gated)
  - Cannot modify sold-out events
  - Cancelling an event with ticket holders handled gracefully
  - Comments: ___________________________

- [ ] **Duplicate / Conflicting Operations**
  - Buying same ticket twice prevented (unique token ID or quantity tracking)
  - Transferring ticket you don't own rejected
  - Comments: ___________________________

### Correctness Against Project Brief
- [ ] **Event Creation**
  - Creator can create events with name, description, date, ticket cap, price
  - Event has a unique ID
  - Creator is stored (for later modifications)
  - Comments: ___________________________

- [ ] **Ticket Purchase**
  - User pays exact price in ETH per ticket
  - Purchased tickets are tracked to user (ERC-721 token or mapping)
  - Event ticket count decreases correctly
  - Comments: ___________________________

- [ ] **Ticket Transfer**
  - Ticket holder can transfer owned ticket to another address
  - Transfer cannot be to zero address
  - Original holder loses ticket after transfer
  - New holder gains it
  - Comments: ___________________________

- [ ] **Balance Checking**
  - Contract exposes function to query user's tickets for a given event (or all events)
  - Returns correct count
  - Comments: ___________________________

### Gas Efficiency
- [ ] **Storage Optimization**
  - Structs are packed efficiently (smaller types first to minimize padding)
  - No unnecessary state variables
  - Mappings used instead of arrays where appropriate
  - Comments: ___________________________

- [ ] **Loop Efficiency**
  - No unbounded loops that could cause out-of-gas
  - If iterating user tickets, loop is limited or pagination exists
  - Comments: ___________________________

- [ ] **Function Optimization**
  - Read-only functions marked `view` or `pure`
  - State-changing functions not marked `view`
  - Comments: ___________________________

- [ ] **Event Emission**
  - Events emitted for key state changes (ticket purchased, transferred, etc.)
  - Events used for off-chain indexing, not excessive logging
  - Comments: ___________________________

---

## 2. Wallet Creation Page (index.html + frontend/js/wallet.js)

### Security Concerns
- [ ] **Wallet Connection**
  - MetaMask or Web3 provider check present (detect if wallet unavailable)
  - No prompts for private keys or seed phrases
  - Connection request is user-initiated (not auto-connect)
  - Comments: ___________________________

- [ ] **Network Verification**
  - Sepolia chain ID (11155111) is checked before allowing transactions
  - User is prompted to switch networks if on wrong chain
  - Comments: ___________________________

- [ ] **Input Sanitization**
  - Wallet address checked for valid Ethereum format (0x + 40 hex chars)
  - No XSS vectors in address display (use `.textContent` not `.innerHTML`)
  - Comments: ___________________________

- [ ] **Error Handling**
  - Rejection of wallet connection request handled gracefully
  - User denied transaction prompt caught and displayed
  - Comments: ___________________________

### Edge Cases
- [ ] **Wallet Not Installed**
  - Clear message if MetaMask / wallet not detected
  - Links to download / install wallet
  - Comments: ___________________________

- [ ] **Multiple Wallet Instances**
  - If user has multiple wallet extensions, behavior is defined
  - Comments: ___________________________

- [ ] **Account Switching**
  - Page detects when user switches accounts in MetaMask
  - Display updates to show new account
  - Comments: ___________________________

- [ ] **Network Switching**
  - Page detects when user switches networks
  - Warns if user is not on Sepolia
  - Comments: ___________________________

### Correctness Against Project Brief
- [ ] **Wallet Display**
  - Connected wallet address shown on page (truncated or full)
  - Address is human-readable (checksum format)
  - Comments: ___________________________

- [ ] **Connection State**
  - Visual indicator shows when wallet is connected vs. disconnected
  - "Connect Wallet" button appears when disconnected
  - "Disconnect" or account display appears when connected
  - Comments: ___________________________

- [ ] **Persistent State (Optional)**
  - If reconnect on page reload is desired, localStorage used appropriately
  - No sensitive data stored in localStorage
  - Comments: ___________________________

### UX Quality
- [ ] **Visual Feedback**
  - Button disabled while wallet is connecting
  - Loading spinner or message shown
  - Comments: ___________________________

- [ ] **Error Messages**
  - User-friendly error text (not raw error codes)
  - Examples: "MetaMask not detected" instead of "provider is undefined"
  - Comments: ___________________________

- [ ] **Accessibility**
  - Button has clear label and is keyboard accessible
  - Color not the only indicator of connection state
  - Comments: ___________________________

- [ ] **Mobile Compatibility**
  - Page works on mobile if MetaMask mobile app available
  - Comments: ___________________________

---

## 3. Balance Check Page (frontend/html/balance.html + frontend/js/pages/balance.js)

### Security Concerns
- [ ] **Address Lookup**
  - Address input sanitized (no XSS, must be valid Ethereum address)
  - Can look up any address (not just connected wallet)
  - Malicious input (e.g., very long string) does not crash page
  - Comments: ___________________________

- [ ] **Contract Query Safety**
  - Read-only call to contract (no transaction risk)
  - Failed query handled without crashing
  - Comments: ___________________________

### Edge Cases
- [ ] **Zero Balance**
  - User with no tickets displays 0 (not blank, error, or undefined)
  - Comments: ___________________________

- [ ] **Invalid Address**
  - Non-Ethereum-format address shows error message
  - Comments: ___________________________

- [ ] **No Connected Wallet**
  - Balance check still works for any address (read-only, requires RPC only)
  - Or, if design requires connected wallet, clear message shown
  - Comments: ___________________________

- [ ] **Multiple Events**
  - If user has tickets for multiple events, all are shown
  - Each event's tickets counted correctly
  - Comments: ___________________________

### Correctness Against Project Brief
- [ ] **Balance Query**
  - Page calls contract function to fetch user's ticket count
  - Queries work for events they own tickets for
  - Comments: ___________________________

- [ ] **Display Format**
  - Shows which events the user has tickets for
  - Shows count of tickets per event
  - Comments: ___________________________

- [ ] **Lookback Capability**
  - Can search any address's balance (if design allows)
  - Or only shows connected wallet's balance (acceptable if stated)
  - Comments: ___________________________

### UX Quality
- [ ] **Clarity**
  - "Your Tickets" or "Balance" section is clearly labeled
  - Each event is listed with its name and ticket count
  - Comments: ___________________________

- [ ] **Loading State**
  - Page shows loading indicator while querying contract
  - Comments: ___________________________

- [ ] **Empty State**
  - If user has no tickets, a message like "You don't have any tickets yet" shown
  - Not a blank page or error state
  - Comments: ___________________________

- [ ] **Mobile Responsive**
  - Layout adapts to small screens
  - Ticket list scrollable if long
  - Comments: ___________________________

---

## 4. Ticket Purchase Page (frontend/html/buy.html + frontend/js/pages/buy.js)

### Security Concerns
- [ ] **Price Verification**
  - User sees event price before confirming purchase
  - Price shown matches contract price (no client-side spoofing)
  - Comments: ___________________________

- [ ] **Transaction Safety**
  - User is shown transaction details (price, gas estimate, recipient address)
  - User explicitly confirms before sending transaction
  - Comments: ___________________________

- [ ] **Input Validation**
  - Quantity input is a positive integer
  - Quantity ≤ available tickets
  - Quantity input cannot be negative or non-numeric
  - Comments: ___________________________

- [ ] **Double-Spend Prevention**
  - Buy button disabled after transaction sent, re-enabled on completion
  - No risk of accidental double-click resulting in two transactions
  - Comments: ___________________________

- [ ] **Address Verification**
  - Contract address hardcoded or loaded from config (not user input)
  - Comments: ___________________________

### Edge Cases
- [ ] **Sold-Out Event**
  - Attempting to buy from sold-out event shows error
  - Buy button disabled if no tickets available
  - Comments: ___________________________

- [ ] **Insufficient Funds**
  - User attempting to buy with insufficient ETH shown error
  - Transaction rejected with clear message
  - Comments: ___________________________

- [ ] **Past Event Date**
  - Cannot buy tickets for past events (if time-gated)
  - Comments: ___________________________

- [ ] **Buying More Than Available**
  - Quantity > available tickets rejected
  - User is shown how many tickets remain
  - Comments: ___________________________

- [ ] **Failed Transaction**
  - Contract revert messages displayed to user (e.g., "Event sold out")
  - Comments: ___________________________

### Correctness Against Project Brief
- [ ] **Event List Display**
  - All active events are listed with name, date, price, tickets available
  - Comments: ___________________________

- [ ] **Purchase Flow**
  - User selects event
  - User selects quantity
  - User sees total price (quantity × price per ticket)
  - User confirms and sends transaction
  - Comments: ___________________________

- [ ] **Confirmation**
  - After transaction succeeds, user sees transaction hash
  - User is informed they now own the ticket(s)
  - Comments: ___________________________

- [ ] **Integration with Balance**
  - Purchased tickets reflected in balance check page
  - Comments: ___________________________

### Gas Efficiency
- [ ] **Transaction Optimization**
  - No unnecessary contract calls before purchase
  - Gas estimate shown is accurate (not inflated)
  - Comments: ___________________________

- [ ] **Batch Operations (if applicable)**
  - If buying multiple tickets, done in single transaction (not loop)
  - Comments: ___________________________

### UX Quality
- [ ] **Event Display**
  - Events shown in readable format (table or cards)
  - Sortable by date, price, or availability (nice-to-have)
  - Comments: ___________________________

- [ ] **Quantity Selection**
  - Quantity selector is intuitive (dropdown, input box, or +/- buttons)
  - Max available tickets shown
  - Comments: ___________________________

- [ ] **Price Display**
  - Total cost shown before confirmation
  - Gas fees explained (if applicable)
  - Comments: ___________________________

- [ ] **Transaction Feedback**
  - Pending transaction shown with spinner or "Awaiting confirmation" message
  - Once mined, success message with link to etherscan
  - Comments: ___________________________

- [ ] **Error Messages**
  - Clear explanations of why purchase failed
  - Actionable guidance (e.g., "Switch to Sepolia" or "Add funds to wallet")
  - Comments: ___________________________

- [ ] **Mobile Responsive**
  - Event cards stack on mobile
  - Quantity selector and button easy to tap
  - Comments: ___________________________

---

## 5. Ticket Transfer Page (frontend/html/transfer.html + frontend/js/pages/transfer.js)

### Security Concerns
- [ ] **Ownership Verification**
  - User can only see/transfer tickets they own
  - Contract enforces: only ticket holder can initiate transfer
  - Comments: ___________________________

- [ ] **Recipient Address Validation**
  - Recipient address must be valid Ethereum format (0x + 40 hex)
  - Cannot transfer to zero address (0x0000...)
  - Cannot transfer to contract address (optional but recommended)
  - Comments: ___________________________

- [ ] **XSS Prevention**
  - Recipient address input escaped (no innerHTML injection)
  - Ticket ID displayed safely
  - Comments: ___________________________

- [ ] **Transaction Confirmation**
  - User explicitly confirms recipient before sending
  - Recipient address clearly shown in confirmation dialog
  - Comments: ___________________________

- [ ] **Double-Transfer Prevention**
  - Button disabled after transaction sent
  - No accidental duplicate transfers via double-click
  - Comments: ___________________________

### Edge Cases
- [ ] **No Tickets to Transfer**
  - User with no tickets shown appropriate message
  - Transfer button disabled
  - Comments: ___________________________

- [ ] **Invalid Recipient**
  - Non-Ethereum-format address rejected with error message
  - Comments: ___________________________

- [ ] **Transferring to Self**
  - Either allowed (harmless) or explicitly prevented with message
  - Decision documented
  - Comments: ___________________________

- [ ] **Failed Transfer**
  - Contract revert (e.g., "You don't own this ticket") shown to user
  - Transaction hash provided for debugging
  - Comments: ___________________________

- [ ] **Network/Wallet Disconnected During Transfer**
  - Error caught and user notified
  - User prompted to reconnect wallet
  - Comments: ___________________________

### Correctness Against Project Brief
- [ ] **Ticket Listing**
  - All tickets owned by user are listed
  - Each ticket shows event name and ticket ID
  - Comments: ___________________________

- [ ] **Transfer Mechanism**
  - User selects ticket to transfer
  - User enters recipient address
  - User confirms transfer
  - Transaction sent to contract
  - Comments: ___________________________

- [ ] **Ownership Transfer**
  - After transfer succeeds, original owner no longer owns ticket
  - New owner can see it in their balance
  - Transferability matches contract design (if one-time transfer, documented)
  - Comments: ___________________________

### UX Quality
- [ ] **Ticket Selection**
  - User's tickets displayed in readable format (list or cards)
  - Each ticket clearly shows which event it belongs to
  - Comments: ___________________________

- [ ] **Recipient Input**
  - Clear label: "Recipient Ethereum Address"
  - Placeholder or hint showing format: "0x..."
  - Comments: ___________________________

- [ ] **Confirmation Dialog**
  - Shows:
    - Which ticket (event name, ticket ID)
    - Recipient address (user can verify)
    - Button to cancel or confirm
  - Comments: ___________________________

- [ ] **Success Feedback**
  - Confirmation message shows:
    - Transaction hash (clickable link to Etherscan)
    - "Ticket transferred successfully"
  - Comments: ___________________________

- [ ] **Loading State**
  - Spinner or progress indicator shown while transfer pending
  - Comments: ___________________________

- [ ] **Mobile Responsive**
  - Ticket list scrollable on small screens
  - Address input full-width and easy to edit
  - Confirmation modal readable on mobile
  - Comments: ___________________________

---

## Sign-Off Template

After completing all checklists, use this to confirm:

```
## [COMPONENT NAME] — Code Review Sign-Off

**Date Reviewed:** YYYY-MM-DD
**Reviewer:** Sreejita
**All Items Checked:** [ ] Yes / [ ] No

**Critical Issues Found:** 
(List any security, correctness, or UX blockers here)

**Minor Issues / Notes:**
(Suggestions for improvement, deferred tasks)

**Status:** [ ] Accepted / [ ] Needs Revision

**Signature:** _______________
```

---

## Notes

- **Order of Review:** We recommend reviewing in this order: (1) contract, (2) wallet, (3) balance, (4) purchase, (5) transfer. Each depends on prior components.
- **Acceptance Threshold:** All items in Security, Edge Cases, and Correctness sections **must** be checked. UX and Gas Efficiency items are important but less critical to accept.
- **Comments Column:** Use comments to record assumptions, deferred items, or design decisions made during review.
