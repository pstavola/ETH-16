pragma solidity ^0.4.10;

import "./Owned.sol";

contract Pausable is Owned {
    bool private active;

    event LogPauseStatusChange(address indexed who, bool activeStatus);

    modifier isActive{
        require(active);
        _;
    }

    function inactivate() 
        public isOwner() 
        returns (bool success) 
    {
        require(active);
        active = false;
        LogPauseStatusChange(msg.sender, active);
        return true;
    }

    function activate() 
        public isOwner() 
        returns (bool success) 
    {
        require(!active);
        active = true;
        LogPauseStatusChange(msg.sender, active);
        return true;
    }

    function getStatus()
        public
        constant
        returns (bool _active)
    {
        _active = active;
    }

    function () {
        revert();
    }
}