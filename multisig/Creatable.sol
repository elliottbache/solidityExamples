pragma solidity 0.7.5;

contract Creatable {
    address internal creator;
    
    modifier onlyCreator {
        require(msg.sender == creator);
        _; //run the function
    }
    
    constructor(){
        creator = msg.sender;
    }
}
