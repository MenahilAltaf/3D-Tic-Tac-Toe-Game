/* =====================================================
   TRIAD — hero-bg.js
   A small ambient Three.js scene for the homepage hero:
   a slowly rotating wireframe icosahedron surrounded by
   floating "triad" node clusters. Purely decorative and
   fully self-contained so it never blocks the rest of
   the page if WebGL is unavailable.
   ===================================================== */

(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || !window.THREE) return;

    const container = canvas.parentElement;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 6.5);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Core wireframe geometry — an icosahedron reads as a "cut puzzle gem"
    const coreGeo = new THREE.IcosahedronGeometry(2.1, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00d9ff,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    const coreInnerMat = new THREE.MeshBasicMaterial({
      color: 0x7c5cff,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    const coreInner = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), coreInnerMat);
    scene.add(coreInner);

    // Floating "triad" node points drifting around the core
    const nodeCount = 40;
    const nodesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      const radius = 3 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    nodesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const nodesMat = new THREE.PointsMaterial({
      color: 0xffb340,
      size: 0.06,
      transparent: true,
      opacity: 0.8,
    });
    const nodes = new THREE.Points(nodesGeo, nodesMat);
    scene.add(nodes);

    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    window.addEventListener('resize', resize);

    function animate() {
      core.rotation.y += 0.0028;
      core.rotation.x += 0.0011;
      coreInner.rotation.y -= 0.0018;
      coreInner.rotation.x += 0.0009;
      nodes.rotation.y += 0.0006;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();
  });
})();
