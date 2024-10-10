export function isEqual(lhs: any, rhs: any): boolean {
  return JSON.stringify(lhs) === JSON.stringify(rhs);
}
