// ============================================================
// MENÚ PRINCIPAL + BARRA DE NAVEGACIÓN
// ============================================================

const MODULOS = [
  {
    id: 'mod-picking',
    label: 'Picking',
    icono: '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M3 8h18M5 8v12a1 1 0 001 1h12a1 1 0 001-1V8"/><line x1="10" y1="12" x2="14" y2="12"/><line x1="12" y1="10" x2="12" y2="14"/></svg>',
    subs: [
      { nav: 'nuevo-despacho',   label: 'Nueva orden de picking' },
      { nav: 'picking-lista',    label: 'Órdenes pendientes' },
      { nav: 'despachos-salidas',label: 'Despachos y salidas' },
    ]
  },
  {
    id: 'mod-almacen',
    label: 'Almacén',
    icono: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    subs: [
      { nav: 'recepcion',   label: 'Recepción' },
      { nav: 'movimientos', label: 'Movimientos' },
      { nav: 'ubicaciones', label: 'Ubicaciones' },
    ]
  },
  {
    id: 'mod-consulta',
    label: 'Consultas',
    icono: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    subs: [
      { nav: 'consulta', label: 'Consultar stock' },
    ]
  },
  {
    id: 'mod-reportes',
    label: 'Reportes',
    icono: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    subs: [
      { nav: 'kardex',              label: 'Kardex' },
      { nav: 'registro-despachos',  label: 'Registro de despachos' },
    ]
  },
];

const _navMap = {};
MODULOS.forEach(m => m.subs.forEach(s => { _navMap[s.nav] = m.id; }));
let _moduloActivo = null;
let _dropdownAbierto = null;

function renderBarraModulos() {
  const nav = document.getElementById('module-nav');
  if (!nav) return;
  nav.innerHTML = MODULOS.map(m => `
    <button class="module-item ${_moduloActivo === m.id ? 'active' : ''}" data-mod="${m.id}">
      ${m.icono}<span>${m.label}</span>
    </button>
  `).join('');

  nav.querySelectorAll('[data-mod]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.mod;
      if (_dropdownAbierto === id) { cerrarDropdown(); return; }
      abrirDropdown(id, btn);
    });
  });
}

function abrirDropdown(modId, btnRef) {
  const mod = MODULOS.find(m => m.id === modId);
  if (!mod) return;
  const panel = document.getElementById('module-dropdown-panel');
  const r = btnRef.getBoundingClientRect();
  panel.innerHTML = mod.subs.map(s =>
    `<button class="dropdown-option" data-nav-dd="${s.nav}">${escapeHtml(s.label)}</button>`
  ).join('');
  panel.style.left = Math.min(r.left, window.innerWidth - 210) + 'px';
  panel.style.top = r.bottom + 'px';
  panel.style.display = 'block';
  _dropdownAbierto = modId;
  _moduloActivo = modId;
  renderBarraModulos();

  panel.querySelectorAll('[data-nav-dd]').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      cerrarDropdown();
      Router.navigate(opt.dataset.navDd);
    });
  });
}

function cerrarDropdown() {
  const p = document.getElementById('module-dropdown-panel');
  if (p) p.style.display = 'none';
  _dropdownAbierto = null;
}

document.addEventListener('click', cerrarDropdown);

function sincronizarModuloActivo(vista) {
  if (_navMap[vista]) _moduloActivo = _navMap[vista];
  cerrarDropdown();
  renderBarraModulos();
}

// ============================================================
// DASHBOARD
// ============================================================
const MenuView = {
  title: 'Fleet WMS',

  render() {
    return `
      <div id="dash-stats" class="dashboard-stats">
        ${['Órdenes activas','Guías pendientes','Por recibir'].map(l => `
          <div class="stat-card">
            <div class="stat-value stat-loading">…</div>
            <div class="stat-label">${l}</div>
          </div>
        `).join('')}
      </div>
      <p class="section-label">Accesos rápidos</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="nuevo-despacho">
          <span>Nueva orden</span><small>Importar Excel o manual</small>
        </button>
        <button class="menu-item" data-nav="picking-lista">
          <span>Órdenes de picking</span><small>Ver pendientes y en proceso</small>
        </button>
        <button class="menu-item" data-nav="consulta">
          <span>Consultar stock</span><small>SKU, serie, paleta, ubicación</small>
        </button>
        <button class="menu-item" data-nav="recepcion">
          <span>Recepción</span><small>Registrar ingreso</small>
        </button>
        <button class="menu-item" data-nav="movimientos">
          <span>Movimientos</span><small>Mover ítem o paleta</small>
        </button>
        <button class="menu-item" data-nav="despachos-salidas">
          <span>Despachos</span><small>Confirmar salida</small>
        </button>
      </div>
    `;
  },

  afterRender() {
    renderBarraModulos();
    document.querySelectorAll('[data-nav]').forEach(btn =>
      btn.addEventListener('click', () => Router.navigate(btn.dataset.nav))
    );
    this._cargarStats();
  },

  async _cargarStats() {
    try {
      const [despachos, guias, recepciones] = await Promise.all([
        obtenerTodosLosDespachos({}).catch(() => []),
        obtenerGuiasPendientes({ estado: 'PENDIENTE' }).catch(() => []),
        obtenerRecepcionesPendientes().catch(() => []),
      ]);

      const activas = despachos.filter(d => {
        const est = calcularEstadoVisual(d);
        return est === 'PENDIENTE' || est === 'EN_PROCESO';
      }).length;

      const cont = document.getElementById('dash-stats');
      if (!cont) return;
      const vals = [activas, guias.length, recepciones.length];
      const labels = ['Órdenes activas','Guías pendientes','Por recibir'];
      cont.innerHTML = vals.map((v, i) => `
        <div class="stat-card">
          <div class="stat-value">${v}</div>
          <div class="stat-label">${labels[i]}</div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Dashboard stats error:', e);
    }
  }
};

Router.register('menu', MenuView);
