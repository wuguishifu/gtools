import { commonSubsequence } from './common-subsequence';
import { Difference } from './compare-store';

export function splitLines(text: string) {
  const lines = text.split(/\r?\n/);

  // A trailing newline ends the last line rather than starting another.
  if (lines.at(-1) === '') lines.pop();

  return lines;
}

function removed(lines: string[], index: number): Difference {
  return { kind: 'removed', location: String(index + 1), value: lines[index] };
}

function added(lines: string[], index: number): Difference {
  return { kind: 'added', location: String(index + 1), value: lines[index] };
}

/** A line-by-line diff that keeps lines in order, like `diff`. */
function compareOrdered(left: string[], right: string[]) {
  const differences: Difference[] = [];
  let i = 0;
  let j = 0;

  for (const [matchedLeft, matchedRight] of [
    ...commonSubsequence(left, right),
    [left.length, right.length],
  ]) {
    for (; i < matchedLeft; i++) differences.push(removed(left, i));
    for (; j < matchedRight; j++) differences.push(added(right, j));
    i++;
    j++;
  }

  return differences;
}

/**
 * Pairs each line with the first unused identical line on the other side,
 * wherever it is. Every line pairs at most once, so a line repeated more often
 * on one side leaves the extras unmatched.
 */
function compareUnordered(left: string[], right: string[]) {
  // Indices of each line on the right, last first, so the earliest unused
  // occurrence pops off the end.
  const unmatched = new Map<string, number[]>();

  for (let index = right.length - 1; index >= 0; index--) {
    const indices = unmatched.get(right[index]);
    if (indices) indices.push(index);
    else unmatched.set(right[index], [index]);
  }

  const differences: Difference[] = [];
  const matchedRight = new Set<number>();

  left.forEach((line, index) => {
    const match = unmatched.get(line)?.pop();

    if (match === undefined) differences.push(removed(left, index));
    else matchedRight.add(match);
  });

  right.forEach((_, index) => {
    if (!matchedRight.has(index)) differences.push(added(right, index));
  });

  return differences;
}

export function compareLines(
  left: string,
  right: string,
  orderInsensitive: boolean,
) {
  const compare = orderInsensitive ? compareUnordered : compareOrdered;
  return compare(splitLines(left), splitLines(right));
}
