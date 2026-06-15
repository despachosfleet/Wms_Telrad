// ============================================================
// VISTA: MENU PRINCIPAL
// ============================================================

const MenuView = {
  title: 'Almacén Fleet',

  render() {
    return `
      <p class="section-label">Operación diaria</p>
      <div class="menu-grid">

        <button class="menu-item" data-nav="consulta">
          <span class="icon-wrap">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          </span>
          <span>Consultar stock</span>
          <small>Buscar por SKU, serie, paleta o ubicación</small>
        </button>

        <button class="menu-item" data-nav="picking-lista">
          <span class="icon-wrap">
            <svg viewBox="0 0 24 24"><path d="M20 7L9 18l-5-5"/></svg>
          </span>
          <span>Picking</span>
          <small>Despachos pendientes de pickear</small>
        </button>

        <button class="menu-item" data-nav="recepcion">
          <span class="icon-wrap">
            <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5"/><path d="M12 22V12"/></svg>
          </span>
          <span>Recepción</span>
          <small>Registrar ingreso nuevo</small>
        </button>

        <button class="menu-item" data-nav="movimientos">
          <span class="icon-wrap">
            <svg viewBox="0 0 24 24"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </span>
          <span>Movimientos</span>
          <small>Cambiar ubicación de un ítem o paleta</small>
        </button>

      </div>

      <p class="section-label" style="margin-top:18px;">Gestión y reportes</p>
      <div class="menu-grid">

        <button class="menu-item" data-nav="nuevo-despacho">
          <span class="icon-wrap">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
          </span>
          <span>Nuevo despacho</span>
          <small>Cargar guía y enviar a picking</small>
        </button>

        <button class="menu-item" data-nav="kardex">
          <span class="icon-wrap">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </span>
          <span>Kardex</span>
          <small>Historial de movimientos</small>
        </button>

      </div>

      <div class="hint-box" style="margin-top:8px;">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>Para corregir o editar registros existentes, usa Consultar stock y abre el ítem que necesites ajustar.</p>
      </div>
    `;
  },

  afterRender() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.nav;
        Router.navigate(target);
      });
    });
  }
};

Router.register('menu', MenuView);
