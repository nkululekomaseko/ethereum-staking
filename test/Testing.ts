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
  });
});
