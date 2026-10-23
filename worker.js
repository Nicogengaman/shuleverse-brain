export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const SUPA_URL = (env.SUPABASE_URL || '').trim().replace(/\/$/, '');
    const SUPA_KEY = (env.SUPABASE_SECRET_KEY || '').trim();

    // --- BACKEND API ---
    if (url.pathname.startsWith('/api/')) {
      try {
        const p = url.pathname.replace('/api/', '');
        const h = { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' };
        let r = {};
        
        if (p === 'dashboard') {
          const c = await fetch(SUPA_URL + '/rest/v1/characters?select=count', { headers: { ...h, 'Prefer': 'count=exact' } });
          const e = await fetch(SUPA_URL + '/rest/v1/episodes?select=count', { headers: { ...h, 'Prefer': 'count=exact' } });
          r = { chars: Number(c.headers.get('content-range')?.split('/')[1] || 0), eps: Number(e.headers.get('content-range')?.split('/')[1] || 0) };
        } 
        else if (p === 'entities') {
          const t = url.searchParams.get('table');
          const f = url.searchParams.get('filter') || '';
          const res = await fetch(SUPA_URL + '/rest/v1/' + t + '?select=*&' + f, { headers: h });
          r = await res.json();
        }
        else if (p === 'create') {
          const body = await request.json();
          const res = await fetch(SUPA_URL + '/rest/v1/' + body.table, { method: 'POST', headers: { ...h, 'Prefer': 'return=representation' }, body: JSON.stringify(body.data) });
          const d = await res.json();
          if (!res.ok) throw new Error(d.message || 'Insert failed');
          r = { ok: true, data: d[0] };
        }
        else if (p === 'update') {
          const body = await request.json();
          const res = await fetch(SUPA_URL + '/rest/v1/' + body.table + '?' + body.idField + '=eq.' + body.id, { method: 'PATCH', headers: h, body: JSON.stringify(body.data) });
          r = await res.json();
        }
        else if (p === 'retire') {
          const body = await request.json();
          const res = await fetch(SUPA_URL + '/rest/v1/' + body.table + '?' + body.idField + '=eq.' + body.id, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'RETIRED' }) });
          r = await res.json();
        }
        
        return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // --- FRONTEND UI ---
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>ShuleVerse</title>
        <style>
          :root { --bg: #0f111a; --pn: #1c1f2b; --cd: #252936; --tx: #f0f2f5; --gd: #f5a623; --mt: #8b92a5; --bl: #3b82f6; --br: #32374a; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
          body { background: var(--bg); color: var(--tx); height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
          header { height: 60px; background: var(--pn); display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-bottom: 1px solid var(--br); flex-shrink: 0; }
          .menu-btn { background: none; border: none; color: var(--tx); font-size: 24px; cursor: pointer; }
          main { flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 90px; }
          .content { display: none; }
          .content.active { display: block; }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .card { background: var(--cd); padding: 20px; border-radius: 12px; border: 1px solid var(--br); text-align: center; }
          .val { font-size: 28px; font-weight: 900; color: var(--bl); }
          .lbl { font-size: 12px; color: var(--mt); text-transform: uppercase; margin-top: 4px; }
          
          .item { background: var(--cd); padding: 16px; border-radius: 12px; border: 1px solid var(--br); margin-bottom: 12px; cursor: pointer; }
          .title { font-weight: bold; font-size: 16px; }
          .sub { font-size: 12px; color: var(--gd); margin-top: 4px; }

          .nav { height: 60px; background: var(--pn); border-top: 1px solid var(--br); display: flex; justify-content: space-around; align-items: center; flex-shrink: 0; z-index: 10; }
          .tab { color: var(--mt); font-size: 11px; font-weight: bold; cursor: pointer; padding: 10px; text-align: center; width: 25%; }
          .tab.active { color: var(--gd); }
          
          .subnav { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 8px; }
          .snav-b { background: var(--cd); border: 1px solid var(--br); color: var(--tx); padding: 6px 12px; border-radius: 20px; font-weight: bold; cursor: pointer; white-space: nowrap; }
          .snav-b.active { background: var(--bl); color: #fff; border-color: var(--bl); }

          .add-btn { position: fixed; bottom: 75px; right: 20px; width: 55px; height: 55px; border-radius: 30px; background: var(--gd); color: #000; font-size: 28px; font-weight: bold; border: none; box-shadow: 0 4px 15px rgba(245,166,35,0.4); cursor: pointer; display: none; align-items: center; justify-content: center; z-index: 90; }
          
          .mdl { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 200; display: none; justify-content: center; align-items: flex-end; }
          .mdl-c { background: var(--pn); width: 100%; max-width: 600px; border-radius: 20px 20px 0 0; padding: 24px; max-height: 90vh; overflow-y: auto; border: 1px solid var(--br); border-bottom: none; }
          .mdl-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .mdl-h h3 { color: var(--gd); font-size: 20px; }
          .close { background: none; border: none; color: var(--mt); font-size: 28px; cursor: pointer; }
          
          .fg { margin-bottom: 16px; }
          .fg label { display: block; font-size: 12px; color: var(--mt); margin-bottom: 6px; text-transform: uppercase; font-weight: 600; }
          .fg input, .fg select, .fg textarea { width: 100%; padding: 12px; background: var(--bg); border: 1px solid var(--br); border-radius: 8px; color: var(--tx); font-size: 14px; }
          .btn { width: 100%; padding: 14px; border-radius: 8px; border: none; font-weight: bold; font-size: 15px; cursor: pointer; background: var(--bl); color: #fff; margin-top: 10px; }
        </style>
      </head>
      <body>
        <header>
          <button class="menu-btn" onclick="alert('Menu works!')">☰</button>
          <h2>🧠 ShuleVerse</h2>
          <div style="width: 24px;"></div>
        </header>
        
        <main>
          <div id="content-home" class="content active">
            <h3 style="margin-bottom: 16px;">Dashboard</h3>
            <div class="grid">
              <div class="card"><div class="val" id="stat-chars">...</div><div class="lbl">Characters</div></div>
              <div class="card"><div class="val" id="stat-eps">...</div><div class="lbl">Episodes</div></div>
            </div>
          </div>
          
          <div id="content-universe" class="content">
            <div class="subnav">
              <button class="snav-b active" id="btn-characters" onclick="loadEntityList('characters')">Characters</button>
              <button class="snav-b" id="btn-locations" onclick="loadEntityList('locations')">Locations</button>
              <button class="snav-b" id="btn-props" onclick="loadEntityList('props')">Props</button>
            </div>
            <div id="list-universe">Loading...</div>
          </div>
          
          <div id="content-stories" class="content">
            <h3 style="margin-bottom: 16px;">Episodes</h3>
            <div id="list-episodes">Loading...</div>
          </div>
          
          <div id="content-ai" class="content">
            <h3 style="margin-bottom: 16px;">AI Studio</h3>
            <p style="color:var(--mt)">AI will be added in Batch 4.</p>
          </div>
        </main>

        <button class="add-btn" id="add-btn" onclick="openAddModal()">+</button>

        <div class="nav">
          <div class="tab active" id="tab-home" onclick="go('home')">🏠 Home</div>
          <div class="tab" id="tab-universe" onclick="go('universe')">🌍 Universe</div>
          <div class="tab" id="tab-stories" onclick="go('stories')">📖 Stories</div>
          <div class="tab" id="tab-ai" onclick="go('ai')">✨ AI</div>
        </div>

        <!-- MODAL -->
        <div id="modal" class="mdl">
          <div class="mdl-c">
            <div class="mdl-h"><h3 id="m-title">Add</h3><button class="close" onclick="document.getElementById('modal').style.display='none'">&times;</button></div>
            <div id="m-form"></div>
            <button class="btn" onclick="saveEntity()" id="m-save">Save</button>
          </div>
        </div>

        <script>
          let currentTab = 'home';
          let currentEntity = 'characters';
          let editingId = null;

          const entityConfig = {
            characters: { id: 'character_id', typeField: 'character_type', types: ['STAFF', 'LEARNER', 'COMMUNITY_MEMBER', 'OTHER'] },
            locations: { id: 'location_id', typeField: 'location_type', types: ['SCHOOL_AREA', 'CLASSROOM', 'OFFICE', 'STAFF_AREA', 'PLAYGROUND', 'HOME', 'COMMUNITY_LOCATION', 'ROAD'] },
            props: { id: 'prop_id', typeField: 'prop_type', types: ['CONTAINER', 'PERSONAL_ITEM', 'SCHOOL_MATERIAL', 'ADMINISTRATIVE_MATERIAL', 'TIMEKEEPING_DEVICE', 'TEACHING_MATERIAL', 'SCHOOL_EQUIPMENT', 'FURNITURE', 'ELECTRONIC_DEVICE'] }
          };

          function go(page) {
            currentTab = page;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + page).classList.add('active');
            document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
            document.getElementById('content-' + page).classList.add('active');
            
            document.getElementById('add-btn').style.display = (page === 'universe' || page === 'stories') ? 'flex' : 'none';

            if (page === 'home') loadDashboard();
            if (page === 'universe') loadEntityList(currentEntity);
            if (page === 'stories') loadEpisodes();
          }

          async function loadDashboard() {
            try {
              const r = await fetch('/api/dashboard');
              const d = await r.json();
              if (d.chars !== undefined) {
                document.getElementById('stat-chars').innerText = d.chars;
                document.getElementById('stat-eps').innerText = d.eps;
              }
            } catch (e) { console.error(e); }
          }

          async function loadEntityList(type) {
            currentEntity = type;
            document.querySelectorAll('.snav-b').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-' + type).classList.add('active');

            const l = document.getElementById('list-universe');
            l.innerHTML = 'Loading...';
            try {
              const r = await fetch('/api/entities?table=' + type);
              const d = await r.json();
              if (Array.isArray(d)) {
                if (d.length === 0) return l.innerHTML = 'No items found.';
                const cfg = entityConfig[type];
                let html = '';
                d.forEach(item => {
                  const id = item[cfg.id];
                  const typeVal = item[cfg.typeField] || '';
                  const safeName = (item.name || '').replace(/'/g, "\\\\'");
                  html += '<div class="item" onclick="openEditModal(\\''+type+'\\', \\''+id+'\\', \\''+safeName+'\\', \\''+typeVal+'\\')">';
                  html += '<div class="title">' + (item.name || 'Unnamed') + '</div>';
                  html += '<div class="sub">' + id + ' • ' + typeVal + '</div>';
                  html += '</div>';
                });
                l.innerHTML = html;
              }
            } catch (e) { l.innerHTML = 'Error loading data'; }
          }

          function openAddModal() {
            editingId = null;
            if (currentTab === 'universe') {
              const cfg = entityConfig[currentEntity];
              let form = '<div class="fg"><label>Name</label><input id="f-name"></div>';
              form += '<div class="fg"><label>Type</label><select id="f-type">';
              cfg.types.forEach(v => form += '<option value="'+v+'">'+v+'</option>');
              form += '</select></div>';
              document.getElementById('m-title').innerText = 'Add New';
              document.getElementById('m-form').innerHTML = form;
              document.getElementById('m-save').innerText = 'Create';
              document.getElementById('modal').style.display = 'flex';
            }
          }

          function openEditModal(type, id, name, typeVal) {
            editingId = id;
            const cfg = entityConfig[type];
            let form = '<div class="fg"><label>Name</label><input id="f-name" value="' + name + '"></div>';
            form += '<div class="fg"><label>Type</label><select id="f-type">';
            cfg.types.forEach(v => { form += '<option value="'+v+'" '+(v===typeVal?'selected':'')+'>'+v+'</option>'; });
            form += '</select></div>';
            
            document.getElementById('m-title').innerText = 'Edit ' + type.slice(0,-1);
            document.getElementById('m-form').innerHTML = form;
            document.getElementById('m-save').innerText = 'Update';
            
            const delBtn = document.createElement('button');
            delBtn.className = 'btn';
            delBtn.style.background = 'rgba(255,94,98,0.2)';
            delBtn.style.color = '#ff5e62';
            delBtn.style.border = '1px solid #ff5e62';
            delBtn.innerText = 'Retire';
            delBtn.onclick = async () => {
              if(confirm('Retire this record?')) {
                await fetch('/api/retire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: type, idField: cfg.id, id: id }) });
                document.getElementById('modal').style.display = 'none';
                loadEntityList(type);
              }
            };
            document.getElementById('m-form').appendChild(delBtn);
            document.getElementById('modal').style.display = 'flex';
          }

          async function saveEntity() {
            const btn = document.getElementById('m-save'); btn.innerText = 'Saving...'; btn.disabled = true;
            const cfg = entityConfig[currentEntity];
            const payload = {
              name: document.getElementById('f-name').value,
              [cfg.typeField]: document.getElementById('f-type').value,
              canon_status: 'PENDING_REVIEW',
              status: 'ACTIVE'
            };

            try {
              if (editingId) {
                await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: currentEntity, idField: cfg.id, id: editingId, data: payload }) });
              } else {
                await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: currentEntity, data: payload }) });
              }
              document.getElementById('modal').style.display = 'none';
              loadEntityList(currentEntity);
            } catch(e) { alert('Error: ' + e.message); } finally { btn.innerText = 'Save'; btn.disabled = false; }
          }

          async function loadEpisodes() {
            const l = document.getElementById('list-episodes'); l.innerHTML = 'Loading...';
            try {
              const r = await fetch('/api/entities?table=episodes'); const d = await r.json();
              if (Array.isArray(d)) {
                if (d.length === 0) return l.innerHTML = 'No episodes found.';
                let html = '';
                d.forEach(e => {
                  html += '<div class="item"><div class="title">' + (e.title || 'Untitled') + '</div><div class="sub">' + (e.episode_code || '') + '</div></div>';
                });
                l.innerHTML = html;
              }
            } catch (e) { l.innerHTML = 'Error loading data'; }
          }

          loadDashboard();
        </script>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
};
