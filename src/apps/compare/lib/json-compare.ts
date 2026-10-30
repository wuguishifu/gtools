import { commonSubsequence } from './common-subsequence';
import { Difference } from './compare-store';
import {
  JsonObject,
  JsonValue,
  isJsonObject,
  stringifyJson,
} from './json-parse';

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function keyPath(path: string, key: string) {
  if (!IDENTIFIER.test(key)) return `${path}[${JSON.stringify(key)}]`;
  return path ? `${path}.${key}` : key;
}

function displayPath(path: string) {
  return path || '(root)';
}

/**
 * Lists how two parsed JSON documents differ, by key path. Arrays are always
 * compared index by index. Object keys are matched by name; unless order is
 * ignored, keys that appear in a different order relative to the others are
 * also reported as moved.
 */
export function compareJson(
  left: JsonValue,
  right: JsonValue,
  orderInsensitive: boolean,
) {
  const differences: Difference[] = [];

  function compareObjects(left: JsonObject, right: JsonObject, path: string) {
    const leftKeys = [...left.keys()];
    const rightKeys = [...right.keys()];

    // Keys outside a longest run kept in the same relative order are the ones
    // that moved; picking the longest run keeps that set as small as possible.
    const inOrder = new Set(
      orderInsensitive
        ? leftKeys
        : commonSubsequence(leftKeys, rightKeys).map(([i]) => leftKeys[i]),
    );

    leftKeys.forEach((key, index) => {
      const child = keyPath(path, key);

      if (!right.has(key)) {
        differences.push({
          kind: 'removed',
          location: displayPath(child),
          value: stringifyJson(left.get(key)!),
        });
        return;
      }

      if (!inOrder.has(key)) {
        differences.push({
          kind: 'moved',
          location: displayPath(child),
          from: index + 1,
          to: rightKeys.indexOf(key) + 1,
        });
      }

      compareValues(left.get(key)!, right.get(key)!, child);
    });

    for (const key of rightKeys) {
      if (left.has(key)) continue;

      differences.push({
        kind: 'added',
        location: displayPath(keyPath(path, key)),
        value: stringifyJson(right.get(key)!),
      });
    }
  }

  function compareArrays(left: JsonValue[], right: JsonValue[], path: string) {
    const shared = Math.min(left.length, right.length);

    for (let index = 0; index < shared; index++) {
      compareValues(left[index], right[index], `${path}[${index}]`);
    }

    for (let index = shared; index < left.length; index++) {
      differences.push({
        kind: 'removed',
        location: `${path}[${index}]`,
        value: stringifyJson(left[index]),
      });
    }

    for (let index = shared; index < right.length; index++) {
      differences.push({
        kind: 'added',
        location: `${path}[${index}]`,
        value: stringifyJson(right[index]),
      });
    }
  }

  function compareValues(left: JsonValue, right: JsonValue, path: string) {
    if (isJsonObject(left) && isJsonObject(right)) {
      return compareObjects(left, right, path);
    }

    if (Array.isArray(left) && Array.isArray(right)) {
      return compareArrays(left, right, path);
    }

    // Anything else is a primitive on at least one side, so equal values are
    // identical.
    if (left !== right) {
      differences.push({
        kind: 'changed',
        location: displayPath(path),
        left: stringifyJson(left),
        right: stringifyJson(right),
      });
    }
  }

  compareValues(left, right, '');

  return differences;
}
