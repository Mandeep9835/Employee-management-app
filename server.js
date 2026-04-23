const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'employees.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      hire_date TEXT NOT NULL
    )
  `);
}

function validateEmployeeInput(body) {
  const requiredFields = ['name', 'email', 'department', 'role', 'hireDate'];
  for (const field of requiredFields) {
    if (!body[field] || String(body[field]).trim() === '') {
      return `${field} is required`;
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return 'email must be valid';
  }

  if (Number.isNaN(Date.parse(body.hireDate))) {
    return 'hireDate must be a valid date';
  }

  return null;
}

function toEmployeeResponse(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    department: row.department,
    role: row.role,
    hireDate: row.hire_date,
  };
}

app.get('/api/employees', async (req, res, next) => {
  try {
    const { department, search } = req.query;
    const filters = [];
    const params = [];

    if (department) {
      filters.push('department = ?');
      params.push(department);
    }

    if (search) {
      filters.push('(name LIKE ? OR email LIKE ? OR role LIKE ?)');
      const searchValue = `%${search}%`;
      params.push(searchValue, searchValue, searchValue);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await all(
      `SELECT id, name, email, department, role, hire_date FROM employees ${whereClause} ORDER BY id DESC`,
      params,
    );

    res.json(rows.map(toEmployeeResponse));
  } catch (error) {
    next(error);
  }
});

app.get('/api/employees/:id', async (req, res, next) => {
  try {
    const row = await get(
      'SELECT id, name, email, department, role, hire_date FROM employees WHERE id = ?',
      [req.params.id],
    );

    if (!row) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    res.json(toEmployeeResponse(row));
  } catch (error) {
    next(error);
  }
});

app.post('/api/employees', async (req, res, next) => {
  try {
    const validationError = validateEmployeeInput(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const { name, email, department, role, hireDate } = req.body;
    const result = await run(
      'INSERT INTO employees (name, email, department, role, hire_date) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim(), department.trim(), role.trim(), new Date(hireDate).toISOString().slice(0, 10)],
    );

    const created = await get(
      'SELECT id, name, email, department, role, hire_date FROM employees WHERE id = ?',
      [result.lastID],
    );

    res.status(201).json(toEmployeeResponse(created));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'email must be unique' });
      return;
    }
    next(error);
  }
});

app.put('/api/employees/:id', async (req, res, next) => {
  try {
    const validationError = validateEmployeeInput(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const existing = await get('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const { name, email, department, role, hireDate } = req.body;
    await run(
      'UPDATE employees SET name = ?, email = ?, department = ?, role = ?, hire_date = ? WHERE id = ?',
      [
        name.trim(),
        email.trim(),
        department.trim(),
        role.trim(),
        new Date(hireDate).toISOString().slice(0, 10),
        req.params.id,
      ],
    );

    const updated = await get(
      'SELECT id, name, email, department, role, hire_date FROM employees WHERE id = ?',
      [req.params.id],
    );

    res.json(toEmployeeResponse(updated));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'email must be unique' });
      return;
    }
    next(error);
  }
});

app.delete('/api/employees/:id', async (req, res, next) => {
  try {
    const result = await run('DELETE FROM employees WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
    return;
  }

  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
