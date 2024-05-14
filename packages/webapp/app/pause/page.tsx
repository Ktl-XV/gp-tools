"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CALL_OPERATION,
  CUSTOM_NULL_ADDRESS,
  DELAY_ABI,
  ERC20_ABI,
  EURe,
  MAX_UINT256,
  ROLES_ABI,
  ROLE_KEY_PAUSE,
} from "@gp-aave/lib";
import type { NextPage } from "next";
import { encodeFunctionData, isAddress } from "viem";
import { useAccount, useAccountEffect, useReadContract, useWriteContract } from "wagmi";
import { PauseIcon, PlayIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { AddressInput } from "~~/components/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { findSafeProperties, formatAddresses } from "~~/utils";

const Pause: NextPage = () => {
  const [safeAddress, setSafeAddress] = useState<string>("");
  const [delayAddress, setDelayAddress] = useState<string>("");
  const [rolesModuleAddress, setRolesModuleAddress] = useState<string>("");
  const [isRolesModuleDeployed, setIsRolesModuleDeployed] = useState<boolean>();
  const [isConnectedOwner, setIsConnectedOwner] = useState<boolean>();
  const { writeContractAsync } = useWriteContract();
  const { address: connectedAddress } = useAccount();
  const searchParams = useSearchParams();
  const router = useRouter();

  const writeTx = useTransactor();

  useEffect(() => {
    if (searchParams.has("safe-address")) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      updateSafeAddress(searchParams.get("safe-address")!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAccountEffect({
    async onConnect() {
      if (safeAddress !== "") {
        const { isConnectedOwner: newIsConnectedOwner } = await findSafeProperties(
          safeAddress as `0x{string}`,
          connectedAddress as `0x${string}`,
        );
        setIsConnectedOwner(newIsConnectedOwner === null ? false : newIsConnectedOwner);
      }
    },

    onDisconnect() {
      console.log("Disconnected!");
    },
  });

  const { data: isPaused, isLoading: isPausedLoading } = useReadContract({
    address: EURe,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [safeAddress, CUSTOM_NULL_ADDRESS],
    query: {
      select: data => (data as bigint) > 0n,
      enabled: isAddress(safeAddress),
    },
  });

  function buildPauseCalldata() {
    return encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CUSTOM_NULL_ADDRESS, MAX_UINT256],
    });
  }

  function buildUnpauseCalldata() {
    return encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CUSTOM_NULL_ADDRESS, 0],
    });
  }

  async function pauseQueue() {
    const [_rolesModuleAddress] = formatAddresses([rolesModuleAddress]);
    if (connectedAddress) {
      const pauseCalldata = buildPauseCalldata();
      const writePromise = writeContractAsync({
        address: _rolesModuleAddress,
        functionName: "execTransactionWithRole",
        abi: ROLES_ABI,
        args: [EURe, 0, pauseCalldata, CALL_OPERATION, ROLE_KEY_PAUSE, true],
      });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }
  async function pauseExecute() {
    const [_delayAddress] = formatAddresses([delayAddress]);
    if (connectedAddress) {
      const pauseCalldata = buildPauseCalldata();
      const writePromise = writeContractAsync({
        address: _delayAddress,
        functionName: "executeNextTx",
        abi: DELAY_ABI,
        args: [EURe, 0, pauseCalldata, CALL_OPERATION],
      });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }

  async function reactivateQueue() {
    const [_delayAddress] = formatAddresses([delayAddress]);
    if (connectedAddress) {
      const approvalCalldata = buildUnpauseCalldata();
      const writePromise = writeContractAsync({
        address: _delayAddress,
        functionName: "execTransactionFromModule",
        abi: DELAY_ABI,
        args: [EURe, 0, approvalCalldata, 0],
      });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }
  async function reactivateExecute() {
    const [_delayAddress] = formatAddresses([delayAddress]);
    if (connectedAddress) {
      const approvalCalldata = buildUnpauseCalldata();
      const writePromise = writeContractAsync({
        address: _delayAddress,
        functionName: "executeNextTx",
        abi: DELAY_ABI,
        args: [EURe, 0, approvalCalldata, 0],
      });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }

  async function updateSafeAddress(newSafeAddress: string) {
    const typedSafeAddress = newSafeAddress as `0x${string}`;
    setSafeAddress(typedSafeAddress);
    const {
      delayAddress: newDelayAddress,
      rolesModuleAddress: newRolesModuleAddress,
      isRolesModuleDeployed: newIsRolesModuleDeployed,
      isConnectedOwner: newIsConnectedOwner,
    } = await findSafeProperties(typedSafeAddress, connectedAddress as `0x${string}`);
    setDelayAddress(newDelayAddress);
    setRolesModuleAddress(newRolesModuleAddress);
    setIsRolesModuleDeployed(newIsRolesModuleDeployed);
    if (newIsConnectedOwner) {
      setIsConnectedOwner(newIsConnectedOwner);
    }
    router.replace(`/pause?safe-address=${typedSafeAddress}`);
  }

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold">Emergency Pause</span>
          </h1>
          <div className="flex justify-center items-center space-x-2">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>

          <div className="flex justify-center items-center space-x-2">
            <p>Safe:</p>
            <AddressInput
              onChange={updateSafeAddress}
              value={safeAddress}
              placeholder="Input your Gnosis Pay Safe address"
            />
          </div>
          <div className="flex justify-center items-center space-x-2">
            <p className="my-2 font-medium">Delay Address:</p>
            <Address address={delayAddress as `0x{string}`} />
          </div>
          <div className="flex justify-center items-center space-x-2">
            <p className="my-2 font-medium">Roles Module Address:</p>
            <Address address={rolesModuleAddress as `0x{string}`} />
          </div>
          <div className="flex justify-center items-center space-x-2">
            <p>
              Is Role Module Deployed:
              {isRolesModuleDeployed ? " ✅" : " ❌"}
            </p>
          </div>
          <div className="flex justify-center items-center space-x-2">
            <p>
              Is connected wallet owner of Pay Safe:
              {isConnectedOwner ? " ✅" : " ❌"}
            </p>
          </div>
        </div>
        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <div className="card card-compact w-64 bg-secondary text-primary-content shadow-xl m-4">
                <div className="card-body items-center text-center">
                  <h2 className="card-title">Curent Status</h2>
                  <div className="card-actions items-center flex-col gap-1 text-lg">
                    {isPausedLoading || safeAddress === "" ? (
                      <span className="loading loading-spinner"></span>
                    ) : isPaused ? (
                      <div className="flex flex-col text-center items-center ">
                        <PauseIcon className="h-8 w-8 fill-secondary" />
                        <p className="m-0">Paused</p>
                      </div>
                    ) : (
                      <div className="flex flex-col text-center items-center ">
                        <PlayIcon className="h-8 w-8 fill-secondary" />
                        <p className="m-0">Active</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <PauseIcon className="h-8 w-8 fill-secondary" />
              Pause
              <div>
                <button className="btn btn-primary" onClick={pauseQueue}>
                  Queue
                </button>
                <button className="btn btn-primary" onClick={pauseExecute}>
                  Execute
                </button>
              </div>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <PlayIcon className="h-8 w-8 fill-secondary" />
              <p>Reactivate </p>
              <div>Can only be executed by Gnosis Pay owner</div>
              <div>
                <button className="btn btn-primary" disabled={!isConnectedOwner} onClick={reactivateQueue}>
                  Queue
                </button>
                <button className="btn btn-primary" disabled={!isConnectedOwner} onClick={reactivateExecute}>
                  Execute
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pause;
