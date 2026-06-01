(function(){
const c=document.getElementById('game-canvas'); if(!c)return;
const x=c.getContext('2d');
let score=0, alive=true, vy=0, paused=false, lost=false, level=1;
const ground=Math.max(250, c.height-60);
let obs=[];
const p={x:84,y:ground,w:22,h:34};
const game='steamrunner';
document.body.dataset.game=game;
const status=document.getElementById('game-status');
const scoreEl=document.getElementById('game-score');
const redrawLB=window.KLGameCommon?.wire(game,()=>score);
const steam=window.KLGameCommon?.steam?.puff||(()=>{});
const flash=window.KLGameCommon?.ui?.flash||(()=>{});
const feedback=window.KLGameCommon?.ui?.feedback||(()=>{});
const levelUi=window.KLGameCommon?.level || { set:()=>{}, up:()=>{} };
const telemetry=window.KLGameCommon?.telemetry?.track || (()=>{});
const cfg=window.KLGameCommon?.balance?.get(game) || {};
const shouldFrame=window.KLGameCommon?.performance?.makeFramePacer?.() || (()=>true);
const startBtn=document.getElementById('game-start-btn');
const startOverlay=document.getElementById('game-start-overlay');
let started=false;

function isLight(){const mode=document.documentElement.getAttribute('data-theme')||'system'; return mode==='light' || (mode==='system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);}
function set(v){score=v; scoreEl.textContent=String(score)}
function syncLevel(){
  const next=Math.max(1, Math.floor(score/(cfg.levelByScore || 260))+1);
  if(next>level){ level=next; levelUi.set(level); levelUi.up(level); feedback(`Level ${level}! Obstacle tempo increased.`); }
}
function jump(){if(p.y>=ground-0.1&&alive&&!paused){vy=-11; steam(p.x+40,p.y-20);}}
addEventListener('keydown',e=>{if(started && e.code==='Space'){e.preventDefault(); jump();} if(!started && e.key==='Enter'){e.preventDefault(); startBtn?.click();}}, {passive:false});
c.addEventListener('pointerdown',()=>{ if(started) jump(); });
window.addEventListener('kl-game-action', (event)=>{
  const action=event?.detail?.action;
  if(action==='start' && !started){ startBtn?.click(); return; }
  if(action==='jump' || action==='up' || action==='tap') jump();
});
function reset(){alive=true;vy=0;obs=[];p.y=ground;set(0);level=1;levelUi.set(level);paused=false;lost=false;status.textContent='Tap, Jump button, or Space to jump'; feedback('Chain jumps to survive longer. Hot streaks trigger flashes.');}
let acc=0;
function previewAutoJump(){ if(started || !alive || paused) return; const next=obs[0]; if(next && next.x < p.x + 110 && p.y>=ground-0.1) jump(); }

function lose(){
  alive=false; lost=true; paused=true;
  telemetry('game_over', { game, score, level });
  status.textContent='You lost.';
  feedback('Crash detected. Want to play again? Press Play Again.');
  redrawLB&&redrawLB();
}

function loop(t){
  if(!shouldFrame(t)){ requestAnimationFrame(loop); return; }
  const highContrast=document.documentElement.classList.contains('game-contrast-high');
  const light=isLight();
  const player=highContrast?'#ffffff':(light?'#0f172a':'#ffffff');
  const obstacle=highContrast?'#facc15':(light?'#b45309':'#d08c55');
  const groundLine=highContrast?'rgba(250,204,21,.85)':(light?'rgba(15,23,42,.35)':'rgba(255,255,255,.25)');
  x.clearRect(0,0,c.width,c.height);
  x.strokeStyle=groundLine; x.beginPath(); x.moveTo(0,ground+1); x.lineTo(c.width,ground+1); x.stroke();
  if(alive && !paused){
    acc++; if(acc%(started?Math.max(cfg.spawnFloor || 26,(cfg.spawnBase || 52)-((level-1)*(cfg.spawnPerLevel || 2))):62)===0)obs.push({x:c.width+10,w:14+Math.random()*20,h:18+Math.random()*34});
    const speedBoost=(level-1)*(cfg.obstacleSpeedPerLevel || 0.22);
    obs.forEach(o=>o.x-=(started?(cfg.obstacleBaseSpeed || 3.6):(cfg.obstaclePreviewSpeed || 3.1))+speedBoost); obs=obs.filter(o=>o.x>-30);
    previewAutoJump();
    vy+=0.62; p.y=Math.min(ground,p.y+vy); set(score+1); syncLevel();
    if(score>0 && score%150===0) {status.textContent='Hot streak!'; feedback('Hot streak! You are cooking now.'); steam(280+Math.random()*60,130); flash();}
    for(const o of obs){ if(p.x<o.x+o.w && p.x+p.w>o.x && p.y-p.h<ground+o.h && p.y>ground-o.h){ for(let i=0;i<6;i++)steam(220+Math.random()*180,140+Math.random()*110); flash(); lose(); break; } }
  }
  x.fillStyle=player; x.fillRect(p.x,p.y-p.h,p.w,p.h); x.fillStyle=obstacle; obs.forEach(o=>x.fillRect(o.x,ground-o.h,o.w,o.h));
  requestAnimationFrame(loop);
}

window.addEventListener('kl-game-pause-toggle', ()=>{ if(!started || lost) return; paused=!paused; status.textContent = paused ? 'Paused' : 'Back in play'; });
window.addEventListener('kl-game-quit', ()=>{ if(!started) return; lose(); });
window.addEventListener('kl-game-replay', ()=>{ started=true; startOverlay?.classList.add('hidden'); reset(); telemetry('game_start', { game, mode:'replay' }); });

startBtn?.addEventListener('click',()=>{started=true;startOverlay?.classList.add('hidden');status.textContent='Game started — tap, Jump button, or Space'; reset(); telemetry('game_start', { game, mode:'start' });});
reset(); loop();
})();
