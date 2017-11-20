pragma solidity ^0.4.10;

import "./Pausable.sol";

contract MerchantsAdministration is Pausable {
	struct Product {
    bytes32 name;
    bool intialized;
    uint price;
    uint stock;
  }
  
  struct Merchant {
    address merchantAdmin;
    address merchantOwner;
    bool active;
    mapping (bytes32 => Product) catalog;
  }

  mapping (bytes32=>Merchant) public merchants;
  
  event LogProdAdded(address merchantAdmin, bytes32 merchantName, bytes32 productId, bytes32 productName, uint productPrice, uint productStock);
  event LogProdUpdated(address merchantAdmin, bytes32 merchantName, bytes32 productId, uint productPriceOrStock);
  event LogProdRemoved(address merchantAdmin, bytes32 merchantName, bytes32 productId);
  event LogMerchantAdminChange(bytes32 merchantName, address merchantOwner, address oldAdmin, address newAdmin);
  
  modifier isExistingMerchant(bytes32 merchantName) {
      require(merchants[merchantName].active);
      _;
  }
  
  modifier isNotExistingMerchant(bytes32 merchantName) {
      require(!merchants[merchantName].active);
      _;
  }
  
  modifier isMerchantAdmin(bytes32 merchantName) {
      require(msg.sender == merchants[merchantName].merchantAdmin);
      _;
  }
  
  modifier isMerchantOwner(bytes32 merchantName) {
      require(msg.sender == merchants[merchantName].merchantOwner);
      _;
  }
  
  modifier isExistingProduct(bytes32 merchantName, bytes32 productId) {
      require(merchants[merchantName].catalog[productId].intialized);
      _;
  }
  
  modifier isNotExistingProduct(bytes32 merchantName, bytes32 productId) {
      require(!merchants[merchantName].catalog[productId].intialized);
      _;
  }

  function addProduct(bytes32 merchantName, bytes32 productId, bytes32 productName, uint productPrice, uint productStock) 
    public isExistingMerchant(merchantName) isMerchantAdmin(merchantName) isNotExistingProduct(merchantName, productId) 
    returns (bool success)
  {
    merchants[merchantName].catalog[productId].name = productName;
    merchants[merchantName].catalog[productId].intialized = true;
    merchants[merchantName].catalog[productId].price = productPrice;
    merchants[merchantName].catalog[productId].stock = productStock;
    LogProdAdded(msg.sender, merchantName, productId, productName, productPrice, productStock);

    success = true;
  }

  function updateProductPrice(bytes32 merchantName, bytes32 productId, uint productPrice)
    public isExistingMerchant(merchantName) isExistingProduct(merchantName, productId) isMerchantAdmin(merchantName)
    returns (bool success)
  {
    merchants[merchantName].catalog[productId].price = productPrice;
    LogProdUpdated(msg.sender, merchantName, productId, productPrice);

    success = true;
  }

  function updateProductStock(bytes32 merchantName, bytes32 productId, uint productStock)
    public isExistingMerchant(merchantName) isExistingProduct(merchantName, productId) isMerchantAdmin(merchantName)
    returns (bool success)
  {
    merchants[merchantName].catalog[productId].stock = productStock;
    LogProdUpdated(msg.sender, merchantName, productId, productStock);

    success = true;
  }
  
  function removeProduct(bytes32 merchantName, bytes32 productId)
    public isExistingMerchant(merchantName) isExistingProduct(merchantName, productId) isMerchantAdmin(merchantName)
    returns (bool success)
  {
    delete  merchants[merchantName].catalog[productId];
    LogProdRemoved(msg.sender, merchantName, productId);

    success = true;
  }
  
  function changeMerchantAdmin(bytes32 merchantName, address newAdmin)
    public isMerchantOwner(merchantName)
    returns(bool success)
  {
    address oldAdmin = merchants[merchantName].merchantAdmin;
    merchants[merchantName].merchantAdmin = newAdmin;
    LogMerchantAdminChange(merchantName, msg.sender, oldAdmin, newAdmin);
    
    success = true;
  }
  
  function () {
		revert();
	}
}