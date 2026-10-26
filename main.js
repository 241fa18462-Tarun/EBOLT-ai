// Ebolt original page interactions, extracted from the supplied premium HTML.
let signupMode = false;
let eboltCurrentUser = null;
let eboltCurrentPage = 'home';
let eboltCurrentNoteTitle = 'Untitled note';
let eboltCurrentNoteId = null;

function togglePassword(inputId, button) {
    const password = document.getElementById(inputId);
    const showing = password.type === "password";
    password.type = showing ? "text" : "password";
    button.classList.toggle("showing", showing);
    button.setAttribute("aria-label", showing ? "Hide password" : "Show password");
}

function switchPage(event) {
    event.preventDefault();
    const card = document.querySelector(".login-card");
    const title = document.getElementById("welcomeTitle");
    const switchText = document.getElementById("switchText");
    const submitButton = document.getElementById("submitButton");
    const fullname = document.getElementById("fullname");
    const confirm = document.getElementById("confirmPassword");
    card.classList.add("liquid", "page-out");
    setTimeout(() => {
        signupMode = !signupMode;
        card.classList.toggle("signup-mode", signupMode);
        if (signupMode) {
            title.textContent = "CREATE ACCOUNT";
            switchText.innerHTML = 'Already have an account? <a class="switch-link" href="#" onclick="switchPage(event)">Sign in</a>';
            submitButton.textContent = "CREATE ACCOUNT";
            fullname.required = true;
            confirm.required = true;
        } else {
            title.textContent = "WELCOME BACK!";
            switchText.innerHTML = 'Don\'t have an account? <a class="switch-link" href="#" onclick="switchPage(event)">Sign up</a>';
            submitButton.textContent = "SIGN IN";
            fullname.required = false;
            confirm.required = false;
        }
        card.classList.remove("page-out", "liquid");
        void card.offsetWidth;
        card.classList.add("page-in");
        setTimeout(() => card.classList.remove("page-in"), 850);
    }, 420);
}

function readAccounts() {
    try { return JSON.parse(localStorage.getItem("ebolt_accounts") || "{}") || {}; }
    catch (_) { return {}; }
}
function writeAccounts(accounts) { localStorage.setItem("ebolt_accounts", JSON.stringify(accounts)); }
function localPart(email) { return String(email).trim().toLowerCase().split("@")[0]; }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function displayName(email, fullName) {
    return fullName || localPart(email).replace(/[._-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById("username").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    if (!validEmail(email)) { alert("Please enter a valid email address."); return; }

    const accounts = readAccounts();
    if (signupMode) {
        const fullName = document.getElementById("fullname").value.trim();
        const confirm = document.getElementById("confirmPassword").value;
        if (!fullName) { alert("Please enter your full name."); return; }
        if (password.length < 1) { alert("Please enter a password."); return; }
        if (password !== confirm) { alert("Passwords do not match."); return; }
        if (accounts[email]) { alert("That account already exists. Please sign in."); return; }
        accounts[email] = { email, password, fullName };
        writeAccounts(accounts);
        openEbolt(accounts[email]);
        return;
    }

    const account = accounts[email];
    const expected = account ? account.password : localPart(email);
    if (password !== expected) {
        alert("Incorrect password. For the default demo, use the text before @ as the password.");
        return;
    }
    const user = account || { email, password: expected, fullName: displayName(email) };
    if (document.querySelector('.remember input')?.checked) {
        localStorage.setItem("ebolt_remember", JSON.stringify(user));
    }
    openEbolt(user);
}

function openEbolt(user) {
    eboltCurrentUser = user;
    const card = document.querySelector('.login-card');
    card.classList.add('liquid','page-out');

    setTimeout(() => {
        document.body.classList.add('app-open');
        const app = document.getElementById('eboltApp');
        app.hidden = false;

        const name = displayName(user.email, user.fullName);
        document.getElementById('eboltUserName').textContent = name;
        document.getElementById('eboltUserEmail').textContent = user.email;
        document.getElementById('eboltAvatar').textContent = name.charAt(0).toUpperCase();
        document.getElementById('eboltGreeting').textContent = `Hey, ${name} 👋`;
        loadEboltProfile();

        const now = new Date();
        document.getElementById('eboltDayName').textContent =
            now.toLocaleDateString('en-IN',{weekday:'long', timeZone:'Asia/Kolkata'});
        document.getElementById('eboltDateText').textContent =
            now.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'});

        eboltCurrentPage = 'home';
        eboltCurrentNoteTitle = 'Untitled note';
        eboltCurrentNoteId = null;
        syncEditors();
        renderNotes();
        updateHomeStats();
        showEboltPage('home', null, true);
        window.scrollTo(0,0);
    }, 480);
}

function eboltLogout() {
    document.getElementById('eboltApp').hidden = true;
    document.body.classList.remove('app-open');
    const card = document.querySelector('.login-card');
    card.classList.remove('page-out','liquid');
    document.getElementById('password').value = '';
    document.getElementById('authForm').reset();
    eboltCurrentUser = null;
    eboltCurrentNoteId = null;
    eboltCurrentNoteTitle = 'Untitled note';
    window.scrollTo(0,0);
}

function eboltGo(id, btn) {
    if (!document.getElementById(id)) return;
    showEboltPage(id, btn, false);
}

function showEboltPage(id, btn, instant) {
    if (id === eboltCurrentPage && !instant) return;

    const current = document.getElementById(eboltCurrentPage);
    const next = document.getElementById(id);
    if (!next) return;

    document.querySelectorAll('.ebolt-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else {
        const found = document.querySelector(`.ebolt-nav button[data-page="${id}"]`);
        if (found) found.classList.add('active');
    }

    const titles = {home:'Home',saved:'Saved Note',new:'New',chat:'AI Chat Bot',userinfo:'User Info'};
    document.getElementById('eboltTopTitle').textContent = titles[id] || 'Home';

    if (current && current !== next && !instant) {
        current.classList.remove('active-view');
        current.classList.add('page-out');
        setTimeout(() => current.classList.remove('page-out'), 380);
    } else if (current && current !== next) {
        current.classList.remove('active-view','page-out');
    }

    next.classList.remove('page-out','active-view');
    void next.offsetWidth;
    next.classList.add('active-view');

    eboltCurrentPage = id;
    document.body.classList.toggle('in-chat-mode', id === 'chat');
    if (id === 'saved') renderNotes();
    if (id === 'new') loadEditorsIntoNew();
    if (id === 'home') updateHomeStats();
    if (id === 'chat') {
        const box = document.getElementById('eboltChatMessages');
        if (box) setTimeout(() => { box.scrollTop = box.scrollHeight; }, 80);
    }
    window.scrollTo({top:0,behavior:instant?'auto':'smooth'});
}

function eboltToast(message) {
    const t=document.getElementById('eboltToast');
    t.textContent=message;
    t.classList.add('show');
    clearTimeout(window._eboltToast);
    window._eboltToast=setTimeout(()=>t.classList.remove('show'),1800);
}

function noteStore(){
    try{
        const raw = JSON.parse(localStorage.getItem('ebolt_notes') || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch(_){ return []; }
}
function saveNoteStore(n){
    try {
        // Keep newest first, hard-cap at 200 notes for many-note support
        const capped = (Array.isArray(n) ? n : []).slice(0, 200);
        localStorage.setItem('ebolt_notes', JSON.stringify(capped));
    } catch(e) {
        eboltToast('Storage full — delete older notes');
    }
}
function escapeHtml(s){
    return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function makeNoteId(){
    return 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

function getEditorText(){
    const home = document.getElementById('eboltEditor');
    const fresh = document.getElementById('eboltNewEditor');
    if (eboltCurrentPage === 'new') return (fresh && fresh.value) || '';
    return (home && home.value) || '';
}

function getCurrentTitle(){
    // Prefer the visible title input for the current page
    if (eboltCurrentPage === 'home') {
        const homeTitle = document.getElementById('eboltHomeTitle');
        if (homeTitle && homeTitle.value.trim()) return homeTitle.value.trim();
    }
    const titleInput = document.getElementById('eboltNoteTitle');
    if (titleInput && titleInput.value.trim()) return titleInput.value.trim();
    return (eboltCurrentNoteTitle || 'Untitled note').trim() || 'Untitled note';
}

function syncTitleFromHome(){
    const homeTitle = document.getElementById('eboltHomeTitle');
    const titleInput = document.getElementById('eboltNoteTitle');
    if (homeTitle) {
        eboltCurrentNoteTitle = homeTitle.value.trim() || 'Untitled note';
        if (titleInput) titleInput.value = homeTitle.value;
    }
}

function syncEditors(){
    const home = document.getElementById('eboltEditor');
    const fresh = document.getElementById('eboltNewEditor');
    const title = document.getElementById('eboltNoteTitle');
    const homeTitle = document.getElementById('eboltHomeTitle');
    if (!home || !fresh) return;

    if (document.activeElement === fresh) {
        home.value = fresh.value;
    } else if (document.activeElement === home) {
        fresh.value = home.value;
    }

    if (title && document.activeElement === title) eboltCurrentNoteTitle = title.value || 'Untitled note';
    if (homeTitle && document.activeElement === homeTitle) eboltCurrentNoteTitle = homeTitle.value || 'Untitled note';

    if (title && homeTitle) {
        if (document.activeElement === title) homeTitle.value = title.value;
        else if (document.activeElement === homeTitle) title.value = homeTitle.value;
        else if (!document.activeElement || (document.activeElement !== title && document.activeElement !== homeTitle)) {
            // keep them aligned when neither is focused
            if (title.value !== homeTitle.value) homeTitle.value = title.value || homeTitle.value;
        }
    }
    updateHomeStats();
}

function loadEditorsIntoNew(){
    const home = document.getElementById('eboltEditor');
    const fresh = document.getElementById('eboltNewEditor');
    const title = document.getElementById('eboltNoteTitle');
    if (!home || !fresh || !title) return;
    fresh.value = home.value;
    title.value = eboltCurrentNoteTitle;
}


function eboltCreateAndOpenNewNote(){
    eboltNewNote();
    eboltGo('new');
    const title = document.getElementById('eboltNoteTitle');
    if (title) title.focus();
}

function eboltSaveAsNew(){
    syncEditors();
    const title = getCurrentTitle();
    let text = getEditorText();
    const placeholders = [
        'Start writing your next idea...',
        'Start writing here...\n\nAdd your development notes, ideas, commands or documentation.',
        'Start writing here...'
    ];
    if (placeholders.some(p => text.trim() === p.trim())) text = '';
    const notes = noteStore();
    const now = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const note = {
        id: makeNoteId(),
        title: title || 'Untitled note',
        text,
        updated: now,
        created: now
    };
    notes.unshift(note);
    saveNoteStore(notes);
    eboltCurrentNoteId = note.id;
    eboltCurrentNoteTitle = note.title;
    const titleEl = document.getElementById('eboltNoteTitle');
    const homeTitle = document.getElementById('eboltHomeTitle');
    const homeEditor = document.getElementById('eboltEditor');
    const newEditor = document.getElementById('eboltNewEditor');
    if (titleEl) titleEl.value = note.title;
    if (homeTitle) homeTitle.value = note.title;
    if (homeEditor) homeEditor.value = note.text;
    if (newEditor) newEditor.value = note.text;
    renderNotes();
    updateHomeStats();
    eboltToast('Saved as a new note ✓');
}

function eboltSaveNote(){
    syncEditors();
    const title = getCurrentTitle();
    let text = getEditorText();
    // Strip default placeholder so we don't save pure boilerplate
    const placeholders = [
        'Start writing your next idea...',
        'Start writing here...\n\nAdd your development notes, ideas, commands or documentation.',
        'Start writing here...'
    ];
    if (placeholders.some(p => text.trim() === p.trim())) text = '';

    const notes = noteStore();
    const now = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    let note = null;

    // 1) Update by current ID (preferred for edit)
    if (eboltCurrentNoteId) {
        const idx = notes.findIndex(n => n.id === eboltCurrentNoteId);
        if (idx >= 0) {
            notes[idx] = { ...notes[idx], title, text, updated: now };
            note = notes[idx];
            // Move updated note to top
            notes.splice(idx, 1);
            notes.unshift(note);
        }
    }

    // 2) Create brand new note
    if (!note) {
        note = {
            id: makeNoteId(),
            title,
            text,
            updated: now,
            created: now
        };
        notes.unshift(note);
        eboltCurrentNoteId = note.id;
    }

    saveNoteStore(notes);
    eboltCurrentNoteTitle = title;

    // Reflect saved content back into both editors
    const displayText = text || 'Start writing your next idea...';
    const homeEl = document.getElementById('eboltEditor');
    const newEl = document.getElementById('eboltNewEditor');
    const titleEl = document.getElementById('eboltNoteTitle');
    const homeTitle = document.getElementById('eboltHomeTitle');
    if (homeEl) homeEl.value = displayText;
    if (newEl) newEl.value = text || 'Start writing here...\n\nAdd your development notes, ideas, commands or documentation.';
    if (titleEl) titleEl.value = title;
    if (homeTitle) homeTitle.value = title;

    renderNotes();
    updateHomeStats();
    eboltToast(notes.find(n => n.id === eboltCurrentNoteId) ? 'Note saved ✓' : 'Note created ✓');
}

function eboltNewNote(){
    eboltCurrentNoteTitle = 'Untitled note';
    eboltCurrentNoteId = null;
    const starter = 'Start writing here...\n\nAdd your development notes, ideas, commands or documentation.';
    const homeEl = document.getElementById('eboltEditor');
    const newEl = document.getElementById('eboltNewEditor');
    const titleEl = document.getElementById('eboltNoteTitle');
    const homeTitle = document.getElementById('eboltHomeTitle');
    if (homeEl) homeEl.value = 'Start writing your next idea...';
    if (newEl) newEl.value = starter;
    if (titleEl) titleEl.value = 'Untitled note';
    if (homeTitle) homeTitle.value = 'Untitled note';
    updateHomeStats();
    eboltToast('New note ready');
}

function eboltRenameNote(){
    const current = getCurrentTitle();
    const next = prompt('Name this note', current);
    if (next && next.trim()) {
        eboltCurrentNoteTitle = next.trim();
        const titleEl = document.getElementById('eboltNoteTitle');
        const homeTitle = document.getElementById('eboltHomeTitle');
        if (titleEl) titleEl.value = eboltCurrentNoteTitle;
        if (homeTitle) homeTitle.value = eboltCurrentNoteTitle;
        // If this is an existing note, also update the stored title immediately
        if (eboltCurrentNoteId) {
            const notes = noteStore();
            const idx = notes.findIndex(n => n.id === eboltCurrentNoteId);
            if (idx >= 0) {
                notes[idx].title = eboltCurrentNoteTitle;
                notes[idx].updated = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                saveNoteStore(notes);
                renderNotes();
            }
        }
        eboltToast('Note renamed');
    }
}

function renderNotes(){
    const box = document.getElementById('eboltNotes');
    if (!box) return;
    const notes = noteStore();
    const noteCards = notes.map((n) => {
        const id = n.id || '';
        const preview = (n.text || 'Empty note').replace(/\s+/g, ' ').trim().slice(0, 180);
        return `
      <article class="ebolt-card ebolt-note-card" data-note-id="${escapeHtml(id)}" onclick="loadNoteById('${escapeHtml(id)}')">
        <button type="button" class="ebolt-note-delete" title="Delete note" aria-label="Delete ${escapeHtml(n.title || '')}"
          onclick="eboltDeleteNoteById(event, '${escapeHtml(id)}')">×</button>
        <h3>${escapeHtml(n.title || 'Untitled note')}</h3>
        <p>${escapeHtml(preview)}${preview.length >= 180 ? '…' : ''}</p>
        <small>${escapeHtml(n.updated || 'Saved')}</small>
      </article>`;
    }).join('');
    const emptyState = notes.length ? '' : `
      <div class="ebolt-card ebolt-empty ebolt-empty-message">
        <div style="font-size:28px;margin-bottom:10px;opacity:.7">▤</div>
        <strong>No saved notes yet</strong>
        <p style="margin-top:8px;color:#7a96a1;font-size:11px;line-height:1.6">Click the plus tile to create your first note.</p>
      </div>`;
    const addTile = `
      <button type="button" class="ebolt-card ebolt-add-note-tile" onclick="eboltCreateAndOpenNewNote()" aria-label="Create a new note" title="Create a new note">
        <span class="ebolt-add-note-plus" aria-hidden="true">+</span>
        <strong>New note</strong>
        <small>Click to start writing</small>
      </button>`;
    box.innerHTML = noteCards + emptyState + addTile;
}

function eboltDeleteNoteById(event, id){
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const notes = noteStore();
    const idx = notes.findIndex(n => n.id === id);
    if (idx < 0) {
        eboltToast('Note not found');
        return;
    }
    const title = notes[idx].title || 'Untitled note';
    if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;

    notes.splice(idx, 1);
    saveNoteStore(notes);

    if (eboltCurrentNoteId === id) {
        eboltNewNote();
    }
    renderNotes();
    updateHomeStats();
    eboltToast('Note deleted');
}

// Keep old index-based name for any leftover HTML refs (safe no-op redirect)
function eboltDeleteNote(event, i){
    const notes = noteStore();
    if (notes[i] && notes[i].id) eboltDeleteNoteById(event, notes[i].id);
}

function loadNoteById(id){
    const notes = noteStore();
    const n = notes.find(x => x.id === id);
    if (!n) {
        eboltToast('Note not found');
        return;
    }
    eboltCurrentNoteTitle = n.title || 'Untitled note';
    eboltCurrentNoteId = n.id;
    const homeEl = document.getElementById('eboltEditor');
    const newEl = document.getElementById('eboltNewEditor');
    const titleEl = document.getElementById('eboltNoteTitle');
    const homeTitle = document.getElementById('eboltHomeTitle');
    if (homeEl) homeEl.value = n.text || '';
    if (newEl) newEl.value = n.text || '';
    if (titleEl) titleEl.value = n.title || 'Untitled note';
    if (homeTitle) homeTitle.value = n.title || 'Untitled note';
    eboltGo('new');
    eboltToast('Note opened for editing');
}

function loadNote(i){
    const notes = noteStore();
    if (notes[i] && notes[i].id) loadNoteById(notes[i].id);
}

function updateHomeStats(){
    const count = noteStore().length;
    const text = getEditorText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const c = document.getElementById('homeNoteCount');
    const w = document.getElementById('homeWordCount');
    const navBadge = document.getElementById('navNoteCount');
    if (c) c.textContent = count;
    if (w) w.textContent = words.toLocaleString();
    if (navBadge) navBadge.textContent = count;
}

let eboltChatHistory = [];
let eboltIsGenerating = false;

function renderEboltSVGChart(chart) {
    const type = (chart.type || 'bar').toLowerCase();
    const title = escapeHtml(chart.title || 'Chart');
    const labels = Array.isArray(chart.labels) ? chart.labels : [];
    const dataset = (chart.datasets && chart.datasets[0]) || { data: [] };
    const data = Array.isArray(dataset.data) ? dataset.data : [];
    const max = Math.max(...data, 1);
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const colors = ['#8ed8f5', '#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'];

    let chartContent = '';

    if (type === 'bar') {
        let bars = '';
        labels.forEach((lbl, i) => {
            const val = data[i] || 0;
            const pct = Math.max(8, (val / max) * 100);
            const color = colors[i % colors.length];
            bars += `
              <div class="ebolt-chart-col" title="${escapeHtml(lbl)}: ${val}">
                <span class="ebolt-chart-val">${val}</span>
                <div class="ebolt-chart-bar" style="height:${pct}%;background:${color};"></div>
                <span class="ebolt-chart-lbl">${escapeHtml(lbl)}</span>
              </div>`;
        });
        chartContent = `<div class="ebolt-chart-bars">${bars}</div>`;
    } else if (type === 'pie' || type === 'donut') {
        let accumulated = 0;
        let circles = '';
        labels.forEach((lbl, i) => {
            const val = data[i] || 0;
            const pct = (val / total) * 100;
            const color = colors[i % colors.length];
            const dash = `${pct} ${100 - pct}`;
            const offset = -accumulated;
            accumulated += pct;
            circles += `<circle cx="50" cy="50" r="40" fill="transparent" stroke="${color}" stroke-width="16" stroke-dasharray="${dash}" stroke-dashoffset="${offset}" pathLength="100"/>`;
        });
        let legend = '';
        labels.forEach((lbl, i) => {
            const val = data[i] || 0;
            const pct = ((val / total) * 100).toFixed(0);
            const color = colors[i % colors.length];
            legend += `<div class="ebolt-pie-leg-item"><span class="ebolt-dot" style="background:${color}"></span>${escapeHtml(lbl)}: <b>${pct}%</b></div>`;
        });
        chartContent = `
          <div class="ebolt-pie-wrap">
            <svg viewBox="0 0 100 100" class="ebolt-pie-svg">${circles}</svg>
            <div class="ebolt-pie-legend">${legend}</div>
          </div>`;
    } else if (type === 'line') {
        const width = 280;
        const height = 90;
        const step = labels.length > 1 ? width / (labels.length - 1) : width;
        const points = data.map((v, i) => {
            const x = i * step;
            const y = height - (v / max) * (height - 25) - 15;
            return { x, y, v, lbl: labels[i] };
        });
        const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        let dots = '';
        points.forEach(p => {
            dots += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#071923" stroke="#8ed8f5" stroke-width="2"/>`;
            dots += `<text x="${p.x}" y="${p.y - 7}" text-anchor="middle" fill="#c8efff" font-size="8">${p.v}</text>`;
        });
        chartContent = `
          <div class="ebolt-line-wrap">
            <svg viewBox="0 0 ${width} ${height}" class="ebolt-line-svg">
              <path d="${lineD}" fill="none" stroke="#8ed8f5" stroke-width="2" stroke-linecap="round"/>
              ${dots}
            </svg>
            <div class="ebolt-line-labels">
              ${labels.map(l => `<span>${escapeHtml(l)}</span>`).join('')}
            </div>
          </div>`;
    } else {
        // progress
        let rows = '';
        labels.forEach((lbl, i) => {
            const val = data[i] || 0;
            const pct = Math.min(100, Math.max(5, (val / max) * 100));
            const color = colors[i % colors.length];
            rows += `
              <div class="ebolt-prog-row">
                <div class="ebolt-prog-head"><span>${escapeHtml(lbl)}</span><span>${val} / ${max} (${pct.toFixed(0)}%)</span></div>
                <div class="ebolt-prog-track"><div class="ebolt-prog-fill" style="width:${pct}%;background:${color}"></div></div>
              </div>`;
        });
        chartContent = `<div class="ebolt-prog-wrap">${rows}</div>`;
    }

    const summary = chart.summary ? `<div class="ebolt-chart-summary">💡 ${escapeHtml(chart.summary)}</div>` : '';
    const tableDataJson = escapeHtml(JSON.stringify(chart));

    return `
      <div class="ebolt-chart-card">
        <div class="ebolt-chart-header">
          <b>📊 ${title}</b>
          <button type="button" class="ebolt-chart-btn" onclick="insertChartToNote(this)" data-chart='${tableDataJson}'>+ Insert to Note</button>
        </div>
        ${chartContent}
        ${summary}
      </div>`;
}

function insertChartToNote(btn) {
    try {
        const chart = JSON.parse(btn.getAttribute('data-chart'));
        let md = `\n\n### 📊 ${chart.title || 'Chart'}\n\n| Category | Value |\n| :--- | :--- |\n`;
        const labels = chart.labels || [];
        const ds = (chart.datasets && chart.datasets[0] && chart.datasets[0].data) || [];
        labels.forEach((lbl, i) => {
            md += `| ${lbl} | ${ds[i] || 0} |\n`;
        });
        if (chart.summary) md += `\n*${chart.summary}*\n`;
        const home = document.getElementById('eboltEditor');
        const fresh = document.getElementById('eboltNewEditor');
        if (home) home.value += md;
        if (fresh) fresh.value += md;
        syncEditors();
        eboltToast('Chart table inserted into note ✓');
    } catch(e) {
        console.error(e);
    }
}

function appendChatToNote(text) {
    const home = document.getElementById('eboltEditor');
    const fresh = document.getElementById('eboltNewEditor');
    const starter = 'Start writing your next idea...';
    if (home) {
        if (home.value.trim() === starter) home.value = text;
        else home.value += '\n\n' + text;
    }
    if (fresh) {
        if (fresh.value.includes('Start writing here...')) fresh.value = text;
        else fresh.value += '\n\n' + text;
    }
    syncEditors();
    eboltToast('Appended to active note ✓');
}

function saveChatAsNote(text) {
    const clean = (text || '').trim();
    if (!clean) return;
    const notes = noteStore();
    const now = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const firstLine = clean.split('\n')[0].replace(/[*#`_]/g, '').trim();
    const title = (firstLine.slice(0, 36) || 'AI Note').trim();
    const note = {
        id: makeNoteId(),
        title,
        text: clean,
        updated: now,
        created: now
    };
    notes.unshift(note);
    saveNoteStore(notes);
    renderNotes();
    updateHomeStats();
    eboltToast('Saved as new note ✓');
}

function resetChatConversation() {
    eboltChatHistory = [];
    const box = document.getElementById('eboltChatMessages');
    if (box) {
        box.innerHTML = `
          <div class="ebolt-msg bot">
            <div class="ebolt-msg-content">Hi! I’m your Ebolt AI Chat Bot. Tell me what you want to write, organize, or request a chart!</div>
            <div class="ebolt-msg-actions">
              <button type="button" class="ebolt-msg-btn" onclick="copyChatMessage(this, 'Hi! I’m your Ebolt AI Chat Bot. Tell me what you want to write, organize, or request a chart!')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy
              </button>
              <button type="button" class="ebolt-msg-btn" onclick="appendChatToNote('Hi! I’m your Ebolt AI Chat Bot. Tell me what you want to write, organize, or request a chart!')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Append to Note
              </button>
              <button type="button" class="ebolt-msg-btn" onclick="saveChatAsNote('Hi! I’m your Ebolt AI Chat Bot. Tell me what you want to write, organize, or request a chart!')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                Save as Note
              </button>
            </div>
          </div>
        `;
    }
    const input = document.getElementById('eboltChatInput');
    if (input) input.value = '';
    eboltToast('Chat conversation refreshed');
}

function copyChatMessage(btn, text) {
    navigator.clipboard.writeText(text);
    eboltToast('Copied to clipboard ✓');
}

function formatMarkdownMessage(rawText) {
    let text = rawText;
    const chartMatches = [];
    const chartRegex = /```chart\s*([\s\S]*?)\s*```/gi;
    let match;
    while ((match = chartRegex.exec(text)) !== null) {
        try {
            const parsed = JSON.parse(match[1]);
            chartMatches.push({ raw: match[0], data: parsed });
        } catch(e) {
            console.warn('Chart parse error', e);
        }
    }

    chartMatches.forEach((cm, i) => {
        text = text.replace(cm.raw, `__EBOLT_CHART_${i}__`);
    });

    let html = escapeHtml(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="ebolt-code-block"><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="ebolt-inline-code">$1</code>');
    html = html.replace(/\n/g, '<br>');

    chartMatches.forEach((cm, i) => {
        const chartHtml = renderEboltSVGChart(cm.data);
        html = html.replace(`__EBOLT_CHART_${i}__`, chartHtml);
    });

    return html;
}

async function sendChat(event, promptText){
    if (event) event.preventDefault();
    const input = document.getElementById('eboltChatInput');
    const box = document.getElementById('eboltChatMessages');
    const message = (promptText || (input && input.value) || '').trim();
    if (!message || eboltIsGenerating) return;

    if (input) input.value = '';

    const user = document.createElement('div');
    user.className = 'ebolt-msg user';
    user.textContent = message;
    box.appendChild(user);

    const bot = document.createElement('div');
    bot.className = 'ebolt-msg bot';
    bot.innerHTML = '<span class="ebolt-ai-typing"><span class="ebolt-ai-dot"></span> Ebolt AI is thinking...</span>';
    box.appendChild(bot);
    box.scrollTop = box.scrollHeight;

    eboltIsGenerating = true;
    eboltChatHistory.push({ role: 'user', content: message });

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: eboltChatHistory,
                currentNote: {
                    title: getCurrentTitle(),
                    content: getEditorText()
                },
                userProfile: readEboltProfile(),
                requestChart: message.toLowerCase().includes('chart') || message.toLowerCase().includes('graph')
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Server error communicating with Gemini.');
        }

        const reply = data.reply || 'No response generated.';
        eboltChatHistory.push({ role: 'model', content: reply });

        const formattedHtml = formatMarkdownMessage(reply);
        bot.innerHTML = `
          <div class="ebolt-msg-content">${formattedHtml}</div>
          <div class="ebolt-msg-actions">
            <button type="button" class="ebolt-msg-btn" onclick="copyChatMessage(this, decodeURIComponent('${encodeURIComponent(reply)}'))">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
            <button type="button" class="ebolt-msg-btn" onclick="appendChatToNote(decodeURIComponent('${encodeURIComponent(reply)}'))">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              + Append to Note
            </button>
            <button type="button" class="ebolt-msg-btn" onclick="saveChatAsNote(decodeURIComponent('${encodeURIComponent(reply)}'))">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              Save as Note
            </button>
          </div>
        `;
    } catch(err) {
        console.error('Chat error:', err);
        bot.innerHTML = `<span style="color:#ff8e9e">⚠️ <b>AI Error:</b> ${escapeHtml(err.message || 'Unable to connect to AI server. Please check your GEMINI_API_KEY in Settings > Secrets.')}</span>`;
    } finally {
        eboltIsGenerating = false;
        box.scrollTop = box.scrollHeight;
    }
}


// ===== User profile =====
const eboltStateData = {
  IN: ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"],
  US: ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"],
  CA: ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"],
  AU: ["Australian Capital Territory","New South Wales","Northern Territory","Queensland","South Australia","Tasmania","Victoria","Western Australia"]
};
function eboltProfileKey(){ return 'ebolt_profile_' + String(eboltCurrentUser?.email || '').toLowerCase(); }
function readEboltProfile(){ try { return JSON.parse(localStorage.getItem(eboltProfileKey()) || '{}') || {}; } catch(_) { return {}; } }
function loadEboltProfile(){
  if(!eboltCurrentUser) return;
  const profile=readEboltProfile();
  const name=displayName(eboltCurrentUser.email, eboltCurrentUser.fullName);
  document.getElementById('profileName').value=name;
  document.getElementById('profileEmail').value=eboltCurrentUser.email || '';
  document.getElementById('profileDob').value=profile.dob || '';
  document.getElementById('profileGender').value=profile.gender || '';
  document.getElementById('profileCountryCode').value=profile.countryCode || '';
  document.getElementById('profileCountry').value=profile.country || '';
  updateEboltStates(profile.state || '');
  document.getElementById('profileHeading').textContent=name + "’s profile";
  document.getElementById('profileAvatar').textContent=name.charAt(0).toUpperCase();
  calculateEboltAge();
  setEboltProfileEditing(false);
}
function calculateEboltAge(){
  const dob=document.getElementById('profileDob').value;
  const ageField=document.getElementById('profileAge');
  if(!dob){ ageField.value=''; return; }
  const birth=new Date(dob+'T00:00:00'); const today=new Date();
  if(Number.isNaN(birth.getTime()) || birth>today){ ageField.value=''; return; }
  let age=today.getFullYear()-birth.getFullYear();
  if(today.getMonth()<birth.getMonth() || (today.getMonth()===birth.getMonth() && today.getDate()<birth.getDate())) age--;
  ageField.value=age;
}
function updateEboltStates(selectedState=''){
  const country=document.getElementById('profileCountry').value;
  const state=document.getElementById('profileState');
  state.replaceChildren();
  const first=document.createElement('option'); first.value=''; first.textContent=country?'Please select a state / province':'Please select a country first'; state.appendChild(first);
  (eboltStateData[country] || []).forEach(label=>{const opt=document.createElement('option');opt.value=label;opt.textContent=label;state.appendChild(opt);});
  state.disabled=!country || document.getElementById('profileCountry').disabled;
  if(selectedState && (eboltStateData[country]||[]).includes(selectedState)) state.value=selectedState;
}
function setEboltProfileEditing(editing){
  ['profileDob','profileGender','profileCountryCode','profileCountry'].forEach(id=>document.getElementById(id).disabled=!editing);
  document.getElementById('profileName').readOnly=true;
  document.getElementById('profileEmail').readOnly=true;
  document.getElementById('profileAge').readOnly=true;
  document.getElementById('profileSaveBtn').hidden=!editing;
  document.getElementById('profileCancelBtn').hidden=!editing;
  document.getElementById('profileSaveHint').textContent=editing?'Edit your details, then save your changes.':'Select Edit info to update your details.';
  updateEboltStates(document.getElementById('profileState').value);
}
function eboltEditProfile(){ loadEboltProfile(); setEboltProfileEditing(true); }
function cancelEboltProfileEdit(){ loadEboltProfile(); }
function saveEboltProfile(event){
  event.preventDefault(); if(!eboltCurrentUser) return;
  const dob=document.getElementById('profileDob').value;
  if(dob && new Date(dob+'T00:00:00')>new Date()){ eboltToast('Date of birth cannot be in the future.'); return; }
  const profile={dob,age:document.getElementById('profileAge').value,gender:document.getElementById('profileGender').value,countryCode:document.getElementById('profileCountryCode').value,country:document.getElementById('profileCountry').value,state:document.getElementById('profileState').value};
  try { localStorage.setItem(eboltProfileKey(),JSON.stringify(profile)); }
  catch(_) { eboltToast('Could not save profile in this browser.'); return; }
  setEboltProfileEditing(false);
  document.getElementById('profileSaveHint').textContent='Your profile has been saved.';
  eboltToast('User info saved ✓');
}

// Subtle, pointer-responsive depth effect. Pointer and touch both work; motion is clamped for comfort.
(function initEboltParallax(){
  let lastX=0,lastY=0,scheduled=false;
  function move(x,y){
    const nx=Math.max(-1,Math.min(1,(x/window.innerWidth-.5)*2));
    const ny=Math.max(-1,Math.min(1,(y/window.innerHeight-.5)*2));
    lastX=nx;lastY=ny;
    if(scheduled)return; scheduled=true;
    requestAnimationFrame(()=>{document.documentElement.style.setProperty('--ebolt-mouse-x',(lastX*18).toFixed(2)+'px');document.documentElement.style.setProperty('--ebolt-mouse-y',(lastY*14).toFixed(2)+'px');scheduled=false;});
  }
  window.addEventListener('pointermove',e=>move(e.clientX,e.clientY),{passive:true});
  window.addEventListener('touchmove',e=>{if(e.touches&&e.touches[0])move(e.touches[0].clientX,e.touches[0].clientY);},{passive:true});
  window.addEventListener('deviceorientation',e=>{if(e.gamma==null||e.beta==null)return;move(window.innerWidth*(.5+Math.max(-30,Math.min(30,e.gamma))/60),window.innerHeight*(.5+Math.max(-30,Math.min(30,e.beta))/60));},{passive:true});
})();

window.addEventListener('load',()=>{
    try{
        updateHomeStats();
        const remembered=JSON.parse(localStorage.getItem('ebolt_remember')||'null');
        const u=document.getElementById('username');
        const p=document.getElementById('password');
        if(remembered){
            const c=document.querySelector('.remember input');
            if(c)c.checked=true;
            if(u && !u.value) u.value = remembered.email || '';
            if(p && !p.value) p.value = remembered.password || '';
        } else {
            if(u && !u.value) u.value = 'reddy@gamil.com';
            if(p && !p.value) p.value = 'reddy';
        }
    }catch(_){}
});

// Explicit window bindings for HTML inline onclick handlers
Object.assign(window, {
    resetChatConversation,
    saveChatAsNote,
    copyChatMessage,
    appendChatToNote,
    sendChat,
    eboltGo,
    eboltSaveNote,
    eboltSaveAsNew,
    eboltNewNote,
    eboltRenameNote,
    eboltDeleteNoteById,
    loadNoteById,
    eboltCreateAndOpenNewNote,
    eboltLogout,
    eboltEditProfile,
    cancelEboltProfileEdit,
    saveEboltProfile,
    calculateEboltAge,
    updateEboltStates
});
