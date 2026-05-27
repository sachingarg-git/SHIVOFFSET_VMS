const router = require('express').Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`SELECT settingKey, settingValue FROM vms_settings`);
    const settings = {};
    r.recordset.forEach(row => { settings[row.settingKey] = row.settingValue; });
    const opts = await pool.request().query(`SELECT optType, optValue FROM vms_options ORDER BY id`);
    const options = { purpose: [], dept: [] };
    opts.recordset.forEach(o => { if (options[o.optType]) options[o.optType].push(o.optValue); });
    res.json({ settings, options });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { settings } = req.body;
    for (const [k, v] of Object.entries(settings)) {
      await pool.request()
        .input('k', sql.NVarChar, k).input('v', sql.NVarChar, String(v))
        .query(`IF EXISTS (SELECT 1 FROM vms_settings WHERE settingKey=@k) UPDATE vms_settings SET settingValue=@v WHERE settingKey=@k ELSE INSERT INTO vms_settings (settingKey,settingValue) VALUES (@k,@v)`);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Options CRUD
router.post('/options', async (req, res) => {
  try {
    const pool = await getPool();
    const { type, value } = req.body;
    await pool.request().input('t', sql.NVarChar, type).input('v', sql.NVarChar, value)
      .query(`INSERT INTO vms_options (optType,optValue) VALUES (@t,@v)`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/options', async (req, res) => {
  try {
    const pool = await getPool();
    const { type, value } = req.body;
    await pool.request().input('t', sql.NVarChar, type).input('v', sql.NVarChar, value)
      .query(`DELETE TOP(1) FROM vms_options WHERE optType=@t AND optValue=@v`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
