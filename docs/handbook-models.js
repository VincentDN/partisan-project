const frame = document.getElementById('art-model');
const closeModel = document.getElementById('unload-model');
document.querySelectorAll('[data-model]').forEach(button => button.addEventListener('click', () => {
  frame.src = 'handbook-viewer/' + button.dataset.model + '.html';
  frame.hidden = closeModel.hidden = false;
  document.querySelectorAll('[data-model]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
}));
closeModel.addEventListener('click', () => {
  frame.removeAttribute('src'); frame.hidden = closeModel.hidden = true;
  document.querySelectorAll('[data-model]').forEach(item => item.setAttribute('aria-pressed', 'false'));
});
