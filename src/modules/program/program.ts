import { Command } from 'commander';

export const program = new Command().name('gtools');

export type CommandModule = (program: Command) => void;

export function defineCommand(register: CommandModule): CommandModule {
  return register;
}
