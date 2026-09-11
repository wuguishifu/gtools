#!/bin/bash

set -e

BUMP_TYPE=${1:-patch}

if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo "Invalid bump type: $BUMP_TYPE"
    echo "Usage: $0 [major|minor|patch]"
    exit 1
fi

echo "Bumping version: $BUMP_TYPE"

LAST_TAG=$(git ls-remote --refs --tags origin "v*" | cut -f2 | sed 's/refs\/tags\///' | sort -V -r | head -1)

# No tags yet: start from v0.0.0 so a `major` bump publishes exactly 1.0.0.
if [ -z "$LAST_TAG" ]; then
    LAST_TAG="v0.0.0"
fi

echo "Last tag: $LAST_TAG"

VERSION_ONLY=$(echo $LAST_TAG | sed 's/^v//')
echo "Version only: $VERSION_ONLY"

IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION_ONLY"

echo "Parsed version components: MAJOR=$MAJOR, MINOR=$MINOR, PATCH=$PATCH"

if [[ -z "$MAJOR" || -z "$MINOR" || -z "$PATCH" ]]; then
    echo "Failed to parse version from tag: $LAST_TAG"
    exit 1
fi

echo "Current version: $MAJOR.$MINOR.$PATCH"

case $BUMP_TYPE in
    major)
        NEW_MAJOR=$((MAJOR + 1))
        NEW_MINOR=0
        NEW_PATCH=0
        ;;
    minor)
        NEW_MAJOR=$MAJOR
        NEW_MINOR=$((MINOR + 1))
        NEW_PATCH=0
        ;;
    patch)
        NEW_MAJOR=$MAJOR
        NEW_MINOR=$MINOR
        NEW_PATCH=$((PATCH + 1))
        ;;
esac

NEW_VERSION="$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"

echo "New version: $NEW_VERSION"

if [ -n "$GITHUB_OUTPUT" ]; then
    echo "version=$NEW_VERSION" >> $GITHUB_OUTPUT
fi
