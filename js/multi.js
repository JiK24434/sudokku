import { generatePuzzle } from './sudoku.js';

const $ = id => document.getElementById(id);
const MAX_SALAH = 3;
const JATAH_PETUNJUK = 1;
const JATAH_UNDO = 2;
const NAMA_LEVEL = { santai: 'Santai', sedang: 'Sedang', sulit: 'Sulit' };

const lawan = n => (n === 1 ? 2 : 1);
const fmt = d => `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
const label = (r, c) => `B${r + 1}·K${c + 1}`;

let s = null;          // state game
let sudahInit = false;
let pLevel = 'sedang'; // pilihan di layar "Siap bertanding?"
let pMenit = 10;

// status: 'siap' | 'main' | 'serah' | 'jeda' | 'selesai'

// ---------- State ----------
function baru(status = 'siap') {
  const { puzzle, solution } = generatePuzzle(pLevel);
  const pemain = () => ({
    points: 0, wrong: 0, correct: 0,
    time: pMenit * 60, hints: JATAH_PETUNJUK, undos: JATAH_UNDO,
  });
  s = {
    puzzle, solution,
    board: puzzle.map(r => [...r]),
    owner: Array.from({ length: 9 }, () => Array(9).fill(0)), // siapa yang ngisi (0 = angka awal)
    turn: 1,
    status,
    level: pLevel,
    players: { 1: pemain(), 2: pemain() },
    history: [],
    terpilih: null,
    last: null,
    hasil: null,
  };
}

function catat(data) {
  s.history.push({ pemain: s.turn, ...data });
}

function cariLast() {
  for (let i = s.history.length - 1; i >= 0; i--) {
    const h = s.history[i];
    if (h.jenis === 'isi' || h.jenis === 'petunjuk') return { r: h.r, c: h.c };
  }
  return null;
}

// ---------- Aturan menang ----------
function tentukanPapanPenuh() {
  const a = s.players[1], b = s.players[2];
  if (a.points !== b.points) return { menang: a.points > b.points ? 1 : 2, jenis: 'poin' };
  if (a.time !== b.time) return { menang: a.time > b.time ? 1 : 2, jenis: 'tiebreak' };
  return { menang: 0, jenis: 'seri' };
}

function akhiri(menang, jenis) {
  s.status = 'selesai';
  s.hasil = { menang, jenis };
  s.terpilih = null;
  render();
}

// dipanggil setelah sebuah langkah (isi / salah / lewati / petunjuk)
function selesaiLangkah() {
  const p = s.players[s.turn];
  if (p.wrong >= MAX_SALAH) return akhiri(lawan(s.turn), 'salah3');
  if (s.board.every(b => b.every(v => v !== 0))) {
    const t = tentukanPapanPenuh();
    return akhiri(t.menang, t.jenis);
  }
  s.turn = lawan(s.turn);
  s.status = 'serah';
  s.terpilih = null;
  render();
}

// ---------- Aksi pemain ----------
function isi(n) {
  if (s.status !== 'main' || !s.terpilih) return;
  const { r, c } = s.terpilih;
  if (s.board[r][c] !== 0) return;
  const p = s.players[s.turn];

  if (s.solution[r][c] === n) {
    s.board[r][c] = n;
    s.owner[r][c] = s.turn;
    p.points += 10;
    p.correct++;
    s.last = { r, c };
    catat({ jenis: 'isi', r, c, n, poin: 10 });
  } else {
    // salah: ditolak, sel tetap kosong
    p.points -= 5;
    p.wrong++;
    catat({ jenis: 'salah', r, c, n, poin: -5 });
  }
  selesaiLangkah();
}

function lewati() {
  if (s.status !== 'main') return;
  catat({ jenis: 'lewati', poin: 0 });
  selesaiLangkah();
}

function petunjuk() {
  if (s.status !== 'main') return;
  const p = s.players[s.turn];
  if (p.hints <= 0) return;

  let t = s.terpilih;
  if (!t || s.board[t.r][t.c] !== 0) {
    const kosong = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (s.board[r][c] === 0) kosong.push({ r, c });
    if (!kosong.length) return;
    t = kosong[Math.floor(Math.random() * kosong.length)];
  }
  const n = s.solution[t.r][t.c];
  s.board[t.r][t.c] = n;
  s.owner[t.r][t.c] = s.turn;
  p.hints--;
  s.last = { r: t.r, c: t.c };
  catat({ jenis: 'petunjuk', r: t.r, c: t.c, n, poin: 0 });
  selesaiLangkah();
}

// Undo: dipencet oleh pemain yang BARU jalan, di layar serah-terima
function batalkan() {
  if (s.status !== 'serah') return;
  const prev = lawan(s.turn);
  const h = s.history[s.history.length - 1];
  const p = s.players[prev];
  if (!h || h.jenis !== 'isi' || h.pemain !== prev || p.undos <= 0) return;

  s.board[h.r][h.c] = 0;
  s.owner[h.r][h.c] = 0;
  p.points -= 15;          // balikin +10, lalu potong 5
  p.correct--;
  p.undos--;
  s.history.pop();
  s.history.push({ pemain: prev, jenis: 'batal', poin: -5 });
  s.turn = prev;
  s.status = 'main';
  s.terpilih = { r: h.r, c: h.c };
  s.last = cariLast();
  render();
}

function toggleJeda() {
  if (s.status === 'main') s.status = 'jeda';
  else if (s.status === 'jeda') s.status = 'main';
  render();
}

function akhiriPermainan() {
  if (s.status !== 'main' && s.status !== 'jeda') return;
  if (!confirm(`Akhiri permainan? Pemain ${s.turn} dianggap menyerah.`)) return;
  akhiri(lawan(s.turn), 'menyerah');
}

// ---------- Jam (jalan cuma buat pemain yang lagi giliran) ----------
function tick() {
  if (!s || s.status !== 'main') return;
  const p = s.players[s.turn];
  p.time--;
  if (p.time <= 0) {
    p.time = 0;
    akhiri(lawan(s.turn), 'habis');
    return;
  }
  renderKartu();
}

// ---------- Render ----------
function render() {
  renderKartu();
  renderPapan();
  renderPanel();
  renderOverlay();
  renderSerah();
  renderHasil();
}

function renderKartu() {
  [1, 2].forEach(n => {
    const p = s.players[n];
    const aktif = s.turn === n && s.status !== 'selesai' && s.status !== 'siap';
    const el = $('mp-card' + n);
    el.className = `pcard p${n}${aktif ? ' aktif' : ''}`;
    el.innerHTML = `
      ${aktif ? `<span class="tag-giliran">GILIRAN PEMAIN ${n}</span>` : ''}
      <div class="avatar">P${n}</div>
      <div class="pinfo"><b>Pemain ${n}</b><small>${p.points} poin · ${p.wrong}/${MAX_SALAH} salah</small></div>
      <div class="jam${aktif && p.time < 60 ? ' kritis' : ''}"><small>SISA</small>${fmt(p.time)}</div>`;
  });
}

function renderPapan() {
  const el = $('mp-papan');
  el.classList.toggle('blur', s.status === 'siap' || s.status === 'jeda');
  el.innerHTML = '';
  const t = s.terpilih;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = document.createElement('div');
      d.className = 'sel';
      d.dataset.r = r;
      d.dataset.c = c;
      const v = s.board[r][c];
      if (v) {
        d.textContent = v;
        if (s.owner[r][c]) d.classList.add('p' + s.owner[r][c]);
      }
      if (t) {
        const sekotak = Math.floor(r / 3) === Math.floor(t.r / 3) && Math.floor(c / 3) === Math.floor(t.c / 3);
        if (r === t.r && c === t.c) d.classList.add('pilih' + s.turn);
        else if (r === t.r || c === t.c || sekotak) d.classList.add('terkait');
      }
      if (s.last && s.last.r === r && s.last.c === c) d.classList.add('last');
      d.addEventListener('click', () => {
        if (s.status !== 'main') return;
        s.terpilih = { r, c };
        renderPapan();
      });
      el.appendChild(d);
    }
  }
}

function ringkas(h) {
  switch (h.jenis) {
    case 'isi': return `baru saja mengisi ${h.n} di ${label(h.r, h.c)} (+10)`;
    case 'salah': return `salah di ${label(h.r, h.c)}, jawaban ditolak (−5)`;
    case 'lewati': return 'melewati giliran';
    case 'petunjuk': return `memakai petunjuk di ${label(h.r, h.c)}`;
    case 'batal': return 'membatalkan langkahnya (−5)';
  }
  return '';
}

function renderPanel() {
  $('mp-ronde').textContent = s.history.length + 1;
  $('mp-level').textContent = NAMA_LEVEL[s.status === 'siap' ? pLevel : s.level];

  const t = s.turn;
  const h = s.history[s.history.length - 1];
  const g = $('mp-giliran');
  g.className = 'giliran g' + t;
  g.innerHTML = `
    <span class="label">Giliran sekarang</span>
    <b>Giliran Pemain ${t} — isi 1 sel</b>
    <small>${h ? `Pemain ${h.pemain} ${ringkas(h)}` : 'Pilih sel kosong, lalu tekan angka. Jam jalan selama giliranmu.'}</small>`;

  const main = s.status === 'main';
  $('mp-lewati').disabled = !main;
  $('mp-petunjuk').disabled = !main || s.players[t].hints <= 0;
  $('mp-sisa-petunjuk').textContent = `${s.players[t].hints} tersisa`;
  $('mp-jeda').disabled = !(main || s.status === 'jeda');
  $('mp-jeda').textContent = s.status === 'jeda' ? 'Lanjutkan' : 'Jeda';
  $('mp-akhiri').disabled = !(main || s.status === 'jeda');

  const baris = [...s.history].map((x, i) => ({ ...x, no: i + 1 })).reverse().slice(0, 6);
  $('mp-riwayat').innerHTML = baris.length
    ? baris.map(x => {
        const teks = {
          isi: `${label(x.r, x.c)} → ${x.n}`,
          salah: `${label(x.r, x.c)} → ${x.n} · ditolak`,
          lewati: 'lewati giliran',
          petunjuk: `${label(x.r, x.c)} → ${x.n} · petunjuk`,
          batal: 'batalkan langkah',
        }[x.jenis];
        const cls = x.poin > 0 ? '' : x.poin < 0 ? 'min' : 'nol';
        const pt = x.poin > 0 ? `+${x.poin}` : x.poin < 0 ? `−${Math.abs(x.poin)}` : '0';
        return `<div class="hs"><span><b class="dot${x.pemain}">●</b> ${x.no} · Pemain ${x.pemain} <span style="color:var(--abu)">${teks}</span></span><span class="pt ${cls}">${pt}</span></div>`;
      }).join('')
    : '<div class="hs" style="color:var(--abu)">Belum ada langkah.</div>';
}

function renderOverlay() {
  const o = $('mp-overlay');
  if (s.status === 'siap') {
    o.hidden = false;
    const lv = Object.entries(NAMA_LEVEL)
      .map(([k, v]) => `<button data-lv="${k}" class="${pLevel === k ? 'on' : ''}">${v}</button>`).join('');
    const mn = [5, 10, 15]
      .map(m => `<button data-mnt="${m}" class="${pMenit === m ? 'on' : ''}">${m} menit</button>`).join('');
    o.innerHTML = `
      <p class="ov-judul">Siap bertanding?</p>
      <div class="opsi"><span class="label">Tingkat</span><div class="seg">${lv}</div></div>
      <div class="opsi"><span class="label">Waktu per pemain</span><div class="seg">${mn}</div></div>
      <button id="mp-mulai" class="btn-gelap">Mulai</button>`;
  } else if (s.status === 'jeda') {
    o.hidden = false;
    o.innerHTML = `<p class="ov-judul">Permainan dijeda</p><button id="mp-lanjut" class="btn-gelap">Lanjutkan</button>`;
  } else {
    o.hidden = true;
  }
}

function teksLangkah(h) {
  const nm = `Pemain ${h.pemain}`;
  switch (h.jenis) {
    case 'isi': return `${nm} sudah mengisi angka <b>${h.n}</b> di ${label(h.r, h.c)}.`;
    case 'salah': return `${nm} salah mengisi ${h.n} di ${label(h.r, h.c)}. Jawaban ditolak (−5 poin).`;
    case 'lewati': return `${nm} melewati giliran.`;
    case 'petunjuk': return `${nm} memakai petunjuk: <b>${h.n}</b> di ${label(h.r, h.c)}.`;
  }
  return '';
}

function renderSerah() {
  const m = $('mp-serah');
  m.hidden = s.status !== 'serah';
  if (m.hidden) return;
  const t = s.turn, prev = lawan(t);
  const h = s.history[s.history.length - 1];
  const bisaUndo = h && h.jenis === 'isi' && h.pemain === prev && s.players[prev].undos > 0;
  m.innerHTML = `
    <div class="kartu kecil">
      <div class="avatar-besar a${t}">P${t}</div>
      <p class="kicker" style="color:var(--${t === 1 ? 'p1' : 'merah'})">Ganti giliran</p>
      <h2 style="font-size:30px">Serahkan ke Pemain ${t}</h2>
      <p class="desc">${teksLangkah(h)}<br>Berikan perangkat ke Pemain ${t}, lalu tekan tombol di bawah.</p>
      <div class="chips">
        <div>Pemain 1<b>${s.players[1].points} poin</b></div>
        <div>Pemain 2<b>${s.players[2].points} poin</b></div>
        <div>Sel kosong<b>${s.board.flat().filter(v => v === 0).length}</b></div>
      </div>
      <button id="mp-mulai-giliran" class="btn-p2 ${t === 1 ? 'btn-p1' : ''}">Mulai giliran Pemain ${t}</button>
      ${bisaUndo ? `<button id="mp-batal" class="btn-teks">Pemain ${prev}: batalkan langkah (−5 poin, sisa ${s.players[prev].undos}x)</button>` : ''}
    </div>`;
}

function renderHasil() {
  const m = $('mp-hasil');
  m.hidden = s.status !== 'selesai';
  if (m.hidden) return;

  const { menang, jenis } = s.hasil;
  const a = s.players[1], b = s.players[2];
  const kalah = lawan(menang || 1);
  const pm = s.players[menang] || a;

  const desc = {
    poin: `Papan terisi penuh. Pemain ${menang} unggul ${Math.abs(a.points - b.points)} poin dari Pemain ${kalah}.`,
    tiebreak: `Poin sama-sama ${a.points}. Pemain ${menang} menang karena sisa waktu lebih banyak (${fmt(s.players[menang]?.time ?? 0)} vs ${fmt(s.players[kalah].time)}).`,
    seri: 'Poin dan sisa waktu sama persis. Pertandingan berakhir seri.',
    habis: `Waktu Pemain ${kalah} habis. Pemain ${menang} menang otomatis.`,
    salah3: `Pemain ${kalah} sudah ${MAX_SALAH} kali salah. Pemain ${menang} menang otomatis.`,
    menyerah: `Pemain ${kalah} mengakhiri permainan. Pemain ${menang} menang.`,
  }[jenis];

  const hl = { poin: 'poin', tiebreak: 'waktu', seri: 'waktu', habis: 'waktu', salah3: 'salah' }[jenis];
  const rows = [
    ['poin', a.points, 'Poin', b.points],
    ['benar', a.correct, 'Sel benar', b.correct],
    ['salah', a.wrong, 'Salah', b.wrong],
    ['waktu', fmt(a.time), 'Sisa waktu', fmt(b.time)],
  ].map(([k, x, l, y]) => `<div class="rw${hl === k ? ' hl' : ''}"><span>${x}</span><span>${l}</span><span>${y}</span></div>`).join('');

  m.innerHTML = `
    <div class="kartu">
      <div class="confetti"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="trofi"><svg viewBox="0 0 24 24"><path d="M7 4h10v6a5 5 0 0 1-10 0zM7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4M12 15v4M8 21h8"/></svg></div>
      <p class="kicker">Permainan selesai · ${s.history.length} langkah</p>
      <h2>${menang ? `Pemain ${menang} <em>menang!</em>` : '<em>Seri!</em>'}</h2>
      <p class="desc">${desc}</p>
      ${menang ? `
      <div class="banner w${menang}">
        <b style="font-size:18px">P${menang}</b>
        <div class="nama">Pemain ${menang}<small>Pemenang · ${pm.correct} sel benar</small></div>
        <div class="skor">${pm.points}</div><small style="color:var(--abu)">poin</small>
      </div>` : ''}
      <div class="tabel">
        <div class="rw" style="padding-bottom:2px"><span class="label" style="color:var(--p1)">Pemain 1</span><span></span><span class="label" style="color:var(--merah);text-align:right">Pemain 2</span></div>
        ${rows}
      </div>
      <div class="tombol-baris">
        <button id="mp-menu">Kembali ke menu</button>
        <button id="mp-ulang" class="gelap">Tanding ulang</button>
      </div>
    </div>`;
}

// ---------- Setup (dijalankan sekali) ----------
function init() {
  if (sudahInit) return;
  sudahInit = true;

  const np = $('numpad2');
  for (let n = 1; n <= 9; n++) {
    const b = document.createElement('button');
    b.textContent = n;
    b.addEventListener('click', () => isi(n));
    np.appendChild(b);
  }

  $('mp-lewati').addEventListener('click', lewati);
  $('mp-petunjuk').addEventListener('click', petunjuk);
  $('mp-jeda').addEventListener('click', toggleJeda);
  $('mp-akhiri').addEventListener('click', akhiriPermainan);

  $('mp-overlay').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.lv) { pLevel = b.dataset.lv; render(); }
    else if (b.dataset.mnt) {
      pMenit = Number(b.dataset.mnt);
      s.players[1].time = s.players[2].time = pMenit * 60;
      render();
    }
    else if (b.id === 'mp-mulai') { baru('main'); render(); }
    else if (b.id === 'mp-lanjut') { s.status = 'main'; render(); }
  });

  $('mp-serah').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'mp-mulai-giliran') { s.status = 'main'; render(); }
    else if (b.id === 'mp-batal') batalkan();
  });

  $('mp-hasil').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'mp-menu') { baru('siap'); render(); }
    else if (b.id === 'mp-ulang') { baru('main'); render(); }
  });

  document.addEventListener('keydown', e => {
    if ($('view-multi').hidden || !s || s.status !== 'main') return;
    if (e.key >= '1' && e.key <= '9') { isi(Number(e.key)); return; }
    const arah = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arah[e.key]) {
      e.preventDefault();
      if (!s.terpilih) s.terpilih = { r: 0, c: 0 };
      else {
        const [dr, dc] = arah[e.key];
        s.terpilih = {
          r: Math.min(8, Math.max(0, s.terpilih.r + dr)),
          c: Math.min(8, Math.max(0, s.terpilih.c + dc)),
        };
      }
      renderPapan();
    }
  });

  setInterval(tick, 1000);
}

// ---------- Dipanggil dari main.js ----------
export function bukaMulti() {
  init();
  if (!s) baru('siap');
  render();
}

export function tutupMulti() {
  if (s && s.status === 'main') { s.status = 'jeda'; render(); }
}