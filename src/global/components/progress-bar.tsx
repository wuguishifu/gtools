import { Text } from 'ink';

type ProgressBarProps = {
  value: number;
  total: number;
  width?: number;
  color?: string;
};

export function ProgressBar({
  value,
  total,
  width = 28,
  color = 'cyan',
}: ProgressBarProps) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const filled = Math.round(ratio * width);

  return (
    <Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(width - filled)}</Text>
    </Text>
  );
}
