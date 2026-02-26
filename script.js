const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: "#06b6d4",
  O: "#facc15",
  T: "#a855f7",
  S: "#22c55e",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#f97316",
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const boardCanvas = document.getElementById("board");
const boardCtx = boardCanvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const linesEl = document.getElementById("lines");
const overlayEl = document.getElementById("overlay");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");

let board = [];
let current = null;
let next = null;
let score = 0;
let level = 1;
let lines = 0;
let dropCounter = 0;
let lastTime = 0;
let running = false;
let paused = false;
let gameOver = false;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const types = Object.keys(SHAPES);
  const type = types[(Math.random() * types.length) | 0];
  const matrix = SHAPES[type].map((row) => [...row]);
  return {
    type,
    matrix,
    x: Math.floor(COLS / 2) - Math.ceil(matrix[0].length / 2),
    y: -1,
  };
}

function rotate(matrix) {
  const n = matrix.length;
  const rotated = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      rotated[x][n - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

function collides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const newX = piece.x + x + offsetX;
      const newY = piece.y + y + offsetY;
      if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
      if (newY >= 0 && board[newY][newX]) return true;
    }
  }
  return false;
}

function mergePiece(piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const by = piece.y + y;
      const bx = piece.x + x;
      if (by >= 0) board[by][bx] = piece.type;
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every((cell) => cell !== null)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = Math.floor(lines / 10) + 1;
    updateHud();
  }
}

function dropInterval() {
  return Math.max(100, 900 - (level - 1) * 70);
}

function spawnPiece() {
  current = next || randomPiece();
  next = randomPiece();
  current.x = Math.floor(COLS / 2) - Math.ceil(current.matrix[0].length / 2);
  current.y = -1;

  if (collides(current)) {
    gameOver = true;
    running = false;
    paused = false;
    pauseBtn.textContent = "暫停";
    showOverlay("遊戲結束\n按 R 或點擊重新開始");
  }
}

function softDrop() {
  if (!running) return;

  if (!collides(current, 0, 1)) {
    current.y += 1;
  } else {
    mergePiece(current);
    clearLines();
    spawnPiece();
  }
  dropCounter = 0;
}

function hardDrop() {
  if (!running) return;
  while (!collides(current, 0, 1)) {
    current.y += 1;
    score += 2;
  }
  updateHud();
  softDrop();
}

function move(dir) {
  if (!running || collides(current, dir, 0)) return;
  current.x += dir;
}

function spin() {
  if (!running) return;
  const rotated = rotate(current.matrix);
  const kicks = [0, -1, 1, -2, 2];

  for (const kick of kicks) {
    if (!collides(current, kick, 0, rotated)) {
      current.matrix = rotated;
      current.x += kick;
      return;
    }
  }
}

function updateHud() {
  scoreEl.textContent = String(score);
  levelEl.textContent = String(level);
  linesEl.textContent = String(lines);
}

function drawCell(ctx, x, y, color, size = BLOCK) {
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size, size);
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.strokeRect(x * size, y * size, size, size);
}

function drawBoard() {
  boardCtx.fillStyle = "#020617";
  boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const type = board[y][x];
      if (type) {
        drawCell(boardCtx, x, y, COLORS[type]);
      } else {
        boardCtx.strokeStyle = "#1e293b";
        boardCtx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
      }
    }
  }

  if (current) {
    current.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        const drawY = current.y + y;
        if (drawY >= 0) drawCell(boardCtx, current.x + x, drawY, COLORS[current.type]);
      });
    });
  }
}

function drawNext() {
  nextCtx.fillStyle = "#020617";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!next) return;

  const size = 24;
  const matrix = next.matrix;
  const offsetX = Math.floor((nextCanvas.width / size - matrix[0].length) / 2);
  const offsetY = Math.floor((nextCanvas.height / size - matrix.length) / 2);

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(nextCtx, x + offsetX, y + offsetY, COLORS[next.type], size);
    });
  });
}

function draw() {
  drawBoard();
  drawNext();
}

function showOverlay(text) {
  overlayEl.textContent = text;
  overlayEl.classList.remove("hidden");
}

function hideOverlay() {
  overlayEl.classList.add("hidden");
}

function resetGame() {
  board = createBoard();
  score = 0;
  level = 1;
  lines = 0;
  dropCounter = 0;
  gameOver = false;
  paused = false;
  running = true;
  pauseBtn.textContent = "暫停";

  current = randomPiece();
  next = randomPiece();

  updateHud();
  hideOverlay();
}

function togglePause() {
  if (gameOver) return;

  if (running) {
    running = false;
    paused = true;
    pauseBtn.textContent = "繼續";
    showOverlay("已暫停\n按 P 或點擊繼續");
    return;
  }

  if (paused) {
    running = true;
    paused = false;
    pauseBtn.textContent = "暫停";
    hideOverlay();
  }
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (running) {
    dropCounter += delta;
    if (dropCounter > dropInterval()) softDrop();
  }

  draw();
  requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "ArrowLeft":
      move(-1);
      break;
    case "ArrowRight":
      move(1);
      break;
    case "ArrowDown":
      if (running) {
        softDrop();
        score += 1;
        updateHud();
      }
      break;
    case "ArrowUp":
      spin();
      break;
    case "Space":
      hardDrop();
      break;
    case "KeyP":
      togglePause();
      break;
    case "KeyR":
      resetGame();
      break;
    default:
      return;
  }
  event.preventDefault();
});

restartBtn.addEventListener("click", resetGame);
pauseBtn.addEventListener("click", togglePause);

resetGame();
requestAnimationFrame(update);
