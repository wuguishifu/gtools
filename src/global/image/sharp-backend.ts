import type { ImageBackend } from './types';

/**
 * sharp is a native Node addon, so it is only reachable when gtools runs on a
 * real Node/Bun install with a node_modules tree. Inside a compiled binary the
 * import always fails, which is what makes the vips fallback kick in.
 */
export async function loadSharpBackend(): Promise<ImageBackend> {
  const mod: any = await import('sharp');
  const sharp = mod.default ?? mod;

  // Touch the native binding now so a broken install fails here, while we can
  // still fall back, rather than midway through a batch.
  const vips = sharp.versions?.vips;

  if (!vips) throw new Error('sharp loaded but its native binding is missing');

  return {
    name: 'sharp',
    description: `sharp ${sharp.versions.sharp} (libvips ${vips})`,

    async readRaw(input) {
      const image = sharp(input);
      const [meta, { data, info }] = await Promise.all([
        image.metadata(),
        image.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true }),
      ]);

      return {
        data,
        width: info.width,
        height: info.height,
        channels: info.channels,
        source: `${meta.depth} ${meta.channels}-band ${meta.space}`,
      };
    },

    async extract({ input, output, left, top, width, height }) {
      await sharp(input).extract({ left, top, width, height }).toFile(output);
    },
  };
}
