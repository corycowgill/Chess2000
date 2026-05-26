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

  const textBand = nonShadow(
    new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.5, 0.05), CREAM_LIT)
  );
  textBand.position.set(0, 1.55, 6.28);
  g.add(textBand);

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

// ---- Field Museum — Beaux-Arts marble, columned facade, pediment ----
function createFieldMuseum() {
  const g = new THREE.Group();
  const MARBLE = mat(0xeae3cd, { roughness: 0.7 });
  const CREAM_DARK = mat(0xd9d0b1, { roughness: 0.7 });

  // Long horizontal Beaux-Arts proportions (real ratio ~3:1)
  const body = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(11, 3.2, 5), MARBLE));
  body.position.y = 1.6;
  g.add(body);

  // Stepped base course
  const step = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.2, 5.6), CREAM_DARK));
  step.position.y = 0.1;
  g.add(step);

  // Front portico (columns + entablature)
  const colonH = 2.2;
  for (let i = 0; i < 8; i++) {
    const col = nonShadow(new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, colonH, 12),
      mat(0xf4eed8, { roughness: 0.65 })
    ));
    col.position.set(-2.45 + i * 0.7, 1.3, 2.55);
    g.add(col);
  }
  // Architrave
  const arch = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.45, 0.55), CREAM_DARK));
  arch.position.set(0, 2.62, 2.6);
  g.add(arch);

  // Triangular pediment
  const pedGeo = new THREE.BufferGeometry();
  pedGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-3.2, 0, 0, 3.2, 0, 0, 0, 1.1, 0]),
      3
    )
  );
  pedGeo.setIndex([0, 1, 2]);
  pedGeo.computeVertexNormals();
  const ped = nonShadow(new THREE.Mesh(
    pedGeo,
    new THREE.MeshStandardMaterial({
      color: 0xeae3cd,
      roughness: 0.7,
      side: THREE.DoubleSide,
    })
  ));
  ped.position.set(0, 2.85, 2.6);
  g.add(ped);

  // Side wings — slightly recessed
  for (const side of [-1, 1]) {
    const wing = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 4.6), CREAM_DARK));
    wing.position.set(side * 5.85, 1.4, 0);
    g.add(wing);
  }

  // Cornice line
  const cornice = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.25, 5.2), CREAM_DARK));
  cornice.position.y = 3.15;
  g.add(cornice);

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

// ---- Soldier Field — Doric colonnade base + modern bowl above ----
function createSoldierField() {
  const g = new THREE.Group();
  const LIMESTONE = mat(0xd6cba6, { roughness: 0.85 });
  const CREAM = mat(0xf2e8ca, { roughness: 0.7 });

  // Lower colonnade base
  const base = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(10, 1.7, 5.8), LIMESTONE));
  base.position.y = 0.85;
  g.add(base);

  // Column rows on both long sides (Doric)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 13; i++) {
      const col = nonShadow(new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 1.5, 10),
        CREAM
      ));
      col.position.set(-4.5 + i * 0.75, 0.95, side * 2.8);
      g.add(col);
    }
  }

  // Entablature
  const entab = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.32, 5.95), mat(0xc6b988, { roughness: 0.7 })));
  entab.position.y = 1.85;
  g.add(entab);

  // The modern bowl — leaning trapezoidal mass with glass band
  const bowl = nonShadow(new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 2.2, 5),
    mat(0x3c4a5e, {
      roughness: 0.4,
      metalness: 0.5,
      emissive: 0x0a121e,
      emissiveIntensity: 0.4,
    })
  ));
  bowl.position.y = 3.15;
  g.add(bowl);

  // Glass band wrapping the bowl
  const glassBand = nonShadow(new THREE.Mesh(
    new THREE.BoxGeometry(8.55, 0.75, 5.05),
    mat(0x6fa9c4, {
      roughness: 0.25,
      metalness: 0.7,
      emissive: 0x2b4a5a,
      emissiveIntensity: 0.45,
    })
  ));
  glassBand.position.y = 3.15;
  g.add(glassBand);

  // Roof rim
  const roofRim = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.18, 5.1), mat(0x2a3340)));
  roofRim.position.y = 4.27;
  g.add(roofRim);

  return g;
}

// ---- Chicago Water Tower (1869) — castellated Gothic limestone ----
function createWaterTower() {
  const g = new THREE.Group();
  const STONE = mat(0xeae3cd, { roughness: 0.78 });
  const STONE_DARK = mat(0xc9c0a4, { roughness: 0.78 });

  // Lower courtyard walls — square block
  const lowerW = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 2.6), STONE));
  lowerW.position.y = 0.5;
  g.add(lowerW);

  // Crenellation strip along top of lower walls (alternating notches)
  for (let face = 0; face < 4; face++) {
    const ang = (face * Math.PI) / 2;
    for (let i = -2; i <= 2; i++) {
      if ((i + face) % 2 === 0) continue;
      const notch = nonShadow(new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.14, 0.22),
        STONE
      ));
      const x = Math.cos(ang) * 1.18 + Math.sin(ang) * (i * 0.4);
      const z = Math.sin(ang) * 1.18 - Math.cos(ang) * (i * 0.4);
      notch.position.set(x, 1.08, z);
      g.add(notch);
    }
  }

  // Four corner turrets
  for (const x of [-1.05, 1.05]) {
    for (const z of [-1.05, 1.05]) {
      const turret = nonShadow(new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.28, 1.6, 8),
        STONE
      ));
      turret.position.set(x, 0.8, z);
      g.add(turret);

      const turretRoof = nonShadow(new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.4, 8),
        STONE_DARK
      ));
      turretRoof.position.set(x, 1.8, z);
      g.add(turretRoof);
    }
  }

  // Central tower (square, taller)
  const central = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), STONE));
  central.position.y = 2.1;
  g.add(central);

  // Setback ring at the top of central tower
  const setback = nonShadow(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 1.4), STONE_DARK));
  setback.position.y = 3.29;
  g.add(setback);

  // Octagonal upper drum
  const drum = nonShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.55, 0.5, 8),
    STONE
  ));
  drum.position.y = 3.65;
  g.add(drum);

  // Pyramidal cap on the upper drum
  const cap = nonShadow(new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 0.7, 8),
    STONE_DARK
  ));
  cap.position.y = 4.25;
  g.add(cap);

  // Final cross/pinnacle
  const pin = nonShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.04, 0.6, 6),
    mat(0x6a8090, { metalness: 0.6 })
  ));
  pin.position.y = 4.9;
  g.add(pin);

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
