// Procedural Chicago skyline silhouette + Lake Michigan + sky.
import * as THREE from "three";

export function createSky() {
  const geo = new THREE.SphereGeometry(60, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a1936) },
      midColor: { value: new THREE.Color(0x6c3a73) },
      bottomColor: { value: new THREE.Color(0xf4a36a) },
      horizonGlow: { value: new THREE.Color(0xffd9a3) },
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
        // horizon glow
        float g = exp(-pow((h - 0.0) / 0.15, 2.0));
        col = mix(col, horizonGlow, g * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -1;
  return mesh;
}

// Build a city silhouette out of boxes arranged in a wide band behind the board.
export function createSkyline() {
  const group = new THREE.Group();

  // Helper to seed deterministic randomness
  const rand = (() => {
    let s = 1234567;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  })();

  // Two layers: far and near
  function layer({
    z,
    count,
    minH,
    maxH,
    spread,
    color,
    glassColor,
    addLandmarks,
  }) {
    const layerG = new THREE.Group();
    const baseY = -0.2;

    for (let i = 0; i < count; i++) {
      const x = -spread / 2 + (i / (count - 1)) * spread + (rand() - 0.5) * 0.4;
      const h = minH + rand() * (maxH - minH);
      const w = 0.5 + rand() * 1.4;
      const d = 0.5 + rand() * 1.0;

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.85,
          metalness: 0.1,
        })
      );
      building.position.set(x, baseY + h / 2, z + (rand() - 0.5) * 0.3);
      building.receiveShadow = false;
      building.castShadow = false;
      layerG.add(building);

      // window glow (front face only)
      if (h > 1.0) {
        const g = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 0.85, h * 0.85),
          new THREE.MeshBasicMaterial({
            color: glassColor,
            transparent: true,
            opacity: 0.42,
          })
        );
        g.position.set(building.position.x, building.position.y, z + d / 2 + 0.01);
        layerG.add(g);
      }

      // some buildings get spires
      if (rand() > 0.78 && h > 1.5) {
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(0.04, 0.5 + rand() * 0.6, 6),
          new THREE.MeshStandardMaterial({
            color: 0x4a5566,
            roughness: 0.4,
            metalness: 0.7,
          })
        );
        spire.position.set(
          building.position.x,
          building.position.y + h / 2 + 0.25,
          building.position.z
        );
        layerG.add(spire);
      }
    }

    // Landmarks (far layer only): Willis-like, Hancock-like
    if (addLandmarks) {
      // Willis: 9 bundle tubes, very tall, slightly left of center
      const willisG = new THREE.Group();
      const heights = [3.4, 3.6, 3.4, 3.6, 4.6, 3.6, 3.4, 3.6, 3.4];
      const w = 0.18;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const h = heights[i * 3 + j];
          const tube = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, w),
            new THREE.MeshStandardMaterial({
              color: 0x1a212d,
              roughness: 0.6,
              metalness: 0.3,
            })
          );
          tube.position.set(
            (i - 1) * (w + 0.005) - 3.5,
            baseY + h / 2,
            z + 0.1
          );
          willisG.add(tube);
        }
      }
      const willisAnt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.04, 1.4, 8),
        new THREE.MeshStandardMaterial({
          color: 0x6f7a8a,
          roughness: 0.3,
          metalness: 0.8,
        })
      );
      willisAnt.position.set(-3.5, baseY + 4.6 + 0.7, z + 0.1);
      willisG.add(willisAnt);
      layerG.add(willisG);

      // Hancock-like: tapered with X
      const hancockG = new THREE.Group();
      const hh = 4.2;
      const hSeg = 4;
      let yh = baseY;
      for (let s = 0; s < hSeg; s++) {
        const sH = hh / hSeg;
        const wb = 0.6 - s * 0.1;
        const wt = 0.6 - (s + 1) * 0.1;
        const geo = new THREE.CylinderGeometry(wt * 0.5, wb * 0.5, sH, 4);
        geo.rotateY(Math.PI / 4);
        const m = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({
            color: 0x10161f,
            roughness: 0.55,
            metalness: 0.3,
          })
        );
        m.position.set(2.6, yh + sH / 2, z + 0.05);
        hancockG.add(m);
        yh += sH;
      }
      for (const x of [-0.04, 0.04]) {
        const ant = new THREE.Mesh(
          new THREE.CylinderGeometry(0.014, 0.022, 1.0, 8),
          new THREE.MeshStandardMaterial({
            color: 0x6f7a8a,
            roughness: 0.3,
            metalness: 0.8,
          })
        );
        ant.position.set(2.6 + x, yh + 0.5, z + 0.05);
        hancockG.add(ant);
      }
      layerG.add(hancockG);
    }

    return layerG;
  }

  group.add(
    layer({
      z: -10,
      count: 28,
      minH: 1.4,
      maxH: 3.0,
      spread: 20,
      color: 0x141a26,
      glassColor: 0xf6c073,
      addLandmarks: true,
    })
  );
  group.add(
    layer({
      z: -7.5,
      count: 22,
      minH: 0.9,
      maxH: 2.2,
      spread: 18,
      color: 0x0c1018,
      glassColor: 0xffd07a,
      addLandmarks: false,
    })
  );

  return group;
}

// Lake plane with shimmering reflection (cheap fake).
export function createLake() {
  const geo = new THREE.PlaneGeometry(60, 30, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0c2238,
    roughness: 0.18,
    metalness: 0.65,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.21, -6);
  mesh.receiveShadow = true;
  return mesh;
}

// Lights for golden hour vibe
export function setupLights(scene) {
  const ambient = new THREE.AmbientLight(0xb6c8e0, 0.35);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xffd9a3, 0x1a2a40, 0.45);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffd7a0, 1.2);
  sun.position.set(-6, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 30;
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);

  // Cool fill from lake side
  const fill = new THREE.DirectionalLight(0x4a90c4, 0.35);
  fill.position.set(5, 5, -8);
  scene.add(fill);

  return { ambient, sun, fill, hemi };
}
