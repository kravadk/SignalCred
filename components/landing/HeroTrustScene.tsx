"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const NODE_COLORS = ["#20d99a", "#8b5cf6", "#ffb84d", "#ff5e7a", "#36bffa", "#101524"];

export function HeroTrustScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.35, 6.85);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      mount.dataset.webgl = "unavailable";
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const coreGeometry = new THREE.IcosahedronGeometry(1.08, 4);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: "#ff6a4d",
      emissive: "#ff416c",
      emissiveIntensity: 1.48,
      roughness: 0.28,
      metalness: 0.34,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    const innerGeometry = new THREE.SphereGeometry(0.52, 48, 48);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: "#fff2b8",
      transparent: true,
      opacity: 0.72,
    });
    const innerGlow = new THREE.Mesh(innerGeometry, innerMaterial);
    group.add(innerGlow);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: "#20d99a",
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
    });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.012, 12, 160), ringMaterial);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.32, 0.01, 12, 160), ringMaterial.clone());
    ringA.rotation.x = Math.PI * 0.52;
    ringB.rotation.x = Math.PI * 0.35;
    ringB.rotation.y = Math.PI * 0.28;
    group.add(ringA, ringB);

    const nodes = NODE_COLORS.map((color, index) => {
      const nodeGroup = new THREE.Group();
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(index === 5 ? 0.15 : 0.12, 24, 24),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.05,
          roughness: 0.35,
          metalness: 0.15,
        }),
      );
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.009, 10, 64),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62 }),
      );
      halo.rotation.x = Math.PI / 2;
      nodeGroup.add(node, halo);
      group.add(nodeGroup);
      return nodeGroup;
    });

    const lineMaterial = new THREE.LineBasicMaterial({
      color: "#20d99a",
      transparent: true,
      opacity: 0.34,
    });
    const orbitLines = nodes.map((node) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      group.add(line);
      return line;
    });

    const grid = new THREE.GridHelper(9, 24, "#20d99a", "#27344f");
    grid.position.y = -2.05;
    grid.material.opacity = 0.26;
    grid.material.transparent = true;
    scene.add(grid);

    const ambient = new THREE.AmbientLight("#8fb6ff", 1.15);
    const key = new THREE.PointLight("#ff8a55", 13, 16);
    key.position.set(1.6, 2.4, 3.5);
    const rim = new THREE.PointLight("#20d99a", 7, 12);
    rim.position.set(-3.2, -0.8, 2);
    const cool = new THREE.PointLight("#55d6ff", 5, 12);
    cool.position.set(2.8, -1.4, 1.2);
    scene.add(ambient, key, rim, cool);

    const resize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let animationId = 0;
    const animate = () => {
      frame += reducedMotion ? 0.003 : 0.014;
      group.rotation.y = frame * 0.22;
      core.rotation.x = frame * 0.55;
      core.rotation.y = frame * 0.72;
      innerGlow.scale.setScalar(1 + Math.sin(frame * 2.4) * 0.045);
      ringA.rotation.z = frame * 0.52;
      ringB.rotation.z = -frame * 0.38;

      nodes.forEach((node, index) => {
        const radius = 2.18 + (index % 2) * 0.62;
        const angle = frame * (0.5 + index * 0.042) + index * ((Math.PI * 2) / nodes.length);
        const y = Math.sin(frame * 1.08 + index) * 0.58;
        node.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.52);
        node.rotation.y += 0.036;
        const position = node.position;
        const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(position.x, position.y, position.z)];
        orbitLines[index].geometry.setFromPoints(points);
      });

      grid.position.z = (frame * 0.88) % 0.4;
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      mount.removeChild(renderer.domElement);
      coreGeometry.dispose();
      innerGeometry.dispose();
      ringA.geometry.dispose();
      ringB.geometry.dispose();
      coreMaterial.dispose();
      innerMaterial.dispose();
      ringMaterial.dispose();
      lineMaterial.dispose();
      nodes.forEach((node) => {
        node.children.forEach((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            const material = child.material;
            if (Array.isArray(material)) material.forEach((item) => item.dispose());
            else material.dispose();
          }
        });
      });
      orbitLines.forEach((line) => line.geometry.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-95"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_28%,rgba(49,217,155,0.16),transparent_32%),linear-gradient(120deg,rgba(8,9,18,0.18),transparent_38%,rgba(85,214,255,0.12)_68%,rgba(255,92,122,0.1))]" />
    </div>
  );
}
