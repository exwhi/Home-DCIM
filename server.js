const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// simple request logger
app.use((req, res, next) => {
  const t = new Date().toISOString();
  console.log(`[${t}] ${req.method} ${req.url}`);
  next();
});

// init DB
init();
// log db summary
try{
  const cabinets = db.get('cabinets').value() || [];
  const devices = db.get('devices').value() || [];
  console.log(`DB initialized: cabinets=${cabinets.length}, devices=${devices.length}`);
}catch(e){ console.log('DB init log error', e); }

// Serve static frontend
app.use('/', express.static(path.join(__dirname, 'public')));

// API endpoints
// Using lowdb v1 (synchronous FileSync adapter)
app.get('/api/cabinets', (req, res) => {
  const items = (db.get('cabinets').value() || []).slice().reverse();
  res.json(items);
});

app.get('/api/cabinets/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = db.get('cabinets').find({ id }).value();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.post('/api/cabinets', (req, res) => {
  const { name, location, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const lastId = db.get('lastId').value() || 0;
  const id = lastId + 1;
  const item = { id, name, location: location || '', description: description || '', created_at: new Date().toISOString() };
  db.get('cabinets').push(item).write();
  db.set('lastId', id).write();
  console.log(`Created cabinet id=${id} name=${name}`);
  res.status(201).json(item);
});

app.put('/api/cabinets/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, location, description } = req.body;
  const found = db.get('cabinets').find({ id }).value();
  if (!found) return res.status(404).json({ error: 'Not found' });
  db.get('cabinets').find({ id }).assign({ name, location, description }).write();
  console.log(`Updated cabinet id=${id}`);
  res.json(db.get('cabinets').find({ id }).value());
});

app.delete('/api/cabinets/:id', (req, res) => {
  const id = Number(req.params.id);
  const found = db.get('cabinets').find({ id }).value();
  if (!found) return res.status(404).json({ error: 'Not found' });
  db.get('cabinets').remove({ id }).write();
  console.log(`Deleted cabinet id=${id}`);
  res.json({ success: true });
});

// Devices CRUD
app.get('/api/devices', (req, res) => {
  const items = (db.get('devices').value() || []).slice().reverse();
  res.json(items);
});

app.get('/api/devices/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = db.get('devices').find({ id }).value();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.post('/api/devices', (req, res) => {
  const { name, ip, type, cabinetId, position, heightU } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const lastId = db.get('deviceLastId').value() || 0;
  const id = lastId + 1;
  const item = { id, name, ip: ip||'', type: type||'unknown', cabinetId: cabinetId||null, position: (typeof position !== 'undefined' ? position : null), heightU: (typeof heightU !== 'undefined' ? Number(heightU) : 1), created_at: new Date().toISOString() };
  db.get('devices').push(item).write();
  db.set('deviceLastId', id).write();
  console.log(`Created device id=${id} name=${name} cabinet=${item.cabinetId} position=${item.position} heightU=${item.heightU}`);
  recordAudit('device.create', { deviceId: id, name, cabinetId: item.cabinetId, position: item.position, heightU: item.heightU }, req.headers['x-user']);
  res.status(201).json(item);
});

app.put('/api/devices/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, ip, type, cabinetId, position, heightU } = req.body;
  const found = db.get('devices').find({ id }).value();
  if (!found) return res.status(404).json({ error: 'Not found' });
  // Only assign provided fields to avoid overwriting unintended values
  const assignObj = {};
  if (typeof name !== 'undefined') assignObj.name = name;
  if (typeof ip !== 'undefined') assignObj.ip = ip;
  if (typeof type !== 'undefined') assignObj.type = type;
  if (typeof cabinetId !== 'undefined') assignObj.cabinetId = cabinetId;
  if (typeof position !== 'undefined') assignObj.position = position;
  if (typeof heightU !== 'undefined') assignObj.heightU = Number(heightU);
  db.get('devices').find({ id }).assign(assignObj).write();
  console.log(`Updated device id=${id} assign=${JSON.stringify(assignObj)}`);
  recordAudit('device.update', { deviceId: id, assign: assignObj }, req.headers['x-user']);
  res.json(db.get('devices').find({ id }).value());
});

app.delete('/api/devices/:id', (req, res) => {
  const id = Number(req.params.id);
  const found = db.get('devices').find({ id }).value();
  if (!found) return res.status(404).json({ error: 'Not found' });
  db.get('devices').remove({ id }).write();
  console.log(`Deleted device id=${id}`);
  recordAudit('device.delete', { deviceId: id }, req.headers['x-user']);
  res.json({ success: true });
});

// Network status (模拟)
app.get('/api/network-status', (req, res) => {
  // 汇总设备的在线状态：优先使用设备记录的 `online` 字段（由 SNMP 检查更新），否则视为未知
  const devices = db.get('devices').value() || [];
  const totalDevices = devices.length;
  const online = devices.filter(d => d.online === true).length;
  const offline = devices.filter(d => d.online === false).length;
  const unknown = totalDevices - online - offline;
  const summary = {
    totalDevices,
    online,
    offline,
    unknown,
    timestamp: new Date().toISOString()
  };
  res.json(summary);
  console.log(`Network summary: total=${summary.totalDevices} online=${summary.online} offline=${summary.offline} unknown=${summary.unknown}`);
});

// SNMP check endpoint
const snmp = require('net-snmp');
app.post('/api/snmp-check', (req, res) => {
  const { id, ip } = req.body || {};
  const targetIp = ip || (id ? (db.get('devices').find({ id: Number(id) }).value() || {}).ip : null);
  if (!targetIp) return res.status(400).json({ error: '需要 ip 或 device id' });

  const session = snmp.createSession(targetIp, 'public', { timeout: 2000 });
  const oid = '1.3.6.1.2.1.1.1.0'; // sysDescr
  session.get([oid], (error, varbinds) => {
    if (error) {
      session.close();
      // persist offline state when possible
      try{
        if (id) db.get('devices').find({ id: Number(id) }).assign({ online: false, lastChecked: new Date().toISOString() }).write();
        else db.get('devices').find({ ip: targetIp }).assign({ online: false, lastChecked: new Date().toISOString() }).write();
      }catch(e){}
      console.log(`SNMP check error for ${targetIp}: ${error}`);
      return res.json({ ip: targetIp, online: false, error: error.toString() });
    }
    const val = varbinds && varbinds[0] && varbinds[0].value ? varbinds[0].value.toString() : null;
    session.close();
    // persist online state when possible
    try{
      if (id) db.get('devices').find({ id: Number(id) }).assign({ online: !!val, lastChecked: new Date().toISOString() }).write();
      else db.get('devices').find({ ip: targetIp }).assign({ online: !!val, lastChecked: new Date().toISOString() }).write();
    }catch(e){}
    console.log(`SNMP check success for ${targetIp}: ${!!val}`);
    res.json({ ip: targetIp, online: !!val, info: val });
  });
});

// audit helper
function recordAudit(action, details, user){
  try{
    const entry = { id: Date.now(), action, details, user: user||'system', timestamp: new Date().toISOString() };
    db.get('audits').push(entry).write();
    console.log('Audit recorded', entry);
    return entry;
  }catch(e){ console.log('Audit record failed', e); }
}

// expose audits
app.get('/api/audits', (req, res) => {
  const deviceId = req.query.deviceId ? Number(req.query.deviceId) : null;
  const cabinetId = req.query.cabinetId ? Number(req.query.cabinetId) : null;
  let items = db.get('audits').value() || [];
  if (deviceId) items = items.filter(a => a.details && a.details.deviceId === deviceId);
  if (cabinetId) items = items.filter(a => a.details && a.details.cabinetId === cabinetId);
  // return last 50
  items = items.slice(-50).reverse();
  res.json(items);
});

// Auto-assign positions for devices without position, considering heightU (1..42)
app.post('/api/auto-assign', (req, res) => {
  const devices = db.get('devices').value() || [];
  const cabinets = db.get('cabinets').value() || [];
  const assignments = [];
  cabinets.forEach(cab => {
    const cabId = cab.id;
    // build occupied map
    const occ = new Array(43).fill(false); // 1..42
    devices.filter(d => Number(d.cabinetId) === Number(cabId) && d.position).forEach(d => {
      const pos = Number(d.position);
      const h = d.heightU ? Number(d.heightU) : 1;
      for (let k = pos; k < pos + h && k <= 42; k++) occ[k] = true;
    });
    // find devices needing assignment in this cab
    const need = devices.filter(d => Number(d.cabinetId) === Number(cabId) && (!d.position || d.position === null));
    need.forEach(d => {
      const h = d.heightU ? Number(d.heightU) : 1;
      let foundPos = null;
      for (let s = 1; s <= 42 - h + 1; s++){
        let ok = true;
        for (let k = s; k < s + h; k++) if (occ[k]) { ok = false; break; }
        if (ok) { foundPos = s; break; }
      }
      if (foundPos){
        db.get('devices').find({ id: d.id }).assign({ position: foundPos }).write();
        for (let k = foundPos; k < foundPos + h; k++) occ[k] = true;
        assignments.push({ id: d.id, position: foundPos, heightU: h });
        recordAudit('device.position.assign', { deviceId: d.id, cabinetId: cabId, position: foundPos, heightU: h }, null);
      }
    });
  });
  console.log('Auto-assign completed', assignments);
  res.json({ assigned: assignments });
});

// Check whether a target position range is free in a cabinet
app.post('/api/check-position', (req, res) => {
  const { cabinetId, position, heightU } = req.body || {};
  if (typeof cabinetId === 'undefined' || typeof position === 'undefined' || typeof heightU === 'undefined'){
    return res.status(400).json({ error: '需要 cabinetId, position, heightU' });
  }
  const devices = db.get('devices').value() || [];
  const targetStart = Number(position);
  const targetEnd = targetStart + Number(heightU) - 1;
  const conflicts = devices.filter(d => Number(d.cabinetId) === Number(cabinetId) && d.position).filter(d => {
    const pos = Number(d.position);
    const h = d.heightU ? Number(d.heightU) : 1;
    const start = pos;
    const end = pos + h - 1;
    // overlap if ranges intersect
    return !(end < targetStart || start > targetEnd);
  }).map(d => ({ id: d.id, name: d.name, position: d.position, heightU: d.heightU||1 }));
  res.json({ conflicts });
});

const server = app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT} (PID ${process.pid})`));

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE'){
    console.error(`Port ${PORT} is already in use. Please stop the process using that port or set PORT to a free port (e.g. PORT=3002).`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});

// --- SSH over WebSocket (ssh2 + ws) and websockify launcher ---
const WebSocket = require('ws');
const { Client } = require('ssh2');
const { spawn } = require('child_process');
const websockifyProcesses = {}; // map wsPort -> child process

// endpoint to start websockify proxy (if websockify is installed on host)
app.post('/api/start-websockify', (req, res) => {
  const { targetHost, targetPort, wsPort } = req.body || {};
  if (!targetHost || !targetPort || !wsPort) return res.status(400).json({ error: '需要 targetHost, targetPort, wsPort' });
  try{
    if (websockifyProcesses[wsPort]) return res.json({ ok: true, wsPort, message: 'already running' });
    // spawn websockify: websockify <wsPort> <targetHost>:<targetPort>
    const p = spawn('websockify', [String(wsPort), `${targetHost}:${targetPort}`], { detached: true, stdio: ['ignore','ignore','ignore'] });
    p.unref();
    websockifyProcesses[wsPort] = p.pid;
    console.log(`Started websockify pid=${p.pid} wsPort=${wsPort} -> ${targetHost}:${targetPort}`);
    recordAudit('websockify.start', { wsPort, targetHost, targetPort }, req.headers['x-user']);
    return res.json({ ok: true, wsPort, pid: p.pid });
  }catch(e){ console.log('websockify start failed', e); return res.status(500).json({ error: e.message }); }
});

// WebSocket server for SSH proxy
const wss = new WebSocket.Server({ server, path: '/ssh' });
wss.on('connection', (ws, req) => {
  const url = req.url || '';
  // parse query for host and port, but we'll require client to send auth message first
  const params = new URL('http://dummy' + url).searchParams;
  const host = params.get('host');
  const port = params.get('port') ? Number(params.get('port')) : 22;
  console.log('WS SSH connection requested for host=', host, 'port=', port);
  let conn = new Client();
  let shellStream = null;
  let authenticated = false;

  ws.on('message', (message) => {
    // first message should be JSON auth: { type:'auth', username, password }
    if (!authenticated){
      try{
        const obj = JSON.parse(message.toString());
        if (obj.type === 'auth'){
          const username = obj.username || 'root';
          const password = obj.password || '';
          const targetHost = obj.host || host;
          const targetPort = obj.port ? Number(obj.port) : port;
          conn.on('ready', () => {
            conn.shell((err, stream) => {
              if (err){ ws.send(JSON.stringify({ type:'error', message: err.message })); conn.end(); return; }
              shellStream = stream;
              stream.on('data', (data) => { try{ ws.send(data); }catch(e){} });
              stream.on('close', () => { try{ ws.close(); }catch(e){} conn.end(); });
              ws.send(JSON.stringify({ type:'ready' }));
            });
          }).on('error', (e) => { ws.send(JSON.stringify({ type:'error', message: e.message })); })
          .connect({ host: targetHost, port: targetPort, username, password });
          authenticated = true;
          recordAudit('ssh.connect.attempt', { host: targetHost, port: targetPort, username }, req.headers['x-user']);
        } else {
          ws.send(JSON.stringify({ type:'error', message: '首次消息需为 auth' }));
        }
      }catch(e){ ws.send(JSON.stringify({ type:'error', message: 'auth JSON 解析失败' })); }
      return;
    }
    // subsequent messages forwarded to shell
    if (shellStream){
      // if message is Buffer or string
      shellStream.write(message);
    }
  });

  ws.on('close', ()=>{ try{ conn.end(); }catch(e){} });
  conn.on('close', ()=>{ try{ ws.close(); }catch(e){} });
});

// --- 家庭DCIM新功能 ---

// 1. 设备功率管理 (Power Management)
app.get('/api/power-summary', (req, res) => {
  const devices = db.get('devices').value() || [];
  const totalPower = devices.reduce((sum, d) => sum + (Number(d.powerW) || 0), 0);
  const settings = db.get('settings').value() || { maxPower: 3000 };
  const utilization = ((totalPower / settings.maxPower) * 100).toFixed(1);
  const hasAlert = totalPower > settings.maxPower;
  res.json({ totalPower, maxPower: settings.maxPower, utilization, hasAlert, devices: devices.map(d => ({ id: d.id, name: d.name, power: d.powerW || 0 })) });
});

// 2. 设备网络连接管理
app.put('/api/devices/:id/network', (req, res) => {
  const id = Number(req.params.id);
  const { ip, mac, ports, switchPort } = req.body;
  const found = db.get('devices').find({ id }).value();
  if (!found) return res.status(404).json({ error: 'Not found' });
  const update = {};
  if (typeof ip !== 'undefined') update.ip = ip;
  if (typeof mac !== 'undefined') update.mac = mac;
  if (typeof ports !== 'undefined') update.ports = ports;
  if (typeof switchPort !== 'undefined') update.switchPort = switchPort;
  db.get('devices').find({ id }).assign(update).write();
  recordAudit('device.network.update', { deviceId: id, ...update }, req.headers['x-user']);
  res.json(db.get('devices').find({ id }).value());
});

// 3. 设备资产追踪 (Asset Tracking)
app.put('/api/devices/:id/asset', (req, res) => {
  const id = Number(req.params.id);
  const { serialNumber, purchaseDate, purchasePrice, warrantyEnd, manualUrl } = req.body;
  const found = db.get('devices').find({ id }).value();
  if (!found) return res.status(404).json({ error: 'Not found' });
  const update = {};
  if (typeof serialNumber !== 'undefined') update.serialNumber = serialNumber;
  if (typeof purchaseDate !== 'undefined') update.purchaseDate = purchaseDate;
  if (typeof purchasePrice !== 'undefined') update.purchasePrice = purchasePrice;
  if (typeof warrantyEnd !== 'undefined') update.warrantyEnd = warrantyEnd;
  if (typeof manualUrl !== 'undefined') update.manualUrl = manualUrl;
  db.get('devices').find({ id }).assign(update).write();
  recordAudit('device.asset.update', { deviceId: id, ...update }, req.headers['x-user']);
  res.json(db.get('devices').find({ id }).value());
});

// 4. 告警和监控 (Alerts & Monitoring)
app.post('/api/alerts', (req, res) => {
  const { type, message, deviceId, severity } = req.body;
  if (!type || !message) return res.status(400).json({ error: 'type and message required' });
  const alert = {
    id: Date.now(),
    type,
    message,
    deviceId: deviceId || null,
    severity: severity || 'warning',
    created_at: new Date().toISOString(),
    acknowledged: false
  };
  db.get('alerts').push(alert).write();
  console.log(`Alert: [${alert.severity}] ${alert.type}: ${alert.message}`);
  recordAudit('alert.create', alert, req.headers['x-user']);
  res.status(201).json(alert);
});

app.get('/api/alerts', (req, res) => {
  const alerts = (db.get('alerts').value() || []).reverse();
  res.json(alerts);
});

app.put('/api/alerts/:id/acknowledge', (req, res) => {
  const id = Number(req.params.id);
  const found = db.get('alerts').find({ id }).value();
  if (!found) return res.status(404).json({ error: 'Not found' });
  db.get('alerts').find({ id }).assign({ acknowledged: true, acknowledged_at: new Date().toISOString() }).write();
  res.json(db.get('alerts').find({ id }).value());
});

// 5. 容量规划和分析 (Capacity Planning)
app.get('/api/capacity-analysis', (req, res) => {
  const cabinets = db.get('cabinets').value() || [];
  const devices = db.get('devices').value() || [];
  
  const analysis = cabinets.map(cabinet => {
    const cabinetDevices = devices.filter(d => String(d.cabinetId) === String(cabinet.id));
    const totalPower = cabinetDevices.reduce((sum, d) => sum + (Number(d.powerW) || 0), 0);
    const occupiedU = new Set();
    cabinetDevices.forEach(d => {
      const pos = Number(d.position);
      const h = d.heightU ? Number(d.heightU) : 1;
      if (pos && pos > 0) {
        for (let k = pos; k < pos + h && k <= 42; k++) occupiedU.add(k);
      }
    });
    const availableU = 42 - occupiedU.size;
    return {
      cabinetId: cabinet.id,
      cabinetName: cabinet.name,
      totalDevices: cabinetDevices.length,
      occupiedU: occupiedU.size,
      availableU,
      utilizationPercent: ((occupiedU.size / 42) * 100).toFixed(1),
      totalPower,
      devices: cabinetDevices
    };
  });
  
  res.json(analysis);
});

// 6. 系统设置 (System Settings)
app.get('/api/settings', (req, res) => {
  const settings = db.get('settings').value() || { maxPower: 3000, maxTemp: 45, autoAlert: true };
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const { maxPower, maxTemp, autoAlert } = req.body;
  const update = {};
  if (typeof maxPower !== 'undefined') update.maxPower = maxPower;
  if (typeof maxTemp !== 'undefined') update.maxTemp = maxTemp;
  if (typeof autoAlert !== 'undefined') update.autoAlert = autoAlert;
  db.get('settings').assign(update).write();
  recordAudit('settings.update', update, req.headers['x-user']);
  res.json(db.get('settings').value());
});

// 7. 设备模板 (Device Templates)
app.post('/api/templates', (req, res) => {
  const { name, type, powerW, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const template = { id: Date.now(), name, type, powerW: powerW || 0, description, created_at: new Date().toISOString() };
  db.get('templates').push(template).write();
  recordAudit('template.create', template, req.headers['x-user']);
  res.status(201).json(template);
});

app.get('/api/templates', (req, res) => {
  const templates = db.get('templates').value() || [];
  res.json(templates);
});

app.delete('/api/templates/:id', (req, res) => {
  const id = Number(req.params.id);
  db.get('templates').remove({ id }).write();
  recordAudit('template.delete', { id }, req.headers['x-user']);
  res.json({ success: true });
});

// 8. 温度和环境监控 (Environmental Monitoring - 模拟数据)
app.get('/api/environment', (req, res) => {
  // 模拟环境数据
  res.json({
    temperature: (20 + Math.random() * 15).toFixed(1),
    humidity: (30 + Math.random() * 40).toFixed(0),
    airflow: (100 + Math.random() * 50).toFixed(0),
    timestamp: new Date().toISOString()
  });
});

// 9. 按需生成报告 (Report Generation)
app.get('/api/reports/capacity', (req, res) => {
  const cabinets = db.get('cabinets').value() || [];
  const devices = db.get('devices').value() || [];
  const alerts = db.get('alerts').value() || [];
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCabinets: cabinets.length,
      totalDevices: devices.length,
      onlineDevices: devices.filter(d => d.online === true).length,
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => !a.acknowledged).length
    },
    capacityByFacility: cabinets.map(c => {
      const cabinetDevices = devices.filter(d => String(d.cabinetId) === String(c.id));
      return {
        cabinet: c.name,
        devices: cabinetDevices.length,
        powerW: cabinetDevices.reduce((s, d) => s + (Number(d.powerW) || 0), 0)
      };
    }),
    topPowerConsumers: devices.filter(d => d.powerW).sort((a, b) => Number(b.powerW) - Number(a.powerW)).slice(0, 10).map(d => ({name: d.name, power: d.powerW}))
  };
  
  res.json(report);
});

// Helper: record audit log
function recordAudit(action, details, user) {
  const audit = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    action,
    details,
    user: user || 'unknown'
  };
  db.get('audits').push(audit).write();
}

