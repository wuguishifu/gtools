import { commands } from './modules';
import { program } from './modules/program/program';

for (const register of commands) register(program);

program.parse();
