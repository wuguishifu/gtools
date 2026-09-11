import { fatal } from '@/global/error/error-boundary-provider';
import fs from 'fs';
import { useEffect, useRef } from 'react';

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
