import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { Game, FILES } from "./chess.js";
import { createPiece } from "./pieces.js";
import {
  createSky,
  createSkyline,
  createLake,
  createPlaza,
  createGround,
  createLandmarks,
  createCTATrack,
  setupLights,
} from "./skyline.js";
import { findBestMove } from "./ai.js";

// ---------------- World constants ----------------
const SQ = 1.0;
const BOARD_HALF = 4 * SQ;

// ---------------- Symbol map for captured display ----------------
const PIECE_GLYPH = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

// ---------------- DOM ----------------
const canvas = document.getElementById("scene");
const statusEl = document.getElementById("status");
const btnNew = document.getElementById("btn-new");
const btnMode = document.getElementById("btn-mode");
const btnSwap = document.getElementById("btn-swap");
const btnUndo = document.getElementById("btn-undo");
const btnRotate = document.getElementById("btn-rotate");
const promoEl = document.getElementById("promo");
const endgameEl = document.getElementById("endgame");
const endgameTitle = document.getElementById("endgame-title");
const endgameSub = document.getElementById("endgame-sub");
const endgameAgain = document.getElementById("endgame-again");
const passEl = document.getElementById("pass");
const passSub = document.getElementById("pass-sub");
const passOk = document.getElementById("pass-ok");
const loadingEl = document.getElementById("loading");
const capturedW = document.getElementById("captured-w");
const capturedB = document.getElementById("captured-b");

// ---------------- Three.js setup ----------------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// Deeper, softer fog so landmarks feel pushed back atmospherically and the
// play area stays clean and well-lit.
scene.fog = new THREE.Fog(0x2c3a55, 18, 75);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 7.5, 9.5);

setupLights(scene);
scene.add(createSky());
scene.add(createGround());
scene.add(createLake());
scene.add(createPlaza());
scene.add(createLandmarks());
scene.add(createSkyline());

// CTA "L" elevated loop with animated 3-car Red Line train.
const cta = createCTATrack();
scene.add(cta);

// Environment map for proper PBR reflections (the Bean, metallic spires)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.3, 0);
controls.enablePan = false;
controls.minDistance = 7;
controls.maxDistance = 16;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = Math.PI * 0.46;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.7;

// ---------------- Board ----------------
const boardGroup = new THREE.Group();
scene.add(boardGroup);

const SQUARE_LIGHT = new THREE.MeshStandardMaterial({
  color: 0xf6f1e3, // Chicago flag cream/white
  roughness: 0.55,
  metalness: 0.12,
});
const SQUARE_DARK = new THREE.MeshStandardMaterial({
  color: 0x41b6e6, // Chicago flag light blue
  roughness: 0.45,
  metalness: 0.18,
});
const HIGHLIGHT_MOVE = new THREE.MeshBasicMaterial({
  color: 0x6fff8a,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
});
const HIGHLIGHT_CAP = new THREE.MeshBasicMaterial({
  color: 0xff5a5a,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
});
const HIGHLIGHT_SEL = new THREE.MeshBasicMaterial({
  color: 0xfff1a8,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});
const HIGHLIGHT_CHECK = new THREE.MeshBasicMaterial({
  color: 0xff3838,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});

// Outer border / plinth
{
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(8 * SQ + 1.4, 0.32, 8 * SQ + 1.4),
    new THREE.MeshStandardMaterial({
      color: 0x122a4a,
      roughness: 0.45,
      metalness: 0.55,
    })
  );
  border.position.y = -0.2;
  border.receiveShadow = true;
  boardGroup.add(border);

  // red Chicago stripe accents on the border
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(8 * SQ + 1.4, 0.04, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0xb3242b,
        roughness: 0.4,
        metalness: 0.1,
      })
    );
    stripe.position.set(0, -0.03, side * (BOARD_HALF + 0.32));
    boardGroup.add(stripe);
  }
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 8 * SQ + 1.4),
      new THREE.MeshStandardMaterial({
        color: 0xb3242b,
        roughness: 0.4,
        metalness: 0.1,
      })
    );
    stripe.position.set(side * (BOARD_HALF + 0.32), -0.03, 0);
    boardGroup.add(stripe);
  }
}

// Squares
const squareMeshes = []; // [r][f]
const highlightMeshes = []; // [r][f]
for (let r = 0; r < 8; r++) {
  squareMeshes[r] = [];
  highlightMeshes[r] = [];
  for (let f = 0; f < 8; f++) {
    const isLight = (r + f) % 2 === 1;
    const sqGeo = new THREE.BoxGeometry(SQ * 0.998, 0.06, SQ * 0.998);
    const sq = new THREE.Mesh(sqGeo, isLight ? SQUARE_LIGHT : SQUARE_DARK);
    const x = (f - 3.5) * SQ;
    const z = -(r - 3.5) * SQ;
    sq.position.set(x, 0, z);
    sq.receiveShadow = true;
    sq.userData = { r, f, kind: "square" };
    boardGroup.add(sq);
    squareMeshes[r][f] = sq;

    // highlight plate (initially invisible)
    const hi = new THREE.Mesh(
      new THREE.PlaneGeometry(SQ * 0.92, SQ * 0.92),
      HIGHLIGHT_MOVE
    );
    hi.rotation.x = -Math.PI / 2;
    hi.position.set(x, 0.04, z);
    hi.visible = false;
    hi.userData = { r, f, kind: "highlight" };
    boardGroup.add(hi);
    highlightMeshes[r][f] = hi;
  }
}

// File/rank labels (etched into the border) — simple sprites
function makeLabel(text, color = "#cfe4f7") {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.font = "bold 38px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 32, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}
for (let f = 0; f < 8; f++) {
  const m = makeLabel(FILES[f]);
  m.position.set((f - 3.5) * SQ, -0.015, BOARD_HALF + 0.45);
  boardGroup.add(m);
  const m2 = makeLabel(FILES[f]);
  m2.position.set((f - 3.5) * SQ, -0.015, -(BOARD_HALF + 0.45));
  m2.rotation.z = Math.PI;
  boardGroup.add(m2);
}
for (let r = 0; r < 8; r++) {
  const m = makeLabel(String(r + 1));
  m.position.set(-(BOARD_HALF + 0.45), -0.015, -(r - 3.5) * SQ);
  boardGroup.add(m);
  const m2 = makeLabel(String(r + 1));
  m2.position.set(BOARD_HALF + 0.45, -0.015, -(r - 3.5) * SQ);
  boardGroup.add(m2);
}

// ---------------- Game state ----------------
const game = new Game();
const pieceMeshes = new Map(); // key "r,f" -> THREE.Group
let mode = "cpu"; // 'cpu' or 'pvp'
let cpuColor = "b";
let viewOrientation = 1; // 1 = white at bottom, -1 = black at bottom
let selectedSq = null; // {r,f}
let legalForSelected = []; // moves from chess
let busy = false; // animations / AI
let pendingPromotion = null; // { from, to, callback }
let awaitingPass = false; // 2p hand-off

function squareToWorld(r, f) {
  return new THREE.Vector3((f - 3.5) * SQ, 0.03, -(r - 3.5) * SQ);
}

function clearPieces() {
  for (const [, mesh] of pieceMeshes) scene.remove(mesh);
  pieceMeshes.clear();
}

function placePieces() {
  clearPieces();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = game.board[r][f];
      if (!p) continue;
      spawnPieceMesh(p, r, f);
    }
  }
}

function spawnPieceMesh(piece, r, f) {
  const mesh = createPiece(piece.t, piece.c);
  const pos = squareToWorld(r, f);
  mesh.position.copy(pos);
  // Orient knights to face forward (toward opponent)
  if (piece.t === "N") {
    mesh.rotation.y = piece.c === "w" ? 0 : Math.PI;
  }
  mesh.userData.color = piece.c;
  mesh.userData.type = piece.t;
  mesh.userData.coords = { r, f };
  scene.add(mesh);
  pieceMeshes.set(`${r},${f}`, mesh);
  return mesh;
}

// ---------------- Highlights ----------------
function clearHighlights() {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      highlightMeshes[r][f].visible = false;
      highlightMeshes[r][f].material = HIGHLIGHT_MOVE;
    }
  }
}

function showLegal(moves, fromR, fromF) {
  clearHighlights();
  const sel = highlightMeshes[fromR][fromF];
  sel.material = HIGHLIGHT_SEL;
  sel.visible = true;
  for (const m of moves) {
    const hi = highlightMeshes[m.to.r][m.to.f];
    hi.material = m.captured ? HIGHLIGHT_CAP : HIGHLIGHT_MOVE;
    hi.visible = true;
  }
  // Highlight king if in check
  const inCheck = game.isInCheck(game.turn);
  if (inCheck) {
    const k = game.findKing(game.turn);
    if (k) {
      const hi = highlightMeshes[k.r][k.f];
      hi.material = HIGHLIGHT_CHECK;
      hi.visible = true;
    }
  }
}

function showCheckOnly() {
  clearHighlights();
  if (game.isInCheck(game.turn)) {
    const k = game.findKing(game.turn);
    if (k) {
      const hi = highlightMeshes[k.r][k.f];
      hi.material = HIGHLIGHT_CHECK;
      hi.visible = true;
    }
  }
}

// ---------------- Move animation ----------------
function animateMove(from, to, durationMs = 260) {
  return new Promise((resolve) => {
    const key = `${from.r},${from.f}`;
    const mesh = pieceMeshes.get(key);
    if (!mesh) return resolve();
    pieceMeshes.delete(key);
    pieceMeshes.set(`${to.r},${to.f}`, mesh);
    mesh.userData.coords = { r: to.r, f: to.f };

    const start = mesh.position.clone();
    const end = squareToWorld(to.r, to.f);
    const peak = Math.max(0.45, mesh.userData.type === "N" ? 0.9 : 0.3);

    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / durationMs);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      mesh.position.x = start.x + (end.x - start.x) * ease;
      mesh.position.z = start.z + (end.z - start.z) * ease;
      const arc = Math.sin(ease * Math.PI) * peak;
      mesh.position.y = start.y + (end.y - start.y) * ease + arc;
      if (t < 1) requestAnimationFrame(step);
      else {
        mesh.position.copy(end);
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function removeCapturedAt(r, f) {
  const key = `${r},${f}`;
  const mesh = pieceMeshes.get(key);
  if (!mesh) return null;
  pieceMeshes.delete(key);
  // little "fall" animation
  const t0 = performance.now();
  const dur = 380;
  function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    mesh.position.y -= 0.04;
    mesh.rotation.x += 0.1;
    mesh.rotation.z += 0.06;
    mesh.scale.multiplyScalar(0.97);
    if (t < 1) requestAnimationFrame(step);
    else scene.remove(mesh);
  }
  requestAnimationFrame(step);
  return mesh.userData;
}

// ---------------- Captured tally ----------------
const captured = { w: [], b: [] };
function renderCaptured() {
  for (const [el, color] of [
    [capturedW, "b"],
    [capturedB, "w"],
  ]) {
    const list = captured[color];
    if (!list.length) {
      el.innerHTML = "";
      continue;
    }
    const order = { Q: 0, R: 1, B: 2, N: 3, P: 4, K: -1 };
    list.sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9));
    el.innerHTML =
      `<div class="label">${color === "w" ? "White lost" : "Black lost"}</div>` +
      `<div class="grid">` +
      list
        .map(
          (t) =>
            `<span class="cap" title="${t}">${PIECE_GLYPH[color][t]}</span>`
        )
        .join("") +
      `</div>`;
  }
}

// ---------------- Make a move ----------------
async function performMove(move) {
  busy = true;
  clearHighlights();
  // capture?
  if (move.captured) {
    const sq = move.ep
      ? { r: move.to.r - (move.piece.c === "w" ? 1 : -1), f: move.to.f }
      : { r: move.to.r, f: move.to.f };
    const data = removeCapturedAt(sq.r, sq.f);
    if (data) captured[data.color].push(data.type);
  }

  // castling: move both king and rook
  if (move.castle === "K") {
    await Promise.all([
      animateMove(move.from, move.to),
      animateMove(
        { r: move.from.r, f: 7 },
        { r: move.from.r, f: 5 },
        200
      ),
    ]);
  } else if (move.castle === "Q") {
    await Promise.all([
      animateMove(move.from, move.to),
      animateMove(
        { r: move.from.r, f: 0 },
        { r: move.from.r, f: 3 },
        200
      ),
    ]);
  } else {
    await animateMove(move.from, move.to);
  }

  // promotion: swap mesh
  if (move.promo) {
    const key = `${move.to.r},${move.to.f}`;
    const old = pieceMeshes.get(key);
    if (old) scene.remove(old);
    pieceMeshes.delete(key);
    spawnPieceMesh(
      { t: move.promo, c: move.piece.c },
      move.to.r,
      move.to.f
    );
  }

  renderCaptured();
  showCheckOnly();
  updateStatus();
  busy = false;
  checkGameOver();
}

function updateStatus() {
  const turn = game.turn === "w" ? "White" : "Black";
  const check = game.isInCheck(game.turn) ? " — check!" : "";
  let sub = "";
  if (mode === "cpu" && game.turn === cpuColor && !game.status().over) {
    sub = " (CPU thinking)";
  } else if (mode === "pvp") {
    sub = " — your move";
  }
  statusEl.textContent = `${turn} to move${check}${sub}`;
}

function checkGameOver() {
  const s = game.status();
  if (!s.over) {
    // schedule CPU
    if (mode === "cpu" && game.turn === cpuColor && !busy) {
      scheduleCpuMove();
    } else if (mode === "pvp" && !awaitingPass) {
      // After a human move in PvP, prompt pass-the-device
      awaitingPass = true;
      passSub.textContent = `Pass to ${game.turn === "w" ? "White" : "Black"}.`;
      passEl.hidden = false;
    }
    return;
  }
  let title = "Draw";
  let sub = "";
  if (s.reason === "checkmate") {
    title = (s.winner === "w" ? "White" : "Black") + " wins!";
    sub = "Checkmate";
  } else if (s.reason === "stalemate") {
    sub = "Stalemate";
  } else if (s.reason === "insufficient") {
    sub = "Insufficient material";
  } else if (s.reason === "50-move") {
    sub = "Fifty-move rule";
  }
  endgameTitle.textContent = title;
  endgameSub.textContent = sub;
  endgameEl.hidden = false;
}

// ---------------- CPU ----------------
function scheduleCpuMove() {
  setTimeout(async () => {
    if (game.status().over) return;
    busy = true;
    updateStatus();
    // depth scales with material remaining; deeper in endgame
    let totalPieces = 0;
    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++) if (game.board[r][f]) totalPieces++;
    const depth = totalPieces > 16 ? 3 : totalPieces > 8 ? 4 : 5;
    // Yield so UI can repaint
    await new Promise((r) => setTimeout(r, 30));
    const m = findBestMove(game, { depth, timeMs: 1500 });
    if (!m) {
      busy = false;
      checkGameOver();
      return;
    }
    const applied = game.move(m.from, m.to, m.promo);
    if (applied) await performMove(applied);
    else busy = false;
  }, 120);
}

// ---------------- Input ----------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const _boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _planeHit = new THREE.Vector3();
let pointerDownPos = null;
let pointerDownTime = 0;

function eventToNDC(e) {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  return { x, y };
}

function squareFromPlanePoint(p) {
  const f = Math.round(p.x / SQ + 3.5);
  const r = Math.round(-p.z / SQ + 3.5);
  if (r < 0 || r > 7 || f < 0 || f > 7) return null;
  return { r, f };
}

function pickSquare(e) {
  const { x, y } = eventToNDC(e);
  pointer.set(x, y);
  raycaster.setFromCamera(pointer, camera);

  // Plane pick: where the ray actually intersects the board surface.
  // Most reliable for empty squares, even when a tall piece is in front.
  let planeSq = null;
  if (raycaster.ray.intersectPlane(_boardPlane, _planeHit)) {
    planeSq = squareFromPlanePoint(_planeHit);
  }

  // Piece pick: lets users tap the tall part of a piece to select it.
  let pieceSq = null;
  const meshes = [];
  for (const [, mesh] of pieceMeshes)
    mesh.traverse((o) => o.isMesh && meshes.push(o));
  const hit = raycaster.intersectObjects(meshes, false);
  if (hit.length) {
    let o = hit[0].object;
    while (o && !o.userData.coords) o = o.parent;
    if (o && o.userData.coords) {
      pieceSq = { r: o.userData.coords.r, f: o.userData.coords.f };
    }
  }

  if (!planeSq && !pieceSq) return null;
  if (!planeSq) return pieceSq;
  if (!pieceSq) return planeSq;
  if (planeSq.r === pieceSq.r && planeSq.f === pieceSq.f) return planeSq;

  // Tap landed on a piece whose square ISN'T where the user's finger is
  // pointing on the board. The piece was in the way (taller than the
  // target). When a piece is selected and the plane pick is a legal
  // destination, prefer the plane pick — that's what the user meant.
  if (selectedSq) {
    const planeIsLegal = legalForSelected.some(
      (m) => m.to.r === planeSq.r && m.to.f === planeSq.f
    );
    if (planeIsLegal) return planeSq;
    const pieceIsLegal = legalForSelected.some(
      (m) => m.to.r === pieceSq.r && m.to.f === pieceSq.f
    );
    if (pieceIsLegal) return pieceSq;
  }
  // No selection (or neither pick is legal): pick whichever is closer to
  // the tap — that's almost always the piece itself in the foreground.
  return pieceSq;
}

function onPointerDown(e) {
  pointerDownPos = { x: e.clientX, y: e.clientY };
  pointerDownTime = performance.now();
}

function onPointerUp(e) {
  if (!pointerDownPos) return;
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  const dt = performance.now() - pointerDownTime;
  pointerDownPos = null;
  // tap heuristic: short movement
  if (Math.hypot(dx, dy) > 10 || dt > 600) return;

  if (busy || pendingPromotion || awaitingPass) return;
  if (mode === "cpu" && game.turn === cpuColor) return;

  const target = pickSquare(e);
  if (!target) return;
  handleTap(target.r, target.f);
}

function handleTap(r, f) {
  const piece = game.board[r][f];

  if (selectedSq) {
    // try to move
    const move = legalForSelected.find(
      (m) => m.to.r === r && m.to.f === f
    );
    if (move) {
      if (move.promo) {
        pendingPromotion = {
          from: { ...selectedSq },
          to: { r, f },
          color: move.piece.c,
        };
        promoEl.hidden = false;
        clearHighlights();
        selectedSq = null;
        legalForSelected = [];
        return;
      }
      const applied = game.move(selectedSq, { r, f });
      selectedSq = null;
      legalForSelected = [];
      if (applied) performMove(applied);
      return;
    }
    // re-select different friendly piece
    if (piece && piece.c === game.turn) {
      selectedSq = { r, f };
      legalForSelected = game.legalMovesFrom(r, f);
      showLegal(legalForSelected, r, f);
      return;
    }
    // tap empty / invalid: deselect
    selectedSq = null;
    legalForSelected = [];
    clearHighlights();
    showCheckOnly();
    return;
  }

  // first selection
  if (!piece || piece.c !== game.turn) return;
  selectedSq = { r, f };
  legalForSelected = game.legalMovesFrom(r, f);
  showLegal(legalForSelected, r, f);
}

canvas.addEventListener("pointerdown", onPointerDown, { passive: true });
canvas.addEventListener("pointerup", onPointerUp, { passive: true });

// ---------------- Promotion picker ----------------
for (const btn of promoEl.querySelectorAll("button[data-promo]")) {
  btn.addEventListener("click", async () => {
    if (!pendingPromotion) return;
    const promo = btn.getAttribute("data-promo");
    const { from, to } = pendingPromotion;
    pendingPromotion = null;
    promoEl.hidden = true;
    const applied = game.move(from, to, promo);
    if (applied) await performMove(applied);
  });
}

// ---------------- Controls ----------------
function setMode(next) {
  mode = next;
  btnMode.textContent = mode === "cpu" ? "Mode: vs CPU" : "Mode: 2 Player";
  btnSwap.hidden = mode !== "pvp";
  passEl.hidden = true;
  awaitingPass = false;
  updateStatus();
}

btnNew.addEventListener("click", () => {
  game.reset();
  captured.w = [];
  captured.b = [];
  selectedSq = null;
  legalForSelected = [];
  pendingPromotion = null;
  awaitingPass = false;
  endgameEl.hidden = true;
  promoEl.hidden = true;
  passEl.hidden = true;
  renderCaptured();
  clearHighlights();
  placePieces();
  // Reset view to white side
  if (viewOrientation === -1) flipView();
  updateStatus();
  if (mode === "cpu" && game.turn === cpuColor) scheduleCpuMove();
});

btnMode.addEventListener("click", () => {
  setMode(mode === "cpu" ? "pvp" : "cpu");
});

btnSwap.addEventListener("click", () => {
  if (mode !== "pvp") return;
  passSub.textContent = `Pass to ${game.turn === "w" ? "White" : "Black"}.`;
  awaitingPass = true;
  passEl.hidden = false;
});

passOk.addEventListener("click", () => {
  passEl.hidden = true;
  awaitingPass = false;
  // Flip view to current player's side
  const desired = game.turn === "w" ? 1 : -1;
  if (desired !== viewOrientation) flipView();
  updateStatus();
});

btnUndo.addEventListener("click", async () => {
  if (busy) return;
  // In CPU mode, undo both plies so it's the human's turn again
  const undoOnce = () => {
    const last = game.history[game.history.length - 1];
    if (!last) return false;
    game.undo();
    return true;
  };
  if (!undoOnce()) return;
  if (mode === "cpu" && game.turn === cpuColor) undoOnce();
  selectedSq = null;
  legalForSelected = [];
  pendingPromotion = null;
  awaitingPass = false;
  endgameEl.hidden = true;
  // Recompute captured
  captured.w = [];
  captured.b = [];
  // We don't store undos here; rebuild from initial + history replay is overkill — just sync from board
  // count missing pieces from initial counts
  const initial = { w: { P: 8, R: 2, N: 2, B: 2, Q: 1, K: 1 }, b: { P: 8, R: 2, N: 2, B: 2, Q: 1, K: 1 } };
  const current = { w: {}, b: {} };
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = game.board[r][f];
    if (!p) continue;
    current[p.c][p.t] = (current[p.c][p.t] || 0) + 1;
  }
  for (const c of ["w", "b"]) {
    for (const t of ["P", "R", "N", "B", "Q"]) {
      const diff = (initial[c][t] || 0) - (current[c][t] || 0);
      for (let i = 0; i < diff; i++) captured[c].push(t);
    }
  }
  renderCaptured();
  placePieces();
  clearHighlights();
  showCheckOnly();
  updateStatus();
});

// Camera flip — preserves orbit radius in the xz plane.
function flipView(animated = true) {
  viewOrientation *= -1;
  const targetAngle = viewOrientation === 1 ? 0 : Math.PI;
  const dx = camera.position.x - controls.target.x;
  const dz = camera.position.z - controls.target.z;
  const hDist = Math.sqrt(dx * dx + dz * dz);
  if (!animated) {
    camera.position.x = controls.target.x + Math.sin(targetAngle) * hDist;
    camera.position.z = controls.target.z + Math.cos(targetAngle) * hDist;
    camera.lookAt(controls.target);
    controls.update();
    return;
  }
  const startAngle = Math.atan2(dx, dz);
  let delta = targetAngle - startAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const startY = camera.position.y;
  const t0 = performance.now();
  const dur = 600;
  function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const a = startAngle + delta * ease;
    camera.position.x = controls.target.x + Math.sin(a) * hDist;
    camera.position.z = controls.target.z + Math.cos(a) * hDist;
    camera.position.y = startY;
    camera.lookAt(controls.target);
    if (t < 1) requestAnimationFrame(step);
    else controls.update();
  }
  requestAnimationFrame(step);
}

btnRotate.addEventListener("click", () => flipView());

endgameAgain.addEventListener("click", () => {
  endgameEl.hidden = true;
  btnNew.click();
});

// ---------------- Beacons blinking ----------------
let beaconClock = 0;
const beaconLights = []; // populated below
function collectBeacons() {
  beaconLights.length = 0;
  scene.traverse((o) => {
    if (o.userData && o.userData.isBeacon) beaconLights.push(o);
  });
}

// ---------------- Resize ----------------
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
onResize();

// ---------------- Gallery thumbnails ----------------
// Snapshot one of each piece using the main renderer (cheap, one-off) and
// pipe the result into the gallery cards on the title screen.
function generateGalleryThumbnails() {
  const cards = document.querySelectorAll(".gallery-card");
  if (!cards.length) return;

  const origSize = renderer.getSize(new THREE.Vector2());
  const origPixelRatio = renderer.getPixelRatio();
  const origAutoClear = renderer.autoClear;

  const w = 260;
  const h = 320;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);

  // Mini-scene tuned for piece display: dusk-blue background, soft warm key,
  // cool fill, environment carried over so the metallic Bean still shines.
  const tempScene = new THREE.Scene();
  tempScene.background = new THREE.Color(0x0a1a2f);
  tempScene.environment = scene.environment;
  tempScene.add(new THREE.AmbientLight(0xb6c8e0, 0.55));
  const key = new THREE.DirectionalLight(0xffe2b0, 1.4);
  key.position.set(3, 5, 4);
  tempScene.add(key);
  const fill = new THREE.DirectionalLight(0x6fb6dc, 0.4);
  fill.position.set(-3, 3, -3);
  tempScene.add(fill);

  // Floor pad so the piece doesn't float; matches in-game square colors.
  const padMat = new THREE.MeshStandardMaterial({
    color: 0xf6f1e3,
    roughness: 0.5,
    metalness: 0.1,
  });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.05, 32), padMat);
  pad.position.y = -0.025;
  tempScene.add(pad);

  const tempCamera = new THREE.PerspectiveCamera(28, w / h, 0.1, 100);

  for (const card of cards) {
    const t = card.dataset.piece;
    const piece = createPiece(t, "w");
    if (t === "N") piece.rotation.y = Math.PI * 0.15; // a slight angle on the marquee
    tempScene.add(piece);

    const pH = piece.userData.height || 1.5;
    tempCamera.position.set(2.4, pH * 0.55 + 0.3, 2.9);
    tempCamera.lookAt(0, pH * 0.42, 0);

    renderer.render(tempScene, tempCamera);

    // Snapshot the renderer's drawing buffer into a 2D canvas, since the
    // WebGL canvas itself is shared and will be reused for the game.
    const snap = document.createElement("canvas");
    snap.width = renderer.domElement.width;
    snap.height = renderer.domElement.height;
    snap.getContext("2d").drawImage(renderer.domElement, 0, 0);

    const img = new Image();
    img.alt = card.querySelector("h3")?.textContent || t;
    img.draggable = false;
    img.src = snap.toDataURL("image/png");
    const thumb = card.querySelector(".thumb");
    if (thumb) {
      thumb.innerHTML = "";
      thumb.appendChild(img);
    }

    tempScene.remove(piece);
  }

  // Restore main renderer state.
  renderer.setPixelRatio(origPixelRatio);
  renderer.setSize(origSize.x, origSize.y, false);
  renderer.autoClear = origAutoClear;
  pad.geometry.dispose();
  padMat.dispose();
}

// ---------------- Init ----------------
placePieces();
collectBeacons();
updateStatus();
setMode("cpu");

// Generate gallery thumbnails once, then render one game frame, then mark
// the title screen ready so the Play and Gallery buttons appear. No
// auto-dismiss — the user starts the game when they tap Play.
requestAnimationFrame(() => {
  try {
    generateGalleryThumbnails();
  } catch (err) {
    console.warn("Gallery thumbnail generation failed:", err);
  }
  renderer.render(scene, camera);
  if (window.__chicagoChess && window.__chicagoChess.ready) {
    window.__chicagoChess.ready();
  }
});

// ---------------- Render loop ----------------
const clock = new THREE.Clock();
function tick() {
  const dt = clock.getDelta();
  beaconClock += dt;
  const pulse = (Math.sin(beaconClock * 3) + 1) * 0.5;
  for (const b of beaconLights) {
    b.scale.setScalar(0.8 + pulse * 0.5);
  }
  if (cta && cta.userData && typeof cta.userData.update === "function") {
    cta.userData.update(dt);
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
