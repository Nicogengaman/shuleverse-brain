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
        else if (p === 'changelog') {
          const res = await fetch(SUPA_URL + '/rest/v1/change_log?select=*&order=timestamp.desc&limit=50', { headers: h });
          r = await res.json();
        }
        else if (p === 'ai') {
          const body = await request.json();
          const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
          let lastError = 'Capacity exhausted';
          
          for (const model of MODELS) {
            try {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: body.p }] }], systemInstruction: body.s ? { parts: [{ text: body.s }] } : undefined }),
                signal: AbortSignal.timeout(20000)
              });
              if (res.ok) {
                const j = await res.json();
                const txt = j.candidates?.[0]?.content?.parts?.[0]?.text;
                if (txt) { r = { ok: true, text: txt }; break; }
              } else if (res.status !== 429 && res.status < 500) {
                const err = await res.json();
                throw new Error(err.error?.message || `API Error ${res.status}`);
              }
            } catch (e) { lastError = e.message; }
          }
          if (!r.ok) throw new Error(lastError);
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
          
          /* ABSOLUTE FIXED LAYOUT */
          body { background: var(--bg); color: var(--tx); overflow: hidden; margin: 0; padding: 0; }
          header { position: fixed; top: 0; left: 0; width: 100%; height: 60px; background: var(--pn); display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-bottom: 1px solid var(--br); z-index: 100; }
          main { position: absolute; top: 60px; bottom: 60px; left: 0; width: 100%; overflow-y: auto; padding: 20px; }
          .nav { position: fixed; bottom: 0; left: 0; width: 100%; height: 60px; background: var(--pn); border-top: 1px solid var(--br); display: flex; justify-content: space-around; align-items: center; z-index: 100; }
          
          .menu-btn { background: none; border: none; color: var(--tx); font-size: 24px; cursor: pointer; }
          .content { display: none; }
          .content.active { display: block; }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .card { background: var(--cd); padding: 20px; border-radius: 12px; border: 1px solid var(--br); text-align: center; }
          .val { font-size: 28px; font-weight: 900; color: var(--bl); }
          .lbl { font-size: 12px; color: var(--mt); text-transform: uppercase; margin-top: 4px; }
          
          .item { background: var(--cd); padding: 16px; border-radius: 12px; border: 1px solid var(--br); margin-bottom: 12px; cursor: pointer; }
          .title { font-weight: bold; font-size: 16px; }
          .sub { font-size: 12px; color: var(--gd); margin-top: 4px; }

          .tab { color: var(--mt); font-size: 11px; font-weight: bold; cursor: pointer; padding: 10px; text-align: center; width: 25%; }
          .tab.active { color: var(--gd); }
          
          .subnav { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 8px; }
          .snav-b { background: var(--cd); border: 1px solid var(--br); color: var(--tx); padding: 6px 12px; border-radius: 20px; font-weight: bold; cursor: pointer; white-space: nowrap; }
          .snav-b.active { background: var(--bl); color: #fff; border-color: var(--bl); }

          .add-btn { position: fixed; bottom: 75px; right: 20px; width: 55px; height: 55px; border-radius: 30px; background: var(--gd); color: #000; font-size: 28px; font-weight: bold; border: none; box-shadow: 0 4px 15px rgba(245,166,35,0.4); cursor: pointer; display: none; align-items: center; justify-content: center; z-index: 90; }
          
          .mdl { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 200; display: none; justify-content: center; align-items: flex-end; }
          .mdl-c { background: var(--pn); width: 100%; max-width: 600px; border-radius: 20px 20px 0 0; padding: 24px; max-height: 85vh; overflow-y: auto; border: 1px solid var(--br); border-bottom: none; }
          .mdl-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .mdl-h h3 { color: var(--gd); font-size: 20px; }
          .close { background: none; border: none; color: var(--mt); font-size: 28px; cursor: pointer; }
          
          .fg { margin-bottom: 16px; }
          .fg label { display: block; font-size: 12px; color: var(--mt); margin-bottom: 6px; text-transform: uppercase; font-weight: 600; }
          .fg input, .fg select, .fg textarea { width: 100%; padding: 12px; background: var(--bg); border: 1px solid var(--br); border-radius: 8px; color: var(--tx); font-size: 14px; }
          .btn { width: 100%; padding: 14px; border-radius: 8px; border: none; font-weight: bold; font-size: 15px; cursor: pointer; background: var(--bl); color: #fff; margin-top: 10px; }
          
          .ai-c { background: var(--cd); border: 1px solid var(--br); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
          .ai-t { color: var(--gd); font-weight: bold; margin-bottom: 8px; font-size: 16px; }
          .ai-r { background: var(--bg); border: 1px solid var(--br); padding: 12px; border-radius: 8px; margin-top: 12px; white-space: pre-wrap; font-size: 13px; line-height: 1.5; max-height: 250px; overflow-y: auto; display: none; }
          
          .scene-box { background: var(--cd); border-left: 3px solid var(--gd); padding: 12px; margin-bottom: 12px; border-radius: 0 8px 8px 0; }
          .ai-btn-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
          .ai-btn { flex: 1; padding: 6px; background: var(--bg); color: white; border: 1px solid var(--br); border-radius: 6px; font-size: 11px; cursor: pointer; }
        </style>
      </head>
      <body>
        <header>
          <button class="menu-btn" onclick="document.getElementById('menu-modal').style.display='flex'">☰</button>
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

          <div id="content-episode-detail" class="content">
            <button class="btn" style="width:auto; padding:8px 16px; margin-bottom:16px; background:var(--cd); color:var(--tx); border:1px solid var(--br);" onclick="go('stories')">← Back</button>
            <h2 id="ep-title" style="margin-bottom:8px;"></h2>
            <p id="ep-syn" style="color:var(--mt); font-size:13px; margin-bottom:16px;"></p>
            
            <div style="display:flex; gap:8px; margin-bottom:16px;">
               <button class="btn" style="width:auto; padding:8px 12px; margin:0; background:var(--gd); color:#000;" onclick="runStoryDoctor()">🩺 Story Doctor</button>
               <button class="btn" style="width:auto; padding:8px 12px; margin:0;" onclick="runPitchDeck()">📊 Pitch Deck</button>
            </div>

            <h3 style="margin-bottom:12px; color:var(--gd);">Scenes</h3>
            <div id="scene-list"></div>
          </div>
          
          <div id="content-ai" class="content">
            <h3 style="margin-bottom: 16px; color: var(--gd);">AI Studio</h3>
            <div class="ai-c">
              <div class="ai-t">💡 Generate Episode Idea</div>
              <textarea id="ai-prompt" style="width:100%;height:70px;padding:10px;border-radius:8px;background:var(--bg);color:white;border:1px solid var(--br)"></textarea>
              <button class="btn" onclick="genCtxIdea()">Generate</button>
              <div id="ai-res" class="ai-r"></div>
            </div>
            <div class="ai-c">
              <div class="ai-t">🎬 Auto-Scenes Generator</div>
              <select id="ai-ep-select" style="width:100%;padding:10px;border-radius:8px;background:var(--bg);color:white;border:1px solid var(--br);margin-bottom:10px;"></select>
              <button class="btn" onclick="genAutoScenes()">Generate 4 Scenes</button>
              <div id="ai-scene-res" class="ai-r"></div>
            </div>
          </div>
        </main>

        <button class="add-btn" id="add-btn" onclick="openAddModal()">+</button>

        <div class="nav">
          <div class="tab active" id="tab-home" onclick="go('home')">🏠 Home</div>
          <div class="tab" id="tab-universe" onclick="go('universe')">🌍 Universe</div>
          <div class="tab" id="tab-stories" onclick="go('stories')">📖 Stories</div>
          <div class="tab" id="tab-ai" onclick="go('ai')">✨ AI</div>
        </div>

        <!-- MODALS -->
        <div id="menu-modal" class="mdl">
          <div class="mdl-c">
            <div class="mdl-h"><h3>Admin Menu</h3><button class="close" onclick="document.getElementById('menu-modal').style.display='none'">&times;</button></div>
            <div onclick="viewLogs()" style="padding:16px 0; border-bottom:1px solid var(--br); cursor:pointer; color:white; font-size:16px;">📋 Change Logs</div>
            <div onclick="alert('Backup coming soon')" style="padding:16px 0; border-bottom:1px solid var(--br); cursor:pointer; color:white; font-size:16px;">💾 Export Backup</div>
          </div>
        </div>

        <div id="modal" class="mdl">
          <div class="mdl-c">
            <div class="mdl-h"><h3 id="m-title">Add</h3><button class="close" onclick="document.getElementById('modal').style.display='none'">&times;</button></div>
            <div id="m-form"></div>
            <button class="btn" onclick="saveEntity()" id="m-save">Save</button>
          </div>
        </div>

        <div id="log-modal" class="mdl">
          <div class="mdl-c">
            <div class="mdl-h"><h3>Change Logs</h3><button class="close" onclick="document.getElementById('log-modal').style.display='none'">&times;</button></div>
            <div id="log-list" style="font-size:13px; line-height:1.6;"></div>
          </div>
        </div>

        <script>
          let currentTab = 'home';
          let currentEntity = 'characters';
          let editingId = null;
          let currentEpisodeId = null;

          const entityConfig = {
            characters: { id: 'character_id', typeField: 'character_type', types: ['STAFF', 'LEARNER', 'COMMUNITY_MEMBER', 'OTHER'] },
            locations: { id: 'location_id', typeField: 'location_type', types: ['SCHOOL_AREA', 'CLASSROOM', 'OFFICE', 'STAFF_AREA', 'PLAYGROUND', 'HOME', 'COMMUNITY_LOCATION', 'ROAD'] },
            props: { id: 'prop_id', typeField: 'prop_type', types: ['CONTAINER', 'PERSONAL_ITEM', 'SCHOOL_MATERIAL', 'ADMINISTRATIVE_MATERIAL', 'TIMEKEEPING_DEVICE', 'TEACHING_MATERIAL', 'SCHOOL_EQUIPMENT', 'FURNITURE', 'ELECTRONIC_DEVICE'] }
          };

          function go(page) {
            currentTab = page;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
            
            if (page === 'episode-detail') {
              document.getElementById('tab-stories').classList.add('active');
              document.getElementById('content-episode-detail').classList.add('active');
            } else {
              const tabEl = document.getElementById('tab-' + page);
              if(tabEl) tabEl.classList.add('active');
              const contentEl = document.getElementById('content-' + page);
              if(contentEl) contentEl.classList.add('active');
            }
            
            document.getElementById('add-btn').style.display = (page === 'universe' || page === 'stories') ? 'flex' : 'none';

            if (page === 'home') loadDashboard();
            if (page === 'universe') loadEntityList(currentEntity);
            if (page === 'stories') loadEpisodes();
            if (page === 'ai') populateAiDropdowns();
          }

          async function viewLogs() {
            document.getElementById('menu-modal').style.display = 'none';
            document.getElementById('log-modal').style.display = 'flex';
            const list = document.getElementById('log-list'); list.innerText = 'Loading...';
            try {
              const r = await fetch('/api/changelog'); const d = await r.json();
              if (Array.isArray(d) && d.length > 0) {
                list.innerHTML = d.map(l => '<div style="border-bottom:1px solid var(--br); padding:8px 0;"><b>['+(l.timestamp?l.timestamp.split('T')[1].split('.')[0]:'')+'] '+l.operation+'</b> '+l.entity_type.toUpperCase()+'<br><span style="color:var(--mt)">By: '+l.actor+'</span></div>').join('');
              } else list.innerText = 'No logs found.';
            } catch(e) { list.innerText = 'Error loading logs.'; }
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
            } else if (currentTab === 'stories') {
               document.getElementById('m-title').innerText = 'Add New Episode';
               document.getElementById('m-form').innerHTML = '<div class="fg"><label>Title</label><input id="f-title"></div><div class="fg"><label>Logline</label><input id="f-logline"></div><div class="fg"><label>Synopsis</label><textarea id="f-synopsis"></textarea></div>';
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
            
            if (type === 'characters') {
              const timeBtn = document.createElement('button');
              timeBtn.className = 'btn';
              timeBtn.style.background = 'var(--bl)';
              timeBtn.innerText = '📖 View Timeline';
              timeBtn.onclick = () => showTimeline(id, name);
              document.getElementById('m-form').appendChild(timeBtn);
            }

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
            
            if (currentTab === 'universe') {
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
            } else {
              const p = { title: document.getElementById('f-title').value, logline: document.getElementById('f-logline').value, synopsis: document.getElementById('f-synopsis').value, canon_status: 'PENDING_REVIEW', lifecycle_status: 'PLANNED', episode_code: 'SV-E' + Date.now().toString().slice(-3) };
              try {
                await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'episodes', data: p }) });
                document.getElementById('modal').style.display = 'none';
                loadEpisodes();
              } catch(e) { alert('Error: ' + e.message); } finally { btn.innerText = 'Save'; btn.disabled = false; }
            }
          }

          async function loadEpisodes() {
            const l = document.getElementById('list-episodes'); l.innerHTML = 'Loading...';
            try {
              const r = await fetch('/api/entities?table=episodes'); const d = await r.json();
              if (Array.isArray(d)) {
                if (d.length === 0) return l.innerHTML = 'No episodes found.';
                let html = '';
                d.forEach(e => {
                  const safeTitle = (e.title||'Untitled').replace(/'/g, "\\\\'");
                  const safeSyn = (e.synopsis||'').replace(/'/g, "\\\\'").replace(/\n/g, " ");
                  html += '<div class="item" onclick="openEpisode(\\''+e.episode_id+'\\', \\''+safeTitle+'\\', \\''+safeSyn+'\\')"><div class="title">' + safeTitle + '</div><div class="sub">' + (e.episode_code || '') + '</div></div>';
                });
                l.innerHTML = html;
              }
            } catch (e) { l.innerHTML = 'Error loading data'; }
          }

          async function openEpisode(id, title, synopsis) {
            currentEpisodeId = id;
            go('episode-detail');
            document.getElementById('content-episode-detail').classList.add('active');
            document.getElementById('ep-title').innerText = title;
            document.getElementById('ep-syn').innerText = synopsis;
            const l = document.getElementById('scene-list'); l.innerHTML = 'Loading scenes...';
            
            try {
              const r = await fetch('/api/entities?table=scenes&filter=episode_id=eq.' + id + '&order=scene_number.asc');
              const d = await r.json();
              if (Array.isArray(d)) {
                if (d.length === 0) return l.innerHTML = '<p style="color:var(--mt)">No scenes yet. Use the AI tab to generate some!</p>';
                let html = '';
                d.forEach(s => {
                  const sumStr = (s.summary || '').replace(/'/g, "\\\\\\\\'");
                  html += '<div class="scene-box">';
                  html += '<div class="title">Scene ' + s.scene_number + ': ' + (s.title||'') + '</div>';
                  html += '<div style="font-size:13px; color:var(--mt); margin-top:4px;">' + (s.summary||'') + '</div>';
                  html += '<div class="ai-btn-row">';
                  html += '<button class="ai-btn" onclick="sceneAi(\\'Expand\\', \\'' + sumStr + '\\')">🪄 Expand</button>';
                  html += '<button class="ai-btn" onclick="sceneAi(\\'Concept\\', \\'' + sumStr + '\\')">📸 Art</button>';
                  html += '<button class="ai-btn" onclick="sceneAi(\\'Mood\\', \\'' + sumStr + '\\')">🎥 Mood</button>';
                  html += '</div></div>';
                });
                l.innerHTML = html;
              }
            } catch (e) { l.innerHTML = 'Error loading scenes.'; }
          }

          async function showTimeline(charId, charName) {
            document.getElementById('modal').style.display = 'none';
            alert('Loading timeline for ' + charName + '...');
            try {
              const pr = await fetch('/api/entities?table=scene_participants&filter=character_id=eq.' + charId);
              const pd = await pr.json();
              if (!pd || pd.length === 0) return alert(charName + ' is not in any scenes yet.');
              
              const sr = await fetch('/api/entities?table=scenes'); const sd = await sr.json();
              let tl = '📖 TIMELINE: ' + charName + '\\n\\n';
              
              sd.forEach(s => { 
                if (pd.map(p=>p.scene_id).includes(s.scene_id)) tl += '• Scene ' + s.scene_number + ': ' + (s.title||'') + '\\n'; 
              });
              alert(tl);
            } catch(e) { alert('Error loading timeline.'); }
          }

          async function getContext() {
            const c = await (await fetch('/api/entities?table=characters')).json();
            const l = await (await fetch('/api/entities?table=locations')).json();
            let ctx = "UNIVERSE CONTEXT:\\n";
            if (Array.isArray(c)) ctx += "CHARACTERS:\\n" + c.map(x=>'- '+x.name+' ('+x.character_type+'): '+x.role).join('\\n');
            if (Array.isArray(l)) ctx += "\\nLOCATIONS:\\n" + l.map(x=>'- '+x.name).join('\\n');
            return ctx;
          }

          async function populateAiDropdowns() {
            try {
              const ep = await (await fetch('/api/entities?table=episodes')).json();
              if (Array.isArray(ep)) {
                document.getElementById('ai-ep-select').innerHTML = ep.map(e=>'<option value="'+e.episode_id+'">'+e.title+'</option>').join('');
              }
            } catch(e) {}
          }

          async function genCtxIdea() {
            const p = document.getElementById('ai-prompt').value; if (!p) return;
            const b = document.getElementById('ai-res'); b.style.display = 'block'; b.innerText = 'Reading context...';
            const ctx = await getContext();
            const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: 'Idea: ' + p, s: 'You are the AI for a Kenyan school drama. Here is canon:\\n' + ctx + '\\n\\nReturn ONLY a valid JSON object with keys: title, logline, synopsis. No markdown.' }) });
            const d = await r.json();
            if (d.ok) {
              const bt = String.fromCharCode(96); const reg = new RegExp(bt+bt+bt+'json|'+bt+bt+bt, 'gi'); let txt = d.text.replace(reg, '').trim();
              try { const j = JSON.parse(txt); const nl = String.fromCharCode(10); b.innerText = 'TITLE: '+j.title+nl+nl+'LOGLINE: '+j.logline+nl+nl+'SYNOPSIS: '+j.synopsis; } catch(e) { b.innerText = txt; }
            } else b.innerText = 'Error: ' + d.error;
          }

          async function genAutoScenes() {
            const id = document.getElementById('ai-ep-select').value; if (!id) return;
            const b = document.getElementById('ai-scene-res'); b.style.display = 'block'; b.innerText = 'Reading context...';
            const ctx = await getContext();
            const ep = await (await fetch('/api/entities?table=episodes&filter=episode_id=eq.'+id)).json();
            if (!ep || ep.length === 0) return;
            const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: 'Synopsis: ' + ep[0].synopsis, s: 'You are an architect. Here is canon:\\n' + ctx + '\\n\\nReturn ONLY a valid JSON array of 4 objects with keys: title, summary, sequence_label (OPENING, ESCALATION, ENCOUNTER, CONFRONTATION, CLIFFHANGER). No markdown.' }) });
            const d = await r.json();
            if (d.ok) {
              const bt = String.fromCharCode(96); const reg = new RegExp(bt+bt+bt+'json|'+bt+bt+bt, 'gi'); let txt = d.text.replace(reg, '').trim();
              try {
                const scenes = JSON.parse(txt); let succ = 0;
                for (let i = 0; i < scenes.length; i++) {
                  await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'scenes', data: { episode_id: id, scene_number: i+1, title: scenes[i].title, summary: scenes[i].summary, sequence_label: scenes[i].sequence_label, lifecycle_status: 'PLANNED', canon_status: 'PENDING_REVIEW' } }) });
                  succ++;
                }
                b.innerText = 'Success! Saved ' + succ + ' scenes.';
              } catch(e) { b.innerText = 'Error: ' + txt; }
            } else b.innerText = 'Error: ' + d.error;
          }

          async function sceneAi(type, summary) {
            const m = document.createElement('div'); m.className = 'mdl'; m.style.display = 'flex';
            m.innerHTML = '<div class="mdl-c"><div class="mdl-h"><h3>AI Tool</h3><button class="close" onclick="this.closest(\\'.mdl\\').remove()">&times;</button></div><div class="ai-r" style="display:block; min-height:100px;">Thinking...</div></div>';
            document.body.appendChild(m);
            let p = '', s = '';
            if (type === 'Expand') { m.querySelector('h3').innerText = '🪄 Scene Expander'; p = 'Expand: ' + summary; s = 'You are a screenwriter. Write 2-3 rich paragraphs.'; }
            if (type === 'Concept') { m.querySelector('h3').innerText = '📸 Concept Art'; p = 'Create a Midjourney prompt for: ' + summary; s = 'You are a cinematographer. Output ONLY the prompt.'; }
            if (type === 'Mood') { m.querySelector('h3').innerText = '🎥 Director Breakdown'; p = 'Lighting, camera, sound for: ' + summary; s = 'You are a film director. Use Markdown.'; }
            const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: p, s: s }) });
            const d = await r.json(); m.querySelector('.ai-r').innerText = d.ok ? d.text : 'Error: ' + d.error;
          }

          async function runStoryDoctor() {
            if (!currentEpisodeId) return;
            const m = document.createElement('div'); m.className = 'mdl'; m.style.display = 'flex';
            m.innerHTML = '<div class="mdl-c"><div class="mdl-h"><h3>🩺 Story Doctor</h3><button class="close" onclick="this.closest(\\'.mdl\\').remove()">&times;</button></div><div class="ai-r" style="display:block; min-height:100px;">Analyzing pacing...</div></div>';
            document.body.appendChild(m);
            const ep = await (await fetch('/api/entities?table=episodes&filter=episode_id=eq.'+currentEpisodeId)).json();
            const sc = await (await fetch('/api/entities?table=scenes&filter=episode_id=eq.'+currentEpisodeId)).json();
            const txt = sc.map(s=>'Scene '+s.scene_number+': '+s.summary).join('\\n');
            const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: 'Synopsis: '+ep[0].synopsis+'\\nScenes:\\n'+txt, s: 'Analyze pacing, character agency, cliffhanger. Be strict. Use Markdown.' }) });
            const d = await r.json(); m.querySelector('.ai-r').innerText = d.ok ? d.text : 'Error: ' + d.error;
          }

          async function runPitchDeck() {
            if (!currentEpisodeId) return;
            const m = document.createElement('div'); m.className = 'mdl'; m.style.display = 'flex';
            m.innerHTML = '<div class="mdl-c"><div class="mdl-h"><h3>📊 Pitch Deck</h3><button class="close" onclick="this.closest(\\'.mdl\\').remove()">&times;</button></div><div class="ai-r" style="display:block; min-height:100px;">Generating pitch...</div></div>';
            document.body.appendChild(m);
            const ep = await (await fetch('/api/entities?table=episodes&filter=episode_id=eq.'+currentEpisodeId)).json();
            const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: 'Title: '+ep[0].title+'\\nSynopsis: '+ep[0].synopsis, s: 'Create a 1-page producer pitch deck. Include Elevator Pitch, Target Audience, Main Conflict. Use Markdown.' }) });
            const d = await r.json(); m.querySelector('.ai-r').innerText = d.ok ? d.text : 'Error: ' + d.error;
          }

          loadDashboard();
        </script>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
};
