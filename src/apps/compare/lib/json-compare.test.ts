import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compareJson } from './json-compare';
import { parseJson } from './json-parse';

function compare(left: string, right: string, orderInsensitive = false) {
  return compareJson(parseJson(left), parseJson(right), orderInsensitive);
}

describe('compareJson', () => {
  it('finds nothing for identical documents', () => {
    const text = '{"a": [1, {"b": null}], "c": "d"}';

    assert.deepEqual(compare(text, text), []);
  });

  it('ignores formatting and equivalent numbers', () => {
    assert.deepEqual(compare('{"a":1.0}', '{\n  "a": 1\n}'), []);
  });

  it('reports changed, removed and added keys by path', () => {
    assert.deepEqual(
      compare(
        '{"user": {"name": "bob", "age": 30}}',
        '{"user": {"name": "rob", "email": "r@x.io"}}',
      ),
      [
        {
          kind: 'changed',
          location: 'user.name',
          left: '"bob"',
          right: '"rob"',
        },
        { kind: 'removed', location: 'user.age', value: '30' },
        { kind: 'added', location: 'user.email', value: '"r@x.io"' },
      ],
    );
  });

  it('reports a change of type as a change of value', () => {
    assert.deepEqual(compare('{"a": {"b": 1}}', '{"a": [1]}'), [
      { kind: 'changed', location: 'a', left: '{"b":1}', right: '[1]' },
    ]);
  });

  it('compares whole documents that are not objects', () => {
    assert.deepEqual(compare('1', '2'), [
      { kind: 'changed', location: '(root)', left: '1', right: '2' },
    ]);
  });

  it('quotes keys that are not plain identifiers', () => {
    assert.deepEqual(compare('{"a b": {"1": 1}}', '{"a b": {"1": 2}}'), [
      { kind: 'changed', location: '["a b"]["1"]', left: '1', right: '2' },
    ]);
  });

  describe('arrays', () => {
    it('compares elements by index', () => {
      assert.deepEqual(compare('{"a": [1, 2]}', '{"a": [1, 3, 4]}'), [
        { kind: 'changed', location: 'a[1]', left: '2', right: '3' },
        { kind: 'added', location: 'a[2]', value: '4' },
      ]);
    });

    it('reports elements missing from the end', () => {
      assert.deepEqual(compare('[1, 2, 3]', '[1]'), [
        { kind: 'removed', location: '[1]', value: '2' },
        { kind: 'removed', location: '[2]', value: '3' },
      ]);
    });

    it('stays order-sensitive with order-insensitive keys', () => {
      assert.deepEqual(compare('[1, 2]', '[2, 1]', true), [
        { kind: 'changed', location: '[0]', left: '1', right: '2' },
        { kind: 'changed', location: '[1]', left: '2', right: '1' },
      ]);
    });
  });

  describe('key order', () => {
    it('reports keys that moved relative to the others', () => {
      assert.deepEqual(
        compare('{"a": 1, "b": 2, "c": 3}', '{"b": 2, "c": 3, "a": 1}'),
        [{ kind: 'moved', location: 'a', from: 1, to: 3 }],
      );
    });

    it('notices reordering of integer-like keys', () => {
      assert.deepEqual(compare('{"b": 1, "1": 2}', '{"1": 2, "b": 1}'), [
        { kind: 'moved', location: 'b', from: 1, to: 2 },
      ]);
    });

    it('does not count keys shifted by an insertion as moved', () => {
      assert.deepEqual(
        compare('{"a": 1, "b": 2}', '{"x": 0, "a": 1, "b": 2}'),
        [{ kind: 'added', location: 'x', value: '0' }],
      );
    });

    it('still compares the values of moved keys', () => {
      assert.deepEqual(compare('{"a": 1, "b": 2}', '{"b": 2, "a": 5}'), [
        { kind: 'moved', location: 'a', from: 1, to: 2 },
        { kind: 'changed', location: 'a', left: '1', right: '5' },
      ]);
    });

    it('ignores key order when order-insensitive', () => {
      assert.deepEqual(
        compare(
          '{"a": 1, "nested": {"x": 1, "y": 2}}',
          '{"nested": {"y": 2, "x": 1}, "a": 1}',
          true,
        ),
        [],
      );
    });

    it('only matches keys within the same object', () => {
      assert.deepEqual(
        compare('{"a": {"k": 1}, "b": {}}', '{"a": {}, "b": {"k": 1}}', true),
        [
          { kind: 'removed', location: 'a.k', value: '1' },
          { kind: 'added', location: 'b.k', value: '1' },
        ],
      );
    });
  });
});
