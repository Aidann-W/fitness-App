// The "In the Clouds" touch on the stats: every pound lifted counts as a foot
// climbed, and the total lands in a real cloud layer. Heights are rough
// meteorological bands.
export const CLOUD_LAYERS = [
  { name: 'stratus', from: 0 },
  { name: 'altocumulus', from: 6_500 },
  { name: 'cirrus', from: 20_000 },
  { name: 'above the clouds', from: 40_000 },
] as const;

export function cloudLayer(feet: number) {
  const index = CLOUD_LAYERS.findLastIndex((layer) => feet >= layer.from);
  const current = CLOUD_LAYERS[index];
  const next = CLOUD_LAYERS[index + 1] ?? null;
  return {
    name: current.name,
    next,
    // How far through the current band, 0 to 1. Full once above the last layer.
    progress: next ? (feet - current.from) / (next.from - current.from) : 1,
  };
}
