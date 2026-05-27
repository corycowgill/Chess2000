// skyline.js — Chicago lakefront environment for the chess scene.
// Composition: three clear depth layers (foreground museum-row,
// midground civic icons, background skyscrapers) so the city reads as
// staged depth, not stacked props. Landmarks are spaced horizontally
// with breathing room between them and anchored to the ground.
import * as THREE from "three";

// ──────────────────────────────────────────────
// Sky — dusk gradient over the lake
// ──────────────────────────────────────────────
export function createSky() {
  const geo = new THREE.SphereGeometry(140, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a1a3a) },
      midColor: { value: new THREE.Color(0x4a3865) },
      bottomColor: { value: new THREE.Color(0xc88466) },
      horizonGlow: { value: new THREE.Color(0xffd09a) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform vec3 horizonGlow;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y;
        float t = clamp((h + 0.1) / 1.1, 0.0, 1.0);
        vec3 col;
        if (t < 0.45) {
          float k = t / 0.45;
          col = mix(bottomColor, midColor, smoothstep(0.0, 1.0, k));
        } else {
          float k = (t - 0.45) / 0.55;
          col = mix(midColor, topColor, smoothstep(0.0, 1.0, k));
        }
        float g = exp(-pow(h / 0.13, 2.0));
        col = mix(col, horizonGlow, g * 0.55);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -2;
  return m;
}

// ──────────────────────────────────────────────
// Plaza — limestone slab around the chess board with a clean margin
// ──────────────────────────────────────────────
export function createPlaza() {
  const g = new THREE.Group();
  const plazaSize = 14;
  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(plazaSize, 0.18, plazaSize),
    new THREE.MeshStandardMaterial({
      color: 0xd6c9a8,
      roughness: 0.78,
      metalness: 0.05,
    })
  );
  plaza.position.y = -0.27;
  plaza.receiveShadow = true;
  g.add(plaza);

  for (const dir of ["x", "z"]) {
    for (const side of [-1, 1]) {
      const inlay = new THREE.Mesh(
        new THREE.BoxGeometry(
          dir === "x" ? plazaSize : 0.15,
          0.02,
          dir === "x" ? 0.15 : plazaSize
        ),
        new THREE.MeshStandardMaterial({
          color: 0x9a8d6e,
          roughness: 0.7,
          metalness: 0.1,
        })
      );
      inlay.position.set(
        dir === "x" ? 0 : side * (plazaSize / 2 - 0.5),
        -0.17,
        dir === "x" ? side * (plazaSize / 2 - 0.5) : 0
      );
      g.add(inlay);
    }
  }
  return g;
}

// ──────────────────────────────────────────────
// Surrounding ground — parkland, well below plaza level
// ──────────────────────────────────────────────
export function createGround() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshStandardMaterial({
      color: 0x223226,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.45;
  ground.receiveShadow = true;
  g.add(ground);

  // Cream promenade ring around the plaza
  const promRing = new THREE.Mesh(
    new THREE.RingGeometry(8, 11, 64),
    new THREE.MeshStandardMaterial({
      color: 0xb4a47e,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  promRing.rotation.x = -Math.PI / 2;
  promRing.position.y = -0.36;
  promRing.receiveShadow = true;
  g.add(promRing);

  return g;
}

// ──────────────────────────────────────────────
// Lake Michigan — large plane east of the plaza
// ──────────────────────────────────────────────
export function createLake() {
  const g = new THREE.Group();
  const lake = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      color: 0x162a44,
      roughness: 0.22,
      metalness: 0.6,
      emissive: 0x05101e,
      emissiveIntensity: 0.15,
    })
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(40, -0.4, 0);
  lake.receiveShadow = true;
  g.add(lake);

  const shimmer = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 4),
    new THREE.MeshBasicMaterial({
      color: 0xffd9a3,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    })
  );
  shimmer.rotation.x = -Math.PI / 2;
  shimmer.position.set(45, -0.39, -10);
  g.add(shimmer);

  return g;
}

// ──────────────────────────────────────────────
// Distant skyline — wide silhouette behind everything,
// with Chicago-recognizable crowns at key spots
// ──────────────────────────────────────────────
function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

function makeSkylineRow(z, count, spread, hRange, color, glassColor, seed, addCrowns) {
  const row = new THREE.Group();
  const rand = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = -spread / 2 + (i / (count - 1)) * spread + (rand() - 0.5) * 1.2;
    const h = hRange[0] + rand() * (hRange[1] - hRange[0]);
    const w = 0.9 + rand() * 2.4;
    const d = 0.6 + rand() * 1.5;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.1 })
    );
    b.position.set(x, -0.4 + h / 2, z + (rand() - 0.5) * 0.6);
    b.castShadow = false;
    b.receiveShadow = false;
    row.add(b);

    if (h > 2 && rand() > 0.45) {
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.7, h * 0.8),
        new THREE.MeshBasicMaterial({
          color: glassColor,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        })
      );
      glass.position.set(b.position.x, b.position.y, z + d / 2 + 0.02);
      row.add(glass);
    }

    // Distinctive Chicago crowns on a few buildings
    if (addCrowns && h > 4.5) {
      const which = Math.floor(rand() * 4);
      const top = b.position.y + h / 2;
      if (which === 0) {
        // Gothic pinnacle crown (Tribune-Tower-ish)
        const crown = new THREE.Mesh(
          new THREE.ConeGeometry(w * 0.4, 1.4, 6),
          new THREE.MeshStandardMaterial({
            color: 0x252c38,
            roughness: 0.5,
            metalness: 0.4,
          })
        );
        crown.position.set(b.position.x, top + 0.7, b.position.z);
        row.add(crown);
        // pinnacles around it
        for (let p = 0; p < 4; p++) {
          const a = (p / 4) * Math.PI * 2;
          const pin = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.5, 5),
            new THREE.MeshStandardMaterial({ color: 0x2a313d })
          );
          pin.position.set(
            b.position.x + Math.cos(a) * w * 0.35,
            top + 0.25,
            b.position.z + Math.sin(a) * d * 0.35
          );
          row.add(pin);
        }
      } else if (which === 1) {
        // Stepped pyramid crown (Trump-Tower-ish stepback)
        for (let s = 0; s < 3; s++) {
          const step = new THREE.Mesh(
            new THREE.BoxGeometry(w * (0.85 - s * 0.18), 0.3, d * (0.85 - s * 0.18)),
            new THREE.MeshStandardMaterial({
              color: 0x222934,
              roughness: 0.7,
            })
          );
          step.position.set(b.position.x, top + 0.15 + s * 0.3, b.position.z);
          row.add(step);
        }
      } else if (which === 2) {
        // Antenna / mast
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.1, 1.6, 8),
          new THREE.MeshStandardMaterial({ color: 0x6a7585, metalness: 0.7 })
        );
        mast.position.set(b.position.x, top + 0.8, b.position.z);
        row.add(mast);
      } else {
        // Slim flat-top
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(w * 1.1, 0.12, d * 1.1),
          new THREE.MeshStandardMaterial({ color: 0x1a2030 })
        );
        slab.position.set(b.position.x, top + 0.06, b.position.z);
        row.add(slab);
      }
    }
  }
  return row;
}

export function createSkyline() {
  const group = new THREE.Group();
  // Deep north (visible from default white view): two distance rows
  group.add(makeSkylineRow(-62, 30, 110, [4, 8.5], 0x0c1422, 0xf6c073, 8001, true));
  group.add(makeSkylineRow(-54, 26, 96, [2.5, 5], 0x080d18, 0xffd07a, 8013, false));
  // Mirror skyline south (visible when view is flipped)
  group.add(makeSkylineRow(62, 26, 100, [2.8, 5.5], 0x0a121f, 0xe4a070, 8027, true));
  group.add(makeSkylineRow(54, 22, 84, [1.8, 3.6], 0x06090f, 0xffba80, 8051, false));
  return group;
}

// ──────────────────────────────────────────────
// LANDMARKS — each function returns a Group centered at (0,0,0) on the
// ground plane. All meshes are background-only (no shadows in or out).
// ──────────────────────────────────────────────
function nonShadow(mesh) {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.08,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

// Wrigley Field marquee texture: WRIGLEY FIELD header + CUBS WIN!
// headline + HOME OF CHICAGO CUBS footer, rendered to a canvas so we
// can map it onto the front of the marquee box. Cached once.
let _wrigleyMarqueeTexCache = null;
function wrigleyMarqueeTexture() {
  if (_wrigleyMarqueeTexCache) return _wrigleyMarqueeTexCache;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext("2d");

  // Red field
  ctx.fillStyle = "#b3242b";
  ctx.fillRect(0, 0, c.width, c.height);

  // Top cream band — "WRIGLEY FIELD"
  const headerH = 70;
  ctx.fillStyle = "#fffaee";
  ctx.fillRect(0, 0, c.width, headerH);
  ctx.fillStyle = "#b3242b";
  ctx.font = 'bold 44px Georgia, "Times New Roman", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WRIGLEY FIELD", c.width / 2, headerH / 2);

  // Headline — CUBS WIN! in big bright cream
  ctx.fillStyle = "#fffaee";
  ctx.font = 'bold 108px Impact, "Arial Black", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CUBS WIN!", c.width / 2, 170);

  // Subtitle line — HOME OF CHICAGO CUBS, smaller
  ctx.font = 'bold 26px Georgia, "Times New Roman", serif';
  ctx.fillText("HOME OF CHICAGO CUBS", c.width / 2, 268);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  _wrigleyMarqueeTexCache = tex;
  return tex;
}

// ---- Wrigley Field — brick stadium, green roof, manual scoreboard,
//      red marquee at home plate. The marquee + scoreboard are the
//      silhouette-defining features. ----
// ---- Wrigley Field — unmistakable: wide low Friendly-Confines footprint
//      with the dark-green steel grandstand, dirt diamond, grass outfield,
//      warning track, ivy-covered brick outfield walls, stepped left/center/
//      right bleachers, the famous centerfield manual scoreboard with the
//      circular clock and flag-row above, light stanchions, and the red
//      marquee at the Clark & Addison entrance. ----
function createWrigleyField() {
  const g = new THREE.Group();
  // ---- Wrigley palette ----
  const BRICK = mat(0x8a4234, { roughness: 0.92 });
  const IVY = mat(0x2d5236, { roughness: 0.88 });
  const IVY_DEEP = mat(0x224028, { roughness: 0.9 });
  const STEEL_GREEN = mat(0x1d3a28, { roughness: 0.55, metalness: 0.3 });
  const STEEL_DARK = mat(0x10241a, { roughness: 0.5, metalness: 0.35 });
  const CONCRETE = mat(0xbab3a3, { roughness: 0.85 });
  const GRASS = mat(0x3c6b32, { roughness: 0.92 });
  const GRASS_OUT = mat(0x4a7a3c, { roughness: 0.92 });
  const DIRT = mat(0x9a7a48, { roughness: 0.95 });
  const WARN = mat(0xc4a06a, { roughness: 0.95 });
  const SEAT_GREEN = mat(0x244430, { roughness: 0.7 });
  const WHITE = mat(0xf4eed8, { roughness: 0.7 });
  const RED = mat(0xb3242b, {
    roughness: 0.45,
    emissive: 0x4a0e12,
    emissiveIntensity: 0.55,
  });
  const CREAM_LIT = mat(0xfffaee, {
    emissive: 0xfff0d0,
    emissiveIntensity: 0.7,
  });

  // ===== FIELD =====
  // Grass outfield — fan shape from home plate (south) curving north.
  // Home plate at z=+4.2, outfield wall curving around z=-3 to z=-4.
  const outfield = new THREE.Shape();
  outfield.moveTo(0, 4.2);
  outfield.lineTo(-5.5, 1.2);
  // curve the outfield arc
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const a = Math.PI + t * Math.PI; // 180° → 360°
    outfield.lineTo(Math.cos(a) * 5.5, Math.sin(a) * 4.0 - 0.6);
  }
  outfield.lineTo(5.5, 1.2);
  outfield.lineTo(0, 4.2);
  outfield.closePath();
  const grassMesh = nonShadow(
    new THREE.Mesh(new THREE.ShapeGeometry(outfield), GRASS_OUT)
  );
  grassMesh.rotation.x = -Math.PI / 2;
  grassMesh.position.set(0, 0.04, 0);
  g.add(grassMesh);

  // Warning track — a brown band just inside the outfield wall arc
  const trackShape = new THREE.Shape();
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    const a = Math.PI + t * Math.PI;
    trackShape.lineTo(Math.cos(a) * 5.5, Math.sin(a) * 4.0 - 0.6);
  }
  const trackHole = new THREE.Path();
  for (let i = 22; i >= 0; i--) {
    const t = i / 22;
    const a = Math.PI + t * Math.PI;
    trackHole.lineTo(Math.cos(a) * 4.8, Math.sin(a) * 3.4 - 0.6);
  }
  trackShape.holes.push(trackHole);
  const trackMesh = nonShadow(
    new THREE.Mesh(new THREE.ShapeGeometry(trackShape), WARN)
  );
  trackMesh.rotation.x = -Math.PI / 2;
  trackMesh.position.set(0, 0.05, 0);
  g.add(trackMesh);

  // Dirt infield (diamond)
  const diamond = new THREE.Shape();
  diamond.moveTo(0, 4.0);
  diamond.lineTo(-2.0, 1.6);
  diamond.lineTo(0, -0.8);
  diamond.lineTo(2.0, 1.6);
  diamond.closePath();
  const dirtMesh = nonShadow(
    new THREE.Mesh(new THREE.ShapeGeometry(diamond), DIRT)
  );
  dirtMesh.rotation.x = -Math.PI / 2;
  dirtMesh.position.set(0, 0.06, 0);
  g.add(dirtMesh);

  // Grass infield patch (the inner cutout grass between bases)
  const infieldGrass = new THREE.Shape();
  infieldGrass.moveTo(0, 3.2);
  infieldGrass.lineTo(-1.3, 1.5);
  infieldGrass.lineTo(0, -0.1);
  infieldGrass.lineTo(1.3, 1.5);
  infieldGrass.closePath();
  const infieldGrassMesh = nonShadow(
    new THREE.Mesh(new THREE.ShapeGeometry(infieldGrass), GRASS)
  );
  infieldGrassMesh.rotation.x = -Math.PI / 2;
  infieldGrassMesh.position.set(0, 0.07, 0);
  g.add(infieldGrassMesh);

  // Pitcher's mound
  const mound = nonShadow(
    new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), DIRT)
  );
  mound.rotation.x = -Math.PI / 2;
  mound.position.set(0, 0.075, 1.2);
  g.add(mound);

  // Foul lines (chalked from home plate out past 1B and 3B)
  for (const dir of [-1, 1]) {
    const line = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 4.5), WHITE)
    );
    line.position.set(dir * 1.7, 0.08, 1.5);
    line.rotation.y = dir * 0.62;
    g.add(line);
  }

  // ===== IVY-COVERED BRICK OUTFIELD WALL =====
  // Curved wall hugging the outfield arc, with ivy on top.
  const wallSegs = 18;
  for (let i = 0; i <= wallSegs; i++) {
    const t = i / wallSegs;
    const a = Math.PI + t * Math.PI;
    const x = Math.cos(a) * 5.4;
    const z = Math.sin(a) * 3.9 - 0.6;
    // Brick wall segment
    const brick = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.16), BRICK)
    );
    brick.position.set(x, 0.28, z);
    // Face inward (toward home plate)
    brick.rotation.y = -a + Math.PI / 2;
    g.add(brick);

    // Dense ivy on top of and overhanging the wall
    const ivy = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.5, 0.22),
        i % 3 === 0 ? IVY_DEEP : IVY
      )
    );
    ivy.position.set(x, 0.36, z);
    ivy.rotation.y = -a + Math.PI / 2;
    g.add(ivy);

    // Occasional ivy "tufts" cascading down
    if (i % 2 === 0) {
      const tuft = nonShadow(
        new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), IVY)
      );
      tuft.position.set(x, 0.4, z);
      tuft.scale.set(1.0, 0.6, 0.4);
      tuft.rotation.y = -a + Math.PI / 2;
      g.add(tuft);
    }
  }

  // ===== STEPPED OUTFIELD BLEACHERS =====
  // Four risers each for left, center, right
  function bleacherSection(centerX, centerZ, baseW, depth, rows, faceAngle) {
    const sec = new THREE.Group();
    for (let r = 0; r < rows; r++) {
      const step = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(baseW, 0.32, depth),
          SEAT_GREEN
        )
      );
      step.position.set(0, 0.4 + r * 0.28, -r * (depth * 0.85));
      sec.add(step);

      // Seat texture (tiny seat bumps)
      for (let s = -2; s <= 2; s++) {
        const seat = nonShadow(
          new THREE.Mesh(
            new THREE.BoxGeometry(baseW * 0.15, 0.1, depth * 0.4),
            mat(0x182a1c, { roughness: 0.6 })
          )
        );
        seat.position.set(s * (baseW * 0.2), 0.6 + r * 0.28, -r * (depth * 0.85));
        sec.add(seat);
      }
    }
    // Concrete riser support underneath
    const support = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(baseW + 0.1, 0.5, depth * (rows + 0.5)),
        CONCRETE
      )
    );
    support.position.set(0, 0.15, -depth * (rows - 1) * 0.42);
    sec.add(support);

    sec.position.set(centerX, 0, centerZ);
    sec.rotation.y = faceAngle;
    return sec;
  }

  // Center bleachers: largest section, behind centerfield wall, facing south
  g.add(bleacherSection(0, -3.8, 4.4, 0.7, 5, 0));
  // Left field bleachers, angled
  g.add(bleacherSection(-4.4, -2.6, 2.8, 0.65, 4, 0.6));
  // Right field bleachers, mirrored angle
  g.add(bleacherSection(4.4, -2.6, 2.8, 0.65, 4, -0.6));

  // ===== GRANDSTAND — wide, low, dark green steel framing =====
  // Lower bowl wraps three sides of the infield (home + 1B + 3B sides).
  // Behind home plate (south wall — entrance side, but tall behind home)
  const homeBowl = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(12, 1.6, 1.6), STEEL_GREEN)
  );
  homeBowl.position.set(0, 0.8, 5.0);
  g.add(homeBowl);

  // First base side (east, +x)
  const firstSide = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 6.4), STEEL_GREEN)
  );
  firstSide.position.set(6.4, 0.7, 1.5);
  g.add(firstSide);

  // Third base side (west, -x)
  const thirdSide = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 6.4), STEEL_GREEN)
  );
  thirdSide.position.set(-6.4, 0.7, 1.5);
  g.add(thirdSide);

  // Upper deck — recessed and slightly taller, behind home plate only
  const upper = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(10, 0.9, 1.4), STEEL_GREEN)
  );
  upper.position.set(0, 2.1, 5.0);
  g.add(upper);

  // Continuous dark green ROOF visor over upper deck + sides
  const roofHome = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.22, 1.8), STEEL_DARK)
  );
  roofHome.position.set(0, 2.7, 5.0);
  g.add(roofHome);
  const roofE = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 6.8), STEEL_DARK)
  );
  roofE.position.set(6.4, 1.5, 1.5);
  g.add(roofE);
  const roofW = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 6.8), STEEL_DARK)
  );
  roofW.position.set(-6.4, 1.5, 1.5);
  g.add(roofW);

  // Exposed steel vertical girders on the home plate facade (Wrigley's
  // signature look — visible structural columns at regular intervals)
  for (let i = -5; i <= 5; i++) {
    const girder = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 0.12), STEEL_DARK)
    );
    girder.position.set(i * 1.0, 0.85, 4.22);
    g.add(girder);
  }

  // ===== CENTERFIELD MANUAL SCOREBOARD =====
  // Wide green panel with vertical inning slots, supported on steel
  // pillars, with the famous circular clock and flag row above.
  const sbX = 0;
  const sbZ = -5.2;
  const sbBaseY = 2.8;

  // Steel support legs
  for (const x of [-2.0, 2.0]) {
    const leg = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.12, sbBaseY, 0.12), STEEL_DARK)
    );
    leg.position.set(sbX + x, sbBaseY / 2, sbZ);
    g.add(leg);
  }

  // Main scoreboard body — wide and dark green
  const sbBody = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 2.1, 0.5),
      mat(0x2c4d2c, { emissive: 0x141d11, emissiveIntensity: 0.45 })
    )
  );
  sbBody.position.set(sbX, sbBaseY + 1.05, sbZ);
  g.add(sbBody);

  // Inning panel grid on the front face — two rows (home/visitor) of
  // 9 dark slot panels for hand-turned innings
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 9; col++) {
      const panel = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.6, 0.05),
          mat(0x1a2e1a, { emissive: 0x0a1108, emissiveIntensity: 0.4 })
        )
      );
      panel.position.set(sbX - 1.8 + col * 0.5, sbBaseY + 1.5 - row * 0.75, sbZ + 0.27);
      g.add(panel);
    }
  }
  // Team-name plaques on the left
  for (let row = 0; row < 2; row++) {
    const name = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.05), CREAM_LIT)
    );
    name.position.set(sbX - 2.45, sbBaseY + 1.5 - row * 0.75, sbZ + 0.27);
    g.add(name);
  }

  // ---- Circular Wrigley clock ABOVE the scoreboard ----
  const clockR = 0.62;
  const clockHousing = nonShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(clockR + 0.07, clockR + 0.07, 0.22, 24),
      STEEL_DARK
    )
  );
  clockHousing.rotation.x = Math.PI / 2;
  clockHousing.position.set(sbX, sbBaseY + 2.55, sbZ - 0.05);
  g.add(clockHousing);

  const clockFace = nonShadow(
    new THREE.Mesh(
      new THREE.CircleGeometry(clockR, 28),
      mat(0xf4eed8, { emissive: 0xfff0c0, emissiveIntensity: 0.55 })
    )
  );
  clockFace.position.set(sbX, sbBaseY + 2.55, sbZ + 0.06);
  g.add(clockFace);

  // Clock numerals / hour ticks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tick = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.02), STEEL_DARK)
    );
    tick.position.set(
      sbX + Math.sin(a) * clockR * 0.86,
      sbBaseY + 2.55 + Math.cos(a) * clockR * 0.86,
      sbZ + 0.08
    );
    tick.rotation.z = -a;
    g.add(tick);
  }

  // Hands (a frozen "game time")
  const hourHand = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.02), STEEL_DARK)
  );
  hourHand.position.set(sbX, sbBaseY + 2.55, sbZ + 0.09);
  hourHand.rotation.z = -0.4;
  g.add(hourHand);
  const minHand = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.02), STEEL_DARK)
  );
  minHand.position.set(sbX, sbBaseY + 2.55, sbZ + 0.09);
  minHand.rotation.z = 1.1;
  g.add(minHand);

  // Flagpole row on top of the scoreboard (division standings flags)
  for (let i = -2; i <= 2; i++) {
    const pole = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6),
        STEEL_DARK
      )
    );
    pole.position.set(sbX + i * 0.6, sbBaseY + 3.45, sbZ);
    g.add(pole);
    const flag = nonShadow(
      new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.18),
        i === 0 || Math.abs(i) === 2 ? RED : CREAM_LIT
      )
    );
    flag.position.set(sbX + i * 0.6 + 0.15, sbBaseY + 3.7, sbZ);
    g.add(flag);
  }

  // ===== Red Marquee at Clark & Addison entrance (south side) =====
  const marquee = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 0.55), RED)
  );
  marquee.position.set(0, 1.1, 6.0);
  g.add(marquee);

  // Full-face marquee sign: WRIGLEY FIELD header + CUBS WIN! headline.
  // Rendered to a CanvasTexture and mapped onto a plane sitting on the
  // front of the marquee box.
  const sign = nonShadow(
    new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 1.9),
      new THREE.MeshStandardMaterial({
        map: wrigleyMarqueeTexture(),
        emissiveMap: wrigleyMarqueeTexture(),
        emissive: 0xffffff,
        emissiveIntensity: 0.45,
        roughness: 0.5,
        metalness: 0.05,
      })
    )
  );
  sign.position.set(0, 1.15, 6.281);
  g.add(sign);

  // Inverted-V point on the bottom of the marquee
  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-1.2, 0, 0, 1.2, 0, 0, 0, -0.75, 0]),
      3
    )
  );
  pointGeo.setIndex([0, 1, 2]);
  pointGeo.computeVertexNormals();
  const point = nonShadow(
    new THREE.Mesh(
      pointGeo,
      new THREE.MeshStandardMaterial({
        color: 0xb3242b,
        roughness: 0.45,
        emissive: 0x4a0e12,
        emissiveIntensity: 0.55,
        side: THREE.DoubleSide,
      })
    )
  );
  point.position.set(0, 0.05, 6.29);
  g.add(point);

  // ===== Light stanchions (added to Wrigley in 1988) =====
  for (const x of [-5.5, -1.8, 1.8, 5.5]) {
    const pole = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 4.6, 6),
        STEEL_DARK
      )
    );
    pole.position.set(x, 2.3, 3.0);
    g.add(pole);
    const rig = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.2, 0.25),
        mat(0xfff0c0, { emissive: 0xffd680, emissiveIntensity: 0.7 })
      )
    );
    rig.position.set(x, 4.6, 3.0);
    g.add(rig);
  }

  return g;
}

// ---- Wrigleyville rooftops — 3-story brick walk-ups across from
//      Wrigley with rooftop bleachers and wooden water tanks. ----
function createWrigleyvilleRooftops() {
  const g = new THREE.Group();
  const BRICK_RED = mat(0x8a4234, { roughness: 0.92 });
  const BRICK_BROWN = mat(0x705241, { roughness: 0.92 });
  const STONE_TRIM = mat(0xc9c0a4, { roughness: 0.85 });
  const ROOF_DARK = mat(0x2a2730, { roughness: 0.85 });
  const WOOD = mat(0x6b4830, { roughness: 0.85 });
  const WOOD_DARK = mat(0x4a3025, { roughness: 0.88 });
  const WINDOW = mat(0x2a3548, { emissive: 0x0a1422, emissiveIntensity: 0.4 });
  const SEAT_BLUE = mat(0x4a4078, { roughness: 0.6 });

  // Six walk-up buildings in a row, each with a rooftop feature
  const buildings = [
    { x: -8, w: 2.3, d: 1.5, h: 2.9, top: "bleachers", brick: BRICK_RED },
    { x: -5.0, w: 2.2, d: 1.6, h: 3.1, top: "water", brick: BRICK_BROWN },
    { x: -1.8, w: 2.5, d: 1.5, h: 2.7, top: "bleachers", brick: BRICK_RED },
    { x: 1.4, w: 2.2, d: 1.6, h: 3.3, top: "water", brick: BRICK_BROWN },
    { x: 4.4, w: 2.4, d: 1.5, h: 2.95, top: "bleachers", brick: BRICK_RED },
    { x: 7.1, w: 1.9, d: 1.5, h: 2.75, top: "billboard", brick: BRICK_BROWN },
  ];

  for (const b of buildings) {
    // Main 3-story building
    const body = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), b.brick)
    );
    body.position.set(b.x, b.h / 2, 0);
    g.add(body);

    // Stone trim/cornice at top
    const cornice = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(b.w + 0.06, 0.1, b.d + 0.06),
        STONE_TRIM
      )
    );
    cornice.position.set(b.x, b.h - 0.05, 0);
    g.add(cornice);

    // Window grid (3 floors x 2 columns)
    for (let floor = 0; floor < 3; floor++) {
      for (let col = 0; col < 2; col++) {
        const win = nonShadow(
          new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.04), WINDOW)
        );
        win.position.set(
          b.x + (col - 0.5) * b.w * 0.55,
          0.5 + floor * (b.h / 3.3),
          b.d / 2 + 0.02
        );
        g.add(win);
      }
    }

    // Flat tar roof
    const roof = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(b.w + 0.02, 0.08, b.d + 0.02),
        ROOF_DARK
      )
    );
    roof.position.set(b.x, b.h + 0.04, 0);
    g.add(roof);

    // Rooftop feature
    if (b.top === "bleachers") {
      // Stepped wooden rooftop bleachers facing the field (south, +z)
      for (let row = 0; row < 4; row++) {
        const step = nonShadow(
          new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.85, 0.16, 0.3), WOOD)
        );
        step.position.set(
          b.x,
          b.h + 0.18 + row * 0.18,
          b.d / 2 - 0.25 - row * 0.28
        );
        g.add(step);
        // Three seats per row
        for (const s of [-1, 0, 1]) {
          const seat = nonShadow(
            new THREE.Mesh(
              new THREE.BoxGeometry(0.22, 0.14, 0.18),
              SEAT_BLUE
            )
          );
          seat.position.set(
            b.x + s * b.w * 0.27,
            b.h + 0.33 + row * 0.18,
            b.d / 2 - 0.25 - row * 0.28
          );
          g.add(seat);
        }
      }
      // Railing along the front edge
      const rail = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(b.w * 0.92, 0.04, 0.04),
          WOOD_DARK
        )
      );
      rail.position.set(b.x, b.h + 0.55, b.d / 2 - 0.02);
      g.add(rail);
    } else if (b.top === "water") {
      // Wooden water tank with conical roof on a steel frame
      const frameH = 0.5;
      // Frame legs
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const leg = nonShadow(
          new THREE.Mesh(
            new THREE.BoxGeometry(0.04, frameH, 0.04),
            WOOD_DARK
          )
        );
        leg.position.set(
          b.x + Math.cos(a) * 0.32,
          b.h + 0.08 + frameH / 2,
          Math.sin(a) * 0.32
        );
        g.add(leg);
      }
      // Wooden tank body (cylindrical)
      const tank = nonShadow(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.4, 0.75, 14),
          WOOD
        )
      );
      tank.position.set(b.x, b.h + 0.08 + frameH + 0.375, 0);
      g.add(tank);
      // Iron band rings around the tank
      for (let r = 0; r < 3; r++) {
        const band = nonShadow(
          new THREE.Mesh(
            new THREE.TorusGeometry(0.4, 0.012, 4, 16),
            mat(0x3a3540, { metalness: 0.5 })
          )
        );
        band.position.set(b.x, b.h + 0.08 + frameH + 0.1 + r * 0.27, 0);
        band.rotation.x = Math.PI / 2;
        g.add(band);
      }
      // Conical roof
      const tankRoof = nonShadow(
        new THREE.Mesh(
          new THREE.ConeGeometry(0.46, 0.28, 14),
          mat(0x4a3025, { roughness: 0.88 })
        )
      );
      tankRoof.position.set(b.x, b.h + 0.08 + frameH + 0.88, 0);
      g.add(tankRoof);
    } else if (b.top === "billboard") {
      // Painted-side billboard (gives the row some variety)
      const board = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(b.w * 0.85, 0.95, 0.08),
          mat(0xfffaee, { emissive: 0xfff0c0, emissiveIntensity: 0.5 })
        )
      );
      board.position.set(b.x, b.h + 0.55, -b.d / 2 + 0.02);
      g.add(board);
      const frame1 = nonShadow(
        new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), WOOD_DARK)
      );
      frame1.position.set(b.x - b.w * 0.42, b.h + 0.6, -b.d / 2 + 0.02);
      g.add(frame1);
      const frame2 = nonShadow(
        new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), WOOD_DARK)
      );
      frame2.position.set(b.x + b.w * 0.42, b.h + 0.6, -b.d / 2 + 0.02);
      g.add(frame2);
    }
  }

  return g;
}

// ---- CTA "L" elevated track loop with a 3-car Red Line train.
//      The train animates around the loop; the function attaches an
//      update(dt) callback to userData. ----
export function createCTATrack() {
  const g = new THREE.Group();

  const STEEL = mat(0x3a3540, { roughness: 0.45, metalness: 0.6 });
  const STEEL_DARK = mat(0x1a1820, { roughness: 0.5, metalness: 0.5 });
  const RAIL = mat(0xa0a4ad, { roughness: 0.35, metalness: 0.8 });
  const TIE = mat(0x4a3a2a, { roughness: 0.88 });
  const RL_RED = mat(0xb3242b, { roughness: 0.45, metalness: 0.3 });
  const RL_DARK = mat(0x6a151a, { roughness: 0.55 });
  const WIN_LIT = mat(0xc0d0e0, {
    emissive: 0x4a6080,
    emissiveIntensity: 0.55,
    metalness: 0.6,
  });
  const SILVER = mat(0x808890, { roughness: 0.5, metalness: 0.5 });
  const HEAD = mat(0xfff8d0, {
    emissive: 0xfff0b0,
    emissiveIntensity: 0.85,
  });

  const trackR = 14.5; // radius of the loop, sits just outside the plaza
  const trackY = 1.65; // elevation
  const trackGauge = 0.42;

  // ---- Track deck: a thin torus ----
  const deck = nonShadow(
    new THREE.Mesh(
      new THREE.TorusGeometry(trackR, 0.06, 6, 96),
      STEEL_DARK
    )
  );
  deck.rotation.x = Math.PI / 2;
  deck.position.y = trackY;
  g.add(deck);

  // ---- Two parallel rails ----
  for (const offset of [-trackGauge / 2, trackGauge / 2]) {
    const rail = nonShadow(
      new THREE.Mesh(
        new THREE.TorusGeometry(trackR + offset, 0.025, 5, 96),
        RAIL
      )
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = trackY + 0.1;
    g.add(rail);
  }

  // ---- Wooden ties between the rails ----
  const tieCount = 64;
  for (let i = 0; i < tieCount; i++) {
    const a = (i / tieCount) * Math.PI * 2;
    const tie = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(trackGauge + 0.18, 0.04, 0.12), TIE)
    );
    tie.position.set(Math.cos(a) * trackR, trackY + 0.08, Math.sin(a) * trackR);
    tie.rotation.y = -a + Math.PI / 2;
    g.add(tie);
  }

  // ---- Steel support pillars + cross bracing every 30° ----
  const pillars = 14;
  for (let i = 0; i < pillars; i++) {
    const a = (i / pillars) * Math.PI * 2;
    const x = Math.cos(a) * trackR;
    const z = Math.sin(a) * trackR;
    // Vertical girder
    const pillar = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.2, trackY, 0.2), STEEL)
    );
    pillar.position.set(x, trackY / 2, z);
    pillar.rotation.y = -a;
    g.add(pillar);
    // Base plate
    const plate = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.36), STEEL_DARK)
    );
    plate.position.set(x, 0.04, z);
    g.add(plate);
    // Diagonal bracing visible from outside
    for (const dir of [-1, 1]) {
      const brace = nonShadow(
        new THREE.Mesh(new THREE.BoxGeometry(0.06, trackY * 0.95, 0.06), STEEL)
      );
      brace.position.set(x, trackY / 2, z);
      brace.rotation.y = -a;
      brace.rotation.z = dir * 0.45;
      g.add(brace);
    }
  }

  // ---- 3-car Red Line train ----
  const train = new THREE.Group();
  const carL = 1.8;
  const carW = 0.5;
  const carH = 0.55;
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();

    // Body
    const body = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(carL, carH, carW), RL_RED)
    );
    body.position.y = carH / 2 + 0.05;
    car.add(body);

    // Dark red top stripe
    const stripe = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(carL, 0.08, carW + 0.02), RL_DARK)
    );
    stripe.position.y = carH + 0.05;
    car.add(stripe);

    // Silver window band running the length
    const wins = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(carL * 0.88, 0.18, carW + 0.02),
        WIN_LIT
      )
    );
    wins.position.y = carH * 0.7 + 0.05;
    car.add(wins);

    // Silver lower band
    const lower = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(carL, 0.1, carW), SILVER)
    );
    lower.position.y = 0.1;
    car.add(lower);

    // Trucks/wheels suggestion
    for (const wx of [-carL * 0.35, carL * 0.35]) {
      const truck = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.08, carW + 0.1),
          STEEL_DARK
        )
      );
      truck.position.set(wx, 0.05, 0);
      car.add(truck);
    }

    // Headlight only on the front car
    if (i === 0) {
      const head = nonShadow(
        new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), HEAD)
      );
      head.position.set(carL / 2 + 0.01, carH * 0.55 + 0.05, 0);
      car.add(head);
    }

    // Coupler to the next car
    if (i < 2) {
      const coupler = nonShadow(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6),
          STEEL_DARK
        )
      );
      coupler.rotation.z = Math.PI / 2;
      coupler.position.set(carL / 2 + 0.09, 0.2, 0);
      car.add(coupler);
    }

    train.add(car);
  }
  g.add(train);

  // ---- Train update: parametric angle around the loop ----
  let t = Math.random() * Math.PI * 2;
  const angularSpeed = 0.14; // radians/sec; ~45s per loop
  const carSpacing = (carL + 0.18) / trackR; // angular spacing between car centers
  g.userData.update = (dt) => {
    t += dt * angularSpeed;
    train.children.forEach((car, i) => {
      const a = t - i * carSpacing;
      car.position.x = Math.cos(a) * trackR;
      car.position.z = Math.sin(a) * trackR;
      car.position.y = trackY + 0.12;
      car.rotation.y = -a + Math.PI / 2;
    });
  };

  return g;
}

// ---- Field Museum — Beaux-Arts neoclassical with three-bay facade.
//      Anatomy: stepped base, recessed central portico with Ionic
//      columns standing forward of a shadowed entrance wall and bronze
//      doors, full entablature (architrave + frieze with triglyphs +
//      projecting cornice), triangular pediment with relief sculpture
//      and rake trim, acroterion ornaments at apex and corners, side
//      wings with pilasters and windows, smaller secondary pediments
//      over the wings, attic parapet with corner urns. ----
function createFieldMuseum() {
  const g = new THREE.Group();
  const MARBLE = mat(0xeae3cd, { roughness: 0.68 });
  const MARBLE_MID = mat(0xd9d0b1, { roughness: 0.72 });
  const MARBLE_DARK = mat(0xc9c0a4, { roughness: 0.75 });
  const SHADOW = mat(0x6a6450, { roughness: 0.88 });
  const WINDOW_DARK = mat(0x2a3548, {
    emissive: 0x0a1422,
    emissiveIntensity: 0.35,
  });
  const BRONZE = mat(0x6a5a32, { roughness: 0.55, metalness: 0.45 });

  // Building dimensions — long horizontal Beaux-Arts (real ratio ~3:1)
  const bodyW = 12.5;
  const bodyD = 4.8;
  const bodyH = 3.0;
  const porticoW = 5.4;
  const porticoColH = 2.3;
  const porticoFloorD = 1.1; // how far the portico floor projects forward

  // ===== Stepped base — three risers wider as they descend =====
  const baseStartY = 0;
  let baseTop = baseStartY;
  for (let i = 0; i < 3; i++) {
    const tier = 2 - i; // 2=bottom step, 0=top step
    const tierW = bodyW + 0.5 + tier * 0.5;
    const tierD = bodyD + 0.5 + tier * 0.5;
    const tierH = 0.13;
    const step = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(tierW, tierH, tierD), MARBLE_MID)
    );
    step.position.set(0, baseStartY + tierH / 2 + (2 - tier) * tierH * 0.9, 0);
    g.add(step);
    if (tier === 0) baseTop = baseStartY + (2 - tier + 1) * tierH * 0.9;
  }

  // ===== Main building body =====
  const body = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyD), MARBLE)
  );
  body.position.set(0, baseTop + bodyH / 2, 0);
  g.add(body);

  // ===== Recessed central portico =====
  // Projecting portico floor
  const porticoFloor = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(porticoW + 0.4, 0.16, porticoFloorD),
      MARBLE_MID
    )
  );
  porticoFloor.position.set(
    0,
    baseTop - 0.08,
    bodyD / 2 + porticoFloorD / 2
  );
  g.add(porticoFloor);

  // Shadowed wall recessed behind the columns (entrance vestibule)
  const entranceWall = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(porticoW - 0.4, porticoColH + 0.1, 0.12),
      SHADOW
    )
  );
  entranceWall.position.set(0, baseTop + (porticoColH + 0.1) / 2, bodyD / 2 - 0.06);
  g.add(entranceWall);

  // Bronze double doors deep in the entrance shadow
  for (const dx of [-0.55, 0.55]) {
    const door = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.55, 0.06), BRONZE)
    );
    door.position.set(dx, baseTop + 0.78, bodyD / 2 + 0.01);
    g.add(door);
    // Door panels (vertical detail)
    const panel = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.4, 0.02), MARBLE_DARK)
    );
    panel.position.set(dx, baseTop + 0.78, bodyD / 2 + 0.045);
    g.add(panel);
  }

  // ===== Ionic columns on the portico — Attic base + shaft + capital =====
  const colCount = 8;
  const colSpacing = (porticoW - 0.6) / (colCount - 1);
  const colR = 0.17;
  const colZ = bodyD / 2 + porticoFloorD - 0.25;

  for (let i = 0; i < colCount; i++) {
    const colX = -porticoW / 2 + 0.3 + i * colSpacing;

    // Attic base (torus + scotia profile compressed into a wide drum)
    const colBase = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(colR * 1.25, colR * 1.3, 0.14, 14),
        MARBLE_MID
      )
    );
    colBase.position.set(colX, baseTop + 0.07, colZ);
    g.add(colBase);

    // Fluted shaft (12-segment cylinder reads as fluting at distance)
    const shaft = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(colR * 0.95, colR, porticoColH - 0.32, 12),
        MARBLE
      )
    );
    shaft.position.set(colX, baseTop + 0.14 + (porticoColH - 0.32) / 2, colZ);
    g.add(shaft);

    // Ionic capital — wide rectangular abacus
    const capital = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), MARBLE)
    );
    capital.position.set(colX, baseTop + porticoColH - 0.04, colZ);
    g.add(capital);

    // Volute scrolls (small ellipsoids on each side of the capital)
    for (const sx of [-1, 1]) {
      const volute = nonShadow(
        new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), MARBLE)
      );
      volute.position.set(colX + sx * 0.18, baseTop + porticoColH - 0.08, colZ);
      volute.scale.set(1.1, 0.65, 1.1);
      g.add(volute);
    }
  }

  // ===== Entablature: architrave + frieze with triglyphs + cornice =====
  const entabY = baseTop + porticoColH + 0.05;

  // Architrave (lower smooth band)
  const architrave = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(porticoW + 0.55, 0.2, 0.8),
      MARBLE_MID
    )
  );
  architrave.position.set(0, entabY + 0.1, bodyD / 2 + 0.32);
  g.add(architrave);

  // Frieze (middle decorated band)
  const frieze = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(porticoW + 0.55, 0.3, 0.74), MARBLE)
  );
  frieze.position.set(0, entabY + 0.35, bodyD / 2 + 0.29);
  g.add(frieze);

  // Triglyphs / vertical fluting on the frieze
  for (let i = -3; i <= 3; i++) {
    const trig = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.03), MARBLE_DARK)
    );
    trig.position.set(i * 0.55, entabY + 0.35, bodyD / 2 + 0.67);
    g.add(trig);
  }

  // Cornice (top projecting band — overhangs slightly)
  const cornicePortico = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(porticoW + 0.7, 0.18, 0.9), MARBLE_MID)
  );
  cornicePortico.position.set(0, entabY + 0.6, bodyD / 2 + 0.36);
  g.add(cornicePortico);

  // ===== Triangular pediment over the portico =====
  const pedW = porticoW + 0.7;
  const pedH = 1.15;
  const pedGeo = new THREE.BufferGeometry();
  pedGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-pedW / 2, 0, 0, pedW / 2, 0, 0, 0, pedH, 0]),
      3
    )
  );
  pedGeo.setIndex([0, 1, 2]);
  pedGeo.computeVertexNormals();
  const ped = nonShadow(
    new THREE.Mesh(
      pedGeo,
      new THREE.MeshStandardMaterial({
        color: 0xeae3cd,
        roughness: 0.7,
        side: THREE.DoubleSide,
      })
    )
  );
  ped.position.set(0, entabY + 0.69, bodyD / 2 + 0.6);
  g.add(ped);

  // Pediment sculpture relief — three figures in the tympanum
  for (let i = -1; i <= 1; i++) {
    const fig = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.48 - Math.abs(i) * 0.1, 0.09),
        MARBLE_MID
      )
    );
    fig.position.set(i * 1.25, entabY + 0.91, bodyD / 2 + 0.65);
    g.add(fig);
    // Round head bump
    const head = nonShadow(
      new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), MARBLE_MID)
    );
    head.position.set(i * 1.25, entabY + 1.17 - Math.abs(i) * 0.1, bodyD / 2 + 0.66);
    g.add(head);
  }

  // Pediment rake trim — angled cornice along the slopes
  for (const dir of [-1, 1]) {
    const slopeLen = Math.sqrt((pedW / 2) ** 2 + pedH * pedH);
    const ang = Math.atan2(pedH, pedW / 2);
    const rake = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.06, slopeLen, 0.22),
        MARBLE_MID
      )
    );
    rake.position.set(
      dir * pedW / 4,
      entabY + 0.69 + pedH / 2,
      bodyD / 2 + 0.66
    );
    rake.rotation.z = -dir * (Math.PI / 2 - ang);
    g.add(rake);
  }

  // Acroterion at the apex
  const apex = nonShadow(
    new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 8), MARBLE)
  );
  apex.position.set(0, entabY + 0.69 + pedH + 0.17, bodyD / 2 + 0.65);
  g.add(apex);

  // Corner acroteria (small urns at pediment corners)
  for (const sx of [-1, 1]) {
    const corner = nonShadow(
      new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 6), MARBLE)
    );
    corner.position.set(
      sx * (pedW / 2 - 0.05),
      entabY + 0.69 + 0.12,
      bodyD / 2 + 0.65
    );
    g.add(corner);
  }

  // ===== Side wings — pilasters with windows between, on both front and side facades =====
  // Front facade pilasters (flanking the central portico)
  for (const side of [-1, 1]) {
    const wingStartX = side * (porticoW / 2 + 0.35);
    const wingEndX = side * bodyW / 2;
    const wingSpan = Math.abs(wingEndX - wingStartX);
    const winCount = 5;

    for (let i = 0; i <= winCount; i++) {
      const t = i / winCount;
      const winX = wingStartX + (wingEndX - wingStartX) * t;

      // Pilaster (flat column attached to the wall)
      const pilaster = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.13, porticoColH + 0.5, 0.08),
          MARBLE_MID
        )
      );
      pilaster.position.set(
        winX,
        baseTop + (porticoColH + 0.5) / 2,
        bodyD / 2 + 0.04
      );
      g.add(pilaster);

      // Pilaster capital (small square block on top)
      const pilCap = nonShadow(
        new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.1), MARBLE)
      );
      pilCap.position.set(winX, baseTop + porticoColH + 0.46, bodyD / 2 + 0.05);
      g.add(pilCap);

      // Window between this pilaster and the next (skip the last)
      if (i < winCount) {
        const nextX = wingStartX + (wingEndX - wingStartX) * ((i + 1) / winCount);
        const winCenterX = (winX + nextX) / 2;
        const win = nonShadow(
          new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.08), WINDOW_DARK)
        );
        win.position.set(winCenterX, baseTop + 1.35, bodyD / 2 + 0.045);
        g.add(win);
        // Window stone frame top
        const winLintel = nonShadow(
          new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.06), MARBLE_MID)
        );
        winLintel.position.set(winCenterX, baseTop + 2.1, bodyD / 2 + 0.05);
        g.add(winLintel);
      }
    }
  }

  // Side facade pilasters + windows (east and west faces of the building)
  for (const sideSign of [-1, 1]) {
    const sideX = sideSign * (bodyW / 2 + 0.04);
    const sideCount = 6;
    for (let i = 0; i <= sideCount; i++) {
      const t = i / sideCount;
      const winZ = -bodyD / 2 + bodyD * t;

      const pilaster = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.08, porticoColH + 0.5, 0.13),
          MARBLE_MID
        )
      );
      pilaster.position.set(sideX, baseTop + (porticoColH + 0.5) / 2, winZ);
      g.add(pilaster);

      if (i < sideCount) {
        const nextZ = -bodyD / 2 + bodyD * ((i + 1) / sideCount);
        const winCenterZ = (winZ + nextZ) / 2;
        const win = nonShadow(
          new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.5), WINDOW_DARK)
        );
        win.position.set(sideX + sideSign * 0.005, baseTop + 1.3, winCenterZ);
        g.add(win);
      }
    }
  }

  // ===== Main cornice band wrapping the entire building =====
  const corniceMain = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.35, 0.2, bodyD + 0.35),
      MARBLE_MID
    )
  );
  corniceMain.position.set(0, baseTop + bodyH + 0.1, 0);
  g.add(corniceMain);

  // Decorative dentil row beneath the cornice
  for (let i = -bodyW / 2; i <= bodyW / 2; i += 0.35) {
    const dentil = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, bodyD + 0.32), MARBLE_DARK)
    );
    dentil.position.set(i, baseTop + bodyH + 0.04, 0);
    g.add(dentil);
  }

  // ===== Attic parapet (low wall above the main cornice) =====
  const attic = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.1, 0.45, bodyD + 0.1),
      MARBLE
    )
  );
  attic.position.set(0, baseTop + bodyH + 0.42, 0);
  g.add(attic);

  // Decorative urns on the attic corners and at intervals
  for (const x of [-bodyW / 2 + 0.2, -3.5, 3.5, bodyW / 2 - 0.2]) {
    const urn = nonShadow(
      new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.42, 12), MARBLE)
    );
    urn.position.set(x, baseTop + bodyH + 0.85, bodyD / 2 + 0.05);
    g.add(urn);
    // Urn lid
    const lid = nonShadow(
      new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6), MARBLE_MID)
    );
    lid.position.set(x, baseTop + bodyH + 1.07, bodyD / 2 + 0.05);
    g.add(lid);
  }

  // ===== Side-wing pediments (smaller secondary pediments above the wings) =====
  for (const side of [-1, 1]) {
    const wpW = 2.4;
    const wpH = 0.55;
    const wpGeo = new THREE.BufferGeometry();
    wpGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([-wpW / 2, 0, 0, wpW / 2, 0, 0, 0, wpH, 0]),
        3
      )
    );
    wpGeo.setIndex([0, 1, 2]);
    wpGeo.computeVertexNormals();
    const wp = nonShadow(
      new THREE.Mesh(
        wpGeo,
        new THREE.MeshStandardMaterial({
          color: 0xeae3cd,
          roughness: 0.7,
          side: THREE.DoubleSide,
        })
      )
    );
    wp.position.set(side * 4.5, baseTop + bodyH + 0.65, bodyD / 2 + 0.18);
    g.add(wp);
    // Small acroterion on wing pediment apex
    const wpApex = nonShadow(
      new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), MARBLE)
    );
    wpApex.position.set(
      side * 4.5,
      baseTop + bodyH + 0.65 + wpH + 0.08,
      bodyD / 2 + 0.18
    );
    g.add(wpApex);
  }

  return g;
}

// ---- Adler Planetarium — wide low marble base with a properly
//      integrated copper-green dome sitting flush on top. ----
function createAdlerPlanetarium() {
  const g = new THREE.Group();
  const MARBLE = mat(0xeae3cd, { roughness: 0.7 });
  const COPPER = mat(0x6b9d7a, {
    roughness: 0.55,
    metalness: 0.35,
    emissive: 0x0e2014,
    emissiveIntensity: 0.1,
  });

  // Wide horizontal entry pavilions (two flanking wings, low and long)
  const baseW = 6.4;
  const baseD = 4.0;
  const baseH = 1.2;
  const base = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseD), MARBLE));
  base.position.y = baseH / 2;
  g.add(base);

  // Stepped wider podium under the base (anchors it to the ground)
  const podium = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(baseW + 0.6, 0.15, baseD + 0.6), mat(0xc9c0a4, { roughness: 0.8 })));
  podium.position.y = 0.075;
  g.add(podium);

  // 12-sided drum holding the dome (centered, narrower than base)
  const drumR = 2.0;
  const drumH = 0.7;
  const drum = nonShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(drumR, drumR, drumH, 12),
    MARBLE
  ));
  drum.position.y = baseH + drumH / 2;
  g.add(drum);

  // Dome (real Adler dome sits flush on the drum, not floating)
  const dome = nonShadow(new THREE.Mesh(
    new THREE.SphereGeometry(drumR, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    COPPER
  ));
  dome.position.y = baseH + drumH;
  g.add(dome);

  // Cornice / cap ring around the dome's base
  const ring = nonShadow(new THREE.Mesh(
    new THREE.TorusGeometry(drumR, 0.05, 6, 24),
    mat(0xc9c0a4)
  ));
  ring.position.y = baseH + drumH;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  // Small ornamental lantern at the dome's peak
  const lantern = nonShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.18, 8),
    mat(0x9a8d6e, { metalness: 0.4 })
  ));
  lantern.position.y = baseH + drumH + drumR;
  g.add(lantern);

  // Promenade ring (anchors building to surroundings)
  const path = nonShadow(new THREE.Mesh(
    new THREE.RingGeometry(3.6, 5.0, 24),
    mat(0xb4a47e, { roughness: 0.85 })
  ));
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.005;
  g.add(path);

  return g;
}

// ---- Soldier Field — Doric colonnade base (1924) with the 2003
//      saucer renovation: an elliptical glass-and-steel UFO-shaped
//      bowl that overhangs the historic limestone colonnade, with
//      the open playing field visible in the middle and an
//      asymmetric grandstand profile. ----
function createSoldierField() {
  const g = new THREE.Group();
  const LIMESTONE = mat(0xd6cba6, { roughness: 0.85 });
  const LIMESTONE_DARK = mat(0xb5a785, { roughness: 0.85 });
  const CREAM = mat(0xf2e8ca, { roughness: 0.7 });
  const STEEL = mat(0x2a3340, { roughness: 0.45, metalness: 0.5 });
  const STEEL_DARK = mat(0x1a2030, { roughness: 0.5, metalness: 0.55 });
  const GLASS = mat(0x6fa9c4, {
    roughness: 0.18,
    metalness: 0.75,
    emissive: 0x2b4a5a,
    emissiveIntensity: 0.5,
  });
  const FIELD_GREEN = mat(0x3c6b32, { roughness: 0.92 });

  // ===== Historic limestone colonnade base (1924) =====
  // Long thin base — Soldier Field's footprint is much longer than it is
  // wide. The base reads as the "podium" beneath the 2003 saucer.
  const baseW = 11;
  const baseD = 5.4;
  const baseH = 1.5;
  const base = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseD), LIMESTONE)
  );
  base.position.y = baseH / 2 + 0.1;
  g.add(base);

  // Stepped plinth under the base
  const plinth = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(baseW + 0.4, 0.2, baseD + 0.4), LIMESTONE_DARK)
  );
  plinth.position.y = 0.1;
  g.add(plinth);

  // Doric column rows on both long sides
  for (const side of [-1, 1]) {
    for (let i = 0; i < 15; i++) {
      const colX = -5.25 + i * 0.75;
      // Shaft
      const shaft = nonShadow(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.13, 1.35, 10),
          CREAM
        )
      );
      shaft.position.set(colX, 0.875, side * (baseD / 2 - 0.2));
      g.add(shaft);
      // Capital (simple Doric square block)
      const cap = nonShadow(
        new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), CREAM)
      );
      cap.position.set(colX, 1.6, side * (baseD / 2 - 0.2));
      g.add(cap);
    }
  }

  // Entablature on top of the colonnade
  const entab = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(baseW + 0.2, 0.32, baseD + 0.2),
      mat(0xc6b988, { roughness: 0.7 })
    )
  );
  entab.position.y = 1.75;
  g.add(entab);

  // Cornice projection
  const cornice = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(baseW + 0.35, 0.12, baseD + 0.35),
      LIMESTONE_DARK
    )
  );
  cornice.position.y = 1.94;
  g.add(cornice);

  // ===== 2003 SAUCER — elliptical bowl OVERHANGING the colonnade =====
  // The signature of the renovation: a UFO-shaped glass/steel bowl that
  // sits dramatically above and projects beyond the historic colonnade.
  // Built from stacked elliptical layers to make a lens / saucer shape.
  const saucerY = 2.5; // sits above the cornice with visible gap (you can
                       // see through the gap to the colonnade behind)
  const saucerW = 13.5; // significantly WIDER than the base (overhangs)
  const saucerD = 7.5;
  const saucerH = 2.2;

  // Steel "stilt" supports lifting the saucer above the colonnade
  // (suggests the cantilevered structural columns of the renovation)
  for (const sx of [-4, -1.5, 1.5, 4]) {
    for (const sz of [-1, 1]) {
      const stilt = nonShadow(
        new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), STEEL_DARK)
      );
      stilt.position.set(sx, 2.3, sz * (baseD / 2 - 0.05));
      g.add(stilt);
    }
  }

  // ---- Saucer underside (bottom of the lens — convex bulge downward) ----
  // Use a flattened sphere bottom cap
  const undersideGeo = new THREE.SphereGeometry(
    1,
    32,
    16,
    0,
    Math.PI * 2,
    Math.PI / 2,
    Math.PI / 2
  );
  const underside = nonShadow(new THREE.Mesh(undersideGeo, STEEL_DARK));
  underside.scale.set(saucerW / 2, saucerH * 0.35, saucerD / 2);
  underside.position.y = saucerY + 0.3;
  g.add(underside);

  // ---- Middle glass band (the seating bowl glazing) ----
  // Two-stack of squat elliptical "drums" so the saucer has structure
  const glassBand = nonShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.85, 48, 1),
      GLASS
    )
  );
  glassBand.scale.set(saucerW / 2, 1, saucerD / 2);
  glassBand.position.y = saucerY + 0.75;
  g.add(glassBand);

  // Steel mullions vertically segmenting the glass band
  const mullionCount = 48;
  for (let i = 0; i < mullionCount; i++) {
    const ang = (i / mullionCount) * Math.PI * 2;
    const ex = Math.cos(ang) * (saucerW / 2 + 0.02);
    const ez = Math.sin(ang) * (saucerD / 2 + 0.02);
    const mull = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.04), STEEL)
    );
    mull.position.set(ex, saucerY + 0.75, ez);
    mull.rotation.y = -ang;
    g.add(mull);
  }

  // ---- Upper steel band wrapping the top of the glass ----
  const upperBand = nonShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.18, 48, 1), STEEL)
  );
  upperBand.scale.set(saucerW / 2 + 0.02, 1, saucerD / 2 + 0.02);
  upperBand.position.y = saucerY + 1.27;
  g.add(upperBand);

  // ---- Saucer top — convex bulge upward forming the lens shape ----
  // This is the "UFO roof" cantilevering out over the seating
  const topCapGeo = new THREE.SphereGeometry(
    1,
    32,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  );
  const topCap = nonShadow(new THREE.Mesh(topCapGeo, STEEL));
  topCap.scale.set(saucerW / 2 + 0.05, saucerH * 0.32, saucerD / 2 + 0.05);
  topCap.position.y = saucerY + 1.36;
  g.add(topCap);

  // ---- Open oval hole in the top (the stadium is open to the sky) ----
  // Inset a dark ellipse to suggest the open bowl interior
  const openHole = nonShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.04, 48, 1),
      mat(0x05080d, {
        roughness: 0.9,
        emissive: 0x000000,
        emissiveIntensity: 0,
      })
    )
  );
  openHole.scale.set(saucerW / 2 - 0.9, 1, saucerD / 2 - 0.9);
  openHole.position.y = saucerY + saucerH * 0.32 + 1.36 - 0.01;
  g.add(openHole);

  // ---- Green playing field visible through the open top ----
  // Sits a bit below the saucer rim, just inside the bowl footprint
  const field = nonShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.04, 32, 1),
      FIELD_GREEN
    )
  );
  field.scale.set(saucerW / 2 - 1.4, 1, saucerD / 2 - 1.4);
  field.position.y = saucerY + 0.55;
  g.add(field);

  // ---- Asymmetric east-side high deck (the renovation made one side
  //      taller than the other — the famous lopsided silhouette) ----
  const highDeck = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(saucerW * 0.55, 0.85, 0.6), STEEL)
  );
  highDeck.position.set(0, saucerY + 1.62, saucerD / 2 - 0.15);
  g.add(highDeck);

  // Glass strip on the high deck
  const highDeckGlass = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(saucerW * 0.55 - 0.2, 0.6, 0.65),
      GLASS
    )
  );
  highDeckGlass.position.set(0, saucerY + 1.62, saucerD / 2 - 0.15);
  g.add(highDeckGlass);

  // Roof cap on the high deck
  const highDeckRoof = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(saucerW * 0.55 + 0.1, 0.1, 0.75),
      STEEL_DARK
    )
  );
  highDeckRoof.position.set(0, saucerY + 2.1, saucerD / 2 - 0.15);
  g.add(highDeckRoof);

  // Light masts on the high deck
  for (const sx of [-2.5, 2.5]) {
    const mast = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 1.2, 6),
        STEEL_DARK
      )
    );
    mast.position.set(sx, saucerY + 2.7, saucerD / 2 - 0.15);
    g.add(mast);
    const light = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.12, 0.12),
        mat(0xfff0c0, { emissive: 0xffd680, emissiveIntensity: 0.85 })
      )
    );
    light.position.set(sx, saucerY + 3.3, saucerD / 2 - 0.15);
    g.add(light);
  }

  return g;
}

// ---- Chicago Water Tower (William W. Boyington, 1869) and its
//      surrounding "Water Tower Place" plaza. Survived the 1871 fire.
//      Castellated Gothic Revival limestone with corner turrets, a tall
//      central tower in stages with lancet windows, an octagonal cupola
//      and pyramidal cap. Around it: cobblestone plaza, period gas-lamp
//      posts, landscape trees, and the companion Pumping Station across
//      the street (same Gothic vocabulary, lower and longer). ----
function createWaterTower() {
  const g = new THREE.Group();
  const STONE = mat(0xeae3cd, { roughness: 0.78 });
  const STONE_MID = mat(0xd6caa6, { roughness: 0.8 });
  const STONE_DARK = mat(0xc9c0a4, { roughness: 0.78 });
  const STONE_SHADOW = mat(0x9a8d6e, { roughness: 0.85 });
  const SLATE = mat(0x4a4a5a, { roughness: 0.7, metalness: 0.25 });
  const COBBLE = mat(0x7d736a, { roughness: 0.95 });
  const GRASS = mat(0x3a6b3a, { roughness: 0.92 });
  const FOLIAGE = mat(0x2c5236, { roughness: 0.9 });
  const FOLIAGE_LIGHT = mat(0x4a7a3c, { roughness: 0.9 });
  const TRUNK = mat(0x4a3a2a, { roughness: 0.95 });
  const IRON = mat(0x1a1820, { roughness: 0.6, metalness: 0.5 });
  const LAMP_GLOW = mat(0xfff0c0, {
    emissive: 0xffd680,
    emissiveIntensity: 0.9,
  });

  // ===== Plaza around the building =====
  const plaza = nonShadow(
    new THREE.Mesh(new THREE.CircleGeometry(5.5, 32), COBBLE)
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.01;
  g.add(plaza);

  // Inner stone ring directly under the tower
  const innerPlaza = nonShadow(
    new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), STONE_DARK)
  );
  innerPlaza.rotation.x = -Math.PI / 2;
  innerPlaza.position.y = 0.02;
  g.add(innerPlaza);

  // Radiating cobble lines (suggest period paver pattern)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const line = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 3.0), STONE_SHADOW)
    );
    line.position.set(Math.cos(a) * 4.0, 0.025, Math.sin(a) * 4.0);
    line.rotation.y = -a + Math.PI / 2;
    g.add(line);
  }

  // ===== Tower base — three-step stone podium =====
  for (let i = 0; i < 3; i++) {
    const w = 3.0 - i * 0.2;
    const podium = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, w), STONE_MID)
    );
    podium.position.y = 0.05 + i * 0.08;
    g.add(podium);
  }
  const baseTopY = 0.29;

  // ===== Lower courtyard walls — square block with battered (sloped) base =====
  const lowerWallH = 1.0;
  const lowerW = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(2.6, lowerWallH, 2.6), STONE)
  );
  lowerW.position.y = baseTopY + lowerWallH / 2;
  g.add(lowerW);

  // String course (horizontal trim band)
  const stringCourse = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.08, 2.74), STONE_MID)
  );
  stringCourse.position.y = baseTopY + lowerWallH - 0.04;
  g.add(stringCourse);

  // Lancet windows on each face of the lower walls
  for (let face = 0; face < 4; face++) {
    const ang = (face * Math.PI) / 2;
    for (const off of [-0.55, 0.55]) {
      const winFrame = nonShadow(
        new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.06), STONE_DARK)
      );
      winFrame.position.set(
        Math.cos(ang) * 1.32 + Math.sin(ang) * off,
        baseTopY + 0.5,
        Math.sin(ang) * 1.32 - Math.cos(ang) * off
      );
      winFrame.rotation.y = -ang;
      g.add(winFrame);
      // Dark window pane
      const pane = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.4, 0.04),
          mat(0x1a2230, { emissive: 0x081020, emissiveIntensity: 0.3 })
        )
      );
      pane.position.set(
        Math.cos(ang) * 1.34 + Math.sin(ang) * off,
        baseTopY + 0.5,
        Math.sin(ang) * 1.34 - Math.cos(ang) * off
      );
      pane.rotation.y = -ang;
      g.add(pane);
      // Pointed-arch top (small triangle)
      const archGeo = new THREE.BufferGeometry();
      archGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array([-0.11, 0, 0, 0.11, 0, 0, 0, 0.12, 0]),
          3
        )
      );
      archGeo.setIndex([0, 1, 2]);
      archGeo.computeVertexNormals();
      const arch = nonShadow(
        new THREE.Mesh(
          archGeo,
          new THREE.MeshStandardMaterial({
            color: 0xd6caa6,
            roughness: 0.8,
            side: THREE.DoubleSide,
          })
        )
      );
      arch.position.set(
        Math.cos(ang) * 1.345 + Math.sin(ang) * off,
        baseTopY + 0.75,
        Math.sin(ang) * 1.345 - Math.cos(ang) * off
      );
      arch.rotation.y = -ang + Math.PI / 2;
      g.add(arch);
    }
  }

  // Crenellation along the top of the lower walls
  for (let face = 0; face < 4; face++) {
    const ang = (face * Math.PI) / 2;
    for (let i = -2; i <= 2; i++) {
      if ((i + face) % 2 === 0) continue;
      const notch = nonShadow(
        new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), STONE)
      );
      const x = Math.cos(ang) * 1.18 + Math.sin(ang) * (i * 0.4);
      const z = Math.sin(ang) * 1.18 - Math.cos(ang) * (i * 0.4);
      notch.position.set(x, baseTopY + lowerWallH + 0.09, z);
      g.add(notch);
    }
  }

  // ===== Four corner turrets with conical "witch-hat" roofs =====
  for (const x of [-1.05, 1.05]) {
    for (const z of [-1.05, 1.05]) {
      // Corbel ring (decorative ring where turret meets wall)
      const corbel = nonShadow(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.3, 0.08, 8),
          STONE_MID
        )
      );
      corbel.position.set(x, baseTopY + 0.05, z);
      g.add(corbel);

      // Turret shaft
      const turret = nonShadow(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.28, 1.7, 8),
          STONE
        )
      );
      turret.position.set(x, baseTopY + 0.85, z);
      g.add(turret);

      // Small lancet window on each turret (facing outward)
      const tw = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.3, 0.04),
          mat(0x1a2230, { emissive: 0x081020, emissiveIntensity: 0.3 })
        )
      );
      const outAng = Math.atan2(z, x);
      tw.position.set(
        x + Math.cos(outAng) * 0.25,
        baseTopY + 1.05,
        z + Math.sin(outAng) * 0.25
      );
      tw.rotation.y = outAng + Math.PI / 2;
      g.add(tw);

      // Corbel ring at top of turret before the roof
      const topRing = nonShadow(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.27, 0.08, 8),
          STONE_MID
        )
      );
      topRing.position.set(x, baseTopY + 1.72, z);
      g.add(topRing);

      // Conical witch-hat roof
      const turretRoof = nonShadow(
        new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 8), SLATE)
      );
      turretRoof.position.set(x, baseTopY + 2.0, z);
      g.add(turretRoof);

      // Finial on top of turret
      const finial = nonShadow(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.025, 0.18, 6),
          IRON
        )
      );
      finial.position.set(x, baseTopY + 2.34, z);
      g.add(finial);
    }
  }

  // ===== Central tower — three stages stacked vertically =====
  // Stage 1: lowest, slightly wider
  const stage1H = 0.95;
  const stage1 = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(1.25, stage1H, 1.25), STONE)
  );
  stage1.position.y = baseTopY + lowerWallH + 0.18 + stage1H / 2;
  g.add(stage1);

  // String course between stages 1 and 2
  const sc1 = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.08, 1.34), STONE_MID)
  );
  sc1.position.y = baseTopY + lowerWallH + 0.18 + stage1H;
  g.add(sc1);

  // Lancet windows on each face of stage 1
  for (let face = 0; face < 4; face++) {
    const ang = (face * Math.PI) / 2;
    const winFrame = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.06), STONE_DARK)
    );
    winFrame.position.set(
      Math.cos(ang) * 0.64,
      baseTopY + lowerWallH + 0.18 + stage1H / 2,
      Math.sin(ang) * 0.64
    );
    winFrame.rotation.y = -ang;
    g.add(winFrame);
    const pane = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.38, 0.04),
        mat(0x1a2230, { emissive: 0x081020, emissiveIntensity: 0.35 })
      )
    );
    pane.position.set(
      Math.cos(ang) * 0.65,
      baseTopY + lowerWallH + 0.18 + stage1H / 2,
      Math.sin(ang) * 0.65
    );
    pane.rotation.y = -ang;
    g.add(pane);
  }

  // Stage 2: middle
  const stage2H = 0.85;
  const stage2Y = baseTopY + lowerWallH + 0.18 + stage1H + 0.08;
  const stage2 = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(1.15, stage2H, 1.15), STONE)
  );
  stage2.position.y = stage2Y + stage2H / 2;
  g.add(stage2);

  // Vertical buttress strips at the corners of stage 2
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const butt = nonShadow(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.1, stage2H, 0.1),
          STONE_MID
        )
      );
      butt.position.set(sx * 0.55, stage2Y + stage2H / 2, sz * 0.55);
      g.add(butt);
    }
  }

  // Lancet windows on each face of stage 2
  for (let face = 0; face < 4; face++) {
    const ang = (face * Math.PI) / 2;
    const winFrame = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.05), STONE_DARK)
    );
    winFrame.position.set(
      Math.cos(ang) * 0.59,
      stage2Y + stage2H / 2,
      Math.sin(ang) * 0.59
    );
    winFrame.rotation.y = -ang;
    g.add(winFrame);
    const pane = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.34, 0.04),
        mat(0x1a2230, { emissive: 0x081020, emissiveIntensity: 0.4 })
      )
    );
    pane.position.set(
      Math.cos(ang) * 0.6,
      stage2Y + stage2H / 2,
      Math.sin(ang) * 0.6
    );
    pane.rotation.y = -ang;
    g.add(pane);
  }

  // Setback string course between stage 2 and the upper drum
  const setback = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 1.3), STONE_MID)
  );
  setback.position.y = stage2Y + stage2H + 0.08;
  g.add(setback);

  // ===== Octagonal cupola (upper drum) with lancet openings =====
  const drumY = stage2Y + stage2H + 0.22;
  const drum = nonShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.55, 8), STONE)
  );
  drum.position.y = drumY;
  g.add(drum);

  // Lancet openings around the octagon
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const opening = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.36, 0.04),
        mat(0x1a2230, { emissive: 0x141a28, emissiveIntensity: 0.5 })
      )
    );
    opening.position.set(Math.cos(ang) * 0.48, drumY, Math.sin(ang) * 0.48);
    opening.rotation.y = -ang;
    g.add(opening);
  }

  // ===== Pyramidal cap =====
  const cap = nonShadow(
    new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.78, 8), SLATE)
  );
  cap.position.y = drumY + 0.27 + 0.39;
  g.add(cap);

  // Iron finial / pinnacle with cross-bar
  const finialBase = nonShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.04, 0.5, 6),
      IRON
    )
  );
  finialBase.position.y = drumY + 0.27 + 0.78 + 0.25;
  g.add(finialBase);

  const finialBall = nonShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), IRON)
  );
  finialBall.position.y = drumY + 0.27 + 0.78 + 0.5;
  g.add(finialBall);

  const finialTop = nonShadow(
    new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 6), IRON)
  );
  finialTop.position.y = drumY + 0.27 + 0.78 + 0.65;
  g.add(finialTop);

  // ===== Period Victorian gas-lamp posts around the plaza =====
  function makeLampPost(x, z) {
    const post = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 1.3, 8),
        IRON
      )
    );
    post.position.set(x, 0.66, z);
    g.add(post);

    // Decorative collar
    const collar = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8),
        IRON
      )
    );
    collar.position.set(x, 1.32, z);
    g.add(collar);

    // Lantern housing
    const lantern = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), IRON)
    );
    lantern.position.set(x, 1.45, z);
    g.add(lantern);

    // Lit glass panes
    const glow = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.13), LAMP_GLOW)
    );
    glow.position.set(x, 1.45, z);
    g.add(glow);

    // Lantern top finial
    const top = nonShadow(
      new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.1, 6), IRON)
    );
    top.position.set(x, 1.62, z);
    g.add(top);
  }
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    makeLampPost(Math.cos(ang) * 3.6, Math.sin(ang) * 3.6);
  }

  // ===== Landscape trees around the plaza =====
  function makeTree(x, z, h, foliage) {
    const trunk = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, h * 0.45, 6),
        TRUNK
      )
    );
    trunk.position.set(x, h * 0.225, z);
    g.add(trunk);
    // Crown (two stacked spheres for fuller foliage)
    const crown1 = nonShadow(
      new THREE.Mesh(new THREE.SphereGeometry(h * 0.4, 10, 8), foliage)
    );
    crown1.position.set(x, h * 0.65, z);
    crown1.scale.y = 0.85;
    g.add(crown1);
    const crown2 = nonShadow(
      new THREE.Mesh(new THREE.SphereGeometry(h * 0.32, 10, 8), foliage)
    );
    crown2.position.set(x + 0.05, h * 0.85, z + 0.04);
    g.add(crown2);
  }
  // Ring of trees
  const treeSpots = [
    [-4.2, -3.4, 1.6, FOLIAGE],
    [4.0, -3.6, 1.4, FOLIAGE_LIGHT],
    [-4.4, 3.2, 1.5, FOLIAGE_LIGHT],
    [4.3, 3.0, 1.7, FOLIAGE],
    [0, -4.6, 1.5, FOLIAGE],
    [-2.6, -4.4, 1.3, FOLIAGE_LIGHT],
    [2.5, -4.3, 1.4, FOLIAGE],
  ];
  for (const [x, z, h, f] of treeSpots) {
    makeTree(x, z, h, f);
  }

  // ===== Grass borders (small grass patches between cobble and trees) =====
  for (const [x, z, r] of [
    [-4.2, -3.4, 0.8],
    [4.0, -3.6, 0.7],
    [-4.4, 3.2, 0.7],
    [4.3, 3.0, 0.8],
    [0, -4.6, 0.7],
  ]) {
    const patch = nonShadow(
      new THREE.Mesh(new THREE.CircleGeometry(r, 16), GRASS)
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.015, z);
    g.add(patch);
  }

  // ===== Pumping Station (companion building across the "street") =====
  // Same Gothic vocabulary, lower and longer. Sits a bit south of the
  // tower on the plaza.
  const pumpG = new THREE.Group();
  const pumpW = 3.6;
  const pumpD = 1.6;
  const pumpH = 1.4;

  // Main body
  const pumpBody = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(pumpW, pumpH, pumpD), STONE)
  );
  pumpBody.position.y = pumpH / 2;
  pumpG.add(pumpBody);

  // Stone trim base
  const pumpBase = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(pumpW + 0.12, 0.1, pumpD + 0.12),
      STONE_MID
    )
  );
  pumpBase.position.y = 0.05;
  pumpG.add(pumpBase);

  // String course
  const pumpString = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(pumpW + 0.06, 0.06, pumpD + 0.06),
      STONE_MID
    )
  );
  pumpString.position.y = pumpH - 0.05;
  pumpG.add(pumpString);

  // Row of lancet windows on the long front
  for (let i = -2; i <= 2; i++) {
    const winFrame = nonShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.06), STONE_DARK)
    );
    winFrame.position.set(i * 0.65, pumpH / 2 + 0.05, pumpD / 2 + 0.005);
    pumpG.add(winFrame);
    const pane = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.55, 0.04),
        mat(0x1a2230, { emissive: 0x081020, emissiveIntensity: 0.4 })
      )
    );
    pane.position.set(i * 0.65, pumpH / 2 + 0.05, pumpD / 2 + 0.02);
    pumpG.add(pane);
    // Pointed arch on top of each window
    const archGeo = new THREE.BufferGeometry();
    archGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([-0.11, 0, 0, 0.11, 0, 0, 0, 0.14, 0]),
        3
      )
    );
    archGeo.setIndex([0, 1, 2]);
    archGeo.computeVertexNormals();
    const arch = nonShadow(
      new THREE.Mesh(
        archGeo,
        new THREE.MeshStandardMaterial({
          color: 0xd6caa6,
          roughness: 0.8,
          side: THREE.DoubleSide,
        })
      )
    );
    arch.position.set(i * 0.65, pumpH / 2 + 0.42, pumpD / 2 + 0.025);
    pumpG.add(arch);
  }

  // Two small corner turrets at each end of the pumping station
  for (const sx of [-1, 1]) {
    const cTurret = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.2, pumpH + 0.3, 8),
        STONE
      )
    );
    cTurret.position.set(sx * (pumpW / 2 + 0.08), (pumpH + 0.3) / 2, 0);
    pumpG.add(cTurret);
    const cRoof = nonShadow(
      new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 8), SLATE)
    );
    cRoof.position.set(sx * (pumpW / 2 + 0.08), pumpH + 0.3 + 0.175, 0);
    pumpG.add(cRoof);
  }

  // Central entrance with small gable
  const entrance = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.18), STONE_DARK)
  );
  entrance.position.set(0, 0.45, pumpD / 2 + 0.09);
  pumpG.add(entrance);
  const door = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.7, 0.06),
      mat(0x4a3025, { roughness: 0.85 })
    )
  );
  door.position.set(0, 0.4, pumpD / 2 + 0.19);
  pumpG.add(door);

  // Pitched slate gable roof (triangular prism extruded along the long axis)
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-pumpW / 2 - 0.05, 0);
  roofShape.lineTo(pumpW / 2 + 0.05, 0);
  roofShape.lineTo(0, 0.55);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: pumpD + 0.2,
    bevelEnabled: false,
  });
  roofGeo.translate(0, 0, -(pumpD + 0.2) / 2);
  const pumpRoof = nonShadow(new THREE.Mesh(roofGeo, SLATE));
  pumpRoof.position.set(0, pumpH, 0);
  pumpG.add(pumpRoof);

  // Position the pumping station across from the tower (south-ish)
  pumpG.position.set(0, 0, 4.0);
  pumpG.rotation.y = Math.PI;
  g.add(pumpG);

  return g;
}

// ---- Marina City — twin corncob cylindrical towers ----
function createMarinaCity() {
  const g = new THREE.Group();
  const CONCRETE = mat(0xc8c0a8, { roughness: 0.75 });
  const PARKING = mat(0x8a826b, { roughness: 0.85 });
  const SLAB = mat(0xb0a890, { roughness: 0.8 });

  const spacing = 1.85;
  const towerH = 6.5;
  const towerR = 0.85;
  const podiumH = 1.4;

  for (const xPos of [-spacing, spacing]) {
    // Parking podium
    const podium = nonShadow(new THREE.Mesh(
      new THREE.CylinderGeometry(towerR * 0.95, towerR * 0.95, podiumH, 28),
      PARKING
    ));
    podium.position.set(xPos, podiumH / 2, 0);
    g.add(podium);

    // Apartment tower
    const tower = nonShadow(new THREE.Mesh(
      new THREE.CylinderGeometry(towerR, towerR, towerH - podiumH, 32),
      CONCRETE
    ));
    tower.position.set(xPos, podiumH + (towerH - podiumH) / 2, 0);
    g.add(tower);

    // Scalloped balcony rings (suggests the corncob facade)
    const floors = 24;
    for (let i = 1; i < floors; i++) {
      const y = podiumH + (i / floors) * (towerH - podiumH);
      const ring = nonShadow(new THREE.Mesh(
        new THREE.TorusGeometry(towerR + 0.05, 0.035, 6, 32),
        SLAB
      ));
      ring.position.set(xPos, y, 0);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    }

    // Flat roof cap
    const cap = nonShadow(new THREE.Mesh(
      new THREE.CylinderGeometry(towerR + 0.05, towerR + 0.05, 0.12, 32),
      mat(0x2a2f3a)
    ));
    cap.position.set(xPos, towerH + 0.06, 0);
    g.add(cap);
  }

  return g;
}

// ---- Background Hancock Center — tapered tower with X-bracing
//      and twin antennae ----
function createHancockLandmark() {
  const g = new THREE.Group();
  const DARK = mat(0x1a1f28, { roughness: 0.5, metalness: 0.3 });
  const METAL = mat(0x6a7585, { roughness: 0.4, metalness: 0.7 });

  // Tapered shaft assembled from 5 segments
  const segments = 5;
  const totalH = 10.5;
  let y = 0;
  for (let i = 0; i < segments; i++) {
    const segH = totalH / segments;
    const wBottom = 3.4 - i * 0.45;
    const wTop = 3.4 - (i + 1) * 0.45;
    const geo = new THREE.CylinderGeometry(wTop * 0.5, wBottom * 0.5, segH, 4, 1);
    geo.rotateY(Math.PI / 4);
    const seg = nonShadow(new THREE.Mesh(geo, DARK));
    seg.position.y = y + segH / 2;
    g.add(seg);

    // X-bracing visible on each of the 4 faces (two diagonals each)
    for (let face = 0; face < 4; face++) {
      const ang = (face * Math.PI) / 2;
      const wMid = (wBottom + wTop) * 0.5;
      const diagLen = Math.sqrt(wMid * wMid + segH * segH);
      for (const dir of [-1, 1]) {
        const brace = nonShadow(new THREE.Mesh(
          new THREE.BoxGeometry(0.06, diagLen, 0.06),
          METAL
        ));
        brace.position.set(
          Math.cos(ang) * (wMid * 0.5 + 0.02),
          y + segH / 2,
          Math.sin(ang) * (wMid * 0.5 + 0.02)
        );
        brace.rotation.y = ang + Math.PI / 2;
        brace.rotation.z = dir * Math.atan2(wMid, segH);
        g.add(brace);
      }
    }

    y += segH;
  }

  // Roof
  const roof = nonShadow(new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.15, 1.3),
    mat(0x2a2f3a)
  ));
  roof.position.y = totalH + 0.075;
  g.add(roof);

  // Twin antennae (Hancock's signature pair)
  for (const x of [-0.3, 0.3]) {
    const ant = nonShadow(new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.1, 2.6, 8),
      METAL
    ));
    ant.position.set(x, totalH + 1.3, 0);
    g.add(ant);
    const beacon = nonShadow(new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      mat(0xb3242b, { emissive: 0x6a181c, emissiveIntensity: 0.7 })
    ));
    beacon.position.set(x, totalH + 2.6, 0);
    g.add(beacon);
  }

  return g;
}

// ---- Background Willis Tower — 3x3 bundled tubes with the real
//      stepped silhouette (2 full / 5 mid / 2 short). ----
function createWillisLandmark() {
  const g = new THREE.Group();
  const DARK = mat(0x121823, { roughness: 0.55, metalness: 0.4 });
  const GLASS = mat(0x2a4060, {
    roughness: 0.3,
    metalness: 0.5,
    emissive: 0x0a1a30,
    emissiveIntensity: 0.3,
  });
  const METAL = mat(0x6a7585, { roughness: 0.4, metalness: 0.7 });

  const SHORT = 0.34;
  const MED = 0.66;
  const TALL = 1.0;
  const heights = [
    [SHORT, MED, MED],
    [MED, TALL, TALL],
    [MED, MED, SHORT],
  ];
  const fullH = 13;
  const tubeW = 1.2;
  const gap = 0.03;
  const totalSpan = 3 * tubeW + 2 * gap;
  const baseOffset = -totalSpan / 2 + tubeW / 2;

  const tallTubes = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const h = heights[i][j] * fullH;
      const x = baseOffset + i * (tubeW + gap);
      const z = baseOffset + j * (tubeW + gap);
      const tube = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(tubeW, h, tubeW), DARK));
      tube.position.set(x, h / 2, z);
      g.add(tube);

      const win = nonShadow(new THREE.Mesh(
        new THREE.BoxGeometry(tubeW * 0.86, h * 0.92, tubeW * 0.86),
        GLASS
      ));
      win.position.set(x, h / 2, z);
      g.add(win);

      // Belt courses at the two setback levels
      for (const lev of [SHORT * fullH, MED * fullH]) {
        if (h > lev + 0.3) {
          const belt = nonShadow(new THREE.Mesh(
            new THREE.BoxGeometry(tubeW + 0.05, 0.12, tubeW + 0.05),
            DARK
          ));
          belt.position.set(x, lev, z);
          g.add(belt);
        }
      }

      if (heights[i][j] === TALL) tallTubes.push({ x, z });
    }
  }

  // Twin antennae on the two tallest tubes
  for (const t of tallTubes) {
    const ant = nonShadow(new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.1, 3.0, 8),
      METAL
    ));
    ant.position.set(t.x, fullH + 1.5, t.z);
    g.add(ant);
    const beacon = nonShadow(new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      mat(0xb3242b, { emissive: 0x6a181c, emissiveIntensity: 0.7 })
    ));
    beacon.position.set(t.x, fullH + 3.0, t.z);
    g.add(beacon);
  }

  return g;
}

// ──────────────────────────────────────────────
// LANDMARK PLACEMENT
// Three depth bands so no landmark stacks visually on top of another:
//   foreground (near, low buildings, lots of horizontal spread)
//   midground  (mid-height civic icons)
//   background (tall skyscrapers, well behind everything)
// All on the north (z<0) side so the default view from white shows the
// full city; a mirrored skyline silhouette sits south for the flip view.
// ──────────────────────────────────────────────
export function createLandmarks() {
  const g = new THREE.Group();
  function place(landmark, x, z, rotY = 0) {
    landmark.position.set(x, 0, z);
    landmark.rotation.y = rotY;
    g.add(landmark);
  }

  // ──────────────────────────────────────────────
  // NORTH SIDE (z<0) — visible from white's default view
  // Three depth bands, with Wrigley Field anchoring its own neighborhood:
  // Wrigley sits in the foreground with the Wrigleyville rooftop row
  // immediately behind it (replacing the downtown skyline in that strip).
  // ──────────────────────────────────────────────

  // Wrigley + its neighborhood
  place(createWrigleyField(), -22, -18, 0.5);
  place(createWrigleyvilleRooftops(), -22, -24, 0.55);

  // Other foreground landmarks
  place(createSoldierField(), -3, -19, -0.05);
  place(createAdlerPlanetarium(), 18, -17, -0.6);

  // Midground civic icon
  place(createWaterTower(), 6, -28, 0);

  // Background skyscrapers
  place(createHancockLandmark(), -12, -42, 0.4);
  place(createWillisLandmark(), 8, -45, -0.05);

  // ──────────────────────────────────────────────
  // SOUTH SIDE (z>0) — visible behind white's camera; whoever flips
  // view also sees these. Lighter density so the south side doesn't
  // crowd the field of play.
  // ──────────────────────────────────────────────
  place(createFieldMuseum(), 6, 22, -2.95);
  place(createMarinaCity(), -10, 26, 2.6);

  return g;
}

// ──────────────────────────────────────────────
// Lights — soft dusk lakefront feel
// ──────────────────────────────────────────────
export function setupLights(scene) {
  const ambient = new THREE.AmbientLight(0xb6c8e0, 0.4);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xffd9a3, 0x1a2a40, 0.45);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffd7a0, 1.15);
  sun.position.set(-7, 11, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 30;
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x4a90c4, 0.35);
  fill.position.set(6, 5, -8);
  scene.add(fill);

  return { ambient, sun, fill, hemi };
}
