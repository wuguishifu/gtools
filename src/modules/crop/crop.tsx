import { render, Text } from 'ink';
import { defineCommand } from '../program/program';

export const crop = defineCommand((program) => {
  program
    .command('crop')
    .argument('<path>', 'Directory or file to crop')
    .action((path) => {
      render(<Text>hello world {path}</Text>);
    });
});
