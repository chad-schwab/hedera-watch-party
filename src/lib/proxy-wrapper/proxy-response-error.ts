import { LambdaProxyErrorResult } from "./types";

export class ProxyResponseError extends Error {
  readonly result: LambdaProxyErrorResult;

  constructor(result: LambdaProxyErrorResult, msg?: string) {
    super(msg ?? result.error);
    this.result = result;
  }
}
