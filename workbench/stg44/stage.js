// StG 44 (2044) bench: renderer, camera, the warm key / cold rim lighting with studio reflections, and the dusty floor.
import * as THREE from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {floorTexture} from './floor.js';

export function buildStage(stageEl) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stageEl.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x06080b, 2.2, 5.5);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);

  // lighting: a warm key from above the shooter's side, a cold rim from behind, studio reflections for the steel
  const key = new THREE.SpotLight(0xffe2bd, 38, 6, 0.5, 0.6, 1.4);
  key.position.set(-0.7, 1.5, 1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.radius = 4;
  const rim = new THREE.DirectionalLight(0x7fb4ff, 2.6);
  rim.position.set(1.2, 0.9, -1.6);
  const kick = new THREE.DirectionalLight(0xff9a5c, 0.7);
  kick.position.set(-1.5, -0.2, -0.6);
  scene.add(key, key.target, rim, kick, new THREE.HemisphereLight(0x8fa6c4, 0x0a0806, 0.35));
  new RGBELoader().load('../../assets/lighting/studio.hdr', hdr => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.55;
    hdr.dispose();
  });
  // dusty floor that catches the shadow and a pool of light
  const floorTex = floorTexture();
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4, 48),
    new THREE.MeshStandardMaterial({map: floorTex, roughness: 0.92, metalness: 0}),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  scene.add(floor);
  return {renderer, scene, camera};
}
