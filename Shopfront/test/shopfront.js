var Shopfront = artifacts.require("./Shopfront.sol");

contract('Shopfront', function(accounts) {

  var _contract;

  var owner = accounts[0];
  var admin = accounts[1];
  var adminMerch1 = accounts[2];
  var ownerMerch1 = accounts[3];
  var adminMerch2 = accounts[4];
  var ownerMerch2 = accounts[5];

  var nameM1 = "Digitec";
  var nameM2 = "M-Electronics";

  var idP1 = "Prod-1";
  var nameP1 = "iPhoneX";
  var priceP1 = web3.toWei(3.3,"ether");
  var stockP1 = 1;

  var idP2 = "Prod-2";
  var nameP2 = "GalaxyS8"
  var priceP2 = web3.toWei(3, "ether");
  var stockP2 = 3;


  before(function(){
    return Shopfront.new(admin, {from: owner})
    .then(function(instance){
      _contract = instance;
    });
  });

  it("should add merchants", function() {
    _contract.addMerchant(nameM1, adminMerch1, ownerMerch1, {from:admin})
    .then(function(success){
      return _contract.merchants(nameM1)
      .then(function(_merch){
        assert.equal(_merch[0], adminMerch1, "Merchant1 Owner is wrong");
        assert.equal(_merch[1], ownerMerch1, "Merchant1 Admin is wrong");
        assert.isOk(_merch[2], "Merchant1 is inactive");
      })
    })

    return _contract.addMerchant(nameM2, adminMerch2, ownerMerch2, {from:admin})
    .then(function(success){
      return _contract.merchants(nameM2)
      .then(function(_shop){
        assert.equal(_shop[0], adminMerch2, "Merchant2 Owner is wrong");
        assert.equal(_shop[1], ownerMerch2, "Merchant2 Admin is wrong");
        assert.isOk(_shop[2], "Merchant2 is inactive");
      })
    });
  });

  it("should add products to Merchant1 catalog", function(){
    return _contract.addProduct(nameM1, idP1, nameP1, priceP1, stockP1, {from:adminMerch1})
    .then(function(success){
      return _contract.merchants(nameM1)
      .then(function(_shop){
        console.log(_shop);
        var catalog = _shop[3];
        /*assert.equal(catalog[0], adminShop1, "Shop Owner is wrong");
        assert.equal(catalog[1], ownerShop1, "Shop Admin is wrong");
        assert.isOk(catalog[2], "Shop is inactive");*/
      })
    })
  })
});
