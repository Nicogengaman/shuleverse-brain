export default {
  async fetch(request, env) {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>ShuleVerse Brain</title>
        <style>
          :root { 
            --bg: #0f111a; 
            --panel: #1c1f2b; 
            --card: #252936; 
            --text: #f0f2f5; 
            --muted: #8b92a5; 
            --gold: #f5a623; 
            --blue: #3b82f6; 
            --border: #32374a; 
          }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
          
          /* FLEXBOX LAYOUT: Guarantees the page never scrolls the whole body */
          body { 
            background: var(--bg); 
            color: var(--text); 
            height: 100dvh; 
            height: 100vh; 
            display: flex; 
            flex-direction: column; 
            overflow: hidden; 
          }
          
          /* HEADER (Locked Top) */
          header { 
            flex: 0 0 60px; 
            background: var(--panel); 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 0 20px; 
            border-bottom: 1px solid var(--border); 
            z-index: 10;
          }
          header h1 { font-size: 18px; font-weight: 900; }
          .icon-btn { background: none; border: none; color: var(--text); font-size: 24px; cursor: pointer; }
          
          /* MAIN CONTENT (Scrolls internally) */
          main { 
            flex: 1; 
            overflow-y: auto; 
            padding: 20px; 
            position: relative;
          }
          .view { display: none; }
          .view.active { display: block; }
          
          /* BOTTOM NAVIGATION (Locked Bottom) */
          nav { 
            flex: 0 0 65px; 
            background: var(--panel); 
            border-top: 1px solid var(--border); 
            display: flex; 
            justify-content: space-around; 
            align-items: center; 
            z-index: 10;
          }
          .nav-item { 
            color: var(--muted); 
            font-size: 11px; 
            font-weight: bold; 
            cursor: pointer; 
            text-align: center; 
            width: 20%;
            padding: 5px 0;
          }
          .nav-item.active { color: var(--gold); }
          .nav-icon { font-size: 22px; display: block; margin-bottom: 2px; }

          /* FLOATING ACTION BUTTON */
          .fab { 
            position: fixed; 
            bottom: 85px; 
            right: 20px; 
            width: 60px; 
            height: 60px; 
            border-radius: 30px; 
            background: var(--gold); 
            color: #000; 
            font-size: 30px; 
            font-weight: bold; 
            border: none; 
            box-shadow: 0 4px 15px rgba(245,166,35,0.4); 
            cursor: pointer; 
            display: none; 
            align-items: center; 
            justify-content: center; 
            z-index: 20; 
          }

          /* UI ELEMENTS */
          .card { background: var(--card); padding: 20px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px; }
          .card h3 { color: var(--gold); margin-bottom: 10px; font-size: 16px; }
          
          /* ICON LIBRARY GRID */
          .icon-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .icon-box { background: var(--card); border: 1px solid var(--border); padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px; }
          .icon-box span:first-child { font-size: 24px; }
          .icon-box span:last-child { font-size: 13px; color: var(--muted); }
        </style>
      </head>
      <body>
        
        <header>
          <button class="icon-btn" onclick="alert('Menu will go here')">☰</button>
          <h1>🧠 ShuleVerse</h1>
          <button class="icon-btn" onclick="alert('User Profile will go here')">👤</button>
        </header>
        
        <main>
          <!-- HOME VIEW -->
          <div id="view-home" class="view active">
            <h2 style="margin-bottom: 16px;">Dashboard</h2>
            <div class="card">
              <h3>Welcome to the New Skeleton</h3>
              <p style="font-size: 14px; color: var(--muted);">This is a clean slate. The layout is physically locked to your screen size. No more scrolling the header off the page.</p>
            </div>
          </div>
          
          <!-- UNIVERSE VIEW -->
          <div id="view-universe" class="view">
            <h2 style="margin-bottom: 16px;">Universe</h2>
            <div class="card">
              <h3>Characters, Locations, Props</h3>
              <p style="font-size: 14px; color: var(--muted);">This tab will hold your world-building data. The + button will activate here.</p>
            </div>
          </div>
          
          <!-- STORIES VIEW -->
          <div id="view-stories" class="view">
            <h2 style="margin-bottom: 16px;">Stories</h2>
            <div class="card">
              <h3>Episodes & Scenes</h3>
              <p style="font-size: 14px; color: var(--muted);">This tab will hold your narrative structure.</p>
            </div>
          </div>
          
          <!-- AI VIEW -->
          <div id="view-ai" class="view">
            <h2 style="margin-bottom: 16px;">AI Studio</h2>
            <div class="card">
              <h3>Context-Aware AI</h3>
              <p style="font-size: 14px; color: var(--muted);">This tab will hold the Gemini integrations.</p>
            </div>
          </div>

          <!-- ICON LIBRARY VIEW -->
          <div id="view-icons" class="view">
            <h2 style="margin-bottom: 16px;">App Icon Vocabulary</h2>
            <p style="font-size: 13px; color: var(--muted); margin-bottom: 16px;">Here is every icon we will use to build the app.</p>
            
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
              <div class="icon-box"><span>➕</span> <span>Add New</span></div>
              <div class="icon-box"><span>✏️</span> <span>Edit</span></div>
              <div class="icon-box"><span>🗑️</span> <span>Retire / Delete</span></div>
              <div class="icon-box"><span>💾</span> <span>Save</span></div>
              <div class="icon-box"><span>🔄</span> <span>Refresh</span></div>
              <div class="icon-box"><span>🔍</span> <span>Search</span></div>
              <div class="icon-box"><span>📋</span> <span>Change Logs</span></div>
            </div>
          </div>
        </main>

        <button class="fab" id="fab-add" onclick="alert('Add form will open here')">+</button>

        <nav>
          <div class="nav-item active" id="nav-home" onclick="switchView('home')">
            <span class="nav-icon">🏠</span> Home
          </div>
          <div class="nav-item" id="nav-universe" onclick="switchView('universe')">
            <span class="nav-icon">🌍</span> Universe
          </div>
          <div class="nav-item" id="nav-stories" onclick="switchView('stories')">
            <span class="nav-icon">📖</span> Stories
          </div>
          <div class="nav-item" id="nav-ai" onclick="switchView('ai')">
            <span class="nav-icon">✨</span> AI
          </div>
          <div class="nav-item" id="nav-icons" onclick="switchView('icons')">
            <span class="nav-icon">🎨</span> Icons
          </div>
        </nav>

        <script>
          function switchView(viewName) {
            // 1. Hide all views
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            // 2. Show selected view
            document.getElementById('view-' + viewName).classList.add('active');
            
            // 3. Update nav highlighting
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById('nav-' + viewName).classList.add('active');

            // 4. Toggle the FAB (+ button) based on the view
            const fab = document.getElementById('fab-add');
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
