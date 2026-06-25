// ============================================================
// MENÚ MÓVIL — launcher con tarjetas grandes para operario
// ============================================================
const MenuMobileView = {
  title: 'Inicio',

  render() {
    const esAdmin = Auth.esAdmin();
    const modulos = [
      { nav:'picking-lista',   icon:'📋', label:'Órdenes',    desc:'Ver y gestionar órdenes de picking' },
      { nav:'recepcion',       icon:'📥', label:'Recepción',  desc:'Recepcionar mercadería' },
      { nav:'consulta',        icon:'🔍', label:'Consultar',  desc:'Buscar stock por SKU o serie' },
      { nav:'movimientos',     icon:'🔄', label:'Movimientos',desc:'Mover ítems o paletas' },
      { nav:'despachos-salidas',icon:'🚛',label:'Despachos',  desc:'Confirmar salidas del almacén' },
      ...(esAdmin ? [
        { nav:'kardex',          icon:'📊', label:'Kardex',    desc:'Historial de movimientos' },
        { nav:'registro-despachos',icon:'📝',label:'Registros',desc:'Historial de despachos' },
        { nav:'admin',           icon:'⚙️', label:'Admin',     desc:'Administración del sistema' },
      ] : []),
    ];

    return `
      <div class="mobile-menu">
        <!-- Header moderno sin fondo sólido -->
        <div class="mobile-menu-header">
          <div style="display:flex;flex-direction:column;gap:1px;">
            <div class="mobile-menu-brand">▸ Fleet WMS</div>
            <div id="mobile-saludo-wrap" class="mobile-menu-sub">
              ${escapeHtml((Auth.nombre()||Auth.email()).split('@')[0].split(' ')[0])} · ${new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'})}
            </div>
          </div>
          <button class="mobile-menu-logout" onclick="Auth.logout()">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Salir
          </button>
        </div>

        <!-- Dashboard rápido -->
        <div id="mobile-dash" class="mobile-dash">
          <div class="mobile-dash-item loading">
            <div class="mobile-dash-num">…</div>
            <div class="mobile-dash-label">Pendientes</div>
          </div>
          <div class="mobile-dash-item loading">
            <div class="mobile-dash-num">…</div>
            <div class="mobile-dash-label">En proceso</div>
          </div>
          <div class="mobile-dash-item loading">
            <div class="mobile-dash-num">…</div>
            <div class="mobile-dash-label">Pickeados</div>
          </div>
        </div>

        <!-- Tarjetas de módulos -->
        <div class="mobile-grid">
          ${modulos.map(m=>`
            <button class="mobile-card" data-nav="${m.nav}">
              <div class="mobile-card-icon">${m.icon}</div>
              <div class="mobile-card-label">${m.label}</div>
              <div class="mobile-card-desc">${m.desc}</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  afterRender() {
    document.querySelectorAll('[data-nav]').forEach(btn=>{
      btn.addEventListener('click', ()=>Router.navigate(btn.dataset.nav));
    });
    this._cargarDash();
    // Saludo desaparece después de 4 segundos
    setTimeout(() => {
      const wrap = document.getElementById('mobile-saludo-wrap');
      if (wrap) {
        wrap.style.transition = 'opacity .8s';
        wrap.style.opacity = '0';
        setTimeout(() => {
          if(wrap) wrap.style.visibility = 'hidden';
        }, 800);
      }
    }, 4000);
  },

  async _cargarDash() {
    try {
      const despachos = await obtenerTodosLosDespachos({});
      const todos     = despachos.filter(d=>d.status!=='BORRADOR');
      const conts     = {PENDIENTE:0, EN_PROCESO:0, PICKEADO:0};
      todos.forEach(d=>{ const e=calcularEstadoVisual(d); if(conts[e]!==undefined) conts[e]++; });
      const dash = document.getElementById('mobile-dash');
      if (!dash) return;
      dash.innerHTML = [
        {n:conts.PENDIENTE,  l:'Pendientes',  c:'var(--warning)'},
        {n:conts.EN_PROCESO, l:'En proceso',  c:'var(--accent)'},
        {n:conts.PICKEADO,   l:'Pickeados',   c:'var(--success-text)'},
      ].map(s=>`
        <div class="mobile-dash-item">
          <div class="mobile-dash-num" style="color:${s.c};">${s.n}</div>
          <div class="mobile-dash-label">${s.l}</div>
        </div>
      `).join('');
    } catch(e) {}
  }
};
Router.register('menu-mobile', MenuMobileView);
