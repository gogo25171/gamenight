const Connect4 = (() => {
  let myDisc = null;      // 'R' | 'Y' | null (spectator)
  let state = null;
  let builtSize = '';     // "cols×rows" the DOM grid was built for

  const DISC_LABEL = { R: '🔴', Y: '🟡' };

  function init() {
    // The grid is rebuilt whenever the host changes the board size, so clicks are
    // delegated from the container instead of bound to individual cells.
    document.getElementById('c4-board').addEventListener('click', e => {
      const cell = e.target.closest('.c4-cell');
      if (!cell) return;
      dropIn(+cell.dataset.c);
    });

    document.getElementById('btn-c4-again').addEventListener('click', () => {
      App.socket.emit('game:action', { action: 'new_game' });
    });
    document.getElementById('btn-c4-new-match').addEventListener('click', () => {
      App.socket.emit('game:restart');
    });
    document.getElementById('btn-c4-lobby').addEventListener('click', () => {
      App.socket.emit('game:back_to_lobby');
    });
    document.getElementById('c4-leave').addEventListener('click', () => {
      showConfirm(t('common.confirmExit'), () => location.reload(), { confirmText: t('common.exitBtn'), danger: true });
    });

    I18n.onChange(() => { if (state) onState(state); });
  }

  function dropIn(col) {
    if (!state || state.winner || state.matchWinner) return;
    if (state.currentTurn !== App.myId) return;
    App.socket.emit('game:action', { action: 'drop', col });
  }

  function onDisc({ disc }) {
    myDisc = disc;
    document.getElementById('c4-spectating').classList.toggle('hidden', !!disc);
  }

  function onState(s) {
    state = s;
    buildGrid(s.cols, s.rows);
    renderBoard();
    renderScores();
    renderStatus();
    document.getElementById('c4-spectating').classList.toggle('hidden', !!myDisc);
  }

  function onPlayerLeft({ name }) {
    toast(t('c4.playerLeft', { name }));
  }

  function buildGrid(cols, rows) {
    const key = `${cols}x${rows}`;
    if (key === builtSize) return;
    const board = document.getElementById('c4-board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'c4-cell';
        cell.dataset.i = r * cols + c;
        cell.dataset.c = c;
        const disc = document.createElement('span');
        disc.className = 'c4-disc';
        cell.appendChild(disc);
        board.appendChild(cell);
      }
    }
    builtSize = key;
  }

  function renderBoard() {
    const myTurn = state.currentTurn === App.myId && !state.winner && !state.matchWinner;
    document.querySelectorAll('#c4-board .c4-cell').forEach(cell => {
      const i = +cell.dataset.i;
      const val = state.board[i];
      cell.className = 'c4-cell'
        + (val ? ` filled ${val === 'R' ? 'r-disc' : 'y-disc'}` : '')
        + (state.winLine?.includes(i) ? ' win-cell' : '')
        + (state.lastMove === i ? ' c4-drop' : '')
        + (myTurn ? ' playable' : '');
    });
  }

  function renderScores() {
    const { players, scores, bestOf } = state;
    ['R', 'Y'].forEach(disc => {
      const p = players[disc];
      document.getElementById(`c4-name-${disc}`).textContent = p.name + (p.id === App.myId ? ` ${t('common.youSuffix')}` : '');
      document.getElementById(`c4-pts-${disc}`).textContent = scores[p.id] || 0;
      const card = document.getElementById(`c4-score-${disc}`);
      card.classList.toggle('active-turn', state.currentTurn === p.id && !state.winner);
      renderKickBtn(card, p.id, p.name);
    });
    const label = document.getElementById('c4-match-label');
    label.textContent = bestOf > 0 ? t('settings.opt.bestOf', { n: bestOf }) : t('settings.opt.freePlay');
  }

  function renderKickBtn(card, playerId, playerName) {
    card.querySelectorAll('.c4-kick-btn').forEach(b => b.remove());
    if (!App.isHost || playerId === App.myId) return;
    const btn = document.createElement('button');
    btn.className = 'btn-host-ctrl btn-kick-ctrl c4-kick-btn';
    btn.title = t('common.kickNamed', { name: playerName });
    btn.textContent = '🚫';
    btn.addEventListener('click', () => {
      showConfirm(t('common.confirmKick', { name: playerName }), () => App.socket.emit('room:kick', { playerId }), { confirmText: t('common.kick'), danger: true });
    });
    card.appendChild(btn);
  }

  function renderStatus() {
    const result = document.getElementById('c4-result');
    const status = document.getElementById('c4-status');
    const hostOnly = document.getElementById('c4-host-only');
    const againBtn = document.getElementById('btn-c4-again');
    const newMatchBtn = document.getElementById('btn-c4-new-match');

    if (state.matchWinner) {
      const mw = state.players.R.id === state.matchWinner ? state.players.R : state.players.Y;
      result.classList.remove('hidden');
      document.getElementById('c4-result-text').textContent = state.matchWinner === App.myId
        ? t('c4.youWonMatch', { n: state.bestOf })
        : t('c4.playerWonMatch', { name: mw.name, n: state.bestOf });
      hostOnly.style.display = App.isHost ? 'flex' : 'none';
      againBtn.classList.add('hidden');
      newMatchBtn.classList.remove('hidden');
      status.textContent = '';
      return;
    }

    if (state.winner) {
      result.classList.remove('hidden');
      let msg;
      if (state.winner === 'draw') {
        msg = t('c4.draw');
      } else {
        const winner = state.players[state.winnerDisc];
        msg = winner.id === App.myId ? t('c4.youWin') : t('c4.playerWins', { name: winner.name });
      }
      document.getElementById('c4-result-text').textContent = msg;
      hostOnly.style.display = App.isHost ? 'flex' : 'none';
      againBtn.classList.remove('hidden');
      newMatchBtn.classList.add('hidden');
      status.textContent = '';
      return;
    }

    result.classList.add('hidden');
    if (!myDisc) {
      status.textContent = t('common.spectating');
    } else if (state.currentTurn === App.myId) {
      status.textContent = t('c4.yourTurn', { disc: DISC_LABEL[myDisc] });
    } else {
      const other = state.currentTurn === state.players.R.id ? state.players.R : state.players.Y;
      status.textContent = t('c4.otherTurn', { name: other.name });
    }
  }

  return { init, onDisc, onState, onPlayerLeft };
})();
