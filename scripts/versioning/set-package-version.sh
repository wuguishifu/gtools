#!/bin/bash

set -e

if [ $# -lt 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.0.0"
  exit 1
fi

VERSION=$1
PACKAGE_JSON="package.json"

if [ ! -f "$PACKAGE_JSON" ]; then
  echo "Error: $PACKAGE_JSON not found."
  exit 1
fi

if ! grep -q '^  "version": ".*"' "$PACKAGE_JSON"; then
  echo "Error: no top-level \"version\" field found in $PACKAGE_JSON."
  exit 1
fi

echo "Updating package.json to version $VERSION"

tmpfile="$(mktemp)"
sed 's/^\(  "version": \)".*"/\1"'"$VERSION"'"/' "$PACKAGE_JSON" > "$tmpfile"
mv "$tmpfile" "$PACKAGE_JSON"

echo "Updated $PACKAGE_JSON"
