import { ErrorBoundaryProvider } from '@/global/error/error-boundary-provider';
import { defineCommand } from '@/global/program/program';
import { render } from 'ink';

import { CropManager } from './crop-manager';

export const crop = defineCommand((program) => {
  program
    .command('crop')
    .description('Tools for cropping screenshots')
    .argument('<path>', 'Directory or file to crop')
    .option('--verbose', 'report per-file decode and border detection details')
    .action((inputPath, options: { verbose?: boolean }) => {
      render(
        <ErrorBoundaryProvider>
          <CropManager inputPath={inputPath} verbose={options.verbose} />
        </ErrorBoundaryProvider>,
      );
    });
});
