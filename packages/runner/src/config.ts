require("dotenv").config({ path: "../../.env" });

// dotenv-webpack does not support destructuring
export const GP_SAFE = process.env.GP_SAFE;
export const DELAY = process.env.DELAY;
export const ROLES = process.env.ROLES;
export const TOPUP_TRIGGER = process.env.TOPUP_TRIGGER;
export const TOPUP_TO = process.env.TOPUP_TO;
export const RPC = process.env.RPC;
export const PRIVATE_KEY = process.env.PRIVATE_KEY;
