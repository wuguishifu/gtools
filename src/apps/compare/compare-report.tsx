import { Box, Static, Text } from 'ink';
import { useMemo } from 'react';

import {
  CompareResult,
  Difference,
  useCompareStore,
} from './lib/compare-store';

// A whole added subtree or a top-level type change can print an entire
// document, so long JSON values are cut short.
const MAX_VALUE_LENGTH = 200;

type ReportRow =
  | { kind: 'header'; key: string; result: CompareResult }
  | {
      kind: 'difference';
      key: string;
      difference: Difference;
      result: CompareResult;
      locationWidth: number;
    };

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function truncate(value: string, result: CompareResult) {
  if (result.format === 'text' || value.length <= MAX_VALUE_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_VALUE_LENGTH)}…`;
}

/**
 * The differences can run to thousands of lines, so they are written once
 * through <Static>.
 */
function buildRows(result?: CompareResult) {
  if (!result) return [];

  // Line numbers are right-aligned so the text after them lines up.
  const locationWidth =
    result.format === 'text'
      ? Math.max(0, ...result.differences.map((d) => d.location.length))
      : 0;

  return [
    { kind: 'header', key: 'header', result },
    ...result.differences.map((difference, index) => ({
      kind: 'difference' as const,
      key: String(index),
      difference,
      result,
      locationWidth,
    })),
  ] satisfies ReportRow[];
}

export function CompareReport() {
  const { result } = useCompareStore();
  const rows = useMemo(() => buildRows(result), [result]);

  return (
    <>
      <Static items={rows}>{(row) => <Row key={row.key} row={row} />}</Static>
      {result && (
        <Box flexDirection="column" paddingX={1} paddingBottom={1}>
          <Footer result={result} />
        </Box>
      )}
    </>
  );
}

function Row({ row }: { row: ReportRow }) {
  if (row.kind === 'header') {
    const { left, right, format, options, differences } = row.result;

    return (
      <Box flexDirection="column" paddingX={1} paddingTop={1}>
        <Text>
          <Text bold color="cyan">
            compare
          </Text>
          {` ${left} `}
          <Text dimColor>↔</Text>
          {` ${right}`}
          <Text dimColor>{` · ${format}`}</Text>
          {options.orderInsensitive && (
            <Text dimColor> · order-insensitive</Text>
          )}
        </Text>
        {differences.length > 0 && (
          <Box marginTop={1}>
            <Text dimColor>
              <Text color="red">-</Text>
              {` only in ${left} · `}
              <Text color="green">+</Text>
              {` only in ${right}`}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  const { difference, result, locationWidth } = row;
  const location = (
    <Text dimColor>{`${difference.location.padStart(locationWidth)}  `}</Text>
  );

  // Rows are single wrapping <Text> runs rather than flex rows, so long lines
  // wrap onto the next line instead of squeezing their neighbours.
  switch (difference.kind) {
    case 'removed':
    case 'added': {
      const removed = difference.kind === 'removed';

      return (
        <Box paddingX={1} marginLeft={2}>
          <Text>
            <Text color={removed ? 'red' : 'green'}>
              {removed ? '- ' : '+ '}
            </Text>
            {location}
            {truncate(difference.value, result)}
          </Text>
        </Box>
      );
    }
    case 'changed':
      return (
        <Box paddingX={1} marginLeft={2}>
          <Text>
            <Text color="yellow">~ </Text>
            {location}
            <Text color="red">{truncate(difference.left, result)}</Text>
            <Text dimColor> → </Text>
            <Text color="green">{truncate(difference.right, result)}</Text>
          </Text>
        </Box>
      );
    case 'moved':
      return (
        <Box paddingX={1} marginLeft={2}>
          <Text>
            <Text color="cyan">↕ </Text>
            {location}
            <Text dimColor>
              {`moved from position ${difference.from} to ${difference.to}`}
            </Text>
          </Text>
        </Box>
      );
  }
}

function Footer({ result }: { result: CompareResult }) {
  const { options, differences } = result;

  if (differences.length === 0) {
    return (
      <Box marginTop={1} gap={1}>
        <Text color="green">✔</Text>
        <Text>
          {options.orderInsensitive ? 'same contents, ignoring order' : 'same'}
        </Text>
      </Box>
    );
  }

  const count = (kind: Difference['kind']) =>
    differences.filter((difference) => difference.kind === kind).length;

  // The legend in the header already names each side, so the counts reuse its
  // signs rather than repeating what can be long paths.
  const parts = (
    [
      ['removed', 'red', '-'],
      ['added', 'green', '+'],
      ['changed', 'yellow', '~'],
      ['moved', 'cyan', '↕'],
    ] as const
  )
    .map(([kind, color, sign]) => ({ kind, color, sign, total: count(kind) }))
    .filter(({ total }) => total > 0);

  return (
    <Box marginTop={1}>
      <Text>
        <Text color="yellow">≠ </Text>
        {plural(differences.length, 'difference')}
        {parts.map(({ kind, color, sign, total }) => (
          <Text key={kind}>
            <Text dimColor> · </Text>
            <Text color={color}>{`${sign}${total}`}</Text>
            {(kind === 'changed' || kind === 'moved') && (
              <Text dimColor>{` ${kind}`}</Text>
            )}
          </Text>
        ))}
      </Text>
    </Box>
  );
}
