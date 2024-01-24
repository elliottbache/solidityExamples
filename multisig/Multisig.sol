pragma solidity 0.7.5;

import "./Ownable.sol";
import "./Destroyable.sol";
import "./Creatable.sol";

contract Multisig is Ownable, Destroyable, Creatable {

    // balance of contract
    uint balance;
    
    // transfer request containing amount and number of approvals received
    struct TransferRequest{
        address payable receiver;
        uint amount;
        uint approvalCount;
    }
    
    // pending requests of transfer mapped by txId
    mapping (uint => TransferRequest) private pendingRequests;
    
    // transaction ID 
    uint txId;
    
    // approval ratio required
    uint requiredApprovals;

    // event
    event depositDone(uint amount, address indexed depositedFrom);
    event addedOwner(address indexed addedAddress);
    event removedOwner(address indexed removedAddress);
    event changedApprovalsRequired(address indexed approvalCountChanger, uint requiredApprovals);
    event requestedTransfer(uint txId, address requestor, address transferTo, uint amount);
    event approvedTransfer(uint indexed txId, uint approvals, address approver);
    event createdTransfer(address indexed transferTo, uint amount);

    // sets the initial owners and the number of approvals required for a transfer
    constructor(uint _requiredApprovals, address[] memory _owners){
        requiredApprovals = _requiredApprovals;
        for (uint i=0; i<_owners.length; i++) {
            owners[_owners[i]] = true;
        }
        txId = 0;
    }

    // Deposit for any sender
    function deposit() public payable {
        balance += msg.value;
        emit depositDone(msg.value, msg.sender);
    }

    // Return the balance of the contract
    function getBalance() public view returns (uint){
        return balance;
    }

    // Adds address to owners: only by creator
    function addOwner(address _toAdd) public onlyCreator {
        setOwner(_toAdd);
        emit addedOwner(_toAdd);
    }    

    // Removes address from owners: only by creator
    function removeOwner(address _toRemove) public onlyCreator {
        unsetOwner(_toRemove);
        emit removedOwner(_toRemove);
    }    
    
    // Change number of owners required: only by creator
    function changeApprovalsRequired(uint _requiredApprovals) public onlyCreator {
        setRequiredApprovals(_requiredApprovals);
        emit changedApprovalsRequired(msg.sender,_requiredApprovals);
    }    

    // changes number of authorized owners required
    function setRequiredApprovals(uint _requiredApprovals) internal {
        requiredApprovals=_requiredApprovals;
    }

    // returns number of authorized owners required
    function getRequiredApprovals() internal view returns(uint) {
        return requiredApprovals;
    }

    // Create transfer request including amount and to address: only owners
    function requestTransfer(address payable _transferTo, uint _amount) public onlyOwner {
        require(balance >= _amount, "Balance not sufficient");
        require(_amount > 0, "Why do you want to transfer 0?");
        pendingRequests[txId].receiver = _transferTo;
        pendingRequests[txId].amount = _amount;
        emit requestedTransfer(txId,msg.sender,_transferTo,_amount);
        txId ++;
    }

    // Approve transfer request: only owners
    function approveTransfer(uint _txId) public onlyOwner {
        
        require(pendingRequests[_txId].amount > 0, "This transaction does not exist.");
        address payable _transferTo = pendingRequests[_txId].receiver;
        // if transfer request has not already been approved by sender
        if (ownerApprovals[msg.sender][_txId] == false) {
            pendingRequests[_txId].approvalCount ++;
            ownerApprovals[msg.sender][_txId] = true;
            emit approvedTransfer(_txId,pendingRequests[_txId].approvalCount,_transferTo);
            
            // if enough approvals, create transfer and remove from pending list
            if (pendingRequests[_txId].approvalCount >= getRequiredApprovals()) {
                createTransfer(_transferTo,pendingRequests[_txId].amount);
                delete pendingRequests[_txId];
            }
        }
    }

    // Send transfer (if it has received enough approvals)
    function createTransfer(address payable _transferTo, uint _amount) private onlyOwner {
        uint _previousBalance = balance;
        balance -= _amount;
        assert(balance == _previousBalance - _amount);
        _transferTo.transfer(_amount);
        emit createdTransfer(_transferTo, _amount);
    }
}
