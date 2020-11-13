pragma solidity ^0.4.13;

import "./TollBoothOperator.sol";
import "./Owned.sol";
import "./interfaces/RegulatorI.sol";

contract Regulator is Owned, RegulatorI {
    mapping(address=>uint) vehicleRegister;
    mapping(address=>bool) approvedOperators;
	
    /**
     * Called by the owner of the regulator to register a new vehicle with its VehicleType.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the arguments mean no change of state.
     *     It should roll back if a 0x vehicle address is passed.
     * @param vehicle The address of the vehicle being registered. This may be an externally
     *   owned account or a contract. The regulator does not care.
     * @param vehicleType The VehicleType of the vehicle being registered.
     *    passing 0 is equivalent to unregistering the vehicle.
     * @return Whether the action was successful.
     * Emits LogVehicleTypeSet
     */
    function setVehicleType(address vehicle, uint vehicleType)
        public fromOwner
        returns(bool success)
    {
        require(vehicleRegister[vehicle] != vehicleType);
        require(vehicle != address(0));

        vehicleRegister[vehicle] = vehicleType;

        success = true;

        LogVehicleTypeSet(msg.sender, vehicle, vehicleType);
    }

    /**
     * @param vehicle The address of the registered vehicle.
     * @return The VehicleType of the vehicle whose address was passed. 0 means it is not
     *   a registered vehicle.
     */
    function getVehicleType(address vehicle)
        constant
        public
        returns(uint vehicleType)
    {
        vehicleType = vehicleRegister[vehicle];
    }

    /**
     * Called by the owner of the regulator to deploy a new TollBoothOperator onto the network.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should start the TollBoothOperator in the `true` paused state.
     *     It should roll back if the rightful owner argument is the current owner of the regulator.
     * @param owner The rightful owner of the newly deployed TollBoothOperator.
     * @param deposit The initial value of the TollBoothOperator deposit.
     * @return The address of the newly deployed TollBoothOperator.
     * Emits LogTollBoothOperatorCreated.
     */
    function createNewOperator(
            address owner,
            uint deposit)
        public fromOwner
        returns(TollBoothOperatorI newOperator)
    {
        require(owner != myOwner);

        TollBoothOperatorI newTollBoothOperator = new TollBoothOperator(true, deposit, this);
        require(newTollBoothOperator.call(bytes4(keccak256("setOwner(address)")), owner));
		approvedOperators[newTollBoothOperator] = true;

        newOperator = newTollBoothOperator;
        LogTollBoothOperatorCreated(msg.sender, newTollBoothOperator, owner, deposit);
    }

    /**
     * Called by the owner of the regulator to remove a previously deployed TollBoothOperator from
     * the list of approved operators.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the operator is unknown.
     * @param operator The address of the contract to remove.
     * @return Whether the action was successful.
     * Emits LogTollBoothOperatorRemoved.
     */
    function removeOperator(address operator)
        public fromOwner
        returns(bool success)
    {
        require(approvedOperators[operator]);

        approvedOperators[operator] = false;

        success = true;
        LogTollBoothOperatorRemoved(msg.sender, operator);
    }

    /**
     * @param operator The address of the TollBoothOperator to test.
     * @return Whether the TollBoothOperator is indeed approved.
     */
    function isOperator(address operator)
        constant
        public
        returns(bool indeed)
    {
        indeed = approvedOperators[operator];
    }

    /*
     * You need to create:
     *
     * - a contract named `Regulator` that:
     *     - is `OwnedI` and `RegulatorI`.
     *     - has a constructor that takes no parameter.
     */        
}