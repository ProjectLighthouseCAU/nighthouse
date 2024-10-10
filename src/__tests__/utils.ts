export function isEqual(lhs: any, rhs: any): boolean {
  return JSON.stringify(lhs) === JSON.stringify(rhs);
}

export async function collectAsyncIterable<T>(iterable: AsyncIterable<T>, maxElements?: number): Promise<T[]> {
  const elements: T[] = [];
  for await (const element of iterable) {
    elements.push(element);
    if (maxElements !== undefined && elements.length >= maxElements) {
      break;
    }
  }
  return elements;
}
