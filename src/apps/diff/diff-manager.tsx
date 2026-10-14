import { fatal } from '@/global/error/error-boundary-provider';
import { useApp } from 'ink';
import { useEffect, useRef } from 'react';

import { DiffReport } from './diff-report';
import { diffService } from './lib/diff-service';
import { DiffMode, diffStore } from './lib/diff-store';

type DiffManagerProps = {
  left: string;
  right: string;
  mode: DiffMode;
  caseInsensitive: boolean;
};

export function DiffManager({
  left,
  right,
  mode,
  caseInsensitive,
}: DiffManagerProps) {
  const { exit } = useApp();
  const argsRef = useRef({ left, right, mode, caseInsensitive });

  useEffect(() => {
    const { left, right, mode, caseInsensitive } = argsRef.current;

    diffService
      .diff(left, right, { mode, caseInsensitive })
      .then(() => {
        if (diffStore.getState().failures.length > 0) process.exitCode = 1;
        exit();
      })
      .catch((error) =>
        fatal(error instanceof Error ? error.message : String(error)),
      );
  }, [exit]);

  return <DiffReport />;
}
