pragma solidity ^0.4.10;

import "./Pausable.sol";

contract Remittance is Pausable {
    uint public fee;
    uint commissionsAmount;

    event LogFeeSet(address who, uint gasPrice, uint gasUsed, uint fee);
    event LogSendFunds(address sender, uint amout,bytes32 hashKey,uint duration);
    event LogReleaseFunds(address exchange, uint sentAmount, uint fee);
    event LogClaimBack(address claimer, uint sentAmount, uint blockNumber);

    struct Ledger {
      address sender;
      uint amount;
      uint deadline;
    }

    mapping (bytes32=>Ledger) public exchangeLedger;

    function Remittance() public {
      fee = (tx.gasprice*msg.gas)/3;
      LogFeeSet(msg.sender, tx.gasprice, msg.gas, fee);
    }

    function sendFunds(bytes32 hashedKey, uint duration)
        public payable isActive()
        returns (bool success)
    {
        require(duration<500);
        require(msg.value>fee);

        uint _deadline = exchangeLedger[hashedKey].deadline;

        require(_deadline==0);

        exchangeLedger[hashedKey].sender = msg.sender;
        exchangeLedger[hashedKey].amount = msg.value;
        exchangeLedger[hashedKey].deadline = block.number + duration;
        LogSendFunds(msg.sender, msg.value, hashedKey, _deadline);
        success = true;
    }

    function releaseFunds(bytes32 passwordExchOwner, bytes32 passwordReceiver)
        public isActive()
        returns (bool success)
    {
        bytes32 hashedKey = generateHash(msg.sender, passwordExchOwner, passwordReceiver);
        require(exchangeLedger[hashedKey].amount>0);
        require(exchangeLedger[hashedKey].deadline>block.number);

        uint amountToSend = exchangeLedger[hashedKey].amount-fee;
        commissionsAmount += fee;

        exchangeLedger[hashedKey].amount = 0;
        msg.sender.transfer(amountToSend);
        LogReleaseFunds(msg.sender, amountToSend, fee);
        success = true;
    }

    function claimBack(bytes32 hashedKey)
        public isActive()
        returns (bool success)
    {
        require(msg.sender==exchangeLedger[hashedKey].sender);
        require(block.number>exchangeLedger[hashedKey].deadline);

        uint amountToSend = exchangeLedger[hashedKey].amount;
        exchangeLedger[hashedKey].amount = 0;
        msg.sender.transfer(amountToSend);
        LogClaimBack(msg.sender, amountToSend, block.number);
        success = true;
    }

    function generateHash(address _v1, bytes32 _v2, bytes32 _v3)
        public isActive()
        constant
        returns (bytes32 pwdHash)
    {
        pwdHash = keccak256(_v1, _v2, _v3);
    }

    function withdrawCommissions()
        public isOwner()
        returns (bool success)
    {
        uint toSend = commissionsAmount;

        require(toSend > 0);
        assert(this.balance >= toSend);

        commissionsAmount = 0;
        msg.sender.transfer(toSend);
        success = true;
    }

    function() {
        revert();
    }
}
