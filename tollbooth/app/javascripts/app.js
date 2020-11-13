// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// dependencies
require("file-loader?name=../index.html!../index.html");
const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
// and our contract
const regulator_artifacts = require("../../build/contracts/Regulator.json");
const operator_artifacts = require("../../build/contracts/TollBoothOperator.json");

// Supports Mist, and other wallets that provide 'web3'.
/*	if (typeof web3 !== 'undefined') {
	  // Use the Mist/wallet/Metamask provider.
	  console.log("web3 is not undefined so using Mist/MetaMask");
	  window.web3 = new Web3(web3.currentProvider);
	  account = window.web3.eth.defaultAccount;
	  if(account=='undefined')
		alert('unlock your Metamask account', null, null);
	} else {*/
	  // Your preferred fallback.
	  console.log("web3 is undefined so using the fallback.");
		usingTruffle = "Y";
	  window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); 
	//}

Promise.promisifyAll(web3.eth, { suffix: "Promise"});
Promise.promisifyAll(web3.version, { suffix: "Promise"});

const Regulator = truffleContract(regulator_artifacts);
const TollBoothOperator = truffleContract(operator_artifacts);
Regulator.setProvider(web3.currentProvider);
TollBoothOperator.setProvider(web3.currentProvider);

var usingTruffle;
var regulatorOwner;
var account0, account1, account2, account3, account4, account5, account6, account7, account8, account9; 

window.addEventListener('load', function() {
	return web3.eth.getAccountsPromise()
	.then(accounts => {
		if(accounts.length == 0) {
		  $("#balance").html("N/A");
		  throw new Error("No account with which to transact");
		}

		//accounts = accs;
		if(usingTruffle=="Y"){
			account0 = accounts[0];
			account1 = accounts[1];
			account2 = accounts[2];
			account3 = accounts[3];
			account4 = accounts[4];
			account5 = accounts[5];
			account6 = accounts[6];
			account7 = accounts[7];
			account8 = accounts[8];
			account9 = accounts[9];	

			var mySelect = $('#addressList');
			mySelect.append($('<option></option>').val(account0).html(account0));
			mySelect.append($('<option></option>').val(account1).html(account1));
			mySelect.append($('<option></option>').val(account2).html(account2));
			mySelect.append($('<option></option>').val(account3).html(account3));
			mySelect.append($('<option></option>').val(account4).html(account4));
			mySelect.append($('<option></option>').val(account5).html(account5));
			mySelect.append($('<option></option>').val(account6).html(account6));
			mySelect.append($('<option></option>').val(account7).html(account7));
			mySelect.append($('<option></option>').val(account8).html(account8));
			mySelect.append($('<option></option>').val(account9).html(account9));
		}

		//window.App.refreshBalance();
		//window.App.getHistory();
		return web3.version.getNetworkPromise();
	})
	.then(function(network) {
		return Regulator.deployed();
	})
	.then(deployed => deployed.getOwner())
	.then(owner => regulatorOwner = owner)
	.catch(console.error);
});

window.App = {
  setStatus: function(id, message) {
    var status = document.getElementById(id);
    status.innerHTML = message;
  },

  refreshBalance: function(account) {
    var self = this;

    web3.eth.getBalancePromise(account)
    .then(function(balance) {
			var balance_element = document.getElementById("balance");
      balance_element.innerHTML = "You have " + web3.fromWei(balance, 'ether') + " ETH";
    }).catch(function(e) {
      console.log(e);
      self.setStatus("balance", "Error getting balance; see log.");
    });
  },

  getBalance: function() {
    var self = this;

    var account = $("#addressList").val();
    self.refreshBalance(account);
  },

  copyToClipboard: function() {
    var textarea = $('<textarea />');
    textarea.val($("#addressList").val()).css({
      width: '0px',
      height: '0px',
      border: 'none',
      visibility: 'none'
    }).appendTo('body');

    textarea.focus().select();

    try {
      if (document.execCommand('copy')) {
        textarea.remove();
        return true;
      }
    } catch (e) {
      console.log(e);
    }

    textarea.remove();
  },

  setVehicle: function() {
    var self = this;

    var vehicleAddress = $("#vehicleAddress").val();
    var vehicleType = $("#vehicleType").val();

    self.setStatus("setVehicleStatus", "Initiating transaction... (please wait)");

    var reg;
    Regulator.deployed().then(function(instance) {
      reg = instance;
      return reg.setVehicleType(vehicleAddress, vehicleType, {from: regulatorOwner});
    }).then(function() {
      self.setStatus("setVehicleStatus", "Transaction complete!");
    }).catch(function(e) {
      console.log(e);
      self.setStatus("setVehicleStatus", "Error; see log.");
    });
  },

  newOperator: function() {
    var self = this;

    var owner = $("#owner").val();
    var deposit = $("#deposit").val();

    this.setStatus("newOperatorStatus", "Initiating transaction... (please wait)");

    var reg;
    Regulator.deployed().then(function(instance) {
      reg = instance;
      return reg.createNewOperator(owner, deposit, {from: regulatorOwner, gas: 3000000});
    }).then(tx => {
      const logCreated = tx.logs[1];
      let operator = logCreated.args.newOperator;
      let owner = logCreated.args.owner;
      let deposit = logCreated.args.depositWeis.toNumber();
			self.setStatus("newOperatorStatus", "New Operator created. Please save this address: " + operator);
			return TollBoothOperator.at(operator).setPaused(false, {from: owner});
    }).catch(function(e) {
      console.log(e);
      self.setStatus("newOperatorStatus", "Error; see log.");
    });
  },

  addTollBooth: function() {
    var self = this;

		var operator = $("#opAddr").val();
		var account = $("#addressList").val();
    var tollBooth = $("#tollBooth").val();
		
		if(operator != "" && account !="") {
			this.setStatus("addTollBoothStatus", "Initiating transaction... (please wait)");
			
			var tollBoothOp;
			TollBoothOperator.at(operator).then(function(instance) {
				tollBoothOp = instance;
				return tollBoothOp.addTollBooth(tollBooth, {from: account});
			}).then(function() {
				self.setStatus("addTollBoothStatus", "Transaction complete!");
			}).catch(function(e) {
				console.log(e);
				self.setStatus("addTollBoothStatus", "Error; see log.");
			});
		}
		else
			self.setStatus("addTollBoothStatus", "No Operator/Account found.");
  },

  setRoutePrice: function() {
    var self = this;

		var operator = $("#opAddr").val();
		var account = $("#addressList").val();
    var entryBooth = $("#entryBooth").val();
    var exitBooth = $("#exitBooth").val();
    var priceWeis = $("#priceWeis").val();
		
		if(operator != "" && account !="") {
			this.setStatus("setRoutePriceStatus", "Initiating transaction... (please wait)");

			var tollBoothOp;
			TollBoothOperator.at(operator).then(function(instance) {
				tollBoothOp = instance;
				return tollBoothOp.setRoutePrice(entryBooth, exitBooth, priceWeis,  {from: account, gas: 3000000});
			}).then(function() {
				self.setStatus("setRoutePriceStatus", "Transaction complete!");
			}).catch(function(e) {
				console.log(e);
				self.setStatus("setRoutePriceStatus", "Error; see log.");
			});
		}
		else
			self.setStatus("setRoutePriceStatus", "No Operator/Account found.");
  },

  setMultiplier: function() {
    var self = this;

		var operator = $("#opAddr").val();
		var account = $("#addressList").val();
    var vehicleType = $("#vehicleType").val();
    var multiplier = $("#multiplier").val();
		
		if(operator != "" && account !="") {
			this.setStatus("setMultiplierStatus", "Initiating transaction... (please wait)");

			var tollBoothOp;
			TollBoothOperator.at(operator).then(function(instance) {
				tollBoothOp = instance;
				return tollBoothOp.setMultiplier(vehicleType, multiplier,  {from: account});
			}).then(function() {
				self.setStatus("setMultiplierStatus", "Transaction complete!");
			}).catch(function(e) {
				console.log(e);
				self.setStatus("setMultiplierStatus", "Error; see log.");
			});
		}
		else
			self.setStatus("setMultiplierStatus", "No Operator/Account found.");
	},
	
	hashSecret: function() {
		var self = this;

		var secret = $("#secret").val();
		var operator = $("#opAddr").val();
		var account = $("#addressList").val();

		if(operator != "" && account !="") {
			this.setStatus("hashSecretStatus", "Initiating transaction... (please wait)");

			var tollBoothOp;
			TollBoothOperator.at(operator).then(function(instance) {
				tollBoothOp = instance;
				return tollBoothOp.hashSecret.call(secret,  {from: account});
			}).then(function(hashed) {
				self.setStatus("hashSecretStatus", hashed);
			}).catch(function(e) {
				console.log(e);
				self.setStatus("hashSecretStatus", "Error; see log.");
			});
		}
		else
			self.setStatus("hashSecretStatus", "No Operator/Account found.");
	},

  enterRoad: function() {
    var self = this;

		var operator = $("#opAddr").val();
		var account = $("#addressList").val();
		var entryBooth = $("#entryBooth").val();
		var exitSecretHashed = $("#exitSecretHashed").val();
		var deposit = $("#deposit").val();
		
		if(operator != "" && account !="") {
			this.setStatus("enterRoadStatus", "Initiating transaction... (please wait)");

			var tollBoothOp;
			TollBoothOperator.at(operator).then(function(instance) {
				tollBoothOp = instance;
				return tollBoothOp.enterRoad(entryBooth, exitSecretHashed,  { from: account, value: deposit, gas: 3000000 });
			}).then(function() {
				self.setStatus("enterRoadStatus", "Road entered");
				self.refreshBalance();
			}).catch(function(e) {
				console.log(e);
				self.setStatus("enterRoadStatus", "Error; see log.");
			});
		}
		else
			self.setStatus("enterRoadStatus", "No Operator/Account found.");
  },


  getHistory: function() {
		var self = this;
		var operator = $("#opAddr").val();
		var account = $("#addressList").val();
		var opInstance;
		var eventLogRoadEntered;
		var eventLogRoadExited;

		if(operator != "" && account !="") {
			self.setStatus("historyStatus", "Retrieving logs... (please wait....and wait...and wait...)");
			TollBoothOperator.at(operator).then(function(instance){ 
				opInstance = instance;
				eventLogRoadEntered = opInstance.LogRoadEntered({}, {from: account, fromBlock: 0, toBlock: 'latest'});
				eventLogRoadEntered.get((error, logs) => {
					logs.forEach(function(log) { 
						console.log(log.args);
						var content = "<tr id=" + log.args.exitSecretHashed + ">" + 
							"<td>" + log.args.entryBooth + "</td>" + 
							"<td>" + log.args.depositedWeis + "</td>" + 
							//"<td>" + logs[0].args.exitSecretHashed + "</td>" + 
							"</tr>" +	"</table>";

						$('#historyTable').append(content);
					});
				});
			});

			TollBoothOperator.at(operator).then(function(instance){ 
				opInstance = instance;
				eventLogRoadExited = opInstance.LogRoadExited({}, {from: account, fromBlock: 0, toBlock: 'latest'});
				eventLogRoadExited.get((error, logs) => {
					logs.forEach(function(log) { 
						console.log(log.args);
						var content = "<td>" + log.args.exitBooth + "</td>" + 
							"<td>" + log.args.finalFee + "</td>" + 
							"<td>" + log.args.refundWeis + "</td>";

						$('#' + log.args.exitSecretHashed).append(content);
					});
				});
			});

			self.setStatus("historyStatus", "");

			/*web3.eth.filter({
				address: operator,
				from: account,
				fromBlock: 0,
				toBlock: 'latest',
				'topics': [web3.sha3('LogRoadEntered(address,address,bytes32,uint256)')]
			}).get(function (err, result) {
				if(!err) {
					console.log(result);
					var content = "<table><tr><th>Entry Booth</th><th>Secret</th><th>Deposit</th></tr>"
					for (var i=0; i<result.length; ++i) {
						let log = result[0].topics;
						//if(log[1].substr(26, 64)==account.substr(2, 42))							
							content += '<tr><td>' + log[2] + "</td><td>" + log[3] + "</td><td>" + parseInt(web3.eth.getTransaction(result[0].transactionHash).value) + '</td></tr>';	
					}
					content += "</table>"

					$('#entries_table').append(content);
				}
				else {
					console.log('Error: '+err);
				}
			})
			
			web3.eth.filter({
				address: operator,
				from: account,
				fromBlock: 1,
				toBlock: 'latest',
				'topics': [web3.sha3('LogRoadExited(address,bytes32,uint256,uint256)')]
			}).get(function (err, result) {
				if(!err) {
					console.log(result);
					var content = "<table><tr><th>Exit Booth</th><th>Secret</th><th>Final Fee</th<th>Refund</th>></tr>"
					for (var i=0; i<result.length; ++i) {
						let log = result[0].topics;
						content += "<tr><td>" + log[1]+ "</td><td>" + log[2] + "</td><td>" + log[3] + "</td><td>" + parseInt(web3.eth.getTransaction(result[0].transactionHash).value) + "</td></tr>";
					}
					content += "</table>"
		
					$('#exits_table').append(content);
				}
				else {
					console.log('Error: '+err);
				}
			})*/
		}
		else
			self.setStatus("historyStatus", "No Operator/Account found.");
  },


  reportExit: function() {
    var self = this;

		var operator = $("#opAddr").val();
		var account = $("#addressList").val();
    var secret = $("#secret").val();
		var exitStatus;
		var deposit;
		var exitSecretHashed;
		var entryBooth;
		var exit;
		
		if(operator != "" && account !="") {
			this.setStatus("exitRoadStatus", "Initiating transaction... (please wait)");

			var tollBoothOp;
			TollBoothOperator.at(operator).then(function(instance) {
				tollBoothOp = instance;
				return tollBoothOp.reportExitRoad(secret,  {from: account, gas: 3000000});
			}).then(function(tx) {
				if(tx.logs[0].event == "LogRoadExited"){
					self.setStatus("exitRoadStatus", "Road exited successfully! Fee:" + tx.logs[0].args.finalFee.toNumber() + ", Refund: " + tx.logs[0].args.refundWeis.toNumber() + ".");
				}
				else if(tx.logs[0].event == "LogPendingPayment"){
					exitSecretHashed = tx.logs[0].args.exitSecretHashed;
					entryBooth = tx.logs[0].args.entryBooth;
					exit = tx.logs[0].args.exitBooth;
					return tollBoothOp.getVehicleEntry(exitSecretHashed,   {from: account})
					.then(info => {
						deposit = info[2];
						$("#refresh").attr("hash", exitSecretHashed);
						self.setStatus("exitRoadStatus", "Payment Pending. Entry Booth:" + entryBooth + ", Exit Booth: " + exit + ", Deposit: " + deposit + ".");
					}).catch(function(e) {
						console.log(e);
						self.setStatus("exitRoadStatus", "Error; see log.");
					});
				}
			}).catch(function(e) {
				console.log(e);
				self.setStatus("exitRoadStatus", "Error; see log.");
			});
		}
		else
			self.setStatus("exitRoadStatus", "No Operator/Account found.");		
  },
  
  refreshExitStatus: function() {
		var self = this;
		var operator = $("#opAddr").val();
		var account = $("#addressList").val();
		var hash = $("#refresh").attr("hash");
		var deposit;
		
		if(operator != "" && account !="") {
			if(hash != ""){
				var tollBoothOp;
				TollBoothOperator.at(operator).then(function(instance) {
					tollBoothOp = instance;
					return tollBoothOp.getVehicleEntry(hash,   {from: account});
				}).then(info => {
					deposit = info[2];
					if(deposit == "0")
						self.setStatus("exitRoadStatus", "Road exited successfully!.");
					else
						self.setStatus("exitRoadStatus", "Payment still Pending.");
				}).catch(function(e) {
					console.log(e);
					self.setStatus("exitRoadStatus", "Error; see log.");
				});
			}
			else
				self.setStatus("exitRoadStatus", "No pending payments found.");
		}
		else
			self.setStatus("exitRoadStatus", "No Operator/Account found.");
	}
};
