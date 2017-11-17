var Remittance = artifacts.require("./Remittance.sol");

contract('Remittance', function(accounts) {

  var _contract;
  var fee;
  var owner = accounts[0];

  beforeEach(function(){
    return Remittance.new({from: owner})
    .then(function(instance){
      _contract = instance;
      return _contract.fee({from:owner})
      .then(function(_fee)
      {
        fee = _fee;
      })
    })
  });

  it("should create a new entry in exchange's ledger", function() {
    var alice = accounts[1];
    var carol = accounts[3];
    var pwdCarol = "pippo";
    var pwdBob = "pluto";
    var hashKeyAlice;
    var sentAmount = web3.toWei(1, "ether");
    var blockNumber;
    var duration = 2;

    return _contract.generateHash(carol, pwdCarol, pwdBob, ({from:alice}))
  	.then(function(_hash) {
      hashKeyAlice = _hash;
    })
    .then(function(){
      return _contract.sendFunds(hashKeyAlice, duration, ({from:alice, value:sentAmount}))
  		.then(function(txn) {
  			blockNumber = txn.receipt.blockNumber;
  		  return _contract.exchangeLedger(hashKeyAlice)
  		  .then(function(_entry1)
  		  {
    			assert.equal(_entry1[0],alice,"Alice's entry is not correct");
          assert.equal(_entry1[1].toString(10),sentAmount,"Amount is not correct");
    			assert.equal(_entry1[2].toString(10),blockNumber+duration,"Deadline is not correct");
  		  })
  		})
  	})
  });

  it("should release funds", function() {
    var alice = accounts[1];
    var carol = accounts[3];
    var pwdCarol = "pippo";
    var pwdBob = "pluto";
    var hashKeyAlice;
    var sentAmount = web3.toWei(1, "ether");
    var duration = 2;

    return _contract.generateHash(carol, pwdCarol, pwdBob, ({from:alice}))
  	.then(function(_hash) {
      hashKeyAlice = _hash;
    })
    .then(function(){
      _contract.sendFunds(hashKeyAlice, duration, ({from:alice, value:sentAmount}))
      var carolBalanceBefore = web3.eth.getBalance(carol);
      return _contract.releaseFunds(pwdCarol, pwdBob, ({from:carol}))
      .then(function(txn){
        var carolBalanceAfter = web3.eth.getBalance(carol);
        var gasPrice = web3.eth.getTransaction(txn.tx).gasPrice;
        var gasUsed = txn.receipt.gasUsed;
        var carolBalanceExpected = carolBalanceBefore.toString(10) - (gasUsed*gasPrice.toString(10)) + (sentAmount-fee.toString(10));
        /*
        console.log(carolBalanceBefore.toString(10));     //100000000000000000000
        console.log(carolBalanceAfter.toString(10));      //100846352733333333334
        console.log(carolBalanceExpected);                //100846352733333340000
        */
        assert.equal(txn.logs[0].args.exchange,carol,"Carol is not the recipient");
        assert.equal(txn.logs[0].args.sentAmount.toString(10),sentAmount-fee.toString(10),"Value sent is not correct");
        assert.equal(txn.logs[0].args.fee.toString(10),fee.toString(10),"Fee is wrong");
      })
    })
  });

  it("should return funds to original sender", function() {
    var alice = accounts[1];
    var bob = accounts[2];
    var emma = accounts[5];
    var pwdCarol = "pippo";
    var pwdBob = "pluto";
    var pwdDavid = "topolino";
    var pwdEmma = "paperino";
    var hashKeyAlice;
    var hashKeyBob;
    var sentAmount = web3.toWei(1, "ether");
    var blockNumber;
    var duration = 2;

    return _contract.generateHash(bob, pwdBob, pwdDavid, ({from:alice}))
  	.then(function(_hash) {
      hashKeyAlice = _hash;
    });
    return _contract.sendFunds(hashKeyAlice, duration-1, ({from:alice, value:sentAmount}))
    .then(function(txn) {
      blockNumber = txn.receipt.blockNumber;
    });
    return _contract.generateHash(emma, pwdEmma, pwdCarol, ({from:bob}))
  	.then(function(_hash) {
      hashKeyBob = _hash;
    });
    _contract.sendFunds(hashKeyBob, duration, ({from:bob, value:sentAmount}));
    return _contract.claimBack(hashKeyAlice, ({from:alice}))
    .then(function(txn){
      assert.isAtLeast(txn.receipt.blockNumber,blockNumber+duration,"Deadline is wrong");
      assert.equal(txn.logs[0].args.claimer,alice,"Alice cant' claim back her funds");
      assert.equal(txn.logs[0].args.sentAmount.toString(10),sentAmount,"Amount is wrong");
    })
  });

  it("should not return funds to anybody else then sender", function() {
    var alice = accounts[1];
    var bob = accounts[2];
    var emma = accounts[5];
    var pwdBob = "pluto";
    var pwdDavid = "topolino";
    var hashKeyAlice;
    var sentAmount = web3.toWei(1, "ether");
    var blockNumber;
    var duration = 2;

    return _contract.generateHash(bob, pwdBob, pwdDavid, ({from:alice}))
  	.then(function(_hash) {
      hashKeyAlice = _hash;
    });
    return _contract.sendFunds(hashKeyAlice, duration-1, ({from:alice, value:sentAmount}))
    .then(function(txn) {
      blockNumber = txn.receipt.blockNumber;
    });
    return _contract.claimBack(hashKeyAlice, ({from:emma}))
    .then(function(done){
      assert.equal(1,0,"Emma was able to claim Alice's funds");
    })
    .catch(function(e){
      assert.equal(e.message, "VM Exception while processing transaction: invalid opcode", "Unexpected error");
    });
  })

  it("should not release funds if passwords are wrong", function() {
    var alice = accounts[1];
    var carol = accounts[3];
    var pwdCarol = "pippo";
    var pwdBob = "pluto";
    var pwdEmma = "paperino";
    var hashKeyAlice;
    var sentAmount = web3.toWei(1, "ether");
    var duration = 2;
    
    return _contract.generateHash(carol, pwdCarol, pwdBob, ({from:alice}))
    .then(function(_hash) {
      hashKeyAlice = _hash;
    })
    .then(function(){
      _contract.sendFunds(hashKeyAlice, duration, ({from:alice, value:sentAmount}))
      return _contract.releaseFunds(pwdCarol, pwdEmma, ({from:carol}))
      .then(function(done){
        assert.equal(1,0,"Something went terribly wrong")
      })
      .catch(function(e) {
        assert.equal(e.message, "VM Exception while processing transaction: invalid opcode", "Unexpected error");
      });
    })
  });
});