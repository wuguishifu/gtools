import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { commonSubsequence } from './common-subsequence';

/** Deterministic PRNG so a failing random case reproduces on every run. */
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Textbook O(nm) LCS length, as a reference for the optimized version. */
function lcsLength<T>(a: T[], b: T[]) {
  let next = new Array<number>(b.length + 1).fill(0);

  for (let i = a.length - 1; i >= 0; i--) {
    const row = new Array<number>(b.length + 1).fill(0);

    for (let j = b.length - 1; j >= 0; j--) {
      row[j] = a[i] === b[j] ? next[j + 1] + 1 : Math.max(next[j], row[j + 1]);
    }

    next = row;
  }

  return next[0];
}

function assertValid<T>(a: T[], b: T[], pairs: [number, number][]) {
  let previous: [number, number] = [-1, -1];

  for (const [i, j] of pairs) {
    assert.ok(i > previous[0] && j > previous[1], 'pairs out of order');
    assert.equal(a[i], b[j], `a[${i}] does not equal b[${j}]`);
    previous = [i, j];
  }
}

describe('commonSubsequence', () => {
  it('handles empty inputs', () => {
    assert.deepEqual(commonSubsequence([], []), []);
    assert.deepEqual(commonSubsequence(['a'], []), []);
    assert.deepEqual(commonSubsequence([], ['a']), []);
  });

  it('pairs every element of identical inputs', () => {
    assert.deepEqual(commonSubsequence(['a', 'b', 'c'], ['a', 'b', 'c']), [
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it('finds nothing in inputs with no shared elements', () => {
    assert.deepEqual(commonSubsequence(['a', 'b'], ['c', 'd']), []);
  });

  it('skips insertions and deletions', () => {
    assert.deepEqual(
      commonSubsequence(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'd', 'b']),
      [
        [0, 0],
        [2, 2],
        [3, 3],
      ],
    );
  });

  it('finds a longest subsequence for random inputs', () => {
    const random = seededRandom(1);

    for (let iteration = 0; iteration < 5000; iteration++) {
      // Small alphabets force many repeated elements, the hard case.
      const alphabet = 1 + (iteration % 6);
      const sequence = () =>
        Array.from({ length: Math.floor(random() * 25) }, () =>
          Math.floor(random() * alphabet),
        );
      const a = sequence();
      const b = sequence();
      const pairs = commonSubsequence(a, b);

      assertValid(a, b, pairs);
      assert.equal(
        pairs.length,
        lcsLength(a, b),
        `not longest for ${JSON.stringify({ a, b })}`,
      );
    }
  });

  it('stays valid and fast once heavy reordering hits the cost cut-off', () => {
    const random = seededRandom(2);
    const a = Array.from({ length: 20000 }, (_, index) => index);
    const b = [...a].sort(() => random() - 0.5);

    const started = Date.now();
    const pairs = commonSubsequence(a, b);

    assertValid(a, b, pairs);
    assert.ok(pairs.length > 0);
    assert.ok(Date.now() - started < 5000, 'took longer than 5s');
  });
});
