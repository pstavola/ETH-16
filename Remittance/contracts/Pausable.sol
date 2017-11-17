pragma solidity ^0.4.10;

import "./Owned.sol";

contract Pausable is Owned {
    bool active;

    event LogPauseStatusChange(address who, bool activeStatus);

    modifier isActive(){
        require(active);
        _;
    }

    function Pausable() public {
        active = true;
    }


    function stop() 
        public isOwner() 
        returns (bool success) 
    {
        require(active);
        active = false;
        LogPauseStatusChange(msg.sender, active);
        return true;
    }

    function resume() 
        public isOwner() 
        returns (bool success) 
    {
        require(!active);
        active = true;
        LogPauseStatusChange(msg.sender, active);
        return true;
    }

    function () {
        revert();
    }
}