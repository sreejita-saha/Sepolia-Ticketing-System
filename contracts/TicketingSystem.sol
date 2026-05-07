// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ERC-20 interface — defines the standard functions and events every ERC-20 token must implement
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract TicketingSystem is IERC20 {

    // Token metadata
    string public name = "Sepolia Tickets";
    string public symbol = "TICKET";
    uint8 public decimals = 18;

    // ERC-20 state
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Ticketing state
    address public owner;
    uint256 public ticketPrice;
    uint256 public ticketCap;

    // Custom events for the ticketing system
    event TicketPurchased(address indexed buyer, uint256 quantity);
    event TicketReturned(address indexed returner, uint256 quantity);
    event Withdrawal(address indexed beneficiary, uint256 amount);

    // Sets up the contract: mints all tickets to the deployer and records the ticket price
    constructor(uint256 _initialSupply, uint256 _ticketPrice) {
        owner = msg.sender;
        ticketPrice = _ticketPrice;
        ticketCap = _initialSupply;

        _totalSupply = _initialSupply * 10**uint256(decimals);
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    // ── ERC-20 standard functions ─────────────────────────────────────────────────

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender] - amount);
        return true;
    }

    // Internal helper: moves tokens between two accounts
    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(_balances[sender] >= amount, "ERC20: transfer amount exceeds balance");

        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    // Internal helper: sets how much a spender is allowed to use on behalf of the owner
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    // ── Ticketing functions ───────────────────────────────────────────────────────

    // Buy one ticket by sending exactly the ticket price in ETH
    function buyTicket() external payable {
        require(msg.value == ticketPrice, "Incorrect payment amount");
        require(_balances[owner] >= 10**uint256(decimals), "No tickets available");

        _transfer(owner, msg.sender, 10**uint256(decimals));
        emit TicketPurchased(msg.sender, 1);
    }

    // Return one or more tickets back to the vendor
    function returnTicket(uint256 quantity) external {
        require(quantity > 0, "Quantity must be at least 1");

        uint256 tokenAmount = quantity * 10**uint256(decimals);
        require(_balances[msg.sender] >= tokenAmount, "Insufficient ticket balance");

        _transfer(msg.sender, owner, tokenAmount);
        emit TicketReturned(msg.sender, quantity);
    }

    // Returns how many whole tickets the vendor still has available to sell
    function ticketsRemaining() external view returns (uint256) {
        return _balances[owner] / 10**uint256(decimals);
    }

    // ── Owner functions ───────────────────────────────────────────────────────────

    // Allows the owner to withdraw all ETH collected from ticket sales
    function withdraw() external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(address(this).balance > 0, "No ETH to withdraw");

        uint256 amount = address(this).balance;
        emit Withdrawal(msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // Returns the ETH balance held by this contract (i.e. revenue from ticket sales)
    function getEthBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
