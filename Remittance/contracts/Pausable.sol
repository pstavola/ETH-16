pragma solidity ^0.4.10;

import "./Owned.sol";

contract Pausable is Owned {
    bool active;

    event LogStatusChange(address who, bool activeStatus);

    modifier isActive(){
        require(active==true);
        _;
    }

    function Pausable() public {
        active = true;
    }


    function stop() public isOwner() returns (bool) {
        active = false;
        LogStatusChange(msg.sender, active);
        return true;
    }

    function resume() public isOwner() returns (bool) {
        active = true;
        LogStatusChange(msg.sender, active);
        return true;
    }

    function () {
        revert();
    }
}