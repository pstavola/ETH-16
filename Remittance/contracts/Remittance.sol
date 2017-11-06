pragma solidity ^0.4.10;

import "./Pausable.sol";

contract Remittance is Pausable {
    uint public fee;
    uint commissionsAmount;

    event LogFeeSet(address who, uint gasPrice, uint gasUsed, uint fee);
    event LogSendFunds(address sender, address receiver, uint amout,bytes32 passwordHash,uint duration);
    event LogReleaseFunds(address exchange, uint sentAmount, uint fee);
    event LogClaimBack(address claimer, uint sentAmount, uint blockNumber);

    struct Ledger {
      address sender;
      address receiver;
      uint amount;
      uint deadline;
    }

    mapping (bytes32=>Ledger) public exchangeLedger;

    function Remittance() public {
      fee = (tx.gasprice*msg.gas)/3;
      LogFeeSet(msg.sender, tx.gasprice, msg.gas, fee);
    }

    function sendFunds(address exchange, bytes32 passwordsHash, uint duration)
        public payable isActive()
        returns (bool success)
    {
        require(duration<500);
        require(msg.value>0);

        bytes32 hashedKey = keccak256(exchange, passwordsHash);

        require(exchangeLedger[hashedKey].deadline==0);

        exchangeLedger[hashedKey].sender = msg.sender;
        exchangeLedger[hashedKey].receiver = exchange;
        exchangeLedger[hashedKey].amount = msg.value;
        exchangeLedger[hashedKey].deadline = block.number + duration;
        LogSendFunds(msg.sender, exchange, msg.value, passwordsHash, exchangeLedger[hashedKey].deadline);
        success = true;
    }

    function releaseFunds(bytes32 passwordExchOwner, bytes32 passwordReceiver)
        public isActive()
        returns (bool success)
    {
        bytes32 _passwordsHash = keccak256(passwordExchOwner, passwordReceiver);
        bytes32 hashedKey = keccak256(msg.sender, _passwordsHash);
        require(exchangeLedger[hashedKey].amount>0);

        uint amountToSend = exchangeLedger[hashedKey].amount;

        if (amountToSend>fee) {
          amountToSend -= fee;
          commissionsAmount += fee;
        }

        exchangeLedger[hashedKey].amount = 0;
        msg.sender.transfer(amountToSend);
        LogReleaseFunds(msg.sender, amountToSend, fee);
        success = true;
    }

    function claimBack(address exchange, bytes32 _passwordsHash)
        public isActive()
        returns (bool success)
    {
        bytes32 hashedKey = keccak256(exchange, _passwordsHash);

        require(msg.sender==exchangeLedger[hashedKey].sender);
        require(block.number>exchangeLedger[hashedKey].deadline);

        uint amountToSend = exchangeLedger[hashedKey].amount;
        exchangeLedger[hashedKey].amount = 0;
        msg.sender.transfer(amountToSend);
        LogClaimBack(msg.sender, amountToSend, block.number);
        success = true;
    }

    //needed only for testing
    function generateHashPwd(bytes32 _v1, bytes32 _v2)
        public isActive()
        constant
        returns (bytes32 pwdHash)
    {
        pwdHash = keccak256(_v1, _v2);
    }

    //needed only for testing
    function generateHashKey(address _v1, bytes32 _v2)
        public isActive()
        constant
        returns (bytes32 keyHash)
    {
        keyHash = keccak256(_v1, _v2);
    }

    function withdrawCommissions()
        public isOwner()
        returns (bool success)
    {
        uint256 toSend = commissionsAmount;

        require(commissionsAmount > 0);
        require(this.balance >= commissionsAmount);

        commissionsAmount = 0;
        owner.transfer(toSend);
        success = true;
    }

    function() {
        revert();
    }
}
