// Report real Three.js resource completions without importing any demo into the campaign.
import {DefaultLoadingManager} from 'three';
import {setLoader, loaderProgress, loaderError} from './loader.js';
const host = () => {
  const card = [...document.querySelectorAll('.nk-loader')].find(el => !el.closest('[hidden]'));
  return card?.closest('.nk-cover') || card;
};
const failed = el => el.matches('[data-state="error"]') || el.querySelector('[data-state="error"]');
const manager = DefaultLoadingManager;
const oldStart = manager.onStart,
  oldProgress = manager.onProgress,
  oldError = manager.onError;
const label = url => {
  try {
    return decodeURIComponent(new URL(url, location.href).pathname.split('/').pop());
  } catch {
    return 'scene resource';
  }
};
manager.onStart = (url, loaded, total) => {
  const el = host();
  if (el && !failed(el)) {
    setLoader(el, `Loading ${label(url)}`);
    loaderProgress(el, total ? loaded / total : null);
  }
  oldStart?.(url, loaded, total);
};
manager.onProgress = (url, loaded, total) => {
  const el = host();
  if (el && !failed(el)) {
    setLoader(el, loaded === total ? 'Preparing scene' : `Loaded ${label(url)} · ${loaded}/${total} resources`);
    loaderProgress(el, loaded === total ? null : loaded / total);
  }
  oldProgress?.(url, loaded, total);
};
manager.onError = url => {
  const el = host();
  if (el) loaderError(el, `Could not load ${label(url)}. Check your connection and reload to retry.`);
  oldError?.(url);
};
