pragma solidity 0.7.5;
import "./Ownable.sol";
import "./Destroyable.sol";

interface GovernmentInterface{
    function addTransaction(address _from, address _to, uint _amount) external;
}

// Create a bank that can receive and send money, including a selfdestruct
contract Bank is Ownable, Destroyable {

    GovernmentInterface governmentInstance = GovernmentInterface(0xd9145CCE52D386f254917e481eB44e9943F39138);
    
    mapping(address => uint) balance;
    
    event depositDone(uint amount, address indexed depositedTo);
    
    // Deposit money to bank from sender.  Creates event in log.
    function deposit() public payable returns (uint)  {
        balance[msg.sender] += msg.value;
        emit depositDone(msg.value, msg.sender);
        return balance[msg.sender];
    }
    
    // Withdraw money from bank to sender.  Requires the sender's balance be greater than requested amount.  Creates event in log.
    function withdraw(uint amount) public returns (uint){
        require(balance[msg.sender] >= amount);
        balance[msg.sender] -= amount;
        msg.sender.transfer(amount);
        return balance[msg.sender];
    }
    
    // Return the balance for the sender's bank account
    function getBalance() public view returns (uint){
        return balance[msg.sender];
    }
    
    // Transfer money from sender's bank account to another person's bank account.
    function transfer(address recipient, uint amount) public {
        require(balance[msg.sender] >= amount, "Balance not sufficient");
        require(msg.sender != recipient, "Don't transfer money to yourself");
        
        uint previousSenderBalance = balance[msg.sender];
        
        _transfer(msg.sender, recipient, amount);
        
        governmentInstance.addTransaction(msg.sender, recipient, amount);
        
        assert(balance[msg.sender] == previousSenderBalance - amount);
    }
    
    // Updates balances for sender and receiver of bank transfer.
    function _transfer(address from, address to, uint amount) private {
        balance[from] -= amount;
        balance[to] += amount;
    }
}
