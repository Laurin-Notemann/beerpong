#!/usr/bin/env bash
# Builds out/elo-sim.html: one group's games replayed through the API's Elo code
# (api-go/internal/leaderboard), compiled to WebAssembly, with sliders for the
# constants. The page holds real player names and games, so out/ is not
# committed.
#
#   tools/elo-sim/make-page.sh <group id>          export from staging (read only)
#   GAMES_CSV=games.csv tools/elo-sim/make-page.sh  use an export you already have
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$here/out"

if [[ -n "${GAMES_CSV:-}" ]]; then
  cp "$GAMES_CSV" "$work/games.csv"
else
  group_id=${1:?usage: make-page.sh <group id>, or set GAMES_CSV}
  [[ $group_id =~ ^[0-9a-f-]+$ ]] || { echo "not a group id: $group_id" >&2; exit 2; }
  ssh privaten "docker exec -i beerpong-db-staging sh -c 'psql -U \$POSTGRES_USER -d \$POSTGRES_DB -q -v group_id=$group_id -f -'" \
    < "$here/export.sql" > "$work/games.csv"
fi

# The simulator package: its own files plus the API's Elo code, with the
# constants the sliders change turned into variables.
cp "$here"/*.go "$work/"
for f in elo.go leaderboard.go javahash.go; do
  sed 's/^package leaderboard/package main/' "$repo/api-go/internal/leaderboard/$f" > "$work/$f"
done
perl -0pi -e 's/^const \(/var (/m; s/StartingElo = 1500\n/StartingElo = 1500.0\n/' "$work/elo.go"
printf 'module elosim\n\ngo %s\n' "$(cd "$repo/api-go" && go mod edit -json | sed -n 's/.*"Go": "\(.*\)".*/\1/p')" > "$work/go.mod"

(cd "$work" && go run . games.csv data.json)
(cd "$work" && GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o sim.wasm .)
node "$here/inline.mjs" "$here/page.html" "$here/style.css" "$(go env GOROOT)/lib/wasm/wasm_exec.js" \
  "$work/data.json" "$work/sim.wasm" "$here/out/elo-sim.html"
echo "built $here/out/elo-sim.html"
