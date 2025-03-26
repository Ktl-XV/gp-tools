"use client";

import { useState } from "react";
import {
  AAVE,
  CUSTOM_NULL_ADDRESS,
  DELAY_ABI,
  ERC20_ABI,
  EURe,
  MAX_UINT256,
  ROLES_ABI,
  ROLE_KEY_WITHDRAW_EURE_FROM_AAVE,
  aEURe,
} from "@gp-aave/lib";
import { MetaTransaction, TransactionType, encodeMulti, encodeSingle } from "ethers-multisend";
import type { NextPage } from "next";
import { isAddress } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { setUpRolesMod } from "zodiac-roles-sdk";
import { allow } from "zodiac-roles-sdk/kit";
import { ArrowsRightLeftIcon, ForwardIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { AddressInput } from "~~/components/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { findPrevModule, findSafeProperties, formatAddresses } from "~~/utils";

const Setup: NextPage = () => {
  const [safeAddress, setSafeAddress] = useState<string>("");
  const [delayAddress, setDelayAddress] = useState<string>("");
  const [hotWalletAddress, setHotWalletAddress] = useState<string>("");
  const [executorAddress, setExecutorAddress] = useState<string>("");
  const [oldExecutorAddress, setOldExecutorAddress] = useState<string>("");
  const [newExecutorAddress, setNewExecutorAddress] = useState<string>("");
  const [rolesModuleAddress, setRolesModuleAddress] = useState<string>("");
  const [isRolesModuleDeployed, setIsRolesModuleDeployed] = useState<boolean>();
  const [isConnectedOwner, setIsConnectedOwner] = useState<boolean>();
  const { address: connectedAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const {
    data: queueNonce,
    isLoading: isQueueNonceLoading,
    isFetched: isQueueNonceFetched,
  } = useReadContract({
    address: delayAddress as `0x${string}`,
    abi: DELAY_ABI,
    functionName: "queueNonce",
    query: {
      select: data => {
        return (data as bigint).toString();
      },
      enabled: isAddress(delayAddress),
    },
  });
  const {
    data: txNonce,
    isLoading: isTxNonceLoading,
    isFetched: isTxNonceFetched,
  } = useReadContract({
    address: delayAddress as `0x${string}`,
    abi: DELAY_ABI,
    functionName: "txNonce",
    query: {
      select: data => {
        return (data as bigint).toString();
      },
      enabled: isAddress(delayAddress),
    },
  });

  const writeTx = useTransactor();

  function buildApproveWithdrawAAVE() {
    return encodeSingle({
      type: TransactionType.callContract,
      id: "",
      to: aEURe,
      value: "0",
      abi: JSON.stringify(ERC20_ABI),
      functionSignature: "approve(address,uint256)",
      inputValues: [AAVE, MAX_UINT256],
    });
  }

  function buildRolesModule(
    safeAddress: `0x${string}`,
    delayAddress: `0x${string}`,
    executorAddress: `0x${string}`,
    hotWalletAddress: `0x${string}`,
  ) {
    const roles = [
      {
        key: "WithdrawEUReFromAAVE",
        members: [executorAddress],
        permissions: [allow.gnosis.aave.withdraw(EURe, undefined, safeAddress)],
      },
      {
        key: "Approve0x2SpendEURe",
        members: [hotWalletAddress],
        permissions: [allow.gnosis.eure.approve(CUSTOM_NULL_ADDRESS, MAX_UINT256)],
      },
    ];

    const setupCalls = setUpRolesMod({
      avatar: safeAddress,
      target: delayAddress,
      roles,
    });

    return setupCalls;
  }

  function buildMultisend(
    safeAddress: `0x${string}`,
    delayAddress: `0x${string}`,
    executorAddress: `0x${string}`,
    hotWalletAddress: `0x${string}`,
  ): MetaTransaction {
    const calls = [
      buildApproveWithdrawAAVE(),
      ...buildRolesModule(safeAddress, delayAddress, executorAddress, hotWalletAddress),
    ];

    return encodeMulti(calls);
  }

  function buildChangeExecutorMultisend(
    safeAddress: `0x${string}`,
    delayAddress: `0x${string}`,
    rolesModuleAddress: `0x${string}`,
    oldExecutorAddress: `0x${string}`,
    newExecutorAddress: `0x${string}`,
    prevToOldExecutorAddressModule: `0x${string}`,
  ): MetaTransaction {
    const calls = [
      encodeSingle({
        type: TransactionType.callContract,
        id: "",
        to: rolesModuleAddress,
        value: "0",
        abi: JSON.stringify(ROLES_ABI),
        functionSignature: "assignRoles(address,bytes32[],bool[])",
        inputValues: [oldExecutorAddress, [ROLE_KEY_WITHDRAW_EURE_FROM_AAVE], [false]],
      }),
      encodeSingle({
        type: TransactionType.callContract,
        id: "",
        to: rolesModuleAddress,
        value: "0",
        abi: JSON.stringify(ROLES_ABI),
        functionSignature: "disableModule(address,address)",
        inputValues: [prevToOldExecutorAddressModule, oldExecutorAddress],
      }),
      encodeSingle({
        type: TransactionType.callContract,
        id: "",
        to: rolesModuleAddress,
        value: "0",
        abi: JSON.stringify(ROLES_ABI),
        functionSignature: "enableModule(address)",
        inputValues: [newExecutorAddress],
      }),
      encodeSingle({
        type: TransactionType.callContract,
        id: "",
        to: rolesModuleAddress,
        value: "0",
        abi: JSON.stringify(ROLES_ABI),
        functionSignature: "assignRoles(address,bytes32[],bool[])",
        inputValues: [newExecutorAddress, [ROLE_KEY_WITHDRAW_EURE_FROM_AAVE], [true]],
      }),
    ];
    return encodeMulti(calls);
  }

  function prepTx(connectedAddress: `0x${string}`, delayAddress: `0x${string}`, multiSendTx: MetaTransaction) {
    return {
      account: connectedAddress,
      address: delayAddress,
      abi: DELAY_ABI,
      args: [multiSendTx.to, 0, multiSendTx.data, 1],
    };
  }

  async function setupQueue() {
    const [_safeAddress, _delayAddress, _connectedAddress, _executorAddress, _hotWalletAddress] = formatAddresses([
      safeAddress,
      delayAddress,
      connectedAddress,
      executorAddress,
      hotWalletAddress,
    ]);
    if (connectedAddress) {
      const multiSendTx = buildMultisend(_safeAddress, _delayAddress, _executorAddress, _hotWalletAddress);
      const preppedTx = await prepTx(_connectedAddress, _delayAddress, multiSendTx);
      const writePromise = writeContractAsync({
        functionName: "execTransactionFromModule",
        ...preppedTx,
      });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }

  async function setupExecute() {
    const [_safeAddress, _delayAddress, _connectedAddress, _executorAddress, _hotWalletAddress] = formatAddresses([
      safeAddress,
      delayAddress,
      connectedAddress,
      executorAddress,
      hotWalletAddress,
    ]);
    if (connectedAddress) {
      const multiSendTx = buildMultisend(_safeAddress, _delayAddress, _executorAddress, _hotWalletAddress);
      const preppedTx = await prepTx(_connectedAddress, _delayAddress, multiSendTx);
      const writePromise = writeContractAsync({ functionName: "executeNextTx", ...preppedTx });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }
  async function changeExecutorQueue() {
    const [
      _safeAddress,
      _delayAddress,
      _rolesModuleAddress,
      _connectedAddress,
      _oldExecutorAddress,
      _newExecutorAddress,
    ] = formatAddresses([
      safeAddress,
      delayAddress,
      rolesModuleAddress,
      connectedAddress,
      oldExecutorAddress,
      newExecutorAddress,
    ]);
    if (connectedAddress) {
      const prevToOldExecutorAddressModule = await findPrevModule(_rolesModuleAddress, _oldExecutorAddress);
      const multiSendTx = buildChangeExecutorMultisend(
        _safeAddress,
        _delayAddress,
        _rolesModuleAddress,
        _oldExecutorAddress,
        _newExecutorAddress,
        prevToOldExecutorAddressModule,
      );
      const preppedTx = await prepTx(_connectedAddress, _delayAddress, multiSendTx);
      const writePromise = writeContractAsync({
        functionName: "execTransactionFromModule",
        ...preppedTx,
      });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }

  async function changeExecutorExecute() {
    const [
      _safeAddress,
      _delayAddress,
      _rolesModuleAddress,
      _connectedAddress,
      _oldExecutorAddress,
      _newExecutorAddress,
    ] = formatAddresses([
      safeAddress,
      delayAddress,
      rolesModuleAddress,
      connectedAddress,
      oldExecutorAddress,
      newExecutorAddress,
    ]);
    if (connectedAddress) {
      const prevToOldExecutorAddressModule = await findPrevModule(_rolesModuleAddress, _oldExecutorAddress);
      console.log(prevToOldExecutorAddressModule);
      const multiSendTx = buildChangeExecutorMultisend(
        _safeAddress,
        _delayAddress,
        _rolesModuleAddress,
        _oldExecutorAddress,
        _newExecutorAddress,
        prevToOldExecutorAddressModule,
      );
      const preppedTx = await prepTx(_connectedAddress, _delayAddress, multiSendTx);
      const writePromise = writeContractAsync({ functionName: "executeNextTx", ...preppedTx });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }

  async function skipExpired() {
    const [_delayAddress, _connectedAddress] = formatAddresses([delayAddress, connectedAddress]);
    if (connectedAddress) {
      const writePromise = writeContractAsync({
        account: _connectedAddress,
        address: _delayAddress,
        functionName: "skipExpired",
        abi: DELAY_ABI,
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
  }

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold">Setup</span>
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
            <p>Executor:</p>
            <AddressInput
              onChange={setExecutorAddress}
              value={executorAddress}
              placeholder="Input the executor address"
            />
          </div>
          <div className="flex justify-center items-center space-x-2">
            <p>Hot Wallet:</p>
            <AddressInput
              onChange={setHotWalletAddress}
              value={hotWalletAddress}
              placeholder="Input the hot wallet address"
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
          <div className="flex justify-center items-center space-x-2">
            <button
              disabled={safeAddress === "" || executorAddress === "" || isRolesModuleDeployed === true}
              className="btn btn-primary"
              onClick={setupQueue}
            >
              Queue
            </button>
            <button
              disabled={safeAddress === "" || executorAddress === "" || isRolesModuleDeployed === true}
              className="btn btn-primary"
              onClick={setupExecute}
            >
              Execute
            </button>
          </div>
        </div>
        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <div className="card card-compact w-64 bg-secondary text-primary-content shadow-xl m-4">
                <div className="card-body items-center text-center">
                  <h2 className="card-title">Queue Nonce</h2>
                  <div className="card-actions items-center flex-col gap-1 text-lg">
                    {isQueueNonceLoading ? (
                      <span className="loading loading-spinner"></span>
                    ) : isQueueNonceFetched ? (
                      <p className="m-0">{queueNonce}</p>
                    ) : (
                      <p className="m-0">-</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="card card-compact w-64 bg-secondary text-primary-content shadow-xl m-4">
                <div className="card-body items-center text-center">
                  <h2 className="card-title">Tx Nonce</h2>
                  <div className="card-actions items-center flex-col gap-1 text-lg">
                    {isTxNonceLoading ? (
                      <span className="loading loading-spinner"></span>
                    ) : isTxNonceFetched ? (
                      <p className="m-0">{txNonce}</p>
                    ) : (
                      <p className="m-0">-</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <ForwardIcon className="h-8 w-8 fill-secondary" />
              Skip expired
              <button disabled={delayAddress === ""} className="btn btn-primary" onClick={skipExpired}>
                Execute
              </button>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <ArrowsRightLeftIcon className="h-8 w-8 fill-secondary" />
              Change Executor
              <AddressInput
                onChange={setOldExecutorAddress}
                value={oldExecutorAddress}
                placeholder="Input your Old Executor Address"
              />
              <AddressInput
                onChange={setNewExecutorAddress}
                value={newExecutorAddress}
                placeholder="Input your New ExecutorAddress"
              />
              <div>
                <button
                  className="btn btn-primary"
                  disabled={oldExecutorAddress === "" || newExecutorAddress === ""}
                  onClick={changeExecutorQueue}
                >
                  Queue
                </button>
                <button
                  className="btn btn-primary"
                  disabled={oldExecutorAddress === "" || newExecutorAddress === ""}
                  onClick={changeExecutorExecute}
                >
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

export default Setup;
