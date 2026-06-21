// ============================================================
// VISTA: MENU PRINCIPAL + BARRA DE MODULOS
// La barra de modulos (horizontal, arriba) es persistente en
// toda la app, no solo en esta vista. Esta vista solo muestra
// las opciones (submodulos) del modulo activo.
// ============================================================
 
const MODULOS = [
  {
    id: 'recepcion-mod',
    label: 'Recepción',
    icono: '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    submodulos: [
      { nav: 'recepcion', label: 'Recepción', desc: 'Subir Excel del cliente o registrar ingreso manual' }
    ]
  },
  {
    id: 'crear-mod',
    label: 'Crear picking',
    icono: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
    submodulos: [
      { nav: 'nuevo-despacho', label: 'Nueva orden de picking', desc: 'Subir PDF de la guía o cargar Excel masivo' },
      { nav: 'guias-pendientes', label: 'Guías pendientes', desc: 'Resolver guías cargadas por Excel' }
    ]
  },
  {
    id: 'picking-mod',
    label: 'Picking',
    icono: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>',
    submodulos: [
      { nav: 'picking-lista', label: 'Órdenes de picking', desc: 'Pendientes, en proceso, pickeadas y despachadas' },
      { nav: 'despachos-salidas', label: 'Despachos y salidas', desc: 'Confirmar la salida real del almacén' }
    ]
  },
  {
    id: 'almacen-mod',
    label: 'Almacén',
    icono: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    submodulos: [
      { nav: 'movimientos', label: 'Movimientos', desc: 'Cambiar ubicación de un ítem o paleta' },
      { nav: 'ubicaciones', label: 'Ubicaciones', desc: 'Ver usadas/vacías y crear nuevas ubicaciones' }
    ]
  },
  {
    id: 'consultas-mod',
    label: 'Consultas',
    icono: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    submodulos: [
      { nav: 'consulta', label: 'Consultar stock', desc: 'Buscar por SKU, serie, paleta o ubicación' }
    ]
  },
  {
    id: 'reportes-mod',
    label: 'Reportes',
    icono: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    submodulos: [
      { nav: 'kardex', label: 'Kardex', desc: 'Historial de movimientos por SKU' },
      { nav: 'registro-despachos', label: 'Registro de despachos', desc: 'Historial de guías y exportar a Excel' }
    ]
  }
];
 
// Mapa inverso: dado un nombre de vista, encuentra a que modulo pertenece
const VISTA_A_MODULO = {};
MODULOS.forEach(m => m.submodulos.forEach(s => { VISTA_A_MODULO[s.nav] = m.id; }));
// Nota: 'menu' NO se mapea a un modulo fijo aqui, porque eso
// sobrescribia la seleccion real del usuario cada vez que la
// vista 'menu' se volvia a renderizar (bug confirmado).
 
let _moduloActivo = MODULOS[0].id;
 
let _dropdownAbierto = null;
 
function renderBarraModulos() {
  const nav = document.getElementById('module-nav');
  if (!nav) return;
 
  nav.innerHTML = MODULOS.map(m => `
    <button class="module-item ${m.id === _moduloActivo ? 'active' : ''}" data-modulo="${m.id}">
      ${m.icono}<span>${m.label}</span>
    </button>
  `).join('') + `<div id="module-dropdown-panel" class="module-dropdown-panel" style="display:none;"></div>`;
 
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
  const navRect = document.getElementById('module-nav').getBoundingClientRect();
  const btnRect = btnRef.getBoundingClientRect();
 
  panel.innerHTML = modulo.submodulos.map(s => `
    <button class="dropdown-option" data-nav-dd="${s.nav}">
      <span class="dropdown-option-label">${escapeHtml(s.label)}</span>
      <span class="dropdown-option-desc">${escapeHtml(s.desc)}</span>
    </button>
  `).join('');
 
  panel.style.left = (btnRect.left - navRect.left) + 'px';
  panel.style.display = 'block';
  _dropdownAbierto = moduloId;
 
  _moduloActivo = moduloId;
  document.querySelectorAll('.module-item').forEach(b => b.classList.remove('active'));
  btnRef.classList.add('active');
 
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
 
// Llamar esto desde cualquier vista al navegar, para que la barra
// resalte el modulo correcto aunque no se haya pasado por "menu"
function sincronizarModuloActivo(vistaActual) {
  if (VISTA_A_MODULO[vistaActual]) {
    _moduloActivo = VISTA_A_MODULO[vistaActual];
  }
  cerrarDropdownModulos();
  renderBarraModulos();
}
 
const MenuView = {
  title: 'Almacén Fleet — WMS',
 
  render() {
    const modulo = MODULOS.find(m => m.id === _moduloActivo) || MODULOS[0];
 
    return `
      <div class="menu-grid">
        ${modulo.submodulos.map(s => `
          <button class="menu-item" data-nav="${s.nav}">
            <span>${escapeHtml(s.label)}</span>
            <small>${escapeHtml(s.desc)}</small>
          </button>
        `).join('')}
      </div>
    `;
  },
 
  afterRender() {
    renderBarraModulos();
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate(btn.dataset.nav));
    });
  }
};
 
Router.register('menu', MenuView);
 
