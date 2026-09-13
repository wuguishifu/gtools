import { probeBackends } from '@/global/image/resolve-backend';
import os from 'os';

import { VERSION } from './version';

declare const Bun: { version: string } | undefined;

/**
 * Compiled binaries execute out of Bun's virtual filesystem, which is the only
 * reliable signal that this is a standalone build rather than an npm install.
 */
function isStandalone() {
  return import.meta.url.includes('$bunfs');
}

function runtime() {
  if (typeof Bun !== 'undefined') return `bun ${Bun.version}`;
  return `node ${process.versions.node}`;
}

function pad(label: string) {
  return label.padEnd(14);
}

export async function diagnostics() {
  const lines = [
    `gtools ${VERSION}`,
    '',
    `${pad('distribution')}${isStandalone() ? 'standalone binary' : 'npm package'}`,
    `${pad('runtime')}${runtime()}`,
    `${pad('platform')}${process.platform} ${process.arch} (${os.release()})`,
    `${pad('executable')}${process.execPath}`,
  ];

  const override = process.env.GTOOLS_BACKEND?.trim();
  if (override) lines.push(`${pad('GTOOLS_BACKEND')}${override}`);

  lines.push('', 'image backends');

  const probes = await probeBackends();
  const available = probes.filter((probe) => probe.backend);
  // Mirror the resolver: an override wins, otherwise preference order does.
  const active =
    available.find((probe) => probe.name === override) ?? available[0];

  for (const probe of probes) {
    if (probe.backend) {
      const marker = probe === active ? '  (active)' : '';
      lines.push(
        `  ok    ${pad(probe.name)}${probe.backend.description}${marker}`,
      );
    } else {
      lines.push(`  --    ${pad(probe.name)}unavailable: ${probe.error}`);
    }
  }

  if (!active) {
    lines.push('', 'No image backend available; image commands will not run.');
  }

  return lines.join('\n');
}
