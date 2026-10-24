/* ===== JARVIS OFFICE v2 — STORAGE ===== */

const JarvisDB = {
  get(key, def = null) {
    try { const v = localStorage.getItem('jo2_' + key); return v !== null ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('jo2_' + key, JSON.stringify(val)); } catch(e) {
      console.warn('JarvisDB: localStorage voll', e);
    }
  },
  del(key) { localStorage.removeItem('jo2_' + key); },
  keys() {
    return Object.keys(localStorage).filter(k => k.startsWith('jo2_')).map(k => k.slice(4));
  },

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
    return Object.values(this.get(`${app}_docs`, {}))
      .sort((a, b) => (b.modified || 0) - (a.modified || 0));
  },
  deleteDoc(app, id) {
    const docs = this.get(`${app}_docs`, {});
    delete docs[id];
    this.set(`${app}_docs`, docs);
  },
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },
};
