#!/usr/bin/env bash
set -e

docker compose run --rm api sh -lc "pnpm lint && pnpm check && pnpm test"
