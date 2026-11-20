// Cek apakah angka n boleh ditaruh di baris r, kolom c
export function isValid(board, r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === n || board[i][c] === n) return false;
  }
  const br = r - (r % 3), bc = c - (c % 3);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (board[br + i][bc + j] === n) return false;
  return true;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Isi papan penuh secara acak (backtracking)
function fill(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      for (const n of shuffle([1,2,3,4,5,6,7,8,9])) {
        if (isValid(board, r, c, n)) {
          board[r][c] = n;
          if (fill(board)) return true;
          board[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

// Hitung jumlah solusi (berhenti di 'limit') buat mastiin puzzle cuma punya 1 jawaban
function countSolutions(board, limit = 2) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      let count = 0;
      for (let n = 1; n <= 9; n++) {
        if (!isValid(board, r, c, n)) continue;
        board[r][c] = n;
        count += countSolutions(board, limit - count);
        board[r][c] = 0;
        if (count >= limit) break;
      }
      return count;
    }
  }
  return 1;
}

const KOSONG = { santai: 38, sedang: 46, sulit: 52 }; // jumlah kotak yang dikosongin

export function generatePuzzle(level = 'sedang') {
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  fill(solution);

  const puzzle = solution.map(row => [...row]);
  const cells = shuffle([...Array(81).keys()]);
  let removed = 0;

  for (const idx of cells) {
    if (removed >= KOSONG[level]) break;
    const r = Math.floor(idx / 9), c = idx % 9;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle.map(row => [...row])) !== 1) {
      puzzle[r][c] = backup; // kalau jawabannya jadi ambigu, balikin
    } else {
      removed++;
    }
  }
  return { puzzle, solution };
}