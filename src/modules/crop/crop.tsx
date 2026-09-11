import { render } from 'ink';

import { ErrorBoundaryProvider } from '../error/error-boundary-provider';
import { defineCommand } from '../program/program';
import { CropManager } from './crop-manager';

export const crop = defineCommand((program) => {
  program
    .command('crop')
    .argument('<path>', 'Directory or file to crop')
    .action((path) => {
      render(
        <ErrorBoundaryProvider>
          <CropManager path={path} />
        </ErrorBoundaryProvider>,
      );
    });
});
