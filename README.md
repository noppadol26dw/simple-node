# simple-node — Books API

A small REST API built with **Express** and backed by **Postgres**.
It exposes CRUD endpoints for a `books` resource and is packaged to run
with Docker / docker-compose.

## API

| Method | Path         | Description        |
| ------ | ------------ | ------------------ |
| GET    | `/`          | Service info       |
| GET    | `/health`    | Liveness + DB check |
| GET    | `/books`     | List all books     |
| GET    | `/books/:id` | Get one book       |
| POST   | `/books`     | Create a book      |
| PUT    | `/books/:id` | Replace a book     |
| DELETE | `/books/:id` | Delete a book      |

Book shape:

```json
{ "title": "string (required)", "author": "string (required)", "year": 2020 }
```

## Run with Docker (recommended)

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

## Build just the image

```bash
docker build -t simple-node .
```

The image is a multi-stage build running as a non-root user. It needs a
reachable Postgres — configure it via the `DB_*` environment variables
(see `.env.example`).

## Run locally without Docker

Requires Node 18+ and a running Postgres.

```bash
npm install
cp .env.example .env   # adjust DB settings as needed
psql -d books -f db/init.sql   # create the schema
npm start
```

## Configuration

| Variable      | Default     | Description          |
| ------------- | ----------- | -------------------- |
| `PORT`        | `3000`      | HTTP port            |
| `DB_HOST`     | `localhost` | Postgres host        |
| `DB_PORT`     | `5432`      | Postgres port        |
| `DB_USER`     | `postgres`  | Postgres user        |
| `DB_PASSWORD` | `postgres`  | Postgres password    |
| `DB_NAME`     | `books`     | Postgres database    |
