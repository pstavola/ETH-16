pragma solidity ^0.4.10;

contract MerchantsAdministration {
	struct Product {
    bytes32 externalId;
    bool intialized;
    uint price;
    uint stock;
  }

  mapping (address=>mapping(bytes32 => Product)) public merchants;
  
  event LogProdAdded(address indexed merchantAdmin, address merchantId, bytes32 productId, bytes32 productName, uint productPrice, uint productStock);
  event LogProdRemoved(address indexed merchantAdmin, address merchantId, bytes32 productId);
  
  modifier isExistingProduct(address merchantId, bytes32 productId) {
      require(merchants[merchantId][productId].intialized);
      _;
  }
  
  modifier isNotExistingProduct(address merchantId, bytes32 productId) {
      require(!merchants[merchantId][productId].intialized);
      _;
  }

  function addProduct(address merchantId, bytes32 productId, bytes32 productName, uint productPrice, uint productStock) 
    public 
	isNotExistingProduct(merchantId, productId) 
    returns (bool success)
  {
    merchants[merchantId][productId].externalId = productName;
    merchants[merchantId][productId].intialized = true;
    merchants[merchantId][productId].price = productPrice;
    merchants[merchantId][productId].stock = productStock;
    LogProdAdded(msg.sender, merchantId, productId, productName, productPrice, productStock);

    success = true;
  }
  
  function removeProduct(address merchantId, bytes32 productId)
    public
	isExistingProduct(merchantId, productId)
    returns (bool success)
  {
    delete  merchants[merchantId][productId];
    LogProdRemoved(msg.sender, merchantId, productId);

    success = true;
  }
  
  function () {
		revert();
	}
}