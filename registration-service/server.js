const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      console.error('❌ DB connect error (registration):', err.message);
      console.log('Retrying in 5 seconds...');
      setTimeout(connectWithRetry, 5000); // Retry after 5 sec
      return;
    }

    console.log('✅ Registration service connected to DB');
    startServer(db);
  });
};

const startServer = (db) => {
  // Registration form
  app.get('/', (req, res) => {
    res.send(`
      <h1>Student Registration</h1>
      <form method="POST" action="/register">
        <input name="name" placeholder="Name" required /><br/>
        <input name="email" placeholder="Email" required /><br/>
        <input name="course" placeholder="Course" required /><br/>
        <button type="submit">Register</button>
      </form>
      <p><a href="/view/">View Registered Students</a></p>
    `);
  });

  // Handle form submission
  app.post('/register', (req, res) => {
    const { name, email, course } = req.body;
    if (!name || !email || !course) {
      return res.status(400).send('Name, email and course are required');
    }

    const q = 'INSERT INTO students (name, email, course) VALUES (?, ?, ?)';
    db.query(q, [name, email, course], (err) => {
      if (err) {
        console.error('❌ Insert error:', err.message);
        return res.status(500).send('Database error');
      }
      console.log(`✅ New student registered: ${name}`);
      res.redirect('/view/'); // proxy handles forwarding
    });
  });

  app.listen(port, () => console.log(`🚀 Registration service running on port ${port}`));
};

// Kick off initial DB connection
connectWithRetry();

