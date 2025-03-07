import { differenceInMilliseconds } from "date-fns";

export function createStopwatch() {
  const startTime = new Date();
  return {
    /**
     * Get the elapsed time in milliseconds
     */
    get elapsedMilliseconds(): number {
      return differenceInMilliseconds(new Date(), startTime);
    },

    startTime,
  };
}
