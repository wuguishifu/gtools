import type { CommandModule } from './program/program';
import { crop } from './crop/crop';

export const commands: CommandModule[] = [crop];
