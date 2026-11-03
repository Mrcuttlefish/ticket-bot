# Grafana dashboard

`dashboard.json` is a Grafana dashboard for the bot's Prometheus metrics. It shows open and stale tickets,
tickets created and closed, and the bot's health (uptime, gateway ping and memory).

## Setup

1. Set `METRICS_TOKEN` in the bot's environment to a long random value (for example `openssl rand -hex 32`),
   and restart the bot. `/metrics` returns 404 until it's set.
2. Add a scrape job to Prometheus. `prometheus.yml` is an example: put your token in `credentials` and your
   bot's address in `targets`.
3. In Grafana, go to **Dashboards → New → Import**, upload `dashboard.json`, and pick your Prometheus data source.

If you run more than one bot, the **Instance** menu at the top switches between them.

## Metrics

All metric names start with `discord_tickets_`.

| Metric | Type | Description |
| --- | --- | --- |
| `info{version}` | gauge | Always 1; the label is the bot's version |
| `uptime_seconds` | gauge | Seconds since the process started |
| `memory_rss_bytes`, `memory_heap_used_bytes` | gauge | Memory use |
| `gateway_ping_milliseconds` | gauge | Discord gateway latency |
| `guilds`, `categories`, `tags` | gauge | Counts |
| `tickets`, `tickets_open`, `tickets_stale` | gauge | Ticket counts |
| `tickets_created_total`, `tickets_closed_total` | counter | Since the bot started (use `increase()` or `rate()`) |
