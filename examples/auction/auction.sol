// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 < 0.9.0;

/* This is an auction where the constructor defines the auctioneer and the duration, 
who will be able to end the auction after the duration.  New bids are allowed to be placed.
After the auction has finished, those who did not win are able to withdraw the funds they sent.*/
contract Auction {

    // state variables
    address auctioneer;
    address highestBidder;
    uint endTime; // once the auctioneer finalizes the auction, this will be changed to that time
    uint highestBid;
    mapping(address => uint) public balances; // balances for each bidder
    bool ended = false; // whether or not the auction has ended

    event NewBid(
        uint indexed _highestBid,
        address indexed _highestBidder
    );

    event End(
        address indexed _highestBidder,
        uint _highestBid,
        uint _endTime
    );

    // the duration of the auction is defined here
    constructor(uint _duration) {
        auctioneer = msg.sender;
        endTime = block.timestamp + _duration;
    }

    modifier onlyAuctioneer() {
        require(auctioneer == msg.sender,'Only the auctioneer may do this');
        _;
    }

    modifier notAuctioneer() {
        require(auctioneer != msg.sender,'The auctioneer may not do this');
        _;
    }

    // new bids are placed here
    function bidIncrement() external payable notAuctioneer {
        require(block.timestamp <= endTime,'Auction has ended');
        require(msg.value + balances[msg.sender] > highestBid,'Sent ether is not higher than previous bid.  Latest increment of Ether is refunded.');
        balances[msg.sender] += msg.value;
        highestBid = balances[msg.sender];
        highestBidder = msg.sender;
        emit NewBid(highestBid,highestBidder);
    }

    // bids that did not win can be withdrawn here after the auction has finished
    function withdrawBid() external payable {
        require(balances[msg.sender] > 0, 'No balance left');
        require(block.timestamp > endTime,'Auction has not yet ended');
        uint oldBalance = balances[msg.sender];
        balances[msg.sender] = 0;
        address payable _to = payable(msg.sender);

        bool sent = _to.send(oldBalance);
        if ( ! sent ) {
            balances[msg.sender] = oldBalance;
            revert("Failure, ETH not sent");
        }
    }

    // this will officially end the auction, even though no new bids are accepted after the duration
    function endAuction() external onlyAuctioneer {
        require(block.timestamp >= endTime,'Auction has not ended yet');
        require(! ended, "Auction has not ended yet");
        ended = true;
        emit End(highestBidder, highestBid, endTime);
        endTime = block.timestamp;
        balances[highestBidder] -= highestBid;
        address payable _to = payable(auctioneer);
        _to.transfer(highestBid);
    }
}
