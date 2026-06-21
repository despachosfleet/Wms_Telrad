// ============================================================
// VISTA: KARDEX / HISTORIAL (tabla)
// ============================================================

const KardexView = {
  title: 'Kardex',

  render() {
    return `
      <div class="card">
        <p class="card-title">Filtros</p>
        <div class="field-grid">
          <div class="field">
            <label>SKU</label>
            <input type="text" id="kx-sku" placeholder="" />
          </div>
          <div class="field">
            <label>Tipo de movimiento</label>
            <select id="kx-tipo">
              <option value="">Todos</option>
              <option value="INGRESO">Ingreso</option>
              <option value="SALIDA">Salida</option>
              <option value="MOVIMIENTO_UBICACION">Movimiento de ubicación</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>
        </div>
        <div style="display:flex; gap:6px; margin-top:10px;">
          <button class="btn-primary" id="kx-btn-buscar" style="width:auto;">Buscar</button>
        </div>
      </div>

      <p class="result-count" id="kx-contador">Cargando movimientos recientes...</p>
      <div id="kx-resultados"></div>
    `;
  },

  afterRender() {
    document.getElementById('kx-btn-buscar').addEventListener('click', () => this.cargar());
    document.getElementById('kx-sku').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.cargar();
    });
    this.cargar();
  },

  async cargar() {
    const texto = document.getElementById('kx-sku').value.trim();
    const tipo = document.getElementById('kx-tipo').value;
    const cont = document.getElementById('kx-resultados');
    const contador = document.getElementById('kx-contador');

    cont.innerHTML = '<div class="loading">Cargando...</div>';

    let data = await obtenerKardex({ sku: texto, limit: 100 });
    if (tipo) data = data.filter(m => m.tipo_movimiento === tipo);

    contador.textContent = `${data.length} movimiento${data.length === 1 ? '' : 's'}`;

    if (data.length === 0) {
      cont.innerHTML = '<div class="empty-state">Sin movimientos registrados.</div>';
      return;
    }

    const tipoConfig = {
      'INGRESO': { label: 'Ingreso', clase: 'pill-success' },
      'SALIDA': { label: 'Salida', clase: 'pill-danger' },
      'MOVIMIENTO_UBICACION': { label: 'Movimiento', clase: 'pill-warning' },
      'AJUSTE': { label: 'Ajuste', clase: 'pill-neutral' }
    };

    let html = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Fecha</th><th>SKU</th><th>Tipo</th><th>Cant.</th><th>Detalle</th>
          </tr></thead>
          <tbody>
    `;

    data.forEach(mov => {
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
      } else {
        detalle = '-';
      }

      html += `
        <tr>
          <td>${fechaStr}</td>
          <td class="sku-cell">${escapeHtml(mov.sku)}</td>
          <td><span class="pill ${conf.clase}">${conf.label}</span></td>
          <td class="num-cell">${formatNum(mov.cantidad)}</td>
          <td class="wrap">${detalle}</td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    cont.innerHTML = html;
  }
};

Router.register('kardex', KardexView);
