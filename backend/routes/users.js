const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ── Admin-only guard ─────────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET /api/users — list all users (password excluded)
router.get('/', adminOnly, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      `SELECT id, username, name, role, mob, createdAt FROM vms_users ORDER BY id`
    );
    res.json(r.recordset);
  } catch (e) {
    console.error('GET /users error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users — create user
router.post('/', adminOnly, async (req, res) => {
  try {
    const { username, password, name, role, mob } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (!['admin', 'guard', 'manager', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const pool = await getPool();

    // Check username uniqueness
    const exists = await pool.request()
      .input('u', sql.NVarChar, username.trim().toLowerCase())
      .query(`SELECT id FROM vms_users WHERE LOWER(username)=@u`);
    if (exists.recordset.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.request()
      .input('u',   sql.NVarChar, username.trim().toLowerCase())
      .input('p',   sql.NVarChar, hash)
      .input('n',   sql.NVarChar, name.trim())
      .input('r',   sql.NVarChar, role)
      .input('mob', sql.NVarChar, (mob || '').trim())
      .query(`INSERT INTO vms_users (username,password,name,role,mob) OUTPUT inserted.id VALUES (@u,@p,@n,@r,@mob)`);

    res.json({ id: result.recordset[0].id, success: true });
  } catch (e) {
    console.error('POST /users error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id — update user (name, role, mob, optional password)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, password, mob } = req.body;

    if (role && !['admin', 'guard', 'manager', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const pool = await getPool();

    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      await pool.request()
        .input('id',  sql.Int,      parseInt(id))
        .input('n',   sql.NVarChar, name)
        .input('r',   sql.NVarChar, role)
        .input('p',   sql.NVarChar, hash)
        .input('mob', sql.NVarChar, (mob || '').trim())
        .query(`UPDATE vms_users SET name=@n, role=@r, password=@p, mob=@mob WHERE id=@id`);
    } else {
      await pool.request()
        .input('id',  sql.Int,      parseInt(id))
        .input('n',   sql.NVarChar, name)
        .input('r',   sql.NVarChar, role)
        .input('mob', sql.NVarChar, (mob || '').trim())
        .query(`UPDATE vms_users SET name=@n, role=@r, mob=@mob WHERE id=@id`);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('PUT /users/:id error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id — delete user (cannot delete self)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`DELETE FROM vms_users WHERE id=@id`);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /users/:id error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
