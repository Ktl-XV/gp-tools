import { ethers, JsonRpcProvider, Wallet } from "ethers";

import { AAVE, ROLES_ABI } from "@gp-aave/lib";

import {
  CALL_OPERATION,
  generateWithdrawCalldata,
  getNeedsTopUp,
  getTopupAmount,
  ROLE_KEY,
} from "./common";

import { PRIVATE_KEY, ROLES, RPC } from "./config";

(async () => {
  const provider = new JsonRpcProvider(RPC);
  const signer = new Wallet(PRIVATE_KEY, provider);

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
})();
