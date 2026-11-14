#!/usr/bin/env bash
# Runs a built bot image against a fake Discord and loads its dashboard in headless Chromium.
# Usage: scripts/smoke/run.sh [image]   (default ticket-bot:smoke)
# Needs docker, openssl, node, the repo's node_modules (for ws) and playwright with Chromium.
# SMOKE_EXTRA_CA adds a CA for the bot to trust; SMOKE_DOCKER_ARGS adds arguments to the bot's `docker run` (e.g. a proxy for Prisma's download).
set -euo pipefail

IMAGE="${1:-ticket-bot:smoke}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
PORT="${SMOKE_PORT:-8169}"
FAKE="ticket-smoke-discord-$$"
BOT="ticket-smoke-bot-$$"

cleanup() {
	status=$?
	if [ "$status" -ne 0 ]; then
		echo "::group::bot logs"; docker logs "$BOT" 2>&1 | tail -200 || true; echo "::endgroup::"
		echo "::group::fake Discord logs"; docker logs "$FAKE" 2>&1 | tail -200 || true; echo "::endgroup::"
	fi
	docker rm -f "$BOT" "$FAKE" >/dev/null 2>&1 || true
	rm -rf "$TMP"
	exit "$status"
}
trap cleanup EXIT

# a CA the bot trusts, and a certificate for the Discord hosts
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=smoke CA' \
	-keyout "$TMP/ca.key" -out "$TMP/ca.pem" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -subj '/CN=discord.com' \
	-keyout "$TMP/key.pem" -out "$TMP/cert.csr" 2>/dev/null
printf 'subjectAltName=DNS:discord.com,DNS:discordapp.com,DNS:gateway.discord.gg,DNS:cdn.discordapp.com\n' > "$TMP/ext"
openssl x509 -req -in "$TMP/cert.csr" -CA "$TMP/ca.pem" -CAkey "$TMP/ca.key" -CAcreateserial \
	-days 1 -extfile "$TMP/ext" -out "$TMP/cert.pem" 2>/dev/null
# the bot trusts the fake's CA, plus SMOKE_EXTRA_CA if set (e.g. a proxy's CA)
cat "$TMP/ca.pem" ${SMOKE_EXTRA_CA:+"$SMOKE_EXTRA_CA"} > "$TMP/trust.pem"
chmod 644 "$TMP"/*.pem

docker run -d --name "$FAKE" -p 127.0.0.1:443:443 \
	-v "$ROOT/scripts/smoke:/smoke:ro" -v "$ROOT/node_modules:/node_modules:ro" -v "$TMP:/certs:ro" \
	"${SMOKE_NODE_IMAGE:-node:22-alpine}" node /smoke/fake-discord.js /certs/cert.pem /certs/key.pem >/dev/null

# shellcheck disable=SC2086
docker run -d --name "$BOT" --network host \
	--add-host discord.com:127.0.0.1 --add-host discordapp.com:127.0.0.1 \
	--add-host gateway.discord.gg:127.0.0.1 --add-host cdn.discordapp.com:127.0.0.1 \
	-v "$TMP/trust.pem:/smoke-ca.pem:ro" -e NODE_EXTRA_CA_CERTS=/smoke-ca.pem \
	-e DB_PROVIDER=sqlite -e DISCORD_SECRET=smoke -e DISCORD_TOKEN=smoke.token.value \
	-e ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef \
	-e HTTP_EXTERNAL="http://127.0.0.1:$PORT" -e HTTP_PORT="$PORT" -e SUPER=319467558166069248 \
	${SMOKE_DOCKER_ARGS:-} "$IMAGE" >/dev/null

echo "Waiting for the bot to log in to the fake Discord and start its web server..."
for _ in $(seq 1 90); do
	if curl -fs "http://127.0.0.1:$PORT/status" >/dev/null; then break; fi
	if [ "$(docker inspect -f '{{.State.Running}}' "$BOT")" != true ]; then echo "The bot stopped"; exit 1; fi
	sleep 2
done
curl -fs "http://127.0.0.1:$PORT/status" >/dev/null || { echo "The web server didn't start"; exit 1; }
docker logs "$BOT" 2>&1 | grep -E 'Discord Tickets v|Connected to Discord' || true

node "$ROOT/scripts/smoke/dashboard.cjs" "http://127.0.0.1:$PORT"
