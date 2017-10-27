pragma solidity ^0.4.10;

contract Remittance{
    address owner;
    bool active;
    uint public fee;

    event LogFee(uint fee);
    event LogSendFunds(address sender, address receiver, uint amout,bytes32 passwordHash,uint duration);
    event LogReleaseFunds(address exchange, uint sentAmount, uint fee);
    event LogClaimBack(address claimer, uint sentAmount, uint blockNumber);

    struct Ledger{
      address sender;
      address receiver;
      uint amount;
      uint deadline;
    }

    mapping (bytes32=>Ledger) public exchangeLedger;

    modifier isActive(){
        require(active==true);
        _;
    }

    modifier isOwner(){
        require(msg.sender == owner);
        _;
    }

    function Remittance() public{
      owner = msg.sender;
      active = true;
      fee = (tx.gasprice*msg.gas)/3;
      LogFee(fee);
    }

    function sendFunds(address exchange, bytes32 passwordsHash, uint duration)
        public payable isActive()
        returns (bool success)
    {
        require(duration<500);
        require(msg.value>0);

        exchangeLedger[passwordsHash].sender = msg.sender;
        exchangeLedger[passwordsHash].receiver = exchange;
        exchangeLedger[passwordsHash].amount = msg.value;
        exchangeLedger[passwordsHash].deadline = block.number + duration;
        LogSendFunds(msg.sender, exchange, msg.value, passwordsHash, exchangeLedger[passwordsHash].deadline);
        success = true;
    }

    function releaseFunds(bytes32 passwordExchOwner, bytes32 passwordReceiver)
        public isActive()
        returns (bool success)
    {
        bytes32 _passwordsHash = generateHash(passwordExchOwner, passwordReceiver);
        require(exchangeLedger[_passwordsHash].receiver==msg.sender);
        require(exchangeLedger[_passwordsHash].amount>0);

        uint amountToSend = exchangeLedger[_passwordsHash].amount;
        if(amountToSend>fee)
          amountToSend -= fee;

        exchangeLedger[_passwordsHash].amount = 0;
        msg.sender.transfer(amountToSend);
        owner.transfer(fee);
        LogReleaseFunds(msg.sender, amountToSend, fee);
        success = true;
    }

    function claimBack(bytes32 _passwordsHash)
        public isActive()
        returns (bool success)
    {
        require(msg.sender==exchangeLedger[_passwordsHash].sender);
        require(block.number>exchangeLedger[_passwordsHash].deadline);

        uint amountToSend = exchangeLedger[_passwordsHash].amount;
        exchangeLedger[_passwordsHash].amount=0;
        msg.sender.transfer(amountToSend);
        LogClaimBack(msg.sender, amountToSend, block.number);
        success = true;
    }

    function generateHash(bytes32 pwdOne, bytes32 pwdTwo)
        public isActive()
        constant
        returns (bytes32 pwdHash)
    {
        pwdHash = keccak256(pwdOne, pwdTwo);
    }

    function stop() public isOwner() returns (bool) {
        active=false;
        return true;
    }

    function resume() public isOwner() returns (bool) {
        active=true;
        return true;
    }

    function () public {}
}
