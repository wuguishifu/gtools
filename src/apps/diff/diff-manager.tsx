import { fatal } from '@/global/error/error-boundary-provider';
import { useApp } from 'ink';
import { useEffect, useRef } from 'react';

import { DiffReport } from './diff-report';
import { diffService } from './lib/diff-service';
import { DiffOptions, diffStore } from './lib/diff-store';

type DiffManagerProps = {
  left: string;
  right: string;
  options: DiffOptions;
};

export function DiffManager({ left, right, options }: DiffManagerProps) {
  const { exit } = useApp();
  const argsRef = useRef({ left, right, options });

  useEffect(() => {
    const { left, right, options } = argsRef.current;

    diffService
      .diff(left, right, options)
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
