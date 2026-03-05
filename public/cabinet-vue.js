// Vue-based cabinet view mount. Mounts onto the #grid element when the cabinet page is shown.
(function(){
  let mounted = false;
  function devicesFor(it, devices){
    return devices.filter(d => String(d.cabinetId) === String(it.id));
  }
  function buildMiniHtml(it, devices){
    const devs = devicesFor(it, devices);
    const occ = {};
    devs.forEach(d=>{
      const pos = Number(d.position);
      const h = d.heightU ? Number(d.heightU) : 1;
      if (pos && pos > 0){
        for(let k=pos; k<pos+h && k<=42; k++) occ[k] = { name: d.name, top: (k===pos) };
      }
    });
    let mini = '';
    for(let u=42; u>=1; u--){
      const info = occ[u];
      if (info){
        const display = info.top && info.name ? escapeHtml(info.name) : '';
        mini += `<span class="mini-slot occupied" title="U${u} - ${escapeHtml(info.name)}">${display}</span>`;
      } else {
        mini += `<span class="mini-slot empty" title="U${u}"></span>`;
      }
    }
    return mini;
  }
  function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]); }

  function tryMount(){
    const grid = document.getElementById('grid');
    if (!grid) return;
    // ensure this is the cabinet page: header text contains '机柜视图'
    const hdr = document.querySelector('#grid-section h3');
    if (!hdr || !/机柜/.test(hdr.textContent)) return;
    if (mounted) return;
    mounted = true;

    const App = {
      template: `
        <div class="grid">
          <div v-if="!filtered.length" class="empty">暂无机柜，点击 新建 创建第一个</div>
          <div v-for="it in filtered" :key="it.id" class="rack-card" :data-id="it.id">
            <div class="cabinet-head"><h3>{{ it.name }}</h3><div class="meta">{{ it.location }}</div></div>
            <div class="desc">{{ it.description }}</div>
            <div class="cabinet-viz">
              <div class="viz-row">设备: {{ devicesFor(it).length }}</div>
              <div class="viz-row">在线: <span class="badge online">{{ onlineFor(it) }}</span> 离线: <span class="badge offline">{{ offlineFor(it) }}</span> 未知: <span class="badge unknown">{{ unknownFor(it) }}</span></div>
              <div class="mini-rack" v-html="miniRackHtml(it)"></div>
              <div class="device-list">
                <div v-if="devicesFor(it).length" v-for="d in devicesFor(it)" class="tiny">U{{ d.position || '?' }} — {{ d.name }}</div>
                <div v-else class="tiny muted">无设备</div>
              </div>
            </div>
            <div style="margin-top:8px;display:flex;gap:8px">
              <button type="button" class="btn small" @click.stop="openRack(it.id)">打开 U 位</button>
              <button type="button" class="btn small secondary" @click.stop="editCabinet(it)">编辑</button>
            </div>
          </div>
        </div>
      `,
      data(){ return { cabinets: [], devices: [], q: (document.getElementById('search')?document.getElementById('search').value:'') } },
      computed: {
        filtered(){
          const q = (this.q||'').trim().toLowerCase();
          if (!q) return this.cabinets;
          return this.cabinets.filter(i=> (i.name + ' ' + (i.location||'') + ' ' + (i.description||'')).toLowerCase().includes(q));
        }
      },
      methods: {
        fetchAll(){
          Promise.all([api.cabinets.list(), api.devices.list()]).then(([c, d])=>{ this.cabinets = c; this.devices = d; }).catch(()=>{});
        },
        devicesFor(it){ return devicesFor(it, this.devices); },
        onlineFor(it){ return this.devicesFor(it).filter(d=>d.online===true).length; },
        offlineFor(it){ return this.devicesFor(it).filter(d=>d.online===false).length; },
        unknownFor(it){ const total=this.devicesFor(it).length; return total - this.onlineFor(it) - this.offlineFor(it); },
        miniRackHtml(it){ return buildMiniHtml(it, this.devices); },
        openRack(id){ try{ renderRackView(id); }catch(e){ alert('打开 U 位失败'); } },
        editCabinet(it){
          // populate existing detail form if present
          const idEl = document.getElementById('cabinet-id');
          if (idEl){ idEl.value = it.id; const n = document.getElementById('name'); if (n) n.value = it.name; const loc = document.getElementById('location'); if (loc) loc.value = it.location||''; const desc = document.getElementById('description'); if (desc) desc.value = it.description||''; }
        }
      },
      mounted(){
        this.fetchAll();
        const s = document.getElementById('search');
        if (s) s.addEventListener('input', ()=>{ this.q = s.value; });
        // periodic refresh
        this._timer = setInterval(()=>this.fetchAll(), 30*1000);
        // allow clicking on card to go to device list (match previous UX)
        const el = this.$el;
        el.addEventListener('click', (e)=>{
          const card = e.target.closest('.rack-card');
          if (!card) return;
          const id = card.dataset.id;
          // navigate to device list filtered to this cabinet
          try{ setPage('device'); }catch(err){}
          setTimeout(()=>{
            api.devices.list().then(devs=>{
              const items = devs.filter(d=>String(d.cabinetId) === String(id));
              try{ renderGrid(items, 'device'); }catch(err){}
            }).catch(()=>{});
          }, 120);
        });
      },
      unmounted(){ if (this._timer) clearInterval(this._timer); }
    };

    try{
      Vue.createApp(App).mount('#grid');
    }catch(err){ console.error('Vue mount failed', err); }
  }

  // poll for grid element / cabinet page and mount once
  const poll = setInterval(()=>{ tryMount(); if (mounted) clearInterval(poll); }, 300);
})();
