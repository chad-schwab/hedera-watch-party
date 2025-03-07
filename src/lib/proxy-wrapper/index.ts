import { lambdaRequestTracker } from "pino-lambda";

import { createStopwatch } from "../stopwatch";
import { setLambdaContext } from "../lambda-global";
import { createLogger } from "../logger";

import {
  LambdaEvent,
  LambdaContext,
  LambdaProxyResult,
  BaseRequest,
  LambdaResponse,
} from "./types";
import { createProxyResponse } from "./create-proxy-response";
import { ProxyResponseError } from "./proxy-response-error";

const logger = createLogger("proxyWrapper");

function getAdditionalContext(event: LambdaEvent, context: LambdaContext) {
  const additionalContext: Record<string, string | number | undefined> = {
    retryBalance: event.headers?.["lwsentinel-retry-balance"],
    ruleId: event.headers?.["lwsentinel-rule-id"],
    functionName: context.functionName,
  };

  if (typeof additionalContext.sentinelRetryBalance === "string") {
    additionalContext.sentinelRetryBalance = parseInt(additionalContext.sentinelRetryBalance, 10);
  }
  return additionalContext;
}

export type ProxyWrapperOptions<T> = Partial<{
  mapData: (data: unknown, links?: Record<string, string | null>) => T;
  cleanup: () => Promise<void> | void;
}>;

export function proxyWrapper<T, U extends BaseRequest>(
  parseRequest: (event: LambdaEvent, context: LambdaContext) => U,
  fn: (event: U, context: LambdaContext) => Promise<LambdaProxyResult<T>>,
  options: ProxyWrapperOptions<T> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (event: LambdaEvent, context: LambdaContext) => Promise<any> {
  return async (event: LambdaEvent, context: LambdaContext) => {
    setLambdaContext(context);
    const additionalContext = getAdditionalContext(event, context);

    const stopwatch = createStopwatch();
    let response: LambdaResponse;

    const timeoutId = setTimeout(() => {
      logger.warn(
        {
          remainingTimeInMillis: context.getRemainingTimeInMillis(),
          elapsedTimeInMillis: stopwatch.elapsedMilliseconds,
        },
        "Execution near timeout"
      );
    }, context.getRemainingTimeInMillis() - 500);
    try {
      logger.trace({ event, context });
      const request = parseRequest(event, context);
      lambdaRequestTracker({
        requestMixin: () => ({
          ...request.callerIdentity,
          awsRequestId: context.awsRequestId,
          ...additionalContext,
        }),
      })(event, context);

      logger.trace({ request });

      const result = await fn(request, context);

      response = createProxyResponse(result, options.mapData);
    } catch (err: unknown) {
      if (err instanceof ProxyResponseError) {
        response = createProxyResponse(err.result);
      } else {
        logger.error(err, "Unknown error occurred.");
        response = createProxyResponse({
          statusCode: 500,
          error: "Unknown error occurred",
          kind: "error",
        });
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    logger.debug("running optional cleanup");
    try {
      await Promise.all([...(options.cleanup ? [options.cleanup] : [])]);
    } catch (e) {
      logger.error(e, "Failed cleaning up resources");
    }

    logger.debug(
      {
        remainingTimeInMillis: context.getRemainingTimeInMillis(),
        elapsedTimeInMillis: stopwatch.elapsedMilliseconds,
        statusCode: response.statusCode,
      },
      "Execution finished"
    );
    return response;
  };
}

/**
 * An identity function that can be used when you don't want
 * any transformation of the data object being proxied by the lambda proxy.
 * This is useful when you need to bypass the standard "status/data" response wrapper
 * @param data The data to forward onward
 * @returns The same data provided as input
 */
export function forwardData<T>(data: T): T {
  return data;
}
