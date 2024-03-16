"use client";

import { useState } from "react";
import { AAVE, AAVE_ABI, DELAY_ABI, ERC20_ABI, EURe, EURe_DECIMALS, SAFE_ABI, aEURe } from "@gp-aave/lib";
import { MetaTransaction, TransactionType, encodeMulti, encodeSingle } from "ethers-multisend";
import type { NextPage } from "next";
import { createPublicClient, createWalletClient, custom, encodeFunctionData, http, parseUnits } from "viem";
import { gnosis } from "viem/chains";
import { useAccount } from "wagmi";
import { setUpRolesMod } from "zodiac-roles-sdk";
import { allow } from "zodiac-roles-sdk/kit";
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ForwardIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { AddressInput } from "~~/components/scaffold-eth";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";

const client = createPublicClient({
  chain: gnosis,
  transport: http(),
});

const walletClient = createWalletClient({
  chain: gnosis,
  transport: custom(window.ethereum!),
});

const Home: NextPage = () => {
  const [safeAddress, setSafeAddress] = useState<`0x${string}`>();
  const [delayAddress, setDelayAddress] = useState<`0x${string}`>();
  const [executorAddress, setExecutorAddress] = useState<`0x${string}`>();
  const [rolesModuleAddress, setRolesModuleAddress] = useState<`0x${string}`>();
  const [depositAmount, setDepositAmount] = useState<string>();
  const [withdrawAmount, setWithdrawAmount] = useState<string>();
  const [isRolesModuleDeployed, setIsRolesModuleDeployed] = useState<boolean>();
  const [isConnectedOwner, setIsConnectedOwner] = useState<boolean>();
  const { address: connectedAddress } = useAccount();
  const { data: safeEUReBalance, isLoading: isSafeEUReBalanceLoading } = useScaffoldContractRead({
    contractName: "EURe",
    functionName: "balanceOf",
    args: [safeAddress],
    watch: true,
  });

  const { data: safeaEUReBalance, isLoading: isSafeaEUReBalanceLoading } = useScaffoldContractRead({
    contractName: "aEURe",
    functionName: "balanceOf",
    args: [safeAddress],
    watch: true,
  });

  async function isContract(address: string): Promise<boolean> {
    const bytecode = await client.getBytecode({
      address: address,
    });
    return bytecode !== undefined;
  }

  async function isConectedOwner(connectedAddress: `0x${string}`, delayAddress: `0x${string}`): Promise<boolean> {
    const res = (await client.readContract({
      address: delayAddress,
      abi: DELAY_ABI,
      functionName: "isModuleEnabled",
      args: [connectedAddress],
    })) as boolean;
    return res;
  }

  function buildApproveAAVE() {
    return [
      encodeSingle({
        type: TransactionType.callContract,
        id: "",
        to: EURe,
        value: "0",
        abi: JSON.stringify(ERC20_ABI),
        functionSignature: "approve(address,uint256)",
        inputValues: [AAVE, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],
      }),
      encodeSingle({
        type: TransactionType.callContract,
        id: "",
        to: aEURe,
        value: "0",
        abi: JSON.stringify(ERC20_ABI),
        functionSignature: "approve(address,uint256)",
        inputValues: [AAVE, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],
      }),
    ];
  }

  function buildRolesModule(
    safeAddress: `0x${string}`,
    delayAddress: `0x${string}`,
    executorAddress: `0x${string}` = "0x0000000000000000000000000000000000000000",
  ) {
    const permissions = [allow.gnosis.aave.withdraw(EURe, undefined, safeAddress)];

    const setupCalls = setUpRolesMod({
      avatar: safeAddress,
      target: delayAddress,
      roles: [{ key: "WithdrawEUReFromAAVE", members: [executorAddress], permissions }],
    });

    return setupCalls;
  }

  async function findDelayModule(safeAddress: `0x${string}`): Promise<`0x${string}`> {
    const safeModules = (
      (await client.readContract({
        address: safeAddress,
        abi: SAFE_ABI,
        functionName: "getModulesPaginated",
        args: ["0x0000000000000000000000000000000000000001", 5],
      })) as string[]
    )[0];

    let newDelayAddress = null;

    for (const safeModule of safeModules) {
      try {
        await client.readContract({
          address: safeModule,
          abi: DELAY_ABI,
          functionName: "queueNonce",
        });
        newDelayAddress = safeModule;
      } catch {
        console.debug(`Not delay module: ${safeModule}`);
      }
    }

    if (newDelayAddress === null) {
      throw Error("Delay not found");
    }

    return newDelayAddress as `0x${string}`;
  }

  function buildMultisend(
    safeAddress: `0x${string}`,
    delayAddress: `0x${string}`,
    executorAddress: `0x${string}`,
    depositAmount: string | undefined,
  ): MetaTransaction {
    const calls = [...buildApproveAAVE(), ...buildRolesModule(safeAddress, delayAddress, executorAddress)];

    if (depositAmount !== undefined) {
      calls.push(
        encodeSingle({
          type: TransactionType.callContract,
          id: "",
          to: AAVE,
          value: "0",
          abi: JSON.stringify(AAVE_ABI),
          functionSignature: "supply(address,uint256,address,uint16)",
          inputValues: [EURe, "0x" + parseUnits(depositAmount, EURe_DECIMALS).toString(16), safeAddress, "0x0"],
        }),
      );
    }

    return encodeMulti(calls);
  }

  function prepTx(
    safeAddress: `0x${string}`,
    connectedAddress: `0x${string}`,
    delayAddress: `0x${string}`,
    multiSendTx: MetaTransaction,
  ) {
    return {
      account: connectedAddress,
      address: delayAddress,
      abi: DELAY_ABI,
      args: [multiSendTx.to, 0, multiSendTx.data, 1],
    };
  }

  async function queue() {
    if (
      safeAddress !== undefined &&
      delayAddress !== undefined &&
      connectedAddress !== undefined &&
      executorAddress !== undefined
    ) {
      const multiSendTx = buildMultisend(safeAddress, delayAddress, executorAddress, depositAmount);
      const preppedTx = await prepTx(safeAddress, connectedAddress as `0x${string}`, delayAddress, multiSendTx);
      const hash = await walletClient.writeContract({ functionName: "execTransactionFromModule", ...preppedTx });
      console.log(hash);
    }
  }

  async function execute() {
    if (
      safeAddress !== undefined &&
      delayAddress !== undefined &&
      connectedAddress !== undefined &&
      executorAddress !== undefined
    ) {
      const multiSendTx = buildMultisend(safeAddress, delayAddress, executorAddress, depositAmount);
      const preppedTx = await prepTx(safeAddress, connectedAddress as `0x${string}`, delayAddress, multiSendTx);
      const hash = await walletClient.writeContract({ functionName: "executeNextTx", ...preppedTx });
      console.log(hash);
    }
  }

  function buildDepositCalldata(safeAddress: string, amount: string) {
    return encodeFunctionData({
      abi: AAVE_ABI,
      functionName: "supply",
      args: [EURe, parseUnits(amount, EURe_DECIMALS), safeAddress, 0],
    });
  }

  function buildWithdrawCalldata(safeAddress: string, amount: string) {
    return encodeFunctionData({
      abi: AAVE_ABI,
      functionName: "withdraw",
      args: [EURe, parseUnits(amount, EURe_DECIMALS), safeAddress],
    });
  }

  async function depositQueue() {
    if (
      safeAddress !== undefined &&
      delayAddress !== undefined &&
      depositAmount !== undefined &&
      connectedAddress !== undefined
    ) {
      const depositCalldata = buildDepositCalldata(safeAddress, depositAmount);
      const hash = await walletClient.writeContract({
        account: connectedAddress,
        address: delayAddress,
        functionName: "execTransactionFromModule",
        abi: DELAY_ABI,
        args: [AAVE, 0, depositCalldata, 0],
      });
      console.log(hash);
    }
  }
  async function depositExecute() {
    if (
      safeAddress !== undefined &&
      delayAddress !== undefined &&
      depositAmount !== undefined &&
      connectedAddress !== undefined
    ) {
      const depositCalldata = buildDepositCalldata(safeAddress, depositAmount);
      const hash = await walletClient.writeContract({
        account: connectedAddress,
        address: delayAddress,
        functionName: "executeNextTx",
        abi: DELAY_ABI,
        args: [AAVE, 0, depositCalldata, 0],
      });
      console.log(hash);
    }
  }
  async function withdrawQueue() {
    if (
      safeAddress !== undefined &&
      delayAddress !== undefined &&
      withdrawAmount !== undefined &&
      connectedAddress !== undefined
    ) {
      const depositCalldata = buildWithdrawCalldata(safeAddress, withdrawAmount);
      const hash = await walletClient.writeContract({
        account: connectedAddress,
        address: delayAddress,
        functionName: "execTransactionFromModule",
        abi: DELAY_ABI,
        args: [AAVE, 0, depositCalldata, 0],
      });
      console.log(hash);
    }
  }
  async function withdrawExecute() {
    if (
      safeAddress !== undefined &&
      delayAddress !== undefined &&
      withdrawAmount !== undefined &&
      connectedAddress !== undefined
    ) {
      const depositCalldata = buildWithdrawCalldata(safeAddress, withdrawAmount);
      const hash = await walletClient.writeContract({
        account: connectedAddress,
        address: delayAddress,
        functionName: "executeNextTx",
        abi: DELAY_ABI,
        args: [AAVE, 0, depositCalldata, 0],
      });
      console.log(hash);
    }
  }
  async function skipExpired() {
    if (safeAddress !== undefined && delayAddress !== undefined && connectedAddress !== undefined) {
      const hash = await walletClient.writeContract({
        account: connectedAddress,
        address: delayAddress,
        functionName: "skipExpired",
        abi: DELAY_ABI,
      });
      console.log(hash);
    }
  }

  async function updateSafeAddress(newSafeAddress: string) {
    const typedSafeAddress = newSafeAddress as `0x${string}`;
    setSafeAddress(typedSafeAddress);
    const newDelayAddress = await findDelayModule(typedSafeAddress);
    setDelayAddress(newDelayAddress);
    const setPermisionsCall = buildRolesModule(typedSafeAddress, newDelayAddress)[1];
    const newRolesModuleAddress = setPermisionsCall.to as `0x{string}`;
    setRolesModuleAddress(newRolesModuleAddress);
    setIsRolesModuleDeployed(await isContract(newRolesModuleAddress));
    setIsConnectedOwner(await isConectedOwner(connectedAddress, newDelayAddress));
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
            <p>Executor:</p>
            <AddressInput
              onChange={setExecutorAddress}
              value={executorAddress}
              placeholder="Input the executor address"
            />
          </div>
          <div className="flex justify-center items-center space-x-2">
            <p className="my-2 font-medium">Delay Address:</p>
            <Address address={delayAddress} />
          </div>
          <div className="flex justify-center items-center space-x-2">
            <p className="my-2 font-medium">Roles Module Address:</p>
            <Address address={rolesModuleAddress} />
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
              disabled={safeAddress === undefined || executorAddress === undefined || isRolesModuleDeployed === true}
              className="btn btn-primary"
              daisyUI
              onClick={queue}
            >
              Queue
            </button>
            <button
              disabled={safeAddress === undefined || executorAddress === undefined || isRolesModuleDeployed === true}
              className="btn btn-primary"
              daisyUI
              onClick={execute}
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
                  <h2 className="card-title">Safe EURe Balance</h2>
                  <div className="card-actions items-center flex-col gap-1 text-lg">
                    {isSafeEUReBalanceLoading ? (
                      <span className="loading loading-spinner"></span>
                    ) : (
                      <p className="m-0">
                        {safeEUReBalance ? (Number(safeEUReBalance / 10000000000000000n) / 100).toString() : 0}
                      </p>
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
                    ) : (
                      <p className="m-0">
                        {safeaEUReBalance ? (Number(safeaEUReBalance / 10000000000000000n) / 100).toString() : 0}
                      </p>
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
                <button
                  className="btn btn-primary"
                  daisyUI
                  disabled={depositAmount === undefined}
                  onClick={depositQueue}
                >
                  Queue
                </button>
                <button
                  className="btn btn-primary"
                  daisyUI
                  disabled={depositAmount === undefined}
                  Button
                  onClick={depositExecute}
                >
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
                <button
                  className="btn btn-primary"
                  daisyUI
                  disabled={withdrawAmount === undefined}
                  onClick={withdrawQueue}
                >
                  Queue
                </button>
                <button
                  className="btn btn-primary"
                  daisyUI
                  disabled={withdrawAmount === undefined}
                  Button
                  onClick={withdrawExecute}
                >
                  Execute
                </button>
              </div>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <ForwardIcon className="h-8 w-8 fill-secondary" />
              Skip expired
              <button disabled={!isConnectedOwner} className="btn btn-primary" daisyUI onClick={skipExpired}>
                Execute
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
