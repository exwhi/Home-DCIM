const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const DB_PATH = path.join(__dirname, 'homedcim.json');
const adapter = new FileSync(DB_PATH);
const db = low(adapter);

function init() {
  db.defaults({
    cabinets: [],
    lastId: 0,
    devices: [],
    devicesLastId: 0,
    deviceLastId: 0,
    audits: [],
    alerts: [],
    templates: [],
    settings: { maxPower: 3000, maxTemp: 45, autoAlert: true },
    power: [],
    networkInterfaces: [],
    assets: [],
    capacityPlans: []
  }).write();
}

module.exports = { db, init };
