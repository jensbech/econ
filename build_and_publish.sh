#!/usr/bin/env sh
set -e

MAJOR_VERSION="1"

IMAGE_NAME=${1:-"jensbech/econ"}
PLATFORMS=${PLATFORMS:-"linux/amd64"}

VERSION="v${MAJOR_VERSION}.0.0"
if docker manifest inspect "$IMAGE_NAME:latest" >/dev/null 2>&1; then
  VERSION="v${MAJOR_VERSION}.$(date +%Y%m%d%H%M%S).0"
fi

GIT_COMMIT=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Building and publishing:"
echo "  Image: $IMAGE_NAME"
echo "  Version: $VERSION"
echo "  Git commit: $GIT_COMMIT"
echo "  Branch: $GIT_BRANCH"
echo "  Platforms: $PLATFORMS"

set -- \
  --platform "$PLATFORMS" \
  --tag "$IMAGE_NAME:latest" \
  --tag "$IMAGE_NAME:$VERSION" \
  --file Dockerfile \
  --output type=registry

if [ -n "$DOCKER_BUILD_ARGS" ]; then
  for kv in $DOCKER_BUILD_ARGS; do
    set -- "$@" --build-arg "$kv"
  done
fi

docker buildx build "$@" .

echo ""
echo "Published:"
echo "   $IMAGE_NAME:latest"
echo "   $IMAGE_NAME:$VERSION"
