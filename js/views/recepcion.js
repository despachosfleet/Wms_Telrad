// ============================================================
// RECEPCIÓN — Subir Excel de ingresos nuevos
// Formato fijo de 10 columnas (del Sharepoint del cliente)
// ============================================================

const RecepcionView = {
  title: 'Recepción',
  _preview: [],

  render() {
    return `
      <div class="card">
        <p class="card-title">Subir Excel de ingresos</p>
        <p class="card-subtitle">
          El archivo debe tener exactamente estas 10 columnas en este orden:
        </p>
        <div class="table-wrap" style="margin-bottom:14px;">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>Columna</th><th>Descripción</th><th>Ejemplo</th>
            </tr></thead>
            <tbody>
              ${[
                ['1','FECHA','Fecha de ingreso','05/05/2026'],
                ['2','CLIENTE','ENTEL, CLARO o TELRAD','ENTEL'],
                ['3','N_PEDIDO','Número de pedido (cualquier formato)','MR-218'],
                ['4','MATERIAL','Código SKU del artículo','ENT960051374'],
                ['5','DESCRIPCION','Descripción del artículo','HUAWEI 25030432...'],
                ['6','SERIE','Serie del artículo (o "-" si no tiene)','024QLM10R8103263'],
                ['7','CANTIDAD_RECIBIDA','Cantidad recibida real','24'],
                ['8','N_GUIA','Número de guía de ingreso','T217-00042276'],
                ['9','TIPO_INGRESO','NUEVO, DESMONTADO, TRASPASO, CONTRATA, DEVOLUCION','NUEVO'],
                ['10','OBSERVACIONES','Notas adicionales (puede quedar vacío)','SKU no coincide con GR'],
              ].map(([n, col, desc, ej]) => `
                <tr>
                  <td style="color:var(--text-tertiary); font-weight:700;">${n}</td>
                  <td class="sku-cell">${col}</td>
                  <td style="font-size:11px;">${desc}</td>
                  <td style="font-size:11px; color:var(--text-secondary);">${ej}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="file-drop" id="file-drop-recep">
          <div class="file-drop-icon">📥</div>
          <strong>Seleccionar Excel de ingresos</strong>
          .xlsx · 10 columnas en el orden indicado
        </div>
        <input type="file" id="input-recep" accept=".xlsx,.xls" style="display:none;">
      </div>

      <div id="preview-recep"></div>
      <div id="resultado-recep"></div>
    `;
  },

  afterRender() {
    const drop  = document.getElementById('file-drop-recep');
    const input = document.getElementById('input-recep');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) this._procesar(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
      if (e.target.files[0]) this._procesar(e.target.files[0]);
    });
  },

  async _procesar(file) {
    const preview = document.getElementById('preview-recep');
    preview.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo Excel…</div>';

    try {
      await cargarXlsx();
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });

      // Buscar la primera hoja con datos
      let filas = [];
      for (const nombre of wb.SheetNames) {
        const ws = wb.Sheets[nombre];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (data.length > 1) { filas = data; break; }
      }

      if (!filas.length) {
        preview.innerHTML = '<div class="alert alert-danger">El Excel está vacío o no tiene el formato esperado.</div>';
        return;
      }

      // Detectar si la primera fila es encabezado (contiene texto) o datos
      const COLS = ['FECHA','CLIENTE','N_PEDIDO','MATERIAL','DESCRIPCION','SERIE','CANTIDAD_RECIBIDA','N_GUIA','TIPO_INGRESO','OBSERVACIONES'];
      let filaInicio = 0;
      const primeraFila = filas[0];
      // Si la primera fila tiene al menos 4 strings que coinciden con nuestras columnas, saltar
      const matchCount = COLS.filter(c => primeraFila.some(v => String(v).toUpperCase().includes(c.substring(0,5)))).length;
      if (matchCount >= 3) filaInicio = 1;

      this._preview = filas.slice(filaInicio)
        .filter(r => r.some(v => v !== '' && v !== null))
        .map(r => ({
          FECHA:              r[0],
          CLIENTE:            String(r[1] || '').trim().toUpperCase(),
          N_PEDIDO:           String(r[2] || '').trim(),
          MATERIAL:           String(r[3] || '').trim().toUpperCase(),
          DESCRIPCION:        String(r[4] || '').trim(),
          SERIE:              String(r[5] || '').trim(),
          CANTIDAD_RECIBIDA:  Number(r[6]) || 0,
          N_GUIA:             String(r[7] || '').trim(),
          TIPO_INGRESO:       String(r[8] || 'NUEVO').trim().toUpperCase() || 'NUEVO',
          OBSERVACIONES:      String(r[9] || '').trim(),
        }))
        .filter(r => r.MATERIAL && r.CANTIDAD_RECIBIDA > 0);

      if (!this._preview.length) {
        preview.innerHTML = '<div class="alert alert-danger">No se encontraron filas válidas. Verifica que el Excel tenga las 10 columnas en el orden correcto y que CANTIDAD_RECIBIDA sea mayor a 0.</div>';
        return;
      }

      this._renderPreview(preview);
    } catch(err) {
      preview.innerHTML = `<div class="alert alert-danger">Error al leer el Excel: ${escapeHtml(err.message)}</div>`;
    }
  },

  _renderPreview(preview) {
    const sinSerie = this._preview.filter(r => !r.SERIE || r.SERIE.startsWith('-')).length;
    const pedidos  = [...new Set(this._preview.map(r => r.N_PEDIDO))];

    preview.innerHTML = `
      <div class="alert alert-info">
        <div>
          Se detectaron <strong>${this._preview.length} ítems</strong> en <strong>${pedidos.length} pedidos</strong>.
          ${sinSerie > 0 ? `<br>${sinSerie} ítems sin serie (se cargarán sin serie).` : ''}
        </div>
      </div>

      <div class="table-wrap" style="margin-bottom:12px;">
        <table class="data-table">
          <thead><tr>
            <th>Material</th><th>Descripción</th><th>Pedido</th>
            <th>Cant.</th><th>Serie</th><th>Tipo ingreso</th><th>Cliente</th>
          </tr></thead>
          <tbody>
            ${this._preview.slice(0, 50).map(r => `
              <tr>
                <td class="sku-cell">${escapeHtml(r.MATERIAL)}</td>
                <td class="wrap" style="font-size:10px;">${escapeHtml(r.DESCRIPCION.substring(0,60))}${r.DESCRIPCION.length > 60 ? '…' : ''}</td>
                <td style="font-family:monospace; font-size:11px;">${escapeHtml(r.N_PEDIDO)}</td>
                <td style="font-weight:700; color:var(--accent);">${formatNum(r.CANTIDAD_RECIBIDA)}</td>
                <td style="font-family:monospace; font-size:10px;">
                  ${r.SERIE && !r.SERIE.startsWith('-') ? escapeHtml(r.SERIE) : '<span style="color:var(--text-tertiary);">Sin serie</span>'}
                </td>
                <td><span class="pill pill-neutral">${escapeHtml(r.TIPO_INGRESO)}</span></td>
                <td>${escapeHtml(r.CLIENTE)}</td>
              </tr>
            `).join('')}
            ${this._preview.length > 50 ? `
              <tr><td colspan="7" style="text-align:center; font-size:11px; color:var(--text-tertiary); padding:8px;">
                … y ${this._preview.length - 50} ítems más
              </td></tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <div class="btn-row">
        <button class="btn-primary" id="btn-cargar-ingresos">
          Cargar ${this._preview.length} ítems al stock
        </button>
        <button class="btn-secondary" id="btn-cancelar-recep">Cancelar</button>
      </div>
    `;

    document.getElementById('btn-cargar-ingresos')?.addEventListener('click', () => this._cargar(preview));
    document.getElementById('btn-cancelar-recep')?.addEventListener('click', () => {
      preview.innerHTML = '';
      this._preview = [];
    });
  },

  async _cargar(preview) {
    const btn = document.getElementById('btn-cargar-ingresos');
    if (btn) { btn.disabled = true; btn.textContent = 'Cargando…'; }

    const { error, count } = await registrarIngresosDesdeExcel(this._preview);
    const resultado = document.getElementById('resultado-recep');
    preview.innerHTML = '';

    if (error) {
      resultado.innerHTML = `<div class="alert alert-danger">Error al cargar: ${escapeHtml(String(error))}</div>`;
    } else {
      resultado.innerHTML = `
        <div class="alert alert-success">
          <strong>✓ ${count} ítems cargados al stock correctamente.</strong>
        </div>
        <div class="btn-row">
          <button class="btn-secondary" id="btn-otra-recep">Cargar otro Excel</button>
          <button class="btn-primary" id="btn-ver-stock">Ver en consultas →</button>
        </div>
      `;
      document.getElementById('btn-otra-recep')?.addEventListener('click', () => Router.navigate('recepcion'));
      document.getElementById('btn-ver-stock')?.addEventListener('click', () => Router.navigate('consulta'));
    }
  }
};

Router.register('recepcion', RecepcionView);
