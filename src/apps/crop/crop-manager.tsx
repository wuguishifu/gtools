import { fatal } from '@/global/error/error-boundary-provider';
import fs from 'fs';
import { useApp } from 'ink';
import { useEffect, useRef } from 'react';

import { CropProgress } from './crop-progress';
import { cropService } from './lib/crop-service';
import { cropStore } from './lib/crop-store';

type CropManagerProps = {
  inputPath: string;
};

export function CropManager({ inputPath }: CropManagerProps) {
  const { exit } = useApp();
  const inputPathRef = useRef(inputPath);

  useEffect(() => {
    if (!fs.existsSync(inputPathRef.current))
      return fatal('file or directory does not exist');

    cropService.crop(inputPathRef.current).then(() => {
      if (cropStore.getState().failures.length > 0) process.exitCode = 1;
      exit();
    });
  }, [exit]);

  return <CropProgress />;
}
