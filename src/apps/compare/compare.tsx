import { ErrorBoundaryProvider } from '@/global/error/error-boundary-provider';
import { defineCommand } from '@/global/program/program';
import { render } from 'ink';

import { CompareManager } from './compare-manager';

export const compare = defineCommand((program) => {
  program
    .command('compare')
    .description(
      'Show how two files differ: by key and value when both are JSON, otherwise by line',
    )
    .argument('<file1>', 'first file')
    .argument('<file2>', 'second file')
    .option(
      '-o, --order-insensitive',
      'match JSON keys in any order within the same object, or lines anywhere in the file (each line matches once)',
    )
    .action(
      (
        left: string,
        right: string,
        options: { orderInsensitive?: boolean },
      ) => {
        render(
          <ErrorBoundaryProvider>
            <CompareManager
              left={left}
              right={right}
              options={{ orderInsensitive: options.orderInsensitive === true }}
            />
          </ErrorBoundaryProvider>,
        );
      },
    );
});
