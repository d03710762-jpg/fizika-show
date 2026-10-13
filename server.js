const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.get('/api/qr', async (req, res) => {
  const room = String(req.query.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (!room) return res.status(400).json({ error: 'room kerak' });
  const url = `${req.protocol}://${req.get('host')}/?join=${encodeURIComponent(room)}`;
  try { res.json({ url, dataUrl: await QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: '#071326', light: '#ffffff' } }) }); }
  catch { res.status(500).json({ error: 'QR yaratilmadi' }); }
});

const QUESTIONS = [
  { q: 'Amper kuchi deb nimaga aytiladi?', a: ['Magnit maydonning tokli o‘tkazgichga ta’sir kuchi', 'Jismning og‘irlik kuchi', 'Zaryadning tinch holatdagi kuchi', 'Ishqalanish kuchi'], correct: 0, explain: 'Amper kuchi — magnit maydonning tokli o‘tkazgichga ta’sir kuchi.' },
  { q: 'Amper kuchining yo‘nalishi qaysi qoida bilan aniqlanadi?', a: ['O‘ng qo‘l qoidasi', 'Chap qo‘l qoidasi', 'Lenz qoidasi', 'Arximed qoidasi'], correct: 1, explain: 'Amper kuchining yo‘nalishi chap qo‘l qoidasi bilan aniqlanadi.' },
  { q: 'Amper kuchi modulining formulasi qaysi?', a: ['F = mg', 'F = qE', 'F = BIl sin α', 'F = kx'], correct: 2, explain: 'F = BIl sin α.' },
  { q: 'Formuladagi B nimani bildiradi?', a: ['Tok kuchi', 'Magnit induksiyasi', 'O‘tkazgich uzunligi', 'Elektr qarshiligi'], correct: 1, explain: 'B — magnit induksiyasi; SI birligi tesla (T).' },
  { q: 'Amper kuchining SI birligi nima?', a: ['Tesla', 'Amper', 'Nyuton', 'Veber'], correct: 2, explain: 'Kuchning SI birligi — nyuton (N).' },
  { q: 'Tokli o‘tkazgich magnit maydoniga parallel joylashsa, Amper kuchi qanday bo‘ladi?', a: ['Maksimal', 'Nol', 'Cheksiz', 'Doim 1 N'], correct: 1, explain: 'α = 0° bo‘lsa, sin α = 0 va Amper kuchi nol bo‘ladi.' },
  { q: 'Amper kuchi qaysi holatda maksimal bo‘ladi?', a: ['α = 0°', 'α = 30°', 'α = 90°', 'α = 180°'], correct: 2, explain: 'α = 90° bo‘lganda sin α = 1.' },
  { q: 'Amper kuchi formulasidagi I nimani bildiradi?', a: ['Tok kuchi', 'Magnit induksiyasi', 'Quvvat', 'Zaryad'], correct: 0, explain: 'I — o‘tkazgichdan o‘tayotgan tok kuchi.' },
  { q: 'Amper kuchi yo‘nalishi nimalarga bog‘liq?', a: ['Faqat haroratga', 'Tok va magnit maydon yo‘nalishlariga', 'Faqat massaga', 'Faqat rangga'], correct: 1, explain: 'Kuch yo‘nalishi tok va magnit maydon yo‘nalishlariga bog‘liq.' },
  { q: 'Tokli ramka magnit maydonda qanday harakat qilishi mumkin?', a: ['Aylanishi mumkin', 'Har doim erib ketadi', 'Massasi yo‘qoladi', 'Har doim tinch qoladi'], correct: 0, explain: 'Ramkaga ta’sir qiluvchi kuchlar aylantiruvchi moment hosil qilishi mumkin.' },
  { q: 'N ta o‘ramli tokli ramkaning aylantiruvchi momenti qaysi formula bilan ifodalanadi?', a: ['M = mg', 'M = NBIS sin α', 'M = IR', 'M = q/t'], correct: 1, explain: 'Tokli ramka uchun M = NBIS sin α (burchak ta’rifiga qarab α ramka normali va B orasidagi burchak bo‘lishi mumkin).' },
  { q: 'Ferromagnit moddaga qaysi biri misol bo‘ladi?', a: ['Mis', 'Temir', 'Suv', 'Shisha'], correct: 1, explain: 'Temir ferromagnit moddalardan biridir.' },
  { q: 'Diamagnit modda magnit maydonga kiritilganda odatda qanday xususiyat ko‘rsatadi?', a: ['Maydonni kuchaytirish yo‘nalishida magnitlanadi', 'Tashqi maydonga qarshi yo‘nalishda kuchsiz magnitlanadi', 'Har doim kuchli tortiladi', 'Elektr tokiga aylanadi'], correct: 1, explain: 'Diamagnitlarda hosil bo‘lgan magnitlanish tashqi maydonga qarshi yo‘naladi.' },
  { q: 'Paramagnit moddalar tashqi magnit maydonda odatda qanday tutadi?', a: ['Maydon tomonga kuchsiz tortiladi', 'Har doim kuchli itariladi', 'Magnit maydonni butunlay yo‘q qiladi', 'Hech qanday ta’sir ko‘rsatmaydi'], correct: 0, explain: 'Paramagnit moddalar tashqi maydon tomon kuchsiz tortiladi.' },
  { q: 'Quyidagilardan qaysi biri ferromagnit modda?', a: ['Alyuminiy', 'Kislorod', 'Nikel', 'Mis'], correct: 2, explain: 'Nikel ham ferromagnit moddalardan biridir.' },
  { q: 'Elektr dvigatelining ishlashida qaysi hodisa muhim?', a: ['Tokli o‘tkazgichga magnit maydon ta’siri', 'Faqat yorug‘likning sinishi', 'Suyuqlikning bug‘lanishi', 'Jismning erkin tushishi'], correct: 0, explain: 'Elektr dvigatelda magnit maydon va tok o‘zaro ta’siri aylantiruvchi moment hosil qiladi.' }
];
const rooms = new Map();
const safeName = s => String(s || '').trim().replace(/[<>]/g, '').slice(0, 22);
const leaderboard = room => [...room.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score, last: p.lastPoints || 0 })).sort((a,b) => b.score-a.score || b.last-a.last);
function publicState(room) {
  return { code: room.code, status: room.status, questionIndex: room.questionIndex, total: room.questions.length,
    question: room.status === 'question' ? { q: room.questions[room.questionIndex].q, a: room.questions[room.questionIndex].a } : null,
    deadline: room.deadline || null, leaderboard: leaderboard(room), players: room.players.size,
    feedback: room.status === 'reveal' ? { correct: room.questions[room.questionIndex].correct, explain: room.questions[room.questionIndex].explain, answers: Object.fromEntries([...room.players.values()].map(p => [p.id, p.lastResult])) } : null };
}
function broadcast(room) { io.to(room.code).emit('state', publicState(room)); }
function endQuestion(room) {
  if (room.status !== 'question') return;
  clearTimeout(room.timer); room.status = 'reveal'; room.deadline = null; broadcast(room);
}
function makeCode() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }
io.on('connection', socket => {
  socket.on('host:create', (_, cb) => {
    let code; do { code = makeCode(); } while (rooms.has(code));
    const room = { code, hostId: socket.id, players: new Map(), questions: QUESTIONS, questionIndex: -1, status: 'lobby', deadline: null, timer: null };
    rooms.set(code, room); socket.join(code); socket.data.hostRoom = code;
    cb?.({ ok: true, code, state: publicState(room) }); broadcast(room);
  });
  socket.on('player:join', ({ code, name } = {}, cb) => {
    code = String(code || '').toUpperCase().trim(); name = safeName(name);
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: 'O‘yin kodi topilmadi.' });
    if (!name) return cb?.({ ok: false, error: 'Ismingizni kiriting.' });
    if (room.players.size >= 30) return cb?.({ ok: false, error: 'O‘yinchilar soni 30 taga yetdi.' });
    if (room.status !== 'lobby') return cb?.({ ok: false, error: 'O‘yin boshlangan. Keyingi o‘yinni kuting.' });
    const player = { id: socket.id, name, score: 0, answered: false, lastPoints: 0, lastResult: null };
    room.players.set(socket.id, player); socket.join(code); socket.data.playerRoom = code;
    cb?.({ ok: true, name, state: publicState(room) }); broadcast(room);
  });
  socket.on('host:start', () => {
    const room = rooms.get(socket.data.hostRoom); if (!room || room.status !== 'lobby' || !room.players.size) return;
    room.questionIndex = 0; beginQuestion(room);
  });
  socket.on('host:next', () => {
    const room = rooms.get(socket.data.hostRoom); if (!room || room.status !== 'reveal') return;
    if (room.questionIndex + 1 >= room.questions.length) { room.status = 'finished'; room.deadline = null; broadcast(room); return; }
    room.questionIndex++; beginQuestion(room);
  });
  socket.on('player:answer', ({ answer } = {}, cb) => {
    const code = socket.data.playerRoom, room = rooms.get(code), p = room?.players.get(socket.id);
    if (!room || !p || room.status !== 'question' || p.answered) return cb?.({ ok: false, error: 'Javob qabul qilinmadi.' });
    p.answered = true;
    const remaining = Math.max(0, room.deadline - Date.now());
    const correct = Number(answer) === room.questions[room.questionIndex].correct;
    const points = correct ? Math.max(0, Math.round(1000 * remaining / 15000)) : 0;
    p.lastPoints = points; p.lastResult = { correct, points, answer: Number(answer) };
    p.score += points; cb?.({ ok: true, correct, points }); broadcast(room);
    if ([...room.players.values()].every(x => x.answered)) endQuestion(room);
  });
  socket.on('disconnect', () => {
    const code = socket.data.playerRoom, room = rooms.get(code);
    if (room) { room.players.delete(socket.id); broadcast(room); }
  });
});
function beginQuestion(room) {
  clearTimeout(room.timer); room.status = 'question'; room.deadline = Date.now() + 15000;
  for (const p of room.players.values()) { p.answered = false; p.lastPoints = 0; p.lastResult = null; }
  broadcast(room); room.timer = setTimeout(() => endQuestion(room), 15000);
}
server.listen(PORT, '0.0.0.0', () => console.log(`FIZIKA SHOW ishga tushdi: http://localhost:${PORT}`));
