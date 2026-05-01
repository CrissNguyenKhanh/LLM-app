import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const actionLabels = {
  walk: "Dang di bo",
  run: "Dang chay",
  jump: "Dang nhay",
  wave: "Dang chao",
  spin: "Dang xoay",
  sit: "Dang ngoi",
  punch: "Dang dam",
  kick: "Dang da",
  raise: "Dang nang tay",
  idle: "Dang mo phong",
};

function makeLimb(length, radius, color) {
  const group = new THREE.Group();
  const geometry = new THREE.CapsuleGeometry(radius, length, 8, 14);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.position.y = -length / 2;
  group.add(mesh);
  return group;
}

function createCharacter() {
  const root = new THREE.Group();

  const skin = 0xe1a06a;
  const shirt = 0x22d3a0;
  const pants = 0x26345f;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: shirt,
    roughness: 0.5,
    metalness: 0.08,
  });
  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: pants,
    roughness: 0.64,
    metalness: 0.04,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: skin,
    roughness: 0.54,
    metalness: 0.03,
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.62, 10, 18), bodyMaterial);
  torso.position.y = 1.48;
  torso.scale.x = 0.9;
  torso.castShadow = true;
  root.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 20), skinMaterial);
  head.position.y = 2.13;
  head.castShadow = true;
  root.add(head);

  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x111827 })
  );
  face.position.set(0.08, 2.17, 0.22);
  root.add(face);
  const face2 = face.clone();
  face2.position.x = -0.08;
  root.add(face2);

  const leftArm = makeLimb(0.58, 0.065, skin);
  leftArm.position.set(-0.42, 1.82, 0);
  const rightArm = makeLimb(0.58, 0.065, skin);
  rightArm.position.set(0.42, 1.82, 0);
  const leftForearm = makeLimb(0.5, 0.058, skin);
  leftForearm.position.y = -0.56;
  const rightForearm = makeLimb(0.5, 0.058, skin);
  rightForearm.position.y = -0.56;
  leftArm.add(leftForearm);
  rightArm.add(rightForearm);
  root.add(leftArm, rightArm);

  const leftLeg = makeLimb(0.66, 0.082, pants);
  leftLeg.position.set(-0.18, 1.03, 0);
  const rightLeg = makeLimb(0.66, 0.082, pants);
  rightLeg.position.set(0.18, 1.03, 0);
  const leftShin = makeLimb(0.62, 0.074, pants);
  leftShin.position.y = -0.64;
  const rightShin = makeLimb(0.62, 0.074, pants);
  rightShin.position.y = -0.64;
  leftLeg.add(leftShin);
  rightLeg.add(rightShin);
  root.add(leftLeg, rightLeg);

  const hip = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.3), pantsMaterial);
  hip.position.y = 0.98;
  hip.castShadow = true;
  root.add(hip);

  root.position.y = 0.12;
  root.rotation.y = -0.3;

  return {
    root,
    torso,
    head,
    leftArm,
    rightArm,
    leftForearm,
    rightForearm,
    leftLeg,
    rightLeg,
    leftShin,
    rightShin,
  };
}

function resetPose(parts) {
  parts.root.position.set(0, 0.12, 0);
  parts.root.rotation.set(0, -0.3, 0);
  parts.torso.rotation.set(0, 0, 0);
  parts.head.rotation.set(0, 0, 0);
  parts.leftArm.rotation.set(0, 0, 0.32);
  parts.rightArm.rotation.set(0, 0, -0.32);
  parts.leftForearm.rotation.set(0, 0, 0);
  parts.rightForearm.rotation.set(0, 0, 0);
  parts.leftLeg.rotation.set(0, 0, -0.12);
  parts.rightLeg.rotation.set(0, 0, 0.12);
  parts.leftShin.rotation.set(0, 0, 0);
  parts.rightShin.rotation.set(0, 0, 0);
}

function animateCharacter(parts, actionKey, elapsed, delta) {
  resetPose(parts);
  const t = elapsed;
  const wave = Math.sin(t * Math.PI * 2);
  const fastWave = Math.sin(t * Math.PI * 4);

  parts.root.position.y = 0.12 + Math.sin(t * 2.2) * 0.025;
  parts.head.rotation.y = Math.sin(t * 1.7) * 0.12;

  if (actionKey === "walk" || actionKey === "run") {
    const speed = actionKey === "run" ? 7.6 : 4.2;
    const stride = Math.sin(t * speed);
    const stride2 = Math.sin(t * speed + Math.PI);
    const power = actionKey === "run" ? 0.82 : 0.48;
    parts.root.position.x = stride * (actionKey === "run" ? 0.28 : 0.16);
    parts.root.position.y = 0.16 + Math.abs(stride) * (actionKey === "run" ? 0.12 : 0.045);
    parts.torso.rotation.z = stride * 0.08;
    parts.leftArm.rotation.z = 0.3 + stride2 * power;
    parts.rightArm.rotation.z = -0.3 + stride * power;
    parts.leftLeg.rotation.z = -0.08 + stride * power;
    parts.rightLeg.rotation.z = 0.08 + stride2 * power;
    parts.leftShin.rotation.z = Math.max(0, stride2) * 0.45;
    parts.rightShin.rotation.z = Math.max(0, stride) * -0.45;
    return;
  }

  if (actionKey === "jump") {
    const lift = Math.max(0, Math.sin(t * Math.PI * 1.8));
    parts.root.position.y = 0.12 + lift * 0.78;
    parts.leftArm.rotation.z = 0.75 - lift * 1.35;
    parts.rightArm.rotation.z = -0.75 + lift * 1.35;
    parts.leftLeg.rotation.z = -0.25 + lift * 0.36;
    parts.rightLeg.rotation.z = 0.25 - lift * 0.36;
    parts.leftShin.rotation.z = lift * 0.6;
    parts.rightShin.rotation.z = -lift * 0.6;
    return;
  }

  if (actionKey === "wave") {
    parts.rightArm.rotation.z = -2.35 + wave * 0.22;
    parts.rightForearm.rotation.z = -0.75 + Math.sin(t * 9) * 0.75;
    parts.leftArm.rotation.z = 0.38;
    parts.head.rotation.z = Math.sin(t * 3) * 0.08;
    return;
  }

  if (actionKey === "spin") {
    parts.root.rotation.y += elapsed * 3.1;
    parts.leftArm.rotation.z = 0.75;
    parts.rightArm.rotation.z = -0.75;
    parts.torso.rotation.z = Math.sin(t * 5) * 0.08;
    return;
  }

  if (actionKey === "sit") {
    parts.root.position.y = -0.1 + Math.sin(t * 2) * 0.02;
    parts.torso.rotation.x = -0.18;
    parts.leftLeg.rotation.x = -1.18;
    parts.rightLeg.rotation.x = -1.18;
    parts.leftLeg.rotation.z = -0.28;
    parts.rightLeg.rotation.z = 0.28;
    parts.leftShin.rotation.x = 1.22;
    parts.rightShin.rotation.x = 1.22;
    parts.leftArm.rotation.z = 0.12;
    parts.rightArm.rotation.z = -0.12;
    return;
  }

  if (actionKey === "punch") {
    const hit = Math.max(0, fastWave);
    parts.root.rotation.y = -0.55 + hit * 0.28;
    parts.torso.rotation.y = hit * 0.36;
    parts.rightArm.rotation.z = -0.25;
    parts.rightArm.rotation.x = -1.15 - hit * 0.65;
    parts.rightForearm.rotation.x = -0.45 - hit * 1.05;
    parts.leftArm.rotation.z = 0.82;
    parts.leftLeg.rotation.z = -0.22;
    parts.rightLeg.rotation.z = 0.32;
    return;
  }

  if (actionKey === "kick") {
    const kick = Math.max(0, Math.sin(t * Math.PI * 2.6));
    parts.root.rotation.y = -0.62;
    parts.root.position.y = 0.16 + kick * 0.06;
    parts.rightLeg.rotation.x = -0.22 - kick * 1.65;
    parts.rightShin.rotation.x = kick * 0.45;
    parts.leftLeg.rotation.z = -0.36;
    parts.leftArm.rotation.z = 0.82;
    parts.rightArm.rotation.z = -0.88;
    return;
  }

  if (actionKey === "raise") {
    parts.leftArm.rotation.z = 2.72 + Math.sin(t * 3.2) * 0.06;
    parts.rightArm.rotation.z = -2.72 - Math.sin(t * 3.2) * 0.06;
    parts.leftForearm.rotation.z = -0.18;
    parts.rightForearm.rotation.z = 0.18;
    parts.root.position.y = 0.16 + Math.sin(t * 3) * 0.04;
    return;
  }

  parts.leftArm.rotation.z = 0.35 + wave * 0.12;
  parts.rightArm.rotation.z = -0.35 + wave * 0.12;
  parts.leftLeg.rotation.z = -0.12 + wave * 0.04;
  parts.rightLeg.rotation.z = 0.12 - wave * 0.04;
  parts.root.rotation.y += Math.sin(t * 1.2) * delta * 0.3;
}

export default function ActionSimulator({ simulation, onClose }) {
  const mountRef = useRef(null);
  const actionRef = useRef("idle");
  const isActive = Boolean(simulation);

  useEffect(() => {
    actionRef.current = simulation?.actionKey || "idle";
  }, [simulation]);

  useEffect(() => {
    if (!isActive) return undefined;

    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x11141d);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.8, 5);
    camera.lookAt(0, 1.15, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.45);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3.5, 5.2, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x22d3a0, 3.4, 8);
    rimLight.position.set(-2.5, 2.2, 2.5);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6, 5.2),
      new THREE.MeshStandardMaterial({
        color: 0x171b26,
        roughness: 0.82,
        metalness: 0.02,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(7.6, 18, 0x22d3a0, 0x334155);
    grid.position.y = 0.01;
    scene.add(grid);

    const parts = createCharacter();
    scene.add(parts.root);

    const clock = new THREE.Clock();
    let frameId = 0;

    function resize() {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    function render() {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      animateCharacter(parts, actionRef.current, elapsed, delta);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    }

    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((item) => {
        if (!item.isMesh) return;
        item.geometry?.dispose();
        if (Array.isArray(item.material)) {
          item.material.forEach((material) => material.dispose());
        } else {
          item.material?.dispose();
        }
      });
    };
  }, [isActive]);

  if (!simulation) {
    return null;
  }

  const action = simulation.actionKey || "idle";
  const label = actionLabels[action] || actionLabels.idle;

  return (
    <section className="action-simulator action-simulator-webgl" aria-label="3D action simulation">
      <div className="sim-header">
        <div>
          <span className="sim-kicker">WebGL 3D action preview</span>
          <h2>{label}</h2>
          <p>{simulation.actionText || simulation.originalText}</p>
        </div>
        <button className="ghost-button" type="button" onClick={onClose}>
          Dong
        </button>
      </div>

      <div className="sim-webgl-wrap">
        <div ref={mountRef} className="sim-webgl-canvas" />
      </div>
    </section>
  );
}
