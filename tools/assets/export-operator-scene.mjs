// Export the Operator Customiser's default scene as one GLB for review in Blender or any glTF viewer: the operator in
// his default pose with his rifle, the crew at their idles, the warehouse and its props, every light, and the camera
// with its target. What glTF cannot carry (fog, tone mapping, exposure, the depth of field, the hemisphere fill)
// goes into scene-settings.json beside it, with a reference screenshot of the page.
//   node tools/assets/export-operator-scene.mjs [outDir=outbound/operator-modder-scene]
import fs from 'node:fs';
import path from 'node:path';
import {launch, open, startServer} from '../../tests/e2e/browser.mjs';

const [outDir = 'outbound/operator-modder-scene'] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const server = await startServer(8191),
  browser = await launch();
const page = await open(browser, server.url + 'operator/', {viewport: {width: 1600, height: 1000}});
page.on('pageerror', e => console.error('page error:', e.message));
page.on('console', m => m.type() === 'warning' && /GLTFExporter/.test(m.text()) && console.warn(m.text()));
await page.waitForFunction(() => window.PARP_OPERATOR?.ready && window.PARP_OPERATOR.crew, null, {timeout: 120000});
await page.evaluate(() => window.PARP_OPERATOR.crew.ready);
await page.waitForTimeout(2500);
await page.locator('#stage').screenshot({path: path.join(outDir, 'reference-screenshot.png')});

const result = await page.evaluate(async () => {
  const T = await import('three');
  const {GLTFExporter} = await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
  const o = window.PARP_OPERATOR,
    {renderer, scene, camera, controls} = o.stage;
  renderer.setAnimationLoop(null); // freeze this frame: the pose, the crew's idles
  scene.updateMatrixWorld(true);
  const notes = [];

  // lights: glTF aims a spot or directional light down its own -Z, so point each at its target and parent the target
  const aimed = [];
  scene.traverse(l => l.isLight && l.target && aimed.push(l));
  for (const l of aimed) {
    const at = l.target.getWorldPosition(new T.Vector3());
    l.lookAt(at);
    l.add(l.target);
    l.target.position.set(0, 0, -1);
  }
  const fills = [];
  scene.traverse(l => (l.isHemisphereLight || l.isAmbientLight) && fills.push(l));

  // the camera and the point it orbits, as nodes in the file
  const cam = camera.clone();
  cam.name = 'OperatorModderCamera';
  camera.updateMatrixWorld(true);
  camera.matrixWorld.decompose(cam.position, cam.quaternion, cam.scale);
  scene.add(cam);
  const target = new T.Object3D();
  target.name = 'CameraTarget';
  target.position.copy(controls.target);
  scene.add(target);

  // floats everywhere (the source models are meshopt-quantised; not every tool reads KHR_mesh_quantization)
  scene.traverse(m => {
    if (!m.isMesh) return;
    for (const name of ['position', 'normal', 'uv']) {
      const a = m.geometry.attributes[name];
      if (!a || a.array instanceof Float32Array) continue;
      const f = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) f[i * a.itemSize + k] = a.getComponent(i, k);
      m.geometry.setAttribute(name, new T.BufferAttribute(f, a.itemSize));
    }
  });

  const settings = {
    exported: new Date().toISOString(),
    units: 'metres, +Y up; the operator stands at the origin facing +Z',
    camera: {
      position: cam.position.toArray(),
      target: controls.target.toArray(),
      fovDegrees: camera.fov,
      near: camera.near,
      far: camera.far,
      aspect: camera.aspect,
    },
    renderer: {toneMapping: 'ACESFilmic', exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace},
    background: '#' + scene.background?.getHexString?.(),
    fog: scene.fog ? {type: 'exponential squared', color: '#' + scene.fog.color.getHexString(), density: scene.fog.density} : null,
    environment: {note: 'an HDR environment for reflections only', intensity: scene.environmentIntensity},
    depthOfField: o.dof
      ? {
          focusDistance: camera.position.distanceTo(controls.target),
          sharpMetresEitherSide: o.dof.uniforms.uSharp.value,
          falloffMetres: o.dof.uniforms.uFalloff.value,
          maxBlurPixelsAt900: 9,
        }
      : null,
    fillLights: fills.map(l => ({
      type: l.type,
      name: l.name,
      sky: '#' + l.color.getHexString(),
      ground: l.groundColor ? '#' + l.groundColor.getHexString() : undefined,
      intensity: l.intensity,
    })),
    lights: [],
    operator: o.state,
  };
  scene.traverse(l => {
    if (!l.isLight || l.isHemisphereLight || l.isAmbientLight) return;
    settings.lights.push({
      type: l.type,
      name: l.name,
      color: '#' + l.color.getHexString(),
      intensity: l.intensity,
      distance: l.distance,
      angle: l.angle,
      penumbra: l.penumbra,
      decay: l.decay,
      castShadow: l.castShadow,
      visible: l.visible,
      position: l.getWorldPosition(new T.Vector3()).toArray(),
    });
  });
  // name the unnamed lights so they read in an outliner
  let n = 0;
  scene.traverse(l => l.isLight && !l.name && (l.name = `${l.type}_${++n}`));

  const glb = await new GLTFExporter().parseAsync(scene, {binary: true, onlyVisible: true, maxTextureSize: 2048});
  const bytes = new Uint8Array(glb);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return {glb: btoa(bin), settings, notes};
});
fs.writeFileSync(path.join(outDir, 'operator-modder-default.glb'), Buffer.from(result.glb, 'base64'));
fs.writeFileSync(path.join(outDir, 'scene-settings.json'), JSON.stringify(result.settings, null, 2) + '\n');
console.log(`${outDir}/operator-modder-default.glb ${(Buffer.from(result.glb, 'base64').length / 1e6).toFixed(1)} MB`);
await browser.close();
process.exit(0);
