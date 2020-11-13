var TollBoothOperator = artifacts.require("./TollBoothOperator.sol");
var Regulator = artifacts.require("./Regulator.sol");

module.exports = function(deployer, accounts) {
  deployer.then(function() {
    deployer.deploy(Regulator, { from: web3.eth.accounts[0] });
    return Regulator.new({ from: web3.eth.accounts[0] });
  }).then(function(instance) {
    return instance.createNewOperator(web3.eth.accounts[1], 10, { from: web3.eth.accounts[0] });
  }).then(function(tx) {
    operator = TollBoothOperator.at(tx.logs[1].args.newOperator);
    return operator.setPaused(false, { from: web3.eth.accounts[1] });
  });
};