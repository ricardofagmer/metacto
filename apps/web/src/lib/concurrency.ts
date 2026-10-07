type MapWithConcurrencyOptions<Item, Result> = {
  items: readonly Item[];
  limit: number;
  mapper: (item: Item) => Promise<Result>;
};

// Runs the mapper over every item with at most `limit` calls in flight, preserving input order.
export async function mapWithConcurrency<Item, Result>(options: MapWithConcurrencyOptions<Item, Result>): Promise<Result[]> {
  const { items, limit, mapper } = options;
  const results = new Array<Result>(items.length);
  // One shared iterator: each worker pulls the next unclaimed entry, so no item is mapped twice.
  const pending = items.entries();
  async function worker(): Promise<void> {
    for (const [index, item] of pending) {
      results[index] = await mapper(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
