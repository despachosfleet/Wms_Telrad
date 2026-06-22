// ============================================================
// CONSULTA DE STOCK — Panel de filtros + tabla densa
// ============================================================
const ConsultaView = {
  title: 'Consultar stock',
  _resultados: [],
  _orden: 'sku',
  _dir: 'asc',

  render() {
    return `
      <div class="card">
        <div class="field-grid" style="margin-bottom:8px;">
          <div class="field"><label>SKU / Código</label><input id="f-sku" type="text" autocomplete="off"></div>
          <div class="field"><label>Serie</label><input id="f-serie" type="text" autocomplete="off" style="font-family:monospace;"></div>
        </div>
        <div class="field-grid" style="margin-bottom:8px;">
          <div class="field"><label>Pedido / Paleta</label><input id="f-paleta" type="text" autocomplete="off"></div>
          <div class="field"><label>Ubicación</label><input id="f-ubic" type="text" autocomplete="off"></div>
        </div>
        <div class="field-grid" style="margin-bottom:12px;">
          <div class="field"><label>Cliente</label>
            <select id="f-cliente">
              <option value="">Todos</option>
              <option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
            </select>
          </div>
          <div class="field"><label>Estado</label>
            <select id="f-estado">
              <option value="">Todos</option>
              <option>DISPONIBLE</option><option>DESPACHADO</option><option>RESERVADO</option>
            </select>
          </div>
        </div>
        <button class="btn-primary" id="btn-buscar" style="width:100%;">Buscar</button>
      </div>
      <div id="cont-resultado"></div>
    `;
  },

  afterRender() {
    document.getElementById('btn-buscar').addEventListener('click', () => this._buscar());
    // Buscar al presionar Enter en cualquier campo
    ['f-sku','f-serie','f-paleta','f-ubic'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') this._buscar();
      });
    });
  },

  async _buscar() {
    const btn = document.getElementById('btn-buscar');
    const cont = document.getElementById('cont-resultado');
    btn.disabled = true; btn.textContent = 'Buscando…';
    cont.innerHTML = '';

    const params = {
      sku: document.getElementById('f-sku').value.trim(),
      serie: document.getElementById('f-serie').value.trim(),
      paleta: document.getElementById('f-paleta').value.trim(),
      ubic: document.getElementById('f-ubic').value.trim(),
      cliente: document.getElementById('f-cliente').value,
      estado: document.getElementById('f-estado').value,
      orden: this._orden, dir: this._dir, limit: 200
    };

    this._resultados = await buscarStockAvanzado(params);
    btn.disabled = false; btn.textContent = 'Buscar';
    this._renderTabla();
  },

  _renderTabla() {
    const cont = document.getElementById('cont-resultado');
    const r = this._resultados;

    if (!r.length) {
      cont.innerHTML = `<div class="empty-state"><strong>Sin resultados</strong>Prueba con otros filtros.</div>`;
      return;
    }

    const thBtn = (campo, label) => {
      const activo = this._orden === campo;
      const ico = activo ? (this._dir === 'asc' ? ' ↑' : ' ↓') : '';
      return `<th style="cursor:pointer;" data-col="${campo}">${label}${ico}</th>`;
    };

    cont.innerHTML = `
      <p style="font-size:11px; color:var(--text-tertiary); margin-bottom:6px;">${r.length} resultado${r.length !== 1 ? 's' : ''}</p>
      <div class="table-wrap">
        <table class="data-table" id="tabla-stock">
          <thead><tr>
            ${thBtn('sku','SKU')}
            ${thBtn('descripcion','Descripción')}
            ${thBtn('cantidad','Cant.')}
            ${thBtn('serie','Serie')}
            ${thBtn('paleta_pedido','Pedido/Paleta')}
            ${thBtn('ubicacion_fisica','Ubicación')}
            ${thBtn('cliente','Cliente')}
            ${thBtn('estado','Estado')}
          </tr></thead>
          <tbody>
            ${r.map(row => `
              <tr>
                <td class="sku-cell">${escapeHtml(row.sku || '-')}</td>
                <td class="wrap">${escapeHtml(row.descripcion || '-')}</td>
                <td>${formatNum(row.cantidad)}</td>
                <td style="font-family:monospace; font-size:11px;">${escapeHtml(row.serie || '-')}</td>
                <td>${escapeHtml(row.paleta_pedido || '-')}</td>
                <td>${escapeHtml(row.ubicacion_fisica || '-')}</td>
                <td>${escapeHtml(row.cliente || '-')}</td>
                <td>${row.estado === 'DISPONIBLE'
                  ? '<span class="pill pill-success">Disponible</span>'
                  : row.estado === 'RESERVADO'
                  ? '<span class="pill pill-warning">Reservado</span>'
                  : '<span class="pill pill-neutral">'+escapeHtml(row.estado||'-')+'</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (this._orden === col) this._dir = this._dir === 'asc' ? 'desc' : 'asc';
        else { this._orden = col; this._dir = 'asc'; }
        this._resultados = this._ordenar(this._resultados, col, this._dir);
        this._renderTabla();
      });
    });
  },

  _ordenar(arr, col, dir) {
    return [...arr].sort((a, b) => {
      const va = String(a[col] ?? '').toLowerCase();
      const vb = String(b[col] ?? '').toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }
};

Router.register('consulta', ConsultaView);
