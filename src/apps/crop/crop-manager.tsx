import { fatal } from '@/global/error/error-boundary-provider';
import fs from 'fs';
import { useApp } from 'ink';
import { useEffect, useRef } from 'react';

import { CropProgress } from './crop-progress';
import { cropService } from './lib/crop-service';
import { cropStore } from './lib/crop-store';

type CropManagerProps = {
  inputPath: string;
  verbose?: boolean;
};

export function CropManager({ inputPath, verbose }: CropManagerProps) {
  const { exit } = useApp();
  const inputPathRef = useRef(inputPath);
  const verboseRef = useRef(verbose);

  useEffect(() => {
    if (!fs.existsSync(inputPathRef.current))
      return fatal('file or directory does not exist');

    cropService
      .crop(inputPathRef.current, { verbose: verboseRef.current })
      .then(() => {
        if (cropStore.getState().failures.length > 0) process.exitCode = 1;
        exit();
      })
      .catch((error) =>
        fatal(error instanceof Error ? error.message : String(error)),
      );
  }, [exit]);

  return <CropProgress />;
}
