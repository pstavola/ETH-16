pragma solidity ^0.4.10;

contract Owned {
    address private owner;

    event LogChangeOwner(address indexed oldOwner, address indexed newOwner);

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
		require(newOwner != address(0));
		require(owner != newOwner);
		
        LogChangeOwner(owner, newOwner);
		
        owner = newOwner;
        
        success = true;
    }

    function () {
        revert();
    }
}