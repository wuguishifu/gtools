export function grabEnv<T extends Record<string, string>>(
  variables: T,
): Record<keyof T, string> {
  return Object.fromEntries(
    Object.entries(variables).map(([variableKey, variableName]) => [
      variableKey,
      process.env[variableName],
    ]),
  ) as Record<keyof T, string>;
}
