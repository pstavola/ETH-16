pragma solidity ^0.4.10;

contract Owned {
    address private owner;

    event LogChangeOwner(address oldOwner, address newOwner);

    modifier isOwner{
        require(msg.sender == owner);
        _;
    }

    function Owned() public {
        owner = msg.sender;
    }

    function getOwner()
        public
        constant
        returns (address ownedBy)
    {
        return owner;
    }

    function setOwner(address newOwner)
        public isOwner()
        returns (bool success)
    {
        var oldOwner = owner;
        owner = newOwner;
        LogChangeOwner(oldOwner, newOwner);
        success = true;
    }

    function () {
        revert();
    }
}