import { ErrorBoundaryProvider } from '@/global/error/error-boundary-provider';
import { defineCommand } from '@/global/program/program';
import { Command } from 'commander';
import { render } from 'ink';

import { DiffManager } from './diff-manager';
import { DiffMode } from './lib/diff-store';

export const diff = defineCommand((program) => {
  program
    .command('diff')
    .description('List files that exist in only one of two directories')
    .argument('<dir1>', 'first directory')
    .argument('<dir2>', 'second directory')
    .option(
      '-s, --sync',
      'copy missing files so both directories match (dry run without --apply)',
    )
    .option('-a, --apply', 'perform the copies previewed by --sync')
    .option(
      '-i, --case-insensitive',
      'treat file names that differ only in case as the same file',
    )
    .option(
      '--include-hidden, -H',
      'include hidden files and directories (names starting with ".")',
    )
    .action(
      (
        left: string,
        right: string,
        options: {
          sync?: boolean;
          apply?: boolean;
          caseInsensitive?: boolean;
          includeHidden?: boolean;
        },
        command: Command,
      ) => {
        if (options.apply && !options.sync) {
          command.error('error: --apply only takes effect with --sync');
        }

        const mode: DiffMode = !options.sync
          ? 'report'
          : options.apply
            ? 'apply'
            : 'dry-run';

        render(
          <ErrorBoundaryProvider>
            <DiffManager
              left={left}
              right={right}
              options={{
                mode,
                caseInsensitive: options.caseInsensitive === true,
                includeHidden: options.includeHidden === true,
              }}
            />
          </ErrorBoundaryProvider>,
        );
      },
    );
});
