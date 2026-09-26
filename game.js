const socket=io();
const $=id=>document.getElementById(id);
const lobby=$("lobby"), room=$("room"), canvas=$("game"), ctx=canvas.getContext("2d"), hud=$("hud"), touch=$("touch");
let state=null, myId=null, mode="racing", players={}, entities={}, local={x:0,y:0,vx:0,vy:0,angle:0,hp:100,boost:100,lap:0,progress:0,cool:0};
let keys={}, last=performance.now(), raceFinished=false, world={w:2200,h:1200};

socket.on("connect",()=>{myId=socket.id;$("conn").textContent="● ONLINE";});
socket.on("errorMsg",m=>{ $("joinmsg").textContent=m; toast(m);});
socket.on("state",s=>{state=s;mode=s.mode;$("roomCode").textContent=s.code;room.classList.remove("hidden");$("roomCode").scrollIntoView({block:"center"});renderPlayers();});
socket.on("gameStart",d=>{mode=d.mode; players={}; d.players.forEach((p,i)=>players[p.id]={...p,x:0,y:0,hp:100,angle:0,progress:0,lap:0,cool:0,boost:100}); startGame();});
socket.on("playerInput",d=>{if(players[d.id]) players[d.id].input=d.input;});
socket.on("gameEvent",d=>{if(d.type==="hit"&&players[d.id]){players[d.id].hp=Math.max(0,players[d.id].hp-(d.damage||12));players[d.id].flash=15;}});
socket.on("scoreUpdate",d=>{if(players[d.id])players[d.id].score=d.score;});
$("create").onclick=()=>socket.emit("createRoom",{name:$("name").value});
$("join").onclick=()=>socket.emit("joinRoom",{name:$("name").value,code:$("code").value});
$("copy").onclick=()=>navigator.clipboard?.writeText(state.code).then(()=>toast("Room code copied!"));
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;socket.emit("setMode",mode);});
$("char").onchange=()=>socket.emit("setCharacter",$("char").value);
$("ready").onclick=()=>socket.emit("ready");
$("start").onclick=()=>socket.emit("startGame");
$("quit").onclick=()=>{socket.emit("endGame");location.reload()};

function renderPlayers(){ $("players").innerHTML=(state?.players||[]).map(p=>`<div class="player ${p.id===myId?"me":""}"><i class="dot" style="background:${p.color}"></i><b>${esc(p.name)}</b><span>${p.character}</span><span class="state">${p.ready?"READY":"NOT READY"}</span></div>`).join("");}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(t){$("toast").textContent=t;$("toast").style.cssText="position:fixed;z-index:10;left:50%;bottom:25%;transform:translateX(-50%);background:#111;padding:12px 18px;border:1px solid #444;border-radius:12px";setTimeout(()=>$("toast").textContent="",1800)}

function startGame(){
  lobby.classList.add("hidden"); canvas.classList.remove("hidden");hud.classList.remove("hidden");
  touch.classList.toggle("hidden",!isTouch());
  $("modeTitle").textContent=mode==="racing"?"🏁 NEON CIRCUIT":"⚡ POWER BRAWL";
  fit(); window.onresize=fit;
  Object.values(players).forEach((p,i)=>{p.x=mode==="racing"?250+i*70:world.w/2+(i-3)*110;p.y=mode==="racing"?world.h/2+Math.sin(i)*90:world.h/2+(i%2)*100;p.angle=0;p.progress=0;p.lap=0;p.hp=100;p.boost=100});
  local=players[myId]||{x:200,y:600,angle:0,hp:100,boost:100};
  requestAnimationFrame(loop);
}
function fit(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);}
function isTouch(){return matchMedia("(pointer:coarse)").matches}
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase()))e.preventDefault()});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

let stick={x:0,y:0}; const st=document.querySelector(".stick");
st?.addEventListener("pointermove",e=>{let r=st.getBoundingClientRect(),x=e.clientX-r.left-60,y=e.clientY-r.top-60,m=Math.hypot(x,y)||1,s=Math.min(1,55/m);stick={x:x/55*s,y:y/55*s};st.querySelector("span").style.transform=`translate(${stick.x*35}px,${stick.y*35}px)`});
st?.addEventListener("pointerup",()=>{stick={x:0,y:0};st.querySelector("span").style.transform=""});
document.querySelectorAll(".actions button").forEach(b=>{b.onpointerdown=()=>keys[b.dataset.key]=true;b.onpointerup=b.onpointercancel=()=>keys[b.dataset.key]=false});

function pad(){
  const g=navigator.getGamepads?.()[0]; if(!g)return null;
  return {x:g.axes[0]||0,y:g.axes[1]||0,a:!!g.buttons[0]?.pressed,b:!!g.buttons[1]?.pressed,xbtn:!!g.buttons[2]?.pressed,ybtn:!!g.buttons[3]?.pressed};
}
function controls(){
  const g=pad();
  return {x:g?g.x:(keys.d?1:keys.a?-1:stick.x),y:g?g.y:(keys.s?1:keys.w?-1:stick.y),
    a:g?g.a:!!keys.a,b:g?g.b:!!keys.b,xbtn:g?g.xbtn:!!keys.x,ybtn:g?g.ybtn:!!keys.y};
}
function loop(t){
  const dt=Math.min(.033,(t-last)/1000);last=t;
  if(mode==="racing")updateRace(dt);else updateFight(dt);
  draw(); requestAnimationFrame(loop);
}
function updateRace(dt){
  const c=controls(), p=players[myId]; if(!p)return;
  p.angle += c.x*3.0*dt;
  let accel=-c.y;
  if(Math.abs(accel)<.08) accel=0;
  let speed=190+Math.max(0,p.boost)*1.2;
  if(c.b) {p.boost=Math.max(0,p.boost-35*dt);speed+=100}
  else p.boost=Math.min(100,p.boost+12*dt);
  p.vx=Math.cos(p.angle)*accel*speed;p.vy=Math.sin(p.angle)*accel*speed;
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  p.x=Math.max(80,Math.min(world.w-80,p.x));p.y=Math.max(80,Math.min(world.h-80,p.y));
  p.progress=Math.min(1,p.progress+Math.hypot(p.vx,p.vy)*dt/65000);
  if(p.progress>=1&&!raceFinished){raceFinished=true;socket.emit("score",100);toast("FINISH! +100");setTimeout(()=>{raceFinished=false;p.progress=0;p.x=250;p.y=600},3000)}
  socket.emit("input",{x:p.x,y:p.y,angle:p.angle,progress:p.progress,boost:p.boost});
  players[myId]=p;
}
function updateFight(dt){
  const c=controls(),p=players[myId];if(!p)return;
  const speed=280;p.x+=c.x*speed*dt;p.y+=c.y*speed*dt;p.x=Math.max(90,Math.min(world.w-90,p.x));p.y=Math.max(150,Math.min(world.h-90,p.y));
  p.cool=Math.max(0,p.cool-dt);
  if((c.a||c.b||c.xbtn||c.ybtn)&&p.cool<=0){
    p.cool=.45; let range=c.ybtn?260:125,damage=c.ybtn?30:c.xbtn?22:c.b?15:10;
    for(const [id,q] of Object.entries(players)){if(id===myId||q.hp<=0)continue;let d=Math.hypot(q.x-p.x,q.y-p.y);if(d<range){q.hp=Math.max(0,q.hp-damage);socket.emit("gameEvent",{type:"hit",damage});socket.emit("score",10);}}
  }
  socket.emit("input",{x:p.x,y:p.y,hp:p.hp});
}
function camera(){
  const p=players[myId]||{x:world.w/2,y:world.h/2};return {x:p.x-innerWidth/2,y:p.y-innerHeight/2};
}
function draw(){
  const W=innerWidth,H=innerHeight;ctx.clearRect(0,0,W,H);let cam=camera();
  ctx.save();ctx.translate(-cam.x,-cam.y);
  if(mode==="racing")drawRace();else drawFight();
  ctx.restore();drawHud();
}
function drawRace(){
  ctx.fillStyle="#0d1018";ctx.fillRect(0,0,world.w,world.h);
  // neon track
  ctx.strokeStyle="#252b38";ctx.lineWidth=280;ctx.beginPath();ctx.roundRect(180,160,1840,880,220);ctx.stroke();
  ctx.strokeStyle="#0a0c12";ctx.lineWidth=230;ctx.beginPath();ctx.roundRect(180,160,1840,880,220);ctx.stroke();
  ctx.strokeStyle="#394152";ctx.lineWidth=3;ctx.setLineDash([20,25]);ctx.beginPath();ctx.roundRect(180,160,1840,880,220);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="#fff";for(let y=480;y<720;y+=28)ctx.fillRect(420,y,15,18);
  for(const p of Object.values(players)) drawCar(p);
}
function drawCar(p){
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);ctx.globalAlpha=p.hp<=0?.25:1;
  ctx.fillStyle=p.color;ctx.shadowBlur=20;ctx.shadowColor=p.color;ctx.fillRect(-24,-13,48,26);
  ctx.fillStyle="#08090d";ctx.fillRect(-7,-9,18,18);ctx.fillStyle="#fff";ctx.fillRect(16,-8,7,5);ctx.fillRect(16,3,7,5);
  ctx.restore();ctx.fillStyle="#fff";ctx.font="12px system-ui";ctx.textAlign="center";ctx.fillText(p.name,p.x,p.y-22);
}
function drawFight(){
  ctx.fillStyle="#15101c";ctx.fillRect(0,0,world.w,world.h);
  ctx.fillStyle="#201729";ctx.fillRect(120,150,1960,900);ctx.strokeStyle="#ff315555";ctx.lineWidth=6;ctx.strokeRect(120,150,1960,900);
  for(let i=0;i<10;i++){ctx.strokeStyle="#ffffff09";ctx.beginPath();ctx.moveTo(120+i*220,150);ctx.lineTo(120+i*220,1050);ctx.stroke()}
  for(const p of Object.values(players)) drawFighter(p);
}
function drawFighter(p){
  ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=p.hp<=0?.3:1;
  ctx.fillStyle=p.color;ctx.shadowBlur=25;ctx.shadowColor=p.color;ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#090a0d";ctx.beginPath();ctx.arc(-10,-6,5,0,7);ctx.arc(10,-6,5,0,7);ctx.fill();
  ctx.fillStyle="#fff";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText(p.character,0,-50);
  ctx.fillStyle="#111";ctx.fillRect(-35,-43,70,6);ctx.fillStyle="#5df0a0";ctx.fillRect(-35,-43,70*Math.max(0,p.hp)/100,6);
  ctx.restore();
}
function drawHud(){
  $("scoreboard").innerHTML=Object.values(players).sort((a,b)=>(b.score||0)-(a.score||0)).map(p=>`<div class="hudbox scoreline"><i class="dot" style="display:inline-block;background:${p.color}"></i>${esc(p.name)} <b>${p.score||0}</b>${mode==="fighting"?` · ${Math.max(0,Math.round(p.hp))}HP`:""}</div>`).join("");
}
