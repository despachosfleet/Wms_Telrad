// ============================================================
// MENÚ + BARRA DE NAVEGACIÓN
// Módulos: Picking | Almacén | Consultas | Reportes | Admin
// ============================================================

const MODULOS = [
  {
    id: 'mod-picking', label: 'Picking',
    icono: '<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>',
    subs: [
      { nav: 'nuevo-despacho',    label: 'Nueva orden de picking',  desc: 'Importar Excel de cadena' },
      { nav: 'validar-ordenes',   label: 'Validar órdenes',         desc: 'Revisar y aprobar antes de pickear' },
      { nav: 'picking-lista',     label: 'Órdenes de picking',      desc: 'Pendientes y en proceso' },
      { nav: 'despachos-salidas', label: 'Despachos y salidas',     desc: 'Confirmar salida del almacén' },
    ]
  },
  {
    id: 'mod-almacen', label: 'Almacén',
    icono: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    subs: [
      { nav: 'recepcion',   label: 'Recepción',   desc: 'Subir Excel de ingresos' },
      { nav: 'movimientos', label: 'Movimientos', desc: 'Mover ítems o paletas' },
      { nav: 'ubicaciones', label: 'Ubicaciones', desc: 'Ver y gestionar posiciones' },
    ]
  },
  {
    id: 'mod-consultas', label: 'Consultas',
    icono: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    subs: [
      { nav: 'consulta', label: 'Consultar stock', desc: 'Buscar por SKU, serie, paleta, ubicación' },
    ]
  },
  {
    id: 'mod-reportes', label: 'Reportes',
    icono: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    subs: [
      { nav: 'kardex',             label: 'Kardex',              desc: 'Historial de movimientos' },
      { nav: 'registro-despachos', label: 'Registro despachos',  desc: 'Historial y exportar' },
    ]
  },
  {
    id: 'mod-admin', label: 'Admin',
    icono: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M12 14c-5 0-8 2-8 3v1h16v-1c0-1-3-3-8-3z"/><path d="M18 8l2 2-6 6-3-3 1.5-1.5L13 13l4-4-1-1z"/></svg>',
    subs: [
      { nav: 'admin', label: 'Administración', desc: 'Editar, revertir, regularizar stock' },
    ]
  },
];

const _navMap = {};
MODULOS.forEach(m => m.subs.forEach(s => { _navMap[s.nav] = m.id; }));
let _moduloActivo = null;
let _dropdownAbierto = null;

function renderBarraModulos() {
  if (window.innerWidth < 640) return; // nunca en móvil
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
  panel.innerHTML = mod.subs.map(s => `
    <button class="dropdown-option" data-nav-dd="${s.nav}">
      <div style="font-weight:700;">${escapeHtml(s.label)}</div>
      <div style="font-size:11px; color:var(--text-tertiary); margin-top:1px;">${escapeHtml(s.desc)}</div>
    </button>
  `).join('');
  panel.style.left = Math.min(r.left, window.innerWidth - 220) + 'px';
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
  if (window.innerWidth < 640) return;
  if (_navMap[vista]) _moduloActivo = _navMap[vista];
  cerrarDropdown();
  renderBarraModulos();
}

// ============================================================
// DASHBOARD
// ============================================================
const MenuView = {
  title: 'Fleet WMS — Telrad',

  render() {
    return `
      <!-- Stats de órdenes -->
      <div id="dash-stats" class="dashboard-stats">
        ${['Órdenes activas','Por validar','Por recibir','Alertas stock'].map(l => `
          <div class="stat-card">
            <div class="stat-value stat-loading">…</div>
            <div class="stat-label">${l}</div>
          </div>
        `).join('')}
      </div>

      <!-- Stock por origen -->
      <p class="section-label">Stock disponible</p>
      <div id="dash-stock" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
        <div class="stat-card" style="grid-column:1/-1;">
          <div class="stat-value stat-loading" style="font-size:14px;">Cargando…</div>
        </div>
      </div>

      <p class="section-label">Accesos rápidos</p>
      <div class="menu-grid">
        <button class="menu-item" data-nav="nuevo-despacho">
          <div class="mi-icon">📋</div>
          <span>Nueva orden</span><small>Importar Excel de cadena</small>
        </button>
        <button class="menu-item" data-nav="validar-ordenes">
          <div class="mi-icon">✅</div>
          <span>Validar órdenes</span><small>Revisar antes de pickear</small>
        </button>
        <button class="menu-item" data-nav="picking-lista">
          <div class="mi-icon">📦</div>
          <span>Picking</span><small>Órdenes pendientes</small>
        </button>
        <button class="menu-item" data-nav="consulta">
          <div class="mi-icon">🔍</div>
          <span>Consultar stock</span><small>SKU, serie, paleta</small>
        </button>
        <button class="menu-item" data-nav="recepcion">
          <div class="mi-icon">📥</div>
          <span>Recepción</span><small>Registrar ingresos</small>
        </button>
        <button class="menu-item" data-nav="movimientos">
          <div class="mi-icon">🔄</div>
          <span>Movimientos</span><small>Mover ítems o paletas</small>
        </button>
        <button class="menu-item" data-nav="despachos-salidas">
          <div class="mi-icon">🚛</div>
          <span>Despachos</span><small>Confirmar salida</small>
        </button>
        <button class="menu-item" data-nav="admin">
          <div class="mi-icon">⚙️</div>
          <span>Administración</span><small>Editar, revertir, limpiar</small>
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
      const [despachos, borradores, resumenStock] = await Promise.all([
        obtenerTodosLosDespachos({}).catch(() => []),
        obtenerOrdenesBorrador().catch(() => []),
        obtenerResumenStock().catch(() => null),
      ]);

      // Stats de órdenes
      const activas = despachos.filter(d => {
        const e = calcularEstadoVisual(d);
        return e === 'PENDIENTE' || e === 'EN_PROCESO';
      }).length;
      const statsCont = document.getElementById('dash-stats');
      if (statsCont) {
        const vals   = [activas, borradores.length, 0, 0];
        const labels = ['Órdenes activas','Por validar','Por recibir','Alertas stock'];
        statsCont.innerHTML = vals.map((v, i) => `
          <div class="stat-card">
            <div class="stat-value">${v}</div>
            <div class="stat-label">${labels[i]}</div>
          </div>
        `).join('');
      }

      // Stock por origen y cliente
      const stockCont = document.getElementById('dash-stock');
      if (stockCont && resumenStock) {
        const m  = resumenStock.mudanza;
        const in_ = resumenStock.ingresoNuevo;
        stockCont.innerHTML = `
          <!-- Mudanza -->
          <div class="card" style="margin:0; padding:12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary);">Mudanza</span>
              <span class="pill pill-info" style="font-size:11px;">${m.total} ítems</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              ${[['ENTEL',m.entel],['CLARO',m.claro],['TELRAD',m.telrad]].map(([c,n])=>`
                <div style="display:flex; justify-content:space-between; font-size:12px;">
                  <span style="color:var(--text-secondary);">${c}</span>
                  <strong>${n}</strong>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Ingreso nuevo -->
          <div class="card" style="margin:0; padding:12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary);">Ingreso nuevo</span>
              <span class="pill pill-success" style="font-size:11px;">${in_.total} ítems</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              ${[['ENTEL',in_.entel],['CLARO',in_.claro],['TELRAD',in_.telrad]].map(([c,n])=>`
                <div style="display:flex; justify-content:space-between; font-size:12px;">
                  <span style="color:var(--text-secondary);">${c}</span>
                  <strong>${n}</strong>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Totales -->
          <div class="card" style="margin:0; padding:12px; grid-column:1/-1;">
            <div style="display:flex; gap:16px; flex-wrap:wrap; justify-content:space-around; text-align:center;">
              <div>
                <div style="font-size:22px; font-weight:900; color:var(--accent);">${resumenStock.totalDisponible}</div>
                <div style="font-size:11px; color:var(--text-tertiary);">Disponible</div>
              </div>
              <div>
                <div style="font-size:22px; font-weight:900; color:var(--warning);">${resumenStock.totalReservado}</div>
                <div style="font-size:11px; color:var(--text-tertiary);">Reservado</div>
              </div>
              <div>
                <div style="font-size:22px; font-weight:900; color:var(--text);">${resumenStock.totalDisponible + resumenStock.totalReservado}</div>
                <div style="font-size:11px; color:var(--text-tertiary);">Total en almacén</div>
              </div>
            </div>
          </div>
        `;
      }
    } catch(e) { console.error('Dashboard error:', e); }
  }
};

Router.register('menu', MenuView);
