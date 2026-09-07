const Undercover = (() => {
  let state = null;
  let myWord = undefined;   // undefined = not received yet, null = Mr White
  let wordHidden = true;
  let votedFor = null;
  let timerId = null;

  const ROLE_ICON = { civilian: '🧑', undercover: '🕵️', mrwhite: '⬜' };

  function init() {
    document.getElementById('uc-toggle-word').addEventListener('click', () => {
      wordHidden = !wordHidden;
      renderWordCard();
    });

    document.getElementById('uc-clue-send').addEventListener('click', sendClue);
    document.getElementById('uc-clue-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') sendClue();
    });

    document.getElementById('uc-white-send').addEventListener('click', sendWhiteGuess);
    document.getElementById('uc-white-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') sendWhiteGuess();
    });

    document.getElementById('uc-chat-send').addEventListener('click', sendChat);
    document.getElementById('uc-chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') sendChat();
    });

    document.getElementById('uc-btn-again').addEventListener('click', () => App.socket.emit('game:restart'));
    document.getElementById('uc-btn-lobby').addEventListener('click', () => App.socket.emit('game:back_to_lobby'));
    document.getElementById('uc-btn-exit').addEventListener('click', () => {
      showConfirm(t('common.confirmExit'), () => location.reload(), { confirmText: t('common.exitBtn'), danger: true });
    });

    App.socket.on('chat:message', onChatMessage);
    App.socket.on('uc:vote_confirmed', ({ targetId }) => { votedFor = targetId; renderVoting(); });

    I18n.onChange(() => { renderWordCard(); if (state) onState(state); });
  }

  function onWord({ word }) {
    myWord = word;
    wordHidden = true;
    renderWordCard();
  }

  function onState(s) {
    const newRound = !state || s.round !== state.round;
    state = s;
    if (newRound) votedFor = null;
    if (s.phase === 'role_reveal') {
      document.getElementById('uc-chat-messages').innerHTML = '';
      votedFor = null;
    }

    showPhase(s.phase);
    renderWordCard();
    renderPlayers();
    renderClues();
    renderSpeaker();
    renderVoting();
    renderVoteResult();
    renderWhiteGuess();
    renderGameOver();
    renderTimer();
    renderChatState();
  }

  function me() { return state?.players.find(p => p.id === App.myId) || null; }
  function amAlive() { return !!me()?.alive; }

  // ─── Phases ───
  function showPhase(phase) {
    const map = {
      role_reveal: 'uc-phase-reveal',
      clues: 'uc-phase-clues',
      voting: 'uc-phase-voting',
      vote_result: 'uc-phase-vote-result',
      white_guess: 'uc-phase-white',
      game_over: 'uc-phase-gameover',
    };
    document.querySelectorAll('#view-undercover .uc-phase').forEach(el => el.classList.remove('active'));
    document.getElementById(map[phase] || 'uc-phase-reveal')?.classList.add('active');
  }

  function renderWordCard() {
    const wordEl = document.getElementById('uc-word');
    const noteEl = document.getElementById('uc-word-note');
    const btn = document.getElementById('uc-toggle-word');
    if (myWord === undefined) { wordEl.textContent = '…'; noteEl.textContent = ''; return; }

    if (myWord === null) {
      // Mr White knows they are Mr White — that blank card is the role.
      wordEl.textContent = wordHidden ? '••••' : '⬜';
      noteEl.textContent = t('uc.mrWhiteNote');
    } else {
      wordEl.textContent = wordHidden ? '••••' : myWord;
      noteEl.textContent = t('uc.wordNote');
    }
    btn.textContent = t(wordHidden ? 'kd.show' : 'kd.hide');
    document.getElementById('uc-you-status').textContent = t(amAlive() ? 'kd.alive' : 'uc.eliminated');
  }

  function renderPlayers() {
    const list = document.getElementById('uc-player-list');
    list.innerHTML = '';
    state.players.forEach(p => {
      const row = document.createElement('div');
      row.className = 'uc-player-row' + (p.alive ? '' : ' dead') + (p.id === state.speaker ? ' speaking' : '');
      const av = document.createElement('span');
      av.className = 'uc-player-emoji';
      av.textContent = AVATARS[p.avatar ?? 0].emoji;
      const nameEl = document.createElement('span');
      nameEl.className = 'uc-player-name';
      nameEl.textContent = p.name + (p.id === App.myId ? ` ${t('common.you')}` : '');
      row.appendChild(av);
      row.appendChild(nameEl);
      if (!p.alive && p.role) {
        const tag = document.createElement('span');
        tag.className = `uc-role-tag role-${p.role}`;
        tag.textContent = `${ROLE_ICON[p.role]} ${t('uc.role.' + p.role)}`;
        row.appendChild(tag);
      } else if (state.phase === 'voting' && p.voted) {
        const tag = document.createElement('span');
        tag.className = 'uc-voted-tag';
        tag.textContent = '✓';
        row.appendChild(tag);
      }
      list.appendChild(row);
    });
  }

  function renderClues() {
    const list = document.getElementById('uc-clue-list');
    list.innerHTML = '';
    (state.clues || []).forEach(c => {
      const row = document.createElement('div');
      row.className = 'uc-clue-row';
      row.innerHTML = `<span class="uc-clue-name" style="color:${avatarColor(c.name)}">${escHtml(c.name)}</span>` +
        `<span class="uc-clue-word">${escHtml(c.word)}</span>`;
      list.appendChild(row);
    });
    list.scrollTop = list.scrollHeight;
    document.getElementById('uc-round-label').textContent = t('uc.roundN', { n: state.round });
  }

  function renderSpeaker() {
    const isMine = state.phase === 'clues' && state.speaker === App.myId;
    const box = document.getElementById('uc-clue-input-box');
    box.classList.toggle('hidden', !isMine);
    const speakerName = state.players.find(p => p.id === state.speaker)?.name;
    document.getElementById('uc-speaker-label').textContent = state.phase !== 'clues'
      ? ''
      : isMine ? t('uc.yourClue') : t('uc.waitingClue', { name: speakerName || '?' });
    if (isMine) {
      const input = document.getElementById('uc-clue-input');
      input.disabled = false;
      input.focus();
    }
  }

  function sendClue() {
    if (state?.speaker !== App.myId) return;
    const input = document.getElementById('uc-clue-input');
    const word = input.value.trim();
    if (!word) return;
    App.socket.emit('game:action', { action: 'clue', word });
    input.value = '';
    input.disabled = true;
  }

  function renderVoting() {
    if (!state) return;
    const grid = document.getElementById('uc-vote-targets');
    grid.innerHTML = '';
    if (state.phase !== 'voting') return;

    state.players.filter(p => p.alive && p.id !== App.myId).forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'vote-card' + (votedFor === p.id ? ' selected' : '');
      btn.disabled = !amAlive() || !!votedFor;
      btn.innerHTML = `<span class="vote-emoji">${AVATARS[p.avatar ?? 0].emoji}</span>` +
        `<span class="vote-name">${escHtml(p.name)}</span>` +
        `<span class="vote-clue">${escHtml(p.clue || '—')}</span>`;
      btn.addEventListener('click', () => {
        if (votedFor || !amAlive()) return;
        App.socket.emit('game:action', { action: 'vote', targetId: p.id });
      });
      grid.appendChild(btn);
    });

    document.getElementById('uc-vote-progress').textContent =
      t('uc.votesCast', { cast: state.votesCast, total: state.votesTotal });
    document.getElementById('uc-voted-notice').classList.toggle('hidden', !votedFor);
    document.getElementById('uc-dead-notice').classList.toggle('hidden', amAlive());
  }

  function renderVoteResult() {
    if (state.phase !== 'vote_result' || !state.lastVote) return;
    const { tied, eliminated, tally } = state.lastVote;
    document.getElementById('uc-elim-msg').textContent = tied
      ? t('uc.voteTied')
      : t('uc.eliminatedMsg', { name: eliminated.name });

    const reveal = document.getElementById('uc-elim-reveal');
    reveal.classList.toggle('hidden', !eliminated);
    if (eliminated) {
      reveal.innerHTML = `<div class="uc-reveal-icon">${ROLE_ICON[eliminated.role]}</div>` +
        `<div class="uc-reveal-role role-${eliminated.role}">${escHtml(t('uc.role.' + eliminated.role))}</div>` +
        `<div class="uc-reveal-word">${eliminated.word ? escHtml(t('uc.theirWord', { word: eliminated.word })) : escHtml(t('uc.noWord'))}</div>`;
    }

    const detail = document.getElementById('uc-vote-detail');
    detail.innerHTML = '';
    (tally || []).sort((a, b) => b.votes - a.votes).forEach(v => {
      const row = document.createElement('div');
      row.className = 'vote-detail-row';
      row.textContent = t('uc.votesFor', { name: v.name, count: v.votes });
      detail.appendChild(row);
    });
  }

  function renderWhiteGuess() {
    if (state.phase !== 'white_guess') return;
    const isWhite = state.whiteId === App.myId;
    const guessed = !!state.whiteGuess;
    document.getElementById('uc-white-box').classList.toggle('hidden', !isWhite || guessed);
    document.getElementById('uc-white-wait').classList.toggle('hidden', isWhite || guessed);

    const outcome = document.getElementById('uc-white-outcome');
    outcome.classList.toggle('hidden', !guessed);
    if (guessed) {
      outcome.textContent = state.whiteGuess.correct
        ? t('uc.whiteCorrect', { word: state.whiteGuess.guess })
        : t('uc.whiteWrong', { word: state.whiteGuess.guess || '—' });
    }
  }

  function renderGameOver() {
    if (state.phase !== 'game_over') return;
    const { result, words } = state;
    document.getElementById('uc-win-icon').textContent =
      result.winner === 'civilians' ? '🧑' : result.winner === 'mrwhite' ? '⬜' : '🕵️';
    document.getElementById('uc-win-title').textContent = t('uc.win.' + result.winner);
    document.getElementById('uc-win-reason').textContent = t('uc.reason.' + result.reason);
    document.getElementById('uc-final-words').textContent = words
      ? t('uc.finalWords', { civilian: words.civilian, undercover: words.undercover })
      : '';

    const grid = document.getElementById('uc-final-players');
    grid.innerHTML = '';
    state.players.forEach(p => {
      const card = document.createElement('div');
      card.className = `uc-final-card role-${p.role}` + (p.alive ? '' : ' dead');
      card.innerHTML = `<div class="uc-final-emoji">${AVATARS[p.avatar ?? 0].emoji}</div>` +
        `<div class="uc-final-name">${escHtml(p.name)}</div>` +
        `<div class="uc-final-role">${ROLE_ICON[p.role]} ${escHtml(t('uc.role.' + p.role))}</div>`;
      grid.appendChild(card);
    });

    document.getElementById('uc-gameover-actions').style.display = App.isHost ? 'flex' : 'none';
  }

  function sendWhiteGuess() {
    const input = document.getElementById('uc-white-input');
    const guess = input.value.trim();
    if (!guess) return;
    App.socket.emit('game:action', { action: 'white_guess', guess });
    input.value = '';
    document.getElementById('uc-white-box').classList.add('hidden');
  }

  // Clue and vote phases live in different panels, so both clocks are driven together.
  function renderTimer() {
    clearInterval(timerId);
    const els = ['uc-timer', 'uc-timer-vote'].map(id => document.getElementById(id));
    const timed = ['clues', 'voting', 'white_guess'].includes(state.phase);
    if (!timed || !state.deadline) { els.forEach(el => el.classList.add('hidden')); return; }
    els.forEach(el => el.classList.remove('hidden'));
    const deadline = state.deadline;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      const mins = Math.floor(left / 60), secs = left % 60;
      const label = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : String(left);
      els.forEach(el => { el.textContent = label; el.classList.toggle('urgent', left <= 5); });
      if (left <= 0) clearInterval(timerId);
    };
    tick();
    timerId = setInterval(tick, 250);
  }

  function renderChatState() {
    const open = amAlive() && state.phase !== 'role_reveal' && state.phase !== 'game_over';
    document.getElementById('uc-chat-input').disabled = !open;
    document.getElementById('uc-chat-send').disabled = !open;
  }

  function onChatMessage({ playerName, message }) {
    if (App.gameType !== 'undercover') return;
    const box = document.getElementById('uc-chat-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    msg.innerHTML = `<span class="msg-name" style="color:${avatarColor(playerName)}">${escHtml(playerName)}:</span>` +
      `<span class="msg-text">${escHtml(message)}</span>`;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  }

  function sendChat() {
    const input = document.getElementById('uc-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    App.socket.emit('chat:send', { message: msg });
    input.value = '';
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, onWord, onState };
})();
