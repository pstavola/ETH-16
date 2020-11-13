const expectedExceptionPromise = require("../utils/expectedException.js");
web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
Promise = require("bluebird");
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");
const randomIntIn = require("../utils/randomIntIn.js");
const toBytes32 = require("../utils/toBytes32.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

const Regulator = artifacts.require("./Regulator.sol");
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol");

contract('Scenario', function(accounts) {

    let owner0, owner1,
        booth0, booth1, booth2,
        vehicle0, vehicle1,
        regulator, operator;
    const price01 = randomIntIn(1, 1000);
    const deposit0 = price01 + randomIntIn(1, 1000);
    const extraDeposit = deposit0 + randomIntIn(1, 1000);
    const vehicleType0 = randomIntIn(1, 1000);
    const vehicleType1 = vehicleType0 + randomIntIn(1, 1000);
    const multiplier0 = randomIntIn(1, 1000);
    const multiplier1 = multiplier0 + randomIntIn(1, 1000);
    const tmpSecret = randomIntIn(1, 1000);
    const secret0 = toBytes32(tmpSecret);
    const secret1 = toBytes32(tmpSecret + randomIntIn(1, 1000));
    let hashed0, hashed1;
	let vehicle0InitBal;
	let vehicle1InitBal;

    before("should prepare", function() {
        assert.isAtLeast(accounts.length, 8);
        owner0 = accounts[0];
        owner1 = accounts[1];
        booth0 = accounts[2];
        booth1 = accounts[3];
        booth2 = accounts[4];
        vehicle0 = accounts[5];
        vehicle1 = accounts[6];
        return web3.eth.getBalancePromise(owner0)
            .then(balance => assert.isAtLeast(web3.fromWei(balance).toNumber(), 10));
    });

	beforeEach("should deploy regulator and operator", function() {
		return Regulator.new({ from: owner0 })
			.then(instance => regulator = instance)
			.then(() => regulator.setVehicleType(vehicle0, vehicleType0, { from: owner0 }))
			.then(tx => regulator.setVehicleType(vehicle1, vehicleType1, { from: owner0 }))
			.then(tx => regulator.createNewOperator(owner1, deposit0, { from: owner0 }))
			.then(tx => operator = TollBoothOperator.at(tx.logs[1].args.newOperator))
			.then(() => operator.addTollBooth(booth0, { from: owner1 }))
			.then(tx => operator.addTollBooth(booth1, { from: owner1 }))
			.then(tx => operator.addTollBooth(booth2, { from: owner1 }))
			.then(tx => operator.setMultiplier(vehicleType0, multiplier0, { from: owner1 }))
			.then(tx => operator.setMultiplier(vehicleType1, multiplier1, { from: owner1 }))
			.then(tx => operator.setPaused(false, { from: owner1 }))
			.then(tx => operator.hashSecret(secret0))
			.then(hash => hashed0 = hash)
			.then(tx => operator.hashSecret(secret1))
			.then(hash => hashed1 = hash);
	});

	describe("1", function() {

		it("should not get any refund if fee == deposit", function() {
			return operator.setRoutePrice(booth0, booth1, deposit0, { from: owner1 })
				.then(tx => operator.enterRoad(booth0, hashed0, { from: vehicle0, value: deposit0 * multiplier0 }))
				.then(tx => web3.eth.getBalancePromise(vehicle0))
				.then(balance => vehicle0InitBal = balance)
				.then(tx => operator.reportExitRoad.call(secret0, { from: booth1 }))
				.then(result => assert.strictEqual(result.toNumber(), 1))
				.then(tx => operator.reportExitRoad(secret0, { from: booth1 }))
				.then(tx => {
					assert.strictEqual(tx.receipt.logs.length, 1);
					assert.strictEqual(tx.logs.length, 1);
					const logExited = tx.logs[0];
					assert.strictEqual(logExited.event, "LogRoadExited");
					assert.strictEqual(logExited.args.exitBooth, booth1);
					assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
					assert.strictEqual(logExited.args.finalFee.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(logExited.args.refundWeis.toNumber(), 0);
					return Promise.allNamed({hashed0: () => operator.getVehicleEntry(hashed0)});
				})
				.then(info => {
					assert.strictEqual(info.hashed0[0], vehicle0);
					assert.strictEqual(info.hashed0[1], booth0);
					assert.strictEqual(info.hashed0[2].toNumber(), 0);
					return Promise.allNamed({
						operator: () => web3.eth.getBalancePromise(operator.address),
						collected: () => operator.getCollectedFeesAmount(),
						vehicle0: () => web3.eth.getBalancePromise(vehicle0)
					});
				})
				.then(balances => {
					assert.strictEqual(balances.operator.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(balances.collected.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(balances.vehicle0.toString(10), vehicle0InitBal.toString(10));
				})
		});
	});
	
	describe("2", function() {
		
		it("should not get any refund if fee > deposit", function() {
			return operator.setRoutePrice(booth0, booth1, extraDeposit, { from: owner1 })
				.then(tx => operator.enterRoad(booth0, hashed0, { from: vehicle0, value: deposit0 * multiplier0 }))
				.then(tx => web3.eth.getBalancePromise(vehicle0))
				.then(balance => vehicle0InitBal = balance)
				.then(tx => operator.reportExitRoad.call(secret0, { from: booth1 }))
				.then(result => assert.strictEqual(result.toNumber(), 1))
				.then(tx => operator.reportExitRoad(secret0, { from: booth1 }))
				.then(tx => {
					assert.strictEqual(tx.receipt.logs.length, 1);
					assert.strictEqual(tx.logs.length, 1);
					const logExited = tx.logs[0];
					assert.strictEqual(logExited.event, "LogRoadExited");
					assert.strictEqual(logExited.args.exitBooth, booth1);
					assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
					assert.strictEqual(logExited.args.finalFee.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(logExited.args.refundWeis.toNumber(), 0);
					return Promise.allNamed({hashed0: () => operator.getVehicleEntry(hashed0)});
				})
				.then(info => {
					assert.strictEqual(info.hashed0[0], vehicle0);
					assert.strictEqual(info.hashed0[1], booth0);
					assert.strictEqual(info.hashed0[2].toNumber(), 0);
					return Promise.allNamed({
						operator: () => web3.eth.getBalancePromise(operator.address),
						collected: () => operator.getCollectedFeesAmount(),
						vehicle0: () => web3.eth.getBalancePromise(vehicle0)
					});
				})
				.then(balances => {
					assert.strictEqual(balances.operator.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(balances.collected.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(balances.vehicle0.toString(10), vehicle0InitBal.toString(10));
				})
		});
	});
	
	describe("3", function() {
		
		it("should get a refund if fee < deposit", function() {
			return operator.setRoutePrice(booth0, booth1, price01, { from: owner1 })
				.then(tx => operator.enterRoad(booth0, hashed0, { from: vehicle0, value: deposit0 * multiplier0 }))
				.then(tx => web3.eth.getBalancePromise(vehicle0))
				.then(balance => vehicle0InitBal = balance)
				.then(tx => operator.reportExitRoad.call(secret0, { from: booth1 }))
				.then(result => assert.strictEqual(result.toNumber(), 1))
				.then(tx => operator.reportExitRoad(secret0, { from: booth1 }))
				.then(tx => {
					assert.strictEqual(tx.receipt.logs.length, 1);
					assert.strictEqual(tx.logs.length, 1);
					const logExited = tx.logs[0];
					assert.strictEqual(logExited.event, "LogRoadExited");
					assert.strictEqual(logExited.args.exitBooth, booth1);
					assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
					assert.strictEqual(logExited.args.finalFee.toNumber(), price01 * multiplier0);
					assert.strictEqual(logExited.args.refundWeis.toNumber(), (deposit0 - price01) * multiplier0);
					return Promise.allNamed({hashed0: () => operator.getVehicleEntry(hashed0)});
				})
				.then(info => {
					assert.strictEqual(info.hashed0[0], vehicle0);
					assert.strictEqual(info.hashed0[1], booth0);
					assert.strictEqual(info.hashed0[2].toNumber(), 0);
					return Promise.allNamed({
						operator: () => web3.eth.getBalancePromise(operator.address),
						collected: () => operator.getCollectedFeesAmount(),
						vehicle0: () => web3.eth.getBalancePromise(vehicle0)
					});
				})
				.then(balances => {
					assert.strictEqual(balances.operator.toNumber(), price01 * multiplier0);
					assert.strictEqual(balances.collected.toNumber(), price01 * multiplier0);
					assert.strictEqual(balances.vehicle0.toString(10), vehicle0InitBal.plus((deposit0 - price01) * multiplier0).toString(10));
				})
		});

	});

	describe("4", function() {
		
		it("should get a refund if deposit > fee", function() {
			return operator.setRoutePrice(booth0, booth1, deposit0, { from: owner1 })
				.then(tx => operator.enterRoad(booth0, hashed0, { from: vehicle0, value: extraDeposit * multiplier0 }))
				.then(tx => web3.eth.getBalancePromise(vehicle0))
				.then(balance => vehicle0InitBal = balance)
				.then(tx => operator.reportExitRoad.call(secret0, { from: booth1 }))
				.then(result => assert.strictEqual(result.toNumber(), 1))
				.then(tx => operator.reportExitRoad(secret0, { from: booth1 }))
				.then(tx => {
					assert.strictEqual(tx.receipt.logs.length, 1);
					assert.strictEqual(tx.logs.length, 1);
					const logExited = tx.logs[0];
					assert.strictEqual(logExited.event, "LogRoadExited");
					assert.strictEqual(logExited.args.exitBooth, booth1);
					assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
					assert.strictEqual(logExited.args.finalFee.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(logExited.args.refundWeis.toNumber(), (extraDeposit - deposit0) * multiplier0);
					return Promise.allNamed({hashed0: () => operator.getVehicleEntry(hashed0)});
				})
				.then(info => {
					assert.strictEqual(info.hashed0[0], vehicle0);
					assert.strictEqual(info.hashed0[1], booth0);
					assert.strictEqual(info.hashed0[2].toNumber(), 0);
					return Promise.allNamed({
						operator: () => web3.eth.getBalancePromise(operator.address),
						collected: () => operator.getCollectedFeesAmount(),
						vehicle0: () => web3.eth.getBalancePromise(vehicle0)
					});
				})
				.then(balances => {
					assert.strictEqual(balances.operator.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(balances.collected.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(balances.vehicle0.toString(10), vehicle0InitBal.plus((extraDeposit - deposit0) * multiplier0).toString(10));
				})
		});
	});
	
	describe("5", function() {
		
		it("should get a refund if deposit > fee", function() {
			return operator.enterRoad(booth0, hashed0, { from: vehicle0, value: extraDeposit * multiplier0 })
				.then(tx => web3.eth.getBalancePromise(vehicle0))
				.then(balance => vehicle0InitBal = balance)
				.then(tx => operator.reportExitRoad(secret0, { from: booth1 }))
				.then(tx => {
					assert.strictEqual(tx.receipt.logs.length, 1);
					assert.strictEqual(tx.logs.length, 1);
					const logPending = tx.logs[0];
					assert.strictEqual(logPending.event, "LogPendingPayment");
					assert.strictEqual(logPending.args.exitSecretHashed, hashed0);
					assert.strictEqual(logPending.args.entryBooth, booth0);
					assert.strictEqual(logPending.args.exitBooth, booth1);
					return Promise.allNamed({
						hashed0: () => operator.getVehicleEntry(hashed0),
						pendingCount01: () => operator.getPendingPaymentCount(booth0, booth1),
						pendingCount02: () => operator.getPendingPaymentCount(booth0, booth2)
					});
				})
				.then(info => {
					assert.strictEqual(info.hashed0[0], vehicle0);
					assert.strictEqual(info.hashed0[1], booth0);
					assert.strictEqual(info.hashed0[2].toNumber(), extraDeposit * multiplier0);
					assert.strictEqual(info.pendingCount01.toNumber(), 1);
					assert.strictEqual(info.pendingCount02.toNumber(), 0);
					return operator.setRoutePrice(booth0, booth1, deposit0, { from: owner1 })
				})

				.then(tx => {
					assert.strictEqual(tx.receipt.logs.length, 2);
					assert.strictEqual(tx.logs.length, 2);
					const logPriceSet = tx.logs[0];
					assert.strictEqual(logPriceSet.event, "LogRoutePriceSet");
					assert.strictEqual(logPriceSet.args.sender, owner1);
					assert.strictEqual(logPriceSet.args.entryBooth, booth0);
					assert.strictEqual(logPriceSet.args.exitBooth, booth1);
					assert.strictEqual(logPriceSet.args.priceWeis.toNumber(), deposit0);
					const logExited = tx.logs[1];
					assert.strictEqual(logExited.event, "LogRoadExited");
					assert.strictEqual(logExited.args.exitBooth, booth1);
					assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
					assert.strictEqual(logExited.args.finalFee.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(logExited.args.refundWeis.toNumber(), (extraDeposit - deposit0) * multiplier0);
					return Promise.allNamed({
						hashed0: () => operator.getVehicleEntry(hashed0),
						pendingCount01: () => operator.getPendingPaymentCount(booth0, booth1),
						pendingCount02: () => operator.getPendingPaymentCount(booth0, booth2)
					});
				})
				.then(info => {
					assert.strictEqual(info.hashed0[0], vehicle0);
					assert.strictEqual(info.hashed0[1], booth0);
					assert.strictEqual(info.hashed0[2].toNumber(), 0);
					assert.strictEqual(info.pendingCount01.toNumber(), 0);
					assert.strictEqual(info.pendingCount02.toNumber(), 0);
					return Promise.allNamed({
						operator: () => web3.eth.getBalancePromise(operator.address),
						collected: () => operator.getCollectedFeesAmount(),
						vehicle0: () => web3.eth.getBalancePromise(vehicle0)
					});
				})
				.then(balances => {
					assert.strictEqual(balances.operator.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(balances.collected.toNumber(), deposit0 * multiplier0);
					assert.strictEqual(balances.vehicle0.toString(10), vehicle0InitBal.plus((extraDeposit - deposit0) * multiplier0).toString(10));
				})
		});
	});
	
	describe("6", function() {
		
		it("should be possible to set the base route price and then clear a second deposit by hand", function() {
			return operator.enterRoad(booth0, hashed0, { from: vehicle0, value: extraDeposit * multiplier0 })
				.then(tx => web3.eth.getBalancePromise(vehicle0))
				.then(balance => vehicle0InitBal = balance)
				.then(tx => operator.enterRoad(booth0, hashed1, { from: vehicle1, value: deposit0 * multiplier1 }))
				.then(tx => web3.eth.getBalancePromise(vehicle1))
				.then(balance => vehicle1InitBal = balance)
				.then(tx => operator.reportExitRoad(secret1, { from: booth1 }))
				.then(tx => operator.reportExitRoad(secret0, { from: booth1 }))
				.then(tx => operator.setRoutePrice(booth0, booth1, price01, { from: owner1 }))
				.then(tx => {
					assert.strictEqual(tx.receipt.logs.length, 2);
					assert.strictEqual(tx.logs.length, 2);
					const logPriceSet = tx.logs[0];
					assert.strictEqual(logPriceSet.event, "LogRoutePriceSet");
					assert.strictEqual(logPriceSet.args.sender, owner1);
					assert.strictEqual(logPriceSet.args.entryBooth, booth0);
					assert.strictEqual(logPriceSet.args.exitBooth, booth1);
					assert.strictEqual(logPriceSet.args.priceWeis.toNumber(), price01);
					const logExited = tx.logs[1];
					assert.strictEqual(logExited.event, "LogRoadExited");
					assert.strictEqual(logExited.args.exitBooth, booth1);
					assert.strictEqual(logExited.args.exitSecretHashed, hashed1);
					assert.strictEqual(logExited.args.finalFee.toNumber(), price01 * multiplier1);
					assert.strictEqual(logExited.args.refundWeis.toNumber(), (deposit0 - price01) * multiplier1);
					return Promise.allNamed({
						hashed0: () => operator.getVehicleEntry(hashed0),
						hashed1: () => operator.getVehicleEntry(hashed1),
						pendingCount01: () => operator.getPendingPaymentCount(booth0, booth1),
						pendingCount02: () => operator.getPendingPaymentCount(booth0, booth2)
					});
				})
				.then(info => {
					assert.strictEqual(info.hashed0[0], vehicle0);
					assert.strictEqual(info.hashed0[1], booth0);
					assert.strictEqual(info.hashed0[2].toNumber(), extraDeposit * multiplier0);
					assert.strictEqual(info.hashed1[0], vehicle1);
					assert.strictEqual(info.hashed1[1], booth0);
					assert.strictEqual(info.hashed1[2].toNumber(), 0);
					assert.strictEqual(info.pendingCount01.toNumber(), 1);
					assert.strictEqual(info.pendingCount02.toNumber(), 0);
					return Promise.allNamed({
						operator: () => web3.eth.getBalancePromise(operator.address),
						collected: () => operator.getCollectedFeesAmount(),
						vehicle0: () => web3.eth.getBalancePromise(vehicle0),
						vehicle1: () => web3.eth.getBalancePromise(vehicle1)
					});
				})
				.then(balances => {
					assert.strictEqual(balances.operator.toNumber(), extraDeposit * multiplier0 + price01 * multiplier1);
					assert.strictEqual(balances.collected.toNumber(), price01 * multiplier1);
					assert.strictEqual(balances.vehicle0.toString(10), vehicle0InitBal.toString(10));
					assert.strictEqual(balances.vehicle1.toString(10), vehicle1InitBal.plus((deposit0 - price01) * multiplier1).toString(10));
				})
				.then(tx => operator.clearSomePendingPayments.call(booth0, booth1, 1, { from: owner1 }))
				.then(success => assert.isTrue(success))
				.then(() => operator.clearSomePendingPayments(booth0, booth1, 1, { from: owner1 }))
				.then(tx => {
					assert.strictEqual(tx.receipt.logs.length, 1);
					assert.strictEqual(tx.logs.length, 1);
					const logExited = tx.logs[0];
					assert.strictEqual(logExited.event, "LogRoadExited");
					assert.strictEqual(logExited.args.exitBooth, booth1);
					assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
					assert.strictEqual(logExited.args.finalFee.toNumber(), price01 * multiplier0);
					assert.strictEqual(logExited.args.refundWeis.toNumber(), (extraDeposit - price01) * multiplier0);
					return Promise.allNamed({
						hashed0: () => operator.getVehicleEntry(hashed0),
						hashed1: () => operator.getVehicleEntry(hashed1),
						pendingCount01: () => operator.getPendingPaymentCount(booth0, booth1),
						pendingCount02: () => operator.getPendingPaymentCount(booth0, booth2)
					});
				})
				.then(info => {
					assert.strictEqual(info.hashed0[0], vehicle0);
					assert.strictEqual(info.hashed0[1], booth0);
					assert.strictEqual(info.hashed0[2].toNumber(), 0);
					assert.strictEqual(info.hashed1[0], vehicle1);
					assert.strictEqual(info.hashed1[1], booth0);
					assert.strictEqual(info.hashed1[2].toNumber(), 0);
					assert.strictEqual(info.pendingCount01.toNumber(), 0);
					assert.strictEqual(info.pendingCount02.toNumber(), 0);
					return Promise.allNamed({
						operator: () => web3.eth.getBalancePromise(operator.address),
						collected: () => operator.getCollectedFeesAmount(),
						vehicle0: () => web3.eth.getBalancePromise(vehicle0),
						vehicle1: () => web3.eth.getBalancePromise(vehicle1)
					});
				})
				.then(balances => {
					assert.strictEqual(balances.operator.toNumber(), price01 * (multiplier0 + multiplier1));
					assert.strictEqual(balances.collected.toNumber(), price01 * (multiplier0 + multiplier1));
					assert.strictEqual(balances.vehicle0.toString(10), vehicle0InitBal.plus((extraDeposit - price01) * multiplier0).toString(10));
					assert.strictEqual(balances.vehicle1.toString(10), vehicle1InitBal.plus((deposit0 - price01) * multiplier1).toString(10));
				});
		});
	});
});
