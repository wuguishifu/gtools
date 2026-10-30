import { fatal } from '@/global/error/error-boundary-provider';
import { useApp } from 'ink';
import { useEffect, useRef } from 'react';

import { CompareReport } from './compare-report';
import { compareService } from './lib/compare-service';
import { CompareOptions } from './lib/compare-store';

type CompareManagerProps = {
  left: string;
  right: string;
  options: CompareOptions;
};

export function CompareManager({ left, right, options }: CompareManagerProps) {
  const { exit } = useApp();
  const argsRef = useRef({ left, right, options });

  useEffect(() => {
    const { left, right, options } = argsRef.current;

    compareService
      .compare(left, right, options)
      .then((differences) => {
        // Like `diff`, exit non-zero when the files differ so scripts can
        // branch on the result.
        if (differences.length > 0) process.exitCode = 1;
        exit();
      })
      .catch((error) =>
        fatal(error instanceof Error ? error.message : String(error)),
      );
  }, [exit]);

  return <CompareReport />;
}
