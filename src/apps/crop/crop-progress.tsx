import { ProgressBar } from '@/global/components/progress-bar';
import { Spinner } from '@/global/components/spinner';
import { useElapsed } from '@/global/hooks/use-elapsed';
import { formatDuration } from '@/global/lib/format-duration';
import { Box, Text, useStdout } from 'ink';

import { useCropStore } from './lib/crop-store';

const MAX_LISTED_FAILURES = 8;

export function CropProgress() {
  const {
    status,
    inputLabel,
    outputLabel,
    totalFiles,
    activeFile,
    succeeded,
    failures,
    startedAt,
    finishedAt,
    verbose,
    backend,
    diagnostics,
  } = useCropStore();

  const { stdout } = useStdout();
  const elapsed = useElapsed(startedAt, finishedAt);
  const barWidth = Math.max(10, Math.min(28, (stdout?.columns ?? 80) - 24));
  const processed = succeeded + failures.length;
  const done = status === 'done';
  const empty = done && totalFiles === 0;
  const percent =
    totalFiles > 0 ? Math.floor((processed / totalFiles) * 100) : 0;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box gap={1}>
        <Text bold color="cyan">
          crop
        </Text>
        <Text>{inputLabel}</Text>
        {!empty && (
          <>
            <Text dimColor>→</Text>
            <Text dimColor>{outputLabel}</Text>
          </>
        )}
      </Box>

      {verbose && backend && (
        <Box marginTop={1} gap={1}>
          <Text dimColor>backend</Text>
          <Text dimColor>{backend}</Text>
        </Box>
      )}

      <Box marginTop={1} gap={1}>
        <StatusIcon done={done} failed={failures.length > 0} />
        {!empty && (
          <>
            <ProgressBar
              value={processed}
              total={totalFiles}
              width={barWidth}
            />
            <Text bold>{`${String(percent).padStart(3)}%`}</Text>
            <Text dimColor>{`${processed}/${totalFiles}`}</Text>
          </>
        )}
      </Box>

      <Box marginLeft={2} gap={1}>
        {done ? (
          <Summary
            succeeded={succeeded}
            failed={failures.length}
            elapsed={elapsed}
            empty={empty}
          />
        ) : (
          <Text dimColor wrap="truncate-middle">
            {activeFile ?? 'scanning…'}
          </Text>
        )}
      </Box>

      {!done && processed > 0 && (
        <Box marginTop={1} marginLeft={2} gap={2}>
          <Text color="green">{`✔ ${succeeded}`}</Text>
          {failures.length > 0 && (
            <Text color="red">{`✖ ${failures.length}`}</Text>
          )}
          <Text dimColor>{formatDuration(elapsed)}</Text>
        </Box>
      )}

      {verbose && done && diagnostics.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold dimColor>
            details
          </Text>
          {diagnostics.map((diagnostic) => (
            <Box key={diagnostic.file} flexDirection="column" marginTop={1}>
              <Box marginLeft={2}>
                <Text>{diagnostic.file}</Text>
              </Box>
              {diagnostic.lines.map((line) => (
                <Box key={line} marginLeft={4}>
                  <Text dimColor wrap="truncate-end">
                    {line}
                  </Text>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}

      {done && failures.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="red">
            failed
          </Text>
          {failures.slice(0, MAX_LISTED_FAILURES).map((failure) => (
            <Box key={failure.file} marginLeft={2} gap={1}>
              <Text color="red">✖</Text>
              <Text wrap="truncate-middle">{failure.file}</Text>
              <Text dimColor>{failure.reason}</Text>
            </Box>
          ))}
          {failures.length > MAX_LISTED_FAILURES && (
            <Box marginLeft={4}>
              <Text
                dimColor
              >{`+${failures.length - MAX_LISTED_FAILURES} more`}</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function StatusIcon({ done, failed }: { done: boolean; failed: boolean }) {
  if (!done) return <Spinner />;

  return failed ? <Text color="yellow">⚠</Text> : <Text color="green">✔</Text>;
}

function Summary({
  succeeded,
  failed,
  elapsed,
  empty,
}: {
  succeeded: number;
  failed: number;
  elapsed: number;
  empty: boolean;
}) {
  if (empty) return <Text dimColor>no images found</Text>;

  return (
    <>
      <Text color="green">{`${succeeded} cropped`}</Text>
      {failed > 0 && <Text color="red">{`· ${failed} failed`}</Text>}
      <Text dimColor>{`· ${formatDuration(elapsed)}`}</Text>
    </>
  );
}
