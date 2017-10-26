var Remittance = artifacts.require("./Remittance.sol");

contract('Remittance', function(accounts) {

  var contract;

  var owner = accounts[0];
  var alice = accounts[1];
  var bob = accounts[2];
  var carol = accounts[3];
  var david = accounts[4];
  var emma = accounts[5];

  var fee;
  var pwdCarol = "pippo";
  var pwdBob = "pluto";
  var pwdDavid = "topolino";
  var pwdEmma = "paperino";

  var sentAmount = web3.toWei(10, "ether");
  var blockNumber;
  var duration = 2;


  before(function(){
    return Remittance.new({from: owner})
    .then(function(instance){
      contract = instance;
      return contract.fee({from:carol})
      .then(function(_fee) {
        fee = _fee.toString(10);
      })
    });
  });

  it("should create a new entry in exchange's ledger", function() {
  	return contract.generateHash(pwdCarol, pwdBob, ({from:alice}))
  	.then(function(_hash) {
  		return contract.sendFunds(carol, _hash, duration, ({from:alice, value:sentAmount}))
  		.then(function(txn) {
  			blockNumber = txn.receipt.blockNumber;
  		  return contract.exchangeLedger(_hash)
  		  .then(function(_entry1)
  		  {
  			assert.equal(_entry1[0],alice,"Alice's entry is not correct");
  			assert.equal(_entry1[1],carol,"Carol's entry is not correct");
  			assert.equal(_entry1[2].toString(10),sentAmount,"Amount is not correct");
  			assert.equal(_entry1[3].toString(10),blockNumber+duration,"Deadline is not correct");
  		  })
  		})
  	})
  });
  it("should release funds", function() {
    return contract.releaseFunds(pwdCarol, pwdBob, ({from:carol}))
    .then(function(txn){
      assert.equal(txn.logs[0].args.exchange,carol,"Carol is not the recipient");
      assert.equal(txn.logs[0].args.sentAmount.toString(10),sentAmount-fee,"Value sent is not correct");
      assert.equal(txn.logs[0].args.fee.toString(10),fee,"Fee is wrong");
    })
  });
  it("should return funds to original sender", function() {
  	return contract.generateHash(pwdCarol, pwdBob, ({from:alice}))
  	.then(function(_hash) {
      var hashAlice = _hash;
      return contract.sendFunds(carol, hashAlice, duration-1, ({from:alice, value:sentAmount}))
      .then(function(txn) {
        blockNumber = txn.receipt.blockNumber;
        return contract.generateHash(pwdEmma, pwdDavid, ({from:bob}))
      	.then(function(_hash) {
          var hashBob = _hash;
          return contract.sendFunds(emma, hashBob, duration, ({from:bob, value:sentAmount}))
          .then(function(txn) {
            return contract.claimBack(hashAlice, ({from:alice}))
    		    .then(function(txn){
              assert.isAtLeast(txn.receipt.blockNumber,blockNumber+duration,"Deadline is wrong");
              assert.equal(txn.logs[0].args.claimer,alice,"Alice cant' claim back her funds");
              assert.equal(txn.logs[0].args.sentAmount.toString(10),sentAmount,"Amount is wrong");
            })
          })
    		})
  	  })
    })
  })
});
