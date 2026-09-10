const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const { Bonjour } = require('bonjour-service');
const { config } = require('./config');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const playerRooms = new Map(); // socketId -> roomCode

// ─────────────────────────── SETTINGS ───────────────────────────

function defaultSettings(gameType) {
  switch (gameType) {
    case 'scribble':     return { drawTime: 45, rounds: 3, wordChoices: 3 };
    case 'killerdoctor': return { discussionTime: 45, votingTime: 45, nightTime: 45 };
    case 'tictactoe':    return { bestOf: 0, boardSize: 3 };
    case 'connect4':     return { bestOf: 0, cols: 7, rows: 6 };
    case 'undercover':   return { undercoverCount: 1, mrWhite: 1, clueTime: 30, votingTime: 45 };
    case 'rps':          return { bestOf: 3, roundTime: 12 };
    case 'uno':          return {};
    case 'quiz':         return { numQuestions: 15, timePerQuestion: 20 };
    default:             return {};
  }
}

function validateSettings(incoming, gameType) {
  const out = {};
  const n = k => Math.round(Number(incoming[k]));
  const isValidTime = k => Number.isFinite(n(k)) && n(k) >= 10 && n(k) <= 600;
  switch (gameType) {
    case 'scribble':
      if (isValidTime('drawTime'))              out.drawTime    = n('drawTime');
      if ([2,3,4,5].includes(n('rounds')))      out.rounds      = n('rounds');
      if ([2,3,4].includes(n('wordChoices')))   out.wordChoices = n('wordChoices');
      break;
    case 'killerdoctor':
      if (isValidTime('discussionTime'))        out.discussionTime = n('discussionTime');
      if (isValidTime('votingTime'))            out.votingTime     = n('votingTime');
      if (isValidTime('nightTime'))             out.nightTime      = n('nightTime');
      break;
    case 'tictactoe':
      if ([0,3,5,7].includes(n('bestOf')))      out.bestOf = n('bestOf');
      if ([3,4,5].includes(n('boardSize')))     out.boardSize = n('boardSize');
      break;
    case 'connect4':
      if ([0,3,5,7].includes(n('bestOf')))      out.bestOf = n('bestOf');
      if ([6,7,8,9].includes(n('cols')))        out.cols = n('cols');
      if ([5,6,7].includes(n('rows')))          out.rows = n('rows');
      break;
    case 'undercover':
      if ([1,2].includes(n('undercoverCount'))) out.undercoverCount = n('undercoverCount');
      if ([0,1].includes(n('mrWhite')))         out.mrWhite = n('mrWhite');
      if ([15,30,45,60].includes(n('clueTime'))) out.clueTime = n('clueTime');
      if (isValidTime('votingTime'))            out.votingTime = n('votingTime');
      break;
    case 'rps':
      if ([1,3,5,7].includes(n('bestOf')))      out.bestOf = n('bestOf');
      if ([8,12,20].includes(n('roundTime')))   out.roundTime = n('roundTime');
      break;
    case 'quiz':
      if ([10,15,20,25].includes(n('numQuestions')))  out.numQuestions    = n('numQuestions');
      if ([10,15,20,30].includes(n('timePerQuestion'))) out.timePerQuestion = n('timePerQuestion');
      break;
  }
  return out;
}

// ─────────────────────────── UTILITIES ───────────────────────────

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}
function uniqueCode() { let c; do { c = genCode(); } while (rooms.has(c)); return c; }
function getRoom(sid) { const code = playerRooms.get(sid); return code ? rooms.get(code) : null; }
function clearTimers(room) { (room.timers||[]).forEach(clearTimeout); room.timers = []; }
function addTimer(room, fn, ms) { if (!room.timers) room.timers = []; const t = setTimeout(fn, ms); room.timers.push(t); return t; }
function minPlayers(g) { return { tictactoe: 2, killerdoctor: 4, scribble: 3, uno: 2, quiz: 2, connect4: 2, undercover: 4, rps: 2 }[g] ?? 2; }

function broadcastLobby(room) {
  io.to(room.code).emit('lobby:update', {
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, avatar: p.avatar ?? 0, isHost: p.id === room.host })),
    code: room.code,
    gameType: room.gameType,
    hostId: room.host,
    minPlayers: minPlayers(room.gameType),
    settings: room.settings,
    sessionStats: Object.keys(room.sessionStats || {}).length ? room.sessionStats : null,
  });
}

function getLocalIPs() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

// ─────────────────────────── SOCKET CORE ───────────────────────────

io.on('connection', socket => {

  socket.on('room:create', ({ gameType, playerName, avatar }) => {
    if (!playerName?.trim() || !gameType) return;
    const code = uniqueCode();
    const room = {
      code, gameType,
      host: socket.id,
      players: new Map([[socket.id, { id: socket.id, name: playerName.trim(), avatar: Number(avatar) || 0 }]]),
      status: 'lobby',
      gameState: null,
      timers: [],
      settings: defaultSettings(gameType),
      sessionStats: {},
    };
    rooms.set(code, room);
    playerRooms.set(socket.id, code);
    socket.join(code);
    socket.emit('room:joined', { code, isHost: true, gameType });
    broadcastLobby(room);
  });

  socket.on('room:join', ({ code, playerName, avatar }) => {
    const upper = (code || '').toUpperCase().trim();
    const room = rooms.get(upper);
    if (!room) { socket.emit('room:error', { msg: 'Room not found.' }); return; }

    if (room.status === 'playing') {
      const existing = [...room.players.values()].find(p => p.name === playerName?.trim());
      if (!existing) { socket.emit('room:error', { msg: 'Game in progress — cannot join now.' }); return; }
      room.players.delete(existing.id);
      if (room.host === existing.id) room.host = socket.id;
      existing.id = socket.id;
      room.players.set(socket.id, existing);
      playerRooms.set(socket.id, upper);
      socket.join(upper);
      socket.emit('room:joined', { code: upper, isHost: room.host === socket.id, gameType: room.gameType });
      sendReconnectState(room, socket);
      return;
    }

    if (room.players.has(socket.id)) return;
    const name = (playerName || '').trim() || `Player${room.players.size + 1}`;
    const av = Number(avatar) || 0;
    const existing = [...room.players.values()];
    if (existing.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      socket.emit('room:error', { msg: 'That name is already taken in this room. Please choose a different name.' }); return;
    }
    if (existing.some(p => p.avatar === av)) {
      socket.emit('room:error', { msg: 'That avatar is already taken in this room. Please choose a different avatar.' }); return;
    }
    room.players.set(socket.id, { id: socket.id, name, avatar: av });
    playerRooms.set(socket.id, upper);
    socket.join(upper);
    socket.emit('room:joined', { code: upper, isHost: false, gameType: room.gameType });
    broadcastLobby(room);
    io.to(upper).emit('notification', `${name} joined the room`);
  });

  socket.on('room:settings', newSettings => {
    const room = getRoom(socket.id);
    if (!room || room.host !== socket.id || room.status !== 'lobby') return;
    const validated = validateSettings(newSettings, room.gameType);
    room.settings = { ...room.settings, ...validated };
    io.to(room.code).emit('lobby:settings', room.settings);
  });

  socket.on('room:kick', ({ playerId }) => {
    const room = getRoom(socket.id);
    if (!room || room.host !== socket.id) return;
    if (!playerId || playerId === socket.id) return;
    const player = room.players.get(playerId);
    if (!player) return;
    io.to(playerId).emit('room:kicked');
    io.sockets.sockets.get(playerId)?.leave(room.code);
    room.players.delete(playerId);
    playerRooms.delete(playerId);
    io.to(room.code).emit('notification', `${player.name} was removed by the host`);
    if (room.status === 'playing') {
      onPlayerDisconnect(room, playerId, player.name);
    } else {
      broadcastLobby(room);
    }
  });

  socket.on('room:transfer_host', ({ playerId }) => {
    const room = getRoom(socket.id);
    if (!room || room.host !== socket.id || room.status !== 'lobby') return;
    if (!playerId || !room.players.has(playerId) || playerId === socket.id) return;
    room.host = playerId;
    io.to(room.code).emit('notification', `${room.players.get(playerId).name} is now the host`);
    broadcastLobby(room);
  });

  socket.on('game:start', () => {
    const room = getRoom(socket.id);
    if (!room || room.host !== socket.id || room.status !== 'lobby') return;
    if (room.players.size < minPlayers(room.gameType)) {
      socket.emit('room:error', { msg: `Need at least ${minPlayers(room.gameType)} players to start.` });
      return;
    }
    room.status = 'playing';
    io.to(room.code).emit('game:starting');
    addTimer(room, () => ({ tictactoe: startTTT, killerdoctor: startKD, scribble: startScribble, uno: startUno, quiz: startQuiz, connect4: startC4, undercover: startUC, rps: startRPS })[room.gameType]?.(room), 3200);
  });

  socket.on('game:action', data => {
    const room = getRoom(socket.id);
    if (!room || room.status !== 'playing') return;
    handleAction(room, socket, data);
  });

  socket.on('chat:send', ({ message }) => {
    const room = getRoom(socket.id);
    if (!room || !message?.trim()) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    handleChat(room, socket, player, message.trim().slice(0, 400));
  });

  socket.on('game:restart', () => {
    const room = getRoom(socket.id);
    if (!room || room.host !== socket.id) return;
    restartGame(room);
  });

  socket.on('game:back_to_lobby', () => {
    const room = getRoom(socket.id);
    if (!room || room.host !== socket.id) return;
    clearTimers(room);
    room.status = 'lobby';
    room.gameState = null;
    io.to(room.code).emit('game:back_to_lobby');
    broadcastLobby(room);
  });

  socket.on('disconnect', () => {
    const room = getRoom(socket.id);
    if (!room) return;
    const player = room.players.get(socket.id);
    const name = player?.name || 'A player';
    room.players.delete(socket.id);
    playerRooms.delete(socket.id);
    if (room.players.size === 0) { clearTimers(room); rooms.delete(room.code); return; }
    if (room.host === socket.id) room.host = room.players.keys().next().value;
    broadcastLobby(room);
    io.to(room.code).emit('notification', `${name} left the room`);
    if (room.status === 'playing') onPlayerDisconnect(room, socket.id, name);
  });
});

// ─────────────────────────── HELPERS ───────────────────────────

function sendReconnectState(room, socket) {
  const gs = room.gameState;
  if (!gs) { broadcastLobby(room); return; }
  switch (room.gameType) {
    case 'tictactoe': {
      if (gs.mode === 'tournament') {
        socket.emit('ttt:tournament_state', tttTournamentPublic(gs));
        if (gs.board) socket.emit('ttt:state', tttPublic(gs));
        const sym = gs.players?.X?.id === socket.id ? 'X' : gs.players?.O?.id === socket.id ? 'O' : null;
        socket.emit('ttt:symbol', { symbol: sym });
      } else {
        socket.emit('ttt:state', tttPublic(gs));
        const sym = gs.players.X.id === socket.id ? 'X' : gs.players.O.id === socket.id ? 'O' : null;
        socket.emit('ttt:symbol', { symbol: sym });
      }
      break;
    }
    case 'connect4': {
      socket.emit('c4:state', c4Public(gs));
      const disc = gs.players?.R?.id === socket.id ? 'R' : gs.players?.Y?.id === socket.id ? 'Y' : null;
      socket.emit('c4:disc', { disc });
      break;
    }
    case 'rps':
      socket.emit('rps:state', rpsPublic(gs));
      break;
    case 'undercover':
      // The word is the private half of this game — it goes to the one socket that owns it.
      if (gs.playerData?.[socket.id]) socket.emit('uc:word', { word: gs.playerData[socket.id].word });
      socket.emit('uc:state', ucPublic(gs));
      break;
    case 'killerdoctor': {
      const pd = gs.playerData?.[socket.id];
      if (pd) socket.emit('kd:reconnect', { role: pd.role, phase: gs.phase, alive: pd.alive, avatar: pd.avatar ?? 0 });
      break;
    }
    case 'scribble':
      socket.emit('scribble:reconnect', {
        phase: gs.phase, drawerId: gs.drawerOrder[gs.drawerIndex],
        scores: gs.scores, drawingData: gs.drawingData, masked: gs.masked,
        players: scribblePlayers(room), round: gs.round, maxRounds: gs.maxRounds,
      });
      break;
    case 'uno':
      socket.emit('uno:state', unoPublic(gs));
      if (gs.hands[socket.id]) socket.emit('uno:hand', { hand: gs.hands[socket.id] });
      break;
    case 'quiz':
      if (gs.phase === 'loading') { socket.emit('quiz:state', { phase: 'loading' }); break; }
      socket.emit('quiz:state', quizPublic(gs, room));
      if (gs.phase === 'question' && gs.answers[socket.id])
        socket.emit('quiz:answered', { answer: gs.answers[socket.id].answer });
      break;
  }
}

function restartGame(room) {
  clearTimers(room);
  room.status = 'playing';
  room.gameState = null;
  io.to(room.code).emit('game:starting');
  addTimer(room, () => ({ tictactoe: startTTT, killerdoctor: startKD, scribble: startScribble, uno: startUno, quiz: startQuiz, connect4: startC4, undercover: startUC, rps: startRPS })[room.gameType]?.(room), 3200);
}

function handleAction(room, socket, data) {
  const gs = room.gameState; if (!gs) return;
  const isHost = room.host === socket.id;
  switch (room.gameType) {
    case 'tictactoe':
      if (data.action === 'move')     tttMove(room, socket, data.index);
      // Only the host is offered the button, so only the host may deal again.
      if (data.action === 'new_game' && isHost && room.gameState?.mode !== 'tournament') tttNewGame(room);
      break;
    case 'connect4':
      if (data.action === 'drop')     c4Drop(room, socket, data.col);
      if (data.action === 'new_game' && isHost) c4NewGame(room);
      break;
    case 'rps':          rpsAction(room, socket, data); break;
    case 'undercover':   ucAction(room, socket, data); break;
    case 'killerdoctor': kdAction(room, socket, data); break;
    case 'scribble':     scribbleAction(room, socket, data); break;
    case 'uno':          unoAction(room, socket, data); break;
    case 'quiz':         quizAction(room, socket, data); break;
  }
}

function handleChat(room, socket, player, message) {
  const gs = room.gameState;

  if (room.gameType === 'scribble' && gs?.phase === 'drawing') {
    const drawerId = gs.drawerOrder[gs.drawerIndex];
    if (socket.id === drawerId || gs.guessedThisRound.has(socket.id)) return;
    const guess = message.toLowerCase().trim();
    const word  = gs.word.toLowerCase().trim();
    if (guess === word) {
      gs.guessedThisRound.add(socket.id);
      const elapsed   = (Date.now() - gs.roundStartTime) / 1000;
      const remaining = Math.max(0, gs.ROUND_DURATION - elapsed);
      const points    = Math.round(100 + (remaining / gs.ROUND_DURATION) * 200);
      gs.scores[socket.id]  = (gs.scores[socket.id]  || 0) + points;
      gs.scores[drawerId]   = (gs.scores[drawerId]   || 0) + 50;
      socket.emit('scribble:correct_guess', { word: gs.word, points });
      io.to(room.code).emit('scribble:guess_event', { playerId: socket.id, playerName: player.name, correct: true, scores: gs.scores });
      const nonDrawers = [...room.players.keys()].filter(id => id !== drawerId);
      if (gs.guessedThisRound.size >= nonDrawers.length) { clearTimers(room); endScribbleRound(room, true); }
    } else {
      io.to(room.code).emit('chat:message', { playerId: socket.id, playerName: player.name, message });
    }
    return;
  }

  if (room.gameType === 'undercover' && gs) {
    // Dead players stop talking, and nobody talks over the role reveal.
    const pd = gs.playerData?.[socket.id];
    if (!pd?.alive || gs.phase === 'role_reveal') return;
  }

  if (room.gameType === 'killerdoctor' && gs) {
    const pd = gs.playerData?.[socket.id];
    if (!pd?.alive || gs.phase !== 'day_discussion') return;
  }

  io.to(room.code).emit('chat:message', { playerId: socket.id, playerName: player.name, message });
}

function onPlayerDisconnect(room, sid, name) {
  const gs = room.gameState; if (!gs) return;
  switch (room.gameType) {
    case 'killerdoctor':
      if (gs.playerData?.[sid]) gs.playerData[sid].alive = false;
      { const win = kdCheckWin(gs);
        if (win) { clearTimers(room); endKD(room, win); }
        else if (kdAlive(gs).length < minPlayers(room.gameType)) { clearTimers(room); endKD(room, { winner: 'abandoned', reason: 'Not enough players to continue.' }); }
        else if (gs.phase === 'night') checkNightDone(room); }
      break;
    case 'tictactoe':
      if (gs.mode === 'tournament' && gs.players) {
        const isActive = gs.players.X.id === sid || gs.players.O.id === sid;
        if (isActive) {
          const winnerId = gs.players.X.id === sid ? gs.players.O.id : gs.players.X.id;
          if (gs.allPlayers[winnerId]) {
            gs.rounds[gs.currentRound][gs.currentMatch].winner = winnerId;
            delete gs.allPlayers[sid];
            io.to(room.code).emit('notification', `${name} left — ${gs.allPlayers[winnerId]?.name} advances!`);
            io.to(room.code).emit('ttt:tournament_state', tttTournamentPublic(gs));
            clearTimers(room);
            addTimer(room, () => advanceTournament(room), 2000);
          }
        }
      } else if (gs.players?.X?.id === sid || gs.players?.O?.id === sid) {
        io.to(room.code).emit('ttt:player_left', { name });
      }
      break;
    case 'connect4':
      if (gs.players?.R?.id === sid || gs.players?.Y?.id === sid) {
        io.to(room.code).emit('c4:player_left', { name });
      }
      break;
    case 'rps':
      if (gs.match && (gs.match.p1 === sid || gs.match.p2 === sid)) {
        const winnerId = gs.match.p1 === sid ? gs.match.p2 : gs.match.p1;
        delete gs.allPlayers[sid];
        if (gs.allPlayers[winnerId]) {
          gs.rounds[gs.currentRound][gs.currentMatch].winner = winnerId;
          io.to(room.code).emit('notification', { key: 'rps.leftAdvances', params: { name, winner: gs.allPlayers[winnerId].name } });
          gs.match = null;
          clearTimers(room);
          io.to(room.code).emit('rps:state', rpsPublic(gs));
          addTimer(room, () => rpsAdvance(room), 2000);
        }
      } else {
        delete gs.allPlayers[sid];
        io.to(room.code).emit('rps:state', rpsPublic(gs));
      }
      break;
    case 'undercover': {
      const pd = gs.playerData?.[sid];
      if (!pd?.alive) break;
      pd.alive = false;
      const win = ucCheckWin(gs);
      if (win) { clearTimers(room); endUC(room, win); break; }
      if (ucAlive(gs).length < 3) { clearTimers(room); endUC(room, { winner: 'abandoned', reason: 'abandoned' }); break; }
      // A departure must not leave the table waiting on a speaker who is gone.
      if (gs.phase === 'clues' && gs.speakOrder?.[gs.speakerIndex] === sid) {
        clearTimers(room); gs.speakerIndex++; ucNextSpeaker(room);
      } else if (gs.phase === 'voting' && ucAlive(gs).every(p => p.vote)) {
        ucResolveVote(room);
      } else {
        io.to(room.code).emit('uc:state', ucPublic(gs));
      }
      break;
    }
    case 'scribble': {
      const idx = gs.drawerOrder.indexOf(sid); if (idx !== -1) gs.drawerOrder.splice(idx, 1);
      if (gs.drawerIndex >= gs.drawerOrder.length) gs.drawerIndex = 0;
      delete gs.scores[sid];
      const nonDrawers = [...room.players.keys()].filter(id => id !== gs.drawerOrder[gs.drawerIndex]);
      if (!gs.drawerOrder.length || nonDrawers.length === 0) { clearTimers(room); endScribbleGame(room); }
      else if ((gs.phase === 'drawing' || gs.phase === 'choosing') && sid === gs.drawerOrder[gs.drawerIndex]) {
        clearTimers(room); endScribbleRound(room, false);
      }
      break;
    }
    case 'quiz': {
      delete gs.scores[sid];
      delete gs.correctCounts?.[sid];
      if (gs.phase === 'question' && room.players.size > 0) {
        const answered = [...room.players.keys()].filter(id => gs.answers[id]).length;
        if (answered >= room.players.size) { clearTimers(room); quizReveal(room); }
      }
      break;
    }
    case 'uno': {
      const idx = gs.playerOrder.indexOf(sid);
      if (idx === -1) break;
      const wasCurrentPlayer = gs.currentPlayerIndex === idx;
      gs.playerOrder.splice(idx, 1);
      delete gs.hands[sid];
      delete gs.unoSaid[sid];
      if (gs.playerOrder.length < 2) {
        if (gs.playerOrder.length === 1) endUno(room, gs.playerOrder[0]);
        break;
      }
      if (idx < gs.currentPlayerIndex) {
        gs.currentPlayerIndex--;
      } else if (idx === gs.currentPlayerIndex && gs.currentPlayerIndex >= gs.playerOrder.length) {
        gs.currentPlayerIndex = 0;
      }
      if (wasCurrentPlayer && gs.phase === 'choose_color') {
        gs.currentColor = UNO_COLORS[Math.floor(Math.random() * 4)];
        gs.phase = 'playing';
      }
      gs.awaitingPass = false;
      gs.drawnCardIndex = -1;
      io.to(room.code).emit('uno:state', unoPublic(gs));
      break;
    }
  }
}

// ─────────────────────── SESSION STATS ───────────────────────

function recordResult(room, winnerIds, allIds) {
  if (!room.sessionStats) room.sessionStats = {};
  const ids = allIds || [...room.players.keys()];
  ids.forEach(pid => {
    const name = room.players.get(pid)?.name || room.sessionStats[pid]?.name || '?';
    if (!room.sessionStats[pid]) room.sessionStats[pid] = { name, wins: 0, gamesPlayed: 0 };
    else room.sessionStats[pid].name = name;
    room.sessionStats[pid].gamesPlayed++;
  });
  winnerIds.forEach(pid => { if (room.sessionStats[pid]) room.sessionStats[pid].wins++; });
}

// ─────────────────────── TIC TAC TOE ───────────────────────

// Board size → symbols in a row needed to win. 5-in-a-row on a 5×5 grid is
// almost always a draw, so the bigger board keeps the 4-in-a-row goal.
const TTT_WIN_LENGTH = { 3: 3, 4: 4, 5: 4 };

function nextPow2(n) { let p = 1; while (p < n) p <<= 1; return p; }

function buildTournamentRounds(playerIds) {
  const size = nextPow2(playerIds.length);
  const seeds = [...playerIds];
  while (seeds.length < size) seeds.push(null);
  const rounds = [];
  let current = seeds;
  let prevPhantoms = null;
  while (current.length > 1) {
    const matches = [];
    const phantoms = [];
    for (let i = 0; i < current.length; i += 2) {
      const p1 = current[i], p2 = current[i + 1] ?? null;
      const isBye = p2 === null;
      // A match is phantom when no real player will ever appear in it.
      // Round 0: phantom iff both seeds are null.
      // Later rounds: phantom iff BOTH feeding matches were phantom.
      const phantom = prevPhantoms === null
        ? (p1 === null && p2 === null)
        : ((prevPhantoms[i] ?? true) && (prevPhantoms[i + 1] ?? true));
      matches.push({ p1, p2, winner: isBye ? p1 : null, isBye, phantom });
      phantoms.push(phantom);
    }
    rounds.push(matches);
    prevPhantoms = phantoms;
    current = new Array(matches.length).fill(null);
  }
  return rounds;
}

function propagateTournamentWinners(gs) {
  for (let r = 0; r < gs.rounds.length - 1; r++) {
    const cur = gs.rounds[r], nxt = gs.rounds[r + 1];
    for (let m = 0; m < cur.length; m += 2) {
      const ti = Math.floor(m / 2);
      if (ti >= nxt.length) break;
      const match1 = cur[m], match2 = cur[m + 1];
      if (match1?.winner) nxt[ti].p1 = match1.winner;
      if (match2?.winner) nxt[ti].p2 = match2.winner;
      // Only auto-advance when the other slot is permanently empty (phantom match or missing)
      const m2empty = !match2 || match2.phantom;
      const m1empty = !match1 || match1.phantom;
      if (nxt[ti].p1 && !nxt[ti].p2 && !nxt[ti].winner && m2empty) { nxt[ti].winner = nxt[ti].p1; nxt[ti].isBye = true; }
      if (nxt[ti].p2 && !nxt[ti].p1 && !nxt[ti].winner && m1empty) { nxt[ti].winner = nxt[ti].p2; nxt[ti].isBye = true; }
    }
  }
}

function advanceTournament(room) {
  const gs = room.gameState;
  propagateTournamentWinners(gs);
  const finalMatch = gs.rounds[gs.rounds.length - 1][0];
  if (finalMatch.winner) {
    gs.tournamentWinner = finalMatch.winner;
    gs.board = null; gs.players = null; room.status = 'ended';
    recordResult(room, [gs.tournamentWinner], Object.keys(gs.allPlayers));
    io.to(room.code).emit('ttt:tournament_over', {
      winner: gs.allPlayers[gs.tournamentWinner],
      rounds: gs.rounds, allPlayers: gs.allPlayers,
    });
    return;
  }
  for (let r = 0; r < gs.rounds.length; r++) {
    for (let m = 0; m < gs.rounds[r].length; m++) {
      const match = gs.rounds[r][m];
      if (!match.winner && match.p1 && match.p2) {
        gs.currentRound = r; gs.currentMatch = m;
        startTournamentMatch(room, match.p1, match.p2);
        return;
      }
    }
  }
}

function startTournamentMatch(room, p1Id, p2Id) {
  const gs = room.gameState;
  const p1 = gs.allPlayers[p1Id], p2 = gs.allPlayers[p2Id];
  if (!p1 || !p2) { advanceTournament(room); return; }
  const [X, O] = Math.random() < 0.5 ? [p1, p2] : [p2, p1];
  gs.board = Array(gs.size * gs.size).fill(null);
  gs.players = { X: { id: X.id, name: X.name }, O: { id: O.id, name: O.name } };
  gs.currentTurn = X.id;
  gs.winner = null; gs.winLine = null; gs.winnerSymbol = null;
  io.to(room.code).emit('ttt:state', tttPublic(gs));
  io.to(room.code).emit('ttt:tournament_state', tttTournamentPublic(gs));
  io.to(X.id).emit('ttt:symbol', { symbol: 'X' });
  io.to(O.id).emit('ttt:symbol', { symbol: 'O' });
  Object.keys(gs.allPlayers).filter(id => id !== X.id && id !== O.id).forEach(id => io.to(id).emit('ttt:symbol', { symbol: null }));
}

function tttTournamentPublic(gs) {
  return {
    rounds: gs.rounds, allPlayers: gs.allPlayers,
    currentRound: gs.currentRound, currentMatch: gs.currentMatch,
    tournamentWinner: gs.tournamentWinner,
    currentPlayerIds: gs.players ? [gs.players.X.id, gs.players.O.id] : [],
  };
}

function startTTT(room) {
  const players = [...room.players.values()].sort(() => Math.random() - 0.5);
  const bestOf = room.settings?.bestOf ?? 0;
  const size = TTT_WIN_LENGTH[room.settings?.boardSize] ? room.settings.boardSize : 3;
  const winLength = TTT_WIN_LENGTH[size];

  if (players.length >= 3) {
    const allPlayers = {};
    players.forEach(p => { allPlayers[p.id] = { id: p.id, name: p.name }; });
    const rounds = buildTournamentRounds(players.map(p => p.id));
    room.gameState = {
      type: 'tictactoe', mode: 'tournament', size, winLength,
      allPlayers, rounds, currentRound: 0, currentMatch: 0,
      board: null, players: null, currentTurn: null,
      winner: null, winLine: null, winnerSymbol: null, tournamentWinner: null,
    };
    io.to(room.code).emit('ttt:tournament_state', tttTournamentPublic(room.gameState));
    addTimer(room, () => advanceTournament(room), 2000);
  } else {
    const X = players[0], O = players[1];
    room.gameState = {
      type: 'tictactoe', mode: 'classic', size, winLength,
      board: Array(size * size).fill(null),
      players: { X: { id: X.id, name: X.name }, O: { id: O.id, name: O.name } },
      currentTurn: X.id,
      winner: null, winLine: null, winnerSymbol: null,
      scores: { [X.id]: 0, [O.id]: 0 },
      gameCount: 1, bestOf, matchWinner: null,
    };
    io.to(room.code).emit('ttt:state', tttPublic(room.gameState));
    io.to(X.id).emit('ttt:symbol', { symbol: 'X' });
    io.to(O.id).emit('ttt:symbol', { symbol: 'O' });
    players.filter(p => p.id !== X.id && p.id !== O.id).forEach(p => io.to(p.id).emit('ttt:symbol', { symbol: null }));
  }
}

function tttMove(room, socket, index) {
  const gs = room.gameState;
  if (!gs.board || gs.winner || (gs.mode !== 'tournament' && gs.matchWinner) || gs.currentTurn !== socket.id) return;
  if (index < 0 || index >= gs.board.length || gs.board[index] !== null) return;
  const sym = gs.players.X.id === socket.id ? 'X' : gs.players.O.id === socket.id ? 'O' : null;
  if (!sym) return;
  gs.board[index] = sym;
  const win = tttWin(gs.board, gs.size, gs.winLength);
  if (win) {
    gs.winner = socket.id; gs.winnerSymbol = sym; gs.winLine = win;
    if (gs.mode === 'tournament') {
      gs.rounds[gs.currentRound][gs.currentMatch].winner = socket.id;
      io.to(room.code).emit('ttt:state', tttPublic(gs));
      io.to(room.code).emit('ttt:tournament_state', tttTournamentPublic(gs));
      addTimer(room, () => advanceTournament(room), 4000);
    } else {
      gs.scores[socket.id] = (gs.scores[socket.id] || 0) + 1;
      if (gs.bestOf > 0) {
        const needed = Math.ceil(gs.bestOf / 2);
        if (gs.scores[socket.id] >= needed) {
          gs.matchWinner = socket.id;
          recordResult(room, [socket.id]);
        }
      }
      io.to(room.code).emit('ttt:state', tttPublic(gs));
    }
  } else if (gs.board.every(Boolean)) {
    gs.winner = 'draw';
    io.to(room.code).emit('ttt:state', tttPublic(gs));
    if (gs.mode === 'tournament') {
      const { p1, p2 } = gs.rounds[gs.currentRound][gs.currentMatch];
      addTimer(room, () => startTournamentMatch(room, p1, p2), 2500);
    }
  } else {
    gs.currentTurn = gs.currentTurn === gs.players.X.id ? gs.players.O.id : gs.players.X.id;
    io.to(room.code).emit('ttt:state', tttPublic(gs));
  }
}

function tttNewGame(room) {
  const gs = room.gameState;
  if (!gs || gs.mode === 'tournament' || gs.matchWinner) return;
  if (!gs.winner) return;   // the current game is still running
  const tmp = gs.players.X; gs.players.X = gs.players.O; gs.players.O = tmp;
  gs.board = Array(gs.size * gs.size).fill(null);
  gs.currentTurn = gs.players.X.id;
  gs.winner = null; gs.winLine = null; gs.winnerSymbol = null;
  gs.gameCount++;
  io.to(room.code).emit('ttt:state', tttPublic(gs));
  io.to(gs.players.X.id).emit('ttt:symbol', { symbol: 'X' });
  io.to(gs.players.O.id).emit('ttt:symbol', { symbol: 'O' });
}

// Scans right / down / both diagonals from every filled cell — one routine for
// every board size instead of a hard-coded list of eight lines.
function tttWin(board, size = 3, need = 3) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = board[r * size + c];
      if (!v) continue;
      for (const [dr, dc] of dirs) {
        const line = [r * size + c];
        for (let k = 1; k < need; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size || board[nr * size + nc] !== v) break;
          line.push(nr * size + nc);
        }
        if (line.length === need) return line;
      }
    }
  }
  return null;
}

function tttPublic(gs) {
  return {
    mode: gs.mode || 'classic', size: gs.size || 3, winLength: gs.winLength || 3,
    board: gs.board, currentTurn: gs.currentTurn, players: gs.players,
    winner: gs.winner, winLine: gs.winLine, winnerSymbol: gs.winnerSymbol,
    scores: gs.scores || {}, gameCount: gs.gameCount || 1,
    bestOf: gs.bestOf || 0, matchWinner: gs.matchWinner || null,
  };
}

// ─────────────────────── KILLER DOCTOR ───────────────────────

function startKD(room) {
  const players = [...room.players.values()].sort(() => Math.random() - 0.5);
  const maxDoctors = Math.max(1, Math.floor(players.length / 5));
  const numDoctors = Math.floor(Math.random() * maxDoctors) + 1;
  const playerData = {};
  players.forEach((p, i) => {
    playerData[p.id] = { id: p.id, name: p.name, avatar: p.avatar ?? 0,
      role: i === 0 ? 'killer' : i <= numDoctors ? 'doctor' : 'villager',
      alive: true, hasActedNight: false, nightChoice: null, vote: null };
  });
  room.gameState = { type: 'killerdoctor', phase: 'role_reveal', playerData, round: 1, history: [] };
  players.forEach(p => io.to(p.id).emit('kd:role_assigned', {
    role: playerData[p.id].role,
    allPlayers: players.map(q => kdPub(playerData[q.id])),
  }));
  addTimer(room, () => kdStartNight(room), 6000);
}

function kdStartNight(room) {
  const gs = room.gameState;
  gs.phase = 'night';
  Object.values(gs.playerData).forEach(p => { p.hasActedNight = false; p.nightChoice = null; p.vote = null; });
  const alive = kdAlive(gs);
  io.to(room.code).emit('kd:night_start', {
    round: gs.round,
    livingPlayers: alive.map(kdPub),
    deadPlayers: kdDead(gs).map(kdPub),
  });
  const nightTime = room.settings?.nightTime ?? 90;
  addTimer(room, () => { if (room.gameState?.phase !== 'night') return; kdAutoNight(room); checkNightDone(room); }, nightTime * 1000);
}

function kdAutoNight(room) {
  const gs = room.gameState;
  const alive = kdAlive(gs);
  const killer = kdRole(gs, 'killer');
  if (killer?.alive && !killer.hasActedNight) {
    const targets = alive.filter(p => p.id !== killer.id);
    if (targets.length) { killer.nightChoice = targets[Math.floor(Math.random()*targets.length)].id; killer.hasActedNight = true; }
  }
  kdRoles(gs, 'doctor').forEach(doctor => {
    if (doctor.alive && !doctor.hasActedNight) { doctor.nightChoice = doctor.id; doctor.hasActedNight = true; }
  });
  alive.forEach(p => { if (!p.hasActedNight) p.hasActedNight = true; });
}

function kdResolveNight(room) {
  const gs = room.gameState; gs.phase = 'night_resolution';
  const killer = kdRole(gs, 'killer');
  const kChoice = killer?.nightChoice;
  const dChoices = new Set(kdRoles(gs, 'doctor').filter(d => d.alive).map(d => d.nightChoice).filter(Boolean));
  let died = null, saved = false;
  if (kChoice) {
    if (dChoices.has(kChoice)) saved = true;
    else { died = kChoice; gs.playerData[died].alive = false; }
  }
  const msg = saved ? 'A Doctor saved someone! Nobody died last night.'
    : died ? `${gs.playerData[died].name} was found dead this morning.`
    : 'A peaceful night passed.';
  if (died) gs.history.push({ name: gs.playerData[died].name, reason: 'night_kill', round: gs.round });
  io.to(room.code).emit('kd:night_result', {
    message: msg,
    died: died ? kdPub(gs.playerData[died]) : null,
    saved,
    livingPlayers: kdAlive(gs).map(kdPub),
    deadPlayers: kdDead(gs).map(kdPub),
  });
  const win = kdCheckWin(gs);
  if (win) { addTimer(room, () => endKD(room, win), 3500); return; }
  addTimer(room, () => kdStartDay(room), 4000);
}

function checkNightDone(room) {
  const gs = room.gameState; if (gs?.phase !== 'night') return;
  if (!kdAlive(gs).every(p => p.hasActedNight)) return;
  clearTimers(room);
  const delay = 1000 + Math.random() * 4000;
  addTimer(room, () => kdResolveNight(room), delay);
}

function kdStartDay(room) {
  const gs = room.gameState; gs.phase = 'day_discussion';
  const dur = room.settings?.discussionTime ?? 120;
  io.to(room.code).emit('kd:day_start', {
    round: gs.round, duration: dur,
    livingPlayers: kdAlive(gs).map(kdPub),
    deadPlayers: kdDead(gs).map(kdPub),
  });
  addTimer(room, () => { if (room.gameState?.phase === 'day_discussion') kdStartVoting(room); }, dur * 1000);
}

function kdStartVoting(room) {
  const gs = room.gameState; gs.phase = 'voting';
  Object.values(gs.playerData).forEach(p => { p.vote = null; });
  const dur = room.settings?.votingTime ?? 60;
  io.to(room.code).emit('kd:voting_start', {
    duration: dur,
    livingPlayers: kdAlive(gs).map(kdPub),
    deadPlayers: kdDead(gs).map(kdPub),
  });
  addTimer(room, () => { if (room.gameState?.phase === 'voting') kdResolveVoting(room); }, dur * 1000);
}

function kdResolveVoting(room) {
  const gs = room.gameState; gs.phase = 'vote_resolution';
  const tally = {};
  Object.values(gs.playerData).forEach(p => { if (p.alive && p.vote) tally[p.vote] = (tally[p.vote]||0) + 1; });
  let maxV = 0, elim = null, tied = false;
  Object.entries(tally).forEach(([pid, cnt]) => {
    if (cnt > maxV) { maxV = cnt; elim = pid; tied = false; }
    else if (cnt === maxV) tied = true;
  });
  let elimPlayer = null;
  if (!tied && elim && maxV > 0) {
    elimPlayer = gs.playerData[elim]; elimPlayer.alive = false;
    gs.history.push({ name: elimPlayer.name, reason: 'vote', role: elimPlayer.role, round: gs.round });
  }
  const voteDetails = Object.entries(tally).map(([pid,cnt]) => ({ ...kdPub(gs.playerData[pid]), votes: cnt }));
  io.to(room.code).emit('kd:vote_result', {
    tied, voteDetails,
    eliminated: elimPlayer ? { ...kdPub(elimPlayer), role: elimPlayer.role } : null,
    message: tied ? 'The vote ended in a tie. Nobody was eliminated.'
      : elimPlayer ? `${elimPlayer.name} was eliminated by the village!`
      : 'Nobody was eliminated.',
    livingPlayers: kdAlive(gs).map(kdPub),
    deadPlayers: kdDead(gs).map(kdPub),
  });
  const win = kdCheckWin(gs);
  if (win) { addTimer(room, () => endKD(room, win), 5000); return; }
  gs.round++;
  addTimer(room, () => kdStartNight(room), 5000);
}

function kdCheckWin(gs) {
  const killer = kdRole(gs,'killer');
  if (!killer?.alive) return { winner: 'villagers', reason: 'The Killer has been eliminated!' };
  if (kdAlive(gs).length <= 2) return { winner: 'killer', reason: 'The Killer cannot be outvoted!' };
  return null;
}

function endKD(room, win) {
  const gs = room.gameState; gs.phase = 'game_over'; room.status = 'ended';
  const allKdIds = Object.keys(gs.playerData);
  const kdKiller = kdRole(gs, 'killer');
  const winnerIds = win.winner === 'villagers'
    ? allKdIds.filter(id => gs.playerData[id]?.role !== 'killer')
    : [kdKiller?.id].filter(Boolean);
  recordResult(room, winnerIds, allKdIds);
  io.to(room.code).emit('kd:game_over', {
    winner: win.winner, reason: win.reason,
    allPlayers: Object.values(gs.playerData).map(p => ({ ...kdPub(p), role: p.role, alive: p.alive })),
    history: gs.history,
  });
}

function kdAction(room, socket, data) {
  const gs = room.gameState, pd = gs.playerData?.[socket.id];
  if (!pd?.alive) return;
  switch (data.action) {
    case 'night_kill':
      // Any living player may submit a night pick; the screen is identical for all.
      // The pick is stored per-player and only matters for the killer (kill) and
      // doctor (save) at resolution — a villager's pick is an ignored decoy.
      if (gs.phase!=='night'||pd.hasActedNight) return;
      { const t=gs.playerData[data.targetId]; if (!t?.alive||(pd.role==='killer'&&data.targetId===socket.id)) return;
        pd.nightChoice=data.targetId; pd.hasActedNight=true;
        socket.emit('kd:action_confirmed',{action:'night_kill'}); kdBroadcastNightProgress(room); checkNightDone(room); } break;
    case 'vote':
      if (gs.phase!=='voting'||data.targetId===socket.id) return;
      { const t=gs.playerData[data.targetId]; if (!t?.alive) return;
        pd.vote=data.targetId;
        const cast=Object.values(gs.playerData).filter(p=>p.alive&&p.vote!==null).length;
        const total=kdAlive(gs).length;
        io.to(room.code).emit('kd:vote_update',{cast,total});
        socket.emit('kd:vote_confirmed',{targetId:data.targetId,targetName:t.name});
        if (cast>=total){clearTimers(room);kdResolveVoting(room);} } break;
  }
}

function kdBroadcastNightProgress(room) {
  const alive = kdAlive(room.gameState);
  io.to(room.code).emit('kd:night_progress', { confirmed: alive.filter(p => p.hasActedNight).length, total: alive.length });
}

const kdAlive = gs => Object.values(gs.playerData).filter(p => p.alive);
const kdDead  = gs => Object.values(gs.playerData).filter(p => !p.alive);
const kdRole  = (gs, role) => Object.values(gs.playerData).find(p => p.role === role);
const kdRoles = (gs, role) => Object.values(gs.playerData).filter(p => p.role === role);
const kdPub   = p  => ({ id: p.id, name: p.name, avatar: p.avatar ?? 0 });

// ─────────────────────────── SCRIBBLE ───────────────────────────

const WORDS = [
  'apple','banana','castle','dragon','elephant','fireworks','guitar','helicopter',
  'iceberg','jungle','kangaroo','lighthouse','mermaid','notebook','octopus','parachute',
  'quicksand','rainbow','spaceship','telescope','umbrella','volcano','waterfall','xylophone',
  'zebra','airplane','balloon','compass','dinosaur','envelope','fountain','gorilla',
  'hammock','island','jellyfish','kite','lantern','mushroom','necklace','orange',
  'penguin','rocket','saxophone','tornado','unicorn','vampire','whale','cactus',
  'butterfly','trampoline','campfire','sunflower','robot','treasure','pirate','ninja',
  'wizard','ghost','hamburger','pizza','anchor','bridge','crown','diamond','eagle',
  'forest','galaxy','igloo','knight','lemon','microscope','noodle','owl','river',
  'sandcastle','tiger','violin','windmill','yarn','zoo','avocado','broccoli',
  'chimney','doorbell','escalator','flamingo','giraffe','hourglass','icicle',
  'juggler','keyhole','magnet','narwhal','paintbrush','rhinoceros',
  'submarine','thermometer','typewriter','ukulele','windshield','yacht','zeppelin',
  'race car','ice cream','hot dog','palm tree','fire hydrant','roller coaster',
  'thunderstorm','snowflake','birthday cake','treasure chest','roller skates',
];

function randWords(n=3) { return [...WORDS].sort(()=>Math.random()-.5).slice(0,n); }

function maskWord(word, revealed=[]) {
  return word.split('').map((c,i) => c===' ' ? '  ' : revealed.includes(i) ? c : '_').join(' ');
}

function startScribble(room) {
  const players = [...room.players.values()];
  const order = players.map(p => p.id);
  const { drawTime=80, rounds=3, wordChoices=3 } = room.settings || {};
  room.gameState = {
    type:'scribble', phase:'choosing',
    drawerOrder: order, drawerIndex: 0,
    round: 1, maxRounds: rounds,
    word: null, masked: null, revealedIndices: [],
    scores: Object.fromEntries(order.map(id=>[id,0])),
    guessedThisRound: new Set(),
    drawingData: [],
    roundStartTime: null,
    ROUND_DURATION: drawTime,
    wordChoices,
  };
  io.to(room.code).emit('scribble:game_start', { players: scribblePlayers(room), maxRounds: rounds });
  addTimer(room, () => scribbleStartTurn(room), 2000);
}

function scribbleStartTurn(room) {
  const gs = room.gameState;
  while (gs.drawerOrder.length && !room.players.has(gs.drawerOrder[gs.drawerIndex])) {
    gs.drawerOrder.splice(gs.drawerIndex, 1);
    if (gs.drawerIndex >= gs.drawerOrder.length) gs.drawerIndex = 0;
  }
  if (!gs.drawerOrder.length) { endScribbleGame(room); return; }
  const drawerId = gs.drawerOrder[gs.drawerIndex];
  gs.phase='choosing'; gs.word=null; gs.masked=null;
  gs.revealedIndices=[]; gs.guessedThisRound=new Set(); gs.drawingData=[];
  const drawerName = room.players.get(drawerId)?.name;
  io.to(room.code).emit('scribble:turn_start', {
    drawerId, drawerName, round: gs.round, maxRounds: gs.maxRounds,
    scores: gs.scores, players: scribblePlayers(room),
  });
  const wordOpts = randWords(gs.wordChoices || 3);
  io.to(drawerId).emit('scribble:choose_word', { words: wordOpts });
  addTimer(room, () => {
    if (room.gameState?.phase === 'choosing' && !room.gameState.word)
      scribbleWordChosen(room, drawerId, wordOpts[0]);
  }, 15000);
}

function scribbleWordChosen(room, drawerId, word) {
  const gs = room.gameState; if (gs.phase !== 'choosing') return;
  gs.word=word; gs.phase='drawing'; gs.masked=maskWord(word); gs.roundStartTime=Date.now();
  io.to(drawerId).emit('scribble:draw_start', { word, masked: gs.masked, duration: gs.ROUND_DURATION });
  [...room.players.keys()].filter(id=>id!==drawerId).forEach(id =>
    io.to(id).emit('scribble:draw_start', { word: null, masked: gs.masked, duration: gs.ROUND_DURATION })
  );
  addTimer(room, () => sendHint(room), 40000);
  addTimer(room, () => sendHint(room), 55000);
  addTimer(room, () => { if (room.gameState?.phase==='drawing') endScribbleRound(room, false); }, gs.ROUND_DURATION*1000);
}

function sendHint(room) {
  const gs = room.gameState; if (!gs||gs.phase!=='drawing') return;
  const word = gs.word;
  const unrevealed = [...Array(word.length).keys()].filter(i=>word[i]!==' '&&!gs.revealedIndices.includes(i));
  if (!unrevealed.length) return;
  const idx = unrevealed[Math.floor(Math.random()*unrevealed.length)];
  gs.revealedIndices.push(idx); gs.masked = maskWord(word, gs.revealedIndices);
  const drawerId = gs.drawerOrder[gs.drawerIndex];
  [...room.players.keys()].filter(id=>id!==drawerId&&!gs.guessedThisRound.has(id))
    .forEach(id=>io.to(id).emit('scribble:hint',{masked:gs.masked}));
}

function endScribbleRound(room, allGuessed) {
  const gs = room.gameState; if (gs.phase!=='drawing'&&gs.phase!=='choosing') return;
  gs.phase='round_end';
  io.to(room.code).emit('scribble:round_end', { word:gs.word, scores:gs.scores, players:scribblePlayers(room), allGuessed });
  addTimer(room, () => advanceScribble(room), 5000);
}

function advanceScribble(room) {
  const gs = room.gameState;
  gs.drawerIndex++;
  if (gs.drawerIndex >= gs.drawerOrder.length) {
    gs.drawerIndex=0; gs.round++;
    if (gs.round > gs.maxRounds) { endScribbleGame(room); return; }
  }
  scribbleStartTurn(room);
}

function endScribbleGame(room) {
  const gs = room.gameState; gs.phase='game_over'; room.status='ended';
  const ranked = scribblePlayers(room).sort((a,b)=>(gs.scores[b.id]||0)-(gs.scores[a.id]||0));
  if (ranked[0]) recordResult(room, [ranked[0].id]);
  io.to(room.code).emit('scribble:game_over', { scores:gs.scores, players:ranked, winner:ranked[0] });
}

function scribbleAction(room, socket, data) {
  const gs = room.gameState; if (!gs) return;
  const drawerId = gs.drawerOrder[gs.drawerIndex];
  switch (data.action) {
    case 'choose_word':
      if (socket.id===drawerId&&gs.phase==='choosing') { clearTimers(room); scribbleWordChosen(room,drawerId,data.word); } break;
    case 'draw':
      if (socket.id!==drawerId||gs.phase!=='drawing') return;
      gs.drawingData.push(data.stroke); socket.to(room.code).emit('scribble:draw',{stroke:data.stroke}); break;
    case 'clear':
      if (socket.id!==drawerId||gs.phase!=='drawing') return;
      gs.drawingData=[]; io.to(room.code).emit('scribble:clear'); break;
    case 'fill':
      if (socket.id!==drawerId||gs.phase!=='drawing') return;
      gs.drawingData.push({type:'fill',x:data.x,y:data.y,color:data.color});
      socket.to(room.code).emit('scribble:draw',{stroke:{type:'fill',x:data.x,y:data.y,color:data.color}}); break;
  }
}

const scribblePlayers = room => {
  const gs = room.gameState;
  return [...room.players.values()].map(p => ({ id:p.id, name:p.name, score:gs?.scores?.[p.id]||0 }));
};

// ─────────────────────────── UNO ───────────────────────────

const UNO_COLORS = ['red', 'yellow', 'green', 'blue'];

function buildUnoDeck() {
  const deck = [];
  for (const color of UNO_COLORS) {
    deck.push({ color, value: '0' });
    for (let n = 1; n <= 9; n++) {
      deck.push({ color, value: String(n) }, { color, value: String(n) });
    }
    for (const v of ['skip', 'reverse', 'draw2']) {
      deck.push({ color, value: v }, { color, value: v });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'wild' });
    deck.push({ color: 'wild', value: 'wild4' });
  }
  return deck;
}

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function unoNextIdx(gs, steps) {
  const n = gs.playerOrder.length;
  return ((gs.currentPlayerIndex + gs.direction * steps) % n + n) % n;
}

function unoCanPlay(card, topCard, currentColor) {
  if (card.color === 'wild') return true;
  if (card.color === currentColor) return true;
  if (topCard && card.value === topCard.value) return true;
  return false;
}

function unoDrawN(gs, playerId, n) {
  for (let i = 0; i < n; i++) {
    if (gs.deck.length === 0) {
      if (gs.discardPile.length > 1) {
        const top = gs.discardPile.pop();
        gs.deck = shuffleArr(gs.discardPile);
        gs.discardPile = [top];
      } else break;
    }
    if (gs.deck.length > 0) gs.hands[playerId].push(gs.deck.shift());
  }
}

function unoPublic(gs) {
  return {
    discardTop: gs.discardPile[gs.discardPile.length - 1] || null,
    currentColor: gs.currentColor,
    currentPlayerId: gs.playerOrder[gs.currentPlayerIndex],
    direction: gs.direction,
    phase: gs.phase,
    awaitingPass: gs.awaitingPass,
    playerOrder: gs.playerOrder,
    cardCounts: Object.fromEntries(gs.playerOrder.map(id => [id, gs.hands[id]?.length ?? 0])),
    players: gs.players,
    unoSaid: gs.unoSaid,
    lastAction: gs.lastAction,
    deckCount: gs.deck.length,
  };
}

function startUno(room) {
  const players = [...room.players.values()].sort(() => Math.random() - 0.5);
  const deck = shuffleArr(buildUnoDeck());
  const hands = {};
  players.forEach(p => { hands[p.id] = []; });
  for (let i = 0; i < 7; i++) players.forEach(p => hands[p.id].push(deck.shift()));

  let startCard = deck.shift();
  while (startCard.color === 'wild') { deck.push(startCard); shuffleArr(deck); startCard = deck.shift(); }

  const playerOrder = players.map(p => p.id);
  room.gameState = {
    type: 'uno', deck, discardPile: [startCard],
    currentColor: startCard.color,
    playerOrder, currentPlayerIndex: 0, direction: 1,
    phase: 'playing', awaitingPass: false, drawnCardIndex: -1,
    hands, unoSaid: {}, lastAction: null,
    players: Object.fromEntries(players.map(p => [p.id, { id: p.id, name: p.name, avatar: p.avatar ?? 0 }])),
  };

  const gs = room.gameState;
  if (startCard.value === 'skip') {
    gs.currentPlayerIndex = unoNextIdx(gs, 1);
    io.to(room.code).emit('notification', `Starting card: Skip! ${players[0].name} loses first turn.`);
  } else if (startCard.value === 'reverse') {
    if (playerOrder.length > 2) gs.direction = -1;
    io.to(room.code).emit('notification', `Starting card: Reverse! Play order changed.`);
  } else if (startCard.value === 'draw2') {
    unoDrawN(gs, playerOrder[0], 2);
    gs.currentPlayerIndex = unoNextIdx(gs, 1);
    io.to(room.code).emit('notification', `Starting card: Draw Two! ${players[0].name} draws 2.`);
  }

  io.to(room.code).emit('uno:state', unoPublic(gs));
  players.forEach(p => io.to(p.id).emit('uno:hand', { hand: gs.hands[p.id] }));
}

function unoAction(room, socket, data) {
  const gs = room.gameState;
  if (!gs || gs.phase === 'game_over') return;
  switch (data.action) {
    case 'play_card':    unoPlayCard(room, socket, data.cardIndex); break;
    case 'draw':         unoDrawCard(room, socket); break;
    case 'pass':         unoPass(room, socket); break;
    case 'choose_color': unoChooseColor(room, socket, data.color); break;
  }
}

function unoPlayCard(room, socket, cardIndex) {
  const gs = room.gameState;
  if (socket.id !== gs.playerOrder[gs.currentPlayerIndex] || gs.phase !== 'playing') return;
  if (gs.awaitingPass && cardIndex !== gs.drawnCardIndex) return;
  const hand = gs.hands[socket.id];
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= hand.length) return;
  const card = hand[cardIndex];
  const topCard = gs.discardPile[gs.discardPile.length - 1];
  if (!unoCanPlay(card, topCard, gs.currentColor)) return;

  hand.splice(cardIndex, 1);
  gs.discardPile.push(card);
  if (card.color !== 'wild') gs.currentColor = card.color;
  gs.awaitingPass = false; gs.drawnCardIndex = -1;
  gs.lastAction = { type: 'play', playerId: socket.id, card };

  if (hand.length === 1) {
    gs.unoSaid[socket.id] = true;
    io.to(room.code).emit('notification', `${gs.players[socket.id]?.name} says UNO!`);
  } else if (hand.length > 1) {
    gs.unoSaid[socket.id] = false;
  }

  io.to(socket.id).emit('uno:hand', { hand });

  if (hand.length === 0) {
    io.to(room.code).emit('uno:state', unoPublic(gs));
    endUno(room, socket.id);
    return;
  }

  if (card.value === 'wild' || card.value === 'wild4') {
    gs.phase = 'choose_color';
    io.to(room.code).emit('uno:state', unoPublic(gs));
    io.to(socket.id).emit('uno:choose_color');
    return;
  }

  if (card.value === 'reverse') {
    gs.direction *= -1;
    gs.currentPlayerIndex = unoNextIdx(gs, gs.playerOrder.length === 2 ? 2 : 1);
  } else if (card.value === 'skip') {
    gs.currentPlayerIndex = unoNextIdx(gs, 2);
  } else if (card.value === 'draw2') {
    const nextIdx = unoNextIdx(gs, 1), nextId = gs.playerOrder[nextIdx];
    unoDrawN(gs, nextId, 2);
    io.to(nextId).emit('uno:hand', { hand: gs.hands[nextId] });
    io.to(room.code).emit('notification', `${gs.players[nextId]?.name} draws 2!`);
    gs.currentPlayerIndex = unoNextIdx(gs, 2);
  } else {
    gs.currentPlayerIndex = unoNextIdx(gs, 1);
  }

  io.to(room.code).emit('uno:state', unoPublic(gs));
}

function unoDrawCard(room, socket) {
  const gs = room.gameState;
  if (socket.id !== gs.playerOrder[gs.currentPlayerIndex] || gs.phase !== 'playing' || gs.awaitingPass) return;
  unoDrawN(gs, socket.id, 1);
  const drawnIndex = gs.hands[socket.id].length - 1;
  if (drawnIndex < 0) return;
  const drawnCard = gs.hands[socket.id][drawnIndex];
  const topCard = gs.discardPile[gs.discardPile.length - 1];
  const canPlay = unoCanPlay(drawnCard, topCard, gs.currentColor);
  gs.lastAction = { type: 'draw', playerId: socket.id };
  if (canPlay) {
    gs.awaitingPass = true;
    gs.drawnCardIndex = drawnIndex;
    io.to(socket.id).emit('uno:hand', { hand: gs.hands[socket.id], drawnIndex, canPlayDrawn: true });
  } else {
    gs.awaitingPass = false; gs.drawnCardIndex = -1;
    gs.currentPlayerIndex = unoNextIdx(gs, 1);
    io.to(socket.id).emit('uno:hand', { hand: gs.hands[socket.id], drawnIndex, canPlayDrawn: false });
  }
  io.to(room.code).emit('uno:state', unoPublic(gs));
}

function unoPass(room, socket) {
  const gs = room.gameState;
  if (socket.id !== gs.playerOrder[gs.currentPlayerIndex] || !gs.awaitingPass) return;
  gs.awaitingPass = false; gs.drawnCardIndex = -1;
  gs.currentPlayerIndex = unoNextIdx(gs, 1);
  gs.lastAction = { type: 'pass', playerId: socket.id };
  io.to(room.code).emit('uno:state', unoPublic(gs));
}

function unoChooseColor(room, socket, color) {
  const gs = room.gameState;
  if (socket.id !== gs.playerOrder[gs.currentPlayerIndex] || gs.phase !== 'choose_color') return;
  if (!UNO_COLORS.includes(color)) return;
  gs.currentColor = color;
  gs.phase = 'playing';
  gs.lastAction = { type: 'color', playerId: socket.id, color };
  const topCard = gs.discardPile[gs.discardPile.length - 1];
  if (topCard.value === 'wild4') {
    const nextIdx = unoNextIdx(gs, 1), nextId = gs.playerOrder[nextIdx];
    unoDrawN(gs, nextId, 4);
    io.to(nextId).emit('uno:hand', { hand: gs.hands[nextId] });
    io.to(room.code).emit('notification', `${gs.players[nextId]?.name} draws 4!`);
    gs.currentPlayerIndex = unoNextIdx(gs, 2);
  } else {
    gs.currentPlayerIndex = unoNextIdx(gs, 1);
  }
  io.to(room.code).emit('uno:state', unoPublic(gs));
}

function endUno(room, winnerId) {
  const gs = room.gameState;
  gs.phase = 'game_over';
  room.status = 'ended';
  recordResult(room, [winnerId], gs.playerOrder);
  io.to(room.code).emit('uno:game_over', {
    winnerId, winnerName: gs.players[winnerId]?.name,
    scores: Object.fromEntries(gs.playerOrder.map(id => [id, gs.hands[id]?.length ?? 0])),
    players: gs.players,
  });
}

// ─────────────────────────── QUIZ ───────────────────────────

const QUIZ_REVEAL_MS = 4000;
const QUIZ_DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

// Shipped question bank, used when opentdb.com is unreachable — or always, when
// QUIZ_SOURCE=offline. Stored as answer + wrong answers rather than a ready-made
// option list so the correct one never sits at a predictable index.
const QUIZ_LOCAL_BANK = require('./data/quiz-questions.json');

/** answer + wrong[] → the `{ question, correctAnswer, options }` shape clients get. */
function quizBuildQuestion({ question, answer, wrong, difficulty }) {
  return { question, correctAnswer: answer, options: shuffleArr([answer, ...wrong]), difficulty };
}

/** Easy first, hard last — the ramp the online path already relied on. */
function quizByDifficulty(questions) {
  return questions.sort((a, b) => (QUIZ_DIFF_ORDER[a.difficulty] ?? 0) - (QUIZ_DIFF_ORDER[b.difficulty] ?? 0));
}

/** `n` questions from the local bank. Caps at the bank size instead of repeating one. */
function quizLocalQuestions(n = 15) {
  const picked = shuffleArr(QUIZ_LOCAL_BANK.slice()).slice(0, Math.min(n, QUIZ_LOCAL_BANK.length));
  return quizByDifficulty(picked.map(quizBuildQuestion));
}

async function fetchQuizQuestions(n = 15) {
  const decode = s => decodeURIComponent(s);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 6000));
    const res = await fetch(`${config.quizApiUrl}?amount=${n}&type=multiple&encode=url3986`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.response_code === 5) continue;
    if (json.response_code !== 0) throw new Error(`OpenTDB code ${json.response_code}`);
    return quizByDifficulty(json.results.map(q => quizBuildQuestion({
      question: decode(q.question),
      answer: decode(q.correct_answer),
      wrong: q.incorrect_answers.map(decode),
      difficulty: q.difficulty,
    })));
  }
  throw new Error('Rate limited after retries');
}

/**
 * The questions for one game, plus where they came from.
 * `offline` never touches the network; `online` fails loudly, which is what an
 * instance that wants fresh trivia and nothing else asked for; `auto` — the
 * default — falls back to the bank so a LAN party without internet still plays.
 * `source` is a parameter rather than a straight `config` read so a test can drive
 * all three branches without rebuilding the config.
 */
async function loadQuizQuestions(n = 15, source = config.quizSource) {
  if (source === 'offline') return { questions: quizLocalQuestions(n), source: 'local' };
  try {
    return { questions: await fetchQuizQuestions(n), source: 'online' };
  } catch (err) {
    if (source === 'online') throw err;
    console.warn(`Quiz: ${config.quizApiUrl} unreachable (${err.message}) — falling back to the local bank.`);
    return { questions: quizLocalQuestions(n), source: 'local' };
  }
}

async function startQuiz(room) {
  if (room.status !== 'playing') return;
  const numQ        = room.settings?.numQuestions    ?? 15;
  const timeLimitMs = (room.settings?.timePerQuestion ?? 20) * 1000;
  const scores = {};
  const correctCounts = {};
  [...room.players.keys()].forEach(id => { scores[id] = 0; correctCounts[id] = 0; });
  room.gameState = { type: 'quiz', questions: [], currentQ: 0, phase: 'loading', answers: {}, results: null, scores, correctCounts, timeLimitMs, questionStartTime: 0 };
  io.to(room.code).emit('quiz:state', { phase: 'loading' });
  try {
    const { questions, source } = await loadQuizQuestions(numQ);
    if (room.status !== 'playing') return;
    room.gameState.questions = questions;
    room.gameState.phase = 'question';
    room.gameState.questionStartTime = Date.now();
    // Say so, rather than letting the room wonder why the questions look familiar.
    if (source === 'local') io.to(room.code).emit('notification', { key: 'quiz.offlineBank' });
    io.to(room.code).emit('quiz:state', quizPublic(room.gameState, room));
    addTimer(room, () => quizReveal(room), timeLimitMs);
  } catch (e) {
    console.error('Quiz start failed:', e);
    if (rooms.has(room.code)) {
      room.status = 'lobby';
      io.to(room.code).emit('game:back_to_lobby');
      io.to(room.code).emit('notification', { key: 'quiz.loadFailed' });
      broadcastLobby(room);
    }
  }
}

function quizPublic(gs, room) {
  const q = gs.questions[gs.currentQ];
  return {
    phase: gs.phase,
    questionIndex: gs.currentQ,
    totalQuestions: gs.questions.length,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    timeLimitMs: gs.timeLimitMs,
    startedAt: gs.questionStartTime,
    answersIn: Object.keys(gs.answers).length,
    totalPlayers: room.players.size,
    correctAnswer: gs.phase === 'question' ? null : q.correctAnswer,
    results: gs.phase === 'question' ? null : gs.results,
    scores: gs.scores,
    correctCounts: gs.correctCounts,
    players: Object.fromEntries([...room.players.values()].map(p => [p.id, { name: p.name, avatar: p.avatar ?? 0 }])),
  };
}

function quizAction(room, socket, data) {
  const gs = room.gameState;
  if (!gs || gs.phase !== 'question' || gs.answers[socket.id]) return;
  if (data.action !== 'answer') return;
  const answer = String(data.answer);
  const q = gs.questions[gs.currentQ];
  if (!q.options.includes(answer)) return;
  gs.answers[socket.id] = { answer, timeMs: Date.now() - gs.questionStartTime };
  socket.emit('quiz:answered', { answer });
  io.to(room.code).emit('quiz:state', quizPublic(gs, room));
  const answered = [...room.players.keys()].filter(id => gs.answers[id]).length;
  if (answered >= room.players.size) { clearTimers(room); quizReveal(room); }
}

function quizReveal(room) {
  const gs = room.gameState;
  if (!gs || gs.phase !== 'question') return;
  const q = gs.questions[gs.currentQ];

  const byTime = [...room.players.keys()]
    .filter(id => gs.answers[id]?.answer === q.correctAnswer)
    .sort((a, b) => gs.answers[a].timeMs - gs.answers[b].timeMs);
  const firstCorrectId = byTime[0] ?? null;

  const results = {};
  [...room.players.keys()].forEach(id => {
    const ans = gs.answers[id];
    const correct = ans?.answer === q.correctAnswer;
    let points = 0;
    if (correct) {
      const elapsed = Math.min(ans.timeMs, gs.timeLimitMs);
      points = Math.round(500 + 500 * (1 - elapsed / gs.timeLimitMs));
      if (id === firstCorrectId) points += 200;
      gs.correctCounts[id] = (gs.correctCounts[id] || 0) + 1;
    }
    if (gs.scores[id] !== undefined) gs.scores[id] += points;
    results[id] = { answer: ans?.answer ?? null, correct, points, firstCorrect: id === firstCorrectId && correct };
  });
  gs.results = results;
  gs.phase = 'reveal';
  io.to(room.code).emit('quiz:state', quizPublic(gs, room));
  const isLast = gs.currentQ >= gs.questions.length - 1;
  addTimer(room, () => isLast ? endQuiz(room) : advanceQuiz(room), QUIZ_REVEAL_MS);
}

function advanceQuiz(room) {
  const gs = room.gameState;
  gs.currentQ++;
  gs.answers = {};
  gs.results = null;
  gs.phase = 'question';
  gs.questionStartTime = Date.now();
  io.to(room.code).emit('quiz:state', quizPublic(gs, room));
  addTimer(room, () => quizReveal(room), gs.timeLimitMs);
}

function endQuiz(room) {
  const gs = room.gameState;
  gs.phase = 'gameover';
  const players = [...room.players.values()];
  recordResult(room, [players.sort((a, b) => (gs.scores[b.id] || 0) - (gs.scores[a.id] || 0))[0]?.id], players.map(p => p.id));
  io.to(room.code).emit('quiz:state', quizPublic(gs, room));
}

// ─────────────────────── CONNECT FOUR ───────────────────────

const C4_NEED = 4;

function startC4(room) {
  const players = [...room.players.values()].sort(() => Math.random() - 0.5);
  const cols = room.settings?.cols ?? 7;
  const rows = room.settings?.rows ?? 6;
  const R = players[0], Y = players[1];
  room.gameState = {
    type: 'connect4', cols, rows,
    board: Array(cols * rows).fill(null),
    players: { R: { id: R.id, name: R.name }, Y: { id: Y.id, name: Y.name } },
    currentTurn: R.id,
    winner: null, winLine: null, winnerDisc: null, lastMove: null,
    scores: { [R.id]: 0, [Y.id]: 0 },
    gameCount: 1, bestOf: room.settings?.bestOf ?? 0, matchWinner: null,
  };
  io.to(room.code).emit('c4:state', c4Public(room.gameState));
  io.to(R.id).emit('c4:disc', { disc: 'R' });
  io.to(Y.id).emit('c4:disc', { disc: 'Y' });
  players.slice(2).forEach(p => io.to(p.id).emit('c4:disc', { disc: null }));
}

function c4Drop(room, socket, col) {
  const gs = room.gameState;
  if (!gs.board || gs.winner || gs.matchWinner || gs.currentTurn !== socket.id) return;
  if (!Number.isInteger(col) || col < 0 || col >= gs.cols) return;
  const disc = gs.players.R.id === socket.id ? 'R' : gs.players.Y.id === socket.id ? 'Y' : null;
  if (!disc) return;
  // Gravity: the disc settles on the lowest free cell of the column.
  let row = -1;
  for (let r = gs.rows - 1; r >= 0; r--) if (gs.board[r * gs.cols + col] === null) { row = r; break; }
  if (row === -1) return;
  const idx = row * gs.cols + col;
  gs.board[idx] = disc;
  gs.lastMove = idx;

  const win = c4Win(gs.board, gs.cols, gs.rows, C4_NEED);
  if (win) {
    gs.winner = socket.id; gs.winnerDisc = disc; gs.winLine = win;
    gs.scores[socket.id] = (gs.scores[socket.id] || 0) + 1;
    if (gs.bestOf > 0 && gs.scores[socket.id] >= Math.ceil(gs.bestOf / 2)) {
      gs.matchWinner = socket.id;
      recordResult(room, [socket.id]);
    }
  } else if (gs.board.every(Boolean)) {
    gs.winner = 'draw';
  } else {
    gs.currentTurn = gs.currentTurn === gs.players.R.id ? gs.players.Y.id : gs.players.R.id;
  }
  io.to(room.code).emit('c4:state', c4Public(gs));
}

function c4NewGame(room) {
  const gs = room.gameState;
  if (!gs || gs.matchWinner) return;
  if (!gs.winner) return;   // the current game is still running
  // Colours swap so the first-move advantage does not stick to one seat.
  const tmp = gs.players.R; gs.players.R = gs.players.Y; gs.players.Y = tmp;
  gs.board = Array(gs.cols * gs.rows).fill(null);
  gs.currentTurn = gs.players.R.id;
  gs.winner = null; gs.winLine = null; gs.winnerDisc = null; gs.lastMove = null;
  gs.gameCount++;
  io.to(room.code).emit('c4:state', c4Public(gs));
  io.to(gs.players.R.id).emit('c4:disc', { disc: 'R' });
  io.to(gs.players.Y.id).emit('c4:disc', { disc: 'Y' });
}

function c4Win(board, cols, rows, need) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = board[r * cols + c];
      if (!v) continue;
      for (const [dr, dc] of dirs) {
        const line = [r * cols + c];
        for (let k = 1; k < need; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || board[nr * cols + nc] !== v) break;
          line.push(nr * cols + nc);
        }
        if (line.length === need) return line;
      }
    }
  }
  return null;
}

function c4Public(gs) {
  return {
    cols: gs.cols, rows: gs.rows, board: gs.board,
    currentTurn: gs.currentTurn, players: gs.players,
    winner: gs.winner, winLine: gs.winLine, winnerDisc: gs.winnerDisc, lastMove: gs.lastMove,
    scores: gs.scores, gameCount: gs.gameCount, bestOf: gs.bestOf, matchWinner: gs.matchWinner,
  };
}

// ─────────────────── ROCK PAPER SCISSORS ───────────────────

const RPS_MOVES = ['rock', 'paper', 'scissors'];
const RPS_BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const RPS_REVEAL_MS = 2800;

function startRPS(room) {
  const players = [...room.players.values()].sort(() => Math.random() - 0.5);
  const allPlayers = {};
  players.forEach(p => { allPlayers[p.id] = { id: p.id, name: p.name, avatar: p.avatar ?? 0 }; });
  room.gameState = {
    type: 'rps', allPlayers,
    rounds: buildTournamentRounds(players.map(p => p.id)),
    currentRound: 0, currentMatch: 0,
    bestOf: room.settings?.bestOf ?? 3,
    roundTime: room.settings?.roundTime ?? 12,
    match: null, tournamentWinner: null,
  };
  io.to(room.code).emit('rps:state', rpsPublic(room.gameState));
  addTimer(room, () => rpsAdvance(room), 2000);
}

function rpsAdvance(room) {
  const gs = room.gameState;
  if (!gs) return;
  propagateTournamentWinners(gs);
  const final = gs.rounds[gs.rounds.length - 1][0];
  if (final.winner) {
    gs.tournamentWinner = final.winner;
    gs.match = null;
    room.status = 'ended';
    recordResult(room, [gs.tournamentWinner], Object.keys(gs.allPlayers));
    io.to(room.code).emit('rps:state', rpsPublic(gs));
    return;
  }
  for (let r = 0; r < gs.rounds.length; r++) {
    for (let m = 0; m < gs.rounds[r].length; m++) {
      const match = gs.rounds[r][m];
      if (!match.winner && match.p1 && match.p2) {
        gs.currentRound = r; gs.currentMatch = m;
        rpsStartMatch(room, match.p1, match.p2);
        return;
      }
    }
  }
}

function rpsStartMatch(room, p1, p2) {
  const gs = room.gameState;
  if (!gs.allPlayers[p1] || !gs.allPlayers[p2]) { rpsAdvance(room); return; }
  gs.match = { p1, p2, scores: { [p1]: 0, [p2]: 0 }, roundNo: 1, matchWinner: null };
  rpsStartRound(room);
}

function rpsStartRound(room) {
  const gs = room.gameState, m = gs.match;
  m.phase = 'picking';
  m.picks = {};
  m.result = null;
  m.deadline = Date.now() + gs.roundTime * 1000;
  io.to(room.code).emit('rps:state', rpsPublic(gs));
  addTimer(room, () => { if (room.gameState?.match?.phase === 'picking') rpsResolveRound(room); }, gs.roundTime * 1000);
}

function rpsResolveRound(room) {
  const gs = room.gameState, m = gs.match;
  if (!m || m.phase !== 'picking') return;
  clearTimers(room);
  // A missing throw is filled in at random — a distracted player never stalls the bracket.
  [m.p1, m.p2].forEach(id => { if (!m.picks[id]) m.picks[id] = RPS_MOVES[Math.floor(Math.random() * RPS_MOVES.length)]; });
  const a = m.picks[m.p1], b = m.picks[m.p2];
  const roundWinner = a === b ? null : (RPS_BEATS[a] === b ? m.p1 : m.p2);
  if (roundWinner) m.scores[roundWinner]++;
  m.phase = 'reveal';
  m.result = { winner: roundWinner, picks: { ...m.picks } };
  const needed = Math.ceil(gs.bestOf / 2);
  m.matchWinner = [m.p1, m.p2].find(id => m.scores[id] >= needed) || null;
  io.to(room.code).emit('rps:state', rpsPublic(gs));

  if (m.matchWinner) {
    gs.rounds[gs.currentRound][gs.currentMatch].winner = m.matchWinner;
    addTimer(room, () => rpsAdvance(room), RPS_REVEAL_MS + 1400);
  } else {
    m.roundNo++;
    addTimer(room, () => rpsStartRound(room), RPS_REVEAL_MS);
  }
}

function rpsAction(room, socket, data) {
  const gs = room.gameState, m = gs?.match;
  if (data.action !== 'throw' || !m || m.phase !== 'picking') return;
  if (socket.id !== m.p1 && socket.id !== m.p2) return;
  if (m.picks[socket.id] || !RPS_MOVES.includes(data.pick)) return;
  m.picks[socket.id] = data.pick;
  socket.emit('rps:confirmed', { pick: data.pick });
  io.to(room.code).emit('rps:state', rpsPublic(gs));
  if (m.picks[m.p1] && m.picks[m.p2]) { clearTimers(room); addTimer(room, () => rpsResolveRound(room), 500); }
}

function rpsPublic(gs) {
  const m = gs.match;
  return {
    rounds: gs.rounds, allPlayers: gs.allPlayers,
    currentRound: gs.currentRound, currentMatch: gs.currentMatch,
    tournamentWinner: gs.tournamentWinner,
    bestOf: gs.bestOf, roundTime: gs.roundTime,
    match: m ? {
      p1: m.p1, p2: m.p2, scores: m.scores, roundNo: m.roundNo, phase: m.phase,
      // While the round is live only the *fact* of a throw travels; the throw
      // itself stays on the server until both players have committed.
      thrown: { [m.p1]: !!m.picks[m.p1], [m.p2]: !!m.picks[m.p2] },
      result: m.phase === 'reveal' ? m.result : null,
      matchWinner: m.matchWinner || null,
      deadline: m.phase === 'picking' ? m.deadline : null,
    } : null,
  };
}

// ─────────────────────── UNDERCOVER ───────────────────────

// Civilian word first, undercover word second — close enough to be mistaken for
// one another, far enough apart that a careless clue gives the impostor away.
const UC_WORD_PAIRS = [
  ['Coffee','Tea'], ['Cat','Dog'], ['Pizza','Burger'], ['Beach','Desert'],
  ['Guitar','Violin'], ['Winter','Autumn'], ['Bicycle','Motorbike'], ['Doctor','Nurse'],
  ['Movie','Series'], ['Lemon','Orange'], ['River','Lake'], ['Pencil','Pen'],
  ['Butter','Cheese'], ['Sofa','Bed'], ['Train','Bus'], ['Castle','Palace'],
  ['Painting','Photograph'], ['Snow','Rain'], ['Wolf','Fox'], ['Chess','Checkers'],
  ['Piano','Harp'], ['Soup','Stew'], ['Mountain','Hill'], ['Sword','Axe'],
  ['Wine','Beer'], ['Teacher','Coach'], ['Balloon','Kite'], ['Mirror','Window'],
  ['Candle','Lamp'], ['Honey','Syrup'], ['Boat','Ship'], ['Jacket','Sweater'],
  ['Library','Bookshop'], ['Salad','Sandwich'], ['Clock','Watch'], ['Island','Peninsula'],
  ['Magician','Clown'], ['Rocket','Airplane'], ['Ghost','Zombie'], ['Chocolate','Caramel'],
];

const UC_WHITE_GUESS_MS = 25000;

const ucAlive    = gs => Object.values(gs.playerData).filter(p => p.alive);
const ucAliveIds = gs => gs.order.filter(id => gs.playerData[id]?.alive);
const ucPub      = p  => ({ id: p.id, name: p.name, avatar: p.avatar ?? 0 });

function startUC(room) {
  const players = [...room.players.values()].sort(() => Math.random() - 0.5);
  const pair = UC_WORD_PAIRS[Math.floor(Math.random() * UC_WORD_PAIRS.length)];
  const [civWord, ucWord] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];

  // The impostor side must never start at parity, or the game is over on turn one.
  const maxImpostors = Math.max(1, Math.floor((players.length - 1) / 2));
  const withWhite = (room.settings?.mrWhite ?? 1) === 1 && players.length >= 5;
  const ucCount = Math.max(1, Math.min(room.settings?.undercoverCount ?? 1, maxImpostors - (withWhite ? 1 : 0)));

  const roles = [];
  for (let i = 0; i < ucCount; i++) roles.push('undercover');
  if (withWhite) roles.push('mrwhite');
  while (roles.length < players.length) roles.push('civilian');
  roles.sort(() => Math.random() - 0.5);

  const playerData = {};
  const order = [];
  players.forEach((p, i) => {
    const role = roles[i];
    playerData[p.id] = {
      id: p.id, name: p.name, avatar: p.avatar ?? 0, role,
      word: role === 'civilian' ? civWord : role === 'undercover' ? ucWord : null,
      alive: true, clue: null, vote: null,
    };
    order.push(p.id);
  });

  room.gameState = {
    type: 'undercover', phase: 'role_reveal', playerData, order,
    civilianWord: civWord, undercoverWord: ucWord,
    round: 1, speakerIndex: 0, speakOrder: [], clues: [], history: [],
    deadline: null, lastVote: null, whiteGuess: null, whiteId: null, result: null,
  };
  // The word is the whole secret: it goes to its owner alone, never to the room.
  players.forEach(p => io.to(p.id).emit('uc:word', { word: playerData[p.id].word }));
  io.to(room.code).emit('uc:state', ucPublic(room.gameState));
  addTimer(room, () => ucStartClues(room), 7000);
}

function ucStartClues(room) {
  const gs = room.gameState;
  if (!gs) return;
  gs.phase = 'clues';
  gs.clues = [];
  gs.lastVote = null;
  gs.whiteGuess = null;
  gs.whiteId = null;
  Object.values(gs.playerData).forEach(p => { p.clue = null; p.vote = null; });
  // The opening speaker rotates, so nobody has to give the blind first clue twice.
  const alive = ucAliveIds(gs);
  const shift = alive.length ? (gs.round - 1) % alive.length : 0;
  gs.speakOrder = alive.slice(shift).concat(alive.slice(0, shift));
  gs.speakerIndex = 0;
  ucNextSpeaker(room);
}

function ucNextSpeaker(room) {
  const gs = room.gameState;
  while (gs.speakerIndex < gs.speakOrder.length && !gs.playerData[gs.speakOrder[gs.speakerIndex]]?.alive) gs.speakerIndex++;
  if (gs.speakerIndex >= gs.speakOrder.length) { ucStartVoting(room); return; }
  const dur = room.settings?.clueTime ?? 30;
  gs.deadline = Date.now() + dur * 1000;
  io.to(room.code).emit('uc:state', ucPublic(gs));
  addTimer(room, () => {
    if (room.gameState?.phase !== 'clues') return;
    ucSubmitClue(room, gs.speakOrder[gs.speakerIndex], '');
  }, dur * 1000);
}

function ucSubmitClue(room, playerId, word) {
  const gs = room.gameState;
  if (!gs || gs.phase !== 'clues') return;
  if (gs.speakOrder[gs.speakerIndex] !== playerId) return;
  clearTimers(room);
  const clean = String(word || '').trim().replace(/\s+/g, ' ').slice(0, 24) || '—';
  gs.playerData[playerId].clue = clean;
  gs.clues.push({ playerId, name: gs.playerData[playerId].name, word: clean, round: gs.round });
  gs.speakerIndex++;
  ucNextSpeaker(room);
}

function ucStartVoting(room) {
  const gs = room.gameState;
  gs.phase = 'voting';
  Object.values(gs.playerData).forEach(p => { p.vote = null; });
  const dur = room.settings?.votingTime ?? 45;
  gs.deadline = Date.now() + dur * 1000;
  io.to(room.code).emit('uc:state', ucPublic(gs));
  addTimer(room, () => { if (room.gameState?.phase === 'voting') ucResolveVote(room); }, dur * 1000);
}

function ucResolveVote(room) {
  const gs = room.gameState;
  clearTimers(room);
  const tally = {};
  ucAlive(gs).forEach(p => { if (p.vote) tally[p.vote] = (tally[p.vote] || 0) + 1; });
  let max = 0, top = null, tied = false;
  Object.entries(tally).forEach(([pid, cnt]) => {
    if (cnt > max) { max = cnt; top = pid; tied = false; }
    else if (cnt === max) tied = true;
  });
  const victim = (!tied && top && max > 0) ? gs.playerData[top] : null;
  if (victim) {
    victim.alive = false;
    gs.history.push({ name: victim.name, role: victim.role, round: gs.round });
  }
  gs.phase = 'vote_result';
  gs.lastVote = {
    tied: !victim,
    eliminated: victim ? { ...ucPub(victim), role: victim.role, word: victim.word } : null,
    tally: Object.entries(tally).map(([pid, votes]) => ({ ...ucPub(gs.playerData[pid]), votes })),
  };
  io.to(room.code).emit('uc:state', ucPublic(gs));

  // Mr White gets one shot at naming the civilian word on the way out.
  if (victim?.role === 'mrwhite') { addTimer(room, () => ucStartWhiteGuess(room, victim.id), 4000); return; }

  const win = ucCheckWin(gs);
  if (win) { addTimer(room, () => endUC(room, win), 4000); return; }
  gs.round++;
  addTimer(room, () => ucStartClues(room), 4500);
}

function ucStartWhiteGuess(room, whiteId) {
  const gs = room.gameState;
  gs.phase = 'white_guess';
  gs.whiteId = whiteId;
  gs.whiteGuess = null;
  gs.deadline = Date.now() + UC_WHITE_GUESS_MS;
  io.to(room.code).emit('uc:state', ucPublic(gs));
  addTimer(room, () => { if (room.gameState?.phase === 'white_guess') ucWhiteGuess(room, whiteId, ''); }, UC_WHITE_GUESS_MS);
}

function ucWhiteGuess(room, whiteId, guess) {
  const gs = room.gameState;
  if (!gs || gs.phase !== 'white_guess' || gs.whiteId !== whiteId) return;
  clearTimers(room);
  const clean = String(guess || '').trim().slice(0, 40);
  const correct = clean.toLowerCase() === gs.civilianWord.toLowerCase();
  gs.whiteGuess = { guess: clean, correct };
  if (correct) { endUC(room, { winner: 'mrwhite', reason: 'guessed' }); return; }
  io.to(room.code).emit('uc:state', ucPublic(gs));
  const win = ucCheckWin(gs);
  if (win) { addTimer(room, () => endUC(room, win), 4000); return; }
  gs.round++;
  addTimer(room, () => ucStartClues(room), 4500);
}

function ucAction(room, socket, data) {
  const gs = room.gameState;
  const pd = gs?.playerData?.[socket.id];
  if (!pd) return;
  // Guessing is the one action a dead player still has — check it before `alive`.
  if (data.action === 'white_guess') { ucWhiteGuess(room, socket.id, data.guess); return; }
  if (!pd.alive) return;

  switch (data.action) {
    case 'clue':
      ucSubmitClue(room, socket.id, data.word);
      break;
    case 'vote': {
      if (gs.phase !== 'voting' || data.targetId === socket.id) return;
      const target = gs.playerData[data.targetId];
      if (!target?.alive) return;
      pd.vote = data.targetId;
      socket.emit('uc:vote_confirmed', { targetId: data.targetId, targetName: target.name });
      io.to(room.code).emit('uc:state', ucPublic(gs));
      if (ucAlive(gs).every(p => p.vote)) ucResolveVote(room);
      break;
    }
  }
}

function ucCheckWin(gs) {
  const alive = ucAlive(gs);
  const impostors = alive.filter(p => p.role !== 'civilian');
  if (!impostors.length) return { winner: 'civilians', reason: 'allFound' };
  if (impostors.length >= alive.length - impostors.length) return { winner: 'undercover', reason: 'outnumber' };
  return null;
}

function endUC(room, win) {
  const gs = room.gameState;
  gs.phase = 'game_over';
  gs.result = win;
  room.status = 'ended';
  const allIds = Object.keys(gs.playerData);
  const winnerIds = win.winner === 'civilians'
    ? allIds.filter(id => gs.playerData[id].role === 'civilian')
    : win.winner === 'mrwhite'
      ? allIds.filter(id => gs.playerData[id].role === 'mrwhite')
      : win.winner === 'undercover'
        ? allIds.filter(id => gs.playerData[id].role !== 'civilian')
        : [];
  recordResult(room, winnerIds, allIds);
  io.to(room.code).emit('uc:state', ucPublic(gs));
}

function ucPublic(gs) {
  const over = gs.phase === 'game_over';
  return {
    phase: gs.phase, round: gs.round,
    players: gs.order.filter(id => gs.playerData[id]).map(id => {
      const p = gs.playerData[id];
      // A living player's role is the whole game — it travels only once they are out.
      const reveal = over || !p.alive;
      return {
        ...ucPub(p), alive: p.alive, clue: p.clue, voted: !!p.vote,
        role: reveal ? p.role : null, word: reveal ? p.word : null,
      };
    }),
    clues: gs.clues, history: gs.history,
    speaker: gs.phase === 'clues' ? (gs.speakOrder[gs.speakerIndex] ?? null) : null,
    deadline: gs.deadline,
    votesCast: ucAlive(gs).filter(p => p.vote).length,
    votesTotal: ucAlive(gs).length,
    lastVote: gs.lastVote,
    whiteId: gs.phase === 'white_guess' ? gs.whiteId : null,
    whiteGuess: gs.whiteGuess,
    result: over ? gs.result : null,
    words: over ? { civilian: gs.civilianWord, undercover: gs.undercoverWord } : null,
  };
}

// ─────────────────────────── START ───────────────────────────

// Everything configurable lives in config.js, which reads `.env` — see .env.example.
const { port: PORT, host: HOST, mdnsHost: MDNS_HOST, mdnsEnabled: MDNS_ENABLED } = config;

// Only listen when started directly. `require('./server')` hands the tests the
// real game functions without opening a port or publishing over mDNS.
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    const bonjour = MDNS_ENABLED ? new Bonjour() : null;
    bonjour?.publish({ name: 'GameNight', type: 'http', port: PORT, host: MDNS_HOST });

    console.log('\n🎮  GameNight is live!\n');
    console.log(`  Local:    http://localhost:${PORT}`);
    if (MDNS_ENABLED) console.log(`  Network:  http://${MDNS_HOST}:${PORT}  ← share with friends!`);
    console.log('\n  Open in any browser on the same WiFi / LAN.\n');
    if (config.quizSource !== 'auto') console.log(`  Quiz questions: ${config.quizSource}\n`);

    // Nothing to unpublish when mDNS is off, but the room still has to close.
    const bye = () => (bonjour ? bonjour.unpublishAll(() => process.exit()) : process.exit());
    process.on('SIGINT', bye);
    process.on('SIGTERM', bye);
  });
}

// ─────────────────────────── EXPORTS ───────────────────────────
// Test surface only — nothing in public/ reads this, and server.js does not
// use it either. Everything here is driven from test/ with a hand-built room.
module.exports = {
  // room plumbing
  rooms, playerRooms, io, server,
  defaultSettings, validateSettings, minPlayers, broadcastLobby,
  addTimer, clearTimers, recordResult,
  sendReconnectState, handleAction, onPlayerDisconnect,
  // tournament bracket, shared by Tic Tac Toe and Rock Paper Scissors
  nextPow2, buildTournamentRounds, propagateTournamentWinners,
  // tic tac toe
  TTT_WIN_LENGTH, startTTT, tttMove, tttNewGame, tttWin, tttPublic,
  // connect four
  C4_NEED, startC4, c4Drop, c4NewGame, c4Win, c4Public,
  // rock paper scissors
  RPS_MOVES, RPS_BEATS, startRPS, rpsAction, rpsAdvance, rpsStartMatch, rpsStartRound,
  rpsResolveRound, rpsPublic,
  // undercover
  UC_WORD_PAIRS, startUC, ucAction, ucStartClues, ucNextSpeaker, ucSubmitClue,
  ucStartVoting, ucResolveVote, ucStartWhiteGuess, ucWhiteGuess, ucCheckWin, endUC,
  ucPublic, ucAlive,
  // mongolpuri
  startKD, kdAction, kdCheckWin, kdAlive, kdRole,
  // uno
  UNO_COLORS, buildUnoDeck, shuffleArr, unoCanPlay, unoNextIdx, unoDrawN, startUno,
  unoPlayCard, unoPublic,
  // scribble
  WORDS, maskWord, randWords, startScribble, scribbleStartTurn, scribbleWordChosen,
  scribblePlayers,
  // quiz
  startQuiz, quizPublic, QUIZ_LOCAL_BANK, quizBuildQuestion, quizLocalQuestions, loadQuizQuestions,
};
