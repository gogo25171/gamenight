const Scribble = (() => {
  let canvas, ctx;
  let isDrawing = false;
  let tool = 'pencil';
  let color = '#000000';
  let brushSize = 5;
  let isDrawer = false;
  let hasGuessed = false;
  let timerInterval = null;
  let myDrawerId = null;
  let lastX = 0, lastY = 0;
  let drawBuffer = [];
  let flushTimer = null;
  // Gestures the drawer could still undo. Counted optimistically as they draw, and
  // replaced by the server's own count on every redraw, which is the authority.
  let undoableActions = 0;
  // The word, but only once this client is entitled to it — the drawer from the
  // start, a guesser once they get it, everyone at the reveal. It only ever names
  // the downloaded file, so it must never be set from something we shouldn't know.
  let knownWord = null;

  function init() {
    canvas = document.getElementById('scb-canvas');
    ctx = canvas.getContext('2d');
    setupCanvasEvents();
    setupTools();

    document.getElementById('scb-undo').addEventListener('click', requestUndo);
    document.getElementById('scb-download').addEventListener('click', downloadDrawing);
    // Ctrl+Z is what anyone who has ever drawn on a screen will reach for. Ignored
    // while a text field has focus, so it does not fight the browser's own undo.
    document.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      if (App.gameType !== 'scribble' || !isDrawer) return;
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return;
      e.preventDefault();
      requestUndo();
    });

    document.getElementById('scb-chat-send').addEventListener('click', sendChat);
    document.getElementById('scb-chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
    document.getElementById('scb-btn-again').addEventListener('click', () => App.socket.emit('game:restart'));
    document.getElementById('scb-btn-lobby').addEventListener('click', () => App.socket.emit('game:back_to_lobby'));
    document.getElementById('scb-btn-exit').addEventListener('click', () => {
      showConfirm('Exit the game? You will leave the room.', () => location.reload(), { confirmText: 'Exit', danger: true });
    });

    App.socket.on('scribble:turn_start', onTurnStart);
    App.socket.on('scribble:choose_word', onChooseWord);
    App.socket.on('scribble:draw_start', onDrawStart);
    App.socket.on('scribble:draw', onRemoteDraw);
    App.socket.on('scribble:clear', () => clearCanvas(false));
    App.socket.on('scribble:redraw', onRedraw);
    App.socket.on('scribble:hint', ({ masked }) => setWordDisplay(masked));
    App.socket.on('scribble:guess_event', onGuessEvent);
    App.socket.on('scribble:correct_guess', onCorrectGuess);
    App.socket.on('scribble:round_end', onRoundEnd);
    App.socket.on('scribble:game_over', onGameOver);
    App.socket.on('chat:message', onChatMessage);
  }

  // ─── Canvas setup ───

  /**
   * Pointer position → bitmap pixel.
   *
   * The bitmap is a fixed 800×500 while the element is stretched by the flex
   * layout, and `object-fit: contain` fits the bitmap inside that box without
   * distorting it — so the drawing is letterboxed, and the box is *not* where the
   * pixels are. Scaling each axis by the box alone put the ink beside the cursor,
   * off by half the bars and worse the further from the centre you drew.
   * Kept free of `canvas`/DOM so the maths can be unit-tested.
   */
  function pointerToBitmap(rect, bmpW, bmpH, clientX, clientY) {
    const scale = Math.min(rect.width / bmpW, rect.height / bmpH);
    const left = rect.left + (rect.width - bmpW * scale) / 2;
    const top = rect.top + (rect.height - bmpH * scale) / 2;
    return { x: (clientX - left) / scale, y: (clientY - top) / scale };
  }

  function getPos(clientX, clientY) {
    return pointerToBitmap(canvas.getBoundingClientRect(), canvas.width, canvas.height, clientX, clientY);
  }

  function setupCanvasEvents() {
    canvas.addEventListener('mousedown', e => { if (!isDrawer) return; const p = getPos(e.clientX, e.clientY); startDraw(p.x, p.y); });
    canvas.addEventListener('mousemove', e => { if (!isDrawer || !isDrawing) return; const p = getPos(e.clientX, e.clientY); continueDraw(p.x, p.y); });
    canvas.addEventListener('mouseup', () => endDraw());
    canvas.addEventListener('mouseleave', () => endDraw());

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (!isDrawer) return;
      const t = e.touches[0]; const p = getPos(t.clientX, t.clientY);
      startDraw(p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!isDrawer || !isDrawing) return;
      const t = e.touches[0]; const p = getPos(t.clientX, t.clientY);
      continueDraw(p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('touchend', () => endDraw());
  }

  // The eraser is deliberately fatter than the pencil at the same slider value —
  // rubbing out is a coarser gesture than drawing. The multiplier has to be applied
  // once, here, and travel *inside* the stroke: applying it only to the drawer's own
  // canvas is what made a wide erased band arrive everywhere else as a thin white
  // line, and come back thin on the drawer's own screen after an undo repaint.
  const ERASER_SCALE = 3;

  /** The width a stroke is actually painted at, on every screen in the room. */
  function strokeWidth(activeTool, size) {
    return activeTool === 'eraser' ? size * ERASER_SCALE : size;
  }

  /** The eraser paints the canvas background rather than cutting a hole in it. */
  function strokeColor(activeTool, activeColor) {
    return activeTool === 'eraser' ? '#ffffff' : activeColor;
  }

  function canvasCoords(nx, ny) {
    return { x: nx * canvas.width, y: ny * canvas.height };
  }

  function normalizeCoords(x, y) {
    return { nx: x / canvas.width, ny: y / canvas.height };
  }

  function startDraw(x, y) {
    // The letterbox bars are part of the element but not of the bitmap: a click
    // there is not a click on the drawing.
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    if (tool === 'fill') {
      floodFill(Math.round(x), Math.round(y), color);
      const n = normalizeCoords(x, y);
      App.socket.emit('game:action', { action: 'fill', nx: n.nx, ny: n.ny, color });
      countAction();
      return;
    }
    isDrawing = true;
    lastX = x; lastY = y;
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawBuffer.push({
      type: 'begin', nx: x / canvas.width, ny: y / canvas.height,
      color: strokeColor(tool, color), size: strokeWidth(tool, brushSize), tool,
    });
    countAction();
    scheduleFlush();
  }

  function continueDraw(x, y) {
    if (!isDrawing) return;
    ctx.strokeStyle = strokeColor(tool, color);
    ctx.lineWidth = strokeWidth(tool, brushSize);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y);
    lastX = x; lastY = y;
    drawBuffer.push({ type: 'point', nx: x / canvas.width, ny: y / canvas.height });
    scheduleFlush();
  }

  function endDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.beginPath();
    drawBuffer.push({ type: 'end' });
    flushDrawBuffer();
  }

  function scheduleFlush() {
    if (!flushTimer) flushTimer = setTimeout(flushDrawBuffer, 50);
  }

  function flushDrawBuffer() {
    flushTimer = null;
    if (!drawBuffer.length) return;
    drawBuffer.forEach(stroke => App.socket.emit('game:action', { action: 'draw', stroke }));
    drawBuffer = [];
  }

  // ─── Undo ───

  /** Sets how many gestures can still be undone, and the button's state with it. */
  function setUndoableActions(n) {
    undoableActions = Math.max(0, n);
    const btn = document.getElementById('scb-undo');
    if (btn) btn.disabled = undoableActions === 0;
  }

  function countAction() { setUndoableActions(undoableActions + 1); }

  function requestUndo() {
    if (!isDrawer || undoableActions === 0) return;
    // Send whatever is buffered first, or the server would undo the stroke before
    // it hears the end of it.
    flushDrawBuffer();
    App.socket.emit('game:action', { action: 'undo' });
  }

  /**
   * The server removed an action and sent the whole remaining log. A raster canvas
   * cannot un-draw a line, so the only honest answer is to repaint from scratch.
   */
  function onRedraw({ drawingData, actions }) {
    clearCanvas(false);
    replayDrawingData(drawingData);
    setUndoableActions(actions ?? 0);
  }

  // ─── Remote drawing ───
  let remoteCtx = { color: '#000', size: 5, active: false };

  function onRemoteDraw({ stroke }) {
    switch (stroke.type) {
      case 'begin': {
        remoteCtx = { color: stroke.color, size: stroke.size, tool: stroke.tool, active: true };
        const { x, y } = canvasCoords(stroke.nx, stroke.ny);
        ctx.beginPath(); ctx.moveTo(x, y);
        break;
      }
      case 'point': {
        if (!remoteCtx.active) return;
        const { x, y } = canvasCoords(stroke.nx, stroke.ny);
        ctx.strokeStyle = remoteCtx.color;
        ctx.lineWidth = remoteCtx.size;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y);
        break;
      }
      case 'end':
        remoteCtx.active = false;
        ctx.beginPath();
        break;
      case 'fill': {
        const { x, y } = canvasCoords(stroke.nx, stroke.ny);
        floodFill(Math.round(x), Math.round(y), stroke.color);
        break;
      }
      // Clear is a log entry rather than an emptied log, so that undo can bring
      // the drawing back — which means a replay has to be able to apply it.
      case 'clear':
        clearCanvas(false);
        break;
    }
  }

  function replayDrawingData(data) {
    (data || []).forEach(stroke => onRemoteDraw({ stroke }));
  }

  // ─── Flood fill ───
  function floodFill(startX, startY, fillColor) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const idx = (startY * w + startX) * 4;
    const target = [data[idx], data[idx+1], data[idx+2], data[idx+3]];
    const fill = hexToRgba(fillColor);
    if (target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2]) return;

    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) continue;
      const key = cy * w + cx;
      if (visited.has(key)) continue;
      visited.add(key);
      const i = key * 4;
      if (!colorMatch(data, i, target)) continue;
      data[i] = fill[0]; data[i+1] = fill[1]; data[i+2] = fill[2]; data[i+3] = 255;
      stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function colorMatch(data, idx, target) {
    return Math.abs(data[idx]-target[0]) < 30 && Math.abs(data[idx+1]-target[1]) < 30 && Math.abs(data[idx+2]-target[2]) < 30;
  }

  function hexToRgba(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return [r, g, b, 255];
  }

  function clearCanvas(emit = true) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (emit) { App.socket.emit('game:action', { action: 'clear' }); countAction(); }
  }

  // ─── Saving the drawing ───

  /**
   * The canvas over an opaque white sheet. A canvas nobody has cleared yet is
   * transparent, and a transparent PNG shows a black drawing on black in most
   * viewers — so the sheet is not cosmetic.
   */
  function drawingAsPng() {
    const sheet = document.createElement('canvas');
    sheet.width = canvas.width;
    sheet.height = canvas.height;
    const sctx = sheet.getContext('2d');
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 0, sheet.width, sheet.height);
    sctx.drawImage(canvas, 0, 0);
    return sheet.toDataURL('image/png');
  }

  /** `gamenight-scribble-ice-cream-2026-09-10-18-04.png`, word included only if known. */
  function drawingFileName() {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const slug = (knownWord || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `gamenight-scribble${slug ? '-' + slug : ''}-${stamp}.png`;
  }

  function downloadDrawing() {
    const link = document.createElement('a');
    link.href = drawingAsPng();
    link.download = drawingFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // ─── Tools ───

  /** Shows the width the active tool really paints at — the eraser is wider. */
  function updateSizeLabel() {
    document.getElementById('scb-size-label').textContent = `${strokeWidth(tool, brushSize)}px`;
  }

  function setupTools() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tool = btn.dataset.tool;
        canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
        updateSizeLabel();
      });
    });

    document.getElementById('scb-color').addEventListener('input', e => {
      color = e.target.value;
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    });

    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        color = dot.dataset.color;
        document.getElementById('scb-color').value = color;
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        if (tool === 'eraser') {
          tool = 'pencil';
          document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('[data-tool="pencil"]').classList.add('active');
          canvas.style.cursor = 'crosshair';
          updateSizeLabel();
        }
      });
    });

    document.getElementById('scb-size').addEventListener('input', e => {
      brushSize = +e.target.value;
      updateSizeLabel();
    });

    document.getElementById('scb-clear').addEventListener('click', () => clearCanvas(true));
  }

  function setDrawerMode(drawing) {
    isDrawer = drawing;
    canvas.classList.toggle('not-drawing', !drawing);
    document.getElementById('scb-tools').classList.toggle('hidden', !drawing);
  }

  // ─── Word display ───
  function setWordDisplay(masked) {
    document.getElementById('scb-word-display').textContent = masked || '';
  }

  // ─── Timer ───
  function startTimer(seconds) {
    clearInterval(timerInterval);
    let rem = seconds;
    const el = document.getElementById('scb-timer');
    function tick() {
      const m = Math.floor(rem/60), s = rem%60;
      el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
      el.classList.toggle('danger', rem <= 15);
      canvas.classList.toggle('scb-canvas-urgent', rem <= 10 && isDrawer);
      rem--;
      if (rem < 0) clearInterval(timerInterval);
    }
    tick();
    timerInterval = setInterval(tick, 1000);
  }

  // ─── Player list ───
  function renderPlayers(players, drawerId, guessedSet) {
    const list = document.getElementById('scb-player-list');
    list.innerHTML = '';
    players.forEach(p => {
      const item = document.createElement('div');
      const isDrawing = p.id === drawerId;
      const didGuess = guessedSet ? guessedSet.has(p.id) : false;
      item.className = `scb-player-item${isDrawing ? ' drawing' : didGuess ? ' guessed' : ''}`;
      item.dataset.playerId = p.id;
      const av = document.createElement('div');
      av.className = 'scb-mini-av';
      av.style.background = avatarColor(p.name);
      av.textContent = p.name.slice(0,2).toUpperCase();
      const name = document.createElement('div');
      name.className = 'scb-pname';
      name.textContent = (isDrawing ? '✏️ ' : '') + p.name + (p.id === App.myId ? ' (you)' : '');
      const score = document.createElement('div');
      score.className = 'scb-score';
      score.textContent = p.score || 0;
      item.appendChild(av); item.appendChild(name); item.appendChild(score);
      if (App.isHost && p.id !== App.myId) {
        const kickBtn = document.createElement('button');
        kickBtn.className = 'btn-host-ctrl btn-kick-ctrl scb-kick-btn';
        kickBtn.title = `Kick ${p.name}`;
        kickBtn.textContent = '🚫';
        kickBtn.addEventListener('click', e => {
          e.stopPropagation();
          showConfirm(`Kick ${p.name}?`, () => App.socket.emit('room:kick', { playerId: p.id }), { confirmText: 'Kick', danger: true });
        });
        item.appendChild(kickBtn);
      }
      list.appendChild(item);
    });
  }

  function updatePlayerScore(playerId, newScore) {
    const item = document.querySelector(`[data-player-id="${playerId}"]`);
    if (item) item.querySelector('.scb-score').textContent = newScore;
  }

  // ─── Chat ───
  function addChatMsg(playerName, message, type = '') {
    const msgs = document.getElementById('scb-chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg' + (type ? ` ${type}` : '');
    if (!playerName || type === 'system') {
      div.textContent = message;
    } else {
      div.innerHTML = `<span class="msg-name" style="color:${avatarColor(playerName)}">${escHtml(playerName)}:</span><span class="msg-text">${escHtml(message)}</span>`;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function sendChat() {
    const input = document.getElementById('scb-chat-input');
    const msg = input.value.trim();
    if (!msg || isDrawer || hasGuessed) return;
    App.socket.emit('chat:send', { message: msg });
    input.value = '';
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── Socket handlers ───
  function onStart({ players, maxRounds }) {
    clearCanvas(false);
    hasGuessed = false;
    setUndoableActions(0);
    knownWord = null;
    document.getElementById('scb-chat-messages').innerHTML = '';
    document.getElementById('scb-overlay-gameover').classList.add('hidden');
    document.getElementById('scb-overlay-round-end').classList.add('hidden');
    document.getElementById('scb-overlay-guessed').classList.add('hidden');
    renderPlayers(players, null);
  }

  function onReconnect({ phase, drawerId, scores, drawingData, masked, players, round, maxRounds, actions }) {
    myDrawerId = drawerId;
    setDrawerMode(drawerId === App.myId);
    document.getElementById('scb-round-label').textContent = `Round ${round} / ${maxRounds}`;
    if (masked) setWordDisplay(masked);
    renderPlayers(players, drawerId);
    clearCanvas(false);
    replayDrawingData(drawingData);
    setUndoableActions(actions ?? 0);
  }

  function onTurnStart({ drawerId, drawerName, round, maxRounds, scores, players }) {
    myDrawerId = drawerId;
    hasGuessed = false;
    setUndoableActions(0);
    knownWord = null;
    canvas.classList.remove('scb-canvas-urgent');
    clearCanvas(false);
    document.getElementById('scb-chat-messages').innerHTML = '';
    document.getElementById('scb-overlay-round-end').classList.add('hidden');
    document.getElementById('scb-overlay-guessed').classList.add('hidden');
    document.getElementById('scb-round-label').textContent = `Round ${round} / ${maxRounds}`;
    renderPlayers(players, drawerId);
    setWordDisplay('');
    setDrawerMode(drawerId === App.myId);
    document.getElementById('scb-drawer-label').textContent =
      drawerId === App.myId ? '✏️ Your turn to draw!' : `✏️ ${drawerName} is drawing`;
    document.getElementById('scb-chat-input').disabled = drawerId === App.myId;
    clearInterval(timerInterval);
    document.getElementById('scb-timer').textContent = '–:––';
    // Hide chooser overlay for guessers
    if (drawerId !== App.myId) document.getElementById('scb-word-chooser').classList.add('hidden');
  }

  function onChooseWord({ words }) {
    const chooser = document.getElementById('scb-word-chooser');
    chooser.classList.remove('hidden');
    const opts = document.getElementById('scb-word-options');
    opts.innerHTML = '';
    let countdown = 15;
    const countEl = document.getElementById('scb-choose-countdown');
    const t = setInterval(() => { countdown--; countEl.textContent = `Auto-selecting in ${countdown}s…`; if (countdown <= 0) clearInterval(t); }, 1000);
    words.forEach(w => {
      const btn = document.createElement('button');
      btn.className = 'scb-word-opt';
      btn.textContent = w;
      btn.addEventListener('click', () => {
        clearInterval(t);
        App.socket.emit('game:action', { action: 'choose_word', word: w });
        chooser.classList.add('hidden');
      });
      opts.appendChild(btn);
    });
  }

  function onDrawStart({ word, masked, duration }) {
    document.getElementById('scb-word-chooser').classList.add('hidden');
    if (word) {
      knownWord = word;
      document.getElementById('scb-word-display').textContent = `Draw: ${word}`;
    } else {
      setWordDisplay(masked);
    }
    startTimer(duration);
  }

  function onGuessEvent({ playerId, playerName, correct, scores }) {
    if (correct) {
      addChatMsg(null, `✅ ${playerName} guessed the word!`, 'system');
      const item = document.querySelector(`[data-player-id="${playerId}"]`);
      if (item) item.classList.add('guessed');
      // Update all scores from the scores map
      Object.entries(scores || {}).forEach(([id, pts]) => updatePlayerScore(id, pts));
    }
  }

  function showGuessBurst() {
    const el = document.getElementById('scb-overlay-guessed');
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    ['🎉','🎊','⭐','✨','🌟','🎈'].forEach((em, i) => {
      const span = document.createElement('span');
      span.className = 'scb-burst-particle';
      const angle = (i / 6) * Math.PI * 2;
      span.textContent = em;
      span.style.cssText = `left:${cx}px;top:${cy}px;--dx:${(Math.cos(angle)*80).toFixed(0)}px;--dy:${(Math.sin(angle)*80).toFixed(0)}px`;
      document.body.appendChild(span);
      setTimeout(() => span.remove(), 950);
    });
  }

  function onCorrectGuess({ word, points }) {
    hasGuessed = true;
    knownWord = word;
    document.getElementById('scb-chat-input').disabled = true;
    const el = document.getElementById('scb-overlay-guessed');
    el.textContent = `🎉 Correct! +${points} points`;
    el.classList.remove('hidden', 'scb-guess-pop');
    void el.offsetWidth;
    el.classList.add('scb-guess-pop');
    showGuessBurst();
    setTimeout(() => el.classList.add('hidden'), 4000);
    setWordDisplay(word);
  }

  function onRoundEnd({ word, scores, players, allGuessed }) {
    clearInterval(timerInterval);
    knownWord = word || knownWord;
    setUndoableActions(0);
    setDrawerMode(false);
    renderPlayers(players, null);
    canvas.classList.remove('scb-canvas-urgent');
    const overlay = document.getElementById('scb-overlay-round-end');
    const wordEl = overlay.querySelector('strong');
    wordEl.textContent = '';
    (word || '—').split('').forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'scb-letter-flip';
      span.style.animationDelay = `${i * 0.07}s`;
      span.textContent = ch;
      wordEl.appendChild(span);
    });
    const scoreList = document.getElementById('scb-overlay-scores');
    scoreList.innerHTML = '';
    const sorted = [...players].sort((a,b) => (scores[b.id]||0) - (scores[a.id]||0));
    sorted.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = `overlay-score-item rank-${i+1}`;
      row.innerHTML = `<span class="osi-rank">#${i+1}</span><span class="osi-name">${p.name}</span><span class="osi-pts">${scores[p.id]||0}</span>`;
      scoreList.appendChild(row);
    });
    overlay.classList.remove('hidden');
  }

  function onGameOver({ scores, players, winner }) {
    clearInterval(timerInterval);
    document.getElementById('scb-overlay-round-end').classList.add('hidden');
    const overlay = document.getElementById('scb-overlay-gameover');
    const scoreList = document.getElementById('scb-final-scores');
    scoreList.innerHTML = '';
    players.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = `overlay-score-item rank-${i+1}`;
      row.innerHTML = `<span class="osi-rank">${i === 0 ? '🏆' : `#${i+1}`}</span><span class="osi-name">${p.name}${p.id === App.myId ? ' (you)' : ''}</span><span class="osi-pts">${scores[p.id]||0}</span>`;
      scoreList.appendChild(row);
    });
    document.getElementById('scb-btn-again').style.display = App.isHost ? 'inline-block' : 'none';
    document.getElementById('scb-btn-lobby').style.display = App.isHost ? 'inline-block' : 'none';
    overlay.classList.remove('hidden');
  }

  function onChatMessage({ playerName, message }) {
    if (App.gameType !== 'scribble') return;
    addChatMsg(playerName, message);
  }

  return { init, onStart, onReconnect };
})();
