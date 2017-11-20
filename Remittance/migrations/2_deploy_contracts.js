var Remittance = artifacts.require("./Remittance.sol");
var SafeMath = artifacts.require("./SafeMath.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, Remittance);
  deployer.deploy(Remittance);
};