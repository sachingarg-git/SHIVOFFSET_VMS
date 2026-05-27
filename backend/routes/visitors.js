const router = require('express').Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Helper — map a DB row to API shape
function mapRow(r) {
  return {
    id: r.id, name: r.name, mob: r.mob, addr: r.addr, co: r.co, desig: r.desig,
    idType: r.idType, idNum: r.idNum, vehicle: r.vehicle, count: r.count,
    dept: r.dept, purpose: r.purpose, host: r.host, remarks: r.remarks,
    photo: r.photo, inT: r.inT, outT: r.outT, st: r.status,
    date: r.visitDate, createdAt: r.createdAt,
    checkedInBy: r.checkedInBy || '', approvedBy: r.approvedBy || ''
  };
}

// GET /api/visitors
// Admin only      → ALL visitors (full history, all statuses)
// Everyone else   → dual-mode host-based filter:
//   • Known host  → only visitors where host = their name (full history)
//   • Pure guard  → own active check-ins (not yet checked out)
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    let result;
    if (req.user.role === 'admin') {
      // Full visibility — only admin sees everything
      result = await pool.request()
        .query(`SELECT * FROM vms_visitors ORDER BY createdAt DESC`);
    } else {
      // Smart dual-mode visibility:
      //
      // • If this user IS in the hosts directory (they receive visitors):
      //     Show ONLY visitors whose host = their name (full history, any status).
      //     They must NOT see visitors they happened to submit for other people.
      //
      // • If this user is NOT in the hosts directory (pure guard at reception):
      //     Show visitors they personally checked in, while still active (not out).
      //     After checkout the visitor leaves their queue.
      result = await pool.request()
        .input('u',    sql.NVarChar, req.user.username)
        .input('name', sql.NVarChar, req.user.name || '')
        .query(`SELECT * FROM vms_visitors
                WHERE
                  (
                    -- This user IS a known host → only show their own visitors
                    EXISTS (
                      SELECT 1 FROM vms_hosts
                      WHERE LOWER(name) = LOWER(@name)
                    )
                    AND LOWER(host) = LOWER(@name)
                  )
                  OR
                  (
                    -- This user is NOT a known host (pure guard) → own submissions while active
                    NOT EXISTS (
                      SELECT 1 FROM vms_hosts
                      WHERE LOWER(name) = LOWER(@name)
                    )
                    AND checkedInBy = @u
                    AND status != 'out'
                  )
                ORDER BY createdAt DESC`);
    }
    res.json(result.recordset.map(mapRow));
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/visitors — new check-in, default status = 'pending'
router.post('/', async (req, res) => {
  try {
    const v = req.body;

    // ── Server-side validation: reject incomplete check-ins ──────────────
    const name = (v.name || '').trim();
    const mob  = (v.mob  || '').trim();
    const host = (v.host || '').trim();
    if (!name) return res.status(400).json({ error: 'Visitor name is required' });
    if (!mob)  return res.status(400).json({ error: 'Mobile number is required' });
    if (!host) return res.status(400).json({ error: 'Host selection is required' });
    // ─────────────────────────────────────────────────────────────────────

    const pool = await getPool();
    const now = Date.now();
    const result = await pool.request()
      .input('name',      sql.NVarChar,        v.name     || '')
      .input('mob',       sql.NVarChar,         v.mob      || '')
      .input('addr',      sql.NVarChar,         v.addr     || '')
      .input('co',        sql.NVarChar,         v.co       || '—')
      .input('desig',     sql.NVarChar,         v.desig    || '—')
      .input('idType',    sql.NVarChar,         v.idType   || '')
      .input('idNum',     sql.NVarChar,         v.idNum    || '')
      .input('vehicle',   sql.NVarChar,         v.vehicle  || '')
      .input('count',     sql.Int,              v.count    || 0)
      .input('dept',      sql.NVarChar,         v.dept     || '')
      .input('purpose',   sql.NVarChar,         v.purpose  || '')
      .input('host',      sql.NVarChar,         v.host     || '')
      .input('remarks',   sql.NVarChar,         v.remarks  || '')
      .input('photo',     sql.NVarChar(sql.MAX),v.photo    || null)
      .input('inT',       sql.NVarChar,         v.inT      || '')
      .input('outT',      sql.NVarChar,         '')
      .input('status',    sql.NVarChar,         'pending') // Always pending on new check-in
      .input('visitDate', sql.NVarChar,         v.date     || '')
      .input('createdAt', sql.BigInt,            now)
      .input('checkedBy', sql.NVarChar,         req.user.username)
      .query(`INSERT INTO vms_visitors
                (name,mob,addr,co,desig,idType,idNum,vehicle,count,dept,purpose,host,remarks,photo,inT,outT,status,visitDate,createdAt,checkedInBy)
              OUTPUT INSERTED.id
              VALUES (@name,@mob,@addr,@co,@desig,@idType,@idNum,@vehicle,@count,@dept,@purpose,@host,@remarks,@photo,@inT,@outT,@status,@visitDate,@createdAt,@checkedBy)`);

    res.json({ id: result.recordset[0].id, ...v, st: 'pending', createdAt: now, checkedInBy: req.user.username });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/visitors/:id/approve — host/admin approves a pending visitor
router.put('/:id/approve', async (req, res) => {
  try {
    if (!['admin','manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admin/manager can approve' });
    }
    const pool = await getPool();

    // Get the visitor to know who checked them in
    const vRow = await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .query(`SELECT checkedInBy, name, host FROM vms_visitors WHERE id=@id`);

    if (!vRow.recordset.length) return res.status(404).json({ error: 'Visitor not found' });
    const v = vRow.recordset[0];

    // Approve: set status = 'in', record approver
    await pool.request()
      .input('id',  sql.Int,     parseInt(req.params.id))
      .input('by',  sql.NVarChar, req.user.name || req.user.username)
      .query(`UPDATE vms_visitors SET status='in', approvedBy=@by WHERE id=@id`);

    // Send notification to the guard who checked this person in
    if (v.checkedInBy && v.checkedInBy !== req.user.username) {
      const msg = `✅ ${v.name} ko ${v.host} ne approve kar diya! Visitor andar ja sakta hai.`;
      await pool.request()
        .input('to',  sql.NVarChar, v.checkedInBy)
        .input('from',sql.NVarChar, req.user.name || req.user.username)
        .input('msg', sql.NVarChar, msg)
        .input('rid', sql.Int,      parseInt(req.params.id))
        .query(`INSERT INTO vms_notifications (toUser,fromUser,message,type,relatedId)
                VALUES (@to,@from,@msg,'approved',@rid)`);
    }

    res.json({ success: true, approvedBy: req.user.name || req.user.username });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/visitors/:id — general update
router.put('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const v = req.body;
    await pool.request()
      .input('id',       sql.Int,              parseInt(req.params.id))
      .input('name',     sql.NVarChar,         v.name     || '')
      .input('mob',      sql.NVarChar,         v.mob      || '')
      .input('addr',     sql.NVarChar,         v.addr     || '')
      .input('co',       sql.NVarChar,         v.co       || '—')
      .input('desig',    sql.NVarChar,         v.desig    || '—')
      .input('idType',   sql.NVarChar,         v.idType   || '')
      .input('idNum',    sql.NVarChar,         v.idNum    || '')
      .input('vehicle',  sql.NVarChar,         v.vehicle  || '')
      .input('count',    sql.Int,              v.count    || 0)
      .input('dept',     sql.NVarChar,         v.dept     || '')
      .input('purpose',  sql.NVarChar,         v.purpose  || '')
      .input('host',     sql.NVarChar,         v.host     || '')
      .input('remarks',  sql.NVarChar,         v.remarks  || '')
      .input('photo',    sql.NVarChar(sql.MAX),v.photo    || null)
      .input('inT',      sql.NVarChar,         v.inT      || '')
      .input('outT',     sql.NVarChar,         v.outT     || '')
      .input('status',   sql.NVarChar,         v.st       || 'pending')
      .input('visitDate',sql.NVarChar,         v.date     || '')
      .query(`UPDATE vms_visitors SET
        name=@name,mob=@mob,addr=@addr,co=@co,desig=@desig,
        idType=@idType,idNum=@idNum,vehicle=@vehicle,count=@count,
        dept=@dept,purpose=@purpose,host=@host,remarks=@remarks,
        photo=@photo,inT=@inT,outT=@outT,status=@status,visitDate=@visitDate
        WHERE id=@id`);
    res.json({ success: true });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/visitors/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .query(`DELETE FROM vms_visitors WHERE id=@id`);
    res.json({ success: true });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
