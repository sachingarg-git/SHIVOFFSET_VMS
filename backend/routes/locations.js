const router = require('express').Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`SELECT * FROM vms_locations ORDER BY id`);
    res.json(r.recordset.map(l => ({ id: l.id, name: l.name, addr: l.addr, st: l.status, code: l.code })));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const pool = await getPool();
    const l = req.body;
    const r = await pool.request()
      .input('name', sql.NVarChar, l.name).input('addr', sql.NVarChar, l.addr || '')
      .input('status', sql.NVarChar, l.st || 'online').input('code', sql.NVarChar, l.code || '')
      .query(`INSERT INTO vms_locations (name,addr,status,code) OUTPUT INSERTED.id VALUES (@name,@addr,@status,@code)`);
    res.json({ id: r.recordset[0].id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const l = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id).input('name', sql.NVarChar, l.name)
      .input('addr', sql.NVarChar, l.addr || '').input('status', sql.NVarChar, l.st || 'online')
      .input('code', sql.NVarChar, l.code || '')
      .query(`UPDATE vms_locations SET name=@name,addr=@addr,status=@status,code=@code WHERE id=@id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, req.params.id).query(`DELETE FROM vms_locations WHERE id=@id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
