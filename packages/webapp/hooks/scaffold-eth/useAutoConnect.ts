import { useEffectOnce, useLocalStorage, useReadLocalStorage } from "usehooks-ts";
import { Chain } from "viem/chains";
import { Connector, useAccountEffect, useConnect, useConnectors } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { getTargetNetworks } from "~~/utils/scaffold-eth";

const SCAFFOLD_WALLET_STORAGE_KEY = "scaffoldEth2.wallet";
const WAGMI_WALLET_STORAGE_KEY = "wagmi.wallet";

/**
 * This function will get the initial wallet connector (if any), the app will connect to
 * @param initialNetwork
 * @param previousWalletId
 * @param connectors
 * @returns
 */
const getInitialConnector = (
  initialNetwork: Chain,
  previousWalletId: string,
  connectors: Connector[],
): { connector: Connector | undefined; chainId?: number } | undefined => {
  if (!previousWalletId) {
    // The user was not connected to a wallet
    // the user was connected to wallet
    if (scaffoldConfig.walletAutoConnect) {
      const connector = connectors.find(f => f.id === previousWalletId);
      return { connector };
    }
  }

  return undefined;
};

/**
 * Automatically connect to a wallet/connector based on config and prior wallet
 */
export const useAutoConnect = (): void => {
  const wagmiWalletValue = useReadLocalStorage<string>(WAGMI_WALLET_STORAGE_KEY);
  const [walletId, setWalletId] = useLocalStorage<string>(SCAFFOLD_WALLET_STORAGE_KEY, wagmiWalletValue ?? "", {
    initializeWithValue: false,
  });
  const connectState = useConnect();
  const connectors = useConnectors();

  useAccountEffect({
    onConnect({ connector }) {
      setWalletId(connector?.id ?? "");
    },
    onDisconnect() {
      //window.localStorage.setItem(WAGMI_WALLET_STORAGE_KEY, JSON.stringify(""));
      setWalletId("");
    },
  });

  useEffectOnce(() => {
    const initialConnector = getInitialConnector(getTargetNetworks()[0], walletId, connectors as Connector[]);

    if (initialConnector?.connector) {
      connectState.connect({ connector: initialConnector.connector, chainId: initialConnector.chainId });
    }
  });
};
