// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

contract Staking {
  struct Position {
    uint256 positionId;
    address walletAddress;
    uint256 createdDate;
    uint256 unlockDate;
    uint256 percentInterest;
    uint256 weiStaked;
    uint256 weiInterest;
    bool isOpen;
  }

  Position position;
  address public owner;
  uint256 public currentPositionId;
  uint256[] public lockPeriods;
  mapping(uint256 => Position) public positions;
  mapping(address => uint256[]) public positionIdsByAddress;
  mapping(uint256 => uint256) public tiers;

  constructor() payable {
    owner = msg.sender;
    currentPositionId = 0;

    tiers[30] = 700;
    tiers[90] = 1000;
    tiers[180] = 1200;

    lockPeriods.push(30);
    lockPeriods.push(90);
    lockPeriods.push(180);
  }

  modifier onlyOwner() {
    require(owner == msg.sender, "Only the owner may call this function");
    _;
  }

  function stakeEther(uint256 _numDays) external payable {
    require(tiers[_numDays] > 0, "Mapping not found");

    positions[currentPositionId] = Position(
      currentPositionId,
      msg.sender,
      block.timestamp,
      block.timestamp + (_numDays * 1 days),
      tiers[_numDays],
      msg.value,
      calculateInterest(tiers[_numDays], _numDays, msg.value),
      true
    );

    positionIdsByAddress[msg.sender].push(currentPositionId);
    currentPositionId += 1;
  }

  function calculateInterest(
    uint256 _basisPoints,
    uint256 _numDays,
    uint256 _weiAmount
  ) private pure returns (uint256) {
    return (_basisPoints * _weiAmount) / 10000;
  }

  function modifyLockPeriods(uint256 _numDays, uint256 _basisPoints)
    external
    onlyOwner
  {
    tiers[_numDays] = _basisPoints;
    lockPeriods.push(_numDays);
  }

  function getLockPeriods() external view returns (uint256[] memory) {
    return lockPeriods;
  }

  function getInterestRate(uint256 _numDays) external view returns (uint256) {
    return tiers[_numDays];
  }

  function getPositionById(uint256 _positionId)
    external
    view
    returns (Position memory)
  {
    return positions[_positionId];
  }

  function getPositionIdsForAddress(address _walletAddress)
    external
    view
    returns (uint256[] memory)
  {
    return positionIdsByAddress[_walletAddress];
  }

  function changeUnlockDate(uint256 _positionId, uint256 _newUnlickDate)
    external
    onlyOwner
  {
    positions[_positionId].unlockDate = _newUnlickDate;
  }

  function closePosition(uint256 _positionId) external {
    require(
      positions[_positionId].walletAddress == msg.sender,
      "Only the position creator may modify this position"
    );
    require(positions[_positionId].isOpen == true, "This position is closed");

    positions[_positionId].isOpen = false;

    if (block.timestamp > positions[_positionId].unlockDate) {
      uint256 amount = positions[_positionId].weiStaked +
        positions[_positionId].weiInterest;
      payable(msg.sender).call{ value: amount }("");
    } else {
      payable(msg.sender).call{ value: positions[_positionId].weiStaked }("");
    }
  }
}
