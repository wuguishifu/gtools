import { ProgressBar } from '@/global/components/progress-bar';
import { Spinner } from '@/global/components/spinner';
import { useElapsed } from '@/global/hooks/use-elapsed';
import { formatBytes, formatRate } from '@/global/lib/format-bytes';
import { formatDuration } from '@/global/lib/format-duration';
import { Box, Text, useStdout } from 'ink';

import {
  PdDownloadSummary,
  PdFileState,
  summarize,
  usePdDownloadStore,
} from './download-store';

const MAX_LISTED_FAILURES = 8;

export function PdDownloadProgress() {
  const { status, title, outputDirectory, files, startedAt, finishedAt } =
    usePdDownloadStore();

  const { stdout } = useStdout();
  const elapsed = useElapsed(startedAt, finishedAt);
  const summary = summarize(files);

  const columns = stdout?.columns ?? 80;
  const barWidth = Math.max(10, Math.min(28, columns - 26));
  const done = status === 'done';
  const empty = done && files.length === 0;

  // Byte counts make for a far smoother bar than file counts, but a list of
  // zero-byte files still has to move.
  const value =
    summary.totalBytes > 0 ? summary.progressBytes : summary.settled;
  const total = summary.totalBytes > 0 ? summary.totalBytes : files.length;
  const percent =
    total > 0 ? Math.min(100, Math.floor((value / total) * 100)) : 0;
  const speed = elapsed > 0 ? (summary.downloadedBytes / elapsed) * 1000 : 0;

  const counts = `${files.length} file${files.length === 1 ? '' : 's'} · ${formatBytes(summary.totalBytes)}`;
  // Ink only truncates inside a box of known width, so the directory gets
  // whatever the counts leave behind on the line.
  const pathWidth = Math.max(12, columns - counts.length - 6);

  const fileBarWidth = Math.max(8, Math.min(16, columns - 52));
  const longestName = summary.active.reduce(
    (longest, { file }) => Math.max(longest, file.name.length),
    12,
  );
  const nameWidth = Math.min(
    longestName,
    Math.max(12, columns - fileBarWidth - 32),
  );

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box gap={1}>
        <Text bold color="cyan">
          pd
        </Text>
        <Text wrap="truncate-end">{title ?? 'pixeldrain list'}</Text>
      </Box>

      {status === 'resolving' ? (
        <Box marginTop={1} gap={1}>
          <Spinner />
          <Text dimColor>reading list…</Text>
        </Box>
      ) : (
        <>
          <Box marginTop={1} gap={1}>
            <Text dimColor>{counts}</Text>
            {!empty && (
              <>
                <Text dimColor>→</Text>
                <Box width={pathWidth}>
                  <Text dimColor wrap="truncate-middle">
                    {outputDirectory}
                  </Text>
                </Box>
              </>
            )}
          </Box>

          <Box marginTop={1} gap={1}>
            <StatusIcon done={done} failed={summary.failures.length > 0} />
            {!empty && (
              <>
                <ProgressBar value={value} total={total} width={barWidth} />
                <Text bold>{`${String(percent).padStart(3)}%`}</Text>
                <Text dimColor>{`${summary.settled}/${files.length}`}</Text>
              </>
            )}
          </Box>

          <Box marginLeft={2} gap={1}>
            {done ? (
              <Summary summary={summary} elapsed={elapsed} empty={empty} />
            ) : (
              <Text dimColor>
                {`${formatBytes(summary.progressBytes)}/${formatBytes(summary.totalBytes)} · ${formatRate(speed)} · ${formatDuration(elapsed)}`}
              </Text>
            )}
          </Box>
        </>
      )}

      {!done && summary.active.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {summary.active.map(({ index, file }) => (
            <ActiveFile
              key={index}
              file={file}
              nameWidth={nameWidth}
              barWidth={fileBarWidth}
            />
          ))}
        </Box>
      )}

      {done && summary.failures.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="red">
            failed
          </Text>
          {summary.failures.slice(0, MAX_LISTED_FAILURES).map((failure) => (
            <Box key={failure.name} marginLeft={2} gap={1}>
              <Text color="red">✖</Text>
              <Text wrap="truncate-end">
                {failure.name}
                <Text dimColor>{`  ${failure.reason}`}</Text>
              </Text>
            </Box>
          ))}
          {summary.failures.length > MAX_LISTED_FAILURES && (
            <Box marginLeft={4}>
              <Text dimColor>
                {`+${summary.failures.length - MAX_LISTED_FAILURES} more`}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function ActiveFile({
  file,
  nameWidth,
  barWidth,
}: {
  file: PdFileState;
  nameWidth: number;
  barWidth: number;
}) {
  const percent =
    file.size > 0
      ? Math.min(100, Math.floor((file.received / file.size) * 100))
      : 0;

  return (
    <Box marginLeft={2} gap={1}>
      <Text color="cyan">↓</Text>
      <Box width={nameWidth}>
        <Text wrap="truncate-middle">{file.name}</Text>
      </Box>
      <ProgressBar
        value={file.received}
        total={file.size}
        width={barWidth}
        color="green"
      />
      <Text dimColor>{`${String(percent).padStart(3)}%`}</Text>
      <Text dimColor>
        {`${formatBytes(file.received)}/${formatBytes(file.size)}`}
      </Text>
    </Box>
  );
}

function StatusIcon({ done, failed }: { done: boolean; failed: boolean }) {
  if (!done) return <Spinner />;

  return failed ? <Text color="yellow">⚠</Text> : <Text color="green">✔</Text>;
}

function Summary({
  summary,
  elapsed,
  empty,
}: {
  summary: PdDownloadSummary;
  elapsed: number;
  empty: boolean;
}) {
  if (empty) return <Text dimColor>list is empty</Text>;

  // One Text so a narrow terminal wraps the summary by word instead of
  // stacking each fragment into its own column.
  return (
    <Text>
      <Text color="green">{`${summary.completed} downloaded`}</Text>
      {summary.skipped > 0 && (
        <Text dimColor>{` · ${summary.skipped} already present`}</Text>
      )}
      {summary.failures.length > 0 && (
        <Text color="red">{` · ${summary.failures.length} failed`}</Text>
      )}
      <Text dimColor>
        {` · ${formatBytes(summary.downloadedBytes)} in ${formatDuration(elapsed)}`}
      </Text>
    </Text>
  );
}
