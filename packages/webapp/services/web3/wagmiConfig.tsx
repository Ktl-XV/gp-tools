import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { gnosis, mainnet } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Gnosis Pay Tools",
  projectId: "YOUR_PROJECT_ID",
  chains: [mainnet, gnosis],
  transports: {
    [mainnet.id]: http("https://eth.llamarpc.com"),
    [gnosis.id]: http("https://1rpc.io/gnosis"),
  },
});
