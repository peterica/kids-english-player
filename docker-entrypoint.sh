#!/bin/sh
set -e

echo "[kids-english-player] applying database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[kids-english-player] seeding curriculum (idempotent)..."
node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts || echo "[kids-english-player] seed skipped (see log above)"

echo "[kids-english-player] starting server on ${HOSTNAME}:${PORT}"
exec node server.js
