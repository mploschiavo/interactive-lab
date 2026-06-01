(function(){
const c=document.getElementById('game-canvas'); if(!c)return;
const x=c.getContext('2d');
let score=0, overflow=0, tasks=[], level=1;
const game='backlog';
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
let started=false, paused=false, lost=false;

function isLight(){const mode=document.documentElement.getAttribute('data-theme')||'system'; return mode==='light' || (mode==='system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);}
function set(v){score=v; scoreEl.textContent=String(score)}
function syncLevel(){
  const next=Math.max(1, Math.floor(score/(cfg.levelByScore || 240))+1);
  if(next>level){ level=next; levelUi.set(level); levelUi.up(level); feedback(`Level ${level}! Queue speed increased.`); }
}
function reset(){overflow=0;tasks=[];level=1;levelUi.set(level);set(0);paused=false;lost=false;status.textContent='Clear the incoming queue'; feedback('Sweep the queue with your pointer before overflow hits max.');}

function lose(){
  lost=true; paused=true;
  telemetry('game_over', { game, score, level });
  status.textContent='You lost.';
  feedback('Overflow hit the ceiling. Want to play again? Press Play Again.');
  redrawLB&&redrawLB();
}

function sweepAt(clientX, clientY){
  const r=c.getBoundingClientRect(), mx=(clientX-r.left)*(c.width/r.width), my=(clientY-r.top)*(c.height/r.height);
  tasks=tasks.filter(t=>{
    const hit=((t.x-mx)**2+(t.y-my)**2)<=((t.r+4)**2);
    if(hit){
      set(score+(cfg.scorePerTask || 8)); syncLevel();
      if(score>0 && score%80===0){ steam(mx,my); flash(); status.textContent='Queue streak!'; }
    }
    return !hit;
  });
}

c.addEventListener('pointermove',e=>{
  if(!started || paused || lost) return;
  sweepAt(e.clientX, e.clientY);
});
c.addEventListener('pointerdown',e=>{ if(started && !paused && !lost) sweepAt(e.clientX, e.clientY); });

window.addEventListener('kl-game-action', (event)=>{
  const action=event?.detail?.action;
  if(action==='start' && !started){ startBtn?.click(); return; }
  if(action==='sweep' && started && !paused && !lost){
    sweepAt(c.getBoundingClientRect().left + c.getBoundingClientRect().width/2, c.getBoundingClientRect().top + c.getBoundingClientRect().height*0.65);
  }
});

addEventListener('keydown', (e)=>{
  if(!started && e.key==='Enter'){
    e.preventDefault();
    startBtn?.click();
  }
}, { passive:false });

let acc=0;
function loop(t){
  if(!shouldFrame(t)){ requestAnimationFrame(loop); return; }
  const highContrast=document.documentElement.classList.contains('game-contrast-high');
  const light=isLight();
  const bubble=highContrast?'rgba(250,204,21,.88)':(light?'rgba(180,83,9,.55)':'rgba(245,158,11,.45)');
  const txt=highContrast?'#ffffff':(light?'#0f172a':'#f8fafc');
  x.clearRect(0,0,c.width,c.height);
  if(!paused && !lost){
    acc++;
    if(acc%Math.max(cfg.spawnFloor || 12,(cfg.spawnBase || 30)-((level-1)*(cfg.spawnPerLevel || 2)))===0) tasks.push({x:20+Math.random()*(c.width-40),y:c.height+10,r:10+Math.random()*12,v:(1+Math.random()*1.8)+(level*0.18)});
    tasks.forEach(t=>t.y-=t.v);
    if(!started && tasks.length){
      const target=tasks[Math.floor(Math.random()*tasks.length)];
      if(target){ set(score+4); tasks=tasks.filter((t)=>t!==target); }
    }
    tasks=tasks.filter(t=>{if(t.y<-20){overflow++; return false;} return true;});
  }
  tasks.forEach(t=>{x.beginPath(); x.fillStyle=bubble; x.arc(t.x,t.y,t.r,0,Math.PI*2); x.fill();});
  x.fillStyle=txt; x.font='14px sans-serif'; x.fillText(started?'Move pointer to clear tasks':'Preview running...', 12, 22);
  if(!lost) status.textContent=`Overflow ${overflow}`;
  if(overflow>=(cfg.overflowLimit || 8) && !lost){for(let i=0;i<6;i++)steam(220+Math.random()*180,130+Math.random()*120); flash(); lose();}
  requestAnimationFrame(loop);
}

window.addEventListener('kl-game-pause-toggle', ()=>{ if(!started || lost) return; paused=!paused; status.textContent = paused ? 'Paused' : 'Back in play'; });
window.addEventListener('kl-game-quit', ()=>{ if(!started) return; lose(); });
window.addEventListener('kl-game-replay', ()=>{ started=true; startOverlay?.classList.add('hidden'); reset(); telemetry('game_start', { game, mode:'replay' }); });

startBtn?.addEventListener('click',()=>{started=true;startOverlay?.classList.add('hidden');status.textContent='Game started — drag, tap, or use Sweep button'; reset(); telemetry('game_start', { game, mode:'start' });});
reset(); loop();
})();
