const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require('truffle-assertions');

contract.skip("Dex", accounts => {
    //Limit orders
    it("should only allow buy orders less than the deposited ETH", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),10, 1)
        )
        await dex.depositEth({value: 10})
        await truffleAssert.passes(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"),10, 1)
        )
    })
    it("should only allow sell orders less than the deposited token", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await truffleAssert.reverts(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),10, 1)
        )
        await link.approve(dex.address, 500)
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        await dex.deposit(10, web3.utils.fromUtf8("LINK"))
        await truffleAssert.passes(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),10, 1)
        )
    })
    it("The BUY order book should be ordered on price from highest to lowest starting at index orderbook.length-1 and decrementing", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await link.approve(dex.address, 500);
        await dex.depositEth({value: 3000});
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 300)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 100)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 200)
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        assert(orderbook.length > 0);
    
        for (let i = orderbook.length - 1; i > 1; i--) {
            assert(orderbook[i].price >= orderbook[i-1].price, "not right order in buy book")
        }
    })
    it("The SELL order book should be ordered in price from lowest to highest starting at index orderbook.length-1", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await link.approve(dex.address, 500);
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        await dex.deposit(500, web3.utils.fromUtf8("LINK"))

        // Send LINK to accounts 1 and 2 from 0
        await link.transfer(accounts[1],100)
        await link.transfer(accounts[2],100)

        // Approve DEX for accounts 0-2
        await link.approve(dex.address, 100, {from: accounts[0]})
        await link.approve(dex.address, 100, {from: accounts[1]})
        await link.approve(dex.address, 100, {from: accounts[2]})

        // Deposit LINK into DEX for accounts 0-2
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[0]})
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[1]})
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[2]})

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from: accounts[0]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 2, 100, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 3, 200, {from: accounts[2]})
    
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        assert(orderbook.length > 0);

        for (let i = orderbook.length - 1; i > 1; i--) {
            assert(orderbook[i].price <= orderbook[i-1].price, "not right order in sell book")
        }

    })

    // Market orders
    it("When creating a SELL market order, the seller needs to have enough tokens for the trade", async () => {

        // Check that the initial balance is 0.
        let link = await Link.deployed()
        let dex = await Dex.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        await dex.withdraw(balance, web3.utils.fromUtf8("LINK"))
        balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal( balance.toNumber(), 0, "Initial LINK balance is not 0.")

        // Create a limit order
        await dex.depositEth({value: 10})
        await truffleAssert.passes(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 5, 1)
        )
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);

        // Check that a market order with 0 balance reverts
        link = await Link.deployed()
        await link.approve(dex.address, 500)
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})

        balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal( balance.toNumber(), 0, "Initial LINK balance is not 0.")
        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"),10)
        )

        // Check that a market order with larger balances does not revert
        await dex.deposit(10, web3.utils.fromUtf8("LINK"))
        balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal( balance.toNumber(), 10, "Initial LINK balance is not 0.")
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        console.log(orderbook)
        await truffleAssert.passes(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"),10)
        )
    })

    it("only allows buy market orders when the buy has enough ETH for the trade", async () => {
        // Check that the initial balance is 0.
        let link = await Link.deployed()
        let dex = await Dex.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        let balance = await dex.balanceEth()
        console.log(balance)
        await dex.withdrawEth(balance);
        balance = await dex.balanceEth()
        console.log(balance)
        assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0.")

        // Create a limit order
        await link.approve(dex.address, 500)
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        await dex.deposit(10, web3.utils.fromUtf8("LINK"))
        await truffleAssert.passes(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),10, 1)
        )

        // Check that a market order with 0 balance reverts
        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("ETH"),10)
        )

        // Check that a market order with a larger balance does not revert
        await dex.depositEth({value: 5})
        let ethBalance = await dex.balanceEth();
        assert(ethBalance < 10, "Too much ETH.")
        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"),3)
        )
    })
})

contract.skip("Dex", accounts => {

    it("Market orders can be submitted even if the order book is empty", async () => {
        // Deposit ETH
        let link = await Link.deployed()
        let dex = await Dex.deployed()
        await dex.depositEth({value: 1000})
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        // Check that order book is initially of 0 length
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        console.log(orderbook)
        assert(orderbook.length == 0);

        // Check that we can add market order to 0 length BUY order book
        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1)
        )
 
        // Check that BUY order book is still length 0
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        assert(orderbook.length == 0);

        // Check that we can add market order to 0 length SELL order book
        await link.approve(dex.address, 500);
        await dex.deposit(300, web3.utils.fromUtf8("LINK"))
        await truffleAssert.passes(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 1)
        )

        // Check that SELL order book is longer than 0
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        assert(orderbook.length == 0);
   
    })
})

contract("Dex", accounts => {
    it("Market orders should not fill more limit orders than the market order amount", async () => {
        // Check that order book is empty at beginning
        let dex = await Dex.deployed()
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1); // Get sell side orderbook
        assert(orderbook.length == 0, "Sell side order book should be empty at start of test.")

        // Add LINK tokens to account 0
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        // Send LINK to accounts 1 and 2 from 0
        await link.transfer(accounts[1],300)
        await link.transfer(accounts[2],300)

        // Approve DEX for accounts 0-2
        await link.approve(dex.address, 300, {from: accounts[0]})
        await link.approve(dex.address, 300, {from: accounts[1]})
        await link.approve(dex.address, 300, {from: accounts[2]})

        // Deposit LINK into DEX for accounts 0-2
        await dex.deposit(300, web3.utils.fromUtf8("LINK"), {from: accounts[0]})
        await dex.deposit(300, web3.utils.fromUtf8("LINK"), {from: accounts[1]})
        await dex.deposit(300, web3.utils.fromUtf8("LINK"), {from: accounts[2]})

        // Create sell limit orders
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300)
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 3, 100)
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 200)

        // Create small buy market order
        await dex.depositEth({value: 3000});
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2)

        // Test that buy order has been subtracted
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        assert.equal(orderbook[orderbook.length-1].amount, 1, "First order is wrong.");

        // Create buy limit orders
        await link.approve(dex.address, 500);
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 5, 300)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 3, 100)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 200)

        // Create small sell market order
        await dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 3)
        // Test that sell order has been subtracted
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        assert(orderbook[orderbook.length-1].amount == 2);

    })
})

contract("Dex", accounts => {

    it.skip("The ETH balance of the buyer should decrease with the filled amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        // Send LINK to accounts 1 and 2 from 0
        await link.transfer(accounts[1],300)
        await link.transfer(accounts[2],300)

        // Approve DEX for accounts 0-2
        await link.approve(dex.address, 300, {from: accounts[0]})
        await link.approve(dex.address, 300, {from: accounts[1]})
        await link.approve(dex.address, 300, {from: accounts[2]})

        // Deposit LINK into DEX for accounts 0-2
        await dex.deposit(300, web3.utils.fromUtf8("LINK"), {from: accounts[0]})
        await dex.deposit(300, web3.utils.fromUtf8("LINK"), {from: accounts[1]})
        await dex.deposit(300, web3.utils.fromUtf8("LINK"), {from: accounts[2]})
        await dex.depositEth({value: 3000});
        let ethBalance = await dex.balanceEth();
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[0]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 3, 100, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 200, {from: accounts[2]})
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        console.log(orderbook)

        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 7)
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        console.log(orderbook)

        let ethBalance2 = await dex.balanceEth();
        console.log(ethBalance)
        console.log(ethBalance2)

        assert(ethBalance - ethBalance2 > 0);
    })
    it.skip("The token balances of the limit order sellers should decrease with the filled amounts.", async () => {

        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)
        await link.approve(dex.address, 1000);

        // Send LINK to accounts 1 and 2 from 0
        await link.transfer(accounts[1],200)
        await link.transfer(accounts[2],200)
        await link.transfer(accounts[3],200)

        // Approve DEX for accounts 0-2
        await link.approve(dex.address, 200, {from: accounts[1]})
        await link.approve(dex.address, 200, {from: accounts[2]})
        await link.approve(dex.address, 200, {from: accounts[3]})

        // Deposit LINK into DEX for accounts 0-2
        await dex.deposit(150, web3.utils.fromUtf8("LINK"), {from: accounts[1]})
        await dex.deposit(150, web3.utils.fromUtf8("LINK"), {from: accounts[2]})
        await dex.deposit(150, web3.utils.fromUtf8("LINK"), {from: accounts[3]})

        // Check that order book is empty
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1); // Get sell side orderbook
        assert(orderbook.length == 0, "Sell side order book should be empty at start of test.")

        // Populate order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 3, 100, {from: accounts[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 200, {from: accounts[3]})

        await dex.depositEth({value: 3000});
        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 7)
        )

        let linkBalance = await dex.balanceLink(accounts[2]);
        assert(linkBalance == 147, "account 2 balance off ");
        linkBalance = await dex.balanceLink(accounts[3]);
        assert(linkBalance == 149, "account 3 balance off");
        linkBalance = await dex.balanceLink(accounts[1]);
        assert(linkBalance == 147, "account 1 balance off");
    })
    it.skip("Filled limit orders should be removed from the orderbook", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)
        await link.approve(dex.address, 1000);

        // Send LINK to accounts 1, 2, and 3 from 0
        await link.transfer(accounts[1],200)
        await link.transfer(accounts[2],200)
        await link.transfer(accounts[3],200)

        // Approve DEX for accounts 0-2
        await link.approve(dex.address, 200, {from: accounts[1]})
        await link.approve(dex.address, 200, {from: accounts[2]})
        await link.approve(dex.address, 200, {from: accounts[3]})

        // Deposit LINK into DEX for accounts 0-2
        await dex.deposit(150, web3.utils.fromUtf8("LINK"), {from: accounts[1]})
        await dex.deposit(150, web3.utils.fromUtf8("LINK"), {from: accounts[2]})
        await dex.deposit(150, web3.utils.fromUtf8("LINK"), {from: accounts[3]})

        // Check that order book is empty
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1); // Get sell side orderbook
        assert(orderbook.length == 0, "Sell side order book should be empty at start of test.")

        // Populate order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 3, 100, {from: accounts[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 200, {from: accounts[3]})

        await dex.depositEth({value: 3000});
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 7)

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        assert(orderbook[0].price == 300)
        assert(orderbook[0].amount == 2)

        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[0]})
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 3, 100, {from: accounts[1]})
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 200, {from: accounts[2]})
        await dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 7)

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        assert(orderbook[0].price == 100)
        assert(orderbook[0].amount == 2)

    })
    it("Limit orders filled property should be set correctly after a trade", async () => {
        let dex = await Dex.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); // Get sell side order book
        assert(orderbook.length == 0, "Sell side order book should be empty at start of test.");

        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)
        await link.approve(dex.address, 1000, {from: accounts[1]});
        await link.transfer(accounts[1],200)
        await dex.deposit(150, web3.utils.fromUtf8("LINK"), {from: accounts[1]})

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.depositEth({value: 3000});
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2)

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); // Get sell side order book
        assert.equal(orderbook[0].amount, 3)

    })

})
