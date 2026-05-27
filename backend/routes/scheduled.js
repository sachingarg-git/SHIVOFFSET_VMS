const router = require('express').Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`SELECT * FROM vms_scheduled ORDER BY schedDate, schedTime`);
    res.json(r.recordset.map(s => ({ id: s.id, name: s.name, mob: s.mob, co: s.co, host: s.host, purpose: s.purpose, date: s.schedDate, time: s.schedTime, st: s.status })));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const pool = await getPool();
    const s = req.body;
    const r = await pool.request()
      .input('name', sql.NVarChar, s.name).input('mob', sql.NVarChar, s.mob)
      .input('co', sql.NVarChar, s.co || '').input('host', sql.NVarChar, s.host)
      .input('purpose', sql.NVarChar, s.purpose || '').input('date', sql.NVarChar, s.date)
      .input('time', sql.NVarChar, s.time || '').input('status', sql.NVarChar, s.st || 'approved')
      .query(`INSERT INTO vms_scheduled (name,mob,co,host,purpose,schedDate,schedTime,status) OUTPUT INSERTED.id VALUES (@name,@mob,@co,@host,@purpose,@date,@time,@status)`);
    res.json({ id: r.recordset[0].id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const s = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id).input('name', sql.NVarChar, s.name)
      .input('mob', sql.NVarChar, s.mob).input('co', sql.NVarChar, s.co || '')
      .input('host', sql.NVarChar, s.host).input('purpose', sql.NVarChar, s.purpose || '')
      .input('date', sql.NVarChar, s.date).input('time', sql.NVarChar, s.time || '')
      .input('status', sql.NVarChar, s.st || 'approved')
      .query(`UPDATE vms_scheduled SET name=@name,mob=@mob,co=@co,host=@host,purpose=@purpose,schedDate=@date,schedTime=@time,status=@status WHERE id=@id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, req.params.id).query(`DELETE FROM vms_scheduled WHERE id=@id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
