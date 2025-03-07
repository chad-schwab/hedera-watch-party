import { Response } from "node-fetch";

import { LambdaProxyResult } from "./lib/proxy-wrapper/types";

export type StandardResponse = LambdaProxyResult<{ message: string }>;

export const EmptyResponse: StandardResponse = {
  statusCode: 200,
  data: { message: "Nothing to do" },
  kind: "data",
};

export function successResponse(statusCode = 200, message = "Success"): StandardResponse {
  return {
    statusCode,
    data: { message },
    kind: "data",
  };
}

export async function mapResponse(response: Response): Promise<StandardResponse> {
  if (!response.ok) {
    return {
      statusCode: response.status,
      kind: "error",
      error: `${response.status}: ${await response.text()}`,
    };
  }

  return successResponse(response.status, response.statusText);
}
