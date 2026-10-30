import fs from 'fs';
import path from 'path';

import {
  CompareFormat,
  CompareOptions,
  compareStoreActions,
} from './compare-store';
import { compareJson } from './json-compare';
import { parseJson } from './json-parse';
import { compareLines } from './line-compare';

async function readText(file: string) {
  const stats = await fs.promises.stat(file).catch(() => null);

  if (!stats) throw new Error(`${file} does not exist`);
  if (!stats.isFile()) throw new Error(`${file} is not a file`);

  // Drop a byte order mark, which JSON.parse rejects and isn't a visible
  // difference anyway.
  return (await fs.promises.readFile(file, 'utf8')).replace(/^﻿/, '');
}

function isJsonFile(file: string) {
  return path.extname(file).toLowerCase() === '.json';
}

function parse(text: string, file: string) {
  try {
    return parseJson(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${file} is not valid JSON: ${reason}`);
  }
}

class CompareService {
  public async compare(left: string, right: string, options: CompareOptions) {
    const [leftText, rightText] = await Promise.all([
      readText(left),
      readText(right),
    ]);

    const format: CompareFormat =
      isJsonFile(left) && isJsonFile(right) ? 'json' : 'text';

    const differences =
      format === 'json'
        ? compareJson(
            parse(leftText, left),
            parse(rightText, right),
            options.orderInsensitive,
          )
        : compareLines(leftText, rightText, options.orderInsensitive);

    compareStoreActions.finish({ left, right, format, options, differences });

    return differences;
  }
}

export const compareService = new CompareService();
