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

type Header = {
  width: number;
  height: number;
  bands: number;
  format: string;
  interpretation: string;
};

/**
 * One `vipsheader -a` rather than three `-f` calls. Each spawn is comparatively
 * expensive — more so while ink is re-rendering — so the round trips matter.
 */
async function header(input: string): Promise<Header> {
  const { stdout } = await run('vipsheader', ['-a', input]);

  const field = (name: string, pattern: string) => {
    const match = stdout.match(new RegExp(`^${name}: (${pattern})$`, 'm'));

    if (!match) {
      throw new Error(`vipsheader did not report ${name} for ${input}`);
    }

    return match[1];
  };

  return {
    width: Number(field('width', '\\d+')),
    height: Number(field('height', '\\d+')),
    bands: Number(field('bands', '\\d+')),
    format: field('format', '\\S+'),
    interpretation: field('interpretation', '\\S+'),
  };
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

/** Matches sharp's removeAlpha() on the sRGB buffer vips hands back. */
function dropAlpha(raw: Buffer, pixels: number) {
  const out = Buffer.allocUnsafe(pixels * 3);

  for (let p = 0, from = 0, to = 0; p < pixels; p++, from += 4, to += 3) {
    out[to] = raw[from];
    out[to + 1] = raw[from + 1];
    out[to + 2] = raw[from + 2];
  }

  return out;
}

export async function loadVipsBackend(): Promise<ImageBackend> {
  const version = await vips(['--version']);

  return {
    name: 'vips',
    description: `${version} CLI`,

    async readRaw(input) {
      const meta = await header(input);
      const { width, height } = meta;

      // vips cannot stream rawsave to stdout, so round-trip through a temp file.
      const scratch = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'gtools-'),
      );
      // The .raw suffix matters: vips infers the output format from the
      // filename, and an extensionless path is rejected outright.
      const target = path.join(scratch, 'image.raw');

      try {
        // colourspace, not rawsave: rawsave dumps the image at its native
        // depth, so a 16-bit source (ushort/rgb16, common in phone
        // screenshots) writes two bytes per sample and every subsequent
        // 8-bit index is misaligned. Converting to sRGB first normalises
        // depth and interpretation the way sharp's .raw() does, and is a
        // no-op for images that are already 8-bit sRGB.
        await vips(['colourspace', input, target, 'srgb']);

        const raw = await fs.promises.readFile(target);
        const pixels = width * height;
        const channels = raw.length / pixels;

        if (!Number.isInteger(channels) || channels < 3 || channels > 4) {
          throw new Error(
            `unexpected vips output: ${raw.length} bytes for ${width}x${height} ` +
              `(${meta.format}, ${meta.bands} bands, ${meta.interpretation})`,
          );
        }

        return {
          data: channels === 4 ? dropAlpha(raw, pixels) : raw,
          width,
          height,
          channels: channels === 4 ? 3 : channels,
          source: `${meta.format} ${meta.bands}-band ${meta.interpretation}`,
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
