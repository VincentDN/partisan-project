// Standalone Dev tools entry: only this map page loads the operator rig and 3-D weapon models.
import {mountMap} from './map-runtime.js';
import {figure3d} from './models.js';

await mountMap({HD2D: false, figure: figure3d});
