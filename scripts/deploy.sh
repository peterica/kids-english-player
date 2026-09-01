#!/usr/bin/env bash
#
# 상시 실행 서버로 배포한다.
#
#   scripts/deploy.sh
#
# 서버 정보는 환경변수로 넘기거나 scripts/deploy.env 에 적어 둔다(커밋되지 않는다).
#   DEPLOY_HOST=user@server
#   DEPLOY_PATH=/path/to/kids-english-player
#   DEPLOY_URL=http://server:3200      # 기동 확인용, 없으면 서버 내부에서 확인
#
# 하는 일
#   1. 원격 DB 백업          data/app.db → backup/app-<날짜>.db
#   2. 소스 동기화           .env / data/ 는 제외 (서버 설정·학습 데이터 보존)
#   3. 재빌드 후 기동        docker compose up -d --build
#   4. 기동 확인             HTTP 200 이 나올 때까지 대기
#   5. 빌드 캐시 정리        캐시 상한을 넘긴 만큼만 삭제 (배포마다 쌓여 디스크를 채우는 것을 막는다)
#
# 백업과 빌드 캐시는 자동으로 정리된다. 배포를 반복해도 디스크가 계속 차지 않는다.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
[ -f scripts/deploy.env ] && . scripts/deploy.env

HOST="${DEPLOY_HOST:?DEPLOY_HOST 가 필요하다. 예: DEPLOY_HOST=user@server scripts/deploy.sh}"
DIR="${DEPLOY_PATH:?DEPLOY_PATH 가 필요하다. 예: DEPLOY_PATH=/srv/kids-english-player}"
URL="${DEPLOY_URL:-}"
CACHE_LIMIT="${DEPLOY_CACHE_LIMIT:-5GB}"
BACKUP_KEEP="${DEPLOY_BACKUP_KEEP:-20}"
REMOTE_PATH_PREFIX="export PATH=/opt/homebrew/bin:/usr/local/bin:\$PATH"

step() { printf "\n\033[1m▶ %s\033[0m\n" "$1"; }

step "1/5 원격 DB 백업"
ssh "$HOST" "$REMOTE_PATH_PREFIX
  mkdir -p '$DIR/backup'
  if [ -f '$DIR/data/app.db' ]; then
    sqlite3 '$DIR/data/app.db' \".backup '$DIR/backup/app-\$(date +%Y%m%d-%H%M).db'\"
    # 최근 $BACKUP_KEEP 개만 남긴다. 배포할 때마다 쌓여 디스크를 채우는 것을 막는다.
    ls -1t '$DIR/backup'/app-*.db 2>/dev/null | tail -n +\$(( $BACKUP_KEEP + 1 )) | xargs -r rm -f
    echo \"  백업 완료 (보관 \$(ls -1 '$DIR/backup'/app-*.db 2>/dev/null | wc -l | tr -d ' ')개)\"
  else
    echo '  DB 파일이 없다(첫 배포). 건너뛴다'
  fi"

step "2/5 소스 동기화"
rsync -az --delete \
  --exclude 'node_modules/' --exclude '.next/' --exclude 'data/' --exclude '.env' \
  --exclude '*.tsbuildinfo' --exclude '.DS_Store' --exclude 'next-env.d.ts' \
  --exclude 'backup/' --exclude '.idea/' --exclude '.vscode/' --exclude 'task/' \
  -e ssh ./ "$HOST:$DIR/"
echo "  동기화 완료"

step "3/5 재빌드 후 기동"
ssh "$HOST" "$REMOTE_PATH_PREFIX
  docker compose -f '$DIR/docker-compose.yml' --project-directory '$DIR' up -d --build" \
  | tail -3

step "4/5 기동 확인"
for i in $(seq 1 20); do
  if [ -n "$URL" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL/intro" || echo 000)
  else
    code=$(ssh "$HOST" "curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3200/intro" || echo 000)
  fi
  if [ "$code" = "200" ]; then
    echo "  정상 기동 (HTTP 200, ${i}회차)"
    break
  fi
  if [ "$i" = "20" ]; then
    echo "  기동 확인 실패 (마지막 응답: $code)" >&2
    ssh "$HOST" "$REMOTE_PATH_PREFIX; docker logs --tail 30 kids-english-player-v2" >&2
    exit 1
  fi
  sleep 3
done

step "5/5 빌드 캐시 정리 (상한 $CACHE_LIMIT)"
ssh "$HOST" "$REMOTE_PATH_PREFIX
  # 최근 캐시는 남겨 다음 빌드를 빠르게 하고, 상한을 넘는 오래된 것만 지운다.
  # --max-used-space 를 지원하지 않는 구버전에서는 3일 지난 캐시를 지운다.
  docker builder prune -f --max-used-space '$CACHE_LIMIT' 2>/dev/null \
    || docker builder prune -f --filter until=72h
  # 태그 없는 이미지만 정리한다. 다른 프로젝트의 이미지는 건드리지 않는다.
  docker image prune -f > /dev/null
  echo
  docker system df" | sed 's/^/  /'

printf "\n\033[1m배포 완료\033[0m\n"
