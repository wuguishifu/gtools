import { createStore, useStore } from '@/global/store/store';

export type CompareOptions = {
  orderInsensitive: boolean;
};

export type CompareFormat = 'json' | 'text';

/**
 * One difference between the files. `location` is a line number for text and
 * a key path for JSON; values are already formatted for display.
 */
export type Difference =
  | { kind: 'removed' | 'added'; location: string; value: string }
  | { kind: 'changed'; location: string; left: string; right: string }
  | { kind: 'moved'; location: string; from: number; to: number };

export type CompareResult = {
  left: string;
  right: string;
  format: CompareFormat;
  options: CompareOptions;
  differences: Difference[];
};

type CompareStoreProps = {
  result?: CompareResult;
};

export const compareStore = createStore<CompareStoreProps>({});

export const compareStoreActions = {
  finish: (result: CompareResult) => compareStore.setState({ result }),
};

export function useCompareStore() {
  return useStore(compareStore);
}
