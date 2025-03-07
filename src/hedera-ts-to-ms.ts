export function hederaTsToMilliseconds(t: string) {
  return parseInt(`${t.slice(0, 10)}${t.slice(11, 14)}`, 10);
}
