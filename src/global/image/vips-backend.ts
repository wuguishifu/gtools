import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import type { ImageBackend } from './types';

const run = promisify(execFile);

const MAX_RAW_BUFFER = 512 * 1024 * 1024;

async function vips(args: string[]) {
  const { stdout } = await run('vips', args, { maxBuffer: MAX_RAW_BUFFER });
  return stdout.trim();
}

type Header = { width: number; height: number; bands: number };

/**
 * One `vipsheader -a` rather than three `-f` calls. Each spawn is comparatively
 * expensive — more so while ink is re-rendering — so the round trips matter.
 */
async function header(input: string): Promise<Header> {
  const { stdout } = await run('vipsheader', ['-a', input]);

  const read = (field: keyof Header) => {
    const match = stdout.match(new RegExp(`^${field}: (\\d+)$`, 'm'));

    if (!match) {
      throw new Error(`vipsheader did not report ${field} for ${input}`);
    }

    return Number(match[1]);
  };

  return { width: read('width'), height: read('height'), bands: read('bands') };
}

/**
 * Mirrors sharp's removeAlpha(): drop the trailing alpha band, leaving
 * greyscale and RGB images untouched.
 */
function bandsWithoutAlpha(bands: number) {
  if (bands === 2) return 1;
  if (bands === 4) return 3;
  return bands;
}

/**
 * sharp and vips ship different lossy encoder defaults — sharp writes JPEG at
 * Q=80 with optimised Huffman coding, vips at Q=75 without — so the same crop
 * would decode differently depending on the backend. Pin vips to sharp's
 * defaults. Lossless formats need no options: their pixels always match.
 */
function saveOptions(output: string) {
  if (/\.jpe?g$/i.test(output)) return '[Q=80,optimize_coding=true]';
  if (/\.webp$/i.test(output)) return '[Q=80]';
  return '';
}

export async function loadVipsBackend(): Promise<ImageBackend> {
  const version = await vips(['--version']);

  return {
    name: 'vips',
    description: `${version} CLI`,

    async readRaw(input) {
      const { width, height, bands } = await header(input);

      const channels = bandsWithoutAlpha(bands);

      // vips cannot stream rawsave to stdout, so round-trip through a temp file.
      const scratch = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'gtools-'),
      );
      // The .raw suffix matters: extract_band infers its output format from
      // the filename, and an extensionless path is rejected outright.
      const target = path.join(scratch, 'image.raw');

      try {
        if (channels === bands) {
          await vips(['rawsave', input, target]);
        } else {
          await vips([
            'extract_band',
            input,
            target,
            '0',
            '--n',
            String(channels),
          ]);
        }

        return {
          data: await fs.promises.readFile(target),
          width,
          height,
          channels,
        };
      } finally {
        await fs.promises.rm(scratch, { recursive: true, force: true });
      }
    },

    async extract({ input, output, left, top, width, height }) {
      await vips([
        'extract_area',
        input,
        output + saveOptions(output),
        String(left),
        String(top),
        String(width),
        String(height),
      ]);
    },
  };
}
