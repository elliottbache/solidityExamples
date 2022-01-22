pragma solidity >=0.6.0 <0.8.12;
pragma experimental ABIEncoderV2;

import "./wallet.sol";
import "../node_modules/@openzeppelin/contracts/utils/Strings.sol";

contract Dex is Wallet {
    using SafeMath for uint256;

 
    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint price;
    }

    uint public nextOrderId = 0;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook;

    function getOrderBook(bytes32 ticker, Side side) view public returns(Order[] memory) {
        return orderBook[ticker][uint(side)];
    }

    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public {
        if ( side == Side.BUY){
            require(balances[msg.sender]["ETH"] >= amount.mul(price), "ETH balance too low");
        }
        else if (side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount, "Token balance too low");
        }
        else {
            require(1 == 0, "Order side is not defined correctly.");
        }
        Order[] storage orders = orderBook[ticker][uint(side)];
        orders.push(Order(nextOrderId, msg.sender, side, ticker, amount, price));

        //Bubble sort
        if(side == Side.BUY){
            for (uint i = orders.length - 1; i > 0; i--) {
                if (orders[i].price < orders[i-1].price) {
                    Order memory newOrder = orders[i];
                    orders[i] = orders[i-1];
                    orders[i-1] = newOrder;
                }
                else {
                    break;
                }
            }
        }
        else if(side == Side.SELL){
            for (uint i = orders.length - 1; i > 0; i--) {
                if (orders[i].price > orders[i-1].price) {
                    Order memory newOrder = orders[i];
                    orders[i] = orders[i-1];
                    orders[i-1] = newOrder;
                }
                else {
                    break;
                }
            }

        }

        nextOrderId++;

    }

    function createMarketOrder(Side side, bytes32 ticker, uint amount) public {

        uint orderBookSide;
        if (side == Side.BUY){
            orderBookSide = 1;
            require(balances[msg.sender]["ETH"] > 0, "Insufficient ETH balance");
        }
        else{
            orderBookSide = 0;
            require(balances[msg.sender][ticker] >= amount, "Insufficient balance");
        }            
        Order[] storage orders = orderBook[ticker][orderBookSide];

        uint totalFilled = 0;
        for (uint256 i=orders.length; i>0 && totalFilled < amount; i--) {
            
            // How much we can fill from order[i]
            uint fillable;
            if (orders[i-1].amount > (amount - totalFilled)) {
                fillable = amount - totalFilled;
                orders[i-1].amount = orders[i-1].amount.sub(fillable);
            }
            else {
                fillable = orders[i-1].amount;
                orders[i-1].amount = 0;
            }

            // Update totalFilled
            totalFilled = totalFilled.add(fillable);

            uint eth_amount;   
            if (side == Side.BUY){

                // Verify that the market order trader has enough ETH to cover the purchase (require)
                eth_amount = fillable.mul(orders[i-1].price);
                require(balances[msg.sender][bytes32("ETH")] >= eth_amount, "Not enough ETH for market buy");

                // Execute the trade & shift balances between buyer/seller
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].sub(eth_amount);
                balances[orders[i-1].trader][ticker] = balances[orders[i-1].trader][ticker].sub(fillable);
                balances[msg.sender][ticker] = balances[msg.sender][ticker].add(fillable);
                balances[orders[i-1].trader]["ETH"] = balances[orders[i-1].trader]["ETH"].add(eth_amount);

            }
            else{

                // Execute the trade & shift balances between buyer/seller
                require(balances[msg.sender][ticker] >= fillable, "LINK balance too low.");
                require(balances[orders[i-1].trader][bytes32("ETH")] >= eth_amount, "ETH balance too low.");
                balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(fillable);
                balances[orders[i-1].trader][bytes32("ETH")] = balances[orders[i-1].trader][bytes32("ETH")].sub(eth_amount);
                balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].add(eth_amount);
                balances[orders[i-1].trader][ticker] = balances[orders[i-1].trader][ticker].add(fillable);

            }            
        }

        require(totalFilled <= amount, "We have filled too much");
 
        //Loop through the orderbook and remove 100% filled orders
        for (uint i=orders.length; i>0 && orders[i-1].amount == 0; i--) {
            orders.pop();
        }

   }
}
