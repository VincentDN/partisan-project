// Bake the Operator Customiser's warehouse (room, lights, fog, the crew at their idles, the workbench) to a 360°
// equirectangular JPG for the Weapon Modder's backdrop, seen from the camera side of the room. The hero is hidden.
//   node tools/assets/bake-warehouse-pano.mjs [out=assets/backgrounds/warehouse-pano.jpg] [width=2048] [height=1.3] [back=2.4]
// `back` moves the eye toward the camera side of the room: the Weapon Modder's long lens magnifies the backdrop, so
// seen from further back the crew and the bench sit at a believable size behind the rifle.
import sharp from 'sharp';
import {launch, open, startServer} from '../../tests/e2e/browser.mjs';

const [out = 'assets/backgrounds/warehouse-pano.jpg', width = '2048', height = '1.3', back = '2.4'] = process.argv.slice(2);
const server = await startServer(8192),
  browser = await launch();
const page = await open(browser, server.url + 'operator/', {viewport: {width: 1200, height: 800}});
page.on('pageerror', e => console.error('page error:', e.message));
await page.waitForFunction(() => window.PARP_OPERATOR?.ready && window.PARP_OPERATOR.crew, null, {timeout: 120000});
await page.evaluate(() => window.PARP_OPERATOR.crew.ready);
await page.waitForTimeout(2500); // the crew settles into its idles
const png = await page.evaluate(
  async ({W, y, z}) => {
    const T = await import('three');
    const o = window.PARP_OPERATOR,
      {renderer, scene} = o.stage;
    renderer.setAnimationLoop(null);
    o.dof?.set(false);
    scene.getObjectByName('turntable').visible = false; // no hero: the rifle takes his place
    o.warehouse.lights.pool.intensity *= 0.3; // the floor right under the rifle would glare under the backdrop's blur
    const cube = new T.WebGLCubeRenderTarget(1024, {type: T.HalfFloatType});
    const cam = new T.CubeCamera(0.05, 60, cube);
    cam.position.set(0, y, z);
    scene.add(cam);
    cam.update(renderer, scene);
    // unwrap: each pixel's longitude/latitude -> direction -> cube texel (three's equirect convention)
    const quad = new T.Mesh(
      new T.PlaneGeometry(2, 2),
      new T.ShaderMaterial({
        uniforms: {tCube: {value: cube.texture}},
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `uniform samplerCube tCube; varying vec2 vUv;
void main() {
  float lon = (vUv.x - 0.5) * 6.2831853, lat = (vUv.y - 0.5) * 3.1415926;
  vec3 d = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  gl_FragColor = vec4(textureCube(tCube, d).rgb, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
        toneMapped: true,
      }),
    );
    const s = new T.Scene();
    s.add(quad);
    renderer.setPixelRatio(1);
    renderer.setSize(W, W / 2, false);
    renderer.render(s, new T.Camera());
    return renderer.domElement.toDataURL('image/png');
  },
  {W: Number(width), y: Number(height), z: Number(back)},
);
await sharp(Buffer.from(png.split(',')[1], 'base64'))
  .jpeg({quality: 84, mozjpeg: true})
  .toFile(out);
console.log(out);
await browser.close();
process.exit(0);
