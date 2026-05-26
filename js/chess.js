// Chess rules engine. 8x8 board, indices [0..7][0..7] where rank 0 = white back rank.
// Pieces: { t: 'P'|'N'|'B'|'R'|'Q'|'K', c: 'w'|'b', moved: bool }

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function sq(r, f) {
  return { r, f };
}

export function inBounds(r, f) {
  return r >= 0 && r < 8 && f >= 0 && f < 8;
}

export function squareName(r, f) {
  return FILES[f] + (r + 1);
}

export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    const empty = () =>
      Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
    this.board = empty();
    const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
    for (let f = 0; f < 8; f++) {
      this.board[0][f] = { t: back[f], c: "w", moved: false };
      this.board[1][f] = { t: "P", c: "w", moved: false };
      this.board[6][f] = { t: "P", c: "b", moved: false };
      this.board[7][f] = { t: back[f], c: "b", moved: false };
    }
    this.turn = "w";
    this.history = [];
    this.enPassant = null; // {r,f} square that can be captured en passant
    this.halfmove = 0;
    this.fullmove = 1;
  }

  clone() {
    const g = new Game();
    g.board = this.board.map((row) =>
      row.map((p) => (p ? { ...p } : null))
    );
    g.turn = this.turn;
    g.history = this.history.slice();
    g.enPassant = this.enPassant ? { ...this.enPassant } : null;
    g.halfmove = this.halfmove;
    g.fullmove = this.fullmove;
    return g;
  }

  pieceAt(r, f) {
    if (!inBounds(r, f)) return null;
    return this.board[r][f];
  }

  // Returns array of {from:{r,f}, to:{r,f}, piece, captured, promo?, castle?, ep?}
  generateMoves(color = this.turn, pseudo = false) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = this.board[r][f];
        if (!p || p.c !== color) continue;
        this._pieceMoves(r, f, p, moves);
      }
    }
    if (pseudo) return moves;
    // filter moves that leave own king in check
    return moves.filter((m) => {
      const undo = this._apply(m);
      const inCheck = this.isInCheck(color);
      this._undo(undo);
      return !inCheck;
    });
  }

  legalMovesFrom(r, f) {
    const p = this.board[r][f];
    if (!p) return [];
    const all = this.generateMoves(p.c);
    return all.filter((m) => m.from.r === r && m.from.f === f);
  }

  _pieceMoves(r, f, p, out) {
    switch (p.t) {
      case "P":
        return this._pawnMoves(r, f, p, out);
      case "N":
        return this._stepMoves(
          r,
          f,
          p,
          out,
          [
            [1, 2],
            [2, 1],
            [-1, 2],
            [-2, 1],
            [1, -2],
            [2, -1],
            [-1, -2],
            [-2, -1],
          ],
          false
        );
      case "B":
        return this._stepMoves(
          r,
          f,
          p,
          out,
          [
            [1, 1],
            [-1, 1],
            [1, -1],
            [-1, -1],
          ],
          true
        );
      case "R":
        return this._stepMoves(
          r,
          f,
          p,
          out,
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ],
          true
        );
      case "Q":
        return this._stepMoves(
          r,
          f,
          p,
          out,
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [-1, 1],
            [1, -1],
            [-1, -1],
          ],
          true
        );
      case "K":
        this._stepMoves(
          r,
          f,
          p,
          out,
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [-1, 1],
            [1, -1],
            [-1, -1],
          ],
          false
        );
        this._castleMoves(r, f, p, out);
        return;
    }
  }

  _pawnMoves(r, f, p, out) {
    const dir = p.c === "w" ? 1 : -1;
    const startRank = p.c === "w" ? 1 : 6;
    const promoRank = p.c === "w" ? 7 : 0;
    // forward 1
    if (inBounds(r + dir, f) && !this.board[r + dir][f]) {
      this._pushPawnMove(r, f, r + dir, f, p, null, out, promoRank);
      // forward 2
      if (r === startRank && !this.board[r + 2 * dir][f]) {
        out.push({
          from: { r, f },
          to: { r: r + 2 * dir, f },
          piece: p,
          captured: null,
          double: true,
        });
      }
    }
    // captures
    for (const df of [-1, 1]) {
      const nr = r + dir;
      const nf = f + df;
      if (!inBounds(nr, nf)) continue;
      const target = this.board[nr][nf];
      if (target && target.c !== p.c) {
        this._pushPawnMove(r, f, nr, nf, p, target, out, promoRank);
      }
      // en passant
      if (
        this.enPassant &&
        this.enPassant.r === nr &&
        this.enPassant.f === nf
      ) {
        out.push({
          from: { r, f },
          to: { r: nr, f: nf },
          piece: p,
          captured: this.board[r][nf], // the pawn beside us
          ep: true,
        });
      }
    }
  }

  _pushPawnMove(r, f, nr, nf, p, captured, out, promoRank) {
    if (nr === promoRank) {
      for (const promo of ["Q", "R", "B", "N"]) {
        out.push({
          from: { r, f },
          to: { r: nr, f: nf },
          piece: p,
          captured,
          promo,
        });
      }
    } else {
      out.push({ from: { r, f }, to: { r: nr, f: nf }, piece: p, captured });
    }
  }

  _stepMoves(r, f, p, out, dirs, sliding) {
    for (const [dr, df] of dirs) {
      let nr = r + dr;
      let nf = f + df;
      while (inBounds(nr, nf)) {
        const target = this.board[nr][nf];
        if (!target) {
          out.push({ from: { r, f }, to: { r: nr, f: nf }, piece: p });
        } else {
          if (target.c !== p.c) {
            out.push({
              from: { r, f },
              to: { r: nr, f: nf },
              piece: p,
              captured: target,
            });
          }
          break;
        }
        if (!sliding) break;
        nr += dr;
        nf += df;
      }
    }
  }

  _castleMoves(r, f, p, out) {
    if (p.moved) return;
    if (this.isInCheck(p.c)) return;
    // kingside
    const rookK = this.board[r][7];
    if (
      rookK &&
      rookK.t === "R" &&
      rookK.c === p.c &&
      !rookK.moved &&
      !this.board[r][5] &&
      !this.board[r][6]
    ) {
      if (
        !this._squareAttacked(r, 5, p.c === "w" ? "b" : "w") &&
        !this._squareAttacked(r, 6, p.c === "w" ? "b" : "w")
      ) {
        out.push({
          from: { r, f },
          to: { r, f: 6 },
          piece: p,
          castle: "K",
        });
      }
    }
    // queenside
    const rookQ = this.board[r][0];
    if (
      rookQ &&
      rookQ.t === "R" &&
      rookQ.c === p.c &&
      !rookQ.moved &&
      !this.board[r][1] &&
      !this.board[r][2] &&
      !this.board[r][3]
    ) {
      if (
        !this._squareAttacked(r, 2, p.c === "w" ? "b" : "w") &&
        !this._squareAttacked(r, 3, p.c === "w" ? "b" : "w")
      ) {
        out.push({
          from: { r, f },
          to: { r, f: 2 },
          piece: p,
          castle: "Q",
        });
      }
    }
  }

  // does `byColor` attack square (r,f)?
  _squareAttacked(r, f, byColor) {
    // pawn
    const dir = byColor === "w" ? 1 : -1;
    for (const df of [-1, 1]) {
      const pr = r - dir;
      const pf = f - df;
      if (inBounds(pr, pf)) {
        const p = this.board[pr][pf];
        if (p && p.c === byColor && p.t === "P") return true;
      }
    }
    // knights
    for (const [dr, df] of [
      [1, 2],
      [2, 1],
      [-1, 2],
      [-2, 1],
      [1, -2],
      [2, -1],
      [-1, -2],
      [-2, -1],
    ]) {
      const nr = r + dr;
      const nf = f + df;
      if (!inBounds(nr, nf)) continue;
      const p = this.board[nr][nf];
      if (p && p.c === byColor && p.t === "N") return true;
    }
    // king
    for (const dr of [-1, 0, 1]) {
      for (const df of [-1, 0, 1]) {
        if (!dr && !df) continue;
        const nr = r + dr;
        const nf = f + df;
        if (!inBounds(nr, nf)) continue;
        const p = this.board[nr][nf];
        if (p && p.c === byColor && p.t === "K") return true;
      }
    }
    // sliding: rook/queen orthogonal
    for (const [dr, df] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      let nr = r + dr;
      let nf = f + df;
      while (inBounds(nr, nf)) {
        const p = this.board[nr][nf];
        if (p) {
          if (p.c === byColor && (p.t === "R" || p.t === "Q")) return true;
          break;
        }
        nr += dr;
        nf += df;
      }
    }
    // sliding: bishop/queen diagonal
    for (const [dr, df] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      let nr = r + dr;
      let nf = f + df;
      while (inBounds(nr, nf)) {
        const p = this.board[nr][nf];
        if (p) {
          if (p.c === byColor && (p.t === "B" || p.t === "Q")) return true;
          break;
        }
        nr += dr;
        nf += df;
      }
    }
    return false;
  }

  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = this.board[r][f];
        if (p && p.t === "K" && p.c === color) return { r, f };
      }
    }
    return null;
  }

  isInCheck(color) {
    const k = this.findKing(color);
    if (!k) return false;
    return this._squareAttacked(k.r, k.f, color === "w" ? "b" : "w");
  }

  isCheckmate(color = this.turn) {
    return this.isInCheck(color) && this.generateMoves(color).length === 0;
  }

  isStalemate(color = this.turn) {
    return !this.isInCheck(color) && this.generateMoves(color).length === 0;
  }

  isInsufficientMaterial() {
    let pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = this.board[r][f];
        if (p && p.t !== "K") pieces.push({ ...p, r, f });
      }
    }
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && (pieces[0].t === "B" || pieces[0].t === "N"))
      return true;
    if (
      pieces.length === 2 &&
      pieces.every((p) => p.t === "B") &&
      pieces[0].c !== pieces[1].c
    ) {
      const sq = (r, f) => (r + f) % 2;
      if (sq(pieces[0].r, pieces[0].f) === sq(pieces[1].r, pieces[1].f))
        return true;
    }
    return false;
  }

  // Apply a move; return undo info.
  _apply(m) {
    const undo = {
      from: { ...m.from },
      to: { ...m.to },
      piece: this.board[m.from.r][m.from.f],
      moved: this.board[m.from.r][m.from.f]?.moved,
      captured: this.board[m.to.r][m.to.f],
      capturedSquare: { r: m.to.r, f: m.to.f },
      capturedMoved: this.board[m.to.r][m.to.f]?.moved,
      enPassant: this.enPassant ? { ...this.enPassant } : null,
      castleRook: null,
      promo: m.promo || null,
      halfmove: this.halfmove,
      fullmove: this.fullmove,
      turn: this.turn,
    };

    const moving = { ...undo.piece, moved: true };
    this.board[m.from.r][m.from.f] = null;

    // en passant capture removes pawn behind
    if (m.ep) {
      const dir = moving.c === "w" ? 1 : -1;
      undo.captured = this.board[m.to.r - dir][m.to.f];
      undo.capturedSquare = { r: m.to.r - dir, f: m.to.f };
      this.board[m.to.r - dir][m.to.f] = null;
    }

    this.board[m.to.r][m.to.f] = moving;

    // promotion
    if (m.promo) {
      this.board[m.to.r][m.to.f] = { t: m.promo, c: moving.c, moved: true };
    }

    // castling: move rook
    if (m.castle === "K") {
      const rook = this.board[m.from.r][7];
      undo.castleRook = { from: { r: m.from.r, f: 7 }, to: { r: m.from.r, f: 5 }, moved: rook.moved };
      this.board[m.from.r][7] = null;
      this.board[m.from.r][5] = { ...rook, moved: true };
    } else if (m.castle === "Q") {
      const rook = this.board[m.from.r][0];
      undo.castleRook = { from: { r: m.from.r, f: 0 }, to: { r: m.from.r, f: 3 }, moved: rook.moved };
      this.board[m.from.r][0] = null;
      this.board[m.from.r][3] = { ...rook, moved: true };
    }

    // update en passant target
    if (m.double) {
      const dir = moving.c === "w" ? 1 : -1;
      this.enPassant = { r: m.from.r + dir, f: m.from.f };
    } else {
      this.enPassant = null;
    }

    // halfmove counter
    if (moving.t === "P" || undo.captured) this.halfmove = 0;
    else this.halfmove++;

    if (this.turn === "b") this.fullmove++;
    this.turn = this.turn === "w" ? "b" : "w";
    return undo;
  }

  _undo(u) {
    this.turn = u.turn;
    this.halfmove = u.halfmove;
    this.fullmove = u.fullmove;
    this.enPassant = u.enPassant;
    // restore from
    this.board[u.from.r][u.from.f] = { ...u.piece, moved: u.moved };
    // clear to
    this.board[u.to.r][u.to.f] = null;
    // restore captured
    if (u.captured) {
      this.board[u.capturedSquare.r][u.capturedSquare.f] = {
        ...u.captured,
        moved: u.capturedMoved,
      };
    }
    // restore rook
    if (u.castleRook) {
      const rook = this.board[u.castleRook.to.r][u.castleRook.to.f];
      this.board[u.castleRook.to.r][u.castleRook.to.f] = null;
      this.board[u.castleRook.from.r][u.castleRook.from.f] = {
        ...rook,
        moved: u.castleRook.moved,
      };
    }
  }

  // Public: try to make a move. Returns the canonical move object (with metadata) or null.
  move(from, to, promo = "Q") {
    const legal = this.generateMoves(this.turn);
    const candidates = legal.filter(
      (m) =>
        m.from.r === from.r &&
        m.from.f === from.f &&
        m.to.r === to.r &&
        m.to.f === to.f
    );
    if (!candidates.length) return null;
    let chosen = candidates[0];
    if (candidates.length > 1 && candidates[0].promo) {
      chosen = candidates.find((m) => m.promo === promo) || candidates[0];
    }
    const undo = this._apply(chosen);
    this.history.push({ move: chosen, undo });
    return chosen;
  }

  undo() {
    const last = this.history.pop();
    if (!last) return null;
    this._undo(last.undo);
    return last.move;
  }

  status() {
    if (this.isCheckmate(this.turn))
      return {
        over: true,
        result: this.turn === "w" ? "0-1" : "1-0",
        reason: "checkmate",
        winner: this.turn === "w" ? "b" : "w",
      };
    if (this.isStalemate(this.turn))
      return { over: true, result: "1/2-1/2", reason: "stalemate" };
    if (this.isInsufficientMaterial())
      return { over: true, result: "1/2-1/2", reason: "insufficient" };
    if (this.halfmove >= 100)
      return { over: true, result: "1/2-1/2", reason: "50-move" };
    return { over: false, check: this.isInCheck(this.turn) };
  }
}
