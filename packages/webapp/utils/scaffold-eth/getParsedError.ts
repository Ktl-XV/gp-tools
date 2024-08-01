import { BaseError, ContractFunctionRevertedError } from "viem";

/**
 * Parses an viem/wagmi error to get a displayable string
 * @param e - error object
 * @returns parsed error string
 */
export const getParsedError = (err: any): string => {
  let message = "An unknown error occurred";
  if (err instanceof BaseError) {
    const revertError = err.walk(err => err instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName ?? "";
      if (errorName !== "") {
        message = errorName;
      }
    }
  } else if (err.message) {
    message = err.message;
  } else if (err.name) {
    message = err.name;
  }

  return message;
};
