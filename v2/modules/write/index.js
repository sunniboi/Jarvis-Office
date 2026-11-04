// Stub — will be replaced by the write agent
export default {
  id: 'write',
  label: 'Write',
  mount(container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">write wird gebaut…</div>`;
  },
  unmount() {}
};
