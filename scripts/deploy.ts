import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
const { ethers, waffle } = require("hardhat");

const main = async () => {
  const [signer1, signer2]: SignerWithAddress[] = await ethers.getSigners();

  const Staking = await ethers.getContractFactory("Staking", signer1);

  const stakingContract = await Staking.deploy({
    value: ethers.utils.parseEther("10"),
  });

  console.log(
    "Staking contract deployed to: ",
    stakingContract.address,
    "by",
    signer1.address
  );

  const provider = waffle.provider;
  let data;
  let transaction;
  let receipt;
  let block;
  let newUnlockDate;

  data = { value: ethers.utils.parseEther("0.5") };
  transaction = await stakingContract!.connect(signer2).stakeEther(30, data);

  data = { value: ethers.utils.parseEther("1") };
  transaction = await stakingContract!.connect(signer2).stakeEther(180, data);

  data = { value: ethers.utils.parseEther("1.75") };
  transaction = await stakingContract!.connect(signer2).stakeEther(180, data);

  data = { value: ethers.utils.parseEther("5") };
  transaction = await stakingContract!.connect(signer2).stakeEther(90, data);
  receipt = await transaction.wait();
  block = await provider.getBlock(receipt.blockNumber);
  newUnlockDate = block.timestamp - 24 * 60 * 60 * 100;
  await stakingContract!.connect(signer1).changeUnlockDate(3, newUnlockDate);

  data = { value: ethers.utils.parseEther("1.75") };
  transaction = await stakingContract!.connect(signer2).stakeEther(180, data);
  receipt = await transaction.wait();
  block = await provider.getBlock(receipt.blockNumber);
  newUnlockDate = block.timestamp - 24 * 60 * 60 * 200;
  await stakingContract!.connect(signer1).changeUnlockDate(4, newUnlockDate);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
