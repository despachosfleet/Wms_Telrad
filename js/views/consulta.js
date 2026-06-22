// ============================================================
// CONSULTA DE STOCK
// Búsqueda por coincidencia parcial, filtros con OR cuando
// se llena un solo campo, AND cuando se combinan múltiples.
// Botón limpiar filtros. Tabla ordenable.
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
          <div class="field">
            <label>SKU / Código</label>
            <input id="f-sku" type="text" autocomplete="off">
          </div>
          <div class="field">
            <label>Descripción</label>
            <input id="f-desc" type="text" autocomplete="off">
          </div>
        </div>
        <div class="field-grid" style="margin-bottom:8px;">
          <div class="field">
            <label>Serie</label>
            <input id="f-serie" type="text" autocomplete="off" style="font-family:monospace;">
          </div>
          <div class="field">
            <label>Pedido / Paleta</label>
            <input id="f-paleta" type="text" autocomplete="off">
          </div>
        </div>
        <div class="field-grid" style="margin-bottom:12px;">
          <div class="field">
            <label>Ubicación física</label>
            <input id="f-ubic" type="text" autocomplete="off">
          </div>
          <div class="field">
            <label>Cliente</label>
            <select id="f-cliente">
              <option value="">Todos</option>
              <option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
            </select>
          </div>
        </div>
        <div class="field" style="margin-bottom:12px;">
          <label>Estado</label>
          <div class="chips" id="chips-estado-stock">
            ${['Todos','DISPONIBLE','RESERVADO','DESPACHADO','DAÑADO'].map((e,i) => `
              <button class="chip ${i === 0 ? 'active' : ''}" data-est-stock="${i === 0 ? '' : e}">${e}</button>
            `).join('')}
          </div>
        </div>
        <div class="btn-row">
          <button class="btn-primary" id="btn-buscar-stock" style="flex:1;">🔍 Buscar</button>
          <button class="btn-ghost" id="btn-limpiar-stock">✕ Limpiar filtros</button>
        </div>
      </div>
      <div id="cont-resultado-stock"></div>
    `;
  },

  afterRender() {
    this._estadoFiltro = '';

    document.getElementById('btn-buscar-stock').addEventListener('click', () => this._buscar());
    document.getElementById('btn-limpiar-stock').addEventListener('click', () => this._limpiar());

    // Chips de estado
    document.querySelectorAll('[data-est-stock]').forEach(chip => {
      chip.addEventListener('click', () => {
        this._estadoFiltro = chip.dataset.estStock;
        document.querySelectorAll('[data-est-stock]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Buscar con Enter
    ['f-sku','f-desc','f-serie','f-paleta','f-ubic'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') this._buscar();
      });
    });
  },

  _estadoFiltro: '',

  _limpiar() {
    ['f-sku','f-desc','f-serie','f-paleta','f-ubic'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const cl = document.getElementById('f-cliente');
    if (cl) cl.value = '';
    this._estadoFiltro = '';
    document.querySelectorAll('[data-est-stock]').forEach((c, i) => {
      c.classList.toggle('active', i === 0);
    });
    document.getElementById('cont-resultado-stock').innerHTML = '';
  },

  async _buscar() {
    const btn  = document.getElementById('btn-buscar-stock');
    const cont = document.getElementById('cont-resultado-stock');
    btn.disabled = true; btn.textContent = 'Buscando…';
    cont.innerHTML = '';

    const params = {
      sku:         document.getElementById('f-sku')?.value.trim() || '',
      descripcion: document.getElementById('f-desc')?.value.trim() || '',
      serie:       document.getElementById('f-serie')?.value.trim() || '',
      paleta:      document.getElementById('f-paleta')?.value.trim() || '',
      ubic:        document.getElementById('f-ubic')?.value.trim() || '',
      cliente:     document.getElementById('f-cliente')?.value || '',
      estado:      this._estadoFiltro || '',
      orden:       this._orden,
      dir:         this._dir,
      limit:       300,
    };

    const { data } = await buscarStockAvanzado(params);
    this._resultados = data || [];
    btn.disabled = false; btn.textContent = '🔍 Buscar';
    this._renderTabla(cont);
  },

  _renderTabla(cont) {
    if (!this._resultados.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><strong>Sin resultados</strong>Prueba con otros filtros.</div>`;
      return;
    }

    const th = (campo, label) => {
      const activo = this._orden === campo;
      const ico = activo ? (this._dir === 'asc' ? ' ↑' : ' ↓') : '';
      return `<th class="sortable" data-col="${campo}">${label}${ico}</th>`;
    };

    cont.innerHTML = `
      <p style="font-size:11px; color:var(--text-tertiary); margin-bottom:6px; padding-left:4px;">
        ${this._resultados.length} resultado${this._resultados.length !== 1 ? 's' : ''}
      </p>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            ${th('sku','SKU')}
            ${th('descripcion','Descripción')}
            ${th('cantidad','Cant.')}
            ${th('serie','Serie')}
            ${th('paleta_pedido','Pedido/Paleta')}
            ${th('ubicacion_fisica','Ubicación')}
            ${th('cliente','Cliente')}
            ${th('tipo','Tipo')}
            ${th('estado','Estado')}
          </tr></thead>
          <tbody>
            ${this._resultados.map(r => `
              <tr>
                <td class="sku-cell">${escapeHtml(r.sku||'-')}</td>
                <td class="wrap" style="font-size:11px;">${escapeHtml((r.descripcion||'').substring(0,80))}${(r.descripcion||'').length > 80 ? '…' : ''}</td>
                <td style="font-weight:700; color:${Number(r.cantidad) <= 0 ? 'var(--danger-text)' : 'var(--text)'};">${formatNum(r.cantidad)}</td>
                <td style="font-family:monospace; font-size:11px;">${escapeHtml(r.serie||'-')}</td>
                <td>${escapeHtml(r.paleta_pedido||'-')}</td>
                <td>${escapeHtml(r.ubicacion_fisica||'-')}</td>
                <td>${escapeHtml(r.cliente||'-')}</td>
                <td>${pillTipo(r.tipo)}</td>
                <td>
                  ${r.estado === 'DISPONIBLE'
                    ? '<span class="pill pill-success">Disponible</span>'
                    : r.estado === 'RESERVADO'
                    ? '<span class="pill pill-warning">Reservado</span>'
                    : r.estado === 'DAÑADO'
                    ? '<span class="pill pill-danger">Dañado</span>'
                    : `<span class="pill pill-neutral">${escapeHtml(r.estado||'-')}</span>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (this._orden === col) this._dir = this._dir === 'asc' ? 'desc' : 'asc';
        else { this._orden = col; this._dir = 'asc'; }
        this._resultados = [...this._resultados].sort((a, b) => {
          const va = String(a[col] ?? '').toLowerCase();
          const vb = String(b[col] ?? '').toLowerCase();
          if (va < vb) return this._dir === 'asc' ? -1 : 1;
          if (va > vb) return this._dir === 'asc' ? 1 : -1;
          return 0;
        });
        this._renderTabla(cont);
      });
    });
  }
};

Router.register('consulta', ConsultaView);
