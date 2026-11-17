// Load a single art study on demand without downloading the other models.
const frame = document.getElementById('art-model');
const closeModel = document.getElementById('unload-model');
const choices = document.querySelectorAll('[data-model]');
choices.forEach(button =>
  button.addEventListener('click', () => {
    frame.src = 'handbook-viewer/' + button.dataset.model + '.html';
    frame.hidden = closeModel.hidden = false;
    choices.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }),
);
closeModel.addEventListener('click', () => {
  frame.removeAttribute('src');
  frame.hidden = closeModel.hidden = true;
  const selected = [...choices].find(item => item.getAttribute('aria-pressed') === 'true');
  choices.forEach(item => item.setAttribute('aria-pressed', 'false'));
  selected?.focus();
});
