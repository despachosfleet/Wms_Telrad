// ============================================================
// ROUTER — SPA con sistema de PESTAÑAS persistentes (PC)
// En móvil: navegación normal (sin pestañas)
// ============================================================

const Router = {
  _views: {},
  _tabs: [],          // pestañas abiertas: [{id, name, title, params, scrollY, state}]
  _activeTab: null,   // id de la pestaña activa
  _tabCounter: 0,
  currentView: null,
  currentParams: {},

  register(name, view) {
    this._views[name] = view;
  },

  // Verifica si la vista activa tiene trabajo en progreso antes de navegar
  _confirmarSalida() {
    const activeTab = this._tabs.find(t => t.id === this._activeTab);
    if (!activeTab) return true;
    const view = this._views[activeTab.name];
    if (!view || typeof view.hasProgress !== 'function') return true;
    if (!view.hasProgress()) return true;
    return confirm('Tienes trabajo en progreso en esta ventana.\n¿Seguro que quieres salir? Los datos no guardados se perderán.');
  },

  // PC: abre o activa una pestaña. Móvil: navega normalmente
  navigate(name, params = {}) {
    const view = this._views[name];
    if (!view) { console.warn('Vista no registrada:', name); return; }

    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      this._navigateMobile(name, params, view);
    } else {
      // En PC verificar si la vista activa tiene progreso antes de cambiar de módulo
      // Solo si es un módulo diferente al actual (no aplica al cambiar entre pestañas del mismo módulo)
      const activeTab = this._tabs.find(t => t.id === this._activeTab);
      const esModuloDistinto = activeTab && activeTab.name !== name;
      if (esModuloDistinto && !this._confirmarSalida()) return;
      this._navigatePC(name, params, view);
    }

    if (typeof sincronizarModuloActivo === 'function') sincronizarModuloActivo(name);
  },

  _navigateMobile(name, params, view) {
    this.currentView = name;
    this.currentParams = params;
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = view.title || name;
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
      const esMenu = name === 'menu';
      btnBack.style.display = esMenu ? 'none' : '';
      btnBack.onclick = () => this.navigate('menu');
    }
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="page-inner">${view.render ? view.render(params) : ''}</div>`;
    if (view.afterRender) view.afterRender(params);
    window.scrollTo(0, 0);
  },

  _navigatePC(name, params, view) {
    // El menú/dashboard nunca abre como pestaña — es la pantalla base
    if (name === 'menu') {
      this._tabs = [];
      this._activeTab = null;
      this.currentView = 'menu';
      this.currentParams = {};
      this._renderTabs();
      const titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = view.title || 'Inicio';
      const main = document.getElementById('main-content');
      main.innerHTML = `<div class="page-inner">${view.render ? view.render(params) : ''}</div>`;
      if (view.afterRender) view.afterRender(params);
      return;
    }

    // Si ya existe una pestaña para esta vista con los mismos params, activarla
    const key = name + JSON.stringify(params);
    const existing = this._tabs.find(t => t.key === key);
    if (existing) {
      this._activarTab(existing.id);
      return;
    }

    // Nueva pestaña
    const id = ++this._tabCounter;
    const tab = {
      id, key, name, params,
      title: view.title || name,
      scrollY: 0,
      state: null   // estado guardado de la vista
    };
    this._tabs.push(tab);
    this._activeTab = id;
    this.currentView = name;
    this.currentParams = params;

    this._renderTabs();
    this._renderContenido(tab, view);
  },

  _activarTab(tabId) {
    const tab = this._tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Verificar progreso antes de cambiar de pestaña si son módulos distintos
    const activeTab = this._tabs.find(t => t.id === this._activeTab);
    if (activeTab && activeTab.name !== tab.name) {
      const view = this._views[activeTab.name];
      if (view && typeof view.hasProgress === 'function' && view.hasProgress()) {
        if (!confirm('Tienes trabajo en progreso en esta ventana.\n¿Seguro que quieres salir? Los datos no guardados se perderán.')) return;
      }
    }

    // Guardar scroll y estado de la pestaña activa
    const current = this._tabs.find(t => t.id === this._activeTab);
    if (current) {
      current.scrollY = window.scrollY;
      const currentView = this._views[current.name];
      if (currentView && typeof currentView.saveState === 'function') {
        current.state = currentView.saveState();
      }
    }

    this._activeTab = tabId;
    this.currentView = tab.name;
    this.currentParams = tab.params;

    const view = this._views[tab.name];
    if (!view) return;

    this._renderTabs();
    this._renderContenido(tab, view);

    // Restaurar scroll
    setTimeout(() => window.scrollTo(0, tab.scrollY || 0), 50);
    if (typeof sincronizarModuloActivo === 'function') sincronizarModuloActivo(tab.name);
  },

  cerrarTab(tabId, e) {
    if (e) e.stopPropagation();

    // Verificar progreso antes de cerrar
    const tab = this._tabs.find(t => t.id === tabId);
    if (tab && tab.id === this._activeTab) {
      const view = this._views[tab.name];
      if (view && typeof view.hasProgress === 'function' && view.hasProgress()) {
        if (!confirm('Tienes trabajo en progreso en esta ventana.\n¿Seguro que quieres cerrar? Los datos no guardados se perderán.')) return;
      }
    }

    const idx = this._tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    this._tabs.splice(idx, 1);

    if (!this._tabs.length) {
      this._activeTab = null;
      this.navigate('menu');
      return;
    }

    // Activar la pestaña adyacente
    const nextIdx = Math.min(idx, this._tabs.length - 1);
    this._activarTab(this._tabs[nextIdx].id);
  },

  _renderTabs() {
    const bar = document.getElementById('tab-bar');
    if (!bar) return;

    if (!this._tabs.length) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';

    bar.innerHTML = this._tabs.map(t => `
      <div class="tab-item ${t.id === this._activeTab ? 'active' : ''}" data-tab="${t.id}">
        <span class="tab-title">${escapeHtml(t.title)}</span>
        <button class="tab-close" data-close="${t.id}" title="Cerrar">×</button>
      </div>
    `).join('');

    bar.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('[data-close]')) return;
        this._activarTab(Number(el.dataset.tab));
      });
    });
    bar.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', e => this.cerrarTab(Number(btn.dataset.close), e));
    });
  },

  _renderContenido(tab, view) {
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = tab.title;

    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="page-inner">${view.render ? view.render(tab.params) : ''}</div>`;

    // Restaurar estado si existe
    if (tab.state && view && typeof view.restoreState === 'function') {
      view.restoreState(tab.state);
    } else if (view.afterRender) {
      view.afterRender(tab.params);
    }
  },

  // Para compatibilidad con código que usa back()
  back() { this.navigate('menu'); },
  clearHistory() {}
};
