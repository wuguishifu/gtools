export type JsonObject = Map<string, JsonValue>;

export type JsonValue =
  null | boolean | number | string | JsonValue[] | JsonObject;

const WHITESPACE = /[ \t\n\r]*/y;
const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

/**
 * Parses JSON keeping every object's keys in the order they were written.
 * JSON.parse moves integer-like keys such as "1" ahead of the rest, which
 * would hide or invent ordering differences, so objects become Maps instead.
 */
export function parseJson(text: string): JsonValue {
  // Validate up front so malformed input gets the engine's usual error, and
  // the scanner below can assume well-formed JSON.
  JSON.parse(text);

  let position = 0;

  function skipWhitespace() {
    WHITESPACE.lastIndex = position;
    WHITESPACE.exec(text);
    position = WHITESPACE.lastIndex;
  }

  function parseString(): string {
    const start = position++;

    while (text[position] !== '"') {
      position += text[position] === '\\' ? 2 : 1;
    }

    return JSON.parse(text.slice(start, ++position));
  }

  function parseValue(): JsonValue {
    skipWhitespace();

    switch (text[position]) {
      case '{': {
        const object: JsonObject = new Map();
        position++;
        skipWhitespace();

        if (text[position] === '}') {
          position++;
          return object;
        }

        while (true) {
          skipWhitespace();
          const key = parseString();
          skipWhitespace();
          position++; // :
          object.set(key, parseValue());
          skipWhitespace();
          if (text[position++] === '}') return object;
        }
      }
      case '[': {
        const array: JsonValue[] = [];
        position++;
        skipWhitespace();

        if (text[position] === ']') {
          position++;
          return array;
        }

        while (true) {
          array.push(parseValue());
          skipWhitespace();
          if (text[position++] === ']') return array;
        }
      }
      case '"':
        return parseString();
      case 't':
        position += 4;
        return true;
      case 'f':
        position += 5;
        return false;
      case 'n':
        position += 4;
        return null;
      default: {
        NUMBER.lastIndex = position;
        const [number] = NUMBER.exec(text)!;
        position = NUMBER.lastIndex;
        return Number(number);
      }
    }
  }

  return parseValue();
}

export function isJsonObject(value: JsonValue): value is JsonObject {
  return value instanceof Map;
}

/** Compact JSON text for a parsed value, with keys in their original order. */
export function stringifyJson(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(stringifyJson).join(',')}]`;

  if (isJsonObject(value)) {
    const entries = [...value].map(
      ([key, child]) => `${JSON.stringify(key)}:${stringifyJson(child)}`,
    );
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}
