// ============================================================
// VISTA: KARDEX / HISTORIAL
// ============================================================

const KardexView = {
  title: 'Kardex',
  _searchTimeout: null,

  render() {
    return `
      <div class="search-bar">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="kx-buscador" type="text" placeholder="Filtrar por SKU" autocomplete="off" />
      </div>
      <p class="result-count" id="kx-contador">Cargando...</p>
      <div id="kx-resultados"></div>
    `;
  },

  afterRender() {
    const buscador = document.getElementById('kx-buscador');
    buscador.addEventListener('input', () => {
      clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(() => this.cargar(), 300);
    });
    this.cargar();
  },

  async cargar() {
    const texto = document.getElementById('kx-buscador').value.trim();
    const cont = document.getElementById('kx-resultados');
    const contador = document.getElementById('kx-contador');

    cont.innerHTML = '<div class="loading">Cargando...</div>';

    const data = await obtenerKardex({ sku: texto, limit: 50 });

    contador.textContent = `${data.length} movimiento${data.length === 1 ? '' : 's'} recientes`;

    if (data.length === 0) {
      cont.innerHTML = '<div class="empty-state">Sin movimientos registrados.</div>';
      return;
    }

    cont.innerHTML = '<div style="display:flex; flex-direction:column; gap:8px;">' +
      data.map(mov => this.renderMov(mov)).join('') +
      '</div>';
  },

  renderMov(mov) {
    const tipoConfig = {
      'INGRESO': { label: 'Ingreso', clase: 'pill-success' },
      'SALIDA': { label: 'Salida', clase: 'pill-danger' },
      'MOVIMIENTO_UBICACION': { label: 'Movimiento', clase: 'pill-warning' },
      'AJUSTE': { label: 'Ajuste', clase: 'pill-neutral' }
    };
    const conf = tipoConfig[mov.tipo_movimiento] || { label: mov.tipo_movimiento, clase: 'pill-neutral' };

    const fecha = mov.fecha ? new Date(mov.fecha) : null;
    const fechaStr = fecha ? fecha.toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-';

    let detalle = '';
    if (mov.tipo_movimiento === 'MOVIMIENTO_UBICACION') {
      detalle = `${escapeHtml(mov.ubicacion_origen || 'sin ubicación')} → ${escapeHtml(mov.ubicacion_destino || '-')}`;
    } else if (mov.referencia) {
      detalle = `Ref: ${escapeHtml(mov.referencia)}`;
    } else if (mov.observaciones) {
      detalle = escapeHtml(mov.observaciones);
    }

    return `
      <div class="stock-card" style="cursor:default;">
        <div class="stock-card-top">
          <p class="stock-sku">${escapeHtml(mov.sku)}</p>
          <span class="pill ${conf.clase}">${conf.label}</span>
        </div>
        <div class="stock-meta">
          <span><span class="meta-label">Cant:</span> <b>${formatNum(mov.cantidad)}</b></span>
          <span><span class="meta-label">Fecha:</span> <b>${fechaStr}</b></span>
        </div>
        ${detalle ? `<p style="font-size:12px; color:var(--text-secondary); margin:6px 0 0;">${detalle}</p>` : ''}
      </div>
    `;
  }
};

Router.register('kardex', KardexView);
