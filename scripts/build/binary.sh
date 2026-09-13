#!/bin/bash

set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <bun-target> <outfile>"
  echo "Example: $0 bun-darwin-arm64 gtools-macos-arm64"
  exit 1
fi

TARGET=$1
OUTFILE=$2
VERSION=$(node -p "require('./package.json').version")

echo "Building $OUTFILE for $TARGET (version $VERSION)"

# sharp is a native addon and can never load from inside a compiled binary, so
# it is left external: the dynamic import fails at runtime and the vips backend
# takes over. Keeping it external also keeps the failure catchable, because a
# bundled static import would be hoisted and crash at startup instead.
bun build src/index.ts \
  --compile \
  --target="$TARGET" \
  --outfile "$OUTFILE" \
  --external sharp \
  --define "process.env.GTOOLS_VERSION=\"$VERSION\""

echo "Built $OUTFILE"
