// „Erre gondoltál?” javaslatok elírásokhoz (utasításnevek, változónevek).

/** Levenshtein-távolság: ennyi beszúrás, törlés vagy csere kell, hogy `a`-ból `b` legyen. */
export function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

/** A legközelebbi jelölt (kis- és nagybetűtől függetlenül), ha elég közel van ahhoz, hogy elírásnak tűnjön. */
export function closest(word: string, candidates: readonly string[], maxDistance = 2): string | null {
  let best: string | null = null;
  let bestDistance = maxDistance + 1;
  for (const candidate of candidates) {
    const distance = editDistance(word.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
