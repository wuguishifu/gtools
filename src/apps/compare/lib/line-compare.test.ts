import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compareLines, splitLines } from './line-compare';

describe('splitLines', () => {
  it('treats a trailing newline as ending the last line', () => {
    assert.deepEqual(splitLines('a\nb\n'), ['a', 'b']);
    assert.deepEqual(splitLines('a\nb'), ['a', 'b']);
  });

  it('splits Windows line endings', () => {
    assert.deepEqual(splitLines('a\r\nb\r\n'), ['a', 'b']);
  });

  it('keeps blank lines', () => {
    assert.deepEqual(splitLines('a\n\nb\n'), ['a', '', 'b']);
  });

  it('returns no lines for an empty file', () => {
    assert.deepEqual(splitLines(''), []);
  });
});

describe('compareLines', () => {
  it('finds nothing for identical text', () => {
    assert.deepEqual(compareLines('a\nb\n', 'a\nb\n', false), []);
    assert.deepEqual(compareLines('a\nb\n', 'a\nb\n', true), []);
  });

  it('ignores line ending style and a missing final newline', () => {
    assert.deepEqual(compareLines('a\r\nb\r\n', 'a\nb', false), []);
  });

  describe('in order', () => {
    it('reports removed and added lines with their own line numbers', () => {
      assert.deepEqual(compareLines('a\nb\nc\nd\n', 'a\nx\nc\nd\nb\n', false), [
        { kind: 'removed', location: '2', value: 'b' },
        { kind: 'added', location: '2', value: 'x' },
        { kind: 'added', location: '5', value: 'b' },
      ]);
    });

    it('reports reordered lines', () => {
      assert.deepEqual(compareLines('a\nb\n', 'b\na\n', false), [
        { kind: 'removed', location: '1', value: 'a' },
        { kind: 'added', location: '2', value: 'a' },
      ]);
    });

    it('reports every line when one side is empty', () => {
      assert.deepEqual(compareLines('', 'a\nb\n', false), [
        { kind: 'added', location: '1', value: 'a' },
        { kind: 'added', location: '2', value: 'b' },
      ]);
    });
  });

  describe('order-insensitive', () => {
    it('matches lines anywhere in the file', () => {
      assert.deepEqual(compareLines('a\nb\nc\n', 'c\na\nb\n', true), []);
    });

    it('matches each line at most once, leaving extras unmatched', () => {
      assert.deepEqual(compareLines('same\n', 'same\nsame\n', true), [
        { kind: 'added', location: '2', value: 'same' },
      ]);
      assert.deepEqual(compareLines('same\nsame\n', 'same\n', true), [
        { kind: 'removed', location: '2', value: 'same' },
      ]);
    });

    it('pairs with the earliest unused match', () => {
      assert.deepEqual(compareLines('x\n', 'x\ny\nx\n', true), [
        { kind: 'added', location: '2', value: 'y' },
        { kind: 'added', location: '3', value: 'x' },
      ]);
    });

    it('lists lines only on the left before lines only on the right', () => {
      assert.deepEqual(compareLines('a\nb\n', 'c\na\n', true), [
        { kind: 'removed', location: '2', value: 'b' },
        { kind: 'added', location: '1', value: 'c' },
      ]);
    });
  });
});
