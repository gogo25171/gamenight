const RPS = (() => {
  let state = null;
  let myPick = null;      // cleared at the start of every round
  let lastRoundKey = '';  // "matchIndex:roundNo" — tells a new round from a re-render
  let timerId = null;

  const MOVES = ['rock', 'paper', 'scissors'];
  const EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };

  function init() {
    document.querySelectorAll('.rps-move').forEach(btn => {
      btn.addEventListener('click', () => {
        const pick = btn.dataset.move;
        if (myPick || !MOVES.includes(pick)) return;
        if (!state?.match || state.match.phase !== 'picking') return;
        if (App.myId !== state.match.p1 && App.myId !== state.match.p2) return;
        App.socket.emit('game:action', { action: 'throw', pick });
      });
    });

    document.getElementById('btn-rps-again').addEventListener('click', () => {
      App.socket.emit('game:restart');
    });
    document.getElementById('btn-rps-lobby').addEventListener('click', () => {
      App.socket.emit('game:back_to_lobby');
    });
    document.getElementById('rps-leave').addEventListener('click', () => {
      showConfirm(t('common.confirmExit'), () => location.reload(), { confirmText: t('common.exitBtn'), danger: true });
    });

    App.socket.on('rps:confirmed', ({ pick }) => { myPick = pick; renderMoves(); });

    I18n.onChange(() => { if (state) onState(state); });
  }

  function onState(s) {
    state = s;
    const m = s.match;

    // A fresh round wipes the local pick — the server never echoes it back.
    const key = m ? `${s.currentRound}:${s.currentMatch}:${m.roundNo}` : '';
    if (key !== lastRoundKey) { myPick = null; lastRoundKey = key; }

    renderBracket();
    renderMatch();
    renderMoves();
    renderTimer();
    renderResult();
  }

  function amPlaying() {
    return !!state?.match && (App.myId === state.match.p1 || App.myId === state.match.p2);
  }

  function name(id) { return state.allPlayers[id]?.name || '?'; }

  function roundLabel(idx, total) {
    if (idx < 0 || idx === total - 1) return t('ttt.final');
    if (idx === total - 2 && total > 2) return t('ttt.semifinal');
    return t('ttt.round', { n: idx + 1 });
  }

  function renderBracket() {
    const bracket = document.getElementById('rps-bracket');
    bracket.innerHTML = '';
    state.rounds.forEach((matches, ri) => {
      const col = document.createElement('div');
      col.className = 'bracket-round bracket-round-slide';
      col.style.animationDelay = `${ri * 0.12}s`;
      const label = document.createElement('div');
      label.className = 'bracket-round-label';
      label.textContent = roundLabel(ri, state.rounds.length);
      col.appendChild(label);

      matches.forEach((match, mi) => {
        if (match.isBye && !match.winner) return;   // unresolvable bye — nothing to show
        const card = document.createElement('div');
        const isActive = !state.tournamentWinner && ri === state.currentRound && mi === state.currentMatch;
        card.className = 'bracket-match' + (isActive ? ' active' : '');

        const slot = playerId => {
          const el = document.createElement('div');
          el.className = 'bm-player' + (match.winner === playerId ? ' winner' : '') + (!playerId ? ' tbd' : '');
          el.textContent = playerId ? name(playerId) : t('ttt.tbd');
          if (playerId === App.myId) {
            const tag = document.createElement('span');
            tag.className = 'bm-you';
            tag.textContent = ` ${t('common.you')}`;
            el.appendChild(tag);
          }
          return el;
        };

        const vs = document.createElement('div');
        vs.className = 'bm-vs';
        vs.textContent = match.isBye ? t('ttt.bye') : t('ttt.vsLower');

        card.appendChild(slot(match.p1));
        card.appendChild(vs);
        card.appendChild(slot(match.p2));
        col.appendChild(card);
      });

      bracket.appendChild(col);
    });
  }

  function renderMatch() {
    const m = state.match;
    const info = document.getElementById('rps-match-info');
    const arena = document.getElementById('rps-arena');
    const over = document.getElementById('rps-gameover');

    if (state.tournamentWinner) {
      arena.classList.add('hidden');
      over.classList.remove('hidden');
      const isMe = state.tournamentWinner === App.myId;
      document.getElementById('rps-winner-name').textContent = isMe ? t('common.youExcl') : name(state.tournamentWinner);
      document.getElementById('rps-host-only').style.display = App.isHost ? 'flex' : 'none';
      info.textContent = t('ttt.tournamentComplete');
      return;
    }

    over.classList.add('hidden');
    if (!m) {
      arena.classList.add('hidden');
      info.textContent = t('ttt.settingUpBracket');
      return;
    }

    arena.classList.remove('hidden');
    info.textContent = t('ttt.matchLine', {
      round: roundLabel(state.currentRound, state.rounds.length),
      p1: name(m.p1), p2: name(m.p2),
    });

    document.getElementById('rps-name-1').textContent = name(m.p1) + (m.p1 === App.myId ? ` ${t('common.youSuffix')}` : '');
    document.getElementById('rps-name-2').textContent = name(m.p2) + (m.p2 === App.myId ? ` ${t('common.youSuffix')}` : '');
    document.getElementById('rps-pts-1').textContent = m.scores[m.p1] ?? 0;
    document.getElementById('rps-pts-2').textContent = m.scores[m.p2] ?? 0;
    document.getElementById('rps-round-label').textContent =
      t('rps.roundOf', { n: m.roundNo, best: state.bestOf });

    // While picks are hidden the hand shows only whether a throw has landed.
    const revealed = m.phase === 'reveal' && m.result;
    [['1', m.p1], ['2', m.p2]].forEach(([slot, pid]) => {
      const hand = document.getElementById(`rps-hand-${slot}`);
      hand.classList.toggle('thrown', !!m.thrown[pid]);
      hand.classList.toggle('rps-reveal-pop', revealed);
      hand.textContent = revealed ? EMOJI[m.result.picks[pid]] : (m.thrown[pid] ? '✊' : '❔');
    });

    document.getElementById('rps-spectating').classList.toggle('hidden', amPlaying());
  }

  function renderMoves() {
    const m = state.match;
    const panel = document.getElementById('rps-moves');
    const canThrow = !!m && m.phase === 'picking' && amPlaying() && !myPick;
    panel.classList.toggle('hidden', !amPlaying() || !m);
    document.querySelectorAll('.rps-move').forEach(btn => {
      btn.disabled = !canThrow;
      btn.classList.toggle('picked', myPick === btn.dataset.move);
    });
    const waiting = document.getElementById('rps-waiting');
    waiting.classList.toggle('hidden', !(myPick && m?.phase === 'picking'));
    waiting.textContent = t('rps.waitingOpponent');
  }

  function renderTimer() {
    clearInterval(timerId);
    const el = document.getElementById('rps-timer');
    const deadline = state.match?.phase === 'picking' ? state.match.deadline : null;
    if (!deadline) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      el.textContent = left;
      el.classList.toggle('urgent', left <= 3);
      if (left <= 0) clearInterval(timerId);
    };
    tick();
    timerId = setInterval(tick, 250);
  }

  function renderResult() {
    const m = state.match;
    const el = document.getElementById('rps-round-result');
    if (!m || m.phase !== 'reveal' || !m.result) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    if (m.matchWinner) {
      el.textContent = m.matchWinner === App.myId
        ? t('rps.youWinMatch')
        : t('rps.playerWinsMatch', { name: name(m.matchWinner) });
    } else if (!m.result.winner) {
      el.textContent = t('rps.tie');
    } else {
      el.textContent = m.result.winner === App.myId
        ? t('rps.youWinRound')
        : t('rps.playerWinsRound', { name: name(m.result.winner) });
    }
  }

  return { init, onState };
})();
