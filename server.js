const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const MAX = 7;
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

function cleanName(n) {
  return String(n || "Player").trim().slice(0, 16) || "Player";
}
function roomState(room) {
  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    players: [...room.players.values()].map(p => ({
      id:p.id, name:p.name, color:p.color, character:p.character,
      ready:p.ready, score:p.score
    }))
  };
}
const colors=["#ff3b30","#00d4ff","#ffd60a","#34c759","#bf5af2","#ff9f0a","#ff375f"];
const characters=["VOLT","NOVA","BLAZE","FROST","RUSH","SHADOW","TITAN"];

io.on("connection", socket => {
  socket.on("createRoom", ({name}) => {
    let code;
    do code=Math.random().toString(36).slice(2,7).toUpperCase(); while(rooms.has(code));
    const room={code,mode:"racing",status:"lobby",players:new Map(),raceStart:0};
    rooms.set(code,room);
    socket.join(code);
    room.players.set(socket.id,{id:socket.id,name:cleanName(name),color:colors[0],character:characters[0],ready:false,score:0});
    socket.data.room=code;
    io.to(code).emit("state",roomState(room));
  });

  socket.on("joinRoom", ({name,code}) => {
    code=String(code||"").trim().toUpperCase();
    const room=rooms.get(code);
    if(!room) return socket.emit("errorMsg","Room not found.");
    if(room.players.size>=MAX) return socket.emit("errorMsg","Room is full (maximum 7 players).");
    if(room.status!=="lobby") return socket.emit("errorMsg","That game has already started.");
    socket.join(code); socket.data.room=code;
    const idx=room.players.size;
    room.players.set(socket.id,{id:socket.id,name:cleanName(name),color:colors[idx],character:characters[idx],ready:false,score:0});
    io.to(code).emit("state",roomState(room));
  });

  socket.on("setMode", mode => {
    const room=rooms.get(socket.data.room); if(!room || room.status!=="lobby") return;
    room.mode=mode==="fighting"?"fighting":"racing";
    io.to(room.code).emit("state",roomState(room));
  });

  socket.on("setCharacter", char => {
    const room=rooms.get(socket.data.room), p=room?.players.get(socket.id);
    if(!p || room.status!=="lobby") return;
    if(characters.includes(char)) p.character=char;
    io.to(room.code).emit("state",roomState(room));
  });

  socket.on("ready", () => {
    const room=rooms.get(socket.data.room), p=room?.players.get(socket.id);
    if(!p || room.status!=="lobby") return;
    p.ready=!p.ready;
    io.to(room.code).emit("state",roomState(room));
  });

  socket.on("startGame", () => {
    const room=rooms.get(socket.data.room); if(!room || room.status!=="lobby") return;
    if(room.players.size<2) return socket.emit("errorMsg","You need at least 2 players.");
    room.status="playing"; room.raceStart=Date.now();
    room.players.forEach(p=>{p.score=0;p.ready=false});
    io.to(room.code).emit("gameStart",{mode:room.mode, players:[...room.players.values()]});
  });

  socket.on("input", input => {
    const room=rooms.get(socket.data.room); if(!room || room.status!=="playing") return;
    socket.to(room.code).emit("playerInput",{id:socket.id,input});
  });

  socket.on("gameEvent", data => {
    const room=rooms.get(socket.data.room); if(!room || room.status!=="playing") return;
    socket.to(room.code).emit("gameEvent",{id:socket.id,...data});
  });

  socket.on("score", delta => {
    const room=rooms.get(socket.data.room), p=room?.players.get(socket.id);
    if(!p || room.status!=="playing") return;
    p.score += Math.max(-10,Math.min(100,Number(delta)||0));
    io.to(room.code).emit("scoreUpdate",{id:socket.id,score:p.score});
  });

  socket.on("endGame", () => {
    const room=rooms.get(socket.data.room); if(!room) return;
    room.status="lobby";
    room.players.forEach(p=>p.ready=false);
    io.to(room.code).emit("state",roomState(room));
  });

  socket.on("disconnect",()=>{
    const code=socket.data.room, room=rooms.get(code);
    if(!room) return;
    room.players.delete(socket.id);
    if(room.players.size===0) rooms.delete(code);
    else io.to(code).emit("state",roomState(room));
  });
});

server.listen(PORT,()=>console.log(`Neon Friends Arena running on port ${PORT}`));
