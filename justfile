#!/usr/bin/env just --justfile

_default:
    @just --list

set shell := ["sh", "-c"]

# Build and publish to Docker registry
publish:
    @./build_and_publish.sh

# Build locally for testing
build:
    docker build -t jensbech/econ:test .

# Run locally (reads from .env.local)
run:
    docker run -p 3000:3000 --env-file .env.local jensbech/econ:test

# Clean up local test image
clean:
    docker rmi jensbech/econ:test 2>/dev/null || true
