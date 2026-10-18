// Fullscreen village representative, keyboard choices and transaction-backed visible persuasion results.
import {persuasion} from '../shared/campaign/dialogue.js';
import {villageTransaction} from '../shared/campaign/village.js';
import {rememberFocus, trapTab} from '../shared/modal.js';
export function villageDialogue({el, campaign, settlement, save, refresh}) {
  const restore = rememberFocus(() => document.querySelector('#village-talk'));
  const panel = el('dialog', {class: 'village-dialogue', 'aria-modal': 'true', 'aria-labelledby': 'speaker-name'});
  const portrait = el('div', {class: 'village-portrait', 'aria-hidden': 'true'});
  portrait.innerHTML =
    '<svg viewBox="0 0 300 400"><path fill="#343d35" d="M20 400L40 280Q150 220 260 280L280 400Z"/><path fill="#aa8766" d="M120 210H180V280H120Z"/><ellipse fill="#b99b78" cx="150" cy="150" rx="65" ry="90"/><path fill="#414038" d="M83 148Q65 40 150 45Q230 40 216 150L198 105L105 100Z"/><path fill="#44423b" d="M90 175Q150 218 210 175L195 220L150 252L105 220Z"/><path stroke="#282b29" stroke-width="5" d="M110 143H132M168 143H190M145 180H160"/><path fill="#827956" d="M110 244L150 280L195 244L218 290L150 335L80 290Z"/></svg>';
  const output = el(
    'p',
    {class: 'dialogue-result', role: 'status', 'aria-live': 'polite'},
    'We can help each other, but our supplies are limited.',
  );
  function close() {
    panel.close();
    panel.remove();
    refresh();
    restore();
  }
  function attempt(topic) {
    try {
      const r = villageTransaction(campaign, save, next => persuasion(next, settlement, topic));
      output.textContent = `D20: ${r.die} + ${r.modifier} liberated-village trust = ${r.die + r.modifier}; target ${r.target}. ${r.success ? 'Success.' : 'Unsuccessful.'} ${r.success ? (topic === 'barter' ? 'Barter costs are reduced by another 10 percentage points this week. Return to supplies to exchange items.' : `${r.fighter} joined, healthy and unequipped. One village meal spent.`) : 'No items or meals spent; ordinary village services remain available.'} This decision is saved for this week.`;
    } catch (err) {
      output.textContent = err.message;
    }
  }
  const buttons = [
    el('button', {onclick: () => attempt('barter')}, 'A · Ask for better prices — D20, target 12'),
    el('button', {onclick: () => attempt('recruit')}, 'B · Convince an extra volunteer — D20, target 14'),
    el(
      'button',
      {
        onclick: () => {
          output.textContent =
            'Liberated villages give +3 trust to your roll. Each topic has one saved roll per village per week. A successful recruitment needs a liberated village, a free band slot and one village meal. It adds an extra volunteer without using the regular weekly volunteers. Barter still requires items of sufficient value.';
        },
      },
      'C · Explain the terms',
    ),
    el('button', {onclick: close}, 'D · Return to supplies'),
  ];
  panel.append(
    portrait,
    el(
      'section',
      {class: 'dialogue-copy'},
      el('h2', {id: 'speaker-name'}, `${settlement.name} · Village representative`),
      el('p', {}, 'Persuasion: D20 + 3 trust in liberated villages; +0 in neutral villages. One attempt per topic each week.'),
      output,
      ...buttons,
    ),
  );
  panel.addEventListener('keydown', e => {
    e.stopPropagation();
    const i = 'abcd'.indexOf(e.key.toLowerCase());
    if (i >= 0 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      buttons[i].click();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  });
  panel.addEventListener('cancel', e => {
    e.preventDefault();
    close();
  });
  document.body.append(panel);
  trapTab();
  panel.showModal();
  buttons[0].focus();
}
