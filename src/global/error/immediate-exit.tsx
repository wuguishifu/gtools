import { useApp } from 'ink';
import { useEffect } from 'react';

export function ImmediateExit() {
  const { exit } = useApp();

  useEffect(() => {
    process.exitCode = 1;
    exit();
  }, [exit]);

  return null;
}
