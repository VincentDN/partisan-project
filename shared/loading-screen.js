// Start honest loading feedback before page modules; show failures rather than leaving an endless spinner.
import {setLoader, loaderProgress, loaderError} from './loader.js';
const loading = document.querySelector('.nk-cover:has(.nk-loader), .nk-loader');
if (loading) {
  const text = loading.querySelector('.nk-text') || loading.closest('.nk-loader')?.querySelector('.nk-text');
  setLoader(loading, text?.textContent || 'Preparing page');
  loaderProgress(loading, null);
  const failed = () => {
    if (!loading.hidden) loaderError(loading, 'Loading failed. Check your connection, then reload this page to retry.');
  };
  addEventListener('error', failed);
  addEventListener('unhandledrejection', failed);
}
