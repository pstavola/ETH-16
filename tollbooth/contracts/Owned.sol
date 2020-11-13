pragma solidity ^0.4.13;

import "./interfaces/OwnedI.sol";

contract Owned is OwnedI {
    address myOwner;

    modifier fromOwner {
       require(msg.sender == myOwner);
        _;
    }

    function Owned() {
        myOwner = msg.sender;
    }

    /**
     * Sets the new owner for this contract.
     *     It should roll back if the caller is not the current owner.
     *     It should roll back if the argument is the current owner.
     *     It should roll back if the argument is a 0 address.
     * @param newOwner The new owner of the contract
     * @return Whether the action was successful.
     * Emits LogOwnerSet.
     */
    function setOwner(address newOwner) 
        public fromOwner
        returns(bool success)
    {
        require(newOwner != myOwner);
        require(newOwner != address(0));
 
        LogOwnerSet(myOwner, newOwner);

        myOwner = newOwner;
        success = true;
    }

    /**
     * @return The owner of this contract.
     */
    function getOwner()
        constant
        returns (address owner)
    {
        owner = myOwner;
    }

    /*
     * You need to create:
     *
     * - a contract named `Owned` that:
     *     - is a `OwnedI`.
     *     - has a modifier named `fromOwner` that rolls back the transaction if the
     * transaction sender is not the owner.
     *     - has a constructor that takes no parameter.
     */
}