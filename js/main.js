import { generatePuzzle } from './sudoku.js';

const { puzzle, solution } = generatePuzzle('sedang');
const papanMain = puzzle.map(r => [...r]); // papan yang lagi dimainkan (puzzle asli jangan diubah)
const papan = document.getElementById('papan');
const infoSalah = document.getElementById('salah');
const MAX_SALAH = 3;

let terpilih = null;
let kesalahan = 0;
let selesai = false;

function gambar() {
  papan.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = document.createElement('div');
      el.className = 'sel';
      el.dataset.r = r;
      el.dataset.c = c;
      el.textContent = papanMain[r][c] || '';
      if (puzzle[r][c]) el.classList.add('awal');

      if (terpilih) {
        const { r: tr, c: tc } = terpilih;
        const sekotak = Math.floor(r / 3) === Math.floor(tr / 3) &&
                        Math.floor(c / 3) === Math.floor(tc / 3);
        if (r === tr && c === tc) el.classList.add('terpilih');
        else if (r === tr || c === tc || sekotak) el.classList.add('terkait');
      }
      el.addEventListener('click', () => { terpilih = { r, c }; gambar(); });
      papan.appendChild(el);
    }
  }
}

function isiAngka(n) {
  if (!terpilih || selesai) return;
  const { r, c } = terpilih;
  if (puzzle[r][c] !== 0) return;     // angka awal nggak boleh diubah
  if (papanMain[r][c] !== 0) return;  // sel sudah terisi benar

  if (solution[r][c] === n) {
    papanMain[r][c] = n;              // benar: angka masuk
  } else {
    kesalahan++;                      // salah: ditolak, kesalahan +1
    infoSalah.textContent = kesalahan;
    if (kesalahan >= MAX_SALAH) {
      selesai = true;
      alert('Kamu kalah! Sudah 3 kali salah.');
    }
  }
  gambar();
}

// tombol angka 1-9 di layar
const numpad = document.getElementById('numpad');
for (let n = 1; n <= 9; n++) {
  const b = document.createElement('button');
  b.textContent = n;
  b.addEventListener('click', () => isiAngka(n));
  numpad.appendChild(b);
}

// keyboard 1-9
document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') isiAngka(Number(e.key));
});

gambar();