/* Copia de lo guardado en el móvil. No restaura: solo empaqueta las claves at*. */
const Backup = {
  FORMAT: 1,
  // Objetos y listas se guardan como JSON; el resto (p. ej. atReceipt) sigue siendo texto.
  decode(raw) {
    const text = String(raw);
    const head = text.trimStart()[0];
    if (head !== '{' && head !== '[') return text;
    try { return JSON.parse(text); } catch (e) { return text; }
  },
  names(storage) {
    const out = [];
    if (storage && typeof storage.key === 'function' && Number.isFinite(storage.length)) {
      for (let i = 0; i < storage.length; i++) {
        const name = storage.key(i);
        if (typeof name === 'string' && name.startsWith('at')) out.push(name);
      }
    }
    return out.sort();
  },
  build(storage, meta = {}) {
    const data = {};
    for (const name of this.names(storage)) {
      const raw = storage.getItem(name);
      if (raw != null) data[name] = this.decode(raw);
    }
    const when = meta.exportedAt ? new Date(meta.exportedAt) : new Date();
    const app = meta.app == null || meta.app === '' ? null : String(meta.app);
    return {
      format: this.FORMAT,
      exportedAt: Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
      app,
      storage: data
    };
  },
  json(storage, meta) { return JSON.stringify(this.build(storage, meta)); }
};
if (typeof module !== 'undefined') module.exports = Backup;
