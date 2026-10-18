#!/bin/bash

# Docker Hub Push Script for HA-Fusion

set -e

DOCKERHUB_USERNAME="islamek"
DOCKERHUB_REPO="ha-fusion"
VERSION=${1:-latest}
PORT=${2:-5050}

FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}"

echo "=================================="
echo "Docker Hub Push Script - HA-Fusion"
echo "=================================="
echo "Username: $DOCKERHUB_USERNAME"
echo "Repository: $DOCKERHUB_REPO"
echo "Tag: $VERSION"
echo "Port: $PORT"
echo "Full image name: $FULL_IMAGE_NAME"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if already logged in, if not, prompt for login
echo "Checking Docker Hub authentication..."
if ! docker info 2>/dev/null | grep -q "Username: $DOCKERHUB_USERNAME"; then
    echo ""
    echo "Please log in to Docker Hub:"
    docker login
    echo ""
fi

# Check if --no-cache flag should be used
NO_CACHE_FLAG=""
if [ "$3" == "--no-cache" ]; then
    NO_CACHE_FLAG="--no-cache"
    echo "Building with --no-cache flag..."
fi

# Build the image for linux/amd64 platform
echo "Building Docker image for linux/amd64..."
docker build --platform linux/amd64 \
  $NO_CACHE_FLAG \
  --build-arg VERSION="$VERSION" \
  -t ha-fusion:latest .

# Tag the image for Docker Hub
echo ""
echo "Tagging image as $FULL_IMAGE_NAME..."
docker tag ha-fusion:latest $FULL_IMAGE_NAME

# Also tag as latest if a version was specified
if [ "$VERSION" != "latest" ]; then
    echo "Also tagging as ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest..."
    docker tag ha-fusion:latest ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest
fi

# Push to Docker Hub
echo ""
echo "Pushing to Docker Hub..."
docker push "$FULL_IMAGE_NAME"

if [ "$VERSION" != "latest" ]; then
    echo "Pushing latest tag to Docker Hub..."
    docker push "${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest"
fi