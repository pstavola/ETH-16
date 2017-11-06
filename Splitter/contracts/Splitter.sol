pragma solidity ^0.4.10;

contract Splitter {
    address public owner;
    mapping(address=>uint) public balances;
    bool active;

    event LogSplittedValue(address indexed receiver1, uint splittedValue1,address indexed receiver2, uint splittedValue2, address indexed sender, uint change);
    event LogWithdraw(address requester, uint sendAmount);
    event LogSplitterStatus(address who, bool activeStatus);

    modifier isActive()
    {
      require(active);
      _;
    }

    modifier isOwner()
    {
      require(msg.sender == owner);
      _;
    }

    function Splitter()
      public 
    {
      owner = msg.sender;
      active = true;
    }

    function split(address receiver1, address receiver2)
      public payable
      isActive()
      returns (bool success)
    {
      require(msg.value>0);

      uint splittedVal = msg.value/2;
      uint splittedChange = msg.value%2;

      balances[receiver1] += splittedVal;
      balances[receiver2] += splittedVal;

      if (splittedChange > 0)
        balances[msg.sender] += splittedChange;

      LogSplittedValue(receiver1, splittedVal, receiver2, splittedVal, msg.sender, splittedChange);

      success = true;
    }

    function withdrawFunds()
      public
      isActive()
      returns (bool success)
    {
      require(balances[msg.sender]>0);

      uint sendAmount = balances[msg.sender];
      balances[msg.sender] = 0;
      msg.sender.transfer(sendAmount);

      LogWithdraw(msg.sender, sendAmount);
      success = true;
    }

    function stopSplitter()
      public
      isOwner()
      returns (bool)
    {
      require(active);
      active = false;
      LogSplitterStatus(msg.sender, active);
      return true;
    }

    function resumeSplitter()
      public
      isOwner()
      returns (bool)
    {
      require(!active);
      active = true;
      LogSplitterStatus(msg.sender, active);
      return true;
    }

    function getStatus()
      public
      constant
      returns (bool)
    {
      return active;
    }

    function () public { revert(); }
}
