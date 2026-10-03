const D = require('better-sqlite3');
const db = new D('./distra.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('TABLES:', JSON.stringify(tables));

try {
  const zones = db.prepare('SELECT regionId, COUNT(*) as cnt FROM risk_zones GROUP BY regionId').all();
  console.log('ZONES BY REGION:', JSON.stringify(zones, null, 2));
  
  const sample = db.prepare('SELECT zone_id, name, regionId, riskLevel, riskScore FROM risk_zones LIMIT 5').all();
  console.log('SAMPLE ZONES:', JSON.stringify(sample, null, 2));
} catch(e) { console.log('risk_zones error:', e.message); }

try {
  const alerts = db.prepare('SELECT regionId, COUNT(*) as cnt FROM alerts GROUP BY regionId').all();
  console.log('ALERTS BY REGION:', JSON.stringify(alerts, null, 2));
} catch(e) { console.log('alerts error:', e.message); }
