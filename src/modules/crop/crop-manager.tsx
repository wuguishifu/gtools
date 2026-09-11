import fs from 'fs';
import { useEffect, useRef } from 'react';

import { fatal } from '../error/error-boundary-provider';

type CropManagerProps = {
  path: string;
};

export function CropManager({ path }: CropManagerProps) {
  const pathRef = useRef(path);

  useEffect(() => {
    if (!fs.existsSync(path)) {
      return fatal('file or directory does not exist');
    }
    const stats = fs.lstatSync(pathRef.current);
    const isFile = stats.isFile();
  }, []);

  return null;
}
