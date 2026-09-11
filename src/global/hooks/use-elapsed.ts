import { useState } from 'react';

import { useInterval } from './use-interval';

export function useElapsed(startedAt?: number, finishedAt?: number) {
  const [now, setNow] = useState(() => Date.now());
  useInterval(() => setNow(Date.now()), finishedAt === undefined ? 100 : null);
  if (startedAt === undefined) return 0;
  return Math.max(0, (finishedAt ?? now) - startedAt);
}
