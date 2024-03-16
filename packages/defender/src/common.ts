// Import dependencies available in the autotask environment
import { RelayerParams } from "defender-relay-client/lib/relayer";
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from "defender-relay-client/lib/ethers";
import { ethers, BigNumber } from "ethers";

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

import { RELOAD_LIMIT, GP_SAFE } from "./config";

export const reloadLimitAmount = ethers.utils.parseUnits(
  RELOAD_LIMIT.toString(),
  EURe_DECIMALS,
);

export async function getMissingAmount(
  provider: DefenderRelayProvider,
): Promise<BigNumber> {
  const eure = new ethers.Contract(EURe, ERC20_ABI, provider);
  const eureBalance: BigNumber = await eure.balanceOf(GP_SAFE);

  const eureBalanceDisplay = ethers.utils.formatUnits(
    eureBalance,
    EURe_DECIMALS,
  );
  console.info(`EURe balance: ${eureBalanceDisplay}`);

  const missingAmount = reloadLimitAmount.sub(eureBalance);
  return missingAmount;
}

export async function getReloadAmount(
  provider: DefenderRelayProvider,
  missingAmount: BigNumber,
): Promise<BigNumber> {
  const aeure = new ethers.Contract(aEURe, ERC20_ABI, provider);
  const aeureBalance: BigNumber = await aeure.balanceOf(GP_SAFE);

  const reloadAmount = aeureBalance.gte(missingAmount)
    ? missingAmount
    : aeureBalance;
  const reloadAmountDisplay = ethers.utils.formatUnits(
    reloadAmount,
    aEURe_DECIMALS,
  );

  if (reloadAmount.isZero()) {
    throw Error("No EURe Balance in AAVE to withdraw from");
  }
  if (reloadAmount.lt(missingAmount)) {
    console.warn("aEURe balance low, not enough balance for full reload");
  }

  console.info(`Withdrawing ${reloadAmountDisplay} EURe from AAVE`);
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
export type EnvInfo = {
  API_KEY: string;
  API_SECRET: string;
};
