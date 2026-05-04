// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TicketingSystem
 * @dev ERC-20 compliant ticketing system for Sepolia testnet with buyTicket, returnTicket,
 *      and withdraw functions. Implements custom reentrancy guard using mutex pattern on
 *      all payable/ETH-sending functions. Uses unchecked arithmetic after require checks
 *      for gas optimization. Follows Checks-Effects-Interactions pattern.
 */
contract TicketingSystem {
    // ─── ERC-20 Standard State ────────────────────────────────────────────────────

    /// @dev Token name
    string public constant name = "Sepolia Tickets";

    /// @dev Token symbol
    string public constant symbol = "TICKET";

    /// @dev Token decimals (18 = standard)
    uint8 public constant decimals = 18;

    /// @dev Total supply of tokens (never changes, all minted in constructor)
    uint256 public totalSupply;

    /// @dev ERC-20 balance mapping: address => token balance
    mapping(address => uint256) public balanceOf;

    /// @dev ERC-20 allowance mapping: owner => (spender => amount)
    mapping(address => mapping(address => uint256)) public allowance;

    // ─── Ticketing System State ───────────────────────────────────────────────────

    /// @dev Owner address (sole beneficiary of ticket sales)
    address public owner;

    /// @dev Ticket price in wei (e.g., 0.01 ether = 10000000000000000 wei)
    uint256 public ticketPrice;

    /// @dev Ticket cap: max tokens that can ever exist
    uint256 public ticketCap;

    /// @dev Tickets remaining for purchase (cap - totalSupply)
    /// Note: For gas efficiency, this is computed rather than stored as a separate value.
    ///       Kept as a computed property to save storage reads.

    /// @dev Reentrancy guard: 1 = unlocked, 2 = locked
    /// Security: prevents reentrancy attacks on payable/ETH-sending functions
    uint256 private reentrancyLock = 1;

    /// @dev ETH balance tracked for withdraw function (ensures atomicity with transfers)
    uint256 private ethBalance = 0;

    // ─── ERC-20 Events ───────────────────────────────────────────────────────────

    /// @dev Emitted when tokens are transferred (ERC-20 standard)
    event Transfer(address indexed from, address indexed to, uint256 value);

    /// @dev Emitted when allowance is set (ERC-20 standard)
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ─── Ticketing Events ────────────────────────────────────────────────────────

    /// @dev Emitted when a ticket is purchased
    event TicketPurchased(address indexed buyer, uint256 quantity);

    /// @dev Emitted when a ticket is returned
    event TicketReturned(address indexed returner, uint256 quantity);

    /// @dev Emitted when owner withdraws accumulated ETH
    event Withdrawal(address indexed beneficiary, uint256 amount);

    // ─── Reentrancy Guard Modifier ────────────────────────────────────────────────

    /// @dev Mutex-pattern reentrancy guard: prevents reentrancy on payable/ETH-sending functions.
    /// Security: sets lock to 2 before execution, back to 1 after. Reverts if already locked.
    modifier nonReentrant() {
        require(reentrancyLock == 1, "No reentrancy");
        reentrancyLock = 2;
        _;
        reentrancyLock = 1;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────────

    /// @dev Initializes the ticketing system with a token supply and ticket price.
    /// @param _initialSupply Number of whole tokens to mint (e.g., 100 = 100 * 10^18 wei)
    /// @param _ticketPrice Price per ticket in wei (e.g., 0.01 ether = 10000000000000000)
    /// Security: All tokens minted to deployer on construction; cannot be increased.
    ///           Constructor sets owner to msg.sender; owner determined at deploy time.
    constructor(uint256 _initialSupply, uint256 _ticketPrice) {
        owner = msg.sender;
        ticketPrice = _ticketPrice;
        ticketCap = _initialSupply;

        // Mint all initial supply to deployer (10^18 wei per whole token)
        uint256 initialWei = _initialSupply * (10 ** uint256(decimals));
        balanceOf[msg.sender] = initialWei;
        totalSupply = initialWei;

        emit Transfer(address(0), msg.sender, initialWei);
    }

    // ─── ERC-20 Functions ────────────────────────────────────────────────────────

    /// @dev Transfers tokens from caller to recipient (ERC-20 standard).
    /// @param to Recipient address
    /// @param value Token amount (in wei, e.g., 1 token = 10^18)
    /// @return bool Always returns true on success; reverts on failure
    /// Security: Checks balance before transfer (prevent underflow).
    ///           Uses unchecked arithmetic after the require check because underflow is impossible.
    function transfer(address to, uint256 value) public returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[msg.sender] >= value, "Insufficient balance");

        unchecked {
            balanceOf[msg.sender] -= value;
            balanceOf[to] += value;
        }

        emit Transfer(msg.sender, to, value);
        return true;
    }

    /// @dev Approves a spender to transfer tokens on behalf of the caller (ERC-20 standard).
    /// @param spender Address authorized to spend tokens
    /// @param value Maximum amount the spender can transfer
    /// @return bool Always returns true on success
    /// Security: Overwrites previous allowance; caller should set to 0 first to prevent race condition.
    ///           Note: Does NOT prevent allowance race condition; requires careful caller usage.
    function approve(address spender, uint256 value) public returns (bool) {
        require(spender != address(0), "Approve zero address");

        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /// @dev Transfers tokens from one address to another on behalf of a third party (ERC-20 standard).
    /// @param from Source address
    /// @param to Recipient address
    /// @param value Token amount (in wei)
    /// @return bool Always returns true on success; reverts on failure
    /// Security: Checks both balance and allowance. Uses unchecked arithmetic after require checks.
    ///           Allowance is decremented to prevent overspending after delegation.
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");

        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += value;
            allowance[from][msg.sender] -= value;
        }

        emit Transfer(from, to, value);
        return true;
    }

    // ─── Ticketing Functions ──────────────────────────────────────────────────────

    /// @dev Purchases one ticket token from the vendor.
    /// @return bool Always returns true on success; reverts on failure
    /// Security: Uses nonReentrant guard to prevent reentrancy during payment.
    ///           Checks payment amount exactly equals ticketPrice (prevent overpayment).
    ///           Checks vendor has tickets remaining (stored implicitly in balanceOf[owner]).
    ///           Effects: Updates caller balance, decrements owner balance.
    ///           Interactions: None (no external calls).
    /// Gas opt: Uses unchecked arithmetic after require checks (overflow impossible).
    function buyTicket() public payable nonReentrant returns (bool) {
        require(msg.value == ticketPrice, "Incorrect payment amount");
        require(balanceOf[owner] >= (10 ** uint256(decimals)), "No tickets available");

        uint256 tokenAmount = 10 ** uint256(decimals); // 1 whole token in wei

        unchecked {
            balanceOf[owner] -= tokenAmount;
            balanceOf[msg.sender] += tokenAmount;
            ethBalance += msg.value;
        }

        emit TicketPurchased(msg.sender, 1);
        return true;
    }

    /// @dev Returns tickets back to the vendor.
    /// @param quantity Number of whole tokens to return
    /// @return bool Always returns true on success; reverts on failure
    /// Security: Checks quantity > 0 and caller has sufficient balance.
    ///           Effects: Updates caller balance, increments owner balance.
    ///           Interactions: None (no external calls, no ETH transfers).
    /// Gas opt: Uses unchecked arithmetic after require checks (overflow impossible).
    function returnTicket(uint256 quantity) public returns (bool) {
        require(quantity > 0, "Quantity must be at least 1");
        require(balanceOf[msg.sender] >= quantity * (10 ** uint256(decimals)), "Insufficient balance");

        uint256 tokenAmount = quantity * (10 ** uint256(decimals));

        unchecked {
            balanceOf[msg.sender] -= tokenAmount;
            balanceOf[owner] += tokenAmount;
        }

        emit TicketReturned(msg.sender, quantity);
        return true;
    }

    /// @dev Returns the number of tickets remaining for purchase (cap - totalSupply).
    /// @return uint256 Number of whole tickets still available
    /// Security: Computed on-the-fly from storage (no separate state var needed).
    ///           Prevents divergence between stored value and actual availability.
    function ticketsRemaining() public view returns (uint256) {
        uint256 totalTokens = totalSupply / (10 ** uint256(decimals));
        uint256 remaining = ticketCap - totalTokens;
        return remaining;
    }

    // ─── Owner Functions ──────────────────────────────────────────────────────────

    /// @dev Withdraws accumulated ETH from ticket sales. Owner-only.
    /// Security: Uses nonReentrant guard to prevent reentrancy during ETH transfer.
    ///           Checks: Caller is owner, ethBalance > 0.
    ///           Effects: Clears ethBalance to 0 (prevent double-withdraw).
    ///           Interactions: Performs ETH transfer via call (last, per CEI pattern).
    ///           Reverts if call fails, ensuring atomic withdrawal.
    /// Gas opt: Stores balance in memory before clearing (efficient).
    ///          Uses unchecked on decrement (provably safe after require check).
    function withdraw() public nonReentrant {
        require(msg.sender == owner, "Only owner can withdraw");
        require(ethBalance > 0, "No ETH to withdraw");

        uint256 amount = ethBalance;

        unchecked {
            ethBalance = 0;
        }

        // Interactions: perform external call last (Checks-Effects-Interactions)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit Withdrawal(msg.sender, amount);
    }

    /// @dev Returns accumulated ETH balance available for withdrawal.
    /// @return uint256 Amount of ETH (in wei) available to the owner
    function getEthBalance() public view returns (uint256) {
        return ethBalance;
    }
}
