import { createStore, useStore } from '@/global/store/store';

export type CropFailure = {
  file: string;
  reason: string;
};

export type CropDiagnostic = {
  file: string;
  lines: string[];
};

type CropStoreProps = {
  status: 'idle' | 'running' | 'done';
  inputLabel?: string;
  outputLabel?: string;
  totalFiles: number;
  activeFile?: string;
  succeeded: number;
  failures: CropFailure[];
  verbose: boolean;
  backend?: string;
  diagnostics: CropDiagnostic[];
  startedAt?: number;
  finishedAt?: number;
};

const initialState: CropStoreProps = {
  status: 'idle',
  totalFiles: 0,
  succeeded: 0,
  failures: [],
  verbose: false,
  diagnostics: [],
};

export const cropStore = createStore<CropStoreProps>(initialState);

export const cropStoreActions = {
  start: (inputLabel: string, outputLabel: string) =>
    cropStore.setState({
      status: 'running',
      inputLabel,
      outputLabel,
      startedAt: Date.now(),
    }),
  setTotalFiles: (totalFiles: number) => cropStore.setState({ totalFiles }),
  setVerbose: (verbose: boolean) => cropStore.setState({ verbose }),
  setBackend: (backend: string) => cropStore.setState({ backend }),
  recordDiagnostic: (diagnostic: CropDiagnostic) =>
    cropStore.setState((previous) => ({
      ...previous,
      diagnostics: [...previous.diagnostics, diagnostic],
    })),
  setActiveFile: (activeFile: string) => cropStore.setState({ activeFile }),
  recordSuccess: () =>
    cropStore.setState((previous) => ({
      ...previous,
      succeeded: previous.succeeded + 1,
    })),
  recordFailure: (failure: CropFailure) =>
    cropStore.setState((previous) => ({
      ...previous,
      failures: [...previous.failures, failure],
    })),
  finish: () =>
    cropStore.setState({
      status: 'done',
      activeFile: undefined,
      finishedAt: Date.now(),
    }),
};

export function useCropStore() {
  return useStore(cropStore);
}
