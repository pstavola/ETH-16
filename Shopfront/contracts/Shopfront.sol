pragma solidity ^0.4.10;

import "./MerchantsAdministration.sol";
import "./Pausable.sol";
import "./SafeMath.sol";

contract Shopfront is MerchantsAdministration, Pausable {
  using SafeMath for uint;

  mapping (address=>uint) public generalLedger;
  
  event LogOrder(address indexed acquirer, address indexed merchantId, bytes32 product);
  event LogWithdrawal(uint amountWithdrawn);
  event LogPayment(address indexed receiver, uint amount);

  function buyProduct(address merchantId, bytes32 productId, uint amount)
    public
    payable
    isActive()
    isExistingProduct(merchantId, productId)
    returns(bool success)
  {
    require(amount!=0);
    require(merchants[merchantId][productId].stock >= amount);

    uint totalPrice = SafeMath.mul(merchants[merchantId][productId].price, amount);
    require(msg.value >= totalPrice);
    uint change = SafeMath.sub(msg.value, totalPrice);

    merchants[merchantId][productId].stock = SafeMath.sub(merchants[merchantId][productId].stock, amount);
    generalLedger[merchantId] = SafeMath.add(generalLedger[merchantId], totalPrice);
    generalLedger[msg.sender] = SafeMath.add(generalLedger[msg.sender], change);

    LogOrder(msg.sender, merchantId, productId);

    success = true;
  }

  function withdrawFunds(uint amount) 
    public 
    returns(bool success)
  {
    require(generalLedger[msg.sender]>=amount);

    generalLedger[msg.sender] = SafeMath.sub(generalLedger[msg.sender], amount);
    msg.sender.transfer(amount);
    LogWithdrawal(amount);

    success = true;
  }

  function sendFunds(address receiver, uint amount)
    public isOwner() 
    returns(bool success)
  {
    require(generalLedger[msg.sender]>=amount);

    generalLedger[msg.sender] = SafeMath.sub(generalLedger[msg.sender], amount);
    receiver.transfer(amount);
    LogPayment(receiver, amount);

    success = true;
  }

  function getBalance()
  public
  constant
  returns(uint balance)
  {
    balance = generalLedger[msg.sender];
  }
  
	function () {
		revert();
	}
}
