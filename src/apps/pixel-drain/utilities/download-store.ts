import { createStore, useStore } from '@/global/store/store';

export type PdFileStatus =
  'pending' | 'downloading' | 'done' | 'skipped' | 'failed';

export type PdFileState = {
  id: string;
  name: string;
  size: number;
  received: number;
  status: PdFileStatus;
  reason?: string;
};

export type PdFailure = {
  name: string;
  reason: string;
};

type PdDownloadStoreProps = {
  status: 'resolving' | 'downloading' | 'done';
  title?: string;
  outputDirectory?: string;
  concurrency: number;
  files: PdFileState[];
  startedAt?: number;
  finishedAt?: number;
};

const initialState: PdDownloadStoreProps = {
  status: 'resolving',
  concurrency: 1,
  files: [],
};

export const pdDownloadStore = createStore<PdDownloadStoreProps>(initialState);

function updateFile(index: number, patch: Partial<PdFileState>) {
  pdDownloadStore.setState((previous) => {
    const existing = previous.files[index];
    if (!existing) return previous;

    const files = previous.files.slice();
    files[index] = { ...existing, ...patch };

    return { ...previous, files };
  });
}

export const pdDownloadStoreActions = {
  start: (options: {
    title: string;
    outputDirectory: string;
    concurrency: number;
    files: Omit<PdFileState, 'received' | 'status'>[];
  }) =>
    pdDownloadStore.setState({
      status: 'downloading',
      title: options.title,
      outputDirectory: options.outputDirectory,
      concurrency: options.concurrency,
      files: options.files.map((file) => ({
        ...file,
        received: 0,
        status: 'pending',
      })),
      startedAt: Date.now(),
    }),
  beginFile: (index: number) =>
    updateFile(index, { status: 'downloading', received: 0 }),
  setProgress: (index: number, received: number) =>
    updateFile(index, { received }),
  completeFile: (index: number, received: number) =>
    updateFile(index, { status: 'done', received }),
  skipFile: (index: number) => updateFile(index, { status: 'skipped' }),
  failFile: (index: number, reason: string) =>
    updateFile(index, { status: 'failed', reason }),
  finish: () =>
    pdDownloadStore.setState({ status: 'done', finishedAt: Date.now() }),
};

export type PdDownloadSummary = ReturnType<typeof summarize>;

/**
 * Skipped files count toward progress but not toward transfer speed, which is
 * measured against bytes that actually crossed the network.
 */
export function summarize(files: PdFileState[]) {
  const active: { index: number; file: PdFileState }[] = [];
  const failures: PdFailure[] = [];

  let totalBytes = 0;
  let downloadedBytes = 0;
  let skippedBytes = 0;
  let completed = 0;
  let skipped = 0;

  files.forEach((file, index) => {
    totalBytes += file.size;

    switch (file.status) {
      case 'downloading':
        downloadedBytes += file.received;
        active.push({ index, file });
        break;
      case 'done':
        downloadedBytes += file.received;
        completed += 1;
        break;
      case 'skipped':
        skippedBytes += file.size;
        skipped += 1;
        break;
      case 'failed':
        failures.push({ name: file.name, reason: file.reason ?? 'failed' });
        break;
    }
  });

  return {
    active,
    failures,
    totalBytes,
    downloadedBytes,
    skippedBytes,
    completed,
    skipped,
    progressBytes: downloadedBytes + skippedBytes,
    settled: completed + skipped + failures.length,
  };
}

export function usePdDownloadStore() {
  return useStore(pdDownloadStore);
}
