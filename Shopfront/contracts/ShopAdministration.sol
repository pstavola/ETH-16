pragma solidity ^0.4.10;

import "./Owned.sol";

contract ShopAdministration is Owned {
    address private admin;
	
	event LogAdminChange(address who, address oldAdmin, address newAdmin);

    modifier isAdmin {
        require(msg.sender == admin);
        _;
    }

    function ShopAdministration(address _admin) public {
        admin = _admin;
    }

    function getAdmin()
        public
        constant
        returns (address adminedBy)
    {
        return admin;
    }

    function setAdmin(address newAdmin)
        public isOwner()
        returns (bool success)
    {
		var oldAdmin = admin;
        admin = newAdmin;
		LogAdminChange(msg.sender, oldAdmin, newAdmin);
        success = true;
    }

    function () {
        revert();
    }
}