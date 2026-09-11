import { useSyncExternalStore } from 'react';

type Listener = () => void;

export type Store<T> = {
  getState: () => T;
  setState: (update: Partial<T> | ((state: T) => T)) => void;
  subscribe: (listener: Listener) => () => void;
};

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<Listener>();

  return {
    getState() {
      return state;
    },

    setState(update: Partial<T> | ((state: T) => T)) {
      state =
        typeof update === 'function' ? update(state) : { ...state, ...update };

      listeners.forEach((listener) => listener());
    },

    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: Store<T>) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
