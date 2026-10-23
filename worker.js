// ==========================================
// SHULEVERSE CORE ENGINE (DO NOT TOUCH)
// ==========================================
const App = {
  tabs: [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'universe', icon: '🌍', label: 'Universe' },
    { id: 'stories', icon: '📖', label: 'Stories' },
    { id: 'ai', icon: '✨', label: 'AI' },
    { id: 'icons', icon: '🎨', label: 'Icons' }
  ],
  views: {}, // Feature code will inject their HTML here
  apiRoutes: {} // Feature code will inject their backend here
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Handle API Requests
    if (url.pathname.startsWith('/api/')) {
      const route = url.pathname.replace('/api/', '');
      if (App.apiRoutes[route]) {
        try {
          return await App.apiRoutes[route](request, env);
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }
      return new Response('API Route Not Found', { status: 404 });
    }

    // 2. Build the HTML dynamically from registered views
    let navHtml = '';
    App.tabs.forEach((t, i) => {
      navHtml += `<div class="nav-item ${i===0?'active':''}" id="nav-${t.id}" onclick="switchView('${t.id}')">
        <span class="nav-icon">${t.icon}</span> ${t.label}
      </div>`;
    });

    let viewsHtml = '';
    App.tabs.forEach((t, i) => {
      const content = App.views[t.id] || `<h2>${t.label}</h2><p style="color:var(--mt)">Coming soon...</p>`;
      viewsHtml += `<div id="view-${t.id}" class="view ${i===0?'active':''}">
        ${content}
      </div>`;
    });

    // 3. Serve the master HTML
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
          
          /* PERFECT LAYOUT LOCK */
          html, body { height: 100%; overflow: hidden; background: var(--bg); color: var(--tx); }
          #app { display: flex; flex-direction: column; height: 100dvh; height: 100vh; }
          
          header { flex: 0 0 60px; background: var(--pn); display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-bottom: 1px solid var(--br); z-index: 10; }
          .menu-btn { background: none; border: none; color: var(--tx); font-size: 24px; cursor: pointer; }
          
          main { flex: 1; overflow-y: auto; padding: 20px; position: relative; }
          .view { display: none; }
          .view.active { display: block; }
          
          nav { flex: 0 0 65px; background: var(--pn); border-top: 1px solid var(--br); display: flex; justify-content: space-around; align-items: center; z-index: 10; }
          .nav-item { color: var(--mt); font-size: 11px; font-weight: bold; cursor: pointer; text-align: center; width: 20%; padding: 5px 0; }
          .nav-item.active { color: var(--gd); }
          .nav-icon { font-size: 22px; display: block; margin-bottom: 2px; }

          /* FLOATING ADD BUTTON */
          .fab { position: fixed; bottom: 85px; right: 20px; width: 60px; height: 60px; border-radius: 30px; background: var(--gd); color: #000; font-size: 30px; font-weight: bold; border: none; box-shadow: 0 4px 15px rgba(245,166,35,0.4); cursor: pointer; display: none; align-items: center; justify-content: center; z-index: 20; }

          /* GENERIC UI COMPONENTS */
          .card { background: var(--cd); padding: 20px; border-radius: 12px; border: 1px solid var(--br); margin-bottom: 16px; }
          .card h3 { color: var(--gd); margin-bottom: 10px; font-size: 16px; }
          .item { background: var(--cd); padding: 16px; border-radius: 12px; border: 1px solid var(--br); margin-bottom: 12px; cursor: pointer; }
          .title { font-weight: bold; font-size: 16px; }
          .sub { font-size: 12px; color: var(--gd); margin-top: 4px; }

          /* ICON GRID */
          .icon-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .icon-box { background: var(--cd); border: 1px solid var(--br); padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px; }
          .icon-box span:first-child { font-size: 24px; }
          .icon-box span:last-child { font-size: 13px; color: var(--mt); }
        </style>
      </head>
      <body>
        <div id="app">
          <header>
            <button class="menu-btn" onclick="alert('Menu will go here')">☰</button>
            <h1 style="font-size: 18px; font-weight: 900;">🧠 ShuleVerse</h1>
            <div style="width: 24px;"></div>
          </header>
          
          <main>
            ${viewsHtml}
          </main>

          <button class="fab" id="fab-add" onclick="alert('Add feature ready')">+</button>
          
          <nav>
            ${navHtml}
          </nav>
        </div>

        <script>
          function switchView(viewName) {
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-' + viewName).classList.add('active');
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById('nav-' + viewName).classList.add('active');

            const fab = document.getElementById('fab-add');
            // Only show the + button on Universe and Stories
            if (viewName === 'universe' || viewName === 'stories') {
              fab.style.display = 'flex';
            } else {
              fab.style.display = 'none';
            }
          }
        </script>
      </body>
      </html>
    `;

    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
};
// ==========================================
// FEATURE: ICON VOCABULARY (APPEND ONLY)
// ==========================================
App.views.icons = `
  <h2 style="margin-bottom: 16px;">App Icon Vocabulary</h2>
  <p style="font-size: 13px; color: var(--mt); margin-bottom: 16px;">Here is every icon we will use to build the app.</p>
  
  <div class="icon-grid">
    <div class="icon-box"><span>👤</span> <span>Character</span></div>
    <div class="icon-box"><span>📍</span> <span>Location</span></div>
    <div class="icon-box"><span>📦</span> <span>Prop</span></div>
    <div class="icon-box"><span>🔗</span> <span>Relationship</span></div>
    <div class="icon-box"><span>📖</span> <span>Episode / Story</span></div>
    <div class="icon-box"><span>🎬</span> <span>Scene</span></div>
    <div class="icon-box"><span>📄</span> <span>Script / Doc</span></div>
    <div class="icon-box"><span>📋</span> <span>Continuity Fact</span></div>
    <div class="icon-box"><span>⚡</span> <span>Story Event</span></div>
    <div class="icon-box"><span>✨</span> <span>AI Generation</span></div>
    <div class="icon-box"><span>🩺</span> <span>Story Doctor</span></div>
    <div class="icon-box"><span>📊</span> <span>Pitch Deck</span></div>
    <div class="icon-box"><span>🪄</span> <span>Scene Expander</span></div>
    <div class="icon-box"><span>📸</span> <span>Concept Art</span></div>
    <div class="icon-box"><span>🎥</span> <span>Mood Board</span></div>
    <div class="icon-box"><span>✏️</span> <span>Edit</span></div>
    <div class="icon-box"><span>🗑️</span> <span>Retire / Delete</span></div>
    <div class="icon-box"><span>🔄</span> <span>Refresh</span></div>
  </div>
`;
