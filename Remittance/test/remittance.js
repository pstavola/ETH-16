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
  var hashedPwd;
  var hashedKey;

  var sentAmount = web3.toWei(10, "ether");
  var blockNumber;
  var duration = 2;


  before(function(){
    return Remittance.new({from: owner})
    .then(function(instance){
      contract = instance;
      return contract.fee({from:carol})
      .then(function(_fee)
      {
        fee = _fee;
      })
    })
  });

  it("should create a new entry in exchange's ledger", function() {
    return contract.generateHashPwd(pwdCarol, pwdBob, ({from:alice}))
  	.then(function(_hash) {
      hashedPwdAlice = _hash;
    })
    .then(function(){
      return contract.generateHashKey(carol, hashedPwdAlice, ({from:alice}))
      .then(function(_hashKey){
        hashedKeyAlice = _hashKey;
      })
    })
    .then(function(){
      return contract.sendFunds(carol, hashedPwdAlice, duration, ({from:alice, value:sentAmount}))
  		.then(function(txn) {
  			blockNumber = txn.receipt.blockNumber;
  		  return contract.exchangeLedger(hashedKeyAlice)
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

  it("should release funds if passwords are correct", function() {
    return contract.releaseFunds(pwdCarol, pwdEmma, ({from:carol}))
    .then(function(done){
      assert.equal(1,0,"Something went terribly wrong")
    })
    .catch(function(e) {
      assert.equal(e.message, "VM Exception while processing transaction: invalid opcode", "Unexpected error");
    });
    return contract.releaseFunds(pwdCarol, pwdBob, ({from:carol}))
    .then(function(txn){
      assert.equal(txn.logs[0].args.exchange,carol,"Carol is not the recipient");
      assert.equal(txn.logs[0].args.sentAmount.toString(10),sentAmount-fee.toString(10),"Value sent is not correct");
      assert.equal(txn.logs[0].args.fee.toString(10),fee.toString(10),"Fee is wrong");
    })
  });

  it("should return funds to original sender", function() {
    var hashAlice;
    var hashBob;
    return contract.generateHashPwd(pwdBob, pwdDavid, ({from:alice}))
  	.then(function(_hash) {
      hashAlice = _hash;
    });
    return contract.sendFunds(bob, hashAlice, duration-1, ({from:alice, value:sentAmount}))
    .then(function(txn) {
      blockNumber = txn.receipt.blockNumber;
    });
    return contract.generateHashPwd(pwdEmma, pwdCarol, ({from:bob}))
  	.then(function(_hash) {
      hashBob = _hash;
    });
    contract.sendFunds(emma, hashBob, duration, ({from:bob, value:sentAmount}));
    return contract.claimBack(bob, hashAlice, ({from:emma}))
    .then(function(done){
      assert.equal(1,0,"Emma was able to claim Alice's funds");
    })
    .catch(function(e){
      assert.equal(e.message, "VM Exception while processing transaction: invalid opcode", "Unexpected error");
    });
    return contract.claimBack(bob, hashAlice, ({from:alice}))
    .then(function(txn){
      assert.isAtLeast(txn.receipt.blockNumber,blockNumber+duration,"Deadline is wrong");
      assert.equal(txn.logs[0].args.claimer,alice,"Alice cant' claim back her funds");
      assert.equal(txn.logs[0].args.sentAmount.toString(10),sentAmount,"Amount is wrong");
    })
  })
});
