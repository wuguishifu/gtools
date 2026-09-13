import { Command } from 'commander';

import { diagnostics } from './diagnostics';
import { VERSION } from './version';

export const program = new Command()
  .name('gtools')
  .version(VERSION, '-v, --version', 'output the version number')
  .option('-d, --debug', 'show environment and image backend diagnostics')
  .action(async (options: { debug?: boolean }) => {
    if (!options.debug) return program.help();
    console.log(await diagnostics());
  });

export type CommandModule = (program: Command) => void;

export function defineCommand(register: CommandModule): CommandModule {
  return register;
}
