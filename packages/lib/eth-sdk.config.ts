import { defineConfig } from "@dethcrypto/eth-sdk";

import { EURe, aEURe, AAVE } from "./index";

export default defineConfig({
  contracts: {
    gnosis: {
      eure: EURe,
      aeure: aEURe,
      aave: AAVE,
    },
  },
});
