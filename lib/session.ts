let generation = 0;
let controller = new AbortController();

export const session = {
  current: () => generation,
  isCurrent: (value: number) => value === generation,
  signal: () => controller.signal,
  reset: () => {
    generation += 1;
    controller.abort();
    controller = new AbortController();
    return generation;
  },
};
