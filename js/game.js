/* =========================================================
 * Falling Dot Hunter – Mecha v2.0 (Full)
 * - Modifiers, Boss/Waves, formations mới
 * - FEVER VFX (bloom + gradient sweep + logo), electric outline
 * - Screen ripple nhẹ, particle 2 lớp, ring theo tier
 * - Leaderboard badges + filter theo difficulty/seed
 * - Âm nhạc loop 35s, layer tăng khi FEVER; SFX/Music volume riêng
 * - Số mạng: Easy=6, Normal=5, Hard=3 (+ modifiers)
 * ========================================================= */

(function(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();})();

function init(){
  const Q = id => document.getElementById(id);
  const setText = (id, txt) => { const el = Q(id); if (el) el.textContent = txt; };

  /* ---------- Canvas logical ---------- */
  const LOGICAL_W = 540, LOGICAL_H = 960;
  const canvas = Q("gameCanvas"), ctx = canvas.getContext("2d");
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let scale = 1, border = {l:0,t:0,r:0,b:0};
  let debug = false;

  // --- Topbar sizing & canvas resize ---
  const topbar = document.getElementById("topbar");

/* ===== Dropdown controller (fixed-position, auto-close, single-open) ===== */
(function setupDropdowns(){
  function positionMenuByButton(btnEl, menuEl, alignRight = true){
    const prevVis = menuEl.style.visibility;
    const prevDisp = menuEl.style.display;
    menuEl.style.visibility = "hidden";
    menuEl.style.display = "block";
    const mw = Math.max(menuEl.offsetWidth, 160);
    const mh = menuEl.offsetHeight;
    menuEl.style.visibility = prevVis || "";
    menuEl.style.display    = prevDisp || "";

    const br = btnEl.getBoundingClientRect();
    const margin = 6;
    const top  = Math.min(window.innerHeight - mh - margin, br.bottom + 4);
    let left;
    if (alignRight){
      left = Math.min(window.innerWidth - mw - margin, br.right - mw); // bám mép phải
    } else {
      left = Math.max(margin, Math.min(br.left, window.innerWidth - mw - margin)); // bám mép trái
    }
    menuEl.style.position = "fixed";
    menuEl.style.left     = left + "px";
    menuEl.style.top      = top  + "px";
    menuEl.style.minWidth = Math.max(mw, br.width) + "px";
    menuEl.style.zIndex   = "1000";
  }

  function closeAll(exceptWrap){
    document.querySelectorAll(".dropdown.open").forEach(w=>{
      if (w !== exceptWrap){
        const m = w.querySelector(".menu, .menu.mods");
        w.classList.remove("open");
        if (m){
          m.style.display = "";
          m.style.left = m.style.top = m.style.position = "";
        }
      }
    });
  }

  function wireDropdown(wrapperId, btnSel, menuSel, {alignRight=true, closeOnItemClick=false}={}){
    const wrap = document.getElementById(wrapperId);
    if (!wrap) return;
    const btn  = wrap.querySelector(btnSel);
    const menu = wrap.querySelector(menuSel);
    if (!btn || !menu) return;

    const open = ()=>{
      closeAll(wrap);
      wrap.classList.add("open");
      menu.style.display = "block";
      positionMenuByButton(btn, menu, alignRight);
    };
    const close = ()=>{
      wrap.classList.remove("open");
      menu.style.display = "";
      menu.style.left = menu.style.top = menu.style.position = "";
    };

    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      wrap.classList.contains("open") ? close() : open();
    });

    document.addEventListener("click",(e)=>{
      if (!wrap.contains(e.target) && wrap.classList.contains("open")) close();
    }, true);

    document.addEventListener("keydown",(e)=>{
      if (e.key === "Escape" && wrap.classList.contains("open")) close();
    });

    const reposition = ()=>{ if (wrap.classList.contains("open")) positionMenuByButton(btn, menu, alignRight); };
    window.addEventListener("resize", reposition);
    window.addEventListener("orientationchange", reposition);

    // Language: click item sẽ đóng; Modifiers: tick không đóng
    if (closeOnItemClick){
      menu.addEventListener("click",(e)=>{
        const li = e.target.closest("li,button,[data-close]");
        if (li) closeAll();
      });
    }
  }

  // Gắn cho 2 menu (khớp DOM hiện có trong index.html)
  wireDropdown("langDropdown", "#langBtn", "#langMenu", {alignRight:true, closeOnItemClick:true});
  wireDropdown("modsDropdown",  "button",   ".menu.mods", {alignRight:true, closeOnItemClick:false});
})(); 
/* ===== /Dropdown controller ===== */


  function applyTopbar(){
    const h = topbar ? topbar.offsetHeight : 64;
    document.documentElement.style.setProperty("--topbar-h", h + "px");
    requestAnimationFrame(resizeCanvas); // đợi layout xong rồi mới resize
  }

  // gọi ngay khi DOM sẵn sàng
  applyTopbar();
  // cập nhật khi cửa sổ đổi size hoặc xoay
  addEventListener("resize", applyTopbar);
  addEventListener("orientationchange", applyTopbar);
  // cập nhật khi topbar tự thay đổi kích thước (wrap/ẩn hiện menu,...)
  if (window.ResizeObserver) {
    new ResizeObserver(applyTopbar).observe(topbar);
  }
  // lần nữa khi trang load xong (font/icon có thể làm cao lên)
  addEventListener("load", applyTopbar);

function resizeCanvas(){
  const container = document.querySelector(".stageBox") || canvas.parentElement || document.body;
  const cs = getComputedStyle(container);
  const availW = container.clientWidth  - (parseFloat(cs.paddingLeft)||0) - (parseFloat(cs.paddingRight)||0);
  const availH = container.clientHeight - (parseFloat(cs.paddingTop)||0)  - (parseFloat(cs.paddingBottom)||0);

  const sx = availW / LOGICAL_W;
  const sy = availH / LOGICAL_H;

  // ====== CHỌN CHẾ ĐỘ SCALE ======
  const FIT_WIDTH = true;    // đặt true để luôn chơi được hết theo chiều ngang
  scale = FIT_WIDTH ? Math.max(0, sx) : Math.max(0, Math.min(sx, sy));

  const cssW = Math.floor(LOGICAL_W * scale);
  const cssH = Math.floor(LOGICAL_H * scale);
  canvas.style.width  = cssW + "px";
  canvas.style.height = cssH + "px";

  const deviceScale = scale * DPR;
  canvas.width  = Math.floor(LOGICAL_W * deviceScale);
  canvas.height = Math.floor(LOGICAL_H * deviceScale);
  ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

  const csCanvas = getComputedStyle(canvas);
  border.l = parseFloat(csCanvas.borderLeftWidth)  || 0;
  border.r = parseFloat(csCanvas.borderRightWidth) || 0;
  border.t = parseFloat(csCanvas.borderTopWidth)   || 0;
  border.b = parseFloat(csCanvas.borderBottomWidth)|| 0;

  canvas.style.pointerEvents = "auto";
}


  resizeCanvas();
  addEventListener("resize",()=>{ applyTopbar(); resizeCanvas(); });

  function visibleBottomY() {
    const rect = canvas.getBoundingClientRect();
    const bottomPx = Math.min(rect.bottom, window.innerHeight) - rect.top;
    const visibleInner = Math.max(0, bottomPx - border.t);
    return visibleInner / scale;
  }



  /* ---------- UI refs ---------- */
  const scoreEl=Q("score"), livesEl=Q("lives"), timeEl=Q("time"), levelEl=Q("level");
  const comboEl=Q("combo"), comboMulEl=Q("comboMul"), feverFill=Q("feverFill");
  const banner=Q("banner"), overlay=Q("overlay"), rLast=Q("rLast"), rHigh=Q("rHigh");
  const startBtn=Q("startBtn"), pauseBtn=Q("pauseBtn"), resetBtn=Q("resetBtn"), againBtn=Q("againBtn");
  const diffSel=Q("difficulty"), muteToggle=Q("muteToggle"), cbToggle=Q("cbToggle");
  const heartsWrap=Q("hearts"), lbEl=Q("leaderboard"), dailySeedEl=Q("dailySeed");
  const nameEntry=Q("nameEntry"), playerName=Q("playerName"), saveNameBtn=Q("saveNameBtn"), savedMsg=Q("savedMsg");
  const top10Msg=Q("top10Msg");
  // NEW: Modifiers / volume / FEVER logo / lb filters
  const modSlowFall=Q("modSlowFall"), modBigDots=Q("modBigDots"), modExtraLife=Q("modExtraLife");
  const modTinyDots=Q("modTinyDots"), modNoFreeze=Q("modNoFreeze"), modSuddenDeath=Q("modSuddenDeath");
  const sfxVol=Q("sfxVol"), musicVol=Q("musicVol"), feverLogo=Q("feverLogo");
  const lbFilterDiff=Q("lbFilterDiff"), lbFilterSeed=Q("lbFilterSeed");

  /* ---------- Config base ---------- */
  const CONFIG = {
    START_TIME: 60,
    START_LIVES_DEFAULT: 5, // sẽ override theo difficulty
    MAX_CONCURRENT: 5,
    MAX_COMBO_MUL: 2.0,
    COMBO_DECAY: 1.5,
    FEVER_GAIN: { perfect:14, great:8, good:4 },
    FEVER_MAX: 100, FEVER_TIME: 8,
    HITSTOP: .06, SHAKE: 5, PARTICLES: 18,
    VISIBLE_SAFE_MARGIN: 24,
    KILL_LEAD_FACTOR: 0.10, KILL_LEAD_MAX: 28,
    KILL_TIME_FUSE: 0.7
  };
  // tốc độ & kích thước base
  const DIFF = {
    easy  :{ baseSpeed:900, radius:28, spawn:1, lives:6 },
    normal:{ baseSpeed:130, radius:24, spawn:1, lives:5 },
    hard  :{ baseSpeed:190, radius:22, spawn:2, lives:3 }
  };
  const BASE_COLORS=[{name:"red",hex:"#ff5b5b",weight:3},{name:"orange",hex:"#ffa53b",weight:2},{name:"blue",hex:"#45d7ff",weight:1}];
  const CB_COLORS  =[ {name:"gold",hex:"#ffd166",weight:3},{name:"green",hex:"#06d6a0",weight:2},{name:"blue2",hex:"#118ab2",weight:1} ];
  const POWER_COLORS=[{type:"freeze",name:"teal",hex:"#00e3d8"},{type:"time",name:"teal",hex:"#00e3d8"},{type:"bomb",name:"teal",hex:"#00e3d8"}];

  /* ---------- I18N đầy đủ ---------- */
  const I18N = {
    ko: {
      langButton: "한국어",
      score:"점수", lives:"목숨", time:"시간", level:"레벨", combo:"콤보", fever:"FEVER",
      diff:"난이도", mute:"음소거", cb:"색각보정",
      hint:"원을 클릭하세요! 바닥에 닿기 전에요.",
      overTitle:"게임 오버", overDesc:"다시 도전해 보세요.", playAgain:"다시 시작",
      lastLabel:"최신기록", highLabel:"최고기록", lbTitle:"리더보드(로컬)",
      nameLabel:"이름", save:"저장", saved:"저장 완료 ✓",
      missionTitle:"미션",
      mission1:"콤보 ×2.0 달성",
      mission2:"하드 모드에서 50점",
      mission3:"폭탄으로 전체 제거",
      legendTitle:"색상 점수",
      legendRed:"Red ×3", legendOrange:"Orange ×2", legendBlue:"Blue ×1",
      legendPower:"Power-Up", top10:"Top 10! 이름을 저장하세요."
    },
    en: {
      langButton: "English",
      score:"Score", lives:"Lives", time:"Time", level:"Level", combo:"Combo", fever:"FEVER",
      diff:"Difficulty", mute:"Mute", cb:"Color-blind",
      hint:"Click dots before they hit the floor.",
      overTitle:"Game Over", overDesc:"Try again!", playAgain:"PLAY AGAIN",
      lastLabel:"Last", highLabel:"High", lbTitle:"Leaderboard (Local)",
      nameLabel:"Your Name", save:"SAVE", saved:"Saved ✓",
      missionTitle:"Missions",
      mission1:"Reach combo ×2.0",
      mission2:"Score 50 in Hard",
      mission3:"Clear all with a Bomb",
      legendTitle:"Color points",
      legendRed:"Red ×3", legendOrange:"Orange ×2", legendBlue:"Blue ×1",
      legendPower:"Power-Up", top10:"Top 10! Enter your name."
    }
  };
  function setLang(l){
    const t = I18N[l] || I18N.en;
    setText("scoreText",t.score); setText("livesText",t.lives); setText("timeText",t.time);
    setText("levelText",t.level); setText("comboText",t.combo); setText("feverText",t.fever);
    setText("diffLabel",t.diff); setText("muteLabel",t.mute); setText("cbLabel",t.cb);
    setText("hint",t.hint); setText("overTitle",t.overTitle); setText("overDesc",t.overDesc);
    setText("againBtn",t.playAgain); setText("rLastText",t.lastLabel); setText("rHighText",t.highLabel);
    setText("lbTitle",t.lbTitle); setText("nameLabel",t.nameLabel);
    if (saveNameBtn) saveNameBtn.textContent = t.save;
    setText("missionTitle",t.missionTitle);
    setText("mission1",t.mission1); setText("mission2",t.mission2); setText("mission3",t.mission3);
    setText("legendTitle",t.legendTitle);
    setText("legendRed", t.legendRed); setText("legendOrange", t.legendOrange);
    setText("legendBlue", t.legendBlue); setText("legendPower", t.legendPower);
    // Cập nhật label nút dropdown ngôn ngữ
    const btn = document.getElementById("langBtn");
    if (btn) {
      const label = document.getElementById("langBtnLabel"); // nếu có span riêng
      const txt = (I18N[l] || I18N.en).langButton;
      if (label) label.textContent = txt; else btn.textContent = txt;
    }
    localStorage.setItem("mecha_lang", l);
  }
  (function initLang(){
  const saved = localStorage.getItem("mecha_lang") || "en";
  setLang(saved);
  const menu = Q("langMenu");
  menu?.addEventListener("click",(e)=>{
    const li = e.target.closest("li");
    if (li && li.dataset.lang){ setLang(li.dataset.lang); }
  });
})();


  /* ---------- Audio (WebAudio): SFX & Music layers ---------- */
  let audioCtx=null,audioReady=false, sfxGain=null, musicGain=null;
  async function initAudioIfNeeded(){
    if (audioReady || muteToggle?.checked) return;
    try{
      audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      if (audioCtx.state==="suspended") await audioCtx.resume();
      // SFX & Music gain
      sfxGain = audioCtx.createGain(); sfxGain.gain.value = Number(sfxVol?.value||0.9);
      musicGain = audioCtx.createGain(); musicGain.gain.value = Number(musicVol?.value||0.6);
      const master = audioCtx.createGain(); master.connect(audioCtx.destination);
      sfxGain.connect(master); musicGain.connect(master);
      startMusicLoop();
      audioReady = (audioCtx.state==="running");
    }catch(_){ audioReady=false; }
  }
  function updateVolumes(){
    if (sfxGain) sfxGain.gain.value = Number(sfxVol.value);
    if (musicGain) musicGain.gain.value = Number(musicVol.value);
  }
  sfxVol?.addEventListener("input", updateVolumes);
  musicVol?.addEventListener("input", updateVolumes);
    muteToggle?.addEventListener("change", () => {
    if (muteToggle.checked) {
      // Mute: đưa cả hai gain về 0
      if (sfxGain)   sfxGain.gain.value   = 0;
      if (musicGain) musicGain.gain.value = 0;
    } else {
      // Unmute: khởi tạo audio nếu chưa có, rồi áp lại theo slider
      initAudioIfNeeded();
      updateVolumes();
    }
  });


  // Nhạc nền nhẹ nhàng: pad êm + nhịp rất nhẹ; layer2 (lead) chỉ nổi khi FEVER
function startMusicLoop(){
  if(!audioCtx) return;
  const t0 = audioCtx.currentTime + .05;
  const tempo = 84;                  // chậm hơn
  const bar = 60/tempo*4;            // 4/4

  // === PAD êm (2 saw nhẹ + lowpass + detune) ===
  const pad1 = audioCtx.createOscillator(); pad1.type="sawtooth"; pad1.frequency.value = 196;   // G3
  const pad2 = audioCtx.createOscillator(); pad2.type="sawtooth"; pad2.frequency.value = 155.56;// D#3
  pad2.detune.value = +6;

  const lp  = audioCtx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=600; lp.Q.value=0.7;
  const padGain = audioCtx.createGain(); padGain.gain.value=0.15; // dịu
  pad1.connect(lp); pad2.connect(lp); lp.connect(padGain); padGain.connect(musicGain);
  pad1.start(t0); pad2.start(t0);

  // Slow vibrato (rất nhẹ)
  const lfo = audioCtx.createOscillator(); lfo.type="sine"; lfo.frequency.value=0.25;
  const lfoGain = audioCtx.createGain(); lfoGain.gain.value=8; // ±8 cent
  lfo.connect(lfoGain);
  lfoGain.connect(pad1.detune); lfoGain.connect(pad2.detune);
  lfo.start(t0);

  // === nhịp rất nhẹ (noise hi-hat êm) ===
  const noiseBuf = (()=>{ // tạo white noise ngắn
    const len = audioCtx.sampleRate*0.1;
    const buf = audioCtx.createBuffer(1,len,audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*0.25;
    return buf;
  })();
  function hat(t){
    const src = audioCtx.createBufferSource(); src.buffer = noiseBuf;
    const hp = audioCtx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=4000;
    const g  = audioCtx.createGain(); g.gain.setValueAtTime(0.08,t);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.07);
    src.connect(hp); hp.connect(g); g.connect(musicGain);
    src.start(t);
  }
  for(let i=0;i<32;i++){             // 32 bars loop “mental”
    const tt=t0+i*bar;
    hat(tt); hat(tt+bar/2);          // nhịp 2 & 4 rất khẽ
  }

  // === Layer 2 (lead hiền) — chỉ bật khi FEVER ===
  const lead = audioCtx.createOscillator(); lead.type="triangle"; lead.frequency.value=392; // G4
  const leadLP = audioCtx.createBiquadFilter(); leadLP.type="lowpass"; leadLP.frequency.value=1200;
  const l2gain = audioCtx.createGain(); l2gain.gain.value=0.0; // off mặc định
  lead.connect(leadLP); leadLP.connect(l2gain); l2gain.connect(musicGain);
  lead.start(t0+.1);
  startMusicLoop.l2 = l2gain;
}

  function setFeverMusic(on){
    if(!startMusicLoop.l2) return;
    const g=startMusicLoop.l2.gain;
    g.cancelScheduledValues(0);
    g.linearRampToValueAtTime(on?0.35:0.0, (audioCtx?.currentTime||0)+.15);
  }
  function beep(freq=600,dur=.05,type="triangle"){
    if(!audioReady||muteToggle?.checked) return;
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type; o.frequency.value=freq; o.connect(g); g.connect(sfxGain||audioCtx.destination);
    g.gain.value=.15; o.start(); setTimeout(()=>o.stop(),dur*1000);
  }

  /* ---------- RNG / seed ---------- */
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296}}
  const todayStr=new Date().toISOString().slice(0,10).replace(/-/g,"");
  let rnd=mulberry32(parseInt(todayStr,10));
  dailySeedEl && (dailySeedEl.textContent=todayStr);
  const rand=(a,b)=>rnd()*(b-a)+a, chance=p=>rnd()<p;

  /* ---------- State ---------- */
  const state = {
    running:false, lastTime:0,
    lives:CONFIG.START_LIVES_DEFAULT, time:CONFIG.START_TIME,
    score:0, best:Number(localStorage.getItem("mecha_best")||0), last:0,
    level:1, levelTimer:0, difficulty:diffSel?.value || "normal",
    combo:0, comboTimer:0, comboMul:1.0,
    fever:0, feverTime:0, feverJustStarted:false,
    dots:[], particles:[], rings:[], ripples:[],
    hitstop:0, shakeTime:0, shakeX:0, shakeY:0, freezeTime:0,
    boss30:false, boss60:false,
    runMods:[]
  };

  /* ---------- Hearts ---------- */
  const heartSVG=(filled=true)=>`<svg viewBox="0 0 24 24"><path d="M12 21s-6.7-4.35-9.17-7.5C.64 10.05 2.2 6 6 6c2 0 3.2 1 4 2 0 0 1-2 4-2 3.8 0 5.36 4.05 3.17 7.5C18.7 16.65 12 21 12 21z" fill="${filled?"#ff6b81":"#394055"}"/></svg>`;
  function updateHearts(){
    if(!heartsWrap) return;
    heartsWrap.innerHTML="";
    for(let i=0;i<Math.max(state.lives,0);i++){
      const d=document.createElement("div");
      d.className="heart "+(i<state.lives?"filled":"empty");
      d.innerHTML=heartSVG(i<state.lives);
      heartsWrap.appendChild(d);
    }
  }
  function heartsLoseAnim(){
    updateHearts();
    const hs=heartsWrap?.querySelectorAll(".heart"); const idx=state.lives;
    if(hs && hs[idx]){ hs[idx].style.transform="scale(0.6)"; setTimeout(()=>hs[idx].style.transform="scale(1)",180); }
  }
  updateHearts();

  /* ---------- Leaderboard + badges + filters ---------- */
  const LB_KEY="mecha_leader", NAME_KEY="mecha_name";
  const loadLB=()=>{try{return JSON.parse(localStorage.getItem(LB_KEY)||"[]");}catch(_){return[];}};
  const saveLB=list=>localStorage.setItem(LB_KEY,JSON.stringify(list.slice(0,10)));
  function badgeRow(mods){ return (!mods||!mods.length) ? "" : `<span class="badges">${mods.map(m=>`<span class="badge">${m}</span>`).join(" ")}</span>`; }
  function renderLB(){
    const list=loadLB();
    const fd = lbFilterDiff?.value||"", fs = (lbFilterSeed?.value||"").trim();
    const filtered = list.filter(r => (!fd || r.diff===fd) && (!fs || r.seed===fs));
    lbEl.innerHTML = (filtered.slice(0,10).map((r,i)=>`
      <li>#${i+1} – ${r.s} (${r.diff}) · ${r.name||"AAA"} · ${r.d}
        ${badgeRow(r.badges)}
      </li>`).join("")) || "<li>—</li>";
    const best = list.length ? list[0].s : 0;
    rHigh.textContent = Math.max(state.best, best);
  }
  function pushLB(score,name){
    const row={ s:score, name:(name||"AAA").slice(0,12),
      d:new Date().toISOString().slice(0,10), diff:state.difficulty,
      seed:todayStr, badges:state.runMods.slice(0,6) };
    const list=loadLB(); list.push(row); list.sort((a,b)=>b.s-a.s); saveLB(list); renderLB();
  }
  lbFilterDiff?.addEventListener("change", renderLB);
  lbFilterSeed?.addEventListener("input", renderLB);
  renderLB();

  /* ---------- Color-blind toggle ---------- */
  const html = document.documentElement;
  cbToggle?.addEventListener("change",()=>html.classList.toggle("cb",cbToggle.checked));
  const currentColors = ()=> (cbToggle?.checked ? CB_COLORS : BASE_COLORS);

  /* ---------- Reticle ---------- */
  let showReticle = true;
  let mouse = { x: LOGICAL_W/2, y: LOGICAL_H/2, visible:false };
  if (showReticle) canvas.classList.add("cursor-none");

  /* ---------- Pointer ---------- */
  canvas.style.touchAction="none";
  function toCanvasCoords(e){
    const rect=canvas.getBoundingClientRect();
    return { x:(e.clientX-rect.left-border.l)/scale, y:(e.clientY-rect.top-border.t)/scale };
  }
  canvas.addEventListener("pointerdown",(e)=>{
    const {x:mx,y:my}=toCanvasCoords(e);
    mouse.x=mx; mouse.y=my; mouse.visible=true;
    if(!state.running){ spawnMissRipple(mx,my); return; }
    const x=mx-(state.shakeX||0), y=my-(state.shakeY||0);
    for(let i=state.dots.length-1;i>=0;i--){
      const d=state.dots[i], dx=x-d.x, dy=y-d.y;
      if(dx*dx+dy*dy<=d.r*d.r){ onDotHit(i,x,y); return; }
    }
    spawnMissRipple(mx,my);
  },{passive:true});
  canvas.addEventListener("pointermove",(e)=>{ const p=toCanvasCoords(e); mouse.x=p.x; mouse.y=p.y; mouse.visible=true; },{passive:true});
  canvas.addEventListener("pointerleave",()=>{ mouse.visible=false; });

  /* ---------- Modifiers ---------- */
  function snapshotModifiers(){
    const mods=[];
    if (modSlowFall?.checked)  mods.push("SF");
    if (modBigDots?.checked)   mods.push("BD");
    if (modExtraLife?.checked) mods.push("+1");
    if (modTinyDots?.checked)  mods.push("TD");
    if (modNoFreeze?.checked)  mods.push("NF");
    if (modSuddenDeath?.checked) mods.push("SD");
    return mods;
  }
  function applyModifiersTo(diffBase){
    let base = {...diffBase};
    if (modSlowFall?.checked)  base.baseSpeed *= 0.8;
    if (modBigDots?.checked)   base.radius    *= 1.25;
    if (modTinyDots?.checked)  base.radius    *= 0.8;
    return base;
  }

  /* ---------- Spawner ---------- */
  const spawner = {
    t:0, budget:0, cooldown:0, grace:8,
    desired(){ const base=(applyModifiersTo(DIFF[state.difficulty])).spawn; return Math.min(CONFIG.MAX_CONCURRENT, base + Math.floor((state.level-1)/4)); },
    rate(){ const want=this.desired(); const feverBoost=state.feverTime>0?0.4:0.0; return (0.75 + 0.11*(state.level-1)) + feverBoost + (want-1)*0.1; },
    tick(dt){
      this.t+=dt; if(this.cooldown>0) this.cooldown-=dt; if(this.grace>0) this.grace=Math.max(0,this.grace-dt);
      this.budget += this.rate(dt) * dt;

      const want=this.desired();
      while(this.budget>=1 && state.dots.length<want){ spawnDot(); this.budget-=1; }

      // Pattern injection
      const inFever = state.feverTime>0;
      if(this.grace===0 && this.cooldown<=0){
        if(inFever){
          const r=Math.random();
          if(r<0.20) spawnFeverArc(); else if(r<0.40) spawnFeverZigzag(); else if(r<0.60) spawnFeverBurst();
          else if(r<0.80) spawnFormationCircleRotate(); else spawnFormationSpiral();
          this.cooldown = 2.4; this.budget = Math.max(0, this.budget - 1.2);
        }else{
          const r=Math.random();
          if(r<0.25) spawnFormationLine((4+(Math.random()*1.5))|0);
          else if(r<0.5) spawnFormationRainDiagonal();
          else if(r<0.75) spawnFormationMultiV();
          else spawnFormationCircleRotate();
          this.cooldown = 3.2; this.budget = Math.max(0, this.budget - 2);
        }
      }
    }
  };

  /* ---------- Entities & formations ---------- */
  function spawnDot(opts={}){
    const diff=applyModifiersTo(DIFF[state.difficulty]);
    const baseR=diff.radius*(1-Math.min(0.6,(state.level-1)*0.04));
    const r=opts.r||rand(baseR*0.9,baseR*1.1);
    const speed=(opts.speed||diff.baseSpeed*(1+(state.level-1)*0.05))*(state.feverTime>0?1.2:1);
    const x=opts.x||rand(r+10,LOGICAL_W-r-10);
    const y=(opts.y==null)?-r:opts.y;
    const pal=opts.power?POWER_COLORS:currentColors();
    const col=pal[Math.floor(rand(0,pal.length))];
    state.dots.push({x,y,r,color:col.hex,weight:col.weight||1,
      type:opts.type||"dot",speed,hp:opts.hp||0, vx:opts.vx||0, maxhp:opts.maxhp});
  }
  function spawnFormationLine(n=5){
    const margin=24, totalW=LOGICAL_W-2*margin;
    for(let i=0;i<n;i++){ const x=margin + totalW*(i+0.5)/n; spawnDot({x, y:-30, r:22}); }
    flashBanner("WAVE");
  }
  // Circle rotate
  function spawnFormationCircleRotate(){
    const cx=LOGICAL_W/2, cy=-40, R=120, n=10, ang0=rand(0,Math.PI*2);
    for(let i=0;i<n;i++){
      const a=ang0 + i*(2*Math.PI/n);
      const x=cx + Math.cos(a)*R;
      const y=cy + Math.sin(a)*R*0.4 - i*8;
      spawnDot({x,y,r:20, vx: Math.cos(a+Math.PI/2)*30});
    }
    flashBanner("CIRCLE");
  }
  // Spiral
  function spawnFormationSpiral(){
    const cx=LOGICAL_W/2, turns=1.5, n=14;
    for(let i=0;i<n;i++){
      const t=i/n, a=t*turns*2*Math.PI, R=30+ t*180;
      const x=cx + Math.cos(a)*R;
      const y=-60 - i*18;
      spawnDot({x,y,r:18});
    }
    flashBanner("SPIRAL");
  }
  // Rain diagonal
  function spawnFormationRainDiagonal(){
    const cols=6, step=LOGICAL_W/(cols+1), dir=Math.random()<.5?1:-1;
    for(let i=0;i<cols;i++){
      const x = dir>0? (i+1)*step : (LOGICAL_W - (i+1)*step);
      spawnDot({x, y:-80 - i*18, r:20, vx: dir*40});
    }
    flashBanner("RAIN");
  }
  // Multi-tier V
  function spawnFormationMultiV(){
    const cx=LOGICAL_W/2, tiers=3, gap=46;
    for(let t=0;t<tiers;t++){
      const off= (t+1);
      spawnDot({x:cx-gap*off, y:-40 - t*22, r:20});
      spawnDot({x:cx+gap*off, y:-40 - t*22, r:20});
    }
    flashBanner("V");
  }

  // Fever patterns
  function spawnFeverArc(){ const cx=LOGICAL_W/2, R=LOGICAL_W*0.38, n=8; for(let i=0;i<n;i++){ const a=(-Math.PI/3) + (i/(n-1))*(2*Math.PI/3); const x=cx + R*Math.cos(a); const y=-40 + 60*i/n; spawnDot({x,y,r:20}); } }
  function spawnFeverZigzag(){ const cols=5, step=LOGICAL_W/(cols+1); let dir=1, y=-20; for(let row=0;row<3;row++){ for(let c=1;c<=cols;c++){ const x=(dir>0)? c*step : (LOGICAL_W - c*step); spawnDot({x, y:y-row*24, r:20}); } dir*=-1; y-=24; } }
  function spawnFeverBurst(){ const n=10; for(let i=0;i<n;i++) spawnDot({x:rand(40,LOGICAL_W-40), y:rand(-80,-10), r:20}); }

  function flashBanner(txt){ banner.textContent=txt; banner.classList.remove("hidden"); setTimeout(()=>banner.classList.add("hidden"),900); }

  /* ---------- FX ---------- */
  function spawnParticles(x,y,color){
    for(let i=0;i<CONFIG.PARTICLES;i++){
      const glow = i%2===0;
      state.particles.push({x,y,vx:rand(-140,140),vy:rand(-220,-20),life:rand(.28,.6),t:0,color, glow});
    }
  }
  function spawnPerfectRing(x,y,c){ state.rings.push({x,y,t:0,life:.45,color:c, big:true}); }
  function spawnGreatRing(x,y,c){ state.rings.push({x,y,t:0,life:.35,color:c, big:false}); }
  function spawnMissRipple(x,y){ state.ripples.push({x,y,t:0,life:.35}); }

  /* ---------- Score & HUD ---------- */
  function addScore(base,weight,tier){
    const tierMul = tier==="perfect"?1.5 : tier==="great"?1.2 : 1.0;
    const feverMul= (state.feverTime>0)?1.5:1.0;
    state.score += Math.floor(base*weight*tierMul*state.comboMul*feverMul);
    scoreEl.textContent = state.score; scoreEl.classList.add("bump"); 
    setTimeout(()=>scoreEl.classList.remove("bump"),180);
  }
  function updateHUD(){
    timeEl.textContent = Math.ceil(Math.max(0,state.time));
    levelEl.textContent = state.level;
    comboEl.textContent = state.combo;
    comboMulEl.textContent = state.comboMul.toFixed(1);
    feverFill.style.width = (Math.max(0,Math.min(1,state.fever/100))*100).toFixed(1) + "%";
    livesEl && (livesEl.textContent = state.lives);
  }

  /* ---------- Controls ---------- */
  document.querySelectorAll(".collapseBtn")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id = btn.getAttribute("data-target"); const box = document.getElementById(id);
      box?.classList.toggle("collapsed");
    });
  });


  startBtn?.addEventListener("click", async()=>{ await initAudioIfNeeded(); await showCountdown(); primeSpawns(); start(); });
  pauseBtn?.addEventListener("click", ()=> state.running=false);
  resetBtn?.addEventListener("click", async()=>{ await initAudioIfNeeded(); resetGame(true); await showCountdown(); primeSpawns(); start(); });
  againBtn?.addEventListener("click", async()=>{ await initAudioIfNeeded(); resetGame(true); await showCountdown(); primeSpawns(); start(); });
  diffSel?.addEventListener("change",(e)=> state.difficulty = e.target.value);

  function resetGame(hard=false){
    state.running=false;
    state.time =CONFIG.START_TIME;

    // Số mạng theo độ khó (yêu cầu của bạn)
    state.lives = DIFF[state.difficulty]?.lives ?? CONFIG.START_LIVES_DEFAULT;

    if (hard){ state.score=0; setText("score","0"); }
    state.level=1; state.levelTimer=0;
    state.combo=0; state.comboTimer=0; state.comboMul=1.0;
    state.fever=0; state.feverTime=0; state.feverJustStarted=false;
    state.dots.length=0; state.particles.length=0; state.rings.length=0; state.ripples.length=0;
    state.hitstop=0; state.shakeTime=0; state.freezeTime=0;
    state.boss30=false; state.boss60=false;

    // Modifiers snapshot + áp dụng life mods
    state.runMods = snapshotModifiers();
    if (modExtraLife?.checked) state.lives++;
    if (modSuddenDeath?.checked) state.lives = 1;

    updateHearts();

    overlay?.classList.add("hidden");
    nameEntry?.classList.add("hidden");
    savedMsg?.classList.add("hidden");
    top10Msg && (top10Msg.textContent = "");
    saveNameBtn && (saveNameBtn.disabled=false);

    updateHUD(); resizeCanvas();
    spawner.t=0; spawner.budget=0; spawner.cooldown=0; spawner.grace=8;
  }

  function primeSpawns(){ for(let i=0;i<2;i++) spawnDot(); }

  async function showCountdown(){
    for(const n of ["3","2","1","GO!"]){
      banner.textContent=n; banner.classList.remove("hidden");
      if(n!=="GO!") beep(650,.05,"triangle");
      await new Promise(r=>setTimeout(r,n==="GO!"?480:700));
    }
    banner.classList.add("hidden");
  }
  function start(){ if(state.running) return; state.running=true; state.lastTime=performance.now(); requestAnimationFrame(loop); }

  /* ---------- Main loop ---------- */
  function loop(t){
    if(!state.running) return;
    const rawDt=(t-state.lastTime)/1000; state.lastTime=t;
    let dt=Math.min(.033,rawDt);

    if(state.hitstop>0){state.hitstop-=dt; dt=0;}
    if(state.freezeTime>0){state.freezeTime-=dt; dt*=.35;}

    // FEVER state
    if(state.feverTime>0){
      const before=state.feverTime; state.feverTime-=dt;
      if(before>0 && before===CONFIG.FEVER_TIME){ state.feverJustStarted=true; }
      if(state.feverJustStarted){ spawnFeverIntroBurst(); state.feverJustStarted=false; }
      if(state.feverTime<=0) state.fever=0;
    }
    document.body.classList.toggle("fever", state.feverTime>0);
    setFeverMusic(state.feverTime>0);

    // Time & Level
    state.time-=dt; if(state.time<=0){ endGame(); return; }
    state.levelTimer+=dt; if(state.levelTimer>12){ state.level++; state.levelTimer=0; }

    // Boss at 30s & 60s (tính theo thời gian đã trôi)
    const elapsed = CONFIG.START_TIME - state.time;
    if(!state.boss30 && elapsed>=30){ spawnBoss(1); state.boss30=true; }
    if(!state.boss60 && elapsed>=60){ spawnBoss(2); state.boss60=true; }

    // Spawner
    spawner.tick(dt);

    // Shake (đồng bộ grid CSS)
    if(state.shakeTime>0) state.shakeTime-=dt;
    state.shakeX=state.shakeTime>0?(Math.random()*10-5):0;
    state.shakeY=state.shakeTime>0?(Math.random()*10-5):0;
    const sb = document.querySelector(".stageBox");
    if (sb) sb.style.setProperty("--shake-x", state.shakeX.toFixed(1)+"px");

    // Draw
    ctx.save(); ctx.translate(state.shakeX,state.shakeY);
    ctx.clearRect(0,0,LOGICAL_W,LOGICAL_H);

    for(let i=state.dots.length-1;i>=0;i--){
      const d=state.dots[i];
      d.x += (d.vx||0)*dt;
      d.y += d.speed*dt;
      drawDot(d);

      // Kill rules (đáy hiển thị + fuse)
      const rect = canvas.getBoundingClientRect();
      const innerH = Math.min(rect.height - border.t - border.b, window.innerHeight - rect.top);
      const visY = visibleBottomY();
      const killY = Math.max(0, Math.min(LOGICAL_H - CONFIG.VISIBLE_SAFE_MARGIN, visY));
      const lead  = Math.max(6, Math.min(CONFIG.KILL_LEAD_MAX, d.speed * CONFIG.KILL_LEAD_FACTOR));
      const killLogic  = (d.y - d.r) >= (killY - lead);
      const yTopScreen = (d.y - d.r) * scale;
      const killScreen = yTopScreen >= (innerH - 1 - lead * scale);
      const remain  = (LOGICAL_H - (d.y - d.r));
      const tRemain = remain / Math.max(1, d.speed);
      const killTime= (tRemain <= CONFIG.KILL_TIME_FUSE);

      if (killLogic || killScreen || killTime) {
        state.dots.splice(i,1);
        if(d.type==="dot" || d.type==="boss"){
          state.lives=Math.max(0,state.lives-1); heartsLoseAnim(); beep(220,.06,"sawtooth");
          if(state.lives<=0){ ctx.restore(); endGame(); return; }
        }
      }
    }

    // Particles
    for(let i=state.particles.length-1;i>=0;i--){
      const p=state.particles[i]; p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt+200*dt;
      const life=1-p.t/p.life; ctx.globalAlpha=Math.max(0,life);
      if(p.glow){ ctx.shadowBlur=10; ctx.shadowColor=p.color; }
      ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,3,3);
      ctx.shadowBlur=0; ctx.globalAlpha=1;
      if(life<=0) state.particles.splice(i,1);
    }
    // Rings
    for(let i=state.rings.length-1;i>=0;i--){
      const r=state.rings[i]; r.t+=dt; const p=r.t/r.life; ctx.globalAlpha=1-p;
      const base = r.big? 8:4, maxR = r.big? 160:110;
      ctx.beginPath(); ctx.arc(r.x,r.y,base+maxR*p,0,Math.PI*2); ctx.strokeStyle=r.color; ctx.lineWidth=2; ctx.stroke();
      if(p>=1) state.rings.splice(i,1); ctx.globalAlpha=1;
    }
    // Ripples
    for(let i=state.ripples.length-1;i>=0;i--){
      const rp=state.ripples[i]; rp.t+=dt; const p=rp.t/rp.life; ctx.globalAlpha=1-p;
      ctx.beginPath(); ctx.arc(rp.x,rp.y,10+50*p,0,Math.PI*2); ctx.strokeStyle="rgba(255,255,255,.25)"; ctx.lineWidth=1; ctx.stroke();
      if(p>=1) state.ripples.splice(i,1); ctx.globalAlpha=1;
    }

    // Reticle
    drawReticle();
    if(debug){ ctx.save(); ctx.fillStyle="rgba(255,255,255,.85)"; ctx.font="14px ui-sans-serif"; ctx.fillText(`visY=${visibleBottomY().toFixed(1)} scale=${scale.toFixed(2)}`, 8, 20); ctx.restore(); }
    ctx.restore();

    if(state.feverTime>0){
      ctx.save(); ctx.fillStyle="rgba(255,200,80,.06)";
      for(let y=0;y<LOGICAL_H;y+=4) ctx.fillRect(0,y,LOGICAL_W,2);
      ctx.restore();
    }

    if(state.combo>0){ state.comboTimer-=dt; if(state.comboTimer<=0){ state.combo=0; state.comboMul=1.0; } }
    updateHUD();
    requestAnimationFrame(loop);
  }

  function drawDot(d){
    // shadow
    ctx.save(); ctx.globalAlpha=.25;
    ctx.beginPath(); ctx.ellipse(d.x,d.y-d.r*.5,d.r*.25,d.r*.5,0,0,Math.PI*2); ctx.fillStyle=d.color; ctx.fill();
    ctx.restore();

    // fill
    const grd=ctx.createRadialGradient(d.x,d.y,d.r*.25,d.x,d.y,d.r);
    grd.addColorStop(0,d.color); grd.addColorStop(1,"#000");
    ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fillStyle=grd; ctx.fill();

    // outline
    ctx.lineWidth=2;
    if (state.feverTime>0) {
      ctx.strokeStyle="rgba(69,215,255,.95)";
      ctx.shadowBlur=10; ctx.shadowColor="rgba(69,215,255,.9)";
    } else {
      ctx.strokeStyle="rgba(255,255,255,.5)";
      ctx.shadowBlur=0;
    }
    ctx.stroke(); ctx.shadowBlur=0;

    // color-blind dash
    if(cbToggle?.checked){
      ctx.save();
      ctx.setLineDash(d.weight===3?[0]: d.weight===2?[4,3]: [1,2]);
      ctx.strokeStyle="#fff6"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r+2,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // boss HP ring
    if(d.type==="boss" && d.hp>1){
      const pct = Math.max(0, Math.min(1, d.hp/d.maxhp));
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r+6,-Math.PI/2,-Math.PI/2 + pct*2*Math.PI);
      ctx.strokeStyle="#ffd166"; ctx.lineWidth=3; ctx.stroke();
    }
  }

  function drawReticle(){
    const x=mouse.x, y=mouse.y;
    if(!showReticle || !mouse.visible) return;
    ctx.save();
    const time = performance.now()/1000;
    const inFever = state.feverTime>0;
    const spin = inFever ? time*2.2 : time*1.2;
    const outerR = 16, crossLen = 12, gap = 6;

    ctx.lineWidth = 2;
    ctx.strokeStyle = inFever ? "rgba(255,210,90,.95)" : "rgba(255,255,255,.85)";
    ctx.beginPath(); ctx.arc(x,y,outerR,0,Math.PI*2); ctx.stroke();

    ctx.save(); ctx.translate(x,y); ctx.rotate(spin);
    ctx.strokeStyle = inFever ? "rgba(255,220,120,.9)" : "rgba(69,215,255,.95)";
    ctx.lineWidth = 2;
    for(let i=0;i<4;i++){ ctx.rotate(Math.PI/2); ctx.beginPath(); ctx.moveTo(outerR+2,0); ctx.lineTo(outerR+8,0); ctx.stroke(); }
    ctx.restore();

    ctx.strokeStyle = inFever ? "rgba(255,210,90,.9)" : "rgba(69,215,255,.95)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x-(gap+crossLen),y); ctx.lineTo(x-gap,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+gap,y); ctx.lineTo(x+(gap+crossLen),y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-(gap+crossLen)); ctx.lineTo(x,y-gap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y+gap); ctx.lineTo(x,y+(gap+crossLen),y); ctx.stroke();

    ctx.fillStyle = inFever ? "#ffd166" : "#45d7ff";
    ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  /* ---------- Boss ---------- */
  function spawnBoss(stage){
    const diff=applyModifiersTo(DIFF[state.difficulty]);
    const r = Math.max(26, diff.radius * (stage===1? 1.6:2.0));
    const hp = stage===1? 5 : 9;
    const color = stage===1? "#ff4d8d" : "#9d4dff";
    const x = LOGICAL_W/2, y=-r-10, speed = diff.baseSpeed*(stage===1?0.8:0.9);
    state.dots.push({x,y,r,color,weight:3,type:"boss",speed,hp,maxhp:hp});
    flashBanner("BOSS DOT");
  }

  /* ---------- Hit logic ---------- */
  function onDotHit(index,mx,my){
    const d=state.dots[index];

    if(d.type!=="dot" && d.type!=="boss"){
      state.dots.splice(index,1);
      if(d.type==="freeze"){
        if(!modNoFreeze?.checked){ state.freezeTime=3.5; flashBanner("FREEZE"); }
      } else if(d.type==="time"){
        state.time+=5; flashBanner("+5s");
      } else if(d.type==="bomb"){
        flashBanner("BOMB!");
        for(let i=state.dots.length-1;i>=0;i--){
          const o=state.dots[i];
          if(o.type==="dot"){
            addScore(10,o.weight,"good"); spawnParticles(o.x,o.y,o.color); state.dots.splice(i,1);
          }
        }
      }
      spawnParticles(d.x,d.y,d.color); beep(900,.05,"square"); return;
    }

    if(d.type==="boss"){
      d.hp--; spawnParticles(d.x,d.y,d.color); beep(820,.04,"triangle");
      if(d.hp<=0){
        state.dots.splice(index,1);
        // nổ ra power-ups
        const power = ["freeze","time","bomb"];
        for(let i=0;i<6;i++){
          const t = power[i%power.length];
          spawnDot({x:d.x+rand(-48,48), y:d.y+rand(-48,48), r:18, power:true, type:t, speed:180});
        }
        addScore(50,3,"perfect"); spawnPerfectRing(d.x,d.y,"#ffd166"); state.shakeTime=.25;
      }
      return;
    }

    // thường
    state.dots.splice(index,1);
    const ratio = Math.hypot(mx-d.x,my-d.y)/d.r;
    let tier="good"; if(ratio<=.3) tier="perfect"; else if(ratio<=.6) tier="great";

    addScore(10,d.weight,tier);
    state.combo++; state.comboTimer=1.5; state.comboMul=Math.min(2.0,1+state.combo*0.1);
    if(tier==="perfect") spawnPerfectRing(d.x,d.y,d.color); else if(tier==="great") spawnGreatRing(d.x,d.y,d.color);
    comboEl?.classList.add("bump"); setTimeout(()=>comboEl?.classList.remove("bump"),180);

    state.fever=Math.min(100,state.fever+(tier==="perfect"?14:tier==="great"?8:4));
    if(state.fever>=100 && state.feverTime<=0){
      state.feverTime=CONFIG.FEVER_TIME; state.feverJustStarted=true;
      flashBanner("FEVER!"); beep(1200,.08,"sine");
    }

    state.hitstop=CONFIG.HITSTOP; state.shakeTime=.1;
    beep(tier==="perfect"?1000:tier==="great"?800:650,.05,"triangle");
    if(navigator.vibrate){ if(tier==="perfect") navigator.vibrate([15,30,15]); else if(tier==="great") navigator.vibrate([10]); }
  }

  /* ---------- Game over + Save Top10 ---------- */
  let savedThisGame=false;
  function endGame(){
    state.running=false;
    state.last = state.score;
    rLast.textContent = state.last;
    overlay.classList.remove("hidden");

    const list=loadLB();
    const top10 = (list.length<10 || state.score>list[list.length-1].s);
    const best  = (list[0]?.s)||0;
    rHigh.textContent = Math.max(state.best,best);

    if (top10) {
      const lang = localStorage.getItem("mecha_lang") || "en";
      const t = (I18N[lang]||I18N.en);
      top10Msg.textContent = t.top10;
      nameEntry?.classList.remove("hidden");
      playerName.value = localStorage.getItem(NAME_KEY) || "AAA";
      savedThisGame=false; savedMsg?.classList.add("hidden"); saveNameBtn.disabled=false;
      saveNameBtn.onclick = () => {
        if (savedThisGame) return;
        savedThisGame = true;
        const name = (playerName.value||"AAA").trim().slice(0,12) || "AAA";
        localStorage.setItem(NAME_KEY, name);
        pushLB(state.score, name);
        saveNameBtn.disabled = true;
        savedMsg?.classList.remove("hidden");
      };
    } else {
      top10Msg.textContent = "";
      nameEntry?.classList.add("hidden");
    }
  }

  /* ---------- FEVER intro mini patterns ---------- */
  function freeSlots(){ return Math.max(0, CONFIG.MAX_CONCURRENT - state.dots.length); }
  function spawnFeverV(count=4){ let n=Math.min(count, freeSlots()); if(n<=0) return; const cx=LOGICAL_W/2, gap=42, baseY=-30, xs=[-1.5,-0.5,0.5,1.5]; for(let i=0;i<n;i++){ const x=cx+xs[i]*gap; spawnDot({x,y:baseY,r:20}); } }
  function spawnFeverZigzagSmall(count=4){ let n=Math.min(count, freeSlots()); if(n<=0) return; const left=80, right=LOGICAL_W-80, y0=-20, dy=18, xs=[left,right,left,right]; for(let i=0;i<n;i++) spawnDot({x:xs[i], y:y0 - i*dy, r:20}); }
  function spawnFeverArcSmall(count=4){ let n=Math.min(count, freeSlots()); if(n<=0) return; const cx=LOGICAL_W/2, R=120, angles=[-0.5,-0.17,0.17,0.5]; for(let i=0;i<n;i++){ const a=angles[i]; const x=cx+R*Math.cos(a); const y=-40+10*i; spawnDot({x,y,r:20}); } }
  function spawnFeverIntroBurst(){ const slots=freeSlots(); if(slots<=0) return; const n=Math.min(slots,4); const pick=Math.random(); if(pick<0.34) spawnFeverV(n); else if(pick<0.67) spawnFeverZigzagSmall(n); else spawnFeverArcSmall(n); }

  /* ---------- HUD init & shortcuts ---------- */
  updateHearts(); updateHUD();
  document.addEventListener("keydown",(e)=>{ if(e.key.toLowerCase()==="d") debug=!debug; });
}

