var Shopfront = artifacts.require("./Shopfront.sol");
var SafeMath = artifacts.require("./SafeMath.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, Shopfront);
  deployer.deploy(Shopfront, { gas: 4710000 });
};