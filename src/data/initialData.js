import rawGeojson from './vasavi_map.json';

export const INITIAL_GEOJSON = rawGeojson;
export const BASELINE_FEATURES = rawGeojson.features || [];
export const INITIAL_OFFSET_N = -4.0;
export const INITIAL_OFFSET_E = -4.0;
