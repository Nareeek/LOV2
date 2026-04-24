#!/usr/bin/env bash
set -e

docker compose run --rm web sh -lc "pnpm check"
docker compose run --rm web sh -lc "pnpm test"
