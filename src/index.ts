import { crop } from './apps/crop/crop';
import { pixelDrain } from './apps/pixel-drain/pd';
import { CommandModule, program } from './global/program/program';

const commands: CommandModule[] = [crop, pixelDrain];

for (const register of commands) register(program);

await program.parseAsync();
