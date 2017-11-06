var Owner = artifacts.require("./Owned.sol");
var Pausable = artifacts.require("./Pausable.sol");
var Remittance = artifacts.require("./Remittance.sol");

module.exports = function(deployer) {
  deployer.deploy(Owner);
  deployer.link(Owner, Pausable);
  deployer.deploy(Pausable);
  deployer.link(Pausable, Remittance);
  deployer.deploy(Remittance);
};
