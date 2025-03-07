import { LambdaContext } from "./proxy-wrapper/types";

let lambdaContext: LambdaContext;
export function setLambdaContext(context: LambdaContext) {
  lambdaContext = context;
}

export function getLambdaContext() {
  return lambdaContext;
}
