pragma solidity ^0.4.10;

contract Owned {
    address owner;

    modifier isOwner(){
        require(msg.sender == owner);
        _;
    }

    function Owned() public {
        owner = msg.sender;
    }

    function () {
        revert();
    }
}