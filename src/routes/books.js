const express = require('express');
const db = require('../db');

const router = express.Router();

// Wrap async handlers so thrown errors reach the error middleware.
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Basic validation for the request body shared by create + update.
function validateBook(body) {
  const errors = [];
  if (!body || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }
  if (!body || typeof body.author !== 'string' || body.author.trim() === '') {
    errors.push('author is required and must be a non-empty string');
  }
  if (body && body.year !== undefined && !Number.isInteger(body.year)) {
    errors.push('year must be an integer when provided');
  }
  return errors;
}

// GET /books — list all books
router.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await db.query(
      'SELECT id, title, author, year FROM books ORDER BY id'
    );
    res.json(rows);
  })
);

// GET /books/:id — fetch one book
router.get(
  '/:id',
  wrap(async (req, res) => {
    const { rows } = await db.query(
      'SELECT id, title, author, year FROM books WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(rows[0]);
  })
);

// POST /books — create a book
router.post(
  '/',
  wrap(async (req, res) => {
    const errors = validateBook(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    const { title, author, year } = req.body;
    const { rows } = await db.query(
      'INSERT INTO books (title, author, year) VALUES ($1, $2, $3) RETURNING id, title, author, year',
      [title.trim(), author.trim(), year ?? null]
    );
    res.status(201).json(rows[0]);
  })
);

// PUT /books/:id — replace a book
router.put(
  '/:id',
  wrap(async (req, res) => {
    const errors = validateBook(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    const { title, author, year } = req.body;
    const { rows } = await db.query(
      'UPDATE books SET title = $1, author = $2, year = $3 WHERE id = $4 RETURNING id, title, author, year',
      [title.trim(), author.trim(), year ?? null, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(rows[0]);
  })
);

// DELETE /books/:id — remove a book
router.delete(
  '/:id',
  wrap(async (req, res) => {
    const { rowCount } = await db.query('DELETE FROM books WHERE id = $1', [
      req.params.id,
    ]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.status(204).end();
  })
);

module.exports = router;
