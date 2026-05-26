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

// ROOK — Marina City "corncob" tower (Bertrand Goldberg, 1964)
// One cylindrical tower with scalloped balcony floors over an open parking podium.
let _marinaShapeCache = null;
function marinaScallopShape(R, r, petals = 16) {
  // Cache only if dimensions match, otherwise rebuild.
  if (
    _marinaShapeCache &&
    _marinaShapeCache.R === R &&
    _marinaShapeCache.r === r &&
    _marinaShapeCache.petals === petals
  ) {
    return _marinaShapeCache.shape;
  }
  const shape = new THREE.Shape();
  const N = petals * 8;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const radius = R + r * (0.5 + 0.5 * Math.cos(petals * t));
    const x = Math.cos(t) * radius;
    const y = Math.sin(t) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  _marinaShapeCache = { shape, R, r, petals };
  return shape;
}

function buildRook(color) {
  const mats = materials(color);
  const group = new THREE.Group();
  const ped = pedestal(mats, 0.4, 0.1);
  group.add(ped.group);

  const petals = 16;
  const R = 0.3; // base radius to the troughs
  const r = 0.06; // outward bump depth (balcony scallops)
  const towerH = 1.55;
  const parkH = towerH * 0.32; // 19 floors of parking
  const aptH = towerH - parkH; // ~40 apartment floors above

  // ---- Parking podium: open structure with vertical pillars + glass core ----
  const numPillars = 16;
  for (let i = 0; i < numPillars; i++) {
    const a = (i / numPillars) * Math.PI * 2;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, parkH, 6),
      mats.dark
    );
    pillar.position.set(x, ped.top + parkH / 2, z);
    pillar.castShadow = true;
    group.add(pillar);
  }
  // Helical ramp suggestion: thin ring(s) inside the parking podium
  for (let k = 1; k <= 3; k++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(R * 0.85, 0.008, 4, 24),
      mats.dark
    );
    ring.position.y = ped.top + (k / 4) * parkH;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  // Glass elevator/utility core in the center
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, parkH * 1.02, 20),
    mats.glass
  );
  core.position.y = ped.top + parkH / 2;
  group.add(core);

  // Roof of the parking podium (where the apartment cylinder sits)
  const parkRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(R + r + 0.01, R + r + 0.01, 0.03, 32),
    mats.dark
  );
  parkRoof.position.y = ped.top + parkH + 0.015;
  parkRoof.castShadow = true;
  group.add(parkRoof);

  // ---- Apartment tower: scalloped extruded prism ----
  const shape = marinaScallopShape(R, r, petals);
  const aptGeo = new THREE.ExtrudeGeometry(shape, {
    depth: aptH,
    bevelEnabled: false,
    steps: 1,
  });
  // Extrude defaults to +Z; rotate so it stands along +Y.
  aptGeo.rotateX(-Math.PI / 2);
  const apt = new THREE.Mesh(aptGeo, mats.stone);
  apt.position.y = ped.top + parkH;
  apt.castShadow = true;
  group.add(apt);

  // Floor lines: thin dark rings around each apartment floor
  const aptFloors = 16;
  for (let f = 1; f < aptFloors; f++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(R + r * 0.55, 0.005, 4, petals * 2),
      mats.dark
    );
    ring.position.y = ped.top + parkH + (f / aptFloors) * aptH;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  // Tiny glow inside random balconies for windows-at-dusk feel
  const litMat = new THREE.MeshStandardMaterial({
    color: 0xffd58a,
    emissive: 0xffb050,
    emissiveIntensity: 0.6,
    roughness: 0.5,
  });
  const seedRand = (() => {
    let s = color === "w" ? 31 : 71;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  })();
  for (let f = 2; f < aptFloors; f++) {
    for (let p = 0; p < petals; p++) {
      if (seedRand() > 0.78) {
        const a = (p / petals) * Math.PI * 2;
        const win = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 6, 4),
          litMat
        );
        const radius = R + r * 0.85;
        win.position.set(
          Math.cos(a) * radius,
          ped.top + parkH + (f / aptFloors) * aptH + 0.005,
          Math.sin(a) * radius
        );
        win.scale.set(1.0, 0.4, 0.4);
        group.add(win);
      }
    }
  }

  // ---- Roof ----
  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(R + r * 0.5, R + r * 0.5, 0.04, 32),
    mats.dark
  );
  topCap.position.y = ped.top + towerH + 0.02;
  topCap.castShadow = true;
  group.add(topCap);

  const mech = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.05, 0.16),
    mats.stone
  );
  mech.position.y = ped.top + towerH + 0.065;
  mech.castShadow = true;
  group.add(mech);

  // small antenna
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.01, 0.16, 8),
    mats.metal
  );
  ant.position.y = ped.top + towerH + 0.09 + 0.08;
  ant.castShadow = true;
  group.add(ant);

  group.userData.height = ped.top + towerH + 0.22;
  return group;
}

// KNIGHT — Chicago Theatre marquee (vertical "CHICAGO" sign + arched marquee)
let _chicagoSignTexCache = null;
function chicagoSignTexture() {
  if (_chicagoSignTexCache) return _chicagoSignTexCache;
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 384;
  const ctx = c.getContext("2d");
  // red field
  ctx.fillStyle = "#c8333a";
  ctx.fillRect(0, 0, c.width, c.height);
  // cream edge banding top and bottom
  ctx.fillStyle = "#fffaee";
  ctx.fillRect(0, 0, c.width, 10);
  ctx.fillRect(0, c.height - 10, c.width, 10);
  // CHICAGO letters stacked vertically
  ctx.fillStyle = "#fffaee";
  ctx.font = 'bold 44px Impact, "Big Shoulders Display", "Arial Black", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const letters = ["C", "H", "I", "C", "A", "G", "O"];
  const total = letters.length;
  const startY = 38;
  const spacing = (c.height - startY * 2) / (total - 1);
  letters.forEach((L, i) => {
    ctx.fillText(L, c.width / 2, startY + i * spacing);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  _chicagoSignTexCache = tex;
  return tex;
}

function buildKnight(color) {
  const mats = materials(color);
  const group = new THREE.Group();
  const ped = pedestal(mats, 0.36, 0.1);
  group.add(ped.group);

  // ---- Building facade (limestone slab behind the sign) ----
  const facadeH = 0.7;
  const facadeW = 0.6;
  const facadeD = 0.14;
  const facade = new THREE.Mesh(
    new THREE.BoxGeometry(facadeW, facadeH, facadeD),
    mats.stone
  );
  facade.position.set(0, ped.top + facadeH / 2, -0.08);
  facade.castShadow = true;
  group.add(facade);

  // cornice above the facade
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(facadeW + 0.06, 0.05, facadeD + 0.04),
    mats.stone
  );
  cornice.position.set(0, ped.top + facadeH + 0.025, -0.08);
  group.add(cornice);

  // ---- Tiffany-style arched stained-glass window above the marquee ----
  const winShape = new THREE.Shape();
  const wW = 0.14;
  const wH = 0.14;
  winShape.moveTo(-wW, 0);
  winShape.lineTo(-wW, wH);
  winShape.absarc(0, wH, wW, Math.PI, 0, true);
  winShape.lineTo(wW, 0);
  winShape.lineTo(-wW, 0);
  const winGeo = new THREE.ShapeGeometry(winShape);
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffc05a,
    emissive: 0xffa030,
    emissiveIntensity: 0.6,
    roughness: 0.4,
    metalness: 0.2,
  });
  const win = new THREE.Mesh(winGeo, winMat);
  win.position.set(0, ped.top + 0.46, -0.005);
  group.add(win);

  // window mullion (vertical bar)
  const mullion = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, wH + wW, 0.01),
    mats.dark
  );
  mullion.position.set(0, ped.top + 0.46 + (wH + wW) / 2, 0.0);
  group.add(mullion);

  // ---- Arched marquee canopy ----
  const mR = 0.3;
  const mBase = 0.08; // straight band below the arch
  const marqueeShape = new THREE.Shape();
  marqueeShape.moveTo(-mR, -mBase);
  marqueeShape.lineTo(-mR, 0);
  marqueeShape.absarc(0, 0, mR, Math.PI, 0, true);
  marqueeShape.lineTo(mR, -mBase);
  marqueeShape.lineTo(-mR, -mBase);
  const marqueeGeo = new THREE.ExtrudeGeometry(marqueeShape, {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1,
  });
  const marqueeMat = new THREE.MeshStandardMaterial({
    color: 0xc8333a,
    roughness: 0.45,
    metalness: 0.25,
    emissive: 0x4d1014,
    emissiveIntensity: 0.25,
  });
  const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
  marquee.position.set(0, ped.top + 0.18, 0.03);
  marquee.castShadow = true;
  group.add(marquee);

  // Cream band on the underside of the marquee (where "CHICAGO" text would go)
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(2 * mR, 0.04, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xfffaee,
      emissive: 0xfff0c8,
      emissiveIntensity: 0.5,
      roughness: 0.35,
    })
  );
  band.position.set(0, ped.top + 0.12, 0.12);
  group.add(band);

  // ---- Bulbs around the marquee arch ----
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff5b0,
    emissive: 0xffe080,
    emissiveIntensity: 1.0,
    roughness: 0.3,
    metalness: 0.1,
  });
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    const x = Math.cos(a) * (mR + 0.018);
    const y = Math.sin(a) * (mR + 0.018);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 6),
      bulbMat
    );
    bulb.position.set(x, ped.top + 0.18 + y, 0.03 + 0.21);
    group.add(bulb);
  }
  // bottom row of bulbs along the cream band
  for (let i = -2; i <= 2; i++) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 6),
      bulbMat
    );
    bulb.position.set(i * (mR * 0.4), ped.top + 0.1, 0.22);
    group.add(bulb);
  }

  // ---- Vertical "CHICAGO" sign pylon ----
  const signH = 0.95;
  const signW = 0.16;
  const signD = 0.08;
  const signTex = chicagoSignTexture();
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0xc8333a,
    roughness: 0.4,
    metalness: 0.25,
    emissive: 0x4d1014,
    emissiveIntensity: 0.3,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: 0x331010,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.2,
  });
  // Box face order: +X, -X, +Y, -Y, +Z, -Z
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(signW, signH, signD),
    [sideMat, sideMat, sideMat, sideMat, faceMat, faceMat]
  );
  sign.position.set(0, ped.top + facadeH + signH / 2 - 0.02, 0.02);
  sign.castShadow = true;
  group.add(sign);

  // light-bulb strips along each vertical edge of the sign (front face)
  for (let i = 0; i < 10; i++) {
    const bulbY =
      ped.top + facadeH + signH * 0.06 + i * (signH * 0.88) / 9 - 0.02;
    for (const side of [-1, 1]) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 6, 6),
        bulbMat
      );
      bulb.position.set(side * (signW / 2 + 0.018), bulbY, 0.02 + signD / 2);
      group.add(bulb);
    }
  }

  // small cap on top of the sign
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(signW + 0.03, 0.04, signD + 0.02),
    mats.dark
  );
  cap.position.set(0, ped.top + facadeH + signH - 0.02, 0.02);
  group.add(cap);

  group.userData.height = ped.top + facadeH + signH + 0.05;
  group.userData.facing = true;
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
