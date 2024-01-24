pragma solidity 0.7.5;

contract Ownable{
    
    // dictionary of allowed owner addresses with true for each allowed owner
    mapping (address => bool) internal owners;
    
    // dictionary of owner approvals
    mapping (address => mapping (uint => bool)) internal ownerApprovals;
    
    // adds address to list of authorized owners
    function setOwner(address _owner) internal {
        require(owners[_owner] == false,"This owner already exists.");
        owners[_owner]=true;
    }

    // removes address from list of authorized owners
    function unsetOwner(address _owner) internal {
        require(owners[_owner] == true,"This owner does not exist.");
        owners[_owner]=false;
    }

    // checks if address is a owner
    function contains(address _owner) view private returns (bool){
        return owners[_owner];
    }

    modifier onlyOwner {
        require(contains(msg.sender),"You are not owner");
        _; //run the function
    }
    
}
