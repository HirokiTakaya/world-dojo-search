// src/components/LoadingAnimation.tsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "../App.module.css"; // CSSモジュールのインポート

const LoadingAnimation: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // --- シーン設定 ---
    const scene = new THREE.Scene();
    // 落ち着いた暗色の背景（洗練感を演出）
    scene.background = new THREE.Color(0x1a1a1a);

    // --- カメラ設定 ---
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 2;

    // --- レンダラー設定 ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(200, 200);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // mountRef.current を変数にコピー
    const currentMount = mountRef.current;
    if (currentMount) {
      currentMount.appendChild(renderer.domElement);
    }

    // --- ライティング ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // --- ボックスオブジェクト ---
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({
      color: 0x00cc66,
      metalness: 0.5,
      roughness: 0.2,
      transparent: false,
      opacity: 1.0,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    // --- アニメーションループ ---
    const animate = () => {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // --- クリーンアップ処理 ---
    return () => {
      if (currentMount && renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={styles.loadingContainer}>
      <div ref={mountRef} className={styles.threeCanvas}></div>
      <p className={styles.loadingText}>Loading...</p>
    </div>
  );
};

export default LoadingAnimation;
