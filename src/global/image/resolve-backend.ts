import { loadSharpBackend } from './sharp-backend';
import type { BackendName, ImageBackend } from './types';
import { loadVipsBackend } from './vips-backend';

const LOADERS: Record<BackendName, () => Promise<ImageBackend>> = {
  sharp: loadSharpBackend,
  vips: loadVipsBackend,
};

/**
 * sharp first: it is in-process, so it avoids a subprocess per image. It is
 * only ever present in the npm install — compiled binaries always land on vips.
 */
const PREFERENCE: BackendName[] = ['sharp', 'vips'];

export const INSTALL_HINT = [
  'No image backend available.',
  '',
  'gtools needs either the vips CLI or sharp to process images.',
  '',
  '  macOS          brew install vips',
  '  Debian/Ubuntu  sudo apt install libvips-tools',
  '  Fedora         sudo dnf install vips-tools',
  '',
  'Alternatively install gtools from npm, which pulls in sharp:',
  '',
  '  npm i -g @wuguishifu/gtools',
].join('\n');

export type BackendProbe = {
  name: BackendName;
  backend?: ImageBackend;
  error?: string;
};

function requested(): BackendName | undefined {
  const value = process.env.GTOOLS_BACKEND?.trim().toLowerCase();

  if (!value) return undefined;

  if (value !== 'sharp' && value !== 'vips') {
    throw new Error(
      `GTOOLS_BACKEND must be "sharp" or "vips", received "${value}"`,
    );
  }

  return value;
}

/** Tries every backend and reports why each one did or did not load. */
export async function probeBackends(): Promise<BackendProbe[]> {
  return Promise.all(
    PREFERENCE.map(async (name) => {
      try {
        return { name, backend: await LOADERS[name]() };
      } catch (error) {
        return {
          name,
          error:
            error instanceof Error
              ? error.message.split('\n')[0]
              : String(error),
        };
      }
    }),
  );
}

async function select(): Promise<ImageBackend> {
  const override = requested();
  const order = override ? [override] : PREFERENCE;

  const failures: string[] = [];

  for (const name of order) {
    try {
      return await LOADERS[name]();
    } catch (error) {
      failures.push(
        `  ${name}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
      );
    }
  }

  if (override) {
    throw new Error(
      `GTOOLS_BACKEND requested "${override}", but it could not be loaded:\n${failures.join('\n')}`,
    );
  }

  throw new Error(`${INSTALL_HINT}\n\nTried:\n${failures.join('\n')}`);
}

let pending: Promise<ImageBackend> | undefined;

/** Resolved once per process and shared across every image in a batch. */
export function getImageBackend(): Promise<ImageBackend> {
  pending ??= select();
  return pending;
}
