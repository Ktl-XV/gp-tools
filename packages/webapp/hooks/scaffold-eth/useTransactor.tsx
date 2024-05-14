import { waitForTransactionReceipt } from "@wagmi/core";
import { TransactionReceipt, WalletClient } from "viem";
import { useWalletClient } from "wagmi";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { getBlockExplorerTxLink, getParsedError, notification } from "~~/utils/scaffold-eth";

type TransactionFunc = (
  tx: Promise<`0x${string}`>,
  options?: {
    onBlockConfirmation?: (txnReceipt: TransactionReceipt) => void;
    blockConfirmations?: number;
  },
) => Promise<`0x${string}` | undefined>;

/**
 * Custom notification content for TXs.
 */
const TxnNotification = ({ message, blockExplorerLink }: { message: string; blockExplorerLink?: string }) => {
  return (
    <div className={`flex flex-col ml-1 cursor-default`}>
      <p className="my-0">{message}</p>
      {blockExplorerLink && blockExplorerLink.length > 0 ? (
        <a href={blockExplorerLink} target="_blank" rel="noreferrer" className="block link text-md">
          check out transaction
        </a>
      ) : null}
    </div>
  );
};

/**
 * Runs Transaction passed in to returned function showing UI feedback.
 * @param _walletClient - Optional wallet client to use. If not provided, will use the one from useWalletClient.
 * @returns function that takes in transaction function as callback, shows UI feedback for transaction and returns a promise of the transaction hash
 */
export const useTransactor = (_walletClient?: WalletClient): TransactionFunc => {
  let walletClient = _walletClient;
  const { data } = useWalletClient();
  if (walletClient === undefined && data) {
    walletClient = data;
  }

  const result: TransactionFunc = async (tx, options) => {
    if (!walletClient) {
      notification.error("Cannot access account");
      console.error("⚡️ ~ file: useTransactor.tsx ~ error");
      return;
    }

    let notificationId = null;
    let transactionHash: Awaited<`0x${string}`> | undefined = undefined;
    try {
      notificationId = notification.loading(<TxnNotification message="Awaiting for user confirmation" />);
      const transactionHash = await tx;
      notification.remove(notificationId);

      const blockExplorerTxURL = `https://gnosisscan.io/tx/${transactionHash}`;

      notificationId = notification.loading(
        <TxnNotification message="Waiting for transaction to complete." blockExplorerLink={blockExplorerTxURL} />,
      );

      const transactionReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: transactionHash,
        confirmations: options?.blockConfirmations,
      });
      notification.remove(notificationId);

      notification.success(
        <TxnNotification message="Transaction completed successfully!" blockExplorerLink={blockExplorerTxURL} />,
        {
          icon: "🎉",
        },
      );

      if (options?.onBlockConfirmation) options.onBlockConfirmation(transactionReceipt);
    } catch (error: any) {
      if (notificationId) {
        notification.remove(notificationId);
      }
      console.error("⚡️ ~ file: useTransactor.ts ~ error", error);
      const message = getParsedError(error);
      notification.error(message);
      throw error;
    }

    return transactionHash;
  };

  return result;
};
