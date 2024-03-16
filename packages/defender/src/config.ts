export type EnvConfig = {
  GP_SAFE: string;
  DELAY: string;
  ROLES: string;
  RELOAD_LIMIT: string;
  API_KEY: string;
  API_SECRET: string;
};

require("dotenv").config({ path: "../../.env" });
export const { GP_SAFE, DELAY, ROLES, RELOAD_LIMIT, API_KEY, API_SECRET } =
  process.env as EnvConfig;
