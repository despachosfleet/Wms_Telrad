// ============================================================
// VISTA: MENU PRINCIPAL (estilo dashboard denso)
// ============================================================

const MenuView = {
  title: 'Almacén Fleet — WMS',

  render() {
    return `
      <p class="section-label">Operación diaria</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="consulta">
          <span>Consultar stock</span>
          <small>Buscar por SKU, serie, paleta o ubicación</small>
        </button>
        <button class="menu-item" data-nav="picking-lista">
          <span>Picking</span>
          <small>Despachos pendientes de pickear</small>
        </button>
        <button class="menu-item" data-nav="recepcion">
          <span>Recepción</span>
          <small>Registrar ingreso nuevo</small>
        </button>
        <button class="menu-item" data-nav="movimientos">
          <span>Movimientos</span>
          <small>Cambiar ubicación de un ítem o paleta</small>
        </button>
      </div>

      <p class="section-label" style="margin-top:16px;">Gestión y reportes</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="nuevo-despacho">
          <span>Nuevo despacho</span>
          <small>Cargar guía y enviar a picking</small>
        </button>
        <button class="menu-item" data-nav="kardex">
          <span>Kardex</span>
          <small>Historial de movimientos</small>
        </button>
      </div>

      <div class="banner-note" style="margin-top:8px;">
        Para corregir o editar registros existentes, usa Consultar stock y abre el ítem que necesites ajustar.
      </div>
    `;
  },

  afterRender() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        Router.navigate(btn.dataset.nav);
      });
    });
  }
};

Router.register('menu', MenuView);
