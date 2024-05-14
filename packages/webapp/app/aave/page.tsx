"use client";

import { useState } from "react";
import { AAVE, AAVE_ABI, DELAY_ABI, ERC20_ABI, EURe, EURe_DECIMALS, aEURe, aEURe_DECIMALS } from "@gp-aave/lib";
import { MetaTransaction, TransactionType, encodeMulti, encodeSingle } from "ethers-multisend";
import type { NextPage } from "next";
import { encodeFunctionData, formatUnits, isAddress } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { Address, AddressInput, IntegerInput } from "~~/components/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { findSafeProperties, formatAddresses, parseEURe } from "~~/utils";

const AAVEPage: NextPage = () => {
  const [safeAddress, setSafeAddress] = useState<string>("");
  const [delayAddress, setDelayAddress] = useState<string>("");
  const [rolesModuleAddress, setRolesModuleAddress] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [isRolesModuleDeployed, setIsRolesModuleDeployed] = useState<boolean>();
  const { writeContractAsync } = useWriteContract();
  const [isConnectedOwner, setIsConnectedOwner] = useState<boolean>();
  const { address: connectedAddress } = useAccount();
  const writeTx = useTransactor();
  const {
    data: safeEUReBalance,
    isLoading: isSafeEUReBalanceLoading,
    isFetched: isSafeEUReBalanceFetched,
  } = useReadContract({
    address: EURe,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [safeAddress],
    query: {
      select: data => {
        console.log(data);
        return formatUnits(data as bigint, EURe_DECIMALS);
      },
      enabled: isAddress(safeAddress),
    },
  });

  const {
    data: safeaEUReBalance,
    isLoading: isSafeaEUReBalanceLoading,
    isFetched: isSafeaEUReBalanceFetched,
  } = useReadContract({
    address: aEURe,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [safeAddress],
    query: {
      select: data => formatUnits(data as bigint, aEURe_DECIMALS),
      enabled: isAddress(safeAddress),
    },
  });

  function buildApproveDepositAAVE(amount: string) {
    return encodeSingle({
      type: TransactionType.callContract,
      id: "",
      to: EURe,
      value: "0",
      abi: JSON.stringify(ERC20_ABI),
      functionSignature: "approve(address,uint256)",
      inputValues: [AAVE, parseEURe(amount)],
    });
  }

  function buildDeposit(safeAddress: `0x${string}`, amount: string) {
    return encodeSingle({
      type: TransactionType.callContract,
      id: "",
      to: AAVE,
      value: "0",
      abi: JSON.stringify(AAVE_ABI),
      functionSignature: "supply(address,uint256,address,uint16)",
      inputValues: [EURe, parseEURe(amount), safeAddress, "0x0"],
    });
  }

  function buildMultisend(safeAddress: `0x${string}`, depositAmount: string): MetaTransaction {
    const calls = [
      buildApproveDepositAAVE(depositAmount),
      buildDeposit(safeAddress, depositAmount),
      buildApproveDepositAAVE("0"), // Gnosis Pay "Spendable Balance" only looks at Approval Events, it does not check if the approved amount has been spent
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

  function buildWithdrawCalldata(safeAddress: string, amount: string) {
    return encodeFunctionData({
      abi: AAVE_ABI,
      functionName: "withdraw",
      args: [EURe, parseEURe(amount), safeAddress],
    });
  }

  async function depositQueue() {
    const [_safeAddress, _delayAddress, _connectedAddress] = formatAddresses([
      safeAddress,
      delayAddress,
      connectedAddress,
    ]);
    if (depositAmount !== "") {
      const multiSendTx = buildMultisend(_safeAddress, depositAmount);
      const preppedTx = await prepTx(_connectedAddress, _delayAddress, multiSendTx);
      const writePromise = writeContractAsync({
        functionName: "execTransactionFromModule",
        ...preppedTx,
      });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }

  async function depositExecute() {
    const [_safeAddress, _delayAddress, _connectedAddress] = formatAddresses([
      safeAddress,
      delayAddress,
      connectedAddress,
    ]);
    if (depositAmount !== "" && connectedAddress) {
      const multiSendTx = buildMultisend(_safeAddress, depositAmount);
      const preppedTx = await prepTx(_connectedAddress, _delayAddress, multiSendTx);
      const writePromise = writeContractAsync({ functionName: "executeNextTx", ...preppedTx });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }

  async function withdrawQueue() {
    const [_safeAddress, _delayAddress] = formatAddresses([delayAddress]);
    if (withdrawAmount !== "" && connectedAddress) {
      const depositCalldata = buildWithdrawCalldata(_safeAddress, withdrawAmount);
      const writePromise = writeContractAsync({
        address: _delayAddress,
        functionName: "execTransactionFromModule",
        abi: DELAY_ABI,
        args: [AAVE, 0, depositCalldata, 0],
      });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }
  async function withdrawExecute() {
    const [_safeAddress, _delayAddress] = formatAddresses([delayAddress]);
    if (withdrawAmount !== "" && connectedAddress) {
      const depositCalldata = buildWithdrawCalldata(_safeAddress, withdrawAmount);
      const writePromise = writeContractAsync({
        address: _delayAddress,
        functionName: "executeNextTx",
        abi: DELAY_ABI,
        args: [AAVE, 0, depositCalldata, 0],
      });
      writeTx(writePromise, { blockConfirmations: 1 });
    }
  }

  async function updateSafeAddress(newSafeAddress: string) {
    const [_safeAddress, _connectedAddress] = formatAddresses([newSafeAddress, connectedAddress]);
    setSafeAddress(_safeAddress);
    const {
      delayAddress: newDelayAddress,
      rolesModuleAddress: newRolesModuleAddress,
      isRolesModuleDeployed: newIsRolesModuleDeployed,
      isConnectedOwner: newIsConnectedOwner,
    } = await findSafeProperties(_safeAddress, _connectedAddress);
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
            <span className="block text-4xl font-bold">Gnosis Pay + AAVE</span>
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
                  <h2 className="card-title">Safe EURe Balance</h2>
                  <div className="card-actions items-center flex-col gap-1 text-lg">
                    {isSafeEUReBalanceLoading ? (
                      <span className="loading loading-spinner"></span>
                    ) : isSafeEUReBalanceFetched ? (
                      <p className="m-0">{safeEUReBalance}</p>
                    ) : (
                      <p className="m-0">-</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="card card-compact w-64 bg-secondary text-primary-content shadow-xl m-4">
                <div className="card-body items-center text-center">
                  <h2 className="card-title">Safe AAVE EURe Balance</h2>
                  <div className="card-actions items-center flex-col gap-1 text-lg">
                    {isSafeaEUReBalanceLoading ? (
                      <span className="loading loading-spinner"></span>
                    ) : isSafeaEUReBalanceFetched ? (
                      <p className="m-0">{safeaEUReBalance}</p>
                    ) : (
                      <p className="m-0">-</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <ArrowUpTrayIcon className="h-8 w-8 fill-secondary" />
              Deposit to AAVE
              <IntegerInput
                value={depositAmount}
                onChange={updatedDepositAmount => {
                  setDepositAmount(updatedDepositAmount as string);
                }}
                placeholder="Amount to deposit to AAVE"
              />
              <div>
                <button className="btn btn-primary" disabled={depositAmount === ""} onClick={depositQueue}>
                  Queue
                </button>
                <button className="btn btn-primary" disabled={depositAmount === ""} onClick={depositExecute}>
                  Execute
                </button>
              </div>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <ArrowDownTrayIcon className="h-8 w-8 fill-secondary" />
              Withdraw from AAVE
              <IntegerInput
                value={withdrawAmount}
                onChange={updatedWithdrawAmount => {
                  setWithdrawAmount(updatedWithdrawAmount as string);
                }}
                placeholder="Amount to withdraw from AAVE"
              />
              <div>
                <button className="btn btn-primary" disabled={withdrawAmount === ""} onClick={withdrawQueue}>
                  Queue
                </button>
                <button className="btn btn-primary" disabled={withdrawAmount === ""} onClick={withdrawExecute}>
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

export default AAVEPage;
