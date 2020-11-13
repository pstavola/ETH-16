pragma solidity ^0.4.13;

import "./Owned.sol";
import "./TollBoothHolder.sol";
import "./interfaces/RoutePriceHolderI.sol";

contract RoutePriceHolder is Owned, TollBoothHolder, RoutePriceHolderI {
    mapping(bytes32=>uint) routePrices;

    /**
     * Called by the owner of the RoutePriceHolder.
     *     It can be used to update the price of a route, including to zero.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if one of the booths is not a registered booth.
     *     It should roll back if entry and exit booths are the same.
     *     It should roll back if either booth is a 0x address.
     *     It should roll back if there is no change in price.
     * @param entryBooth The address of the entry booth of the route set.
     * @param exitBooth The address of the exit booth of the route set.
     * @param priceWeis The price in weis of the new route.
     * @return Whether the action was successful.
     * Emits LogPriceSet.
     */
    function setRoutePrice(
            address entryBooth,
            address exitBooth,
            uint priceWeis)
        public fromOwner
        returns(bool success)
    {
        require(boothsList[entryBooth] && boothsList[exitBooth]);
        require(entryBooth != exitBooth);
        require(entryBooth != address(0) && exitBooth != address(0));
        var hashKey = keccak256(entryBooth, exitBooth);
        require(routePrices[hashKey] != priceWeis);

        routePrices[hashKey] = priceWeis;

        success = true;
        LogRoutePriceSet(msg.sender, entryBooth, exitBooth, priceWeis);
    }

    /**
     * @param entryBooth The address of the entry booth of the route.
     * @param exitBooth The address of the exit booth of the route.
     * @return priceWeis The price in weis of the route.
     *     If the route is not known or if any address is not a booth it should return 0.
     *     If the route is invalid, it should return 0.
     */
    function getRoutePrice(
            address entryBooth,
            address exitBooth)
        constant
        public
        returns(uint priceWeis)
    {
        var hashKey = keccak256(entryBooth, exitBooth);
        priceWeis = routePrices[hashKey];
    }

    /*
     * You need to create:
     *
     * - a contract named `RoutePriceHolder` that:
     *     - is `OwnedI`, `TollBoothHolderI`, and `RoutePriceHolderI`.
     *     - has a constructor that takes no parameter.
     */
}