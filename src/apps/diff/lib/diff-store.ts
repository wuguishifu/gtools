import { createStore, useStore } from '@/global/store/store';

export type DiffMode = 'report' | 'dry-run' | 'apply';

export type DiffFile = {
  path: string;
  size: number;
};

export type DiffSide = {
  label: string;
  root: string;
  only: DiffFile[];
};

export type CopyFailure = {
  file: string;
  reason: string;
};

type DiffStoreProps = {
  status: 'scanning' | 'copying' | 'done';
  mode: DiffMode;
  caseInsensitive: boolean;
  left?: DiffSide;
  right?: DiffSide;
  shared: number;
  totalBytes: number;
  copiedBytes: number;
  copiedFiles: number;
  activeFile?: string;
  failures: CopyFailure[];
  startedAt?: number;
  finishedAt?: number;
};

const initialState: DiffStoreProps = {
  status: 'scanning',
  mode: 'report',
  caseInsensitive: false,
  shared: 0,
  totalBytes: 0,
  copiedBytes: 0,
  copiedFiles: 0,
  failures: [],
};

export const diffStore = createStore<DiffStoreProps>(initialState);

export const diffStoreActions = {
  start: (mode: DiffMode, caseInsensitive: boolean) =>
    diffStore.setState({
      status: 'scanning',
      mode,
      caseInsensitive,
      startedAt: Date.now(),
    }),
  setResult: (left: DiffSide, right: DiffSide, shared: number) =>
    diffStore.setState({ left, right, shared }),
  startCopying: (totalBytes: number) =>
    diffStore.setState({ status: 'copying', totalBytes }),
  setActiveFile: (activeFile: string) => diffStore.setState({ activeFile }),
  recordCopy: (bytes: number) =>
    diffStore.setState((previous) => ({
      ...previous,
      copiedFiles: previous.copiedFiles + 1,
      copiedBytes: previous.copiedBytes + bytes,
    })),
  recordFailure: (failure: CopyFailure) =>
    diffStore.setState((previous) => ({
      ...previous,
      failures: [...previous.failures, failure],
    })),
  finish: () =>
    diffStore.setState({
      status: 'done',
      activeFile: undefined,
      finishedAt: Date.now(),
    }),
};

export function useDiffStore() {
  return useStore(diffStore);
}
