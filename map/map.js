// Default campaign entry: sprite characters, HD-2D presentation and the shared 3-D convoy vehicles.
import {mountMap} from './map-runtime.js';
import {createSpriteLayer} from './sprite-parties.js';
import {createHD2D} from './hd2d.js';

await mountMap({HD2D: true, createSpriteLayer, createHD2D});
