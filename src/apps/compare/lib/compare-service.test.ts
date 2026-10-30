import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { compareService } from './compare-service';
import { compareStore } from './compare-store';

describe('compareService', () => {
  let root: string;

  before(async () => {
    root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gtools-compare-'));
  });

  after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  async function write(name: string, contents: string) {
    const file = path.join(root, name);
    await fs.promises.writeFile(file, contents);
    return file;
  }

  async function compare(
    left: string,
    right: string,
    orderInsensitive = false,
  ) {
    const differences = await compareService.compare(left, right, {
      orderInsensitive,
    });
    return { differences, result: compareStore.getState().result! };
  }

  it('compares two .json files by key', async () => {
    const left = await write('left.json', '{"a": 1, "b": 2}');
    const right = await write('right.json', '{"b": 2, "a": 1}');

    const ordered = await compare(left, right);
    assert.equal(ordered.result.format, 'json');
    assert.deepEqual(ordered.differences, [
      { kind: 'moved', location: 'a', from: 1, to: 2 },
    ]);

    const unordered = await compare(left, right, true);
    assert.deepEqual(unordered.differences, []);
  });

  it('recognizes the .json extension in any case', async () => {
    const left = await write('upper.JSON', '{"a": 1}');
    const right = await write('lower.json', '{\n  "a": 1\n}\n');

    const { result } = await compare(left, right);
    assert.equal(result.format, 'json');
    assert.deepEqual(result.differences, []);
  });

  it('compares lines unless both files are .json', async () => {
    const left = await write('mixed.json', '{"a": 1}\n');
    const right = await write('mixed.txt', '{"a":1}\n');

    const { result } = await compare(left, right);
    assert.equal(result.format, 'text');
    assert.deepEqual(result.differences, [
      { kind: 'removed', location: '1', value: '{"a": 1}' },
      { kind: 'added', location: '1', value: '{"a":1}' },
    ]);
  });

  it('records the files and options for the report', async () => {
    const left = await write('one.txt', 'same\n');
    const right = await write('two.txt', 'same\nsame\n');

    const { result } = await compare(left, right, true);
    assert.deepEqual(result, {
      left,
      right,
      format: 'text',
      options: { orderInsensitive: true },
      differences: [{ kind: 'added', location: '2', value: 'same' }],
    });
  });

  it('ignores a byte order mark', async () => {
    const left = await write('bom.json', '﻿{"a": 1}');
    const right = await write('plain.json', '{"a": 1}');

    assert.deepEqual((await compare(left, right)).differences, []);
  });

  it('names the file that is not valid JSON', async () => {
    const left = await write('valid.json', '{}');
    const right = await write('invalid.json', '{"a": 1,}');

    await assert.rejects(compare(left, right), (error: Error) =>
      error.message.startsWith(`${right} is not valid JSON: `),
    );
  });

  it('rejects missing files and directories', async () => {
    const file = await write('exists.txt', '');
    const missing = path.join(root, 'missing.txt');

    await assert.rejects(compare(file, missing), {
      message: `${missing} does not exist`,
    });
    await assert.rejects(compare(root, file), {
      message: `${root} is not a file`,
    });
  });
});
