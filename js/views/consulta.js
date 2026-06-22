// ============================================================
// VISTA: CONSULTA DE INVENTARIO (panel de filtros + tabla)
// ============================================================

const ConsultaView = {
  title: 'Consulta de inventario',
  _orden: 'id',
  _dir: 'asc',
  _datos: [],

  render() {
    return `
      <div class="card">
        <p class="card-title">Filtros de búsqueda</p>
        <div class="field-grid">
          <div class="field">
            <label>SKU</label>
            <input type="text" id="f-sku" placeholder="" />
          </div>
          <div class="field">
            <label>Serie</label>
            <input type="text" id="f-serie" placeholder="" />
          </div>
          <div class="field">
            <label>Ubicación</label>
            <input type="text" id="f-ubic" placeholder="" />
          </div>
          <div class="field">
            <label>Paleta/Pedido</label>
            <input type="text" id="f-paleta" placeholder="" />
          </div>
          <div class="field">
            <label>Descripción</label>
            <input type="text" id="f-descripcion" placeholder="" />
          </div>
          <div class="field">
            <label>Cliente</label>
            <select id="f-cliente">
              <option value="">Todos</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
              <option value="AMERICATEL">AMERICATEL</option>
            </select>
          </div>
          <div class="field">
            <label>Estado</label>
            <select id="f-estado">
              <option value="">Todos</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="DESPACHADO">Despachado</option>
            </select>
          </div>
        </div>
        <div style="display:flex; gap:6px; margin-top:10px;">
          <button class="btn-primary" id="btn-buscar" style="width:auto;">Buscar</button>
          <button class="btn-secondary" id="btn-limpiar">Limpiar</button>
        </div>
      </div>

      <p class="result-count" id="contador">Ingresa al menos un filtro y presiona Buscar.</p>
      <div id="resultados"></div>
    `;
  },

  afterRender() {
    this._orden = 'id';
    this._dir = 'asc';
    this._datos = [];

    document.getElementById('btn-buscar').addEventListener('click', () => this.buscar());
    document.getElementById('btn-limpiar').addEventListener('click', () => this.limpiar());

    // Enter en cualquier campo de texto dispara la busqueda
    ['f-sku','f-serie','f-ubic','f-paleta','f-descripcion'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.buscar();
      });
    });
  },

  limpiar() {
    ['f-sku','f-serie','f-ubic','f-paleta','f-descripcion'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-cliente').value = '';
    document.getElementById('f-estado').value = '';
    document.getElementById('resultados').innerHTML = '';
    document.getElementById('contador').textContent = 'Ingresa al menos un filtro y presiona Buscar.';
    this._datos = [];
  },

  async buscar() {
    const sku = document.getElementById('f-sku').value.trim();
    const serie = document.getElementById('f-serie').value.trim();
    const ubic = document.getElementById('f-ubic').value.trim();
    const paleta = document.getElementById('f-paleta').value.trim();
    const descripcion = document.getElementById('f-descripcion').value.trim();
    const cliente = document.getElementById('f-cliente').value;
    const estado = document.getElementById('f-estado').value;

    const cont = document.getElementById('resultados');
    const contador = document.getElementById('contador');

    cont.innerHTML = '<div class="loading">Buscando...</div>';

    const { data, error } = await buscarStockAvanzado({ sku, serie, ubic, paleta, descripcion, cliente, estado, orden: this._orden, dir: this._dir, limit: 200 });

    if (error) {
      cont.innerHTML = '<div class="empty-state">Error al conectar con la base de datos.</div>';
      contador.textContent = '';
      return;
    }

    this._datos = data;
    contador.textContent = `${data.length} resultado${data.length === 1 ? '' : 's'}`;

    if (data.length === 0) {
      cont.innerHTML = '<div class="empty-state">Sin resultados para estos filtros.</div>';
      return;
    }

    this.renderTabla();
  },

  renderTabla() {
    const cont = document.getElementById('resultados');
    const data = this._datos;

    const cols = [
      { key: 'sku', label: 'SKU' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'cantidad', label: 'Cant.' },
      { key: 'ubicacion_fisica', label: 'Ubicación' },
      { key: 'paleta_pedido', label: 'Paleta/Ped' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'estado', label: 'Estado' }
    ];

    const arrow = (key) => this._orden === key ? `<span class="sort-arrow">${this._dir === 'asc' ? '▲' : '▼'}</span>` : '';

    let html = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>${cols.map(c => `<th data-col="${c.key}">${c.label}${arrow(c.key)}</th>`).join('')}</tr></thead>
          <tbody>
    `;

    data.forEach((item, i) => {
      const pill = item.estado === 'DISPONIBLE'
        ? '<span class="pill pill-success">Disponible</span>'
        : item.estado === 'DESPACHADO'
          ? '<span class="pill pill-neutral">Despachado</span>'
          : `<span class="pill pill-warning">${escapeHtml(item.estado || '')}</span>`;

      html += `
        <tr data-idx="${i}">
          <td class="sku-cell">${escapeHtml(item.sku || '')}</td>
          <td class="wrap">${escapeHtml((item.descripcion || '').slice(0, 70))}</td>
          <td class="num-cell">${formatNum(item.cantidad)} ${escapeHtml(item.unidad_medida || '')}</td>
          <td>${escapeHtml(item.ubicacion_fisica || '-')}</td>
          <td>${escapeHtml(item.paleta_pedido || '-')}</td>
          <td>${escapeHtml(item.cliente || '-')}</td>
          <td>${pill}</td>
        </tr>
        <tr class="detail-row-tr" data-detail-for="${i}" style="display:none;">
          <td colspan="7" style="padding:0;">
            <div class="row-detail-panel">
              <div class="row-detail-grid">
                <div style="grid-column: span 2;"><div class="item-label">Descripción</div><div class="item-value">${escapeHtml(item.descripcion || 'Sin descripción')}</div></div>
                <div><div class="item-label">Serie</div><div class="item-value">${escapeHtml(item.serie || 'Sin serie')}</div></div>
                <div><div class="item-label">Tipo</div><div class="item-value">${escapeHtml(item.tipo || '-')}</div></div>
                <div><div class="item-label">Fecha ingreso</div><div class="item-value">${escapeHtml(item.fecha_ingreso || '-')}</div></div>
                <div><div class="item-label">GR ingreso</div><div class="item-value">${escapeHtml(item.gr_ingreso || '-')}</div></div>
              </div>
            </div>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    cont.innerHTML = html;

    cont.querySelectorAll('thead th').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (this._orden === col) { this._dir = this._dir === 'asc' ? 'desc' : 'asc'; }
        else { this._orden = col; this._dir = 'asc'; }
        this._datos = this.ordenarLocal(this._datos, this._orden, this._dir);
        this.renderTabla();
      });
    });

    cont.querySelectorAll('tbody tr[data-idx]').forEach(tr => {
      tr.addEventListener('click', () => {
        const idx = tr.dataset.idx;
        const detailTr = cont.querySelector(`tr[data-detail-for="${idx}"]`);
        const isOpen = detailTr.style.display !== 'none';
        cont.querySelectorAll('.detail-row-tr').forEach(d => d.style.display = 'none');
        detailTr.style.display = isOpen ? 'none' : '';
      });
    });
  },

  ordenarLocal(data, key, dir) {
    const copia = [...data];
    copia.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (typeof va === 'number' || typeof vb === 'number') {
        va = Number(va) || 0; vb = Number(vb) || 0;
        return dir === 'asc' ? va - vb : vb - va;
      }
      va = (va || '').toString().toLowerCase();
      vb = (vb || '').toString().toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return copia;
  }
};


Router.register('consulta', ConsultaView);
