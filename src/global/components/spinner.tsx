import { Text } from 'ink';
import { useState } from 'react';

import { useInterval } from '../hooks/use-interval';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

type SpinnerProps = {
  color?: string;
};

export function Spinner({ color = 'cyan' }: SpinnerProps) {
  const [frame, setFrame] = useState(0);

  useInterval(() => setFrame((previous) => (previous + 1) % FRAMES.length), 80);

  return <Text color={color}>{FRAMES[frame]}</Text>;
}
