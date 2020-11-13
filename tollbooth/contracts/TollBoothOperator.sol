pragma solidity ^0.4.13;

import "./Pausable.sol";
import "./DepositHolder.sol";
import "./MultiplierHolder.sol";
import "./RoutePriceHolder.sol";
import "./Regulated.sol";
import "./interfaces/TollBoothOperatorI.sol";
import "./interfaces/RegulatorI.sol";

contract TollBoothOperator is Pausable, DepositHolder, MultiplierHolder, RoutePriceHolder, Regulated, TollBoothOperatorI {
    struct VehicleOnRoad {
		address vehicle;
        address entryBooth;
		uint depositAmount;
	}
	mapping(bytes32=>VehicleOnRoad) vehiclesOnRoad;
    mapping(bytes32=>uint) pendingPaymentCounter;
    mapping(bytes32=>bytes32[]) pendingPayments;
    uint collectedFee;
    

    function TollBoothOperator(bool _state, uint _deposit, address _regulator) DepositHolder(_deposit) Pausable(_state) Regulated(_regulator) {
        require(_deposit != 0);
        require(_regulator != address(0));
    }

    function() {revert();}

    /**
     * This provides a single source of truth for the encoding algorithm.
     * @param secret The secret to be hashed.
     * @return the hashed secret.
     */
    function hashSecret(bytes32 secret)
        constant
        public
        returns(bytes32 hashed)
    {
        hashed = keccak256(secret);
    }

    /**
     * Called by the vehicle entering a road system.
     * Off-chain, the entry toll booth will open its gate up successful deposit and confirmation
     * of the vehicle identity.
     *     It should roll back when the contract is in the `true` paused state.
     *     It should roll back if `entryBooth` is not a tollBooth.
     *     It should roll back if less than deposit * multiplier was sent alongside.
     *     It should be possible for a vehicle to enter "again" before it has exited from the 
     *       previous entry.
     * @param entryBooth The declared entry booth by which the vehicle will enter the system.
     * @param exitSecretHashed A hashed secret that when solved allows the operator to pay itself.
     *   A previously used exitSecretHashed cannot be used ever again.
     * @return Whether the action was successful.
     * Emits LogRoadEntered.
     */
    function enterRoad(
            address entryBooth,
            bytes32 exitSecretHashed)
        public whenNotPaused
        payable
        returns (bool success)
    {
        require(isTollBooth(entryBooth));
        
		RegulatorI _myRegulator = RegulatorI(myRegulator);
        uint vehicleType = _myRegulator.getVehicleType(msg.sender);
		uint multiplier = getMultiplier(vehicleType);
		uint depositValue = getDeposit();
		
        require(vehicleType != 0);
        require(multiplier != 0);
        require(msg.value >= depositValue*multiplier);
        require(vehiclesOnRoad[exitSecretHashed].entryBooth == 0);

        vehiclesOnRoad[exitSecretHashed] = VehicleOnRoad({
			vehicle : msg.sender,
            entryBooth : entryBooth,
		    depositAmount : msg.value
        });

        success = true;
        LogRoadEntered(msg.sender, entryBooth, exitSecretHashed, msg.value);
    }

    /**
     * @param exitSecretHashed The hashed secret used by the vehicle when entering the road.
     * @return The information pertaining to the entry of the vehicle.
     *     vehicle: the address of the vehicle that entered the system.
     *     entryBooth: the address of the booth the vehicle entered at.
     *     depositedWeis: how much the vehicle deposited when entering.
     * After the vehicle has exited, `depositedWeis` should be returned as `0`.
     * If no vehicles had ever entered with this hash, all values should be returned as `0`.
     */
    function getVehicleEntry(bytes32 exitSecretHashed)
        constant
        public
        returns(
            address vehicle,
            address entryBooth,
            uint depositedWeis)
    {
        vehicle = vehiclesOnRoad[exitSecretHashed].vehicle;
        entryBooth = vehiclesOnRoad[exitSecretHashed].entryBooth;
        depositedWeis = vehiclesOnRoad[exitSecretHashed].depositAmount;
    }

    /**
     * Called by the exit booth.
     *     It should roll back when the contract is in the `true` paused state.
     *     It should roll back when the sender is not a toll booth.
     *     It should roll back if the exit is same as the entry.
     *     It should roll back if the secret does not match a hashed one.
     * @param exitSecretClear The secret given by the vehicle as it passed by the exit booth.
     * @return status:
     *   1: success, -> emits LogRoadExited
     *   2: pending oracle -> emits LogPendingPayment
     */
    function reportExitRoad(bytes32 exitSecretClear)
        public whenNotPaused
        returns (uint status)
    {
        bytes32 exitSecretHashed = hashSecret(exitSecretClear);
        address entryBooth = vehiclesOnRoad[exitSecretHashed].entryBooth;

        require(isTollBooth(msg.sender));
        require(msg.sender != entryBooth);
        require(entryBooth != address(0));

        RegulatorI _myRegulator = RegulatorI(myRegulator);
        uint fee = getRoutePrice(entryBooth, msg.sender);
        uint vehicleType = _myRegulator.getVehicleType(vehiclesOnRoad[exitSecretHashed].vehicle);
        uint multiplier = getMultiplier(vehicleType);
        uint finalFee = fee*multiplier;

        if (finalFee == 0) {
            bytes32 hashKey = keccak256(entryBooth, msg.sender);
            pendingPaymentCounter[hashKey] += 1;
            pendingPayments[hashKey].push(exitSecretHashed);
            status = 2;
            LogPendingPayment(exitSecretHashed, entryBooth, msg.sender);
        } else {
            status = 1;
            uint refund;
            uint tempDeposit = vehiclesOnRoad[exitSecretHashed].depositAmount;
            vehiclesOnRoad[exitSecretHashed].depositAmount = 0;
            if (finalFee < tempDeposit) {
                refund = tempDeposit-finalFee;
                vehiclesOnRoad[exitSecretHashed].vehicle.transfer(refund);
            } else {
                finalFee = tempDeposit;
            }
            collectedFee += finalFee;

            LogRoadExited(msg.sender, exitSecretHashed, finalFee, refund);
        }
    }

    /**
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @return the number of payments that are pending because the price for the
     * entry-exit pair was unknown.
     */
    function getPendingPaymentCount(address entryBooth, address exitBooth)
        constant
        public
        returns (uint count)
    {
        bytes32 hashKey = keccak256(entryBooth, exitBooth);
        count = pendingPaymentCounter[hashKey];
    }

    /**
     * Can be called by anyone. In case more than 1 payment was pending when the oracle gave a price.
     *     It should roll back when the contract is in `true` paused state.
     *     It should roll back if booths are not really booths.
     *     It should roll back if there are fewer than `count` pending payment that are solvable.
     *     It should roll back if `count` is `0`.
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @param count the number of pending payments to clear for the exit booth.
     * @return Whether the action was successful.
     * Emits LogRoadExited as many times as count.
     */
    function clearSomePendingPayments(
            address entryBooth,
            address exitBooth,
            uint count)
        public whenNotPaused
        returns (bool success)
    {
        require(isTollBooth(entryBooth) && isTollBooth(exitBooth));
		require(count > 0);
        bytes32 hashKey = keccak256(entryBooth, exitBooth);
        require(pendingPaymentCounter[hashKey] >= count);

        uint fee = getRoutePrice(entryBooth, exitBooth);
        uint x = 0;

        for (uint i = 1; i <= count && x < pendingPayments[hashKey].length; i++) {
            
            bytes32 exitSecretHashed = pendingPayments[hashKey][x];
            uint deposit = vehiclesOnRoad[exitSecretHashed].depositAmount;
            if(deposit != 0) {
                RegulatorI _myRegulator = RegulatorI(myRegulator);
                uint vehicleType = _myRegulator.getVehicleType(vehiclesOnRoad[exitSecretHashed].vehicle);
                uint multiplier = getMultiplier(vehicleType);
                uint finalFee = fee*multiplier;
                uint refund;

                vehiclesOnRoad[exitSecretHashed].depositAmount = 0;
                pendingPaymentCounter[hashKey] -= 1;
                
                if (finalFee < deposit) {
                    refund = deposit-finalFee;
                    vehiclesOnRoad[exitSecretHashed].vehicle.transfer(refund);
                } else {
                    finalFee = deposit;
                }

                collectedFee += finalFee;
                x++;
                LogRoadExited(exitBooth, exitSecretHashed, finalFee, refund);
            } else {
                i--;
                x++;
            }
        }
        success = true;
    }

    /**
     * @return The amount that has been collected through successful payments. This is the current
     *   amount, it does not reflect historical fees. So this value goes back to zero after a call
     *   to `withdrawCollectedFees`.
     */
    function getCollectedFeesAmount()
        constant
        public
        returns(uint amount)
    {
        amount = collectedFee;
    }

    /**
     * Called by the owner of the contract to withdraw all collected fees (not deposits) to date.
     *     It should roll back if any other address is calling this function.
     *     It should roll back if there is no fee to collect.
     *     It should roll back if the transfer failed.
     * @return success Whether the operation was successful.
     * Emits LogFeesCollected.
     */
    function withdrawCollectedFees()
        public fromOwner
        returns(bool success)
    {
        require(collectedFee > 0);

        uint feeToTransfer = collectedFee;
        LogFeesCollected(msg.sender, feeToTransfer);
        collectedFee = 0;
        msg.sender.transfer(feeToTransfer);
        
        success = true;
    }

    /**
     * This function overrides the eponymous function of `RoutePriceHolderI`, to which it adds the following
     * functionality:
     *     - If relevant, it will release 1 pending payment for this route. As part of this payment
     *       release, it will emit the appropriate `LogRoadExited` event.
     *     - In the case where the next relevant pending payment is not solvable, which can happen if,
     *       for instance the vehicle has had wrongly set values in the interim:
     *       - It should release 0 pending payment
     *       - It should not roll back the transaction
     *       - It should behave as if there had been no pending payment, apart from the higher gas consumed.
     *     - It should be possible to call it even when the contract is in the `true` paused state.
     * Emits LogRoadExited if applicable.
     */
     function setRoutePrice(
            address entryBooth,
            address exitBooth,
            uint priceWeis)
        public
        returns(bool success)
    {
        if (super.setRoutePrice(entryBooth, exitBooth, priceWeis)) {
            bytes32 hashKey = keccak256(entryBooth, exitBooth);
            uint x = 0;

            for (uint i = 1; i <= 1 && x < pendingPayments[hashKey].length; i++) {
                bytes32 exitSecretHashed = pendingPayments[hashKey][x];
                uint deposit = vehiclesOnRoad[exitSecretHashed].depositAmount;
                if(deposit != 0) {
                    RegulatorI _myRegulator = RegulatorI(myRegulator);
                    uint vehicleType = _myRegulator.getVehicleType(vehiclesOnRoad[exitSecretHashed].vehicle);
                    uint multiplier = getMultiplier(vehicleType);
                    uint finalFee = priceWeis*multiplier;
                    uint refund;

                    vehiclesOnRoad[exitSecretHashed].depositAmount = 0;
                    pendingPaymentCounter[hashKey] -= 1;
                    
                    if (finalFee < deposit) {
                        refund = deposit-finalFee;
                        vehiclesOnRoad[exitSecretHashed].vehicle.transfer(refund);
                    } else {
                        finalFee = deposit;
                    }

                    collectedFee += finalFee;
                    x++;
                    LogRoadExited(exitBooth, exitSecretHashed, finalFee, refund);
                } else {
                    i--;
                    x++;
                }
            }
            success = true;
        }
    }


    /*
     * You need to create:
     *
     * - a contract named `TollBoothOperator` that:
     *     - is `OwnedI`, `PausableI`, `DepositHolderI`, `TollBoothHolderI`,
     *         `MultiplierHolderI`, `RoutePriceHolderI`, `RegulatedI` and `TollBoothOperatorI`.
     *     - has a constructor that takes:
     *         - one `bool` parameter, the initial paused state.
     *         - one `uint` parameter, the initial deposit wei value, which cannot be 0.
     *         - one `address` parameter, the initial regulator, which cannot be 0.
     */
}