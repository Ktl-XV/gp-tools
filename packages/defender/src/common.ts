// Import dependencies available in the autotask environment
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from "defender-relay-client/lib/ethers";
import { RelayerParams } from "defender-relay-client/lib/relayer";
import { BigNumber, ethers } from "ethers";

// Import an ABI which will be embedded into the generated js

import {
  AAVE,
  AAVE_ABI,
  DELAY_ABI,
  ERC20_ABI,
  EURe,
  EURe_DECIMALS,
  SAFE_ABI,
  aEURe,
} from "@gp-aave/lib";
export const CALL_OPERATION = 0; // DelegateCall: 1
// Import a dependency not present in the autotask environment which will be included in the js bundle

export const aEURe_DECIMALS = 18;
export const ROLE_KEY =
  "0x57697468647261774555526546726f6d41415645000000000000000000000000";

import { GP_SAFE, TOPUP_TO, TOPUP_TRIGGER } from "./config";

export const topUpTriggerAmount = ethers.utils.parseUnits(
  TOPUP_TRIGGER.toString(),
  EURe_DECIMALS,
);

export const topUpToAmount = ethers.utils.parseUnits(
  TOPUP_TO.toString(),
  EURe_DECIMALS,
);

async function getBalance(provider: DefenderRelayProvider): Promise<BigNumber> {
  const eure = new ethers.Contract(EURe, ERC20_ABI, provider);
  const eureBalance: BigNumber = await eure.balanceOf(GP_SAFE);

  return eureBalance;
}

export async function getNeedsTopUp(
  provider: DefenderRelayProvider,
): Promise<boolean> {
  const eureBalance = await getBalance(provider);

  const eureBalanceDisplay = ethers.utils.formatUnits(
    eureBalance,
    EURe_DECIMALS,
  );
  console.info(`EURe balance: ${eureBalanceDisplay}`);

  return topUpTriggerAmount.gt(eureBalance);
}

export async function getTopupAmount(
  provider: DefenderRelayProvider,
): Promise<BigNumber> {
  const aeure = new ethers.Contract(aEURe, ERC20_ABI, provider);
  const aeureBalance: BigNumber = await aeure.balanceOf(GP_SAFE);

  if (aeureBalance.isZero()) {
    throw Error("No EURe Balance in AAVE to withdraw from");
  }

  const missingAmount = topUpToAmount.sub(await getBalance(provider));

  const reloadAmount = aeureBalance.gte(missingAmount)
    ? missingAmount
    : ethers.constants.MaxUint256;

  if (reloadAmount.eq(ethers.constants.MaxUint256)) {
    console.warn(
      "aEURe balance low, not enough balance for full reload, withdrawing all",
    );
  } else {
    const reloadAmountDisplay = ethers.utils.formatUnits(
      reloadAmount,
      aEURe_DECIMALS,
    );

    console.info(`Withdrawing ${reloadAmountDisplay} EURe from AAVE`);
  }

  return reloadAmount;
}

export function generateWithdrawCalldata(reloadAmount: BigNumber) {
  const aavei = new ethers.utils.Interface(AAVE_ABI);

  const withdrawCalldata = aavei.encodeFunctionData("withdraw", [
    EURe,
    reloadAmount,
    GP_SAFE,
  ]);
  return withdrawCalldata;
}
