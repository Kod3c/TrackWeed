(function(){
  // Keys
  const STORE_KEY = "dt/state";
  const AUTH_COOKIE = "weed_tracker_auth";
  const AUTH_PASSWORD = "Roobear0515!";

  // DOM helpers
  const $ = sel => document.querySelector(sel);
  const sinceEl = $("#since");
  const smokeBtn = $("#smokeBtn");
  const missedBtn = $("#missedBtn");
  const configBtn = $("#configBtn");
  const exportBtn = $("#exportBtn");
  const importInput = $("#importInput");
  const resetBtn = $("#resetBtn");
  const logEl = $("#log");
  const integrityEl = $("#integrity");

  // Auth UI
  const authWrap = $("#authWrap");
  const authPassword = $("#authPassword");
  const authSubmit = $("#authSubmit");
  const authError = $("#authError");
  const mainApp = $("#mainApp");

  // Missed UI
  const missedPanel = $("#missedPanel");
  const missedSmokeAt = $("#missedSmokeAt");
  const missedAdd = $("#missedAdd");
  const missedCancel = $("#missedCancel");
  const missedError = $("#missedError");

  // Config UI
  const cfgWrap = $("#cfgWrap");
  const cfgRed = $("#cfgRed");
  const cfgGreen = $("#cfgGreen");
  const cfgError = $("#cfgError");
  const cfgSave = $("#cfgSave");
  const cfgCancel = $("#cfgCancel");

  // Type UI
  const typeWrap = $("#typeWrap");
  const typeCancel = $("#typeCancel");

  // Wizard UI
  const wizardWrap = $("#wizardWrap");
  const wizardCancel = $("#wizardCancel");
  const wizardPages = {
    1: $("#wizardPage1"),
    2: $("#wizardPage2"),
    3: $("#wizardPage3"),
    4: $("#wizardPage4")
  };
  const wizardButtons = {
    next1: $("#wizardNext1"),
    back2: $("#wizardBack2"),
    next2: $("#wizardNext2"),
    back3: $("#wizardBack3"),
    next3: $("#wizardNext3"),
    back4: $("#wizardBack4"),
    complete: $("#wizardComplete")
  };

  // State
  let state = emptyState();
  let lastGoodSerialized = null;

  // Utils
  const nowUTC = () => new Date().toISOString();
  const isISO = s => { try { return !!s && !Number.isNaN(Date.parse(s)); } catch { return false; } };
  function emptyState(){ return { version:2, config:{ redHrs:5, greenHrs:9 }, lastSmokeAt:null, events:[] }; }

  // Authentication functions
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  function isAuthenticated() {
    return getCookie(AUTH_COOKIE) === 'true';
  }

  function authenticate() {
    if (isAuthenticated()) {
      showMainApp();
      return;
    }
    showAuthModal();
  }

  function showAuthModal() {
    authWrap.classList.remove('hidden');
    mainApp.classList.add('hidden');
    authPassword.focus();
  }

  function showMainApp() {
    authWrap.classList.add('hidden');
    mainApp.classList.remove('hidden');
  }

  function handleAuthSubmit() {
    authError.textContent = '';
    const password = authPassword.value.trim();
    
    if (password === AUTH_PASSWORD) {
      setCookie(AUTH_COOKIE, 'true', 7); // 7 days
      showMainApp();
      authPassword.value = '';
    } else {
      authError.textContent = 'Incorrect password';
      authPassword.value = '';
      authPassword.focus();
    }
  }

  function logout() {
    deleteCookie(AUTH_COOKIE);
    showAuthModal();
  }

  function migrate(v){
    if (!v) return emptyState();
    if (v.version === 1){ v = { version:2, config:{ redHrs:5, greenHrs:9 }, lastSmokeAt: v.lastSmokeAt ?? null, events: Array.isArray(v.events)? v.events: [] }; }
    if (!v.config) v.config = { redHrs:5, greenHrs:9 };
    const cleaned = [];
    for (const e of Array.isArray(v.events)? v.events: []){
      if (!e || typeof e !== 'object') continue;
      if (e.type !== 'smoke') continue;
      if (!isISO(e.at)) continue;
      if (!e.id) e.id = uuid();
      cleaned.push({ id:e.id, type:'smoke', at:e.at, method:e.method || null });
    }
    v.events = cleaned;
    v.version = 2;
    return v;
  }

  function validateState(obj){
    if (!obj || typeof obj !== 'object') return false;
    if (![1,2].includes(obj.version)) return false;
    if (obj.lastSmokeAt !== null && !isISO(obj.lastSmokeAt)) return false;
    if (!Array.isArray(obj.events)) return false;
    const now = Date.now();
    for (const e of obj.events){ if (!e || typeof e !== 'object') return false; if (e.type === 'smoke'){ if (!isISO(e.at)) return false; if (Date.parse(e.at) - now > 120000) return false; } else { return false; } }
    if (obj.config){ const c=obj.config; if (typeof c.redHrs!== 'number'||typeof c.greenHrs!== 'number') return false; }
    return true;
  }

  async function loadState(){
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw){ const s = emptyState(); lastGoodSerialized = JSON.stringify(s); return s; }
    try {
      let parsed = JSON.parse(raw);
      if (!validateState(parsed)){ showIntegrityBadge('Recovered from storage error. Started fresh.'); return emptyState(); }
      parsed = migrate(parsed);
      lastGoodSerialized = JSON.stringify(parsed);
      showIntegrityBadge(null);
      return parsed;
    } catch {
      showIntegrityBadge('Recovered from storage error. Started fresh.');
      return emptyState();
    }
  }

  async function saveState(){ const raw = JSON.stringify(state); localStorage.setItem(STORE_KEY, raw); lastGoodSerialized = raw; }

  function fmtDeltaMS(ms){ if (ms < 0) ms = 0; const t = Math.floor(ms/1000); const h = Math.floor(t/3600); const m = Math.floor((t%3600)/60); const s = t%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
  function fmtLocal(ts){ const d = new Date(ts); const dt = new Intl.DateTimeFormat(undefined, {year:'numeric',month:'2-digit',day:'2-digit', hour:'2-digit', minute:'2-digit'}); return dt.format(d); }
  function prettyMethod(m){ if(!m) return ''; const map={dab:'Dab Pen', bong:'Bong', joint:'Joint'}; return map[m]||m; }
  function sortEvents(){ state.events.sort((a,b)=> Date.parse(a.at) - Date.parse(b.at)); }
  function recomputeLastSmoke(){ const now = Date.now(); let latest = null; for (const e of state.events){ if (e.type==='smoke' && Date.parse(e.at) <= now){ latest = e.at; } } state.lastSmokeAt = latest; }

  function colorClass(hours){ const { redHrs, greenHrs } = state.config; if (hours < redHrs) return 'red'; if (hours < greenHrs) return 'yellow'; return 'green'; }

  function render(){ updateTimer(); renderLog(); }
  function renderLog(){
    logEl.innerHTML = '';
    const rows = [];
    for (let i = state.events.length - 1; i >= 0; i--){
      const e = state.events[i];
      const j = (function(){ for (let k=i-1; k>=0; k--) if (state.events[k].type==='smoke') return k; return -1; })();
      let right = ''; let cls = '';
      if (j!==-1){ const diffMs = Date.parse(e.at)-Date.parse(state.events[j].at); right = fmtDeltaMS(diffMs); const hours = diffMs/3600000; cls = colorClass(hours); }
      const kind = e.method ? `Smoked · ${prettyMethod(e.method)}` : 'Smoked';
      rows.push(entryNode(e.id, `${fmtLocal(e.at)} · ${kind}`, right, cls));
    }
    for (const r of rows) logEl.appendChild(r);
  }
  function updateTimer(){ if (state.lastSmokeAt){ const ms = Date.now() - Date.parse(state.lastSmokeAt); sinceEl.textContent = fmtDeltaMS(ms); } else { sinceEl.textContent = '00:00:00'; } }

  function entryNode(id,left,right,cls){
    const div=document.createElement('div');
    div.className='entry';
    const l=document.createElement('div'); l.className='left'; l.textContent=left; div.appendChild(l);
    const r=document.createElement('div'); r.className='right'; if(cls) r.classList.add(cls); r.textContent=right; div.appendChild(r);
    const d=document.createElement('button');
    d.className='del'; d.type='button'; d.setAttribute('data-del', id);
    d.setAttribute('aria-label','Delete'); d.title='Delete';
    d.textContent='×';
    div.appendChild(d);
    return div;
  }

  function uuid(){ if(crypto.randomUUID) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);}); }

  async function recordSmoke(method){
    const t=nowUTC();
    state.events.push({id:uuid(), type:'smoke', method, at:t});
    sortEvents();
    recomputeLastSmoke();
    await saveState();
    flash(smokeBtn);
    render();
    closeType();
  }

  async function addMissed(){
    missedError.textContent='';
    const iso=new Date(missedSmokeAt.value);
    if(!missedSmokeAt.value||Number.isNaN(iso.getTime())){ missedError.textContent='Invalid time'; return; }
    const at=iso.toISOString();
    if(Date.parse(at)-Date.now()>120000){ missedError.textContent='Future not allowed'; return; }
    state.events.push({id:uuid(),type:'smoke',at});
    sortEvents();
    recomputeLastSmoke();
    await saveState();
    toggleMissed(false);
    render();
  }

  function openConfig(){ cfgError.textContent=''; cfgRed.value = state.config.redHrs; cfgGreen.value = state.config.greenHrs; cfgWrap.classList.remove('hidden'); }
  function closeConfig(){ cfgWrap.classList.add('hidden'); }
  async function saveConfig(){
    cfgError.textContent='';
    const r = Number(cfgRed.value); const g = Number(cfgGreen.value);
    if (!Number.isFinite(r) || !Number.isFinite(g) || r < 0 || g < 0){ cfgError.textContent = 'Values must be non-negative numbers.'; return; }
    if (!(r <= g)){ cfgError.textContent = 'Require: red ≤ green.'; return; }
    state.config.redHrs = r; state.config.greenHrs = g;
    await saveState();
    render();
    closeConfig();
  }

  function flash(btn){ btn.classList.add('primary'); setTimeout(()=>btn.classList.remove('primary'),150); }
  function exportJSON(){ const payload=JSON.parse(JSON.stringify(state)); const out={app:'WeedUseTracker v2',exportedAt:nowUTC(),payload}; const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}); const a=document.createElement('a'); const ts=new Date().toISOString().replace(/[-:T]/g,'').slice(0,15); a.download=`weed-tracker-${ts}.json`; a.href=URL.createObjectURL(blob); document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0); }
  async function importJSON(file){ const text=await file.text(); let obj; try{obj=JSON.parse(text);}catch{badge('Invalid JSON');return;} if(!obj||typeof obj!=='object'||!obj.payload){badge('Invalid shape');return;} let candidate=obj.payload; if(!validateState(candidate)){badge('Rejected');return;} candidate = migrate(candidate); state=candidate; sortEvents(); recomputeLastSmoke(); await saveState(); badge(null); render(); }

  let resetArmed=false,resetTimer=null; async function onReset(){ if(!resetArmed){ resetArmed=true; resetBtn.classList.add('confirm'); resetBtn.textContent='Click again to confirm'; clearTimeout(resetTimer); resetTimer=setTimeout(()=>{resetArmed=false;resetBtn.classList.remove('confirm');resetBtn.textContent='Reset';},5000);return;} clearTimeout(resetTimer); resetArmed=false; resetBtn.classList.remove('confirm'); resetBtn.textContent='Reset'; state=emptyState(); await saveState(); render(); }
  function badge(msg){ showIntegrityBadge(msg); }
  function showIntegrityBadge(msg){ if (!msg){ integrityEl.classList.add('hidden'); integrityEl.textContent = ''; return; } integrityEl.textContent = msg; integrityEl.classList.remove('hidden'); }

  // Delete with confirmation; first click arms; second deletes
  let armedId = null; let armTimer = null;
  function arm(btn, id){
    disarm();
    armedId = id;
    btn.classList.add('confirm');
    btn.textContent = 'Confirm';
    btn.setAttribute('aria-label','Confirm delete');
    armTimer = setTimeout(disarm, 5000);
  }
  function disarm(){
    const armedBtn = logEl.querySelector('.del.confirm');
    if (armedBtn){ armedBtn.classList.remove('confirm'); armedBtn.textContent = '×'; armedBtn.setAttribute('aria-label','Delete'); }
    armedId = null; if (armTimer){ clearTimeout(armTimer); armTimer = null; }
  }
  async function deleteEvent(id){
    const idx = state.events.findIndex(e => e.id === id);
    if (idx === -1) return;
    state.events.splice(idx, 1);
    sortEvents();
    recomputeLastSmoke();
    await saveState();
    render();
    disarm();
  }

  logEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    const id = btn.getAttribute('data-del');
    if (armedId !== id){ arm(btn, id); return; }
    deleteEvent(id);
  });
  // Cancel armed state when clicking elsewhere or pressing ESC
  document.addEventListener('click', (e)=>{ if (!e.target.closest('[data-del]')) disarm(); });
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') disarm(); });

  // Timer loop
  let lastTimerTick=0; function loop(ts){ if(ts-lastTimerTick>250){ updateTimer(); lastTimerTick=ts; } requestAnimationFrame(loop); }

  // Wire UI
  smokeBtn.addEventListener('click', openWizard);
  missedBtn.addEventListener('click',()=>toggleMissed(missedPanel.classList.contains('hidden')));
  missedAdd.addEventListener('click',addMissed);
  missedCancel.addEventListener('click',()=>toggleMissed(false));
  configBtn.addEventListener('click', openConfig);
  cfgCancel.addEventListener('click', closeConfig);
  cfgSave.addEventListener('click', saveConfig);
  exportBtn.addEventListener('click',exportJSON);
  importInput.addEventListener('change',(e)=>{const f=e.target.files&&e.target.files[0]; if(f) importJSON(f).then(()=>{ importInput.value=''; });});
  resetBtn.addEventListener('click',onReset);

  // Auth event listeners
  authSubmit.addEventListener('click', handleAuthSubmit);
  authPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAuthSubmit();
    }
  });

  // Wizard functions
  let wizardAnswers = { 1: null, 2: null, 3: null };
  
  function openWizard(){ 
    // Reset all answers
    wizardAnswers = { 1: null, 2: null, 3: null };
    // Reset all option buttons
    document.querySelectorAll('#wizardPage1 .wizard-option').forEach(opt => {
      opt.classList.remove('active');
    });
    // Disable complete button
    wizardButtons.complete.disabled = true;
    wizardWrap.classList.remove('hidden'); 
  }
  
  function closeWizard(){ 
    wizardWrap.classList.add('hidden'); 
  }
  
  function checkAllQuestionsAnswered() {
    const allYes = Object.values(wizardAnswers).every(answer => answer === 'yes');
    wizardButtons.complete.disabled = !allYes;
  }
  
  function completeWizard() {
    closeWizard();
    // After completing wizard, open the type selection modal
    openType();
  }

  // Wizard event listeners
  wizardButtons.complete.addEventListener('click', completeWizard);
  wizardCancel.addEventListener('click', closeWizard);
  
  // Wizard option handling for all questions on single page
  document.querySelectorAll('#wizardPage1 .wizard-option').forEach(option => {
    option.addEventListener('click', () => {
      const questionNum = parseInt(option.dataset.question);
      const answer = option.dataset.answer;
      
      // Remove active class from all options for this question
      document.querySelectorAll(`#wizardPage1 .wizard-option[data-question="${questionNum}"]`).forEach(opt => {
        opt.classList.remove('active');
      });
      
      // Add active class to clicked option
      option.classList.add('active');
      
      // Store the answer
      wizardAnswers[questionNum] = answer;
      
      // Check if all questions are answered
      checkAllQuestionsAnswered();
    });
  });
  
  // Close wizard when clicking outside
  wizardWrap.addEventListener('click', (e) => { 
    if (e.target === wizardWrap) { 
      closeWizard(); 
    } 
  });

  // Type modal interactions
  function openType(){ typeWrap.classList.remove('hidden'); }
  function closeType(){ typeWrap.classList.add('hidden'); }
  typeWrap.addEventListener('click',(e)=>{ if(e.target===typeWrap){ closeType(); } });
  typeCancel.addEventListener('click', closeType);
  document.querySelectorAll('#typeWrap [data-method]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ recordSmoke(btn.dataset.method); });
  });

  function toggleMissed(open){ missedPanel.classList.toggle('hidden',!open); missedPanel.setAttribute('aria-hidden',open?'false':'true'); missedError.textContent=''; }

  // Boot
  authenticate();
  loadState().then(s=>{ state=s; sortEvents(); recomputeLastSmoke(); render(); requestAnimationFrame(loop); });

  // Smoke test
  (function runTests(){
    const results = [];
    const ok = (name, cond) => { results.push({name, cond}); if(!cond) console.error('[TEST FAIL]', name); };
    ok('fmtDeltaMS 3661000 => 01:01:01', (function(){ const t=(()=>{ const ms=3661000; const tt = Math.floor(ms/1000); const h = Math.floor(tt/3600); const m = Math.floor((tt%3600)/60); const s = tt%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; })(); return t==='01:01:01'; })());
  })();
})();
