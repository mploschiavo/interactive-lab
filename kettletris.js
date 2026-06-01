(function(){
const c=document.getElementById('game-canvas'); if(!c)return;
const x=c.getContext('2d');
let score=0, level=1;
const game='kettletris';
document.body.dataset.game=game;
const status=document.getElementById('game-status');
const scoreEl=document.getElementById('game-score');
const redrawLB=window.KLGameCommon?.wire(game,()=>score);
const steam=window.KLGameCommon?.steam?.puff || (()=>{});
const beep=window.KLGameCommon?.sound?.beep || (()=>{});
const flash=window.KLGameCommon?.ui?.flash || (()=>{});
const feedback=window.KLGameCommon?.ui?.feedback || (()=>{});
const levelUi=window.KLGameCommon?.level || { set:()=>{}, up:()=>{} };
const telemetry=window.KLGameCommon?.telemetry?.track || (()=>{});
const cfg=window.KLGameCommon?.balance?.get(game) || {};
const shouldFrame=window.KLGameCommon?.performance?.makeFramePacer?.() || (()=>true);
const startBtn=document.getElementById('game-start-btn');
const startOverlay=document.getElementById('game-start-overlay');
let started=false, paused=false, lost=false;

const W=10,H=14;
const board=Array.from({length:H},()=>Array(W).fill(0));
const shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
const shapeColors=['#22d3ee','#f97316','#a78bfa','#34d399','#fb7185','#facc15','#60a5fa'];
let piece=null,last=0;

function boardMetrics(){
  const maxW = c.width - 96;
  const maxH = c.height - 84;
  const cell = Math.max(20, Math.floor(Math.min(maxW / W, maxH / H)));
  const boardW = W * cell;
  const boardH = H * cell;
  return { cell, ox: Math.max(20, Math.floor((c.width - boardW) / 2)), oy: Math.max(16, Math.floor((c.height - boardH) / 2)) };
}
function isLight(){const mode=document.documentElement.getAttribute('data-theme')||'system';return mode==='light'||(mode==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);}
function palette(){
  const highContrast=document.documentElement.classList.contains('game-contrast-high');
  if(highContrast){ return { grid:'rgba(255,255,255,.95)', fixed:'#f8fafc', piece:'#0f172a', glow:'rgba(250,204,21,.92)' }; }
  return isLight()?{grid:'rgba(15,23,42,.2)',fixed:'#8b5cf6',piece:'#0f172a',glow:'rgba(59,130,246,.35)'}:{grid:'rgba(255,255,255,.12)',fixed:'#d08c55',piece:'#f8fafc',glow:'rgba(255,255,255,.35)'};
}
function set(v){score=v;scoreEl.textContent=String(score)}
function maybeLevelUp(){
  const next=Math.max(1, Math.floor(score/(cfg.levelByScore || 300))+1);
  if(next>level){ level=next; levelUi.set(level); levelUi.up(level); feedback(`Level ${level}! Drop speed increased.`); }
}
function rotate(m){return m[0].map((_,i)=>m.map(r=>r[i]).reverse());}
function spawn(){const idx=Math.floor(Math.random()*shapes.length); const m=JSON.parse(JSON.stringify(shapes[idx]));piece={x:Math.floor((W-m[0].length)/2),y:0,m,color:shapeColors[idx%shapeColors.length]};}
function coll(dx,dy,m=piece.m){for(let y=0;y<m.length;y++)for(let xx=0;xx<m[0].length;xx++)if(m[y][xx]){const nx=piece.x+xx+dx,ny=piece.y+y+dy;if(nx<0||nx>=W||ny>=H||(ny>=0&&board[ny][nx]))return true;}return false;}

function handleLoss(){
  lost=true;
  paused=true;
  telemetry('game_over', { game, score, level });
  status.textContent='Oops, you lost. The kettle boiled over.';
  feedback('Pressure dropped. Time for another steam-powered comeback.');
  redrawLB&&redrawLB();
}

function lock(){
  for(let y=0;y<piece.m.length;y++)for(let xx=0;xx<piece.m[0].length;xx++)if(piece.m[y][xx]){const ny=piece.y+y;if(ny>=0)board[ny][piece.x+xx]=1;}
  let clears=0;
  for(let y=H-1;y>=0;y--){if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(W).fill(0));clears++;y++;}}
  if(clears){
    set(score+clears*(cfg.scorePerLine || 75));maybeLevelUp();beep('lock');
    const burst = clears>=4 ? 9 : Math.min(5,clears+2);
    for(let i=0;i<burst;i++)steam(220+Math.random()*280,130+Math.random()*260);
    flash();
    status.textContent=clears>=4?'TETRIS! Massive clear.':`${clears} line${clears>1?'s':''} cleared`;
  }
  spawn();
  if(coll(0,0)){ handleLoss(); }
}

function move(dx,dy){if(!coll(dx,dy)){piece.x+=dx;piece.y+=dy;}else if(dy>0){lock();}}

function handleAction(action){
  if(!piece) return;
  if((!started || paused) && action!=='start') return;
  if(action==='left') move(-1,0);
  if(action==='right') move(1,0);
  if(action==='down') move(0,1);
  if(action==='rotate' || action==='up'){
    const rm=rotate(piece.m);
    if(!coll(0,0,rm)){piece.m=rm;beep('rotate');}
  }
  if(action==='drop'){
    while(!coll(0,1)) piece.y+=1;
    lock();
  }
}

addEventListener('keydown',e=>{
  if(!piece) return;
  if((!started || paused) && !['Enter','r','R'].includes(e.key)) return;
  if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key)) e.preventDefault();
  if(e.key==='ArrowLeft')handleAction('left');
  if(e.key==='ArrowRight')handleAction('right');
  if(e.key==='ArrowDown')handleAction('down');
  if(e.key==='ArrowUp')handleAction('rotate');
  if(e.key===' ')handleAction('drop');
  if(e.key==='Enter' && !started){ startBtn?.click(); }
}, { passive:false });

window.addEventListener('kl-game-action', (event)=>{
  const action=event?.detail?.action;
  if(action==='start' && !started){ startBtn?.click(); return; }
  handleAction(action);
});

function reset(){
  paused=false; lost=false;
  status.textContent='Move with arrows or touch controls · P pauses';
  feedback('Line up clears. Big clears trigger bonus flash.');
  level=1; levelUi.set(level); set(0); board.forEach(r=>r.fill(0)); spawn();
}

function previewMove(){
  if(started || !piece || paused) return;
  const r=Math.random();
  if(r<.3 && !coll(-1,0)) piece.x-=1;
  else if(r<.6 && !coll(1,0)) piece.x+=1;
  else if(r<.75){ const rm=rotate(piece.m); if(!coll(0,0,rm)) piece.m=rm; }
}

window.addEventListener('kl-game-pause-toggle', ()=>{
  if(!started || lost) return;
  paused=!paused;
  status.textContent = paused ? 'Paused' : 'Back in play';
});
window.addEventListener('kl-game-quit', ()=>{ if(!started) return; paused=true; handleLoss(); });
window.addEventListener('kl-game-replay', ()=>{ started=true; startOverlay?.classList.add('hidden'); reset(); telemetry('game_start', { game, mode:'replay' }); });

function draw(t){
  if(!shouldFrame(t)){ requestAnimationFrame(draw); return; }
  const drop=Math.max(cfg.dropFloor || 120, (cfg.dropBase || 360) - ((level-1)*(cfg.dropPerLevel || 24)));
  if(t&&t-last>(started?drop:320)){last=t; if(!paused){previewMove();move(0,1);}}
  const col=palette(); const {ox,oy,cell}=boardMetrics();
  x.clearRect(0,0,c.width,c.height);
  for(let i=0;i<W;i++)for(let j=0;j<H;j++){
    x.strokeStyle=col.grid;x.strokeRect(ox+i*cell,oy+j*cell,cell-2,cell-2);
    if(board[j][i]){x.fillStyle=col.fixed;x.fillRect(ox+i*cell,oy+j*cell,cell-2,cell-2);}
  }
  if(piece){
    for(let y=0;y<piece.m.length;y++)for(let xx=0;xx<piece.m[0].length;xx++)if(piece.m[y][xx]){
      x.fillStyle=piece.color||col.piece;x.fillRect(ox+(piece.x+xx)*cell,oy+(piece.y+y)*cell,cell-2,cell-2);
      x.fillStyle=col.glow;x.fillRect(ox+(piece.x+xx)*cell+2,oy+(piece.y+y)*cell+2,Math.max(6,Math.floor(cell*0.2)),Math.max(6,Math.floor(cell*0.2)));
    }
  }
  requestAnimationFrame(draw);
}

startBtn?.addEventListener('click',()=>{started=true;paused=false;startOverlay?.classList.add('hidden');status.textContent='Game started — keyboard enabled'; reset(); telemetry('game_start', { game, mode:'start' });});
reset();draw();
})();
