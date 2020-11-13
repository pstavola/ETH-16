pragma solidity ^0.4.13;

import "./interfaces/RegulatedI.sol";

contract Regulated is RegulatedI {
    address internal myRegulator;

    function Regulated(address _regulator) {
        require(_regulator != address(0));

        myRegulator = _regulator;
    }

    /**
     * Sets the new regulator for this contract.
     *     It should roll back if any address other than the current regulator of this contract
     *       calls this function.
     *     It should roll back if the new regulator address is 0.
     *     It should roll back if the new regulator is the same as the current regulator.
     * @param newRegulator The new desired regulator of the contract.
     * @return Whether the action was successful.
     * Emits LogRegulatorSet.
     */
    function setRegulator(address newRegulator)
        public
        returns(bool success)
    {
        require(msg.sender == myRegulator);
        require(newRegulator != address(0));
        require(newRegulator != myRegulator);

        LogRegulatorSet(myRegulator, newRegulator);

        myRegulator = newRegulator;

        success = true;
    }

    /**
     * @return The current regulator.
     */
    function getRegulator()
        constant
        public
        returns(RegulatorI regulator)
    {
        regulator = RegulatorI(myRegulator);
    }

    /*
     * You need to create:
     *
     * - a contract named `Regulated` that:
     *     - is a `RegulatedI`.
     *     - has a constructor that takes one `address` parameter, the initial regulator, which cannot be 0.
     */
}