// skyline.js — Chicago lakefront environment for the chess scene.
// Layout: clean limestone plaza around the board (margin so no street
// or building touches the play area), Lake Michigan extending east,
// parkland beyond plaza, named landmarks pushed back in the middle
// distance, distant city silhouette behind them.
import * as THREE from "three";

// ──────────────────────────────────────────────
// Sky — dusk gradient over the lake
// ──────────────────────────────────────────────
export function createSky() {
  const geo = new THREE.SphereGeometry(120, 32, 16);
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
// Plaza — limestone slab around the chess board with a clean margin so
// nothing physically connects to the play area.
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

  // Subtle inlaid border (darker limestone) framing the plaza
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
// Surrounding ground — parkland/streets, dark tan, well below plaza
// ──────────────────────────────────────────────
export function createGround() {
  const g = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({
      color: 0x2b3a2a,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.45;
  ground.receiveShadow = true;
  g.add(ground);

  // Cream promenade ring around the plaza — pedestrian path between the
  // plaza and the grass / water. Gives the plaza visual breathing room.
  const promRingGeo = new THREE.RingGeometry(8, 11, 64);
  const promRing = new THREE.Mesh(
    promRingGeo,
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
// Lake Michigan — large plane to the east of the plaza
// ──────────────────────────────────────────────
export function createLake() {
  const g = new THREE.Group();

  // Main lake body. Big enough to read as "open water" and slipped
  // east of the board so the plaza on the west side stays clean.
  const lake = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160, 1, 1),
    new THREE.MeshStandardMaterial({
      color: 0x162a44,
      roughness: 0.22,
      metalness: 0.6,
      emissive: 0x05101e,
      emissiveIntensity: 0.15,
    })
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(35, -0.4, 0);
  lake.receiveShadow = true;
  g.add(lake);

  // A faint shimmer band where the sun hits the lake (gives the water
  // some life without needing a real reflection shader).
  const shimmerGeo = new THREE.PlaneGeometry(60, 4);
  const shimmer = new THREE.Mesh(
    shimmerGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffd9a3,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
  );
  shimmer.rotation.x = -Math.PI / 2;
  shimmer.position.set(40, -0.39, -8);
  g.add(shimmer);

  return g;
}

// ──────────────────────────────────────────────
// Distant city skyline silhouette — pushed back, just shape
// ──────────────────────────────────────────────
export function createSkyline() {
  const group = new THREE.Group();

  const rand = (() => {
    let s = 4242421;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  })();

  function makeRow(z, count, spread, hRange, color, glassColor) {
    const row = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const x = -spread / 2 + (i / (count - 1)) * spread + (rand() - 0.5) * 1.2;
      const h = hRange[0] + rand() * (hRange[1] - hRange[0]);
      const w = 0.9 + rand() * 2.4;
      const d = 0.6 + rand() * 1.5;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.9,
          metalness: 0.1,
        })
      );
      b.position.set(x, -0.4 + h / 2, z + (rand() - 0.5) * 0.6);
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

      if (h > 3.5 && rand() > 0.6) {
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.6 + rand() * 0.8, 5),
          new THREE.MeshStandardMaterial({
            color: 0x4a5566,
            roughness: 0.4,
            metalness: 0.6,
          })
        );
        spire.position.set(
          b.position.x,
          b.position.y + h / 2 + 0.35,
          b.position.z
        );
        row.add(spire);
      }
    }
    return row;
  }

  // North-side skyline (visible from white's default view, deep distance)
  group.add(
    makeRow(-55, 36, 90, [3, 7.5], 0x0e1422, 0xf6c073)
  );
  group.add(
    makeRow(-48, 28, 76, [1.8, 4], 0x080d18, 0xffd07a)
  );
  // Faint south-side skyline (visible when view is flipped)
  group.add(
    makeRow(55, 30, 80, [2, 5], 0x0a121f, 0xe4a070)
  );
  group.add(
    makeRow(48, 22, 70, [1.4, 3], 0x06090f, 0xffba80)
  );

  return group;
}

// ──────────────────────────────────────────────
// Specific Chicago landmarks
// All landmark meshes are background-only: no shadows in or out, so they
// don't interact with the chess lighting and the play area stays clean.
// ──────────────────────────────────────────────
function nonShadow(mesh) {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

// Wrigley Field — north-side ballpark with red marquee and green stands
function createWrigleyField() {
  const g = new THREE.Group();

  // Stands: long brick rectangular block
  const stands = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(7, 2.2, 4.5),
      new THREE.MeshStandardMaterial({
        color: 0x6b3a2a,
        roughness: 0.85,
        metalness: 0.05,
      })
    )
  );
  stands.position.y = 1.1;
  g.add(stands);

  // Iconic green roof / scoreboard tower
  const roof = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(7.1, 0.45, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x2f5a31, roughness: 0.7 })
    )
  );
  roof.position.y = 2.45;
  g.add(roof);

  // Manual scoreboard (square block on top, dark green with cream digits feel)
  const scoreboard = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.4, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x2c4d2c,
        emissive: 0x141d11,
        emissiveIntensity: 0.4,
      })
    )
  );
  scoreboard.position.set(0, 3.35, -2.0);
  g.add(scoreboard);

  // Red marquee on the front
  const marquee = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.6, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0xb3242b,
        emissive: 0x4a0e12,
        emissiveIntensity: 0.5,
        roughness: 0.4,
      })
    )
  );
  marquee.position.set(0, 1.4, 2.45);
  g.add(marquee);

  // Field: green strip in front
  const field = nonShadow(
    new THREE.Mesh(
      new THREE.PlaneGeometry(7, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x3a6c34, roughness: 0.9 })
    )
  );
  field.rotation.x = -Math.PI / 2;
  field.position.set(0, 0.005, 4.5);
  g.add(field);

  // Light stanchions
  for (const x of [-3.2, 3.2]) {
    const pole = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x2a2f38 })
      )
    );
    pole.position.set(x, 1.75, 1.8);
    g.add(pole);
    const lights = nonShadow(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.18, 0.18),
        new THREE.MeshStandardMaterial({
          color: 0xfff0c0,
          emissive: 0xffd680,
          emissiveIntensity: 0.7,
        })
      )
    );
    lights.position.set(x, 3.5, 1.8);
    g.add(lights);
  }

  return g;
}

// United Center — long curved-roof arena, west side
function createUnitedCenter() {
  const g = new THREE.Group();

  // Main body: wide low rectangular volume
  const body = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 2.4, 5),
      new THREE.MeshStandardMaterial({
        color: 0xd1d5dc,
        roughness: 0.7,
        metalness: 0.15,
      })
    )
  );
  body.position.y = 1.2;
  g.add(body);

  // Curved roof: half cylinder over the bowl
  const roofGeo = new THREE.CylinderGeometry(2.7, 2.7, 8.5, 24, 1, false, 0, Math.PI);
  const roof = nonShadow(
    new THREE.Mesh(
      roofGeo,
      new THREE.MeshStandardMaterial({
        color: 0xe4e7ec,
        roughness: 0.55,
        metalness: 0.25,
      })
    )
  );
  roof.rotation.z = Math.PI / 2;
  roof.position.y = 2.4;
  g.add(roof);

  // Glass-front entrance atrium
  const atrium = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.6, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x6fa9c4,
        roughness: 0.2,
        metalness: 0.7,
        emissive: 0x2b4a5a,
        emissiveIntensity: 0.35,
      })
    )
  );
  atrium.position.set(0, 0.85, 2.8);
  g.add(atrium);

  // Bulls red banner detail at one end
  const banner = nonShadow(
    new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.6),
      new THREE.MeshBasicMaterial({
        color: 0xb3242b,
        transparent: true,
        opacity: 0.9,
      })
    )
  );
  banner.position.set(-2, 1.8, 2.51);
  g.add(banner);

  return g;
}

// Soldier Field — Doric colonnade with the modern bowl rising above
function createSoldierField() {
  const g = new THREE.Group();

  // Lower colonnade base (limestone)
  const base = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(9, 1.6, 5.5),
      new THREE.MeshStandardMaterial({ color: 0xd6cba6, roughness: 0.85 })
    )
  );
  base.position.y = 0.8;
  g.add(base);

  // Column rows on the two long sides
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const col = nonShadow(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 1.4, 10),
          new THREE.MeshStandardMaterial({
            color: 0xf2e8ca,
            roughness: 0.7,
          })
        )
      );
      col.position.set(-4 + i * 0.8, 0.9, side * 2.65);
      g.add(col);
    }
  }

  // Entablature above the columns
  const entab = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 0.3, 5.7),
      new THREE.MeshStandardMaterial({ color: 0xc6b988, roughness: 0.7 })
    )
  );
  entab.position.y = 1.75;
  g.add(entab);

  // The modern bowl ("the spaceship") rising above the classical base.
  // Trapezoidal block, slightly leaning, with glass/metal feel.
  const bowl = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 2.0, 4.6),
      new THREE.MeshStandardMaterial({
        color: 0x3c4a5e,
        roughness: 0.4,
        metalness: 0.5,
        emissive: 0x0a121e,
        emissiveIntensity: 0.4,
      })
    )
  );
  bowl.position.y = 2.95;
  g.add(bowl);

  // Glass band on the bowl (suggests stadium glazing)
  const glassBand = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(7.55, 0.7, 4.65),
      new THREE.MeshStandardMaterial({
        color: 0x6fa9c4,
        roughness: 0.25,
        metalness: 0.7,
        emissive: 0x2b4a5a,
        emissiveIntensity: 0.4,
      })
    )
  );
  glassBand.position.y = 2.95;
  g.add(glassBand);

  return g;
}

// Field Museum — Beaux-Arts white marble with Ionic column row + pediment
function createFieldMuseum() {
  const g = new THREE.Group();

  const body = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(9, 3.5, 5),
      new THREE.MeshStandardMaterial({ color: 0xeae3cd, roughness: 0.7 })
    )
  );
  body.position.y = 1.75;
  g.add(body);

  // Front columns
  for (let i = 0; i < 8; i++) {
    const col = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 2.4, 12),
        new THREE.MeshStandardMaterial({ color: 0xf4eed8, roughness: 0.65 })
      )
    );
    col.position.set(-3 + i * 0.86, 1.45, 2.55);
    g.add(col);
  }

  // Architrave above the front columns
  const arch = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.4, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xd9d0b1, roughness: 0.7 })
    )
  );
  arch.position.set(0, 2.85, 2.6);
  g.add(arch);

  // Triangular pediment (front gable)
  const pedGeo = new THREE.BufferGeometry();
  const w = 7.2,
    h = 0.9;
  const verts = new Float32Array([
    -w / 2, 0, 0,
    w / 2, 0, 0,
    0, h, 0,
  ]);
  pedGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
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
  ped.position.set(0, 3.05, 2.6);
  g.add(ped);

  // Stepped base
  const step = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(9.4, 0.18, 5.4),
      new THREE.MeshStandardMaterial({ color: 0xc9c0a4, roughness: 0.8 })
    )
  );
  step.position.y = 0.09;
  g.add(step);

  return g;
}

// Adler Planetarium — 12-sided marble base with copper-green dome
function createAdler() {
  const g = new THREE.Group();

  const base = nonShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 1.6, 12),
      new THREE.MeshStandardMaterial({ color: 0xeae3cd, roughness: 0.7 })
    )
  );
  base.position.y = 0.8;
  g.add(base);

  // The signature green copper dome
  const dome = nonShadow(
    new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x6b9d7a,
        roughness: 0.55,
        metalness: 0.35,
        emissive: 0x0e2014,
        emissiveIntensity: 0.1,
      })
    )
  );
  dome.position.y = 1.6;
  g.add(dome);

  // Entrance pavilion
  const entr = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.4, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xeae3cd, roughness: 0.7 })
    )
  );
  entr.position.set(0, 0.7, 2.6);
  g.add(entr);

  // Surrounding peninsula path
  const path = nonShadow(
    new THREE.Mesh(
      new THREE.RingGeometry(2.6, 4.2, 24),
      new THREE.MeshStandardMaterial({ color: 0xb4a47e, roughness: 0.85 })
    )
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.005;
  g.add(path);

  return g;
}

// Shedd Aquarium — Beaux-Arts white marble octagonal building with
// stepped pyramidal roof and columned portico
function createShedd() {
  const g = new THREE.Group();

  // Octagonal main body
  const body = nonShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xeae3cd, roughness: 0.7 })
    )
  );
  body.position.y = 0.9;
  g.add(body);

  // Stepped pyramidal roof (3 tiers)
  const tiers = [
    { r: 2.4, h: 0.4, y: 1.85 },
    { r: 1.9, h: 0.35, y: 2.2 },
    { r: 1.4, h: 0.3, y: 2.5 },
  ];
  for (const t of tiers) {
    const tier = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(t.r * 0.85, t.r, t.h, 8),
        new THREE.MeshStandardMaterial({
          color: 0xd9d0b1,
          roughness: 0.7,
        })
      )
    );
    tier.position.y = t.y;
    g.add(tier);
  }

  // Small lantern/cupola on top
  const lantern = nonShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0xf4eed8, roughness: 0.6 })
    )
  );
  lantern.position.y = 2.82;
  g.add(lantern);
  const lanternRoof = nonShadow(
    new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 0.4, 8),
      new THREE.MeshStandardMaterial({
        color: 0x6b9d7a,
        roughness: 0.5,
        metalness: 0.3,
      })
    )
  );
  lanternRoof.position.y = 3.2;
  g.add(lanternRoof);

  // Columned portico facing forward
  for (let i = 0; i < 6; i++) {
    const col = nonShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.6, 10),
        new THREE.MeshStandardMaterial({ color: 0xf4eed8, roughness: 0.65 })
      )
    );
    col.position.set(-1.3 + i * 0.52, 0.8, 2.5);
    g.add(col);
  }
  const lintel = nonShadow(
    new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.28, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xd9d0b1, roughness: 0.7 })
    )
  );
  lintel.position.set(0, 1.74, 2.5);
  g.add(lintel);

  return g;
}

export function createLandmarks() {
  const g = new THREE.Group();

  function place(landmark, x, z, rotY = 0) {
    landmark.position.set(x, 0, z);
    landmark.rotation.y = rotY;
    g.add(landmark);
  }

  // North side: visible from the default white-side view (camera at +z
  // looking toward -z). Most landmarks live up here.
  place(createWrigleyField(), -16, -28, 0.5);
  place(createUnitedCenter(), -28, -10, -0.9);
  place(createFieldMuseum(), 2, -32, 0.05);
  place(createSoldierField(), -8, -22, -0.1);
  place(createAdler(), 18, -22, -0.9); // peninsula in the lake
  place(createShedd(), 26, -8, -1.4); // peninsula in the lake

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

  // Warm key from the west (dusk sun)
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

  // Cool fill from the lake side
  const fill = new THREE.DirectionalLight(0x4a90c4, 0.35);
  fill.position.set(6, 5, -8);
  scene.add(fill);

  return { ambient, sun, fill, hemi };
}
