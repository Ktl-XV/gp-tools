// Import dependencies available in the autotask environment
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from "defender-relay-client/lib/ethers";
import { RelayerParams } from "defender-relay-client/lib/relayer";
import { BigNumber, ethers } from "ethers";

import { AAVE, DELAY_ABI, ROLES_ABI } from "@gp-aave/lib";

import {
  CALL_OPERATION,
  ROLE_KEY,
  generateWithdrawCalldata,
  getNeedsTopUp,
  getTopupAmount,
} from "./common";

import { API_KEY, API_SECRET, DELAY } from "./config";

// Entrypoint for the Autotask
export async function handler(credentials: RelayerParams) {
  const provider = new DefenderRelayProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider);

  const needsTopUp = await getNeedsTopUp(provider);
  if (needsTopUp) {
    const topupAmount = await getTopupAmount(provider);
    const withdrawCalldata = generateWithdrawCalldata(topupAmount);

    const delay = new ethers.Contract(DELAY, DELAY_ABI, signer);
    const tx = await delay.executeNextTx(
      AAVE,
      0,
      withdrawCalldata,
      CALL_OPERATION,
    );
    console.log(tx);
  } else {
    console.info("No need to withdraw from AAVE");
  }
}

// To run locally (this code will not be executed in Autotasks environment, only when executed directly via `yarn start`)
if (require.main === module) {
  handler({ apiKey: API_KEY, apiSecret: API_SECRET })
    .then(() => process.exit(0))
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });
}
