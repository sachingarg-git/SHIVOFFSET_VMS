const router = require('express').Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { sendWhatsApp }   = require('./whatsapp');

router.use(authMiddleware);

// ─── Safe WhatsApp send — never crash the main flow ───────────────────────────
async function trySendWA(phone, msg, label) {
  if (!phone) return;
  try {
    await sendWhatsApp(phone, msg);
    console.log(`✅ [WA] ${label} → ${phone}`);
  } catch (e) {
    console.log(`⚠️  [WA] ${label} skipped: ${e.message}`);
  }
}

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

    const newId = result.recordset[0].id;
    res.json({ id: newId, ...v, st: 'pending', createdAt: now, checkedInBy: req.user.username });

    // ── Auto WhatsApp: visitor welcome + host alert (fire-and-forget) ─────────
    const hostName = v.host || '';
    const visitorMsg =
      `🙏 Welcome to SHIVOFFSET (I) PVT. LTD.!\n\n` +
      `Hi ${(v.name || '').split(' ')[0]} 👋,\n` +
      `Aap check-in ho chuke hain on ${v.date || ''} at ${v.inT || ''}.\n` +
      `Aapke host *${hostName}* ko notify kar diya gaya hai.\n` +
      `Aapka visitor ID: VMS-${newId}\n\n` +
      `Dhanyavaad! 🙏`;
    // Fetch host mobile — vms_users first (real number set by admin), then vms_hosts as fallback
    (async () => {
      try {
        const pool2 = await getPool();
        // 1st: vms_users — real mobile set via User Management page
        const uRow = await pool2.request()
          .input('hn', sql.NVarChar, hostName)
          .query(`SELECT mob FROM vms_users WHERE LOWER(name)=LOWER(@hn)`);
        let hostMob = uRow.recordset[0]?.mob || '';
        // Fallback: vms_hosts (for external hosts who are not system users)
        if (!hostMob) {
          const hRow = await pool2.request()
            .input('hn', sql.NVarChar, hostName)
            .query(`SELECT mob FROM vms_hosts WHERE LOWER(name)=LOWER(@hn)`);
          hostMob = hRow.recordset[0]?.mob || '';
        }
        const hostMsg =
          `🔔 *Visitor Arrival Alert — SHIVOFFSET VMS*\n\n` +
          `Hi ${hostName.split(' ')[0]},\n` +
          `*${v.name}* aapse milne aaye hain.\n\n` +
          `📞 Mobile: ${v.mob}\n` +
          `🎯 Purpose: ${v.purpose || '—'}\n` +
          `🏢 Company: ${v.co && v.co !== '—' ? v.co : '—'}\n` +
          `🕐 Check-in: ${v.inT || ''}\n\n` +
          `_Visitor reception par wait kar rahe hain. Please approve karein._`;
        await trySendWA(v.mob,   visitorMsg, 'visitor welcome');
        await trySendWA(hostMob, hostMsg,    'host alert');
      } catch {}
    })();
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

    // ── Auto WhatsApp: approved message to visitor ────────────────────────────
    (async () => {
      try {
        const pool2 = await getPool();
        const full = await pool2.request()
          .input('id', sql.Int, parseInt(req.params.id))
          .query(`SELECT name, mob, host, purpose, inT FROM vms_visitors WHERE id=@id`);
        const vis = full.recordset[0];
        if (!vis) return;
        const approvedBy = req.user.name || req.user.username;
        const msg =
          `✅ *Aapki entry approve ho gayi!*\n\n` +
          `Hi ${(vis.name || '').split(' ')[0]} 👋,\n` +
          `*${approvedBy}* ne aapki visit approve kar di hai.\n` +
          `Aap ab andar ja sakte hain.\n\n` +
          `🎯 Purpose: ${vis.purpose || '—'}\n` +
          `🕐 Check-in: ${vis.inT || ''}\n` +
          `🏢 Host: ${vis.host}\n\n` +
          `_SHIVOFFSET (I) PVT. LTD. mein aapka swagat hai! 🙏_`;
        await trySendWA(vis.mob, msg, 'approval notify to visitor');
      } catch {}
    })();
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

    // ── Auto WhatsApp: checkout thank-you to visitor ───────────────────────────
    if (v.st === 'out' && v.outT && v.mob) {
      (async () => {
        try {
          // Calculate duration
          const [inH, inM]   = (v.inT  || '00:00').split(':').map(Number);
          const [outH, outM] = (v.outT || '00:00').split(':').map(Number);
          const durMin = (outH * 60 + outM) - (inH * 60 + inM);
          const durStr = durMin > 0
            ? (durMin >= 60 ? `${Math.floor(durMin/60)}h ${durMin%60}m` : `${durMin}m`)
            : '';
          const msg =
            `🙏 *Thank you for visiting SHIVOFFSET!*\n\n` +
            `Hi ${(v.name || '').split(' ')[0]} 👋,\n` +
            `Aapki visit successfully complete hui.\n\n` +
            `🕐 Check-in:  ${v.inT || ''}\n` +
            `🕑 Check-out: ${v.outT}\n` +
            `⏱  Duration:  ${durStr || '—'}\n\n` +
            `_Phir milenge! SHIVOFFSET (I) PVT. LTD. 😊_`;
          await trySendWA(v.mob, msg, 'checkout thank-you');
        } catch {}
      })();
    }
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
