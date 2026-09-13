import { crop } from './apps/crop/crop';
import { CommandModule, program } from './global/program/program';

const commands: CommandModule[] = [crop];

for (const register of commands) register(program);

await program.parseAsync();
