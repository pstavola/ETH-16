pragma solidity ^0.4.10;

contract Splitter{
    address public owner;
    mapping(address=>uint) public balances;
    bool active;

    event LogSplittedValue(address receiver1, uint splittedValue1,address receiver2, uint splittedValue2, address sender, uint change);
    event LogWithdraw(address requester, uint sendAmount);

    modifier isActive()
    {
      require(active==true);
      _;
    }

    modifier isOwner()
    {
      require(msg.sender == owner);
      _;
    }

    function Splitter()
      public payable
    {
      owner = msg.sender;
      active = true;
    }

    function split(address receiver1, address receiver2)
      public payable
      isActive()
      returns (bool success)
    {
      if(msg.value==0) revert();

      balances[receiver1] += msg.value/2;
      balances[receiver2] += msg.value/2;

	  if (msg.value%2 > 0)
		balances[msg.sender] += msg.value%2;

      LogSplittedValue(receiver1, msg.value/2, receiver2, msg.value/2, msg.sender, msg.value%2);

      success = true;
    }

    function withdrawFunds()
      public
      isActive()
      returns (bool success)
    {
      require(balances[msg.sender]>0);

      uint sendAmount = balances[msg.sender];
      balances[msg.sender]=0;
      msg.sender.transfer(sendAmount);

      LogWithdraw(msg.sender, sendAmount);
      success = true;
    }

    function stopSplitter()
      public
      isOwner()
      returns (bool)
    {
      active=false;
      return true;
    }

    function resumeSplitter()
      public
      isOwner()
      returns (bool)
    {
      active=true;
      return true;
    }

    function () public {}
}
