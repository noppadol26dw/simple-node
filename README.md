# simple-node — Books API

A small REST API built with **Express** and backed by **Postgres**.
It exposes CRUD endpoints for a `books` resource and is packaged to run
with Docker / docker-compose.

## Tech stack

Node.js 18+, [Express](https://expressjs.com) 5, [node-postgres (`pg`)](https://node-postgres.com).

## Getting started

### Run locally (without Docker)

Requires Node 18+ and a running Postgres.

```bash
npm install
cp .env.example .env          # adjust DB settings as needed
psql -d books -f db/init.sql  # create the schema
npm start
```

### Run with Docker

Brings up the API **and** Postgres together, seeded with sample data:

```bash
docker compose up --build
```

Then:

```bash
curl localhost:3000/books
curl -X POST localhost:3000/books \
  -H 'Content-Type: application/json' \
  -d '{"title":"Dune","author":"Frank Herbert","year":1965}'
```

Tear down (add `-v` to also wipe the database volume):

```bash
docker compose down
```

### Build just the image

```bash
docker build -t simple-node .
```

The image needs a reachable Postgres — configure it via the `DB_*` environment
variables (see `.env.example`).

## API

| Method | Path         | Description         |
| ------ | ------------ | ------------------- |
| GET    | `/`          | Service info        |
| GET    | `/health`    | Liveness + DB check |
| GET    | `/books`     | List all books      |
| GET    | `/books/:id` | Get one book        |
| POST   | `/books`     | Create a book       |
| PUT    | `/books/:id` | Replace a book      |
| DELETE | `/books/:id` | Delete a book       |

Book shape:

```json
{ "title": "string (required)", "author": "string (required)", "year": 2020 }
```

## Configuration

| Variable      | Default     | Description       |
| ------------- | ----------- | ----------------- |
| `PORT`        | `3000`      | HTTP port         |
| `DB_HOST`     | `localhost` | Postgres host     |
| `DB_PORT`     | `5432`      | Postgres port     |
| `DB_USER`     | `postgres`  | Postgres user     |
| `DB_PASSWORD` | `postgres`  | Postgres password |
| `DB_NAME`     | `books`     | Postgres database |

## Scripts

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm start`            | Start the server                          |
| `npm run dev`          | Start with auto-reload (`node --watch`)   |
| `npm run format`       | Format the whole project with Prettier    |
| `npm run format:check` | Check formatting without writing (for CI) |

## DevOps teaching stack

Docker Compose lessons layered on this app.

| What                    | Command                                                    | Teaches                                                                                                          |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Dev (default)           | `docker compose up`                                        | `override.yml` auto-loads: bind-mount + `node --watch`, ports for api (`:3000`) and db (`:5432`)                 |
| Prod-like               | `docker compose -f docker-compose.yml up`                  | base only — api hidden behind nginx, no dev ports                                                                |
| Reverse proxy + scaling | `docker compose -f docker-compose.yml up -d --scale api=3` | nginx (`:8080`) round-robins 3 replicas; `curl -I localhost:8080` → the `X-Served-By` header changes per request |
| Observability           | `docker compose --profile observability up`                | Prometheus (`:9090`) + Grafana (`:3001`) — opt-in via `profiles:`                                                |

Run the full stack with 3 API replicas, metrics, and dashboards:

```bash
docker compose -f docker-compose.yml --profile observability up -d --scale api=3
```

| Service    | URL                                     | What it shows                             |
| ---------- | --------------------------------------- | ----------------------------------------- |
| API        | http://localhost:8080                   | load-balanced across replicas via nginx   |
| Prometheus | http://localhost:9090                   | scrape targets + PromQL                   |
| Grafana    | http://localhost:3001/d/system-overview | one dashboard: traffic, runtime, Postgres |

- nginx re-resolves `api` via Docker DNS (`nginx/nginx.conf`) so scaled replicas join without a reload.
- Prometheus uses `dns_sd_configs` (`prometheus/prometheus.yml`) — one scrape target per replica, plus a static `postgres` job for the exporter.
- Grafana's datasource **and** the System Overview dashboard are auto-provisioned (`grafana/provisioning/`); anonymous admin is on (demo only).

> Scaling needs the base file (no published api host port). The dev `override.yml` publishes `:3000`, which pins one host port and blocks `--scale`.

**Full walkthrough:** [docs/devops-teaching.md](docs/devops-teaching.md) — lesson-by-lesson, with what to observe at each step.
