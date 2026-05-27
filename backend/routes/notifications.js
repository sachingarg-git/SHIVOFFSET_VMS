const router = require('express').Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/notifications — get for current user
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('u', sql.NVarChar, req.user.username)
      .query(`SELECT TOP 30 * FROM vms_notifications
              WHERE toUser=@u
              ORDER BY createdAt DESC`);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/notifications/count — unread count only (for badge)
router.get('/count', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('u', sql.NVarChar, req.user.username)
      .query(`SELECT COUNT(*) as cnt FROM vms_notifications WHERE toUser=@u AND isRead=0`);
    res.json({ count: r.recordset[0].cnt });
  } catch (e) {
    res.status(500).json({ count: 0 });
  }
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('u',  sql.NVarChar, req.user.username)
      .query(`UPDATE vms_notifications SET isRead=1 WHERE id=@id AND toUser=@u`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('u', sql.NVarChar, req.user.username)
      .query(`UPDATE vms_notifications SET isRead=1 WHERE toUser=@u`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
