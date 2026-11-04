// Stub — will be replaced by the draw agent
export default {
  id: 'draw',
  label: 'Draw',
  mount(container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">draw wird gebaut…</div>`;
  },
  unmount() {}
};
