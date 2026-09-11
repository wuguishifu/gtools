import { render } from 'ink';
import { defineCommand } from '../program/program';
import { CropManager } from './crop-manager';
import { ErrorBoundaryProvider } from '../error/error-boundary-provider';

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
