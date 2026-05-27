const router = require('express').Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`SELECT * FROM vms_hosts ORDER BY id`);
    res.json(r.recordset.map(h => ({ id: h.id, name: h.name, role: h.role, dept: h.dept, mob: h.mob, email: h.email, st: h.status })));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const pool = await getPool();
    const h = req.body;
    const r = await pool.request()
      .input('name', sql.NVarChar, h.name).input('role', sql.NVarChar, h.role)
      .input('dept', sql.NVarChar, h.dept).input('mob', sql.NVarChar, h.mob)
      .input('email', sql.NVarChar, h.email || '').input('status', sql.NVarChar, h.st || 'online')
      .query(`INSERT INTO vms_hosts (name,role,dept,mob,email,status) OUTPUT INSERTED.id VALUES (@name,@role,@dept,@mob,@email,@status)`);
    res.json({ id: r.recordset[0].id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const h = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id).input('name', sql.NVarChar, h.name)
      .input('role', sql.NVarChar, h.role).input('dept', sql.NVarChar, h.dept)
      .input('mob', sql.NVarChar, h.mob).input('email', sql.NVarChar, h.email || '')
      .input('status', sql.NVarChar, h.st || 'online')
      .query(`UPDATE vms_hosts SET name=@name,role=@role,dept=@dept,mob=@mob,email=@email,status=@status WHERE id=@id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, req.params.id).query(`DELETE FROM vms_hosts WHERE id=@id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
