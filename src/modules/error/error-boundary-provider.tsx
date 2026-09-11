import { Text } from 'ink';
import { PropsWithChildren } from 'react';

import { createStore, useStore } from '../store/store';
import { ImmediateExit } from './immediate-exit';

type ErrorBoundaryStoreProps = {
  error: null | string;
};

export const errorBoundaryStore = createStore<ErrorBoundaryStoreProps>({
  error: null,
});

export function fatal(error: string) {
  errorBoundaryStore.setState({ error });
}

export function ErrorBoundaryProvider({ children }: PropsWithChildren) {
  const { error } = useStore(errorBoundaryStore);

  if (error) {
    return (
      <>
        <Text color="red">{error}</Text>
        <ImmediateExit />
      </>
    );
  }

  return children;
}
