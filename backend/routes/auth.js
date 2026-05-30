const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('u', sql.NVarChar, username.trim().toLowerCase())
      .query(`SELECT * FROM vms_users WHERE LOWER(username)=@u`);

    if (!result.recordset.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role, dept: user.dept || '' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, dept: user.dept || '' } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
