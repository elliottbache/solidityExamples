import "./Ownable.sol";

pragma solidity 0.7.5;

// selfdestruct function that can only be called by owner.
contract Destroyable is Ownable {
    function destroy() public onlyOwner {
        address payable receiver = msg.sender;
        selfdestruct(receiver);
    }
}
