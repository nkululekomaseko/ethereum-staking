const { ethers, waffle } = require("hardhat");
import { Contract } from "ethers";
const { expect } = require("chai");
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

let stakingContract: Contract | undefined = undefined;
let [signer1, signer2]: SignerWithAddress[] | undefined[] = [
  undefined,
  undefined,
];

describe("Staking", () => {
  beforeEach(async () => {
    [signer1, signer2] = await ethers.getSigners();

    const Staking = await ethers.getContractFactory("Staking", signer1);

    stakingContract = await Staking.deploy({
      value: ethers.utils.parseEther("10"),
    });
  });

  if (stakingContract !== undefined) {
  }

  describe("deploy", () => {
    it("should set owner", async () => {
      expect(await stakingContract!.owner()).to.equal(signer1!.address);
    });

    it("sets up lockPeriods", async () => {
      expect(await stakingContract?.lockPeriods(0)).to.equal(30);
      expect(await stakingContract?.lockPeriods(1)).to.equal(90);
      expect(await stakingContract?.lockPeriods(2)).to.equal(180);
    });

    it("sets up tiers", async () => {
      expect(await stakingContract?.tiers(30)).to.equal(700);
      expect(await stakingContract?.tiers(90)).to.equal(1000);
      expect(await stakingContract?.tiers(180)).to.equal(1200);
    });
  });

  describe("stakeEther", () => {
    it("transfers ether", async () => {
      const provider = waffle.provider;
      let contractBalance;
      let signerBalance;
      const transferAmount = ethers.utils.parseEther("2.0");

      contractBalance = await provider.getBalance(stakingContract!.address);
      signerBalance = await signer1!.getBalance();

      // Transfer 2 ETH: signer1 => contract
      const data = { value: transferAmount };
      const transaction = await stakingContract!
        .connect(signer1!)
        .stakeEther(30, data);
      const receipt = await transaction.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      // test the change in siger1's ether balance
      expect(await signer1!.getBalance()).to.equal(
        signerBalance.sub(transferAmount).sub(gasUsed)
      );

      // test the change in contract's ether balance
      expect(await provider.getBalance(stakingContract!.address)).to.equal(
        contractBalance.add(transferAmount)
      );
    });

    it("check initial position", async () => {
      let position;

      position = await stakingContract!.positions(0);

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
      const transaction = await stakingContract!
        .connect(signer1!)
        .stakeEther(90, data);
      const receipt = await transaction.wait();
      const block = await provider.getBlock(receipt.blockNumber);

      position = await stakingContract!.positions(0);

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

      expect(await stakingContract!.currentPositionId()).to.equal(1);
    });

    it("adds address and positionId to positionIdsByAddress", async () => {
      const transferAmount = ethers.utils.parseEther("0.5");

      // Transfer 0.5 ETH: signer1 => contract
      const data = { value: transferAmount };
      await stakingContract!.connect(signer1!).stakeEther(30, data);
      await stakingContract!.connect(signer1!).stakeEther(30, data);
      await stakingContract!.connect(signer2!).stakeEther(90, data);

      expect(
        await stakingContract!.positionIdsByAddress(signer1!.address, 0)
      ).to.equal(0);
      expect(
        await stakingContract!.positionIdsByAddress(signer1!.address, 1)
      ).to.equal(1);
      expect(
        await stakingContract!.positionIdsByAddress(signer2!.address, 0)
      ).to.equal(2);
    });
  });

  describe("modifyLockperiods", () => {
    describe("owner", () => {
      it("should create a new lock period", async () => {
        await stakingContract!.connect(signer1!).modifyLockPeriods(100, 999);

        expect(await stakingContract!.tiers(100)).to.equal(999);
        expect(await stakingContract!.lockPeriods(3)).to.equal(100);
      });

      it("should modify an existing lock period", async () => {
        await stakingContract!.connect(signer1!).modifyLockPeriods(30, 150);

        expect(await stakingContract!.tiers(30)).to.equal(150);
      });
    });

    describe("non-owner", () => {
      it("reverts", async () => {
        expect(
          stakingContract!.connect(signer2!).modifyLockPeriods(100, 999)
        ).to.be.revertedWith("Only the owner may call this function");
      });
    });
  });

  describe("getLockPeriods", () => {
    it("retuns all lock periods", async () => {
      const lockPeriods = await stakingContract!.getLockPeriods();

      expect(lockPeriods.map((value: any) => Number(value._hex))).to.eql([
        30, 90, 180,
      ]);
    });
  });

  describe("getInterestRate", () => {
    it("returns the interest rate for a specific lockPeriod", async () => {
      const interestRate = await stakingContract!.getInterestRate(30);

      expect(interestRate).to.equal(700);
    });
  });

  describe("getPositionById", () => {
    it("returns data about a specific position, given a positionId", async () => {
      const provider = waffle.provider;

      const transferAmount = ethers.utils.parseEther("5");
      const data = { value: transferAmount };
      const transaction = await stakingContract!
        .connect(signer1!)
        .stakeEther(90, data);
      const receipt = await transaction.wait();
      const block = await provider.getBlock(receipt.blockNumber);

      const position = await stakingContract!
        .connect(signer1!.address)
        .getPositionById(0);

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
    });
  });

  describe("getPositionIdsForAddress", async () => {
    it("returns a list of positionIds created by a specific address", async () => {
      let data;
      let transaction;

      data = { value: ethers.utils.parseEther("5") };
      transaction = await stakingContract
        ?.connect(signer1!)
        .stakeEther(90, data);

      data = { value: ethers.utils.parseEther("10") };
      transaction = await stakingContract
        ?.connect(signer1!)
        .stakeEther(90, data);

      const positionIds = await stakingContract!.getPositionIdsForAddress(
        signer1!.address
      );

      expect(positionIds.map((p: any) => Number(p))).to.eql([0, 1]);
    });
  });

  describe("changeUnlockDate", () => {
    describe("owner", () => {
      it("sould change the unlockDate", async () => {
        const transferAmount = ethers.utils.parseEther("5");
        const data = { value: transferAmount };
        await stakingContract!.connect(signer2!).stakeEther(90, data);
        const positionOld = await stakingContract!.getPositionById(0);

        const newUnlockDate = positionOld.unlockDate - 24 * 60 * 60 * 500;
        await stakingContract!
          .connect(signer1!)
          .changeUnlockDate(0, newUnlockDate);
        const positionNew = await stakingContract!.getPositionById(0);

        expect(positionNew.unlockDate).to.be.equal(
          positionOld.unlockDate - 24 * 60 * 60 * 500
        );
      });
    });

    describe("non-owner", () => {
      it("reverts", async () => {
        const data = { value: ethers.utils.parseEther("8") };
        await stakingContract!.connect(signer2!).stakeEther(90, data);
        const positionOld = await stakingContract!.getPositionById(0);

        const newUnlockDate = positionOld.unlockDate - 24 * 60 * 60 * 500;

        expect(
          stakingContract!.connect(signer2!).changeUnlockDate(0, newUnlockDate)
        ).to.be.revertedWith("Only the owner may call this function");
      });
    });
  });

  describe("closePosition", () => {
    describe("after unlock date", () => {
      it("transfers principal and interest", async () => {
        const provider = waffle.provider;
        let transaction;
        let receipt;
        let block;

        const data = { value: ethers.utils.parseEther("8") };
        transaction = await stakingContract!
          .connect(signer2!)
          .stakeEther(90, data);
        receipt = await transaction.wait();
        block = await provider.getBlock(receipt.blockNumber);

        //change Unlock date to back date, so we can assume we can unlock now
        const newUnlockDate = block.timestamp - 24 * 60 * 60 * 100;
        await stakingContract!
          .connect(signer1!)
          .changeUnlockDate(0, newUnlockDate);

        const position = await stakingContract!.getPositionById(0);

        const signerBalanceBefore = await signer2?.getBalance();

        transaction = await stakingContract!.connect(signer2!).closePosition(0);
        receipt = await transaction.wait();

        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const signerBalanceAfter = await signer2?.getBalance();

        expect(signerBalanceAfter).to.equal(
          signerBalanceBefore
            ?.add(position.weiStaked)
            .add(position.weiInterest)
            .sub(gasUsed)
        );
      });
    });

    describe("before unlock date", () => {
      it("transfers only principal", async () => {
        const provider = waffle.provider;
        let transaction;
        let receipt;
        let block;

        const data = { value: ethers.utils.parseEther("5") };
        transaction = await stakingContract!
          .connect(signer2!)
          .stakeEther(90, data);
        receipt = await transaction.wait();
        block = await provider.getBlock(receipt.blockNumber);

        const position = await stakingContract!.getPositionById(0);

        const signerBalanceBefore = await signer2?.getBalance();

        transaction = await stakingContract!.connect(signer2!).closePosition(0);
        receipt = await transaction.wait();

        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const signerBalanceAfter = await signer2?.getBalance();

        expect(signerBalanceAfter).to.equal(
          signerBalanceBefore?.add(position.weiStaked).sub(gasUsed)
        );
      });
    });
  });
});
