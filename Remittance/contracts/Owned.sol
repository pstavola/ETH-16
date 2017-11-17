pragma solidity ^0.4.10;

contract Owned {
    address private owner;

    modifier isOwner(){
        require(msg.sender == owner);
        _;
    }

    function Owned() public {
        owner = msg.sender;
    }

    function getOwner()
        public
        returns (address ownedBy)
    {
        return owner;
    }

    function setOwner(address newOwner)
        public isOwner()
        returns (bool success)
    {
        owner = newOwner;
        success = true;
    }

    function () {
        revert();
    }
}