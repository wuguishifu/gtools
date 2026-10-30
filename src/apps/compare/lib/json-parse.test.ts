import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isJsonObject, parseJson, stringifyJson } from './json-parse';

describe('parseJson', () => {
  it('parses primitives', () => {
    assert.equal(parseJson('null'), null);
    assert.equal(parseJson('true'), true);
    assert.equal(parseJson('false'), false);
    assert.equal(parseJson('-12.5e2'), -1250);
    assert.equal(parseJson('"hi"'), 'hi');
  });

  it('keeps keys in the order they were written', () => {
    const value = parseJson('{"b": 1, "1": 2, "a": 3, "0": 4}');

    assert.ok(isJsonObject(value));
    assert.deepEqual([...value.keys()], ['b', '1', 'a', '0']);
  });

  it('parses nested objects and arrays', () => {
    const value = parseJson(' { "list" : [ 1 , { "x" : [ ] } , { } ] } ');

    assert.deepEqual(
      value,
      new Map([['list', [1, new Map([['x', []]]), new Map()]]]),
    );
  });

  it('decodes escapes in strings and keys', () => {
    const value = parseJson('{"say \\"hi\\"": "tab\\there \\u00e9 \\\\"}');

    assert.deepEqual(value, new Map([['say "hi"', 'tab\there é \\']]));
  });

  it('keeps keys that would collide with object internals', () => {
    const value = parseJson('{"__proto__": 1, "constructor": 2}');

    assert.ok(isJsonObject(value));
    assert.deepEqual(
      [...value],
      [
        ['__proto__', 1],
        ['constructor', 2],
      ],
    );
  });

  it('rejects malformed JSON', () => {
    assert.throws(() => parseJson('{"a": 1,}'), SyntaxError);
    assert.throws(() => parseJson(''), SyntaxError);
  });
});

describe('stringifyJson', () => {
  it('writes compact JSON in the original key order', () => {
    const text = '{"b":1,"1":[true,null,"x"],"a":{}}';

    assert.equal(stringifyJson(parseJson(text)), text);
  });
});
