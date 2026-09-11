import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import { cropStoreActions } from './crop-store';
import { identifierService } from './identifier-service';

const IMAGE_PATTERN = /\.(png|jpe?g|webp)$/i;

class CropService {
  public async crop(inputPath: string) {
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
    const source = sharp(input).removeAlpha();

    const {
      data,
      info: { width, height, channels },
    } = await source.clone().raw().toBuffer({ resolveWithObject: true });

    const runs = identifierService.identifyBorders({
      data,
      width,
      height,
      channels,
    });

    const bounds = identifierService.findPhotoBounds({ runs });

    if (!bounds) {
      throw new Error('could not detect photo borders');
    }

    await sharp(input)
      .extract({
        left: 0,
        top: bounds.top,
        width,
        height: bounds.bottom - bounds.top,
      })
      .toFile(output);
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
