
const socket = io();
const $ = id => document.getElementById(id);

const sections = ['landing', 'host', 'join', 'player'];

function showSection(id) {
  sections.forEach(x => $(x).classList.toggle('hidden', x !== id));
}

let role = null;
let roomCode = null;
let playerId = null;
let myName = '';
let lastState = null;
let tick = null;
let selected = false;
let activeQuestionIndex = null;
let pointsFrozen = false;
let frozenPoints = 1000;

const params = new URLSearchParams(location.search);
const initialJoin = params.get('join');

if (initialJoin) {
  showSection('join');
  $('joinCode').value = initialJoin.toUpperCase();
}

$('showJoin').onclick = () => showSection('join');

$('create').onclick = () => socket.emit('host:create', {}, async res => {
  if (!res?.ok) return;

  role = 'host';
  roomCode = res.code;
  showSection('host');
  $('roomCode').textContent = roomCode;

  const qr = await fetch('/api/qr?room=' + roomCode).then(r => r.json());
  $('qr').src = qr.dataUrl;
  $('joinUrl').textContent = qr.url;

  render(res.state);
});

$('joinBtn').onclick = () => {
  const code = $('joinCode').value.trim().toUpperCase();
  const name = $('playerName').value.trim();

  $('joinError').textContent = '';

  socket.emit('player:join', { code, name }, res => {
    if (!res?.ok) {
      $('joinError').textContent = res?.error || 'Ulanib bo‘lmadi.';
      return;
    }

    role = 'player';
    roomCode = code;
    playerId = socket.id;
    myName = res.name;

    $('myName').textContent = myName;
    showSection('player');
    render(res.state);
  });
};

$('joinCode').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
});

$('start').onclick = () => socket.emit('host:start');
$('next').onclick = () => socket.emit('host:next');
$('again').onclick = () => location.reload();

socket.on('state', render);

function render(s) {
  if (!s) return;

  lastState = s;

  if (role === 'host') renderHost(s);
  if (role === 'player') renderPlayer(s);
}

function renderRank(list, target, me) {
  const el = $(target);
  el.innerHTML = '';

  list.forEach((p, i) => {
    const li = document.createElement('li');

    li.innerHTML =
      `<span><b class="rank">${String(i + 1).padStart(2, '0')}</b> ` +
      `${esc(p.name)}${p.id === me ? ' <small>(SIZ)</small>' : ''}</span>` +
      `<b class="score">${p.score.toLocaleString('uz-UZ')}</b>`;

    el.appendChild(li);
  });

  if (!list.length) {
    el.innerHTML = '<li>Hali ishtirokchilar yo‘q</li>';
  }
}

function renderHost(s) {
  $('playerCount').textContent = s.players;

  $('hostStatus').textContent =
    s.status === 'lobby' ? 'ISHTIROKCHILAR KUTILMOQDA' :
    s.status === 'question' ? 'SAVOL FAOL' :
    s.status === 'reveal' ? 'NATIJALAR' : 'YAKUNLANDI';

  $('start').disabled = s.players === 0 || s.status !== 'lobby';

  $('lobbyPlayers').innerHTML = '';

  s.leaderboard.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.name;
    $('lobbyPlayers').appendChild(li);
  });

  renderRank(s.leaderboard, 'rankList');

  $('questionBox').classList.toggle('hidden', s.status !== 'question');
  $('feedbackBox').classList.toggle('hidden', s.status !== 'reveal');
  $('finishedBox').classList.toggle('hidden', s.status !== 'finished');
  $('orb').classList.add('hidden');

  if (s.status === 'lobby') {
    $('stageTitle').classList.remove('hidden');
    $('stageText').classList.remove('hidden');
    $('stageTitle').textContent = 'Ishtirokchilar ulanmoqda';
    $('stageText').textContent = 'QR-kodni skanerlang. O‘yinchilar: ' + s.players + '/30';
  }

  if (s.status === 'question') {
    $('stageTitle').classList.add('hidden');
    $('stageText').classList.add('hidden');

    $('questionText').textContent = s.question.q;
    $('answers').innerHTML = '';

    s.question.a.forEach((a, i) => {
      const b = document.createElement('div');
      b.className = 'answer-chip';
      b.textContent = String.fromCharCode(65 + i) + '. ' + a;
      $('answers').appendChild(b);
    });

    startTick(s.deadline, 'timer');

    $('next').textContent =
      s.questionIndex === s.total - 1
        ? 'YAKUNIY NATIJA →'
        : 'KEYINGI SAVOL →';
  }

  if (s.status === 'reveal') {
    stopTick();

    const correct = s.feedback.correct;

    $('answerResult').textContent =
      'TO‘G‘RI JAVOB: ' + String.fromCharCode(65 + correct);

    $('answerResult').classList.remove('bad');
    $('explain').textContent = s.feedback.explain;

    $('next').textContent =
      s.questionIndex === s.total - 1
        ? 'YAKUNIY NATIJA →'
        : 'KEYINGI SAVOL →';
  }

  if (s.status === 'finished') {
    stopTick();
    $('stageTitle').classList.add('hidden');
    $('stageText').classList.add('hidden');
  }
}

function renderPlayer(s) {
  const me = s.leaderboard.find(p => p.id === playerId);

  $('myScore').textContent = (me?.score || 0).toLocaleString('uz-UZ');

  const rank = s.leaderboard.findIndex(p => p.id === playerId) + 1;

  $('myRank').textContent = rank
    ? `Reyting: ${rank} / ${s.players}`
    : 'Reyting kutilmoqda';

  const inReveal = s.status === 'reveal';

  $('playerWait').classList.toggle('hidden', s.status !== 'lobby');
  $('playerQ').classList.toggle('hidden', s.status !== 'question');
  $('playerFeedback').classList.toggle('hidden', !inReveal);
  $('playerFinished').classList.toggle('hidden', s.status !== 'finished');

  if (s.status === 'lobby') {
    $('playerWait').querySelector('h2').textContent = 'Diqqat bilan kuting!';
  }

  if (s.status === 'question') {
    // Yangi savol boshlanganida hisobni qayta boshlash.
    if (activeQuestionIndex !== s.questionIndex) {
      activeQuestionIndex = s.questionIndex;
      selected = false;
      pointsFrozen = false;
      frozenPoints = 1000;
    }

    $('playerQuestionText').textContent = s.question.q;
    $('playerAnswers').innerHTML = '';

    if (!selected) {
      $('answerStatus').textContent = 'Javobni tanlang — vaqt tugashini kutmang!';
    }

    s.question.a.forEach((a, i) => {
      const b = document.createElement('button');

      b.className = 'player-answer';
      b.textContent = String.fromCharCode(65 + i) + '. ' + a;
      b.disabled = selected;

      b.onclick = () => {
        if (selected) return;

        selected = true;
        pointsFrozen = true;

        // Javob bosilgan paytdagi taxminiy ball.
        frozenPoints = Math.max(
          0,
          Math.min(
            1000,
            Math.round(1000 * Math.max(0, lastState.deadline - Date.now()) / 10000)
          )
        );

        $('currentPoints').textContent = String(frozenPoints);

        document.querySelectorAll('.player-answer').forEach(x => {
          x.disabled = true;
        });

        b.classList.add('selected');
        $('answerStatus').textContent = 'Javob yuborildi. Natijani kuting…';

        socket.emit('player:answer', { answer: i }, res => {
          if (!res?.ok) {
            $('answerStatus').textContent = res?.error || 'Javob yuborilmadi';
            return;
          }

          // Yakuniy ballni server hisobidan olamiz.
          frozenPoints = res.points;
          $('currentPoints').textContent = String(res.points);

          $('answerStatus').textContent = res.correct
            ? 'To‘g‘ri! +' + res.points + ' ball'
            : 'Noto‘g‘ri javob — 0 ball';
        });
      };

      $('playerAnswers').appendChild(b);
    });

    startTick(s.deadline, 'playerTimer', 'currentPoints');
  }

  if (inReveal) {
    stopTick();

    const answer = s.feedback.answers?.[playerId];

    $('playerResult').textContent = answer
      ? (answer.correct
          ? `✅ TO‘G‘RI! +${answer.points} BALL`
          : '❌ NOTO‘G‘RI — 0 BALL')
      : '⏱️ VAQT TUGADI — 0 BALL';

    $('playerResult').style.color =
      answer?.correct ? 'var(--green)' : 'var(--red)';

    $('playerExplain').textContent = s.feedback.explain;

    $('playerFinalRank').textContent = '';
  }

  if (s.status === 'finished') {
    stopTick();

    const finalRank = s.leaderboard.findIndex(p => p.id === playerId) + 1;

    $('playerFinalRank').textContent =
      `Yakuniy o‘rningiz: ${finalRank} / ${s.players} • ${me?.score || 0} ball`;
  }
}

function startTick(deadline, id, pointsId = null) {
  stopTick();

  const update = () => {
    const remaining = Math.max(0, deadline - Date.now());
    const left = Math.ceil(remaining / 1000);

    $(id).textContent = left;
    $(id).classList.toggle('urgent', left <= 3);

    if (pointsId) {
      if (pointsFrozen) {
        $(pointsId).textContent = String(frozenPoints);
      } else {
        const points = Math.max(
          0,
          Math.min(1000, Math.round(1000 * remaining / 10000))
        );

        $(pointsId).textContent = String(points);
      }
    }

    if (left <= 0) stopTick();
  };

  update();
  tick = setInterval(update, 10);
}

function stopTick() {
  if (tick) clearInterval(tick);
  tick = null;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
