import ERC20_ABI from "./abis/gnosis/eure.json";
import SAFE_ABI from "./abis/gnosis/safe.json";
import AAVE_ABI from "./abis/gnosis/aave.json";
import ROLES_ABI from "./abis/gnosis/roles.json";
import DELAY_ABI from "./abis/gnosis/delay.json";

export { ROLES_ABI, AAVE_ABI, DELAY_ABI, ERC20_ABI, SAFE_ABI };

export const CALL_OPERATION = 0; // DelegateCall: 1

export const EURe = "0xcb444e90d8198415266c6a2724b7900fb12fc56e";
export const EURe_DECIMALS = 18;
export const aEURe = "0xedbc7449a9b594ca4e053d9737ec5dc4cbccbfb2";
export const aEURe_DECIMALS = 18;
export const AAVE = "0xb50201558b00496a145fe76f7424749556e326d8";
export const ROLE_KEY =
  "0x57697468647261774555526546726f6d41415645000000000000000000000000";
