import { ErrorBoundaryProvider } from '@/global/error/error-boundary-provider';
import { defineCommand } from '@/global/program/program';
import { render } from 'ink';

import { CropManager } from './crop-manager';

export const crop = defineCommand((program) => {
  program
    .command('crop')
    .argument('<path>', 'Directory or file to crop')
    .action((inputPath) => {
      render(
        <ErrorBoundaryProvider>
          <CropManager inputPath={inputPath} />
        </ErrorBoundaryProvider>,
      );
    });
});
