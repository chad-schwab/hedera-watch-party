import { LambdaResponse, LambdaProxyResult } from "./types";

export function createProxyResponse<T = unknown>(
  result: LambdaProxyResult<T>,
  map?: (data: T | undefined, links?: Record<string, string | null>) => T
): LambdaResponse {
  let body: unknown;

  if (result.kind === "error") {
    body = { status: "error", error: result.error };
  } else if (map) {
    body = map(result.data, result.links);
  } else {
    body = { status: "success", data: result.data, links: result.links };
  }

  return {
    headers: {
      "Content-Type": "application/json",
      ...result.headers,
    },
    statusCode: result.statusCode,
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}
