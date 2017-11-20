var Remittance = artifacts.require("./Remittance.sol");
const PromisifyWeb3 = require("./promisifyWeb3.js");
const expectedExceptionPromise = require("./expected_exception_testRPC_and_geth.js");

PromisifyWeb3.promisify(web3);

contract('Remittance', function(accounts) {
  var _contract;
  var fee;

  const owner = accounts[0];
  const alice = accounts[1];
  const bob = accounts[2];
  const carol = accounts[3];
  const david = accounts[4];
  const emma = accounts[5];
  const pwdCarol = "pippo";
  const pwdBob = "pluto";
  const pwdDavid = "topolino";
  const pwdEmma = "paperino";
  const sentAmount = web3.toWei(0.1, "ether");
  const duration = 2;

  beforeEach(function(){
    return Remittance.new({from: owner})
    .then(function(instance){
      _contract = instance;
      var txHash = _contract.transactionHash;
      var gasPrice, gasUsed;
      return web3.eth.getTransactionPromise(txHash)
      .then(function(tx) {
        gasPrice = tx.gasPrice;
        return web3.eth.getTransactionReceiptPromise(txHash)
        .then(function(tx) {
          gasUsed = tx.cumulativeGasUsed;
          fee = gasUsed*gasPrice.toNumber();
          return _contract.setFee(fee, {from:owner})
          .then(function(){
            return _contract.activate({from:owner});
          })
        });
      });
    });
  });

  it("should create a new entry in exchange's ledger", function() {
    var hashKeyAlice;
    var blockNumber;

    return _contract.generateHash(carol, pwdCarol, pwdBob, {from:alice})
  	.then(function(_hash) {
      hashKeyAlice = _hash;
      return _contract.sendFunds(hashKeyAlice, duration, {from:alice, value:sentAmount})
  		.then(function(txn) {
  			blockNumber = txn.receipt.blockNumber;
  		  return _contract.exchangeLedger(hashKeyAlice)
  		  .then(function(_entry1)
  		  {
    			assert.equal(_entry1[0],alice,"Alice's entry is not correct");
          assert.strictEqual(_entry1[1].toString(10),sentAmount,"Amount is not correct");
    			assert.equal(_entry1[2].toString(10),blockNumber+duration,"Deadline is not correct");
  		  })
  		})
  	})
  });

  it("should release funds", function() {
    var hashKeyAlice;
    var carolBalanceBefore, carolBalanceAfter;

    return _contract.generateHash(carol, pwdCarol, pwdBob, {from:alice})
  	.then(function(_hash) {
      hashKeyAlice = _hash;
      return _contract.sendFunds(hashKeyAlice, duration, {from:alice, value:sentAmount})
      .then(function(){
        web3.eth.getBalancePromise(carol)
        .then(function(_balance) {
          carolBalanceBefore = _balance;
        });
        return _contract.releaseFunds(pwdCarol, pwdBob, {from:carol})
        .then(function(txn){
          web3.eth.getBalancePromise(carol)
          .then(function(_balance) {
            carolBalanceAfter = _balance;
            web3.eth.getTransactionPromise(txn.tx)
            .then(function(tx) {
              var gasPrice = tx.gasPrice;
              var gasUsed = txn.receipt.gasUsed;
              var carolBalanceExpected = carolBalanceBefore.minus(gasUsed*gasPrice.toString(10)).plus(sentAmount-fee.toString(10));
              
              assert.strictEqual(carolBalanceAfter.toString(10), carolBalanceExpected.toString(10), "Carol's balance is not what expected")
            });
          });

          assert.strictEqual(txn.logs[0].event, "LogReleaseFunds", "Log event is wrong");
          assert.equal(txn.logs[0].args.exchange,carol,"Carol is not the recipient");
          assert.equal(txn.logs[0].args.sentAmount.toString(10),sentAmount-fee.toString(10),"Value sent is not correct");
          assert.strictEqual(txn.logs[0].args.fee.toString(10),fee.toString(10),"Fee is wrong");
        })
      })
    })
  });

  it("should return funds to original sender", function() {
    var hashKeyBob, hashKeyAlice;
    var blockNumber;
    var aliceBalanceBefore, aliceBalanceAfter;

    return _contract.generateHash(bob, pwdBob, pwdDavid, {from:alice})
  	.then(function(_hash) {
      hashKeyAlice = _hash;
      _contract.sendFunds(hashKeyAlice, duration-1, {from:alice, value:sentAmount})
      .then(function(txn) {
        blockNumber = txn.receipt.blockNumber;
        _contract.generateHash(emma, pwdEmma, pwdCarol, {from:bob})
        .then(function(_hash) {
          hashKeyBob = _hash;
          return _contract.sendFunds(hashKeyBob, duration, {from:bob, value:sentAmount});
        });
        
        web3.eth.getBalancePromise(alice)
        .then(function(_balance) {
          aliceBalanceBefore = _balance;
        });

        return _contract.claimBack(hashKeyAlice, {from:alice})
        .then(function(txn){
          web3.eth.getBalancePromise(alice)
          .then(function(_balance) {
            aliceBalanceAfter = _balance;
            web3.eth.getTransactionPromise(txn.tx)
            .then(function(tx) {
              var gasPrice = tx.gasPrice;
              var gasUsed = txn.receipt.gasUsed;
              var aliceBalanceExpected = aliceBalanceBefore.minus(gasUsed*gasPrice.toString(10)).plus(sentAmount.toString(10));
              
              assert.strictEqual(aliceBalanceAfter.toString(10), aliceBalanceExpected.toString(10), "Alice's balance is not what expected")
            });
          });
    
          assert.isAtLeast(txn.receipt.blockNumber,blockNumber+duration,"Deadline is wrong");
          assert.equal(txn.logs[0].args.claimer,alice,"Alice cant' claim back her funds");
          assert.strictEqual(txn.logs[0].args.sentAmount.toString(10),sentAmount,"Amount is wrong");
        });
      });
    });
  });

  it("should not return funds to anybody else then sender", function() {
    var hashKeyAlice;
    var blockNumber;

    return _contract.generateHash(bob, pwdBob, pwdDavid, {from:alice})
  	.then(function(_hash) {
      hashKeyAlice = _hash;
      return _contract.sendFunds(hashKeyAlice, duration-1, {from:alice, value:sentAmount})
      .then(function(txn) {
        blockNumber = txn.receipt.blockNumber;

        return expectedExceptionPromise(function () {
          return _contract.claimBack(hashKeyAlice,
            { from: emma, gas: 3000000 });
        }, 3000000);
      })
    });
  });

  it("should not release funds if passwords are wrong", function() {
    var hashKeyAlice;
    
    return _contract.generateHash(carol, pwdCarol, pwdBob, {from:alice})
    .then(function(_hash) {
      hashKeyAlice = _hash;
      return _contract.sendFunds(hashKeyAlice, duration, {from:alice, value:sentAmount})
      .then(function() {
        return expectedExceptionPromise(function () {
          return _contract.releaseFunds(pwdCarol, pwdEmma,
            { from: carol, gas: 3000000 });
        }, 3000000);
      }) 
    })
  });
});