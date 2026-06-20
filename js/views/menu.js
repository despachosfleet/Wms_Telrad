// ============================================================
// VISTA: MENU PRINCIPAL
// Organizado en 6 grupos por tipo de operacion, con icono
// monocromo por grupo (sin colores de fondo).
// ============================================================

const ICONOS_GRUPO = {
  recepcion: '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  crear: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
  picking: '<svg viewBox="0 0 24 24"><path d="M16 16h6m-3-3v6M3 3h18v18H3z" /><path d="M3 9h18M9 21V9"/></svg>',
  almacen: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  consultas: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  reportes: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
};

const MenuView = {
  title: 'Almacén Fleet — WMS',

  render() {
    return `
      <p class="section-label"><span class="section-icon">${ICONOS_GRUPO.recepcion}</span> Recepción / Ingresos</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="recepcion">
          <span>Recepción</span>
          <small>Subir Excel del cliente o registrar ingreso manual</small>
        </button>
      </div>

      <p class="section-label" style="margin-top:16px;"><span class="section-icon">${ICONOS_GRUPO.crear}</span> Crear órdenes de picking</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="nuevo-despacho">
          <span>Nueva orden de picking</span>
          <small>Subir PDF de la guía o cargar Excel masivo</small>
        </button>
        <button class="menu-item" data-nav="guias-pendientes">
          <span>Guías pendientes</span>
          <small>Resolver guías cargadas por Excel</small>
        </button>
      </div>

      <p class="section-label" style="margin-top:16px;"><span class="section-icon">${ICONOS_GRUPO.picking}</span> Picking y despachos</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="picking-lista">
          <span>Órdenes de picking</span>
          <small>Pendientes, en proceso, pickeadas y despachadas</small>
        </button>
        <button class="menu-item" data-nav="despachos-salidas">
          <span>Despachos y salidas</span>
          <small>Confirmar la salida real del almacén</small>
        </button>
      </div>

      <p class="section-label" style="margin-top:16px;"><span class="section-icon">${ICONOS_GRUPO.almacen}</span> Gestión de almacén</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="movimientos">
          <span>Movimientos / Ubicaciones</span>
          <small>Cambiar ubicación de un ítem o paleta</small>
        </button>
      </div>

      <p class="section-label" style="margin-top:16px;"><span class="section-icon">${ICONOS_GRUPO.consultas}</span> Consultas</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="consulta">
          <span>Consultar stock</span>
          <small>Buscar por SKU, serie, paleta o ubicación</small>
        </button>
      </div>

      <p class="section-label" style="margin-top:16px;"><span class="section-icon">${ICONOS_GRUPO.reportes}</span> Reportes</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="kardex">
          <span>Kardex</span>
          <small>Historial de movimientos por SKU</small>
        </button>
        <button class="menu-item" data-nav="registro-despachos">
          <span>Registro de despachos</span>
          <small>Historial de guías y exportar a Excel</small>
        </button>
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
