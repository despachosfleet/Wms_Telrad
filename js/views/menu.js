// ============================================================
// MENU PRINCIPAL + BARRA DE NAVEGACION
// FIX: dashboard ahora carga sin crashear. obtenerRecepcionesPendientes
// existe en supabase-client.js. calcularEstadoVisual recibe objeto
// con despachos_items incluidos.
// ============================================================

const MODULOS = [
  {
    id: 'recepcion-mod',
    label: 'Recepción',
    icono: '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    submodulos: [
      { nav: 'recepcion', label: 'Recepción', desc: 'Registrar ingreso de mercadería' }
    ]
  },
  {
    id: 'crear-mod',
    label: 'Crear picking',
    icono: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
    submodulos: [
      { nav: 'nuevo-despacho', label: 'Nueva orden de picking', desc: 'Subir PDF de la guía o ingresar manual' },
      { nav: 'guias-pendientes', label: 'Guías pendientes', desc: 'GRs cargados esperando PDF' }
    ]
  },
  {
    id: 'picking-mod',
    label: 'Picking',
    icono: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    submodulos: [
      { nav: 'picking-lista', label: 'Órdenes de picking', desc: 'Pendientes, en proceso, pickeadas' },
      { nav: 'despachos-salidas', label: 'Despachos y salidas', desc: 'Confirmar salida real del almacén' }
    ]
  },
  {
    id: 'almacen-mod',
    label: 'Almacén',
    icono: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    submodulos: [
      { nav: 'movimientos', label: 'Movimientos', desc: 'Cambiar ubicación de ítem o paleta' },
      { nav: 'ubicaciones', label: 'Ubicaciones', desc: 'Ver y gestionar ubicaciones' }
    ]
  },
  {
    id: 'consultas-mod',
    label: 'Consultas',
    icono: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    submodulos: [
      { nav: 'consulta', label: 'Consultar stock', desc: 'Buscar por SKU, serie, paleta, ubicación' }
    ]
  },
  {
    id: 'reportes-mod',
    label: 'Reportes',
    icono: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    submodulos: [
      { nav: 'kardex', label: 'Kardex', desc: 'Historial de movimientos por SKU' },
      { nav: 'registro-despachos', label: 'Registro de despachos', desc: 'Historial y exportar a Excel' }
    ]
  }
];

const VISTA_A_MODULO = {};
MODULOS.forEach(m => m.submodulos.forEach(s => { VISTA_A_MODULO[s.nav] = m.id; }));

let _moduloActivo = MODULOS[0].id;
let _dropdownAbierto = null;

function renderBarraModulos() {
  const nav = document.getElementById('module-nav');
  if (!nav) return;

  nav.innerHTML = MODULOS.map(m => `
    <button class="module-item ${m.id === _moduloActivo ? 'active' : ''}" data-modulo="${m.id}">
      ${m.icono}<span>${m.label}</span>
    </button>
  `).join('');

  nav.querySelectorAll('[data-modulo]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const moduloId = btn.dataset.modulo;
      if (_dropdownAbierto === moduloId) {
        cerrarDropdownModulos();
        return;
      }
      abrirDropdownModulo(moduloId, btn);
    });
  });
}

function abrirDropdownModulo(moduloId, btnRef) {
  const modulo = MODULOS.find(m => m.id === moduloId);
  if (!modulo) return;

  const panel = document.getElementById('module-dropdown-panel');
  const btnRect = btnRef.getBoundingClientRect();

  panel.innerHTML = modulo.submodulos.map(s => `
    <button class="dropdown-option" data-nav-dd="${s.nav}">${escapeHtml(s.label)}</button>
  `).join('');

  panel.style.left = btnRect.left + 'px';
  panel.style.top = btnRect.bottom + 'px';
  panel.style.display = 'block';
  _dropdownAbierto = moduloId;

  _moduloActivo = moduloId;
  document.querySelectorAll('.module-item').forEach(b => b.classList.remove('active'));
  btnRef.classList.add('active');

  if (Router.currentView === 'menu' && typeof MenuView !== 'undefined') {
    document.getElementById('main-content').innerHTML = MenuView.render();
  }

  panel.querySelectorAll('[data-nav-dd]').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      cerrarDropdownModulos();
      Router.navigate(opt.dataset.navDd);
    });
  });
}

function cerrarDropdownModulos() {
  const panel = document.getElementById('module-dropdown-panel');
  if (panel) panel.style.display = 'none';
  _dropdownAbierto = null;
}

document.addEventListener('click', () => cerrarDropdownModulos());

function sincronizarModuloActivo(vistaActual) {
  if (VISTA_A_MODULO[vistaActual]) {
    _moduloActivo = VISTA_A_MODULO[vistaActual];
  }
  cerrarDropdownModulos();
  renderBarraModulos();
}

// ============================================================
// DASHBOARD
// ============================================================

const MenuView = {
  title: 'Almacén Fleet — WMS',

  render() {
    return `
      <div class="dashboard-stats" id="dashboard-stats">
        <div class="stat-card"><div class="stat-value stat-loading">…</div><div class="stat-label">Órdenes activas</div></div>
        <div class="stat-card"><div class="stat-value stat-loading">…</div><div class="stat-label">Guías pendientes</div></div>
        <div class="stat-card"><div class="stat-value stat-loading">…</div><div class="stat-label">Pedidos por recibir</div></div>
      </div>

      <p class="section-label">Accesos rápidos</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="nuevo-despacho">
          <span>Nueva orden de picking</span>
          <small>Subir PDF de la guía</small>
        </button>
        <button class="menu-item" data-nav="picking-lista">
          <span>Órdenes de picking</span>
          <small>Ver pendientes y en proceso</small>
        </button>
        <button class="menu-item" data-nav="consulta">
          <span>Consultar stock</span>
          <small>Buscar por SKU, serie, paleta</small>
        </button>
        <button class="menu-item" data-nav="recepcion">
          <span>Recepción</span>
          <small>Registrar ingreso de mercadería</small>
        </button>
      </div>
    `;
  },

  async afterRender() {
    renderBarraModulos();
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate(btn.dataset.nav));
    });
    this.cargarEstadisticas();
  },

  async cargarEstadisticas() {
    try {
      // Cargamos en paralelo — cada promesa tiene su propio try/catch
      const [despachos, guiasPendientes, recepciones] = await Promise.all([
        obtenerTodosLosDespachos({}).catch(() => []),
        obtenerGuiasPendientes({ estado: 'PENDIENTE' }).catch(() => []),
        obtenerRecepcionesPendientes().catch(() => [])
      ]);

      // Órdenes activas = PENDIENTE + EN_PROCESO (no despachadas ni solo pickeadas)
      const activas = despachos.filter(d => {
        const estado = calcularEstadoVisual(d);
        return estado === 'PENDIENTE' || estado === 'EN_PROCESO';
      }).length;

      const cont = document.getElementById('dashboard-stats');
      if (!cont) return;

      cont.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${activas}</div>
          <div class="stat-label">Órdenes activas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${guiasPendientes.length}</div>
          <div class="stat-label">Guías pendientes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${recepciones.length}</div>
          <div class="stat-label">Pedidos por recibir</div>
        </div>
      `;
    } catch (err) {
      console.error('Error cargarEstadisticas:', err);
      const cont = document.getElementById('dashboard-stats');
      if (cont) {
        cont.innerHTML = `
          <div class="stat-card"><div class="stat-value">-</div><div class="stat-label">Órdenes activas</div></div>
          <div class="stat-card"><div class="stat-value">-</div><div class="stat-label">Guías pendientes</div></div>
          <div class="stat-card"><div class="stat-value">-</div><div class="stat-label">Pedidos por recibir</div></div>
        `;
      }
    }
  }
};

Router.register('menu', MenuView);
