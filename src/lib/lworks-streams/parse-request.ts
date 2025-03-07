import { APIGatewayProxyEventHeaders } from "aws-lambda/trigger/api-gateway-proxy";
import invariant from "tiny-invariant";

import { LambdaEvent } from "../proxy-wrapper/types";
import { createLogger } from "../logger";

import {
  SentinelRequest,
  SentinelPayload,
  SentinelRequestParser,
  SentinelRequestParserOptions,
  BatchedSentinelRequest,
  BatchedSentinelPayload,
} from "./types";

const externalIdHeader = "external-id";

const snakeToCamel = (str: string) =>
  str
    .toLowerCase()
    .replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace("-", "").replace("_", ""));

const logger = createLogger("parse-sentinel-request");

export function parseHeaderOptions<Options = Record<string, string>>(
  headers: APIGatewayProxyEventHeaders,
  headerPrefixes: Array<string>
) {
  return headerPrefixes.reduce(
    (agg, headerPrefix) => ({
      ...agg,
      ...Object.entries(headers)
        .filter(([k, v]) => k.startsWith(headerPrefix) && v !== undefined)
        .reduce(
          (agg1, [k, v]) => ({ ...agg1, [snakeToCamel(k.slice(headerPrefix.length))]: v }),
          {} as Options
        ),
    }),
    {} as Options
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isBatchedSentinelPayload<C>(payload: any): payload is BatchedSentinelPayload<C> {
  return payload.items !== undefined;
}

export function buildBatchRequestParser<Content, Options = Record<string, string>>({
  headerPrefixes = ["lw-"],
  parser = JSON.parse,
}: SentinelRequestParserOptions = {}): SentinelRequestParser<
  Content,
  Options,
  BatchedSentinelRequest<Content, Options>
> {
  return (event: LambdaEvent) => {
    logger.trace({ event }, "The pre-parsed event");
    const { body, headers } = event;
    invariant(body, "body cannot be null");

    const payload: SentinelPayload<Content> | BatchedSentinelPayload<Content> = parser(body);
    const items = isBatchedSentinelPayload(payload) ? payload.items : [payload];

    const { authorizer = {} } = event.requestContext;
    const callerIdentity: Record<string, string> = {
      ruleId: items[0].metadata.rule.id,
      ...authorizer,
    };
    if (headers[externalIdHeader]) {
      callerIdentity.externalId = headers[externalIdHeader];
    }

    const options = parseHeaderOptions<Options>(headers, headerPrefixes);

    return {
      callerIdentity,
      options,
      items,
    };
  };
}

export function parseBatchRequest<Content, Options = Record<string, string>>(
  event: LambdaEvent
): BatchedSentinelRequest<Content, Options> {
  return buildBatchRequestParser<Content, Options>()(event);
}

export function buildRequestParser<Content, Options = Record<string, string>>({
  headerPrefixes = ["lw-"],
  parser = JSON.parse,
}: SentinelRequestParserOptions = {}): SentinelRequestParser<Content, Options> {
  return (event: LambdaEvent) => {
    logger.trace({ event }, "The pre-parsed event");
    const { body, headers } = event;
    invariant(body, "body cannot be null");

    const { content, metadata }: SentinelPayload<Content> = parser(body);

    const { authorizer = {} } = event.requestContext;
    const callerIdentity: Record<string, string> = {
      ruleId: metadata.rule.id,
      ...authorizer,
    };
    if (headers[externalIdHeader]) {
      callerIdentity.externalId = headers[externalIdHeader];
    }

    const options = parseHeaderOptions<Options>(headers, headerPrefixes);

    return {
      callerIdentity,
      options,
      content,
      metadata,
    };
  };
}

export function parseRequest<Content, Options = Record<string, string>>(
  event: LambdaEvent
): SentinelRequest<Content, Options> {
  return buildRequestParser<Content, Options>()(event);
}
