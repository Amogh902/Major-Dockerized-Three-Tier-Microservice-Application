const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = process.env.PORT || 3001;

// Function to create and maintain DB connection with retry
const connectWithRetry = () => {
  const db = mysql.createConnection({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'studentdb'
  });

  db.connect(err => {
    if (err) {
      console.error('❌ DB connect error (view):', err.message);
      console.log('Retrying in 5 seconds...');
      setTimeout(connectWithRetry, 5000); // Retry after 5 sec
      return;
    }

    console.log('✅ View service connected to DB');
    startServer(db);
  });
};

const startServer = (db) => {
  // HTML table view
  app.get('/', (req, res) => {
    const query = 'SELECT id, name, email, course, created_at FROM students ORDER BY created_at DESC';
    db.query(query, (err, rows) => {
      if (err) {
        console.error('❌ Query error:', err.message);
        return res.status(500).send('Database error');
      }

      let html = `
        <h1>Registered Students</h1>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr><th>ID</th><th>Name</th><th>Email</th><th>Course</th><th>Registered At</th></tr>
      `;
      rows.forEach(s => {
        html += `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.email}</td><td>${s.course}</td><td>${s.created_at}</td></tr>`;
      });
      html += `</table><p><a href="/">Back to Registration</a></p>`;
      res.send(html);
    });
  });

  // JSON endpoint
  app.get('/students', (req, res) => {
    db.query('SELECT id, name, email, course, created_at FROM students ORDER BY created_at DESC', (err, rows) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(rows);
    });
  });

  app.listen(port, () => console.log(`🚀 View service running on port ${port}`));
};

// Kick off initial DB connection
connectWithRetry();

