// Import dependencies available in the autotask environment
import { RelayerParams } from "defender-relay-client/lib/relayer";
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from "defender-relay-client/lib/ethers";
import { ethers, BigNumber } from "ethers";

import { ROLES_ABI, AAVE } from "@gp-aave/lib";

import {
  CALL_OPERATION,
  getNeedsTopUp,
  getTopupAmount,
  generateWithdrawCalldata,
  EnvInfo,
  ROLE_KEY,
} from "./common";

import { ROLES, API_KEY, API_SECRET } from "./config";

// Entrypoint for the Autotask
export async function handler(credentials: RelayerParams) {
  const provider = new DefenderRelayProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider);

  const needsTopUp = await getNeedsTopUp(provider);
  if (needsTopUp) {
    const topupAmount = await getTopupAmount(provider);
    const withdrawCalldata = generateWithdrawCalldata(topupAmount);

    const roles = new ethers.Contract(ROLES, ROLES_ABI, signer);
    const tx = await roles.execTransactionWithRole(
      AAVE,
      0,
      withdrawCalldata,
      CALL_OPERATION,
      ROLE_KEY,
      true,
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
