import { APIGatewayEvent, Context } from "aws-lambda";

export type LambdaResponse = {
  headers: Record<string, string>;
  statusCode: number;
  body: string;
  isBase64Encoded: boolean;
};

type LambdaProxyResultBase = {
  statusCode: number;
  headers?: Record<string, string>;
};

export type LambdaProxyErrorResult = LambdaProxyResultBase & {
  error: string;
  kind: "error";
};

export type LambdaProxySuccessResult<Result> = LambdaProxyResultBase & {
  data: Result;
  links?: Record<string, string | null>;
  kind: "data";
};

export type LambdaProxyResult<Result = unknown> =
  | LambdaProxySuccessResult<Result>
  | LambdaProxyErrorResult;

export type LambdaEvent = APIGatewayEvent;
export type LambdaContext = Context;

export type CallerIdentity = Record<string, string>;

export type BaseRequest = {
  callerIdentity: CallerIdentity;
};

export type LambdaEventParser<T> = (event: LambdaEvent) => T;
