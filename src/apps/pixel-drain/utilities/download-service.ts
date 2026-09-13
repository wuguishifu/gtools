import { UNSAFE_CHARACTERS } from '@/global/lib/unsafe-characters';
import fs from 'fs';
import path from 'path';

import { pixelDrainService } from '../pixel-drain-service';
import { PixelDrainFile } from '../types';
import { pdDownloadStore, pdDownloadStoreActions } from './download-store';

// Redraw budget per file. Chunks arrive far faster than a terminal can render.
const PROGRESS_INTERVAL = 120;

type DownloadListOptions = {
  out?: string;
  concurrency?: number;
  key?: string;
};

type DownloadPlan = {
  index: number;
  id: string;
  name: string;
  size: number;
  outputPath: string;
};

function sanitizeName(name: string, fallback: string) {
  const cleaned = path
    .basename(name ?? '')
    // Characters that are unsafe or awkward in a file name on at least one of the
    // platforms we support. Also guards against a name escaping the output folder.
    .replace(UNSAFE_CHARACTERS, '_')
    .trim();

  if (!cleaned || cleaned === '.' || cleaned === '..') return fallback;

  return cleaned;
}

function uniqueName(name: string, taken: Set<string>) {
  if (!taken.has(name.toLowerCase())) {
    taken.add(name.toLowerCase());
    return name;
  }

  const { name: stem, ext } = path.parse(name);

  for (let suffix = 2; ; suffix++) {
    const candidate = `${stem} (${suffix})${ext}`;

    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase());
      return candidate;
    }
  }
}

class DownloadService {
  public async downloadList(rawUrl: string, options: DownloadListOptions = {}) {
    pixelDrainService.useApiKey(options.key);

    const listId = pixelDrainService.extractListId(rawUrl);
    const { title, files } = await pixelDrainService.getListData(listId);

    const outputDirectory = path.join(
      options.out || process.cwd(),
      sanitizeName(title, listId),
    );

    fs.mkdirSync(outputDirectory, { recursive: true });

    const plans = this.planFiles(files, outputDirectory);
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, 8));

    pdDownloadStoreActions.start({
      title: title || listId,
      outputDirectory,
      concurrency,
      files: plans.map(({ id, name, size }) => ({ id, name, size })),
    });

    await this.runPool(plans, concurrency);

    pdDownloadStoreActions.finish();
  }

  private planFiles(
    files: PixelDrainFile[],
    outputDirectory: string,
  ): DownloadPlan[] {
    const taken = new Set<string>();

    return files.map((file, index) => {
      const name = uniqueName(sanitizeName(file.name, file.id), taken);

      return {
        index,
        id: file.id,
        name,
        size: file.size,
        outputPath: path.join(outputDirectory, name),
      };
    });
  }

  private async runPool(plans: DownloadPlan[], concurrency: number) {
    let next = 0;

    const worker = async () => {
      while (next < plans.length) {
        const plan = plans[next++];
        if (plan) await this.processFile(plan);
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, plans.length) },
      worker,
    );

    await Promise.all(workers);
  }

  private async processFile(plan: DownloadPlan) {
    // A previous run that finished this file leaves it at its full size, so it
    // is safe to skip. Anything truncated gets fetched again.
    if (this.isAlreadyDownloaded(plan)) {
      return pdDownloadStoreActions.skipFile(plan.index);
    }

    pdDownloadStoreActions.beginFile(plan.index);

    let lastReport = 0;
    let received = 0;

    try {
      await pixelDrainService.downloadFile(plan.outputPath, plan.id, {
        onProgress: (bytes) => {
          received = bytes;
          const now = Date.now();

          if (now - lastReport < PROGRESS_INTERVAL) return;

          lastReport = now;
          pdDownloadStoreActions.setProgress(plan.index, bytes);
        },
      });

      pdDownloadStoreActions.completeFile(plan.index, received || plan.size);
    } catch (error) {
      pdDownloadStoreActions.failFile(
        plan.index,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private isAlreadyDownloaded(plan: DownloadPlan) {
    const stats = fs.statSync(plan.outputPath, { throwIfNoEntry: false });
    return stats?.isFile() === true && stats.size === plan.size;
  }
}

export const downloadService = new DownloadService();

export function hasFailures() {
  return pdDownloadStore
    .getState()
    .files.some((file) => file.status === 'failed');
}
