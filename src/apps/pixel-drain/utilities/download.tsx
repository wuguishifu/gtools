import { fatal } from '@/global/error/error-boundary-provider';
import { useApp } from 'ink';
import { useEffect, useRef } from 'react';

import { PdDownloadProgress } from './download-progress';
import { downloadService, hasFailures } from './download-service';

type PdDownloadProps = {
  url: string;
  options: { out?: string; key?: string; concurrency?: number };
};

export function PdDownload({ url, options }: PdDownloadProps) {
  const { exit } = useApp();
  const urlRef = useRef(url);
  const optionsRef = useRef(options);

  useEffect(() => {
    downloadService
      .downloadList(urlRef.current, optionsRef.current)
      .then(() => {
        if (hasFailures()) process.exitCode = 1;
        exit();
      })
      .catch((error) =>
        fatal(error instanceof Error ? error.message : String(error)),
      );
  }, [exit]);

  return <PdDownloadProgress />;
}
