import { grabEnv } from '@/global/env/grab-env';
import fs from 'fs';
import path from 'path';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream as NodeReadableStream } from 'stream/web';

import { pdEnvVariables } from './env';
import { GetListResponse } from './types';

const apiBase = 'https://pixeldrain.com/api';

type DownloadFileOptions = {
  onProgress?: (received: number) => void;
};

class PixelDrainService {
  private apiKeyOverride?: string;

  constructor(private readonly env = grabEnv(pdEnvVariables)) {}

  private get apiKey() {
    return this.apiKeyOverride || this.env.apiKey;
  }

  // Anonymous requests still work for public lists, so an absent key means no
  // header at all rather than an Authorization header with an empty password.
  private get headers(): Record<string, string> {
    if (!this.apiKey) return {};
    return { Authorization: `Basic ${btoa(`:${this.apiKey}`)}` };
  }

  public useApiKey(apiKey?: string) {
    this.apiKeyOverride = apiKey;
  }

  public extractListId(rawUrl: string): string {
    const url = URL.parse(rawUrl) ? new URL(rawUrl) : null;
    return url ? path.basename(url.pathname) : rawUrl;
  }

  public async getListData(listId: string): Promise<GetListResponse> {
    const response = await fetch(`${apiBase}/list/${listId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(await this.readErrorMessage(response));
    }

    const data: GetListResponse = await response.json();

    if (!data.success) throw new Error(`could not read list ${listId}`);

    return data;
  }

  /**
   * Streams a file to `${outputPath}.part` and only renames it into place once
   * the transfer completes, so an interrupted run never leaves behind a partial
   * file that looks finished.
   */
  public async downloadFile(
    outputPath: string,
    fileId: string,
    options: DownloadFileOptions = {},
  ) {
    const response = await fetch(`${apiBase}/file/${fileId}?download`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok || !response.body) {
      throw new Error(await this.readErrorMessage(response));
    }

    const partPath = `${outputPath}.part`;
    let received = 0;

    const counter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        options.onProgress?.(received);
        callback(null, chunk);
      },
    });

    try {
      await pipeline(
        // `fetch` hands back a DOM ReadableStream under our lib settings; it is
        // the same object Node's stream bridge expects.
        Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>),
        counter,
        fs.createWriteStream(partPath),
      );
    } catch (error) {
      fs.rmSync(partPath, { force: true });
      throw error;
    }

    fs.renameSync(partPath, outputPath);
  }

  private async readErrorMessage(response: Response) {
    try {
      const body = await response.json();

      if (typeof body?.message === 'string') return body.message;
      if (typeof body?.value === 'string') return body.value;
    } catch {
      // Non-JSON error bodies fall through to the status line below.
    }

    return `request failed with status ${response.status}`;
  }
}

export const pixelDrainService = new PixelDrainService();
