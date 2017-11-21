pragma solidity ^0.4.10;

import "./Pausable.sol";
import "./SafeMath.sol";

contract Remittance is Pausable {
    using SafeMath for uint;

    uint private fee;
    uint private commissionsAmount;
	uint constant DURATION_LIMIT = 500;

    event LogFeeSet(address indexed who, uint fee);
    event LogSendFunds(address indexed sender, uint amount, bytes32 hashKey, uint duration);
    event LogReleaseFunds(address indexed exchange, uint sentAmount, uint fee);
    event LogClaimBack(address indexed claimer, uint sentAmount);
	event LogCommissionsWithdrawal(uint amountWithdrawn);

    struct Ledger {
      address sender;
      uint amount;
      uint deadline;
    }

    mapping (bytes32=>Ledger) public exchangeLedger;

    function setFee(uint _fee)
        public isOwner()
        returns (bool success)
    {
		require(fee != _fee);
        fee = _fee;
        LogFeeSet(msg.sender, fee);
        success = true;
    }

    function getFee()
        public
        constant
        returns (uint _fee)
    {
		_fee = fee;
    }

    function getCommissions()
        public
        constant
        returns (uint _commissions)
    {
		_commissions = commissionsAmount;
    }

    function getDurationLimit()
        public
        constant
        returns (uint _limit)
    {
		_limit = DURATION_LIMIT;
    }

    function sendFunds(bytes32 hashedKey, uint duration)
        public payable isActive()
        returns (bool success)
    {
        require(duration<DURATION_LIMIT);
        require(msg.value>fee);
        require(exchangeLedger[hashedKey].deadline==0);
		
		uint _deadline = SafeMath.add(block.number, duration);

        exchangeLedger[hashedKey] = Ledger({
			sender : msg.sender,
			amount : msg.value,
			deadline : _deadline
		});
		
        LogSendFunds(msg.sender, msg.value, hashedKey, _deadline);
        success = true;
    }

    function releaseFunds(bytes32 passwordExchOwner, bytes32 passwordReceiver)
        public isActive()
        returns (bool success)
    {
        bytes32 hashedKey = generateHash(msg.sender, passwordExchOwner, passwordReceiver);
        require(exchangeLedger[hashedKey].amount>0);
        require(block.number<=exchangeLedger[hashedKey].deadline);

        uint amountToSend = SafeMath.sub(exchangeLedger[hashedKey].amount, fee);
        SafeMath.add(commissionsAmount, fee);

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
        LogClaimBack(msg.sender, amountToSend);
        success = true;
    }

    function generateHash(address _exchange, bytes32 _pwdExchange, bytes32 _pwdReceiver)
        public
        constant
        returns (bytes32 pwdHash)
    {
        pwdHash = keccak256(_exchange, _pwdExchange, _pwdReceiver);
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
		
		LogCommissionsWithdrawal(toSend);
        success = true;
    }

    function() {
        revert();
    }
}