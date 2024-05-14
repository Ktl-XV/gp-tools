import { DELAY_ABI, EURe_DECIMALS, SAFE_ABI } from "@gp-aave/lib";
import { createPublicClient, http, parseUnits } from "viem";
import { gnosis } from "viem/chains";
import { setUpRolesMod } from "zodiac-roles-sdk";

const client = createPublicClient({
  chain: gnosis,
  transport: http(),
});

export async function findDelayModule(safeAddress: `0x${string}`): Promise<`0x${string}`> {
  const safeModules = (
    (await client.readContract({
      address: safeAddress,
      abi: SAFE_ABI,
      functionName: "getModulesPaginated",
      args: ["0x0000000000000000000000000000000000000001", 5],
    })) as string[]
  )[0];

  let newDelayAddress = null;

  for (const safeModule of safeModules) {
    try {
      await client.readContract({
        address: safeModule as `0x${string}`,
        abi: DELAY_ABI,
        functionName: "queueNonce",
      });
      newDelayAddress = safeModule;
    } catch {
      console.debug(`Not delay module: ${safeModule}`);
    }
  }

  if (newDelayAddress === null) {
    throw Error("Delay not found");
  }

  return newDelayAddress as `0x${string}`;
}

export function findRolesModuleAddress(safeAddress: `0x${string}`, delayAddress: `0x${string}`) {
  const setupCalls = setUpRolesMod({
    avatar: safeAddress,
    target: delayAddress,
    roles: [],
  });

  return setupCalls[1].to as `0x{string}`;
}
export async function isContract(address: `0x{string}`): Promise<boolean> {
  const bytecode = await client.getBytecode({
    address: address,
  });
  return bytecode !== undefined;
}

export type SafeProperties = {
  delayAddress: `0x${string}`;
  rolesModuleAddress: `0x${string}`;
  isRolesModuleDeployed: boolean;
  isConnectedOwner: boolean | null;
};
export async function checkIsConectedOwner(testAddress: `0x${string}`, delayAddress: `0x${string}`): Promise<boolean> {
  return (await client.readContract({
    address: delayAddress,
    abi: DELAY_ABI,
    functionName: "isModuleEnabled",
    args: [testAddress],
  })) as boolean;
}

export async function findSafeProperties(
  safeAddress: `0x${string}`,
  connectedAddress: `0x${string}` | undefined,
): Promise<SafeProperties> {
  const delayAddress = await findDelayModule(safeAddress);
  const rolesModuleAddress = findRolesModuleAddress(safeAddress, delayAddress);
  const isRolesModuleDeployed = await isContract(rolesModuleAddress);
  const isConnectedOwner =
    connectedAddress === undefined ? null : await checkIsConectedOwner(connectedAddress, delayAddress);

  return {
    delayAddress,
    rolesModuleAddress,
    isRolesModuleDeployed,
    isConnectedOwner,
  };
}

export function parseEURe(uiAmount: string): string {
  return "0x" + parseUnits(uiAmount, EURe_DECIMALS).toString(16);
}

export function formatAddresses(inputAddresses: (string | undefined)[]): `0x${string}`[] {
  return inputAddresses.map(address => {
    if (address !== undefined && address.slice(0, 2) === "0x" && address.length === 42) {
      return address as `0x${string}`;
    }
    throw Error(`Invalid Address: {address}`);
  });
}
