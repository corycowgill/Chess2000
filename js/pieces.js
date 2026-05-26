// Chicago-themed 3D chess pieces, built from primitives.
// Pieces sit centered on the origin of their group, base on y=0, tallest pieces ~2.6 units.
import * as THREE from "three";

const SQUARE = 1.0;

function materials(color) {
  // White set: warm cream stone (Indiana limestone / terracotta vibe)
  // Black set: dark blue-steel (Chicago industrial)
  if (color === "w") {
    return {
      stone: new THREE.MeshStandardMaterial({
        color: 0xe9dcc1,
        roughness: 0.55,
        metalness: 0.05,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: 0xb3242b,
        roughness: 0.4,
        metalness: 0.1,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: 0xfaf6ec,
        roughness: 0.25,
        metalness: 0.85,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x9ed4ee,
        roughness: 0.2,
        metalness: 0.6,
        emissive: 0x1a3b55,
        emissiveIntensity: 0.15,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: 0x2b2f3a,
        roughness: 0.4,
        metalness: 0.6,
      }),
    };
  }
  return {
    stone: new THREE.MeshStandardMaterial({
      color: 0x232936,
      roughness: 0.5,
      metalness: 0.25,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0xb3242b,
      roughness: 0.4,
      metalness: 0.1,
    }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x9aa6b4,
      roughness: 0.25,
      metalness: 0.95,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x3a6c8a,
      roughness: 0.2,
      metalness: 0.7,
      emissive: 0x0c1e2c,
      emissiveIntensity: 0.2,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x0d121b,
      roughness: 0.45,
      metalness: 0.55,
    }),
  };
}

function pedestal(mats, radius = 0.32, height = 0.12) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.05, height, 28),
    mats.stone
  );
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, height * 0.18, 28),
    mats.accent
  );
  ring.position.y = height + height * 0.09;
  ring.castShadow = true;
  g.add(ring);
  return { group: g, top: height + height * 0.18 };
}

function sixPointStar(mats, size = 0.18) {
  // Chicago flag star: 6-pointed star built from two overlapping triangles (prisms).
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const pts = 6;
  const outer = size;
  const inner = size * 0.42;
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / pts - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: size * 0.18,
    bevelEnabled: true,
    bevelThickness: size * 0.04,
    bevelSize: size * 0.04,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 0);
  const m = new THREE.Mesh(geo, mats.accent);
  m.castShadow = true;
  g.add(m);
  return g;
}

// PAWN — Chicago flag star obelisk
function buildPawn(color) {
  const mats = materials(color);
  const group = new THREE.Group();
  const ped = pedestal(mats, 0.3, 0.1);
  group.add(ped.group);

  // tapered column
  const colH = 0.55;
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.2, colH, 18),
    mats.stone
  );
  col.position.y = ped.top + colH / 2;
  col.castShadow = true;
  group.add(col);

  // capital
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.06, 0.32),
    mats.stone
  );
  cap.position.y = ped.top + colH + 0.03;
  cap.castShadow = true;
  group.add(cap);

  // star on top, horizontal
  const star = sixPointStar(mats, 0.16);
  star.position.y = ped.top + colH + 0.08;
  group.add(star);

  group.userData.height = ped.top + colH + 0.14;
  return group;
}

// ROOK — Wrigley Building (stepped square tower with clock + crown)
function buildRook(color) {
  const mats = materials(color);
  const group = new THREE.Group();
  const ped = pedestal(mats, 0.36, 0.1);
  group.add(ped.group);

  // main shaft with window stripes
  const shaftH = 0.95;
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, shaftH, 0.5),
    mats.stone
  );
  shaft.position.y = ped.top + shaftH / 2;
  shaft.castShadow = true;
  group.add(shaft);

  // window glass strips (vertical insets)
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, shaftH * 0.7, 0.51),
      mats.glass
    );
    w.position.set(side * 0.16, ped.top + shaftH / 2, 0);
    group.add(w);
    const w2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.51, shaftH * 0.7, 0.06),
      mats.glass
    );
    w2.position.set(0, ped.top + shaftH / 2, side * 0.16);
    group.add(w2);
  }

  // setback
  const setH = 0.18;
  const set = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, setH, 0.62),
    mats.stone
  );
  set.position.y = ped.top + shaftH + setH / 2;
  set.castShadow = true;
  group.add(set);

  // clock tower
  const clockH = 0.4;
  const clock = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, clockH, 0.38),
    mats.stone
  );
  clock.position.y = ped.top + shaftH + setH + clockH / 2;
  clock.castShadow = true;
  group.add(clock);

  // clock faces
  for (let i = 0; i < 4; i++) {
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 24),
      mats.glass
    );
    face.position.y = ped.top + shaftH + setH + clockH * 0.55;
    const ang = (i * Math.PI) / 2;
    face.position.x = Math.sin(ang) * 0.191;
    face.position.z = Math.cos(ang) * 0.191;
    face.lookAt(face.position.x * 10, face.position.y, face.position.z * 10);
    group.add(face);
    // hands
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.16, 0.005),
      mats.accent
    );
    hand.position.copy(face.position);
    hand.position.add(face.position.clone().normalize().multiplyScalar(0.005));
    hand.rotation.copy(face.rotation);
    group.add(hand);
  }

  // crown / spire
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 0.14, 16),
    mats.stone
  );
  crown.position.y = ped.top + shaftH + setH + clockH + 0.07;
  crown.castShadow = true;
  group.add(crown);

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.22, 16),
    mats.metal
  );
  spire.position.y = ped.top + shaftH + setH + clockH + 0.14 + 0.11;
  spire.castShadow = true;
  group.add(spire);

  group.userData.height = ped.top + shaftH + setH + clockH + 0.36;
  return group;
}

// KNIGHT — Chicago Bull head silhouette
function buildKnight(color) {
  const mats = materials(color);
  const group = new THREE.Group();
  const ped = pedestal(mats, 0.32, 0.1);
  group.add(ped.group);

  // bull head: stylized from box + sphere snout + horns
  const headG = new THREE.Group();

  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 24, 18),
    mats.stone
  );
  skull.scale.set(1.0, 0.95, 1.15);
  skull.position.y = 0.26;
  skull.castShadow = true;
  headG.add(skull);

  // snout
  const snout = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 20, 16),
    mats.stone
  );
  snout.scale.set(1.0, 0.7, 0.9);
  snout.position.set(0, 0.16, 0.22);
  snout.castShadow = true;
  headG.add(snout);

  // nostrils
  for (const x of [-0.05, 0.05]) {
    const n = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      mats.dark
    );
    n.position.set(x, 0.16, 0.37);
    headG.add(n);
  }

  // eyes
  for (const x of [-0.1, 0.1]) {
    const eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfff5d8,
        roughness: 0.3,
        metalness: 0.1,
      })
    );
    eyeWhite.position.set(x, 0.32, 0.18);
    headG.add(eyeWhite);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 10, 8),
      mats.dark
    );
    pupil.position.set(x, 0.32, 0.215);
    headG.add(pupil);
  }

  // horns: tapered cones curving up-and-out
  for (const side of [-1, 1]) {
    const hornG = new THREE.Group();
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.36, 12),
      mats.metal
    );
    horn.position.y = 0.18;
    horn.castShadow = true;
    hornG.add(horn);
    hornG.position.set(side * 0.22, 0.34, -0.04);
    hornG.rotation.z = side * 0.5;
    hornG.rotation.x = -0.15;
    headG.add(hornG);
  }

  // top tuft (fur)
  const tuft = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 10),
    mats.stone
  );
  tuft.position.set(0, 0.45, -0.05);
  tuft.scale.set(1.2, 0.7, 0.8);
  headG.add(tuft);

  // neck pad transitioning down
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.18, 18),
    mats.stone
  );
  neck.position.y = 0.0;
  neck.castShadow = true;
  headG.add(neck);

  headG.position.y = ped.top + 0.05;
  // Knights face forward (we'll rotate by team in placePieces)
  group.add(headG);

  group.userData.height = ped.top + 0.85;
  group.userData.facing = true; // requires orientation
  return group;
}

// BISHOP — Cloud Gate (The Bean) on a pedestal
function buildBishop(color) {
  const mats = materials(color);
  const group = new THREE.Group();
  const ped = pedestal(mats, 0.34, 0.12);
  group.add(ped.group);

  // second tier pedestal
  const ped2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.3, 0.08, 24),
    mats.stone
  );
  ped2.position.y = ped.top + 0.04;
  ped2.castShadow = true;
  group.add(ped2);

  // the Bean: ellipsoid w/ underside arch
  const beanMat = new THREE.MeshStandardMaterial({
    color: color === "w" ? 0xf3f6fb : 0x6e7c8c,
    roughness: 0.08,
    metalness: 1.0,
    envMapIntensity: 1.2,
  });

  const bean = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), beanMat);
  bean.scale.set(1.2, 0.72, 0.95);
  bean.position.y = ped.top + 0.32;
  bean.castShadow = true;
  group.add(bean);

  // tiny underside arch hint (a small dark dimple)
  const dimple = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    mats.dark
  );
  dimple.scale.set(1.0, 0.4, 0.7);
  dimple.position.y = ped.top + 0.16;
  group.add(dimple);

  group.userData.height = ped.top + 0.62;
  return group;
}

// QUEEN — John Hancock Center (tapered tower with X-bracing)
function buildQueen(color) {
  const mats = materials(color);
  const group = new THREE.Group();
  const ped = pedestal(mats, 0.36, 0.1);
  group.add(ped.group);

  // Tapered shaft: build from segments getting narrower
  const segments = 4;
  const totalH = 1.4;
  const segH = totalH / segments;
  let y = ped.top;
  for (let i = 0; i < segments; i++) {
    const wBottom = 0.52 - i * 0.08;
    const wTop = 0.52 - (i + 1) * 0.08;
    const geo = new THREE.CylinderGeometry(
      wTop * 0.5,
      wBottom * 0.5,
      segH,
      4,
      1
    );
    geo.rotateY(Math.PI / 4); // square cross-section
    const seg = new THREE.Mesh(geo, mats.dark);
    seg.position.y = y + segH / 2;
    seg.castShadow = true;
    group.add(seg);

    // glass band on faces
    const glassG = new THREE.Mesh(
      new THREE.CylinderGeometry(
        wTop * 0.5 - 0.005,
        wBottom * 0.5 - 0.005,
        segH * 0.85,
        4,
        1
      ),
      mats.glass
    );
    glassG.geometry.rotateY(Math.PI / 4);
    glassG.position.y = y + segH / 2;
    glassG.scale.set(0.985, 1, 0.985);
    group.add(glassG);

    // X-bracing: two diagonals on each face
    for (let face = 0; face < 4; face++) {
      const ang = (face * Math.PI) / 2;
      const wMid = (wBottom + wTop) * 0.5;
      const halfW = wMid * 0.5;
      const diagLen = Math.sqrt(halfW * halfW * 4 + segH * segH);
      for (const dir of [-1, 1]) {
        const brace = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, diagLen, 0.025),
          mats.metal
        );
        brace.position.set(
          Math.cos(ang) * (wMid * 0.5 + 0.005),
          y + segH / 2,
          Math.sin(ang) * (wMid * 0.5 + 0.005)
        );
        brace.rotation.y = ang + Math.PI / 2;
        brace.rotation.z = dir * Math.atan2(wMid, segH);
        brace.castShadow = true;
        group.add(brace);
      }
    }

    y += segH;
  }

  // roof platform
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.04, 0.18),
    mats.stone
  );
  roof.position.y = y + 0.02;
  group.add(roof);

  // twin antenna spires
  for (const x of [-0.05, 0.05]) {
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.012, 0.4, 8),
      mats.metal
    );
    ant.position.set(x, y + 0.04 + 0.2, 0);
    ant.castShadow = true;
    group.add(ant);
    // beacon
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 10, 8),
      mats.accent
    );
    beacon.position.set(x, y + 0.04 + 0.4, 0);
    group.add(beacon);
  }

  // crown ring (queen marker)
  const crown = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.018, 12, 28),
    mats.accent
  );
  crown.position.y = y + 0.04;
  crown.rotation.x = Math.PI / 2;
  group.add(crown);

  group.userData.height = y + 0.5;
  return group;
}

// KING — Willis Tower (bundled tube structure with antenna)
function buildKing(color) {
  const mats = materials(color);
  const group = new THREE.Group();
  const ped = pedestal(mats, 0.4, 0.1);
  group.add(ped.group);

  // Willis Tower: 9 bundled tubes of varying heights (3x3 arrangement)
  // Heights pattern (approx, normalized): center tall, two adjacent tall, corners shorter
  const heights = [
    [1.5, 1.6, 1.5],
    [1.6, 1.9, 1.6],
    [1.5, 1.6, 1.5],
  ];
  const tubeW = 0.165;
  const gap = 0.005;
  const totalSpan = 3 * tubeW + 2 * gap;
  const base = -totalSpan / 2 + tubeW / 2;
  let maxH = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const h = heights[i][j];
      maxH = Math.max(maxH, h);
      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(tubeW, h, tubeW),
        mats.dark
      );
      tube.position.set(
        base + i * (tubeW + gap),
        ped.top + h / 2,
        base + j * (tubeW + gap)
      );
      tube.castShadow = true;
      group.add(tube);

      // window strips
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(tubeW * 0.7, h * 0.85, tubeW * 0.7),
        mats.glass
      );
      win.position.copy(tube.position);
      group.add(win);

      // top cap
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(tubeW, 0.02, tubeW),
        mats.metal
      );
      cap.position.set(tube.position.x, ped.top + h + 0.01, tube.position.z);
      group.add(cap);
    }
  }

  // twin antennae (Willis has two)
  for (const x of [-0.05, 0.05]) {
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.014, 0.55, 10),
      mats.metal
    );
    ant.position.set(x, ped.top + maxH + 0.275, 0);
    ant.castShadow = true;
    group.add(ant);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      mats.accent
    );
    beacon.position.set(x, ped.top + maxH + 0.56, 0);
    beacon.userData.isBeacon = true;
    group.add(beacon);
  }

  // crown cross at top (king marker)
  const cBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.09, 0.04, 16),
    mats.accent
  );
  cBase.position.y = ped.top + maxH + 0.02;
  group.add(cBase);
  const cV = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.12, 0.025),
    mats.accent
  );
  cV.position.y = ped.top + maxH + 0.1;
  group.add(cV);
  const cH = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.025, 0.025),
    mats.accent
  );
  cH.position.y = ped.top + maxH + 0.1;
  group.add(cH);

  group.userData.height = ped.top + maxH + 0.6;
  return group;
}

const BUILDERS = {
  P: buildPawn,
  R: buildRook,
  N: buildKnight,
  B: buildBishop,
  Q: buildQueen,
  K: buildKing,
};

export function createPiece(type, color) {
  const g = BUILDERS[type](color);
  g.userData.type = type;
  g.userData.color = color;
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  return g;
}

export const SQUARE_SIZE = SQUARE;
