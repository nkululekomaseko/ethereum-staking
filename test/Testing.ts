import { ethers, waffle } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

let stakingContact: Contract | undefined = undefined;
let [signer1, signer2]: SignerWithAddress[] | undefined[] = [
  undefined,
  undefined,
];

describe("Staking", () => {
  beforeEach(async () => {
    [signer1, signer2] = await ethers.getSigners();

    const Staking = await ethers.getContractFactory("Staking", signer1);

    stakingContact = await Staking.deploy({
      value: ethers.utils.parseEther("10"),
    });
  });

  if (stakingContact !== undefined) {
  }

  describe("deploy", () => {
    it("should set owner", async () => {
      expect(await stakingContact!.owner()).to.equal(signer1!.address);
    });

    it("sets up lockPeriods", async () => {
      expect(await stakingContact?.lockPeriods(0)).to.equal(30);
      expect(await stakingContact?.lockPeriods(1)).to.equal(90);
      expect(await stakingContact?.lockPeriods(2)).to.equal(180);
    });

    it("sets up tiers", async () => {
      expect(await stakingContact?.tiers(30)).to.equal(700);
      expect(await stakingContact?.tiers(90)).to.equal(1000);
      expect(await stakingContact?.tiers(180)).to.equal(1200);
    });
  });

  describe("stakeEther", () => {
    it("transfers ether", async () => {
      const provider = waffle.provider;
      let contractBalance;
      let signerBalance;
      const transferAmount = ethers.utils.parseEther("2.0");

      contractBalance = await provider.getBalance(stakingContact!.address);
      signerBalance = await signer1!.getBalance();

      // Transfer 2 ETH: signer1 => contract
      const data = { value: transferAmount };
      const transaction = await stakingContact!
        .connect(signer1!)
        .stakeEther(30, data);
      const receipt = await transaction.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      // test the change in siger1's ether balance
      expect(await signer1!.getBalance()).to.equal(
        signerBalance.sub(transferAmount).sub(gasUsed)
      );

      // test the change in contract's ether balance
      expect(await provider.getBalance(stakingContact!.address)).to.equal(
        contractBalance.add(transferAmount)
      );
    });

    it("check initial position", async () => {
      let position;

      position = await stakingContact!.positions(0);

      expect(position.positionId).to.equal(0);
      expect(position.walletAddress).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(position.createdDate).to.equal(0);
      expect(position.unlockDate).to.equal(0);
      expect(position.percentInterest).to.equal(0);
      expect(position.weiStaked).to.equal(0);
      expect(position.weiInterest).to.equal(0);
      expect(position.isOpen).to.equal(false);
    });

    it("adds a position to positions", async () => {
      const provider = waffle.provider;
      let position;
      const transferAmount = ethers.utils.parseEther("1.0");

      // Transfer 1 ETH: signer1 => contract
      const data = { value: transferAmount };
      const transaction = await stakingContact!
        .connect(signer1!)
        .stakeEther(90, data);
      const receipt = await transaction.wait();
      const block = await provider.getBlock(receipt.blockNumber);

      position = await stakingContact!.positions(0);

      expect(position.positionId).to.equal(0);
      expect(position.walletAddress).to.equal(signer1?.address);
      expect(position.createdDate).to.equal(block.timestamp);
      expect(position.unlockDate).to.equal(block.timestamp + 24 * 60 * 60 * 90); // 24 hours/day, 60 mins/hour, 60 seconds/min, 90 days
      expect(position.percentInterest).to.equal(1000);
      expect(position.weiStaked).to.equal(transferAmount);
      expect(position.weiInterest).to.equal(
        ethers.BigNumber.from(transferAmount).mul(1000).div(10000)
      );
      expect(position.isOpen).to.equal(true);

      expect(await stakingContact!.currentPositionId()).to.equal(1);
    });

    it("adds address and positionId to positionIdsByAddress", async () => {
      const transferAmount = ethers.utils.parseEther("0.5");

      // Transfer 0.5 ETH: signer1 => contract
      const data = { value: transferAmount };
      await stakingContact!.connect(signer1!).stakeEther(30, data);
      await stakingContact!.connect(signer1!).stakeEther(30, data);
      await stakingContact!.connect(signer2!).stakeEther(90, data);

      expect(
        await stakingContact!.positionIdsByAddress(signer1!.address, 0)
      ).to.equal(0);
      expect(
        await stakingContact!.positionIdsByAddress(signer1!.address, 1)
      ).to.equal(1);
      expect(
        await stakingContact!.positionIdsByAddress(signer2!.address, 0)
      ).to.equal(2);
    });
  });
});
