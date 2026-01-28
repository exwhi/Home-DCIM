const api = {
  cabinets: {
    list: () => fetch('/api/cabinets').then(r => r.json()),
    get: id => fetch(`/api/cabinets/${id}`).then(r => r.json()),
    create: data => fetch('/api/cabinets', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
    update: (id, data) => fetch(`/api/cabinets/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
    del: id => fetch(`/api/cabinets/${id}`, { method: 'DELETE' }).then(r => r.json())
  },
  devices: {
    list: () => fetch('/api/devices').then(r => r.json()),
    get: id => fetch(`/api/devices/${id}`).then(r => r.json()),
    create: data => fetch('/api/devices', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
    update: (id, data) => fetch(`/api/devices/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
    del: id => fetch(`/api/devices/${id}`, { method: 'DELETE' }).then(r => r.json())
  },
  network: {
    status: () => fetch('/api/network-status').then(r => r.json())
  }
};

const $ = sel => document.querySelector(sel);

function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]); }

function renderGrid(items, type='cabinet', devices = []){
  const grid = $('#grid');
  grid.innerHTML='';
  if (!items.length) return grid.innerHTML = `<div class="empty">暂无${type === 'cabinet' ? '机柜' : '设备'}，点击 新建 创建第一个</div>`;
  items.forEach(it=>{
    const card = document.createElement('div');
    card.className='rack-card';
    card.dataset.id = it.id;
    if (type === 'cabinet'){
      // compute devices belonging to this cabinet
      const devs = devices.filter(d => String(d.cabinetId) === String(it.id));
      const total = devs.length;
      const online = devs.filter(d => d.online === true).length;
      const offline = devs.filter(d => d.online === false).length;
      const unknown = total - online - offline;
      // build mini rack html: 42 small slots top->bottom, support heightU
      let mini = '<div class="mini-rack">';
      // map positions for quick lookup (mark ranges for multi-U)
      const occ = {};
      devs.forEach(d=>{
        const pos = Number(d.position);
        const h = d.heightU ? Number(d.heightU) : 1;
        if (pos && pos > 0){
          for(let k=pos; k<pos+h && k<=42; k++) occ[k] = true;
        }
      });
      for(let u=42; u>=1; u--){
        const has = !!occ[u];
        mini += `<span class="mini-slot ${has? 'occupied': 'empty'}" title="U${u}"></span>`;
      }
      mini += '</div>';
      card.innerHTML = `
        <div class="cabinet-head"><h3>${escapeHtml(it.name)}</h3><div class="meta">${escapeHtml(it.location||'')}</div></div>
        <div class="desc">${escapeHtml(it.description||'')}</div>
        <div class="cabinet-viz">
          <div class="viz-row">设备: ${total}</div>
          <div class="viz-row">在线: <span class="badge online">${online}</span> 离线: <span class="badge offline">${offline}</span> 未知: <span class="badge unknown">${unknown}</span></div>
          ${mini}
        </div>`;
    } else {
      // device card includes simple online marker if available
      const status = it.online === true ? '<span class="badge online">在线</span>' : (it.online === false ? '<span class="badge offline">离线</span>' : '<span class="badge unknown">未知</span>');
      card.innerHTML = `<h3>${escapeHtml(it.name)} ${status}</h3><div class="meta">IP: ${escapeHtml(it.ip||'--')} • 类型: ${escapeHtml(it.type||'--')}</div><div class="desc">所属机柜: ${escapeHtml(it.cabinetId||'无')}</div>`;
    }
    grid.appendChild(card);
  });
}

let lastItems = [];
let currentPage = 'cabinet'; // cabinet | device | network
function setPage(page){
  currentPage = page;
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active', a.textContent.trim() === (page==='cabinet'?'机柜':'设备')));
  // adjust UI labels
  if (page === 'network'){
    $('.content').innerHTML = `<section id="network-card" class="card"><h3>网络状态</h3><div id="network-status" class="tiny muted">正在加载...</div></section>`;
    loadNetwork();
    return;
  }
  // reset content to grid + detail panel
  document.querySelector('.content').innerHTML = `\
    <section id="grid-section" class="card">\
      <h3>${page==='cabinet'?'机柜视图':'设备列表'}</h3>\
      <div id="grid" class="grid"></div>\
    </section>\
    <aside id="detail-panel" class="card">\
      <h3>${page==='cabinet'?'机柜详情':'设备详情'}</h3>\
      <form id="cabinet-form">\
        <input type="hidden" id="cabinet-id" />\
        <label>名称<input id="name" required /></label>\
        <label>位置<input id="location" /></label>\
        <label>描述<textarea id="description"></textarea></label>\
        <div style="margin-top:8px"><button type="button" id="open-rack" class="btn secondary">打开机柜U位视图</button></div>\
        <div class="row">\
          <button type="submit" class="btn">保存</button>\
          <button type="button" id="reset-btn" class="btn secondary">重置</button>\
          <button type="button" id="delete-btn" class="btn danger" style="margin-left:auto">删除</button>\
        </div>\
      </form>\
      <div id="audit-panel" class="card" style="margin-top:12px"><h4>操作历史</h4><div id="audit-list" class="tiny muted">加载中...</div></div>\
    </aside>`;
  // if device page, adjust form fields
  if (page === 'device'){
    // replace form contents
    const form = document.getElementById('cabinet-form');
  form.innerHTML = `\
  <input type="hidden" id="cabinet-id" />\
  <label>设备名称<input id="name" required /></label>\
  <label>IP 地址<input id="ip" /></label>\
  <label>设备类型<input id="type" /></label>\
  <label>占用U高度<input id="heightU" type="number" min="1" max="42" value="1" /></label>\
  <label>所属机柜<select id="cabinetId"><option value="">无</option></select></label>\
      <div class="row">\
        <button type="submit" class="btn">保存</button>\
        <button type="button" id="reset-btn" class="btn secondary">重置</button>\
        <button type="button" id="snmp-check" class="btn secondary">SNMP 检查</button>\
        <button type="button" id="delete-btn" class="btn danger" style="margin-left:auto">删除</button>\
      </div>`;
    // populate cabinet select
    api.cabinets.list().then(cabs=>{
      const sel = document.getElementById('cabinetId');
      sel.innerHTML = '<option value="">无</option>' + cabs.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    });
  }
  attachFormHandlers();
  loadAndRender();
}

// Rack rendering and drag/drop
function renderRackView(cabinetId){
  // create a full-width panel to show 42U slots
  const main = document.querySelector('.content');
  main.innerHTML = `<section id="rack-section" class="card" style="width:100%"><h3>机柜 ${cabinetId} - U 位视图</h3><div id="rack" class="rack"></div><div style="margin-top:12px"><button id="back-to-cabinets" class="btn secondary">返回机柜列表</button></div></section>`;
  // fetch devices for this cabinet
  api.devices.list().then(devs=>{
    const devsInCab = devs.filter(d=>String(d.cabinetId) === String(cabinetId));
    const rack = document.getElementById('rack');
    // build 42U slots (U42 top -> U1 bottom)
    for(let u=42; u>=1; u--){
      const slot = document.createElement('div');
      slot.className = 'rack-slot';
      slot.dataset.u = u;
      slot.innerHTML = `<div class="u-label">U${u}</div><div class="u-body"></div>`;
      // drop handler
      slot.addEventListener('dragover', e=>{ e.preventDefault(); slot.classList.add('drag-over'); });
      slot.addEventListener('dragleave', e=>{ slot.classList.remove('drag-over'); });
      slot.addEventListener('drop', e=>{
        e.preventDefault(); slot.classList.remove('drag-over');
        const did = e.dataTransfer.getData('text/plain');
        const dev = devs.find(d=>String(d.id)===String(did));
        if (!dev) return alert('设备未找到');
        const h = dev.heightU ? Number(dev.heightU) : 1;
        const target = Number(slot.dataset.u);
        if (target + h - 1 > 42) return alert('设备高度超出机柜范围');
        // check conflicts via backend
        fetch('/api/check-position', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cabinetId: Number(cabinetId), position: target, heightU: h }) }).then(r=>r.json()).then(j=>{
          const conflicts = j.conflicts || [];
          if (!conflicts.length){
            // no conflict, save
            return fetch(`/api/devices/${dev.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cabinetId: Number(cabinetId), position: target, heightU: h }) }).then(r=>r.json()).then(()=>renderRackView(cabinetId));
          }
          // conflicts exist: show summary and ask
          const names = conflicts.map(c=>`#${c.id} ${c.name} (U${c.position}${c.heightU>1? ' - '+(Number(c.position)+c.heightU-1)+'':''})`).join('\n');
          if (!confirm(`目标位置与已有设备冲突:\n${names}\n\n是否覆盖这些设备的位置？(覆盖后这些设备的位置将被清空)`)) return;
          // user confirmed: clear conflicts then save
          const user = localStorage.getItem('hcm.user') || 'webuser';
          Promise.all(conflicts.map(c=>fetch(`/api/devices/${c.id}`, { method: 'PUT', headers: {'Content-Type':'application/json','X-User': user}, body: JSON.stringify({ position: null }) }).then(r=>r.json()).catch(()=>null))).then(()=>{
            fetch(`/api/devices/${dev.id}`, { method: 'PUT', headers: {'Content-Type':'application/json','X-User': user}, body: JSON.stringify({ cabinetId: Number(cabinetId), position: target, heightU: h }) }).then(()=>renderRackView(cabinetId));
          });
        }).catch(()=>alert('冲突检测失败'));
      });
      // if a device occupies this U, render it
      // find any device that covers this U (support multi-U); render only at its top U
      const found = devsInCab.find(d=>{
        const pos = Number(d.position);
        const h = d.heightU ? Number(d.heightU) : 1;
        return pos && u <= pos + h - 1 && u >= pos;
      });
      if (found){
        if (Number(found.position) === u){
          const el = document.createElement('div');
          el.className = 'rack-device';
          el.draggable = true;
          el.dataset.id = found.id;
          el.textContent = found.name + (found.heightU && Number(found.heightU) > 1 ? (' ('+found.heightU+'U)') : '');
          el.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', String(found.id)); });
          slot.querySelector('.u-body').appendChild(el);
          slot.style.minHeight = (28 * (found.heightU ? Number(found.heightU) : 1)) + 'px';
        }
      }
      rack.appendChild(slot);
    }
    // allow creating new device by dropping from outside? (not implemented)
  });
  // back button
  document.getElementById('back-to-cabinets').addEventListener('click', ()=>{ setPage('cabinet'); });
  // load audits for this cabinet
  fetch(`/api/audits?cabinetId=${cabinetId}`).then(r=>r.json()).then(list=>{
    const el = document.getElementById('audit-list');
    if (!el) return;
    if (!list.length) return el.textContent = '暂无操作记录';
    el.innerHTML = list.map(a=>`<div>${new Date(a.timestamp).toLocaleString()} — ${a.action} — ${a.user||'system'} — ${JSON.stringify(a.details)}</div>`).join('');
  }).catch(()=>{ const el = document.getElementById('audit-list'); if (el) el.textContent = '加载失败'; });
}

// open rack when button clicked
document.addEventListener('click', e=>{
  if (e.target && e.target.id === 'open-rack'){
    const cid = document.getElementById('cabinet-id').value;
    if (!cid) return alert('请选择机柜');
    renderRackView(cid);
  }
});

// SNMP check for selected device
document.addEventListener('click', e=>{
  if (e.target && e.target.id === 'snmp-check'){
    const id = document.getElementById('cabinet-id').value;
    if (!id) return alert('请先选择设备');
    fetch('/api/snmp-check', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: Number(id) }) }).then(r=>r.json()).then(j=>{
      if (j.online) alert('SNMP 在线: ' + (j.info||'')); else alert('SNMP 检查失败: ' + (j.error||'离线'));
      updateWidgets();
    }).catch(err=>alert('SNMP 请求出错'));
  }
});

// selection and detail
function selectId(id){
  const item = lastItems.find(i=>String(i.id)===String(id));
  if (!item) return;
  $('#cabinet-id').value = item.id;
  $('#name').value = item.name;
  $('#location').value = item.location;
  $('#description').value = item.description;
}

document.addEventListener('click', e=>{
  // click on grid card
  if (e.target.closest('.rack-card')){
    const id = e.target.closest('.rack-card').dataset.id;
    // if currently on cabinet page, navigate to device page filtered to this cabinet
    if (currentPage === 'cabinet'){
      setPage('device');
      // after page is set, populate devices filtered by cabinet id
      api.devices.list().then(devs=>{
        const items = devs.filter(d=>String(d.cabinetId) === String(id));
        lastItems = items;
        renderGrid(items, 'device');
      });
      return;
    }
    selectId(id);
  }
  // nav click
  if (e.target.matches('.nav a')){
    const txt = e.target.textContent.trim();
    if (txt === '机柜' || txt === 'Cabinets') setPage('cabinet');
    if (txt === '设备' || txt === '设备管理' || txt === 'Devices') setPage('device');
    if (txt === '网络' || txt === 'Network') setPage('network');
  }
});

function attachFormHandlers(){
  const form = document.getElementById('cabinet-form');
  form.addEventListener('submit', onFormSubmit);
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetForm);
  const delBtn = document.getElementById('delete-btn');
  if (delBtn) delBtn.addEventListener('click', onDelete);
}

function onFormSubmit(e){
  e.preventDefault();
  const id = document.getElementById('cabinet-id').value;
  if (currentPage === 'cabinet'){
    const data = { name: $('#name').value.trim(), location: $('#location').value.trim(), description: $('#description').value.trim() };
    if (!data.name){ alert('请输入名称'); return; }
    if (id) api.cabinets.update(id, data).then(()=>{ resetForm(); loadAndRender(); }); else api.cabinets.create(data).then(()=>{ resetForm(); loadAndRender(); });
  } else if (currentPage === 'device'){
    const data = { name: $('#name').value.trim(), ip: $('#ip').value.trim(), type: $('#type').value.trim(), cabinetId: $('#cabinetId').value || null, heightU: Number($('#heightU').value) || 1 };
    if (!data.name){ alert('请输入设备名称'); return; }
    if (id) api.devices.update(id, data).then(()=>{ resetForm(); loadAndRender(); }); else api.devices.create(data).then(()=>{ resetForm(); loadAndRender(); });
  }
}

function resetForm(){
  document.getElementById('cabinet-id').value='';
  const fields = ['name','location','description','ip','type','cabinetId'];
  fields.forEach(f=>{ const el = document.getElementById(f); if (el) el.value=''; });
}

function onDelete(){
  const id = document.getElementById('cabinet-id').value;
  if (!id) return alert('请选择需要删除的项');
  if (!confirm('确认删除？')) return;
  if (currentPage === 'cabinet') api.cabinets.del(id).then(()=>{ resetForm(); loadAndRender(); }); else api.devices.del(id).then(()=>{ resetForm(); loadAndRender(); });
}

// new button
$('#new-btn').addEventListener('click', ()=>{ resetForm(); document.getElementById('name') && document.getElementById('name').focus(); });

// search
$('#search').addEventListener('input', ()=>{
  if (currentPage === 'cabinet') loadAndRender(); else if (currentPage === 'device') loadAndRenderDevices();
});

function loadAndRenderDevices(){
  api.devices.list().then(items=>{
    lastItems = items;
    const q = $('#search').value.trim().toLowerCase();
    if (q) items = items.filter(i=> (i.name + ' ' + (i.ip||'') + ' ' + (i.type||'')).toLowerCase().includes(q));
    renderGrid(items, 'device');
  });
}

function loadAndRender(){
  if (currentPage === 'cabinet'){
    Promise.all([api.cabinets.list(), api.devices.list()]).then(([items, devices])=>{
      lastItems = items;
      const q = $('#search').value.trim().toLowerCase();
      if (q) items = items.filter(i=> (i.name + ' ' + (i.location||'') + ' ' + (i.description||'')).toLowerCase().includes(q));
      renderGrid(items, 'cabinet', devices);
    });
  } else if (currentPage === 'device'){
    loadAndRenderDevices();
  }
}

// import/export JSON
$('#export-json').addEventListener('click', ()=>{
  if (currentPage === 'cabinet') api.cabinets.list().then(items=>downloadJSON(items,'hcm-cabinets.json'));
  else if (currentPage === 'device') api.devices.list().then(items=>downloadJSON(items,'hcm-devices.json'));
});

function downloadJSON(items, filename){
  const blob = new Blob([JSON.stringify(items, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

$('#import-json').addEventListener('click', ()=>$('#import-file').click());
$('#import-file').addEventListener('change', e=>{
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const arr = JSON.parse(reader.result);
      if (!Array.isArray(arr)) throw new Error('需要一个数组');
      if (currentPage === 'cabinet') Promise.all(arr.map(it=>api.cabinets.create({name:it.name, location:it.location, description:it.description}))).then(()=>{ loadAndRender(); alert('导入完成'); });
      else if (currentPage === 'device') Promise.all(arr.map(it=>api.devices.create({name:it.name, ip:it.ip, type:it.type, cabinetId:it.cabinetId}))).then(()=>{ loadAndRender(); alert('导入完成'); });
    }catch(err){ alert('导入失败: '+err.message); }
  };
  reader.readAsText(f);
});

// network status
function loadNetwork(){
  api.network.status().then(s=>{
    const el = document.getElementById('network-status');
    el.innerHTML = `<div>设备总数: ${s.totalDevices}</div><div>在线: ${s.online}</div><div>离线: ${s.offline}</div><div>未知: ${s.unknown || 0}</div><div class="tiny muted">更新时间: ${s.timestamp}</div>`;
    // update widgets
    const devCountEl = document.getElementById('widget-devices-count');
    const netSummaryEl = document.getElementById('widget-network-summary');
    if (devCountEl) devCountEl.textContent = s.online;
    if (netSummaryEl) netSummaryEl.textContent = `在线 ${s.online} / 离线 ${s.offline} / 未知 ${s.unknown || 0} / 总计 ${s.totalDevices}`;
  }).catch(err=>{ const el = document.getElementById('network-status'); if (el) el.textContent = '加载失败'; });
}

function updateWidgets(){
  // fetch network summary
  api.network.status().then(s=>{
    const devCountEl = document.getElementById('widget-devices-count');
    const netSummaryEl = document.getElementById('widget-network-summary');
    if (devCountEl) devCountEl.textContent = s.online;
    if (netSummaryEl) netSummaryEl.textContent = `在线 ${s.online} / 离线 ${s.offline} / 未知 ${s.unknown || 0} / 总计 ${s.totalDevices}`;
  }).catch(()=>{});
}

// Periodic refresh
setInterval(updateWidgets, 30 * 1000);
updateWidgets();

// SNMP bulk scan
document.addEventListener('click', e=>{
  if (e.target && e.target.id === 'scan-all-snmp'){
    if (!confirm('确认对所有设备执行 SNMP 检查？这可能会花费一些时间。')) return;
    api.devices.list().then(list=>{
      const promises = list.map(d=>fetch('/api/snmp-check', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: d.id }) }).then(r=>r.json()).catch(e=>({ ip: d.ip, online:false, error:'请求失败' })));
      Promise.all(promises).then(results=>{
        const online = results.filter(r=>r.online).length;
        alert(`检测完成：在线 ${online} / 总计 ${results.length}`);
        updateWidgets();
      });
    });
  }
});

// wire nav labels to Chinese and set initial page
document.querySelectorAll('.nav a')[0].textContent = '仪表盘';
document.querySelectorAll('.nav a')[1].textContent = '机柜';
document.querySelectorAll('.nav a')[2].textContent = '设备';
// add network nav item
const netLink = document.createElement('a'); netLink.textContent = '网络'; document.querySelector('.nav').appendChild(netLink);

setPage('cabinet');
