-- Runs automatically the first time the Postgres container starts
-- (mounted into /docker-entrypoint-initdb.d by docker-compose).

CREATE TABLE IF NOT EXISTS books (
  id     SERIAL PRIMARY KEY,
  title  TEXT NOT NULL,
  author TEXT NOT NULL,
  year   INTEGER
);

INSERT INTO books (title, author, year) VALUES
  ('The Pragmatic Programmer', 'Andrew Hunt & David Thomas', 1999),
  ('Clean Code', 'Robert C. Martin', 2008),
  ('The Go Programming Language', 'Donovan & Kernighan', 2015)
ON CONFLICT DO NOTHING;
