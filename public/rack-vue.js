// Vue-based U-slot (rack) view. Replaces global renderRackView(cabinetId).
(function(){
  function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]); }

  // Expose renderRackView globally so existing code calls work
  window.renderRackView = function(cabinetId){
    const main = document.querySelector('.content');
    if (!main) return;
    // create mount container
    main.innerHTML = `<section id="rack-section" class="card" style="width:100%"><h3>机柜 ${escapeHtml(String(cabinetId))} - U 位视图</h3><div id="rack-mount"></div><div style="margin-top:12px"><button id="back-to-cabinets-vue" class="btn secondary">返回机柜列表</button></div></section>`;

    const App = {
      template: `
        <div>
          <div id="rack" class="rack">
            <div v-for="u in slots" :key="u" class="rack-slot" :data-u="u" :style="slotStyle(u)">
              <div class="u-label">U{{ u }}</div>
              <div class="u-body" @dragover.prevent="onDragOver($event,u)" @dragleave="onDragLeave($event,u)" @drop.prevent="onDrop($event,u)">
                <div v-if="deviceAtTop(u)" class="rack-device" draggable="true" :data-id="deviceAtTop(u).id" @dragstart="onDragStart($event, deviceAtTop(u).id)">{{ deviceAtTop(u).name }}<span v-if="deviceAtTop(u).heightU && deviceAtTop(u).heightU>1"> ({{deviceAtTop(u).heightU}}U)</span></div>
              </div>
            </div>
          </div>
          <div style="margin-top:12px">
            <h4>操作历史</h4>
            <div v-if="audits.length===0" class="tiny muted">暂无操作记录</div>
            <div v-else class="tiny"> <div v-for="a in audits" :key="a.id">{{ formatDate(a.timestamp) }} — {{ a.action }} — {{ a.user||'system' }}</div></div>
          </div>
        </div>
      `,
      data(){ return { devices: [], audits: [], refreshTimer: null, slots: Array.from({length:42}, (_,i)=>42-i) } },
      methods: {
        fetchData(){
          api.devices.list().then(all=>{ this.devices = all.filter(d=>String(d.cabinetId)===String(cabinetId)); }).catch(()=>{});
          fetch(`/api/audits?cabinetId=${cabinetId}`).then(r=>r.json()).then(list=>{ this.audits = list; }).catch(()=>{});
        },
        deviceCoversU(dev,u){
          const pos = Number(dev.position);
          const h = dev.heightU ? Number(dev.heightU) : 1;
          return pos && u <= pos + h -1 && u >= pos;
        },
        deviceAtTop(u){ return this.devices.find(d=> Number(d.position) === Number(u)); },
        onDragStart(e, id){ e.dataTransfer.setData('text/plain', String(id)); },
        onDragOver(e,u){ e.currentTarget.classList && e.currentTarget.classList.add('drag-over'); },
        onDragLeave(e,u){ e.currentTarget.classList && e.currentTarget.classList.remove('drag-over'); },
        onDrop(e, u){ const did = e.dataTransfer.getData('text/plain'); if (!did) return; const dev = this.devices.concat([]).find(d=>String(d.id)===String(did)); if (!dev) return alert('设备未找到'); const h = dev.heightU ? Number(dev.heightU) : 1; const target = Number(u); if (target + h - 1 > 42) return alert('设备高度超出机柜范围');
          // conflict check
          fetch('/api/check-position', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cabinetId: Number(cabinetId), position: target, heightU: h }) }).then(r=>r.json()).then(j=>{
            const conflicts = j.conflicts || [];
            if (!conflicts.length){
              return fetch(`/api/devices/${dev.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cabinetId: Number(cabinetId), position: target, heightU: h }) }).then(()=>this.fetchData());
            }
            const names = conflicts.map(c=>`#${c.id} ${c.name} (U${c.position}${c.heightU>1? ' - '+(Number(c.position)+c.heightU-1)+'':''})`).join('\n');
            if (!confirm(`目标位置与已有设备冲突:\n${names}\n\n是否覆盖这些设备的位置？(覆盖后这些设备的位置将被清空)`)) return;
            const user = localStorage.getItem('hcm.user') || 'webuser';
            Promise.all(conflicts.map(c=>fetch(`/api/devices/${c.id}`, { method: 'PUT', headers: {'Content-Type':'application/json','X-User': user}, body: JSON.stringify({ position: null }) }).then(r=>r.json()).catch(()=>null))).then(()=>{
              fetch(`/api/devices/${dev.id}`, { method: 'PUT', headers: {'Content-Type':'application/json','X-User': user}, body: JSON.stringify({ cabinetId: Number(cabinetId), position: target, heightU: h }) }).then(()=>this.fetchData());
            });
          }).catch(()=>alert('冲突检测失败'));
        },
        formatDate(s){ try{ return new Date(s).toLocaleString(); }catch(e){ return s; } },
        slotStyle(u){
          const dev = this.deviceAtTop(u);
          if (dev) return {'min-height': (28 * (dev.heightU ? Number(dev.heightU) : 1)) + 'px'};
          return {};
        }
      },
      mounted(){ this.fetchData(); this.refreshTimer = setInterval(()=>this.fetchData(), 30*1000); }
    };

    // mount into rack-mount
    try{ Vue.createApp(App).mount('#rack-mount'); }catch(e){ console.error('mount rack-vue failed', e); }

    // wire back button
    const back = document.getElementById('back-to-cabinets-vue');
    if (back) back.addEventListener('click', ()=>{ setPage('cabinet'); });
  };
})();
