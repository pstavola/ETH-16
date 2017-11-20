pragma solidity ^0.4.10;

import "./ShopAdministration.sol";

contract Pausable is ShopAdministration {
    bool private active;

    event LogPauseStatusChange(address who, bool activeStatus);

    modifier isActive(){
        require(active);
        _;
    }

    function Pausable() public {
        active = true;
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

    function () {
        revert();
    }
}