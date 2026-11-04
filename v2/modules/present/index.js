// Stub — will be replaced by the present agent
export default {
  id: 'present',
  label: 'Present',
  mount(container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">present wird gebaut…</div>`;
  },
  unmount() {}
};
