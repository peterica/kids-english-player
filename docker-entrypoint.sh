#!/bin/sh
set -e

echo "[kids-english-player] applying database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[kids-english-player] starting server on ${HOSTNAME}:${PORT}"
exec node server.js
