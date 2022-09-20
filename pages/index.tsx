import type { NextPage } from "next";
import { BigNumberish, BytesLike, Contract, ethers, providers } from "ethers";
import stakingArtifacts from "../client/src/artifacts/contracts/Staking.sol/Staking.json";
import { useEffect, useReducer, useState } from "react";
import { Box, Typography } from "@mui/material";
import { SatelliteAlt } from "@mui/icons-material";
import { JsonRpcSigner, Web3Provider } from "@ethersproject/providers";
import NavBar from "../components/NavBar";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

type State = {
  provider?: Web3Provider;
  signer?: JsonRpcSigner;
  contract?: Contract;
  signerAddress?: string;
  assetIds?: any;
  assets: any[];
  showStakeModal: boolean;
  stakingLength: number;
  stakingPercent: number;
  amount: number;
};

type Reducer<S> = (state: S, updateState: Partial<S>) => S;

const Home: NextPage = () => {
  const [state, updateState] = useReducer<Reducer<State>>(
    (currState, newState) => ({ ...currState, ...newState }),
    {
      assets: [],
      showStakeModal: false,
      amount: 0,
      stakingLength: 0,
      stakingPercent: 0,
    }
  );

  //helpers
  const toString = (bytes32: BytesLike) =>
    ethers.utils.parseBytes32String(bytes32);
  const toWei = (ether: string) => ethers.utils.parseEther(ether);
  const toEther = (wei: BigNumberish) => ethers.utils.formatEther(wei);

  useEffect(() => {
    const onLoad = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        stakingArtifacts.abi
      );

      updateState({ provider, contract });
    };

    onLoad();
  }, []);

  const isConnected = (): boolean => state.signer !== undefined;

  const getSigner = async (): Promise<JsonRpcSigner | undefined> => {
    if (state.provider) {
      await state.provider.send("eth_requestAccounts", []);
      const signer = state.provider.getSigner();
      return signer;
    }
  };

  const getAssetIds = async (address: string, signer: JsonRpcSigner) => {
    if (state.contract) {
      const assetIds = await state.contract
        .connect(signer)
        .getPositionIdsForAddress(address);
      return assetIds;
    }
  };

  const calcDaysRemaining = (unlockDate: number) => {
    const timeNow = Date.now() / 1000;
    const secondsRemaining = unlockDate - timeNow;
    return Math.max(Number((secondsRemaining / (60 * 60 * 24)).toFixed(0)), 0);
  };

  const getAssets = async (ids: number[], signer: JsonRpcSigner) => {
    if (state.contract) {
      const queriedAssets = await Promise.all(
        ids.map((id) => state.contract?.connect(signer).getPositionById(id))
      );

      queriedAssets.map(async (asset) => {
        const parsedAsset = {
          positionId: asset.positionId,
          percentInterest: Number(asset.percentInterest) / 100,
          daysRemaining: calcDaysRemaining(Number(asset.unlockDate)),
          etherInterest: toEther(asset.weiInterest),
          etherStaked: toEther(asset.weiStaked),
          isPositionOpen: asset.isOpen,
        };

        updateState({ assets: [...state.assets, parsedAsset] });
      });
    }
  };

  const connectAndLoad = async () => {
    const signer = await getSigner();

    if (signer) {
      const signerAddress = await signer?.getAddress();
      const assetIds = await getAssetIds(signerAddress, signer);

      await getAssets(assetIds, signer);
      updateState({ signer, signerAddress, assetIds });
    }
  };

  const openStakingModal = (stakingLength: number, stakingPercent: number) => {
    updateState({ showStakeModal: true, stakingLength, stakingPercent });
  };

  const stakeEther = async () => {
    const wei = toWei(String(state.amount));
    const data = { value: wei };

    if (state.contract && state.signer) {
      await state.contract
        .connect(state.signer)
        .stakeEther(state.stakingLength, data);
    }
  };

  const withdraw = async (positionId: number) => {
    if (state.contract && state.signer) {
      await state.contract.connect(state.signer).closePosition(positionId);
    }
  };

  useEffect(() => {
    console.log("State: ", state);
  }, [state]);

  return (
    <>
      <NavBar isConnected={isConnected()} handleConnectClick={connectAndLoad} />
    </>
  );
};

export default Home;
