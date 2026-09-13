import { getImageBackend } from '@/global/image/resolve-backend';
import fs from 'fs';
import path from 'path';

import { cropStore, cropStoreActions } from './crop-store';
import { identifierService } from './identifier-service';

const IMAGE_PATTERN = /\.(png|jpe?g|webp)$/i;

const MAX_LISTED_RUNS = 4;

function formatRuns(runs: { start: number; end: number }[]) {
  if (runs.length === 0) return '';

  const listed = runs
    .slice(0, MAX_LISTED_RUNS)
    .map((run) => `${run.start}-${run.end}`)
    .join(', ');

  const rest = runs.length - MAX_LISTED_RUNS;

  return ` (${listed}${rest > 0 ? `, +${rest} more` : ''})`;
}

class CropService {
  public async crop(inputPath: string, options: { verbose?: boolean } = {}) {
    cropStoreActions.setVerbose(options.verbose === true);

    // Resolved up front so a missing backend surfaces as one clear error
    // instead of an identical failure recorded against every file.
    const backend = await getImageBackend();

    cropStoreActions.setBackend(`${backend.name} · ${backend.description}`);

    const stats = fs.lstatSync(inputPath);

    if (stats.isFile()) {
      const { dir, name, ext } = path.parse(inputPath);
      const output = path.join(dir, `${name}-cropped${ext}`);

      cropStoreActions.start(path.basename(inputPath), path.basename(output));
      cropStoreActions.setTotalFiles(1);
      await this.processFile(inputPath, output);
    } else {
      const { dir, name } = path.parse(inputPath);
      const outputDirPath = path.join(dir, `${name}-cropped`);

      cropStoreActions.start(
        path.basename(inputPath),
        path.basename(outputDirPath),
      );
      await this.batchCrop(inputPath, outputDirPath);
    }

    cropStoreActions.finish();
  }

  public async batchCrop(inputDirPath: string, outputDirPath: string) {
    const files = fs
      .readdirSync(inputDirPath)
      .filter((file) => IMAGE_PATTERN.test(file))
      .sort();

    cropStoreActions.setTotalFiles(files.length);

    if (files.length === 0) return;

    fs.mkdirSync(outputDirPath, { recursive: true });

    for (const file of files) {
      await this.processFile(
        path.join(inputDirPath, file),
        path.join(outputDirPath, file),
      );
    }
  }

  public async cropImage(input: string, output: string) {
    const backend = await getImageBackend();
    const verbose = cropStore.getState().verbose;
    const startedAt = Date.now();

    const { data, width, height, channels, source } =
      await backend.readRaw(input);

    const decodedAt = Date.now();

    const runs = identifierService.identifyBorders({
      data,
      width,
      height,
      channels,
    });

    const bounds = identifierService.findPhotoBounds({ runs });

    if (verbose) {
      cropStoreActions.recordDiagnostic({
        file: path.basename(input),
        lines: [
          `source    ${width}x${height}${source ? ` · ${source}` : ''}`,
          `decoded   ${data.length} bytes · ${channels} channels · ${decodedAt - startedAt}ms`,
          `borders   ${runs.length} run${runs.length === 1 ? '' : 's'}${formatRuns(runs)}`,
          bounds
            ? `bounds    rows ${bounds.top}-${bounds.bottom} · height ${bounds.bottom - bounds.top}`
            : 'bounds    none — needs two border runs at least 200px apart',
        ],
      });
    }

    if (!bounds) {
      throw new Error('could not detect photo borders');
    }

    await backend.extract({
      input,
      output,
      left: 0,
      top: bounds.top,
      width,
      height: bounds.bottom - bounds.top,
    });
  }

  private async processFile(input: string, output: string) {
    const file = path.basename(input);
    cropStoreActions.setActiveFile(file);

    try {
      await this.cropImage(input, output);
      cropStoreActions.recordSuccess();
    } catch (error) {
      cropStoreActions.recordFailure({
        file,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const cropService = new CropService();
