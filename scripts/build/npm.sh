#!/bin/bash

set -e

VERSION=$(node -p "require('./package.json').version")

echo "Building npm bundle (version $VERSION)"

rm -rf dist

# --packages external leaves every bare import (ink, react, commander, sharp)
# to be resolved from node_modules at runtime, so only gtools' own source is
# bundled. This is also what keeps ink's lazy react-devtools-core import lazy.
bun build src/index.ts \
  --target=node \
  --outdir dist \
  --packages external \
  --banner '#!/usr/bin/env node' \
  --define "process.env.GTOOLS_BUILD_VERSION=\"$VERSION\""

echo "Built dist/index.js"
