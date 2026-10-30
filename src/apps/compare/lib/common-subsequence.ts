/**
 * Index pairs `[i, j]` where `a[i] === b[j]`, forming a common subsequence of
 * the two sequences. Pairs are in ascending order on both sides.
 *
 * Uses Myers' O(ND) algorithm in its linear-space form, bisecting each range at
 * the middle of an optimal edit path, so large, very different inputs don't
 * need memory proportional to the number of edits squared. The subsequence is
 * the longest one unless the inputs are heavily reordered; see MAX_COST.
 */
export function commonSubsequence<T>(a: T[], b: T[]): [number, number][] {
  // Elements that only one side has can never pair up. Dropping them first
  // doesn't change the result, and spares Myers' O(ND) time on inputs that
  // are mostly different.
  const inA = new Set(a);
  const inB = new Set(b);
  const aIndices = a.flatMap((element, index) =>
    inB.has(element) ? index : [],
  );
  const bIndices = b.flatMap((element, index) =>
    inA.has(element) ? index : [],
  );

  return myers(
    aIndices.map((index) => a[index]),
    bIndices.map((index) => b[index]),
  ).map(([i, j]) => [aIndices[i], bIndices[j]]);
}

/**
 * Edit distance from either end at which a bisection stops looking for the
 * exact middle and splits at the furthest point it has reached instead, as
 * GNU diff and git do. Without it, inputs that share most elements in a
 * shuffled order take minutes; with it the result can be a little longer than
 * the minimal diff, but only once there are thousands of edits.
 */
const MAX_COST = 1024;

function myers<T>(a: T[], b: T[]): [number, number][] {
  const pairs: [number, number][] = [];

  function match(aLo: number, aHi: number, bLo: number, bHi: number) {
    while (aLo < aHi && bLo < bHi && a[aLo] === b[bLo]) {
      pairs.push([aLo++, bLo++]);
    }

    let suffix = 0;
    while (
      aLo < aHi - suffix &&
      bLo < bHi - suffix &&
      a[aHi - suffix - 1] === b[bHi - suffix - 1]
    ) {
      suffix++;
    }

    // With the common ends trimmed and both ranges non-empty, at least two
    // edits remain, so the split always leaves two smaller problems: each
    // needs fewer edits, or covers fewer elements after a cut-off split.
    if (aLo < aHi - suffix && bLo < bHi - suffix) {
      const split = bisect(aLo, aHi - suffix, bLo, bHi - suffix);

      if (split) {
        match(aLo, split[0], bLo, split[1]);
        match(split[0], aHi - suffix, split[1], bHi - suffix);
      }
    }

    for (let offset = suffix; offset > 0; offset--) {
      pairs.push([aHi - offset, bHi - offset]);
    }
  }

  /**
   * Walks forward from the start and backward from the end until the two
   * searches overlap, returning the point where they meet, or nothing when the
   * ranges share no elements at all. Past MAX_COST it returns the furthest
   * point the forward search has reached.
   */
  function bisect(
    aLo: number,
    aHi: number,
    bLo: number,
    bHi: number,
  ): [number, number] | undefined {
    const n = aHi - aLo;
    const m = bHi - bLo;
    const maxD = Math.min(Math.ceil((n + m) / 2), MAX_COST + 1);
    const offset = maxD;
    const size = 2 * maxD + 2;
    const delta = n - m;
    const front = delta % 2 !== 0;

    // Furthest x reached on each diagonal, forward and from the end.
    const forward = new Int32Array(size).fill(-1);
    const backward = new Int32Array(size).fill(-1);
    forward[offset + 1] = 0;
    backward[offset + 1] = 0;

    // Diagonals that have run off the edge of the grid stop being searched.
    let k1Start = 0;
    let k1End = 0;
    let k2Start = 0;
    let k2End = 0;

    for (let d = 0; d < maxD; d++) {
      let furthest: [number, number] | undefined;

      for (let k1 = -d + k1Start; k1 <= d - k1End; k1 += 2) {
        const k1Offset = offset + k1;
        let x1 =
          k1 === -d ||
          (k1 !== d && forward[k1Offset - 1] < forward[k1Offset + 1])
            ? forward[k1Offset + 1]
            : forward[k1Offset - 1] + 1;
        let y1 = x1 - k1;

        while (x1 < n && y1 < m && a[aLo + x1] === b[bLo + y1]) {
          x1++;
          y1++;
        }

        forward[k1Offset] = x1;

        if (x1 > n) {
          k1End += 2;
        } else if (y1 > m) {
          k1Start += 2;
        } else {
          if (
            d === MAX_COST &&
            x1 + y1 < n + m &&
            (!furthest || x1 + y1 > furthest[0] + furthest[1])
          ) {
            furthest = [x1, y1];
          }

          const k2Offset = offset + delta - k1;

          if (
            front &&
            k2Offset >= 0 &&
            k2Offset < size &&
            backward[k2Offset] !== -1 &&
            x1 >= n - backward[k2Offset]
          ) {
            return [aLo + x1, bLo + y1];
          }
        }
      }

      if (furthest) return [aLo + furthest[0], bLo + furthest[1]];

      for (let k2 = -d + k2Start; k2 <= d - k2End; k2 += 2) {
        const k2Offset = offset + k2;
        let x2 =
          k2 === -d ||
          (k2 !== d && backward[k2Offset - 1] < backward[k2Offset + 1])
            ? backward[k2Offset + 1]
            : backward[k2Offset - 1] + 1;
        let y2 = x2 - k2;

        while (x2 < n && y2 < m && a[aHi - x2 - 1] === b[bHi - y2 - 1]) {
          x2++;
          y2++;
        }

        backward[k2Offset] = x2;

        if (x2 > n) {
          k2End += 2;
        } else if (y2 > m) {
          k2Start += 2;
        } else if (!front) {
          const k1Offset = offset + delta - k2;

          if (k1Offset >= 0 && k1Offset < size && forward[k1Offset] !== -1) {
            const x1 = forward[k1Offset];
            const y1 = offset + x1 - k1Offset;

            if (x1 >= n - x2) return [aLo + x1, bLo + y1];
          }
        }
      }
    }

    return undefined;
  }

  match(0, a.length, 0, b.length);

  return pairs;
}
