import { AAVE, DELAY_ABI, ROLES_ABI } from "@gp-aave/lib";
import { ethers, JsonRpcProvider, Wallet } from "ethers";

import {
  CALL_OPERATION,
  generateWithdrawCalldata,
  getNeedsTopUp,
  getTopupAmount,
  ROLE_KEY,
} from "./common";

import { DELAY, PRIVATE_KEY, ROLES, RPC } from "./config";

(async () => {
  const provider = new JsonRpcProvider(RPC);
  const signer = new Wallet(PRIVATE_KEY, provider);

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
})();
