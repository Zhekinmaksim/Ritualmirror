"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export default function ApertureScene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!stage) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#07080a");

    const camera = new THREE.PerspectiveCamera(32, stage.clientWidth / stage.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const mark = new THREE.Group();
    scene.add(mark);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.012, 32, 256),
      new THREE.MeshStandardMaterial({
        color: 0xd7d9dd,
        metalness: 0.55,
        roughness: 0.5,
        envMapIntensity: 0.78,
        transparent: true,
        opacity: 0.38
      })
    );
    mark.add(halo);

    const arcGeo = new THREE.TorusGeometry(1.15, 0.085, 48, 220, Math.PI);
    const arcBright = new THREE.Mesh(
      arcGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xdfe1e6,
        metalness: 0.68,
        roughness: 0.46,
        envMapIntensity: 0.88,
        clearcoat: 0.24,
        clearcoatRoughness: 0.48
      })
    );
    arcBright.rotation.z = Math.PI / 2;
    mark.add(arcBright);

    const arcDim = new THREE.Mesh(
      arcGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0x9aa0a8,
        metalness: 0.58,
        roughness: 0.56,
        envMapIntensity: 0.62,
        transparent: true,
        opacity: 0.58
      })
    );
    arcDim.rotation.z = -Math.PI / 2;
    arcDim.position.z = -0.04;
    mark.add(arcDim);

    const axis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 1.8, 8, 1),
      new THREE.MeshBasicMaterial({ color: 0xd6a35c, transparent: true, opacity: 0.35 })
    );
    mark.add(axis);

    const pupilMat = new THREE.MeshPhysicalMaterial({
      color: 0xd6a35c,
      metalness: 0.7,
      roughness: 0.32,
      envMapIntensity: 1.05,
      emissive: 0x7a4a1a,
      emissiveIntensity: 0.42,
      clearcoat: 0.45,
      clearcoatRoughness: 0.26
    });
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.18, 64, 64), pupilMat);
    mark.add(pupil);

    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const ctx = glowCanvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(214,163,92,0.42)");
    g.addColorStop(0.42, "rgba(214,163,92,0.13)");
    g.addColorStop(1, "rgba(214,163,92,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    glow.scale.set(1.18, 1.18, 1);
    mark.add(glow);

    const key = new THREE.DirectionalLight(0xffffff, 0.92);
    key.position.set(3, 4, 5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xd6a35c, 0.58);
    rim.position.set(-4, -1, -3);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xb6c0d0, 0.24);
    fill.position.set(-2, 3, 2);
    scene.add(fill);

    const accent = new THREE.PointLight(0xd6a35c, 0.82, 4.8);
    accent.position.set(0, 0, 0.2);
    scene.add(accent);

    const dustCount = 220;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      dustPos[i * 3] = (Math.random() - 0.5) * 8;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xd6a35c,
        size: 0.012,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    scene.add(dust);

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    composer.setSize(stage.clientWidth, stage.clientHeight);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(stage.clientWidth, stage.clientHeight), 0.18, 0.86, 0.58));
    composer.addPass(new OutputPass());

    const target = { x: 0, y: 0 };
    const onMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);

    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.01 }
    );
    observer.observe(stage);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const t = clock.getElapsedTime();
      mark.rotation.y = Math.sin(t * 0.25) * 0.35 + target.x * 0.25;
      mark.rotation.x = Math.sin(t * 0.18) * 0.12 - target.y * 0.18;
      const pulse = 1 + Math.sin(t * 1.6) * 0.04;
      pupil.scale.setScalar(pulse);
      pupilMat.emissiveIntensity = 0.34 + (Math.sin(t * 1.6) + 1) * 0.08;
      glow.scale.setScalar(1.14 + Math.sin(t * 1.6) * 0.06);
      halo.rotation.z = t * 0.08;
      dust.rotation.y = t * 0.02;
      if (visible) {
        composer.render();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      dustGeo.dispose();
      arcGeo.dispose();
      renderer.dispose();
      pmrem.dispose();
      if (renderer.domElement.parentNode === stage) {
        stage.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={ref} className="absolute inset-0" />;
}
