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
    // Si la vista actual tiene cambios sin guardar, pedir confirmacion
    // ANTES de navegar a cualquier otro lado (barra, dropdown, atras).
    const vistaActual = this.routes[this.currentView];
    if (vistaActual && typeof vistaActual.tieneCambiosSinGuardar === 'function' && vistaActual.tieneCambiosSinGuardar()) {
      this._mostrarAdvertenciaSalida(() => this._navegarReal(name, params));
      return;
    }
    this._navegarReal(name, params);
  },

  _navegarReal(name, params = {}) {
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

  _mostrarAdvertenciaSalida(onConfirmar) {
    let cont = document.getElementById('modal-salida-cont');
    if (!cont) {
      cont = document.createElement('div');
      cont.id = 'modal-salida-cont';
      document.body.appendChild(cont);
    }

    cont.innerHTML = `
      <div class="modal-overlay" id="modal-overlay-salida">
        <div class="modal-box">
          <p class="modal-title">⚠️ Vas a perder lo avanzado</p>
          <p class="modal-text">Tienes cambios sin guardar en esta pantalla. Si sales ahora, se perderán.</p>
          <div class="modal-actions">
            <button class="btn-modal-secundario" id="btn-quedarme">Quedarme aquí</button>
            <button class="btn-modal-primario" id="btn-salir-igual" style="background:var(--danger-text);">Salir de todos modos</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modal-overlay-salida').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay-salida') cont.innerHTML = '';
    });
    document.getElementById('btn-quedarme').addEventListener('click', () => { cont.innerHTML = ''; });
    document.getElementById('btn-salir-igual').addEventListener('click', () => {
      cont.innerHTML = '';
      onConfirmar();
    });
  },

  back() {
    this.navigate('menu');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-back').addEventListener('click', () => Router.back());
});
