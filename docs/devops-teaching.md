# DevOps teaching guide

A hands-on tour of Docker Compose, built on the Books API. Four lessons, each
adds one real-world capability. Run them in order — every command is copy-paste.

Prerequisites: Docker Desktop (or Docker Engine + Compose v2). Nothing else.

The stack:

```
            :8080                    :9090            :3001
        ┌─────────┐   round-robin  ┌──────────┐   ┌─────────┐
client →│  nginx  │──┬─→ api ×N ──→│ postgres │   │ grafana │
        └─────────┘  │             └──────────┘   └─────────┘
                     ├─→ api            ↑ db            ↑ datasource
                     └─→ api      ┌────────────┐   ┌──────────┐
                                  │ pg-exporter│←──│prometheus│──→ scrapes api + pg
                                  └────────────┘   └──────────┘
```

---

## Lesson 1 — Dev vs prod with override files

Compose automatically merges `docker-compose.yml` (base) with
`docker-compose.override.yml` when you run plain `docker compose up`.

```bash
docker compose up -d
```

The override adds **development-only** behaviour on top of the base:

- bind-mounts `./src` and `server.js` into the container
- swaps the start command to `node --watch` (live reload)
- publishes `api` on `:3000` and `db` on `:5432` for direct access

```bash
curl localhost:3000/health        # api reachable directly in dev
docker compose down
```

Now run the **base only** — the production-like topology:

```bash
docker compose -f docker-compose.yml up -d
curl localhost:3000/health        # FAILS: no published port in prod
curl localhost:8080/health        # works — traffic goes through nginx
docker compose -f docker-compose.yml down
```

**Takeaway:** one base file describes production; the override layers on dev
conveniences. Passing `-f docker-compose.yml` opts out of the override.

---

## Lesson 2 — Reverse proxy + horizontal scaling

`nginx` is the only published service; `api` lives on the internal network.
Because `api` has no host port, Compose can run many replicas of it.

```bash
docker compose -f docker-compose.yml up -d --scale api=3
```

Watch nginx load-balance across the 3 replicas — the `X-Served-By` header is
the container hostname, and it changes between requests:

```bash
for i in $(seq 1 9); do curl -s -D - -o /dev/null localhost:8080/ | grep -i x-served-by; done
```

How it works (`nginx/nginx.conf`): a variable in `proxy_pass` plus Docker's
embedded DNS resolver (`127.0.0.11`) forces nginx to re-resolve the `api`
service name on a timer, so it round-robins across whatever replicas exist.

**Gotcha worth teaching:** scaling needs the base file. The dev override
publishes `:3000`, and a published host port can only map to one container —
so `--scale api=3` fails while the override is active.

---

## Lesson 3 — Observability (Prometheus + Grafana)

Metrics, scraping, and dashboards are opt-in via a Compose **profile**, so the
core stack stays lean until you ask for them.

```bash
docker compose -f docker-compose.yml --profile observability up -d --scale api=3
```

This adds `prometheus` (:9090), `grafana` (:3001), and `postgres-exporter`.

### The app exposes metrics

`src/app.js` mounts a `/metrics` endpoint via `prom-client`: default process
metrics (CPU, memory, event-loop lag) plus a custom `http_requests_total`
counter labelled by method and status.

```bash
curl localhost:8080/metrics | grep http_requests_total
```

### Prometheus discovers every replica

`prometheus/prometheus.yml` uses `dns_sd_configs` against the `api` service
name. Each replica resolves to its own A record, so scaling automatically adds
scrape targets — open http://localhost:9090/targets and you'll see one entry
per replica, each with its own `instance` label.

Try these in the Prometheus UI (http://localhost:9090):

```promql
up{job="api"}                                  # 1 per healthy replica
sum by (instance) (rate(http_requests_total[1m]))   # per-replica traffic
```

### Grafana, pre-wired

http://localhost:3001 — no login (anonymous admin, demo only). The Prometheus
datasource and the dashboard are **provisioned from files**
(`grafana/provisioning/`), so there's nothing to click through.

---

## Lesson 4 — Monitoring the database

`postgres-exporter` translates Postgres internals into Prometheus metrics.
It connects to `db` and Prometheus scrapes it as a static `postgres` job.

```promql
pg_up                                          # 1 = reachable
pg_stat_database_numbackends{datname="books"}  # active connections
pg_database_size_bytes{datname="books"}        # database size
```

---

## The dashboard

**http://localhost:3001/d/system-overview** — one pane for the whole stack,
auto-provisioned. Four rows:

| Row          | Panels                                                            |
| ------------ | ----------------------------------------------------------------- |
| Health       | replicas up · Postgres up · request rate · error rate             |
| API Traffic  | request rate by replica (load balancing) · by status              |
| Node Runtime | CPU · resident memory · heap · event-loop lag p99 (per replica)   |
| Postgres     | connections · cache hit ratio · db size · deadlocks · tx · tuples |

Generate some load and watch it move:

```bash
for i in $(seq 1 200); do curl -s -o /dev/null localhost:8080/books; done
for i in $(seq 1 20);  do curl -s -o /dev/null localhost:8080/nope;  done   # 404s
```

The "request rate by replica" panel shows the load splitting three ways; the
error-rate panel ticks up from the 404s.

---

## Teardown

```bash
docker compose -f docker-compose.yml --profile observability down -v
```

`-v` removes the named volumes (Postgres data). Grafana keeps no volume — its
config is provisioned from files, so it boots clean every time.

---

## Cheat sheet

| Goal                    | Command                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Dev with live reload    | `docker compose up`                                                                |
| Prod-like               | `docker compose -f docker-compose.yml up`                                          |
| Scale the API           | `docker compose -f docker-compose.yml up -d --scale api=3`                         |
| Full stack + monitoring | `docker compose -f docker-compose.yml --profile observability up -d --scale api=3` |
| Tear everything down    | `docker compose -f docker-compose.yml --profile observability down -v`             |
