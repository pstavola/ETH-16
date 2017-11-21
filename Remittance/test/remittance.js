var Remittance = artifacts.require("./Remittance.sol");
const PromisifyWeb3 = require("./promisifyWeb3.js");
const expectedExceptionPromise = require("./expected_exception_testRPC_and_geth.js");

PromisifyWeb3.promisify(web3);

contract('Remittance', function(accounts) {
  var _contract;
  var fee;

  const [ owner, alice, bob, carol, david, emma ] = accounts;
  const pwdCarol = "pippo";
  const pwdBob = "pluto";
  const pwdDavid = "topolino";
  const pwdEmma = "paperino";
  const sentAmount = web3.toWei(0.1, "ether");
  const duration = 2;

  describe("deployment", function() {
    it("should deploy with default values", function() {
      return Remittance.new({from: owner})
      .then(function(instance){
        _contract = instance;
        return _contract.getOwner()
        .then(function(_owner) {
          assert.strictEqual(_owner,owner,"Owner is wrong");
          return _contract.getFee();
        })
        .then(function(_fee) {
          assert.strictEqual(_fee.toNumber(),0,"Fee is wrong");
          return _contract.getCommissions();
        })
        .then(function(_commissions) {
          assert.strictEqual(_commissions.toNumber(),0,"Commissions Amount is wrong");
          return _contract.getStatus();
        })
        .then(function(_active) {
          assert.isFalse(_active,"Status is wrong");
        });
      });
    });
  });

  describe("setFee", function() {
    beforeEach(function(){
      let txHash, gasPrice, gasUsed;
      return Remittance.new({from: owner})
      .then(function(instance){
        _contract = instance;
        txHash = _contract.transactionHash;
        return web3.eth.getTransactionPromise(txHash);
      })
      .then(function(tx) {
        gasPrice = tx.gasPrice;
        return web3.eth.getTransactionReceiptPromise(txHash);
      })
      .then(function(tx) {
        gasUsed = tx.gasUsed;
        fee = gasUsed*gasPrice.toNumber();
      });
    });

    it("owner can set fee with correct event", function(){
      return _contract.setFee(fee, {from: owner})
      .then(function(txn){
        assert.strictEqual(txn.logs[0].event, "LogFeeSet", "Log event is wrong");
        assert.strictEqual(txn.logs[0].args.who,owner,"Owner is wrong");
        assert.strictEqual(txn.logs[0].args.fee.toNumber(),fee,"Fee is wrong");
      });
    });

    it("non-owner cannot set fee", function(){
      return expectedExceptionPromise(function () {
        return _contract.setFee(fee,
          { from: alice, gas: 3000000 });
      }, 3000000);
    });

    it("owner cannot set fee to the same", function(){
      return _contract.setFee(fee, {from: owner})
      .then(function(){
        return expectedExceptionPromise(function () {
          return _contract.setFee(fee,
            { from: owner, gas: 3000000 });
        }, 3000000);
      });
    });
  });

  describe("setActive", function() {
    beforeEach(function(){
      return Remittance.new({from: owner})
      .then(function(instance){
        _contract = instance;
      });
    });

    it("owner can set active with correct event", function() {
      return _contract.activate({from: owner})
      .then(function(txn){
        assert.strictEqual(txn.logs[0].event, "LogPauseStatusChange", "Log event is wrong");
        assert.strictEqual(txn.logs[0].args.who,owner,"Owner is wrong");
        assert.isTrue(txn.logs[0].args.activeStatus,"Status is not active");
      });
    });

    it("non-owner cannot activate", function() {
      return expectedExceptionPromise(function () {
        return _contract.activate({ from: alice, gas: 3000000 });
      }, 3000000);
    });

    it("owner cannot activate if already active", function(){
      return _contract.activate({from: owner})
      .then(function(){
        return expectedExceptionPromise(function () {
          return _contract.activate({ from: owner, gas: 3000000 });
        }, 3000000);
      });
    });
  });

  describe("setInactive", function() {
    beforeEach(function(){
      return Remittance.new({from: owner})
      .then(function(instance){
        _contract = instance;
        return _contract.activate({from: owner});
      });
    });

    it("owner can set inactive with correct event", function() {
      return _contract.inactivate({from: owner})
      .then(function(txn){
        assert.strictEqual(txn.logs[0].event, "LogPauseStatusChange", "Log event is wrong");
        assert.strictEqual(txn.logs[0].args.who,owner,"Owner is wrong");
        assert.isFalse(txn.logs[0].args.activeStatus,"Status is not active");
      });
    });

    it("non-owner cannot inactivate", function() {
      return expectedExceptionPromise(function () {
        return _contract.inactivate({ from: alice, gas: 3000000 });
      }, 3000000);
    });

    it("owner cannot inactivate if already inactive", function(){
      return _contract.inactivate({from: owner})
      .then(function(){
        return expectedExceptionPromise(function () {
          return _contract.inactivate({ from: owner, gas: 3000000 });
        }, 3000000);
      });
    });
  });

  describe("sendFunds", function() {
    beforeEach(function(){
      let txHash, gasPrice, gasUsed;
      return Remittance.new({from: owner})
      .then(function(instance){
        _contract = instance;
        txHash = _contract.transactionHash; 
        return web3.eth.getTransactionPromise(txHash);
      })
      .then(function(tx) {
        gasPrice = tx.gasPrice;
        return web3.eth.getTransactionReceiptPromise(txHash);
      })
      .then(function(tx) {
        gasUsed = tx.gasUsed;
        fee = gasUsed*gasPrice.toNumber();
        return _contract.setFee(fee, {from: owner});
      })
      .then(function() {
        return _contract.activate({from: owner});
      });
    });

    it("should record sent funds, with correct event", function() {
      let hashKeyAlice, blockNumber;
      return _contract.generateHash(carol, pwdCarol, pwdBob, {from:alice})
      .then(function(_hash) {
        hashKeyAlice = _hash;
        return _contract.sendFunds(hashKeyAlice, duration, {from:alice, value:sentAmount});
      })
      .then(function(txn) {
        blockNumber = txn.receipt.blockNumber;

        assert.strictEqual(txn.logs[0].event, "LogSendFunds", "Log event is wrong");
        assert.strictEqual(txn.logs[0].args.sender,alice,"Sender is wrong");
        assert.strictEqual(txn.logs[0].args.amount.toString(10),sentAmount,"Amount is wrong");
        assert.strictEqual(txn.logs[0].args.hashKey,hashKeyAlice,"Passwords hash is wrong");
        assert.strictEqual(txn.logs[0].args.duration.toNumber(),blockNumber+duration,"Deadline is wrong");

        return _contract.exchangeLedger(hashKeyAlice);
      })
      .then(function(_record)
      {
        assert.strictEqual(_record[0],alice,"Alice's entry is not correct");
        assert.strictEqual(_record[1].toString(10),sentAmount,"Amount is not correct");
        assert.equal(_record[2].toString(10),blockNumber+duration,"Deadline is not correct");
      });
    });

    it("should reject overwriting funds", function(){
      let hashKeyAlice, blockNumber;
      return _contract.generateHash(carol, pwdCarol, pwdBob, {from:alice})
      .then(function(_hash) {
        hashKeyAlice = _hash;
        return _contract.sendFunds(hashKeyAlice, duration, {from:alice, value:sentAmount});
      })
      .then(function() {
        return expectedExceptionPromise(function () {
          return _contract.sendFunds(hashKeyAlice, duration, 
            { from: alice, value:sentAmount, gas: 3000000 });
        }, 3000000);
      });
    });

    it("should reject too long duration", function() {
      let durationLimit;
      return _contract.getDurationLimit()
      .then(function(_limit) {
        durationLimit = _limit;
        return _contract.generateHash(carol, pwdCarol, pwdBob, {from:alice});
      })
      .then(function(_hash) {
        hashKeyAlice = _hash;
        return expectedExceptionPromise(function () {
          return _contract.sendFunds(hashKeyAlice, durationLimit+1, 
            { from: alice, value:sentAmount, gas: 3000000 });
        }, 3000000);
      });
    });

    it("should reject too small fund", function() {
      return _contract.generateHash(carol, pwdCarol, pwdBob, {from:alice})
      .then(function(_hash) {
        return expectedExceptionPromise(function () {
          return _contract.sendFunds(_hash, duration, 
            { from: alice, value:fee-1, gas: 3000000 });
        }, 3000000);
      });
    });

    it("should reject if inactive", function() {
      return _contract.inactivate({from: owner})
      .then(function(){
        return _contract.generateHash(carol, pwdCarol, pwdBob, {from:alice});
      })
      .then(function(_hash) {
        return expectedExceptionPromise(function () {
          return _contract.sendFunds(_hash, duration, 
            { from: alice, value:sentAmount, gas: 3000000 });
        }, 3000000);
      });
    });

    it("should record 2 different funds", function() {
      let hashKeyAlice, hashKeyBob, blockNumberAlice, blockNumberBob;
      return _contract.generateHash(carol, pwdCarol, pwdBob, {from:alice})
      .then(function(_hash) {
        hashKeyAlice = _hash;
        return _contract.sendFunds(hashKeyAlice, duration, {from:alice, value:sentAmount});
      })
      .then(function(txn) {
        blockNumberAlice = txn.receipt.blockNumber;
        return _contract.generateHash(emma, pwdEmma, pwdDavid, {from:bob});
      })
      .then(function(_hash) {
        hashKeyBob = _hash;
        return _contract.sendFunds(hashKeyBob, duration+10, {from:bob, value:sentAmount+1});
      })
      .then(function(txn) {
        blockNumberBob = txn.receipt.blockNumber;
        return _contract.exchangeLedger(hashKeyAlice);
      })
      .then(function(_record)
      {
        assert.strictEqual(_record[0],alice,"Alice's entry is not correct");
        assert.strictEqual(_record[1].toString(10),sentAmount,"Alice's amount is not correct");
        assert.equal(_record[2].toString(10),blockNumberAlice+duration,"Alice's deadline is not correct");
        return _contract.exchangeLedger(hashKeyBob);
      })
      .then(function(_record1)
      {
        assert.strictEqual(_record1[0],bob,"Bob's entry is not correct");
        assert.strictEqual(_record1[1].toString(10),sentAmount+1,"Bob's amount is not correct");
        assert.equal(_record1[2].toString(10),blockNumberBob+duration+10,"Bob's deadline is not correct");
      });
    });
  });

  /*
  // same with claim back and release
  // send fund1, then fund2, then release fund2, then fund1
  // send fund1, then fund2, then release fund1, then fund2
  // send fund1, then fund2, then release fund2, then claim fund1
  // send fund1, then fund2, then release fund1, then claim fund2
  // send fund1, then fund2, then claim fund1, then claim fund2
  */
  
});