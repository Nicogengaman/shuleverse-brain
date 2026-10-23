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
          const res = await fetch(SUPA_URL + '/rest/v1/' + t + '?select=*', { headers: h });
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
          :root { --bg: #0f111a; --pn: #1c1f2b; --cd: #252936; --tx: #f0f2f5; --gd: #f5a623; --mt: #8b92a5; --bl: #3b82f6; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
          body { background: var(--bg); color: var(--tx); height: 100vh; display: flex; flex-direction: column; }
          header { height: 60px; background: var(--pn); display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-bottom: 1px solid #333; }
          .menu-btn { background: none; border: none; color: var(--tx); font-size: 24px; cursor: pointer; }
          main { flex: 1; padding: 20px; overflow-y: auto; }
          .nav { height: 60px; background: var(--pn); border-top: 1px solid #333; display: flex; justify-content: space-around; align-items: center; }
          .tab { color: #888; font-size: 14px; font-weight: bold; cursor: pointer; padding: 10px; }
          .tab.active { color: var(--gd); }
          
          .content { display: none; }
          .content.active { display: block; }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .card { background: var(--cd); padding: 20px; border-radius: 12px; border: 1px solid #333; text-align: center; }
          .val { font-size: 28px; font-weight: 900; color: var(--bl); }
          .lbl { font-size: 12px; color: var(--mt); text-transform: uppercase; margin-top: 4px; }
          
          .item { background: var(--cd); padding: 16px; border-radius: 12px; border: 1px solid #333; margin-bottom: 12px; }
          .title { font-weight: bold; font-size: 16px; }
          .sub { font-size: 12px; color: var(--gd); margin-top: 4px; }
        </style>
      </head>
      <body>
        <header>
          <button class="menu-btn" onclick="alert('Menu button works!')">☰</button>
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
            <div id="db-error" style="display:none; color:red; margin-top:20px; font-size:14px;"></div>
          </div>
          
          <div id="content-universe" class="content">
            <h3 style="margin-bottom: 16px;">Universe (Characters)</h3>
            <div id="list-characters">Loading...</div>
          </div>
          
          <div id="content-stories" class="content">
            <h3 style="margin-bottom: 16px;">Stories (Episodes)</h3>
            <div id="list-episodes">Loading...</div>
          </div>
          
          <div id="content-ai" class="content">
            <h3 style="margin-bottom: 16px;">AI Studio</h3>
            <p style="color:var(--mt)">AI will be added in Batch 4.</p>
          </div>
        </main>

        <div class="nav">
          <div class="tab active" id="tab-home" onclick="go('home')">🏠 Home</div>
          <div class="tab" id="tab-universe" onclick="go('universe')">🌍 Universe</div>
          <div class="tab" id="tab-stories" onclick="go('stories')">📖 Stories</div>
          <div class="tab" id="tab-ai" onclick="go('ai')">✨ AI</div>
        </div>

        <script>
          function go(page) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + page).classList.add('active');
            document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
            document.getElementById('content-' + page).classList.add('active');
            
            if (page === 'home') loadDashboard();
            if (page === 'universe') loadCharacters();
            if (page === 'stories') loadEpisodes();
          }

          async function loadDashboard() {
            try {
              const r = await fetch('/api/dashboard');
              const d = await r.json();
              if (d.chars !== undefined) {
                document.getElementById('stat-chars').innerText = d.chars;
                document.getElementById('stat-eps').innerText = d.eps;
              } else {
                document.getElementById('db-error').style.display = 'block';
                document.getElementById('db-error').innerText = d.error || 'Failed to load data. Check your Cloudflare keys.';
              }
            } catch (e) { console.error(e); }
          }

          async function loadCharacters() {
            const l = document.getElementById('list-characters');
            l.innerHTML = 'Loading...';
            try {
              const r = await fetch('/api/entities?table=characters');
              const d = await r.json();
              if (Array.isArray(d)) {
                if (d.length === 0) return l.innerHTML = 'No characters found.';
                let html = '';
                d.forEach(c => {
                  html += '<div class="item"><div class="title">' + (c.name || 'Unnamed') + '</div><div class="sub">' + c.character_id + ' • ' + (c.character_type || '') + '</div></div>';
                });
                l.innerHTML = html;
              } else {
                l.innerHTML = 'Error: ' + (d.error || 'Unknown');
              }
            } catch (e) { l.innerHTML = 'Network Error'; }
          }

          async function loadEpisodes() {
            const l = document.getElementById('list-episodes');
            l.innerHTML = 'Loading...';
            try {
              const r = await fetch('/api/entities?table=episodes');
              const d = await r.json();
              if (Array.isArray(d)) {
                if (d.length === 0) return l.innerHTML = 'No episodes found.';
                let html = '';
                d.forEach(e => {
                  html += '<div class="item"><div class="title">' + (e.title || 'Untitled') + '</div><div class="sub">' + (e.episode_code || '') + '</div></div>';
                });
                l.innerHTML = html;
              } else {
                l.innerHTML = 'Error: ' + (d.error || 'Unknown');
              }
            } catch (e) { l.innerHTML = 'Network Error'; }
          }

          loadDashboard();
        </script>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
};
