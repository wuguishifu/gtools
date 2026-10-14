import { ProgressBar } from '@/global/components/progress-bar';
import { Spinner } from '@/global/components/spinner';
import { useElapsed } from '@/global/hooks/use-elapsed';
import { formatBytes } from '@/global/lib/format-bytes';
import { formatDuration } from '@/global/lib/format-duration';
import { Box, Static, Text, useStdout } from 'ink';
import { useMemo } from 'react';

import { DiffFile, DiffMode, DiffSide, useDiffStore } from './lib/diff-store';

const MAX_LISTED_FAILURES = 8;

type ReportRow =
  | {
      kind: 'header';
      key: string;
      left: DiffSide;
      right: DiffSide;
      caseInsensitive: boolean;
    }
  | { kind: 'section'; key: string; side: DiffSide; target?: DiffSide }
  | { kind: 'file'; key: string; file: DiffFile };

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function totalSize(files: DiffFile[]) {
  return files.reduce((total, file) => total + file.size, 0);
}

/**
 * The file listing can run to thousands of lines, so it is written once
 * through <Static> instead of being redrawn with every progress update.
 */
function buildRows(
  mode: DiffMode,
  caseInsensitive: boolean,
  left?: DiffSide,
  right?: DiffSide,
) {
  if (!left || !right) return [];

  const rows: ReportRow[] = [
    { kind: 'header', key: 'header', left, right, caseInsensitive },
  ];

  for (const [side, target] of [
    [left, right],
    [right, left],
  ]) {
    if (side.only.length === 0) continue;

    rows.push({
      kind: 'section',
      key: `section:${side.root}`,
      side,
      target: mode === 'report' ? undefined : target,
    });

    for (const file of side.only) {
      rows.push({ kind: 'file', key: `${side.root}:${file.path}`, file });
    }
  }

  return rows;
}

export function DiffReport() {
  const { status, mode, caseInsensitive, left, right } = useDiffStore();
  const rows = useMemo(
    () => buildRows(mode, caseInsensitive, left, right),
    [mode, caseInsensitive, left, right],
  );

  return (
    <>
      <Static items={rows}>{(row) => <Row key={row.key} row={row} />}</Static>
      <Box flexDirection="column" paddingX={1} paddingBottom={1}>
        {status === 'scanning' ? <Scanning /> : <Footer />}
      </Box>
    </>
  );
}

// Rows are single wrapping <Text> runs rather than flex rows, so long paths
// wrap onto the next line instead of squeezing their neighbours.
function Row({ row }: { row: ReportRow }) {
  switch (row.kind) {
    case 'header':
      return (
        <Box paddingX={1} paddingTop={1}>
          <Text>
            <Text bold color="cyan">
              diff
            </Text>
            {` ${row.left.label} `}
            <Text dimColor>↔</Text>
            {` ${row.right.label}`}
            {row.caseInsensitive && <Text dimColor> · case-insensitive</Text>}
          </Text>
        </Box>
      );
    case 'section':
      return (
        <Box paddingX={1} marginTop={1}>
          <Text>
            <Text bold color="yellow">{`only in ${row.side.label}`}</Text>
            <Text dimColor>
              {` · ${plural(row.side.only.length, 'file')} · ${formatBytes(totalSize(row.side.only))}`}
              {row.target && ` · copy to ${row.target.label}`}
            </Text>
          </Text>
        </Box>
      );
    case 'file':
      return (
        <Box paddingX={1} marginLeft={2}>
          <Text>
            {row.file.path}
            <Text dimColor>{` ${formatBytes(row.file.size)}`}</Text>
          </Text>
        </Box>
      );
  }
}

function Scanning() {
  return (
    <Box marginTop={1} gap={1}>
      <Spinner />
      <Text dimColor>scanning…</Text>
    </Box>
  );
}

function Footer() {
  const { status, mode, left, right, shared } = useDiffStore();

  if (!left || !right) return null;

  const missing = left.only.length + right.only.length;

  if (missing === 0) {
    return (
      <Box marginTop={1} gap={1}>
        <Text color="green">✔</Text>
        <Text>same files</Text>
        <Text dimColor>{`· ${plural(shared, 'file')} in each`}</Text>
      </Box>
    );
  }

  if (mode === 'apply') {
    return status === 'done' ? <SyncSummary /> : <SyncProgress />;
  }

  const bytes = totalSize(left.only) + totalSize(right.only);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box gap={1}>
        <Text color="yellow">≠</Text>
        {mode === 'dry-run' ? (
          <Text>{`dry run · would copy ${plural(missing, 'file')} · ${formatBytes(bytes)}`}</Text>
        ) : (
          <Text>{`${plural(missing, 'file')} missing from one side · ${shared} shared`}</Text>
        )}
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>
          {mode === 'dry-run'
            ? 'add --apply to copy them'
            : 'add --sync to preview copying them across'}
        </Text>
      </Box>
    </Box>
  );
}

function SyncProgress() {
  const {
    totalBytes,
    copiedBytes,
    copiedFiles,
    failures,
    activeFile,
    left,
    right,
  } = useDiffStore();

  const { stdout } = useStdout();
  const barWidth = Math.max(10, Math.min(28, (stdout?.columns ?? 80) - 24));
  const totalFiles = (left?.only.length ?? 0) + (right?.only.length ?? 0);
  const processed = copiedFiles + failures.length;

  // Byte progress tracks large media better, but a set of empty files has no
  // bytes to measure, so fall back to counting files.
  const [value, total] =
    totalBytes > 0 ? [copiedBytes, totalBytes] : [processed, totalFiles];
  const percent = total > 0 ? Math.floor((value / total) * 100) : 0;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box gap={1}>
        <Spinner />
        <ProgressBar value={value} total={total} width={barWidth} />
        <Text bold>{`${String(percent).padStart(3)}%`}</Text>
        <Text dimColor>{`${processed}/${totalFiles}`}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor wrap="truncate-middle">
          {activeFile ?? ''}
        </Text>
      </Box>
    </Box>
  );
}

function SyncSummary() {
  const { copiedFiles, copiedBytes, failures, startedAt, finishedAt } =
    useDiffStore();

  const elapsed = useElapsed(startedAt, finishedAt);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box gap={1}>
        {failures.length > 0 ? (
          <Text color="yellow">⚠</Text>
        ) : (
          <Text color="green">✔</Text>
        )}
        <Text color="green">{`copied ${plural(copiedFiles, 'file')}`}</Text>
        {failures.length > 0 && (
          <Text color="red">{`· ${failures.length} failed`}</Text>
        )}
        <Text dimColor>
          {`· ${formatBytes(copiedBytes)} · ${formatDuration(elapsed)}`}
        </Text>
      </Box>

      {failures.length > 0 && (
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
