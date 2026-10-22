// ===== JARVIS OFFICE STORAGE =====

const JarvisDB = {
  get(key, def = null) {
    try { const v = localStorage.getItem('jarvis_' + key); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('jarvis_' + key, JSON.stringify(val)); } catch {}
  },
  del(key) { localStorage.removeItem('jarvis_' + key); },
  keys() { return Object.keys(localStorage).filter(k => k.startsWith('jarvis_')).map(k => k.slice(7)); },

  // Document management
  saveDoc(app, id, data) {
    const docs = this.get(`${app}_docs`, {});
    docs[id] = { ...data, id, modified: Date.now() };
    this.set(`${app}_docs`, docs);
    return docs[id];
  },
  loadDoc(app, id) {
    return this.get(`${app}_docs`, {})[id] || null;
  },
  listDocs(app) {
    const docs = this.get(`${app}_docs`, {});
    return Object.values(docs).sort((a, b) => (b.modified || 0) - (a.modified || 0));
  },
  deleteDoc(app, id) {
    const docs = this.get(`${app}_docs`, {});
    delete docs[id];
    this.set(`${app}_docs`, docs);
  },
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
};
