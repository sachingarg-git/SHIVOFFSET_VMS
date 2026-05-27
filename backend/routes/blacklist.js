const router = require('express').Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`SELECT * FROM vms_blacklist ORDER BY id`);
    res.json(r.recordset.map(b => ({ id: b.id, name: b.name, mob: b.mob, reason: b.reason, by: b.addedBy, sub: b.subLabel, date: b.addedDate })));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const pool = await getPool();
    const b = req.body;
    const r = await pool.request()
      .input('name', sql.NVarChar, b.name).input('mob', sql.NVarChar, b.mob)
      .input('reason', sql.NVarChar, b.reason).input('by', sql.NVarChar, b.by || 'Admin')
      .input('sub', sql.NVarChar, b.sub || '').input('date', sql.NVarChar, b.date || new Date().toISOString().slice(0,10))
      .query(`INSERT INTO vms_blacklist (name,mob,reason,addedBy,subLabel,addedDate) OUTPUT INSERTED.id VALUES (@name,@mob,@reason,@by,@sub,@date)`);
    res.json({ id: r.recordset[0].id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const b = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id).input('name', sql.NVarChar, b.name)
      .input('mob', sql.NVarChar, b.mob).input('reason', sql.NVarChar, b.reason)
      .input('by', sql.NVarChar, b.by || 'Admin').input('sub', sql.NVarChar, b.sub || '')
      .query(`UPDATE vms_blacklist SET name=@name,mob=@mob,reason=@reason,addedBy=@by,subLabel=@sub WHERE id=@id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, req.params.id).query(`DELETE FROM vms_blacklist WHERE id=@id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
