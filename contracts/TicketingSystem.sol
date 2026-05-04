// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TicketingSystem {
    string public name = "Sepolia Tickets";
    uint256 public ticketPrice = 0.01 ether;
    uint256 public ticketsRemaining = 100;
    address public owner = msg.sender;

    mapping(address => uint256) public balanceOf;

    event TicketPurchased(address indexed buyer, uint256 amount);

    function buyTicket() payable public {
        require(msg.value == ticketPrice, "Incorrect SETH amount sent");
        require(ticketsRemaining > 0, "No tickets available from vendor");
        
        balanceOf[msg.sender] += 1;
        ticketsRemaining -= 1;
        emit TicketPurchased(msg.sender, msg.value);
    }

    function totalSupply() public view returns (uint256) {
        return 100 - ticketsRemaining;
    }

    function ticketCap() public view returns (uint256) {
        return 100;
    }
}
