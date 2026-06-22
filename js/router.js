// ============================================================
// ROUTER — SPA sin hash en URL
// ============================================================

const Router = {
  _views: {},
  _history: [],
  currentView: null,
  currentParams: {},

  register(name, view) {
    this._views[name] = view;
  },

  navigate(name, params = {}) {
    const view = this._views[name];
    if (!view) { console.warn('Vista no registrada:', name); return; }

    if (this.currentView && this.currentView !== 'menu') {
      this._history.push({ name: this.currentView, params: this.currentParams });
    }

    this.currentView = name;
    this.currentParams = params;

    // Título
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = view.title || name;

    // Botón atrás
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
      btnBack.style.display = this._history.length > 0 ? '' : 'none';
      btnBack.onclick = () => this.back();
    }

    // Render
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="page-inner">${view.render ? view.render(params) : ''}</div>`;

    if (view.afterRender) view.afterRender(params);
    if (typeof sincronizarModuloActivo === 'function') sincronizarModuloActivo(name);

    window.scrollTo(0, 0);
  },

  back() {
    if (this._history.length === 0) { this.navigate('menu'); return; }
    const prev = this._history.pop();
    this.navigate(prev.name, prev.params);
  },

  clearHistory() { this._history = []; }
};
