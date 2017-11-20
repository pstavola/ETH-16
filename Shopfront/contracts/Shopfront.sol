pragma solidity ^0.4.10;

import "./MerchantsAdministration.sol";
import "./SafeMath.sol";

contract Shopfront is MerchantsAdministration {
  using SafeMath for uint;
	uint invoiceNumber;
	
  struct Invoice {
	  address acquirer;
    bytes32 merchantName;
    bytes32 productId;
	  uint amount;
	  uint unitPrice;
	  uint total;
    uint payedAmount;
	  uint dueChange;
  }
  
  mapping (uint=>Invoice) public ledger;
  
  event LogMerchantAdded(address admin, bytes32 merchantName, address merchantAdmin, address merchantOwner);
  event LogMerchantRemoved(address admin, bytes32 merchantName);
  event LogOrder(address acquirer, bytes32 merchantName, bytes32 product, uint invoiceNumber);
  event LogWithdrawal(address receiver, uint amount);
  event LogReleaseDueChange(uint invoiceNumber, address receiver, uint dueChange);
  
  function addMerchant(bytes32 merchantName, address merchantAdmin, address merchantOwner) 
    public isAdmin() isNotExistingMerchant(merchantName) 
    returns (bool success)
  {
    merchants[merchantName].merchantOwner = merchantOwner;
    merchants[merchantName].merchantAdmin = merchantAdmin;
    merchants[merchantName].active = true;
    LogMerchantAdded(msg.sender, merchantName, merchantAdmin, merchantOwner);

    success = true;
  }
  
  function removeMerchant(bytes32 merchantName)
    public isAdmin() isExistingMerchant(merchantName)
    returns (bool success)
  {
    delete  merchants[merchantName];
    LogMerchantRemoved(msg.sender, merchantName);
      
    success = true;
  }

  function buyProduct(bytes32 merchantName, bytes32 productId, uint amount)
    public payable isExistingMerchant(merchantName) isExistingProduct(merchantName, productId)
    returns(bool success)
  {
    require(amount!=0);
    require(merchants[merchantName].catalog[productId].stock >= amount);
	
    uint unitPriceInWei = SafeMath.mul(merchants[merchantName].catalog[productId].price, 1000000000000000000);
    uint totalPriceInWei = SafeMath.mul(unitPriceInWei, amount);
    uint change = SafeMath.sub(msg.value, totalPriceInWei);
	
    require(msg.value >= totalPriceInWei);

    merchants[merchantName].catalog[productId].stock -= amount;
    merchants[merchantName].merchantOwner.transfer(totalPriceInWei);
	
    invoiceNumber++;
    ledger[invoiceNumber].acquirer = msg.sender;
    ledger[invoiceNumber].merchantName = merchantName;
    ledger[invoiceNumber].productId = productId;
    ledger[invoiceNumber].amount = amount;
    ledger[invoiceNumber].unitPrice = unitPriceInWei;
    ledger[invoiceNumber].total = totalPriceInWei;
    ledger[invoiceNumber].payedAmount = msg.value;
    ledger[invoiceNumber].dueChange = change;
    
    LogOrder(msg.sender, merchantName, productId, invoiceNumber);
    
    success = true;
  }
  
  function withdrawFunds(uint amount) 
    public isOwner() 
    returns(bool success)
  {
    assert(amount>=this.balance);
    msg.sender.transfer(this.balance);
    LogWithdrawal(msg.sender, this.balance);

    success = true;
  }

  function sendFunds(address receiver, uint amount)
    public isOwner() 
    returns(bool success)
  {
    assert(amount>=this.balance);
    receiver.transfer(amount);
    LogWithdrawal(receiver, amount);

    success = true;
  }
  
  function getInvoice(uint _invoiceNumber)
	public
	constant
	returns(address acquirer, bytes32 merchant, bytes32 productId, uint amount, uint unitPrice, uint total, uint payedAmount, uint dueChange) 
	{
		acquirer = ledger[_invoiceNumber].acquirer;
    merchant = ledger[_invoiceNumber].merchantName;
    productId = ledger[_invoiceNumber].productId;
	  amount = ledger[_invoiceNumber].amount;
	  unitPrice = ledger[_invoiceNumber].unitPrice;
	  total = ledger[_invoiceNumber].total;
    payedAmount = ledger[_invoiceNumber].payedAmount;
	  dueChange = ledger[_invoiceNumber].dueChange;
	}
	
  function requestChange(uint _invoiceNumber)
	public
	returns(bool success)
	{
		require(msg.sender == ledger[_invoiceNumber].acquirer);
		require(ledger[_invoiceNumber].dueChange > 0);
		
		var _change = ledger[_invoiceNumber].dueChange;
		
		ledger[_invoiceNumber].dueChange = 0;
    ledger[_invoiceNumber].payedAmount = SafeMath.sub(ledger[_invoiceNumber].payedAmount, _change);
		
		msg.sender.transfer(_change);
		
		LogReleaseDueChange(_invoiceNumber, msg.sender, _change);
		
		success = true;		
	}
  
	function () {
		revert();
	}
}
