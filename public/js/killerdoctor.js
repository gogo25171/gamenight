const KillerDoctor = (() => {
  let myRole = null;
  let roleVisible = true;
  let timerInterval = null;
  let tensionShown = false;
  let ambientInterval = null;
  // Kept so a language change can redraw the sidebar without a server round-trip.
  let lastLiving = [], lastDead = [], isDead = false;
  let history = [];

  const ROLE_INFO = {
    killer:   { icon: '🔪', color: '#ef4444' },
    doctor:   { icon: '💉', color: '#10b981' },
    villager: { icon: '🧑', color: '#94a3b8' },
  };
  function roleName(role) { return role ? t(`kd.role.${role}`) : '—'; }
  function roleDesc(role) { return role ? t(`kd.role.${role}.desc`) : ''; }

  function getAvatar(p) {
    return AVATARS[p?.avatar ?? 0] || AVATARS[0];
  }

  function init() {
    document.getElementById('kd-toggle-role').addEventListener('click', toggleRole);

    document.getElementById('kd-chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') sendChat();
    });
    document.getElementById('kd-chat-send').addEventListener('click', sendChat);
    document.getElementById('kd-btn-again').addEventListener('click', () => App.socket.emit('game:restart'));
    document.getElementById('kd-btn-lobby').addEventListener('click', () => App.socket.emit('game:back_to_lobby'));
    document.getElementById('kd-btn-exit').addEventListener('click', () => {
      showConfirm(t('common.confirmExit'), () => location.reload(), { confirmText: t('common.exitBtn'), danger: true });
    });

    App.socket.on('kd:night_start', onNightStart);
    App.socket.on('kd:night_progress', ({ confirmed, total }) => {
      const el = document.getElementById('kd-night-progress');
      el.textContent = t('kd.progressConfirmed', { done: confirmed, total });
      el.classList.remove('hidden');
    });
    App.socket.on('kd:action_confirmed', onActionConfirmed);
    App.socket.on('kd:night_result', onNightResult);
    App.socket.on('kd:day_start', onDayStart);
    App.socket.on('kd:voting_start', onVotingStart);
    App.socket.on('kd:vote_update', onVoteUpdate);
    App.socket.on('kd:vote_confirmed', onVoteConfirmed);
    App.socket.on('kd:vote_result', onVoteResult);
    App.socket.on('kd:game_over', onGameOver);
    App.socket.on('chat:message', onChatMessage);

    I18n.onChange(() => {
      if (myRole !== null) setRole(myRole, !isDead);
      renderPlayerList(lastLiving, lastDead);
      renderHistory();
    });
  }

  function setPhase(phase) {
    document.querySelectorAll('.kd-phase').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`kd-phase-${phase}`);
    if (el) el.classList.add('active');
    clearInterval(timerInterval);
  }

  function startTimer(elId, seconds) {
    clearInterval(timerInterval);
    const el = document.getElementById(elId);
    let remaining = seconds;
    function tick() {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
      el.classList.toggle('danger', remaining <= 15);
      remaining--;
      if (remaining < 0) clearInterval(timerInterval);
    }
    tick();
    timerInterval = setInterval(tick, 1000);
  }

  function toggleRole() {
    roleVisible = !roleVisible;
    const card = document.getElementById('kd-role-card');
    const roleNameEl = document.getElementById('kd-role-name');
    const charEl = document.getElementById('kd-role-character');
    const descEl = document.getElementById('kd-role-desc');
    const btn = document.getElementById('kd-toggle-role');
    if (roleVisible) {
      const info = ROLE_INFO[myRole] || {};
      roleNameEl.textContent = `${info.icon || ''} ${roleName(myRole)}`;
      charEl.classList.remove('hidden');
      descEl.classList.remove('hidden');
      card.classList.remove('hidden-role');
      btn.textContent = t('kd.hide');
    } else {
      roleNameEl.textContent = t('kd.hidden');
      charEl.classList.add('hidden');
      descEl.classList.add('hidden');
      card.classList.add('hidden-role');
      btn.textContent = t('kd.show');
    }
  }

  function setRole(role, alive = true) {
    myRole = role;
    isDead = !alive;
    const av = AVATARS[App.myAvatar ?? 0] || AVATARS[0];
    const card = document.getElementById('kd-role-card');
    card.dataset.role = role;
    document.getElementById('kd-role-desc').textContent = roleDesc(role);
    document.getElementById('kd-role-character').textContent = `${av.emoji} ${avatarName(av)}`;
    document.getElementById('kd-you-status').textContent = t(alive ? 'kd.alive' : 'kd.dead');
    roleVisible = false;
    card.classList.add('hidden-role');
    document.getElementById('kd-role-name').textContent = t('kd.hidden');
    document.getElementById('kd-role-character').classList.add('hidden');
    document.getElementById('kd-role-desc').classList.add('hidden');
    document.getElementById('kd-toggle-role').textContent = t('kd.show');
  }

  function renderPlayerList(living, dead) {
    lastLiving = living || [];
    lastDead = dead || [];
    const list = document.getElementById('kd-player-list');
    list.innerHTML = '';
    const aliveCount = lastLiving.length;
    list.classList.toggle('kd-tension', aliveCount === 3);
    if (aliveCount === 3 && !tensionShown && myRole !== null) {
      tensionShown = true;
      toast(t('kd.finalThree'), 4000, 'warning');
    }
    const all = [...(living || []).map(p => ({...p, alive: true})), ...(dead || []).map(p => ({...p, alive: false}))];
    all.forEach(p => {
      const item = document.createElement('div');
      item.className = 'kd-player-item' + (p.alive ? '' : ' dead');
      const av = getAvatar(p);
      const charIcon = document.createElement('div');
      charIcon.className = 'player-char-icon';
      charIcon.textContent = av.emoji;
      charIcon.title = avatarName(av);
      const nameWrap = document.createElement('div');
      nameWrap.className = 'player-name-wrap';
      nameWrap.textContent = p.name;
      if (p.id === App.myId) {
        const tag = document.createElement('span');
        tag.className = 'you-tag'; tag.textContent = ` ${t('common.you')}`;
        nameWrap.appendChild(tag);
      }
      item.appendChild(charIcon);
      item.appendChild(nameWrap);
      if (!p.alive) { const skull = document.createElement('span'); skull.textContent = '💀'; item.appendChild(skull); }
      if (App.isHost && p.id !== App.myId) {
        const kickBtn = document.createElement('button');
        kickBtn.className = 'btn-host-ctrl btn-kick-ctrl kd-kick-btn';
        kickBtn.title = t('common.kickNamed', { name: p.name });
        kickBtn.textContent = '🚫';
        kickBtn.addEventListener('click', e => {
          e.stopPropagation();
          showConfirm(t('common.confirmKick', { name: p.name }), () => App.socket.emit('room:kick', { playerId: p.id }), { confirmText: t('common.kick'), danger: true });
        });
        item.appendChild(kickBtn);
      }
      list.appendChild(item);
    });
  }

  // History lines are stored as keys, not sentences: switching language must
  // re-translate what already happened, not just what happens next.
  function addHistory(key, params) {
    history.unshift({ key, params });
    renderHistory();
  }

  function renderHistory() {
    const hist = document.getElementById('kd-history');
    hist.innerHTML = '';
    history.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.textContent = t(entry.key, entry.params);
      hist.appendChild(item);
    });
  }

  const ANIM_CONFIG = {
    kill:          { emojis: ['🩸','💀','🔪','💔','🩸'],          count: 20, dir: 'fall', bg: 'rgba(180,20,20,0.6)',    icon: '💀', key: 'kd.anim.kill',         dur: 2400 },
    save:          { emojis: ['✨','💚','⭐','💫','🌟'],          count: 18, dir: 'rise', bg: 'rgba(10,140,80,0.55)',  icon: '💚', key: 'kd.anim.save',         dur: 2400 },
    peace:         { emojis: ['⭐','🌟','💤','🌙'],               count: 10, dir: 'rise', bg: 'rgba(40,40,120,0.5)',   icon: '🌙', key: 'kd.anim.peace',        dur: 2400 },
    night:         { emojis: ['🌙','⭐','✨','💫','🌟'],          count: 16, dir: 'fall', bg: 'rgba(8,8,48,0.72)',     icon: '🌙', key: 'kd.anim.night',        dur: 2000 },
    day:           { emojis: ['☀️','🌸','🐦','✨','🌻'],         count: 14, dir: 'rise', bg: 'rgba(255,175,25,0.38)', icon: '🌅', key: 'kd.anim.day',          dur: 2000 },
    killer_caught: { emojis: ['🎉','🎊','🏆','⚔️','✨','🌟'],    count: 28, dir: 'rise', bg: 'rgba(20,100,220,0.55)', icon: '🎉', key: 'kd.anim.killerCaught', dur: 2800 },
    innocent_out:  { emojis: ['😢','💔','🪦','😭','🕊️'],         count: 15, dir: 'fall', bg: 'rgba(70,50,90,0.6)',    icon: '😢', key: 'kd.anim.innocentOut',  dur: 2200 },
    villagers_win: { emojis: ['🎉','🎊','🌟','🏆','🎈','✨'],    count: 35, dir: 'rise', bg: 'rgba(16,120,70,0.55)',  icon: '🏆', key: 'kd.anim.villagersWin', dur: 3500 },
    killer_wins:   { emojis: ['💀','🔪','😈','🌑','👁️','🩸'],    count: 30, dir: 'fall', bg: 'rgba(90,0,0,0.72)',     icon: '😈', key: 'kd.anim.killerWins',   dur: 3500 },
  };

  function showNightAnimation(type) {
    const cfg = ANIM_CONFIG[type] || ANIM_CONFIG.peace;
    const overlay = document.createElement('div');
    overlay.className = `kd-anim-overlay kd-anim-${type}`;
    overlay.style.background = cfg.bg;

    // Particle rain / rise
    const particles = document.createElement('div');
    particles.className = 'kd-particles';
    for (let i = 0; i < cfg.count; i++) {
      const p = document.createElement('span');
      p.className = `kd-particle kd-particle-${cfg.dir}`;
      p.textContent = cfg.emojis[Math.floor(Math.random() * cfg.emojis.length)];
      p.style.cssText = [
        `left:${Math.random() * 100}%`,
        `animation-delay:${(Math.random() * 1.8).toFixed(2)}s`,
        `animation-duration:${(1.4 + Math.random() * 1.6).toFixed(2)}s`,
        `font-size:${(0.9 + Math.random() * 1.6).toFixed(1)}rem`,
        `opacity:${(0.7 + Math.random() * 0.3).toFixed(2)}`,
      ].join(';');
      particles.appendChild(p);
    }

    const main = document.createElement('div');
    main.className = 'kd-anim-main';

    const icon = document.createElement('div');
    icon.className = 'kd-anim-icon';
    icon.textContent = cfg.icon;

    const text = document.createElement('div');
    text.className = 'kd-anim-text';
    text.textContent = t(cfg.key);

    main.appendChild(icon);
    main.appendChild(text);
    overlay.appendChild(particles);
    overlay.appendChild(main);
    document.getElementById('view-killerdoctor').appendChild(overlay);

    // Fade out then remove
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.4s ease';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 400);
    }, cfg.dur || 2400);
  }

  function startAmbient() {
    stopAmbient();
    ambientInterval = setInterval(() => {
      const s = document.createElement('span');
      s.className = 'kd-ambient-star';
      s.textContent = ['⭐','✨','💫','🌟'][Math.floor(Math.random() * 4)];
      s.style.cssText = `left:${(Math.random()*95).toFixed(1)}%;animation-duration:${(5+Math.random()*4).toFixed(1)}s`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 10000);
    }, 700);
  }

  function stopAmbient() {
    clearInterval(ambientInterval);
    ambientInterval = null;
    document.querySelectorAll('.kd-ambient-star').forEach(s => s.remove());
  }

  function showActionBurst(elId, emojis) {
    const el = document.getElementById(elId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < 6; i++) {
      const span = document.createElement('span');
      span.className = 'kd-action-burst-particle';
      span.textContent = emojis[i % emojis.length];
      const angle = (i / 6) * Math.PI * 2;
      const dist = 50 + Math.random() * 25;
      span.style.cssText = [
        `left:${cx}px`, `top:${cy}px`,
        `--dx:${(Math.cos(angle)*dist).toFixed(0)}px`,
        `--dy:${(Math.sin(angle)*dist).toFixed(0)}px`,
      ].join(';');
      document.body.appendChild(span);
      setTimeout(() => span.remove(), 850);
    }
  }

  function showVoteDropAnim(btn) {
    const rect = btn.getBoundingClientRect();
    const el = document.createElement('span');
    el.className = 'kd-vote-drop';
    el.textContent = '🗳️';
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top  = `${rect.top}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function onRoleAssigned({ role, allPlayers }) {
    tensionShown = false;
    stopAmbient();
    setRole(role);
    renderPlayerList(allPlayers, []);
    setPhase('reveal');
    document.getElementById('kd-chat-messages').innerHTML = '';
    history = [];
    renderHistory();
    // Card flip reveal animation
    const card = document.getElementById('kd-role-card');
    card.classList.remove('kd-card-flip');
    void card.offsetWidth;
    card.classList.add('kd-card-flip');
  }

  function onReconnect({ role, phase, alive, avatar }) {
    if (avatar !== undefined) App.myAvatar = avatar;
    setRole(role, alive);
    setPhase(phase === 'night' ? 'night' :
             phase === 'night_resolution' ? 'night-result' :
             phase === 'day_discussion' ? 'discussion' :
             phase === 'voting' ? 'voting' :
             phase === 'vote_resolution' ? 'vote-result' :
             phase === 'game_over' ? 'gameover' : 'reveal');
  }

  function onNightStart({ round, livingPlayers, deadPlayers }) {
    renderPlayerList(livingPlayers, deadPlayers);
    addHistory('kd.history.nightBegan', { round });
    document.getElementById('kd-night-title').textContent = t('kd.nightN', { round });
    document.getElementById('kd-night-subtitle').textContent = t('kd.villageSleeps');
    const isAlive = livingPlayers.some(p => p.id === App.myId);
    const nightAction = document.getElementById('kd-night-action');
    nightAction.classList.remove('hidden');
    document.getElementById('kd-action-done').classList.add('hidden');
    document.getElementById('kd-villager-awake').classList.add('hidden');
    document.getElementById('kd-night-timer').classList.add('hidden');
    document.getElementById('kd-night-progress').classList.add('hidden');
    const grid = document.getElementById('kd-action-targets');
    grid.innerHTML = '';
    if (isAlive) {
      document.getElementById('kd-action-title').textContent = t('kd.chooseVictim');
      document.getElementById('kd-action-desc').textContent = t('kd.chooseVictimDesc');
      livingPlayers.forEach(t => {
        const btn = makeTargetBtn(t, () => {
          grid.querySelectorAll('.target-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          grid.querySelectorAll('.target-btn').forEach(b => b.disabled = true);
          App.socket.emit('game:action', { action: 'night_kill', targetId: t.id });
        });
        grid.appendChild(btn);
      });
    } else {
      document.getElementById('kd-action-title').textContent = t('kd.nightPhase');
      document.getElementById('kd-action-desc').textContent = t('kd.deadWatchQuietly');
    }
    setPhase('night');
    startTimer('kd-night-timer', 45);
    showNightAnimation('night');
    startAmbient();
  }

  function makeTargetBtn(t, onClick) {
    const btn = document.createElement('button');
    btn.className = 'target-btn';
    const charEl = document.createElement('div');
    charEl.className = 'target-char';
    charEl.textContent = getAvatar(t).emoji;
    const nameEl = document.createElement('span');
    nameEl.textContent = t.name;
    btn.appendChild(charEl);
    btn.appendChild(nameEl);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function onActionConfirmed({ action }) {
    const isKill = action === 'night_kill';
    document.getElementById('kd-action-done').textContent = t(isKill ? 'kd.targetSelected' : 'kd.saveSubmitted');
    document.getElementById('kd-action-done').classList.remove('hidden');
    document.getElementById('kd-action-desc').textContent = t('kd.waitingOthers');
    document.querySelectorAll('#kd-action-targets .target-btn').forEach(b => b.disabled = true);
    showActionBurst('kd-action-done', isKill ? ['🔪','💀','🩸'] : ['💉','💚','✨']);
  }

  function onNightResult({ message, died, saved, livingPlayers, deadPlayers }) {
    stopAmbient();
    renderPlayerList(livingPlayers, deadPlayers);
    if (died) {
      addHistory('kd.history.diedAtNight', { name: died.name });
      if (died.id === App.myId) {
        isDead = true;
        document.getElementById('kd-you-status').textContent = t('kd.dead');
      }
      showNightAnimation('kill');
    } else if (saved) {
      addHistory('kd.history.doctorSaved');
      showNightAnimation('save');
    } else {
      addHistory('kd.history.peacefulNight');
      showNightAnimation('peace');
    }
    document.getElementById('kd-night-msg').textContent = tmsg(message);

    const victimEl = document.getElementById('kd-night-victim');
    if (died) {
      victimEl.innerHTML = `<span class="victim-char">${getAvatar(died).emoji}</span><span class="victim-name"></span>`;
      victimEl.querySelector('.victim-name').textContent = t('kd.hasFallen', { name: died.name });
      victimEl.className = 'night-victim-display victim-dead';
    } else if (saved) {
      victimEl.innerHTML = `<span class="victim-char">💚</span><span class="victim-name"></span>`;
      victimEl.querySelector('.victim-name').textContent = t('kd.protectedByDoctor');
      victimEl.className = 'night-victim-display victim-saved';
    } else {
      victimEl.innerHTML = '';
      victimEl.className = 'night-victim-display';
    }

    setPhase('night-result');
  }

  function onDayStart({ round, duration, livingPlayers, deadPlayers }) {
    renderPlayerList(livingPlayers, deadPlayers);
    document.getElementById('kd-day-title').textContent = t('kd.dayN', { round });
    document.getElementById('kd-chat-messages').innerHTML = '';
    const isAlive = livingPlayers.some(p => p.id === App.myId);
    document.getElementById('kd-chat-input').disabled = !isAlive;
    document.getElementById('kd-chat-send').disabled = !isAlive;
    setPhase('discussion');
    startTimer('kd-day-timer', duration);
    showNightAnimation('day');
  }

  function onVotingStart({ duration, livingPlayers, deadPlayers }) {
    renderPlayerList(livingPlayers, deadPlayers);
    const isAlive = livingPlayers.some(p => p.id === App.myId);
    document.getElementById('kd-dead-notice').classList.toggle('hidden', isAlive);
    document.getElementById('kd-voted-notice').classList.add('hidden');
    const grid = document.getElementById('kd-vote-targets');
    grid.innerHTML = '';
    livingPlayers.filter(p => p.id !== App.myId).forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'vote-btn';
      btn.disabled = !isAlive;
      const charEl = document.createElement('div');
      charEl.className = 'vote-char';
      charEl.textContent = getAvatar(t).emoji;
      const nameEl = document.createElement('div');
      nameEl.textContent = t.name;
      btn.appendChild(charEl);
      btn.appendChild(nameEl);
      btn.addEventListener('click', () => {
        if (!isAlive) return;
        showVoteDropAnim(btn);
        grid.querySelectorAll('.vote-btn').forEach(b => { b.classList.remove('voted'); b.disabled = true; });
        btn.classList.add('voted');
        App.socket.emit('game:action', { action: 'vote', targetId: t.id });
      });
      grid.appendChild(btn);
    });
    const prog = document.getElementById('kd-vote-progress');
    prog.textContent = t('kd.waitingVotes');
    setPhase('voting');
    startTimer('kd-vote-timer', duration);
  }

  function onVoteUpdate({ cast, total }) {
    document.getElementById('kd-vote-progress').textContent = t('kd.votesCast', { done: cast, total });
  }

  function onVoteConfirmed({ targetName }) {
    document.getElementById('kd-voted-notice').textContent = t('kd.youVotedFor', { name: targetName });
    document.getElementById('kd-voted-notice').classList.remove('hidden');
  }

  function onVoteResult({ tied, eliminated, message, voteDetails, livingPlayers, deadPlayers }) {
    renderPlayerList(livingPlayers, deadPlayers);
    document.getElementById('kd-elim-msg').textContent = tmsg(message);

    if (eliminated) {
      showNightAnimation(eliminated.role === 'killer' ? 'killer_caught' : 'innocent_out');
      addHistory('kd.history.votedOut', { name: eliminated.name, role: roleName(eliminated.role) });
      if (eliminated.id === App.myId) {
        isDead = true;
        document.getElementById('kd-you-status').textContent = t('kd.eliminated');
      }
      const reveal = document.getElementById('kd-elim-reveal');
      reveal.className = `role-reveal-card ${eliminated.role}`;
      reveal.innerHTML = `<div class="reveal-char">${getAvatar(eliminated).emoji}</div><div class="reveal-role"></div><div class="reveal-line"></div>`;
      reveal.querySelector('.reveal-role').textContent = `${ROLE_INFO[eliminated.role]?.icon || ''} ${roleName(eliminated.role)}`;
      reveal.querySelector('.reveal-line').textContent = t('kd.wasThe', { name: eliminated.name, role: roleName(eliminated.role) });
      reveal.classList.remove('hidden');
      document.getElementById('kd-elim-icon').textContent = eliminated.role === 'killer' ? '⚰️' : '😢';
      document.getElementById('kd-elim-title').textContent = t(eliminated.role === 'killer' ? 'kd.killerFound' : 'kd.innocentEliminated');
    } else {
      document.getElementById('kd-elim-reveal').classList.add('hidden');
      document.getElementById('kd-elim-icon').textContent = tied ? '🤝' : '⚖️';
      document.getElementById('kd-elim-title').textContent = t('kd.noElimination');
      addHistory('kd.history.noElimination');
    }

    const detail = document.getElementById('kd-vote-detail');
    detail.innerHTML = '';
    (voteDetails || []).sort((a,b) => b.votes - a.votes).forEach((v, idx) => {
      const d = document.createElement('div');
      d.className = 'vote-detail-item vote-reveal-stagger';
      d.style.animationDelay = `${idx * 0.35}s`;
      d.textContent = `${getAvatar(v).emoji} ${v.name}: `;
      const count = document.createElement('span');
      count.className = 'vote-count';
      count.textContent = t('kd.voteCount', { count: v.votes });
      d.appendChild(count);
      detail.appendChild(d);
    });

    const nextLabel = document.getElementById('kd-next-label');
    nextLabel.textContent = t('kd.nextRound');
    nextLabel.classList.remove('hidden');

    setPhase('vote-result');
  }

  function onGameOver({ winner, reason, allPlayers, history: gameHistory }) {
    stopAmbient();
    const isVillagers = winner === 'villagers';
    const isAbandoned = winner === 'abandoned';
    document.getElementById('kd-win-icon').textContent = isAbandoned ? '🚪' : (isVillagers ? '🏘️' : '🔪');
    document.getElementById('kd-win-title').textContent =
      t(isAbandoned ? 'kd.gameAbandoned' : (isVillagers ? 'kd.villagersWin' : 'kd.killerWins'));
    document.getElementById('kd-win-reason').textContent = tmsg(reason);
    document.getElementById('kd-btn-again').style.display = App.isHost ? 'inline-block' : 'none';
    document.getElementById('kd-btn-lobby').style.display = App.isHost ? 'inline-block' : 'none';
    setPhase('gameover');
    if (!isAbandoned) showNightAnimation(isVillagers ? 'villagers_win' : 'killer_wins');
    setTimeout(() => {
      document.querySelectorAll('.final-player-card').forEach(card => {
        if (card.querySelector('.fp-role.killer')) card.classList.add('kd-killer-spotlight');
      });
    }, 3900);

    const grid = document.getElementById('kd-final-players');
    grid.innerHTML = '';
    allPlayers.forEach(p => {
      const info = ROLE_INFO[p.role] || {};
      const card = document.createElement('div');
      card.className = 'final-player-card' + (p.alive ? '' : ' dead');
      card.innerHTML = `<div class="fp-char">${getAvatar(p).emoji}</div><div class="fp-name"></div><div class="fp-role ${p.role}"></div><div class="fp-fate" style="font-size:.75rem;color:var(--muted)"></div>`;
      card.querySelector('.fp-name').textContent = p.name + (p.id === App.myId ? ` ${t('common.you')}` : '');
      card.querySelector('.fp-role').textContent = `${info.icon || ''} ${roleName(p.role)}`;
      card.querySelector('.fp-fate').textContent = t(p.alive ? 'kd.survived' : 'kd.eliminatedShort');
      grid.appendChild(card);
    });

    const hist = document.getElementById('kd-final-history');
    hist.innerHTML = '';
    (gameHistory || []).forEach(h => {
      const d = document.createElement('div');
      d.textContent = h.reason === 'vote'
        ? t('kd.finalHistory.vote', { round: h.round, name: h.name, role: roleName(h.role) })
        : t('kd.finalHistory.night', { round: h.round, name: h.name });
      hist.appendChild(d);
    });
  }

  function onChatMessage({ playerName, message }) {
    if (App.gameType !== 'killerdoctor') return;
    const messages = document.getElementById('kd-chat-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    msg.innerHTML = `<span class="msg-name" style="color:${avatarColor(playerName)}">${playerName}:</span><span class="msg-text">${escHtml(message)}</span>`;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function sendChat() {
    const input = document.getElementById('kd-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    App.socket.emit('chat:send', { message: msg });
    input.value = '';
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, onRoleAssigned, onReconnect };
})();
