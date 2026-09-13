import { ErrorBoundaryProvider } from '@/global/error/error-boundary-provider';
import { defineCommand } from '@/global/program/program';
import { render } from 'ink';

import { pdEnvVariables } from './env';
import { PdDownload } from './utilities/download';

function parseConcurrency(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}

export const pixelDrain = defineCommand((program) => {
  const pd = program.command('pd').description('Pixeldrain utilities');

  pd.command('download')
    .argument('<url>', 'Pixeldrain link or file id')
    .option(
      '-o, --out <dir>',
      'output directory, or set GTOOLS_PD_OUT_DIR',
      process.env[pdEnvVariables.outDir],
    )
    .option(
      '-k, --key <api_key>',
      'api key, or set GTOOLS_PD_API_KEY',
      process.env[pdEnvVariables.apiKey],
    )
    .option(
      '-c, --concurrency <count>',
      'files to download in parallel (1-8)',
      parseConcurrency,
      4,
    )
    .action(
      (url, options: { out?: string; key?: string; concurrency: number }) => {
        render(
          <ErrorBoundaryProvider>
            <PdDownload url={url} options={options} />
          </ErrorBoundaryProvider>,
        );
      },
    );
});
