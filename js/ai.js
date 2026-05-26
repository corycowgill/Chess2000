// Lightweight chess AI using negamax with alpha-beta pruning + piece-square tables.

const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Piece-square tables from white's perspective (rank 0 = back rank for white)
// Mirror for black.
const PST = {
  P: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  N: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  B: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  R: [
    [0, 0, 5, 10, 10, 5, 0, 0],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  Q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  K: [
    [20, 30, 10, 0, 0, 10, 30, 20],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
  ],
};

function evaluate(game) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = game.board[r][f];
      if (!p) continue;
      const base = VAL[p.t];
      const pst = PST[p.t][p.c === "w" ? r : 7 - r][f];
      const v = base + pst;
      score += p.c === "w" ? v : -v;
    }
  }
  return score;
}

function mvvLva(move) {
  if (!move.captured) return 0;
  return VAL[move.captured.t] * 10 - VAL[move.piece.t];
}

function orderMoves(moves) {
  return moves.sort((a, b) => mvvLva(b) - mvvLva(a));
}

function negamax(game, depth, alpha, beta, color, deadline) {
  if (Date.now() > deadline) return { score: 0, timeout: true };

  if (depth === 0) {
    return { score: color * evaluate(game) };
  }

  const moves = game.generateMoves(game.turn);
  if (!moves.length) {
    if (game.isInCheck(game.turn)) {
      return { score: -100000 + (50 - depth) };
    }
    return { score: 0 };
  }

  orderMoves(moves);
  let best = -Infinity;
  let bestMove = moves[0];
  for (const m of moves) {
    const undo = game._apply(m);
    const res = negamax(game, depth - 1, -beta, -alpha, -color, deadline);
    game._undo(undo);
    if (res.timeout) return { score: 0, timeout: true };
    const score = -res.score;
    if (score > best) {
      best = score;
      bestMove = m;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return { score: best, move: bestMove };
}

export function findBestMove(game, opts = {}) {
  const maxDepth = opts.depth ?? 3;
  const timeMs = opts.timeMs ?? 1200;
  const deadline = Date.now() + timeMs;
  const color = game.turn === "w" ? 1 : -1;
  let best = null;
  // Iterative deepening for nicer behavior + time control
  for (let d = 1; d <= maxDepth; d++) {
    const res = negamax(game, d, -Infinity, Infinity, color, deadline);
    if (res.timeout) break;
    if (res.move) best = res.move;
    if (Date.now() > deadline) break;
  }
  if (!best) {
    const moves = game.generateMoves(game.turn);
    best = moves[Math.floor(Math.random() * moves.length)];
  }
  return best;
}
