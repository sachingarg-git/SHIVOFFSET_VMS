const sql = require('mssql');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const config = {
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ SQL Server connected');
  }
  return pool;
}

async function initDB() {
  const p = await getPool();
  const queries = [
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vms_users]') AND type='U')
     CREATE TABLE vms_users (
       id INT IDENTITY(1,1) PRIMARY KEY,
       username NVARCHAR(50) NOT NULL UNIQUE,
       password NVARCHAR(255) NOT NULL,
       name NVARCHAR(100) DEFAULT 'Admin',
       role NVARCHAR(20) DEFAULT 'admin',
       createdAt DATETIME DEFAULT GETDATE()
     )`,
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vms_visitors]') AND type='U')
     CREATE TABLE vms_visitors (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL,
       mob NVARCHAR(20),
       addr NVARCHAR(200),
       co NVARCHAR(100) DEFAULT '—',
       desig NVARCHAR(100) DEFAULT '—',
       idType NVARCHAR(50),
       idNum NVARCHAR(100),
       vehicle NVARCHAR(50),
       count INT DEFAULT 0,
       dept NVARCHAR(100),
       purpose NVARCHAR(100),
       host NVARCHAR(100),
       remarks NVARCHAR(500),
       photo NVARCHAR(MAX),
       inT NVARCHAR(10),
       outT NVARCHAR(10),
       status NVARCHAR(20) DEFAULT 'in',
       visitDate NVARCHAR(20),
       createdAt BIGINT DEFAULT 0
     )`,
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vms_hosts]') AND type='U')
     CREATE TABLE vms_hosts (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL,
       role NVARCHAR(100),
       dept NVARCHAR(100),
       mob NVARCHAR(20),
       email NVARCHAR(100),
       status NVARCHAR(20) DEFAULT 'online'
     )`,
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vms_scheduled]') AND type='U')
     CREATE TABLE vms_scheduled (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL,
       mob NVARCHAR(20),
       co NVARCHAR(100),
       host NVARCHAR(100),
       purpose NVARCHAR(100),
       schedDate NVARCHAR(20),
       schedTime NVARCHAR(10),
       status NVARCHAR(20) DEFAULT 'approved'
     )`,
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vms_blacklist]') AND type='U')
     CREATE TABLE vms_blacklist (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL,
       mob NVARCHAR(20),
       reason NVARCHAR(500),
       addedBy NVARCHAR(100),
       subLabel NVARCHAR(100),
       addedDate NVARCHAR(20)
     )`,
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vms_locations]') AND type='U')
     CREATE TABLE vms_locations (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL,
       addr NVARCHAR(200),
       status NVARCHAR(20) DEFAULT 'online',
       code NVARCHAR(10)
     )`,
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vms_settings]') AND type='U')
     CREATE TABLE vms_settings (
       id INT IDENTITY(1,1) PRIMARY KEY,
       settingKey NVARCHAR(100) UNIQUE,
       settingValue NVARCHAR(MAX)
     )`,
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vms_options]') AND type='U')
     CREATE TABLE vms_options (
       id INT IDENTITY(1,1) PRIMARY KEY,
       optType NVARCHAR(50),
       optValue NVARCHAR(200)
     )`
  ];

  for (const q of queries) {
    await p.request().query(q);
  }

  // ── Safe column migrations (IF NOT EXISTS) ─────────────────────────────
  const migrations = [
    // Add checkedInBy to vms_visitors (tracks which guard submitted the form)
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('vms_visitors') AND name='checkedInBy')
       ALTER TABLE vms_visitors ADD checkedInBy NVARCHAR(50) DEFAULT ''`,
    // Add approvedBy to vms_visitors
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('vms_visitors') AND name='approvedBy')
       ALTER TABLE vms_visitors ADD approvedBy NVARCHAR(100) DEFAULT ''`,
    // Notifications table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id=OBJECT_ID(N'[dbo].[vms_notifications]') AND type='U')
     CREATE TABLE vms_notifications (
       id INT IDENTITY(1,1) PRIMARY KEY,
       toUser   NVARCHAR(50)  NOT NULL,
       fromUser NVARCHAR(100) DEFAULT '',
       message  NVARCHAR(500) NOT NULL,
       type     NVARCHAR(30)  DEFAULT 'info',
       isRead   BIT           DEFAULT 0,
       relatedId INT          DEFAULT NULL,
       createdAt DATETIME     DEFAULT GETDATE()
     )`,
    // Add mob (mobile number) to vms_users — for WhatsApp alerts to managers/hosts
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('vms_users') AND name='mob')
       ALTER TABLE vms_users ADD mob NVARCHAR(20) DEFAULT ''`
  ];
  for (const m of migrations) {
    await p.request().query(m);
  }
  console.log('✅ DB migrations applied');

  // ── Clean dummy seed data + sync real users into vms_hosts ────────────────
  // Delete seeded demo hosts (those with dummy phone pattern +91 98180 0000X)
  await p.request().query(`DELETE FROM vms_hosts WHERE mob LIKE '+91 98180 0000%'`);
  // Upsert non-guard vms_users into vms_hosts so real users appear in check-in host dropdown
  await p.request().query(`
    MERGE vms_hosts AS target
    USING (
      SELECT name, role, mob FROM vms_users WHERE role != 'guard' AND name IS NOT NULL AND name != ''
    ) AS source ON LOWER(target.name) = LOWER(source.name)
    WHEN NOT MATCHED THEN
      INSERT (name, role, dept, mob, email, status)
      VALUES (source.name, source.role, 'Management', source.mob, '', 'online')
    WHEN MATCHED THEN
      UPDATE SET
        target.mob  = CASE WHEN source.mob IS NOT NULL AND source.mob != '' THEN source.mob ELSE target.mob END,
        target.role = source.role;
  `);
  console.log('✅ vms_hosts synced from vms_users (dummy data removed)');

  // Seed default admin user
  const bcrypt = require('bcryptjs');
  const existing = await p.request().query(`SELECT id FROM vms_users WHERE username='admin'`);
  if (!existing.recordset.length) {
    const hash = await bcrypt.hash('admin123', 10);
    await p.request()
      .input('hash', sql.NVarChar, hash)
      .query(`INSERT INTO vms_users (username, password, name, role) VALUES ('admin', @hash, 'Admin User', 'admin')`);
    // Also seed guard user
    const hash2 = await bcrypt.hash('guard123', 10);
    await p.request()
      .input('hash2', sql.NVarChar, hash2)
      .query(`INSERT INTO vms_users (username, password, name, role) VALUES ('guard', @hash2, 'Guard 01', 'guard')`);
    console.log('✅ Default users seeded (admin/admin123, guard/guard123)');
  }

  // Seed default hosts
  const hosts = await p.request().query(`SELECT COUNT(*) as cnt FROM vms_hosts`);
  if (!hosts.recordset[0].cnt) {
    const defaultHosts = [
      ['Manpreet Bedi','Founder & CTO','Management','+91 98180 00001','manpreet@wizone.in','online'],
      ['Sachin Dhiman','Project Manager','Operations','+91 98180 00002','sachin@wizone.in','online'],
      ['Ravinder Giri','Sales Head','Sales','+91 98180 00003','ravinder@wizone.in','online'],
      ['Sachin Garg','Senior Developer','Development','+91 98180 00004','sachin.g@wizone.in','away'],
      ['Akshay Dhiman','Developer','Development','+91 98180 00005','akshay@wizone.in','online'],
      ['Bilal Ahmad','Accounts Head','Accounts','+91 98180 00007','bilal@wizone.in','away'],
      ['Neha Bedi','Director','Management','+91 98180 00008','neha@wizone.in','online'],
    ];
    for (const h of defaultHosts) {
      await p.request()
        .input('n', sql.NVarChar, h[0]).input('r', sql.NVarChar, h[1]).input('d', sql.NVarChar, h[2])
        .input('m', sql.NVarChar, h[3]).input('e', sql.NVarChar, h[4]).input('s', sql.NVarChar, h[5])
        .query(`INSERT INTO vms_hosts (name,role,dept,mob,email,status) VALUES (@n,@r,@d,@m,@e,@s)`);
    }
    console.log('✅ Default hosts seeded');
  }

  // Seed default options
  const opts = await p.request().query(`SELECT COUNT(*) as cnt FROM vms_options`);
  if (!opts.recordset[0].cnt) {
    const purposes = ['Business Meeting','Interview','Vendor / Supplier','Delivery / Courier','Maintenance','Personal'];
    const depts = ['Management','Operations','Sales','Development','Accounts','Marketing','Support','HR'];
    for (const p2 of purposes) {
      await p.request().input('v', sql.NVarChar, p2).query(`INSERT INTO vms_options (optType,optValue) VALUES ('purpose',@v)`);
    }
    for (const d of depts) {
      await p.request().input('v', sql.NVarChar, d).query(`INSERT INTO vms_options (optType,optValue) VALUES ('dept',@v)`);
    }
    console.log('✅ Default options seeded');
  }

  // Seed default locations
  const locs = await p.request().query(`SELECT COUNT(*) as cnt FROM vms_locations`);
  if (!locs.recordset[0].cnt) {
    const defaultLocs = [
      ['Haridwar HQ','Bhagwanpur, Haridwar — Main','online','HQ'],
      ['Delhi Office','Azadpur, New Delhi 110033','online','DL'],
    ];
    for (const l of defaultLocs) {
      await p.request()
        .input('n', sql.NVarChar, l[0]).input('a', sql.NVarChar, l[1]).input('s', sql.NVarChar, l[2]).input('c', sql.NVarChar, l[3])
        .query(`INSERT INTO vms_locations (name,addr,status,code) VALUES (@n,@a,@s,@c)`);
    }
  }

  // Seed default settings
  const sets = await p.request().query(`SELECT COUNT(*) as cnt FROM vms_settings`);
  if (!sets.recordset[0].cnt) {
    const defaults = [
      ['provider','Twilio WhatsApp Business'],
      ['sender','+91 89000 60000'],
      ['token',''],
      ['visitorTmpl','🙏 Welcome to SHIVOFFSET (I) PVT. LTD.!\n\nHi {visitor_first} 👋,\nAap check-in ho chuke hain on {date} at {time}.\nAapke host *{host_name}* ko notify kar diya gaya hai.\nAapka visitor ID: {badge_id}\n\nDhanyavaad! 🙏'],
      ['hostTmpl','🔔 *Visitor Arrival Alert — SHIVOFFSET VMS*\n\nHi {host_first},\n*{visitor_name}* aapse milne aaye hain.\n\n📞 Mobile: {visitor_mobile}\n🎯 Purpose: {purpose}\n🏢 Company: {company}\n🕐 Check-in: {time}\n\n_Visitor reception par wait kar rahe hain. Please approve karein._'],
      ['approvalTmpl','✅ *Aapki entry approve ho gayi!*\n\nHi {visitor_first} 👋,\n*{approved_by}* ne aapki visit approve kar di hai.\nAap ab andar ja sakte hain.\n\n🎯 Purpose: {purpose}\n🕐 Check-in: {time}\n🏢 Host: {host_name}\n\n_SHIVOFFSET (I) PVT. LTD. mein aapka swagat hai! 🙏_'],
      ['outTmpl','🙏 *Thank you for visiting SHIVOFFSET!*\n\nHi {visitor_first} 👋,\nAapki visit successfully complete hui.\n\n🕐 Check-in:  {time}\n🕑 Check-out: {out_time}\n⏱  Duration:  {duration}\n\n_Phir milenge! SHIVOFFSET (I) PVT. LTD. 😊_'],
    ];
    for (const [k, v] of defaults) {
      await p.request().input('k', sql.NVarChar, k).input('v', sql.NVarChar, v)
        .query(`INSERT INTO vms_settings (settingKey,settingValue) VALUES (@k,@v)`);
    }
  }

  console.log('✅ DB initialized');
}

module.exports = { getPool, initDB, sql };
