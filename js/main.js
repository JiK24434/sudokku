import { generatePuzzle } from './sudoku.js';

const MAX_SALAH = 3;
const JATAH_PETUNJUK = 3;
const NAMA_LEVEL = { santai: 'Santai', sedang: 'Sedang', sulit: 'Sulit' };

const $ = id => document.getElementById(id);
const papan = $('papan');

// data game (diisi ulang tiap mulaiGame)
let puzzle, solution, papanMain, catatan;
let terpilih, kesalahan, selesai, jeda, modeCatatan, sisaPetunjuk, selSalah;
let detik = 0;
let timer = null;
let levelAktif = 'sedang';

// ---------- Streak harian (disimpan di browser) ----------
const KUNCI_STREAK = 'sodokku-streak';
const tgl = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hariIni = () => tgl(new Date());
const kemarin = () => { const d = new Date(); d.setDate(d.getDate() - 1); return tgl(d); };

function bacaStreak() {
  try { return JSON.parse(localStorage.getItem(KUNCI_STREAK)) || { last: null, streak: 0 }; }
  catch { return { last: null, streak: 0 }; }
}
function streakSekarang() {
  const s = bacaStreak();
  return (s.last === hariIni() || s.last === kemarin()) ? s.streak : 0;
}
function catatMenangHarian() {
  const s = bacaStreak();
  if (s.last === hariIni()) return;
  s.streak = s.last === kemarin() ? s.streak + 1 : 1;
  s.last = hariIni();
  try { localStorage.setItem(KUNCI_STREAK, JSON.stringify(s)); } catch {}
}
function gambarStreak(idTeks, idPil) {
  const n = streakSekarang();
  $(idTeks).textContent = `Rangkaian ${n} hari`;
  const pil = $(idPil);
  pil.innerHTML = '';
  for (let i = 1; i <= 7; i++) {
    const p = document.createElement('span');
    p.className = 'pil' + (i <= n ? ' on' : '');
    p.textContent = i;
    pil.appendChild(p);
  }
}

// ---------- Rekor waktu per level ----------
function simpanRekor(level, dtk) {
  const k = 'sodokku-rekor-' + level;
  let lama = null;
  try { lama = Number(localStorage.getItem(k)) || null; } catch {}
  const baru = lama === null || dtk < lama;
  if (baru) { try { localStorage.setItem(k, dtk); } catch {} }
  return baru && lama !== null; // "rekor baru" hanya kalau memecahkan rekor lama
}

// ---------- Mulai game ----------
function mulaiGame(level) {
  levelAktif = level;
  const hasil = generatePuzzle(level);
  puzzle = hasil.puzzle;
  solution = hasil.solution;
  papanMain = puzzle.map(r => [...r]);
  catatan = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));

  terpilih = null;
  kesalahan = 0;
  selesai = false;
  jeda = false;
  modeCatatan = false;
  selSalah = null;
  sisaPetunjuk = JATAH_PETUNJUK;

  $('salah').textContent = 0;
  $('sisa-petunjuk').textContent = sisaPetunjuk;
  $('btn-petunjuk').disabled = false;
  $('badge-catatan').textContent = 'OFF';
  $('badge-catatan').className = 'badge merah';
  $('btn-jeda').classList.remove('dijeda');
  papan.classList.remove('dijeda');
  $('overlay-jeda').hidden = true;
  $('modal').hidden = true;

  document.querySelectorAll('#level button').forEach(b => {
    b.classList.toggle('aktif', b.dataset.level === level);
  });

  gambarStreak('streak-teks', 'streak-pil');
  mulaiTimer();
  gambar();
}

// ---------- Timer ----------
function mulaiTimer() {
  clearInterval(timer);
  detik = 0;
  tampilWaktu();
  timer = setInterval(() => {
    if (selesai || jeda) return;
    detik++;
    tampilWaktu();
  }, 1000);
}
const format = dtk => `${String(Math.floor(dtk / 60)).padStart(2, '0')}:${String(dtk % 60).padStart(2, '0')}`;
function tampilWaktu() { $('waktu').textContent = format(detik); }

// ---------- Gambar papan ----------
function gambar() {
  papan.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = document.createElement('div');
      el.className = 'sel';
      el.dataset.r = r;
      el.dataset.c = c;

      const nilai = papanMain[r][c];
      const cat = catatan[r][c];
      if (nilai) {
        el.textContent = nilai;
        el.classList.add(puzzle[r][c] ? 'awal' : 'isian');
      } else if (cat.size) {
        let h = '';
        for (let k = 1; k <= 9; k++) h += `<span>${cat.has(k) ? k : ''}</span>`;
        el.innerHTML = `<div class="catatan">${h}</div>`;
      }

      if (terpilih) {
        const { r: tr, c: tc } = terpilih;
        const sekotak = Math.floor(r / 3) === Math.floor(tr / 3) &&
                        Math.floor(c / 3) === Math.floor(tc / 3);
        if (r === tr && c === tc) el.classList.add('terpilih');
        else if (r === tr || c === tc || sekotak) el.classList.add('terkait');
      }
      if (selSalah && selSalah.r === r && selSalah.c === c) el.classList.add('goyang');

      el.addEventListener('click', () => { terpilih = { r, c }; gambar(); });
      papan.appendChild(el);
    }
  }
  selSalah = null;
}

// ---------- Cek menang & akhir game ----------
function cekMenang() {
  return papanMain.every((baris, r) => baris.every((v, c) => v === solution[r][c]));
}

function akhir(menang) {
  selesai = true;
  gambar();
  const kartu = document.querySelector('.kartu');
  kartu.classList.toggle('kalah', !menang);
  const nama = NAMA_LEVEL[levelAktif];

  $('m-waktu').textContent = format(detik);
  $('m-salah').textContent = `${kesalahan}/${MAX_SALAH}`;
  $('m-petunjuk').textContent = JATAH_PETUNJUK - sisaPetunjuk;
  $('m-level').textContent = nama;

  if (menang) {
    const rekorBaru = simpanRekor(levelAktif, detik);
    catatMenangHarian();
    gambarStreak('streak-teks', 'streak-pil');
    gambarStreak('m-streak-teks', 'm-streak-pil');
    $('m-kicker').textContent = 'Teka-teki selesai';
    $('m-judul').innerHTML = 'Selamat, <em>kamu menang!</em>';
    $('m-desc').textContent = `Semua 81 kotak terisi dengan benar. Kamu menyelesaikan Sudoku ${nama}.`;
    $('m-rekor').textContent = rekorBaru ? 'Waktu · rekor baru' : 'Waktu';
  } else {
    $('m-kicker').textContent = 'Permainan selesai';
    $('m-judul').innerHTML = 'Yah, <em>kamu kalah.</em>';
    $('m-desc').textContent = `Kamu sudah ${MAX_SALAH} kali salah di Sudoku ${nama}. Coba lagi, pasti bisa!`;
    $('m-rekor').textContent = 'Waktu';
  }
  // jeda kecil biar papan terakhir sempat tergambar
  setTimeout(() => { $('modal').hidden = false; }, 250);
}

// ---------- Isi angka / catatan ----------
function bersihkanCatatan(r, c, n) {
  for (let i = 0; i < 9; i++) { catatan[r][i].delete(n); catatan[i][c].delete(n); }
  const br = r - (r % 3), bc = c - (c % 3);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) catatan[br + i][bc + j].delete(n);
}

function isiAngka(n) {
  if (!terpilih || selesai || jeda) return;
  const { r, c } = terpilih;
  if (puzzle[r][c] !== 0 || papanMain[r][c] !== 0) return;

  if (modeCatatan) {
    const s = catatan[r][c];
    if (s.has(n)) s.delete(n); else s.add(n);
    gambar();
    return;
  }

  if (solution[r][c] === n) {
    papanMain[r][c] = n;
    catatan[r][c].clear();
    bersihkanCatatan(r, c, n);
    gambar();
    if (cekMenang()) akhir(true);
  } else {
    kesalahan++;
    $('salah').textContent = kesalahan;
    selSalah = { r, c };
    gambar();
    if (kesalahan >= MAX_SALAH) akhir(false);
  }
}

// ---------- Hapus, catatan, petunjuk, jeda ----------
function hapus() {
  if (!terpilih || selesai || jeda) return;
  catatan[terpilih.r][terpilih.c].clear();
  gambar();
}

function toggleCatatan() {
  if (selesai || jeda) return;
  modeCatatan = !modeCatatan;
  const b = $('badge-catatan');
  b.textContent = modeCatatan ? 'ON' : 'OFF';
  b.className = 'badge ' + (modeCatatan ? 'hijau' : 'merah');
}

function pakaiPetunjuk() {
  if (selesai || jeda || sisaPetunjuk <= 0) return;

  let target = null;
  if (terpilih && papanMain[terpilih.r][terpilih.c] === 0) {
    target = terpilih;
  } else {
    const kosong = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (papanMain[r][c] === 0) kosong.push({ r, c });
    if (!kosong.length) return;
    target = kosong[Math.floor(Math.random() * kosong.length)];
  }

  const n = solution[target.r][target.c];
  papanMain[target.r][target.c] = n;
  catatan[target.r][target.c].clear();
  bersihkanCatatan(target.r, target.c, n);
  terpilih = target;
  sisaPetunjuk--;
  $('sisa-petunjuk').textContent = sisaPetunjuk;
  if (sisaPetunjuk === 0) $('btn-petunjuk').disabled = true;

  gambar();
  if (cekMenang()) akhir(true);
}

function toggleJeda() {
  if (selesai) return;
  jeda = !jeda;
  papan.classList.toggle('dijeda', jeda);
  $('overlay-jeda').hidden = !jeda;
  $('btn-jeda').classList.toggle('dijeda', jeda);
}

// ---------- Tombol angka 1-9 ----------
const numpad = $('numpad');
for (let n = 1; n <= 9; n++) {
  const b = document.createElement('button');
  b.textContent = n;
  b.addEventListener('click', () => isiAngka(n));
  numpad.appendChild(b);
}

// ---------- Keyboard ----------
document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') { isiAngka(Number(e.key)); return; }
  if (e.key === 'n' || e.key === 'N') { toggleCatatan(); return; }
  if (e.key === 'Backspace' || e.key === 'Delete') { hapus(); return; }

  const arah = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (arah[e.key]) {
    e.preventDefault();
    if (selesai || jeda) return;
    if (!terpilih) terpilih = { r: 0, c: 0 };
    else {
      const [dr, dc] = arah[e.key];
      terpilih = {
        r: Math.min(8, Math.max(0, terpilih.r + dr)),
        c: Math.min(8, Math.max(0, terpilih.c + dc)),
      };
    }
    gambar();
  }
});

// ---------- Tombol-tombol ----------
$('btn-hapus').addEventListener('click', hapus);
$('btn-catatan').addEventListener('click', toggleCatatan);
$('btn-petunjuk').addEventListener('click', pakaiPetunjuk);
$('btn-jeda').addEventListener('click', toggleJeda);
$('btn-ulang').addEventListener('click', () => mulaiGame(levelAktif));
$('m-lagi').addEventListener('click', () => mulaiGame(levelAktif));
$('m-lihat').addEventListener('click', () => { $('modal').hidden = true; });
$('tab-multi').addEventListener('click', () => alert('Multi Player segera hadir!'));
document.querySelectorAll('#level button').forEach(b => {
  b.addEventListener('click', () => mulaiGame(b.dataset.level));
});

// ---------- Jalankan pertama kali ----------
mulaiGame('sedang');