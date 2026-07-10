import type { PivotTouch } from './types.js';

export interface PivotCluster {
  price: number;
  touches: PivotTouch[];
}

/** Step 2 — clustering. Sequential/greedy 1D clustering: walk pivots sorted by
 * price, and merge a pivot into the current cluster if it's within `tolPct` of
 * that cluster's running mean; otherwise start a new cluster. Simple, deterministic,
 * and good enough for how tight cluster_tol (0.4%) is expected to be. */
export function clusterPivots(pivots: PivotTouch[], tolPct: number): PivotCluster[] {
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const clusters: PivotCluster[] = [];

  for (const pivot of sorted) {
    const current = clusters[clusters.length - 1];
    if (current) {
      const mean = current.price;
      if (Math.abs(pivot.price - mean) / mean <= tolPct) {
        current.touches.push(pivot);
        current.price = current.touches.reduce((sum, t) => sum + t.price, 0) / current.touches.length;
        continue;
      }
    }
    clusters.push({ price: pivot.price, touches: [pivot] });
  }

  return clusters;
}
