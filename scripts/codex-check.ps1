param(
  [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

switch ($Target) {
  "api" {
    docker compose run --rm api sh -lc "pnpm --filter @lov2/api check && pnpm --filter @lov2/api test"
  }

  "web" {
    docker compose run --rm web sh -lc "pnpm --filter @lov2/web check && pnpm --filter @lov2/web test"
  }

  "shared" {
    docker compose run --rm web sh -lc "pnpm --filter @lov2/shared check && pnpm --filter @lov2/shared test"
  }

  "game-data" {
    docker compose run --rm web sh -lc "pnpm --filter @lov2/game-data check && pnpm --filter @lov2/game-data test"
  }

  "worker" {
    docker compose run --rm worker sh -lc "pnpm --filter @lov2/worker check && pnpm --filter @lov2/worker test"
  }

  "all" {
    docker compose run --rm api sh -lc "pnpm lint && pnpm check && pnpm test"
  }

  default {
    Write-Error "Usage: powershell -ExecutionPolicy Bypass -File scripts/codex-check.ps1 [api|web|shared|game-data|worker|all]"
    exit 1
  }
}
