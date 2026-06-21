// ============================================================
// ROUTER SIMPLE - WMS TELRAD
// ============================================================

const Router = {
  routes: {},
  currentView: null,

  register(name, viewModule) {
    this.routes[name] = viewModule;
  },

  navigate(name, params = {}) {
    const view = this.routes[name];
    if (!view) {
      console.error('Vista no encontrada:', name);
      return;
    }

    this.currentView = name;
    const main = document.getElementById('main-content');
    const title = document.getElementById('page-title');
    const backBtn = document.getElementById('btn-back');

    title.textContent = view.title || 'Almacén Fleet';
    backBtn.style.display = name === 'menu' ? 'none' : 'flex';

    if (typeof sincronizarModuloActivo === 'function') {
      sincronizarModuloActivo(name);
    }

    main.innerHTML = view.render(params);

    if (view.afterRender) {
      view.afterRender(params);
    }

    window.scrollTo(0, 0);
  },

  back() {
    this.navigate('menu');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-back').addEventListener('click', () => Router.back());
});
