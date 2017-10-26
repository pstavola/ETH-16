var Splitter = artifacts.require("./Splitter.sol");

contract('Splitter', function(accounts) {

  var contract;

  var owner = accounts[0];
  var alice = accounts[1];
  var bob = accounts[2];
  var carol = accounts[3];

  var evenAmount = 10;
  var oddAmount = 5;
  var oddAmountChange = oddAmount%2;
  var oddAmountSplitted = (oddAmount-oddAmountChange)/2;


  beforeEach(function(){
    return Splitter.new({from: owner})
    .then(function(instance){
      contract = instance;
    });
  });

  it("should split [even]", function() {
    return contract.split(bob, carol, ({from:alice, value:evenAmount}))
    .then(function(_success) {
      success = _success;
      assert.isOk(success, "Something went wrong");
    })
    .then(function(getBalance1) {
      return contract.getBalance({from:bob})
      .then(function(_balance1)
      {
        balance1 = _balance1.toString(10);
        assert.equal(balance1,evenAmount/2,"Bob's balance is not correct");
      })
    })
    .then(function(getBalance2) {
      return contract.getBalance({from:carol})
      .then(function(_balance2)
      {
        balance2 = _balance2;
        assert.equal(balance2,evenAmount/2,"Carol's balance is not correct");
      })
    })
  });
  it("should split [odd]", function() {
    return contract.split(bob, carol, ({from:alice, value:oddAmount}))
    .then(function(_success) {
      success = _success;
      assert.isOk(success, "Something went wrong");
    })
    .then(function(getBalance1) {
      return contract.getBalance({from:bob})
      .then(function(_balance1)
      {
        balance1 = _balance1.toString(10);
        assert.equal(balance1,oddAmountSplitted,"Bob's balance is not correct");
      })
    })
    .then(function(getBalance2) {
      return contract.getBalance({from:carol})
      .then(function(_balance2)
      {
        balance2 = _balance2;
        assert.equal(balance2,oddAmountSplitted,"Carol's balance is not correct");
      })
    })
    .then(function(getBalanceSender) {
      return contract.getBalance({from:alice});
    }).then(function(_senderBalance){
      senderBalance = _senderBalance;
      assert.equal(senderBalance,oddAmount%2,"Alice's balance is not correct");
    });
  });
  it("should withdraw requester's funds", function() {
    return contract.split(bob, carol, ({from:alice, value:oddAmount}))
    .then(function(_success) {
      success = _success;
      assert.isOk(success, "Something went wrong");
    })
    .then(function(withdrawFunds) {
      return contract.withdrawFunds({from:bob})
      .then(function(txn){
        assert.equal(txn.logs[0].args.requester,bob,"Bob is not the recipient");
        assert.equal(txn.logs[0].args.sendAmount.toString(10),oddAmountSplitted,"Value sent is not correct");
    	})
      .then(function(getBalance1) {
        return contract.getBalance({from:bob})
        .then(function(_balance1)
        {
          balance1 = _balance1.toString(10);
          assert.equal(balance1,0,"Bob's contract balance is not correct");
        })
      })
    })
  });
});
