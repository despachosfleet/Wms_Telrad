const MenuMobileView = {
  title: 'Inicio',

  render() {
    const esAdmin = Auth.esAdmin();
    const modulos = [
      { nav:'picking-lista',    icon:'picking',    label:'Órdenes'     },
      { nav:'recepcion',        icon:'recepcion',  label:'Recepción'   },
      { nav:'consulta',         icon:'consulta',   label:'Consultar'   },
      { nav:'movimientos',      icon:'mover',      label:'Movimientos' },
      { nav:'despachos-salidas',icon:'despacho',   label:'Despachos'   },
      ...(esAdmin ? [
        { nav:'kardex',             icon:'kardex',   label:'Kardex'    },
        { nav:'registro-despachos', icon:'registro', label:'Registros' },
        { nav:'admin',              icon:'admin',    label:'Admin'     },
      ] : []),
    ];

    const iconSVG = {
      picking:   `<svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="36" rx="3" stroke-width="2.5" fill="none"/><line x1="15" y1="18" x2="33" y2="18" stroke-width="2.5"/><line x1="15" y1="25" x2="33" y2="25" stroke-width="2.5"/><line x1="15" y1="32" x2="25" y2="32" stroke-width="2.5"/><circle cx="37" cy="37" r="8" fill="var(--accent)" stroke="none"/><polyline points="33,37 36,40 41,34" stroke="white" stroke-width="2" fill="none"/></svg>`,
      recepcion: `<svg viewBox="0 0 48 48"><rect x="8" y="12" width="32" height="28" rx="3" stroke-width="2.5" fill="none"/><polyline points="18,12 18,6 30,6 30,12" stroke-width="2.5" fill="none"/><polyline points="19,26 24,31 29,26" stroke-width="2.5" fill="none"/><line x1="24" y1="20" x2="24" y2="31" stroke-width="2.5"/></svg>`,
      consulta:  `<svg viewBox="0 0 48 48"><circle cx="22" cy="22" r="13" stroke-width="2.5" fill="none"/><line x1="31" y1="31" x2="42" y2="42" stroke-width="3" stroke-linecap="round"/></svg>`,
      mover:     `<svg viewBox="0 0 48 48"><rect x="6" y="14" width="16" height="16" rx="2" stroke-width="2.5" fill="none"/><rect x="26" y="18" width="16" height="16" rx="2" stroke-width="2.5" fill="none"/><polyline points="26,10 34,6 34,14" stroke-width="2.5" fill="none"/><line x1="20" y1="22" x2="28" y2="22" stroke-width="2.5" stroke-dasharray="3,2"/></svg>`,
      despacho:  `<svg viewBox="0 0 48 48"><rect x="4" y="16" width="30" height="22" rx="2" stroke-width="2.5" fill="none"/><polyline points="34,20 44,26 34,32" stroke-width="2.5" fill="none"/><line x1="44" y1="26" x2="18" y2="26" stroke-width="2.5"/><line x1="10" y1="10" x2="30" y2="10" stroke-width="2.5"/></svg>`,
      kardex:    `<svg viewBox="0 0 48 48"><polyline points="8,36 18,24 26,30 36,14 44,18" stroke-width="2.5" fill="none"/><circle cx="18" cy="24" r="2.5" fill="var(--accent)"/><circle cx="26" cy="30" r="2.5" fill="var(--accent)"/><circle cx="36" cy="14" r="2.5" fill="var(--accent)"/></svg>`,
      registro:  `<svg viewBox="0 0 48 48"><rect x="10" y="6" width="28" height="36" rx="3" stroke-width="2.5" fill="none"/><polyline points="18,6 18,2 30,2 30,6" stroke-width="2.5" fill="none"/><line x1="17" y1="20" x2="31" y2="20" stroke-width="2.5"/><line x1="17" y1="27" x2="31" y2="27" stroke-width="2.5"/><polyline points="17,34 21,34" stroke-width="2.5"/><polyline points="23,34 31,34" stroke-width="2.5"/></svg>`,
      admin:     `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="5" stroke-width="2.5" fill="none"/><path d="M24 8v4M24 36v4M8 24h4M36 24h4M12.7 12.7l2.8 2.8M32.5 32.5l2.8 2.8M35.3 12.7l-2.8 2.8M15.5 32.5l-2.8 2.8" stroke-width="2.5"/></svg>`,
    };

    return `
      <div class="mpm-wrap">

        <!-- Header -->
        <div class="mpm-header">
          <div class="mpm-logo">
            <span class="mpm-logo-w">W</span><span class="mpm-logo-m">M</span><span class="mpm-logo-s">S</span>
            <span class="mpm-logo-tag">FLEET</span>
          </div>
          <button class="mpm-salir" onclick="Auth.logout()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Salir
          </button>
        </div>

        <!-- Saludo -->
        <div class="mpm-saludo" id="mpm-saludo">
          Hola, <strong>${escapeHtml((Auth.nombre()||Auth.email()).split('@')[0].split(' ')[0])}</strong> 👋
        </div>

        <!-- Dashboard -->
        <div class="mpm-dash" id="mobile-dash">
          <div class="mpm-dash-item"><div class="mpm-dash-n mpm-n-warn">…</div><div class="mpm-dash-l">Pendientes</div></div>
          <div class="mpm-dash-sep"></div>
          <div class="mpm-dash-item"><div class="mpm-dash-n mpm-n-blue">…</div><div class="mpm-dash-l">En proceso</div></div>
          <div class="mpm-dash-sep"></div>
          <div class="mpm-dash-item"><div class="mpm-dash-n mpm-n-green">…</div><div class="mpm-dash-l">Pickeados</div></div>
        </div>

        <!-- Grid de módulos -->
        <div class="mpm-grid">
          ${modulos.map(m=>`
            <button class="mpm-card" data-nav="${m.nav}">
              <div class="mpm-card-icon">${iconSVG[m.icon]||'📦'}</div>
              <div class="mpm-card-label">${m.label}</div>
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
    // Saludo desaparece en 4s
    setTimeout(()=>{
      const s=document.getElementById('mpm-saludo');
      if(s){ s.style.transition='opacity .6s, max-height .6s'; s.style.opacity='0'; s.style.maxHeight='0'; s.style.overflow='hidden'; s.style.marginBottom='0'; }
    }, 4000);
  },

  async _cargarDash() {
    try {
      const despachos = await obtenerTodosLosDespachos({});
      const c = {PENDIENTE:0,EN_PROCESO:0,PICKEADO:0};
      despachos.filter(d=>d.status!=='BORRADOR').forEach(d=>{const e=calcularEstadoVisual(d);if(c[e]!==undefined)c[e]++;});
      const dash = document.getElementById('mobile-dash');
      if (!dash) return;
      dash.innerHTML = `
        <div class="mpm-dash-item"><div class="mpm-dash-n mpm-n-warn">${c.PENDIENTE}</div><div class="mpm-dash-l">Pendientes</div></div>
        <div class="mpm-dash-sep"></div>
        <div class="mpm-dash-item"><div class="mpm-dash-n mpm-n-blue">${c.EN_PROCESO}</div><div class="mpm-dash-l">En proceso</div></div>
        <div class="mpm-dash-sep"></div>
        <div class="mpm-dash-item"><div class="mpm-dash-n mpm-n-green">${c.PICKEADO}</div><div class="mpm-dash-l">Pickeados</div></div>
      `;
    } catch(e){}
  }
};
Router.register('menu-mobile', MenuMobileView);
