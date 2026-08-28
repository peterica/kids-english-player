#!/bin/sh
set -e

echo "[kids-english-player-v2] applying database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[kids-english-player-v2] seeding content library (idempotent)..."
node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts || echo "[kids-english-player-v2] seed skipped (see log above)"

echo "[kids-english-player-v2] starting server on ${HOSTNAME}:${PORT}"
exec node server.js
