// ============================================================
// RECEPCIÓN — 3 flujos:
//   A) LPN  — pistoleo directo al WMS, crea contenedor físico
//   B) Excel — sube formato de 10 columnas ya validado
//   C) Manual — formulario ítem por ítem
// ============================================================

const RecepcionView = {
  title: 'Recepción',
  _flujo: null,       // 'lpn' | 'excel' | 'manual'
  _preview: [],       // ítems leídos del Excel (flujo B)
  _lpnActual: null,   // { id, codigo, cliente } (flujo A)
  _itemsLPN: [],      // ítems pistoliados en el LPN activo

  render() {
    return `
      <div class="page-inner">
        <div id="recep-selector">
          <div class="card" style="margin-bottom:0;">
            <p class="card-title">Recepción de mercadería</p>
            <p class="card-subtitle">Selecciona el flujo según tu situación</p>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:8px;">

              <button class="recep-opcion" data-flujo="lpn">
                <div class="recep-op-icon">📦</div>
                <div class="recep-op-titulo">Flujo LPN</div>
                <div class="recep-op-desc">Pistoleas directo al sistema. Crea contenedor físico (LPN) con los ítems. Exporta Excel para Sharepoint.</div>
              </button>

              <button class="recep-opcion" data-flujo="excel">
                <div class="recep-op-icon">📊</div>
                <div class="recep-op-titulo">Flujo Excel</div>
                <div class="recep-op-desc">Ya pistoleaste en tu Excel y lo subiste al Sharepoint. Subes ese mismo Excel aquí para registrar el stock.</div>
              </button>

              <button class="recep-opcion" data-flujo="manual">
                <div class="recep-op-icon">✏️</div>
                <div class="recep-op-titulo">Ingreso manual</div>
                <div class="recep-op-desc">Para ingresos pequeños o casos puntuales. Ingresas ítem por ítem con el formulario.</div>
              </button>

            </div>
          </div>
        </div>

        <div id="recep-contenido"></div>
      </div>
    `;
  },

  afterRender() {
    document.querySelectorAll('.recep-opcion').forEach(btn => {
      btn.addEventListener('click', () => {
        this._flujo = btn.dataset.flujo;
        document.getElementById('recep-selector').style.display = 'none';
        this._renderFlujo();
      });
    });
  },

  _renderFlujo() {
    const c = document.getElementById('recep-contenido');
    if (this._flujo === 'lpn')    this._renderLPN(c);
    if (this._flujo === 'excel')  this._renderExcel(c);
    if (this._flujo === 'manual') this._renderManual(c);
  },

  _btnVolver(contenedor) {
    return `<button class="btn-secondary" id="btn-volver-recep" style="margin-bottom:12px;">← Volver</button>`;
  },

  _bindVolver(contenedor) {
    document.getElementById('btn-volver-recep')?.addEventListener('click', () => {
      this._flujo = null;
      this._lpnActual = null;
      this._itemsLPN = [];
      this._preview = [];
      contenedor.innerHTML = '';
      document.getElementById('recep-selector').style.display = '';
    });
  },

  // ============================================================
  // FLUJO A — LPN
  // ============================================================
  _renderLPN(c) {
    c.innerHTML = `
      ${this._btnVolver(c)}
      <div class="card" id="lpn-setup-card">
        <p class="card-title">Flujo LPN — Nuevo contenedor</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div class="field">
            <label>Cliente</label>
            <select id="lpn-cliente">
              <option value="">-- Seleccionar --</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
              <option value="AMERICATEL">AMERICATEL</option>
            </select>
          </div>
          <div class="field">
            <label>N° Guía (opcional)</label>
            <input type="text" id="lpn-nguia" placeholder="T028-000001">
          </div>
        </div>
        <button class="btn-primary" id="btn-crear-lpn">Crear LPN y empezar</button>
      </div>
      <div id="lpn-trabajo"></div>
    `;
    this._bindVolver(c);
    document.getElementById('btn-crear-lpn')?.addEventListener('click', () => this._crearLPN());
  },

  async _crearLPN() {
    const cliente = document.getElementById('lpn-cliente')?.value || '';
    const nguia   = document.getElementById('lpn-nguia')?.value?.trim() || '';
    const btn     = document.getElementById('btn-crear-lpn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }

    const codigo = await generarCodigoLPN(cliente);
    const { data, error } = await crearLPN({ codigo, cliente, n_guia: nguia });

    if (error || !data) {
      if (btn) { btn.disabled = false; btn.textContent = 'Crear LPN y empezar'; }
      alert('Error al crear LPN: ' + (error?.message || error));
      return;
    }

    this._lpnActual = { id: data.id, codigo: data.codigo, cliente };
    this._itemsLPN  = [];
    document.getElementById('lpn-setup-card').style.display = 'none';
    this._renderLPNTrabajo(document.getElementById('lpn-trabajo'));
  },

  _renderLPNTrabajo(contenedor) {
    const lp = this._lpnActual;
    contenedor.innerHTML = `
      <div class="card" style="border-left:3px solid var(--accent); margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <div>
            <span style="font-size:18px; font-weight:900; color:var(--accent); font-family:monospace;">${escapeHtml(lp.codigo)}</span>
            <span class="pill pill-warning" style="margin-left:8px;">EN RECEPCIÓN</span>
          </div>
          <div style="font-size:12px; color:var(--text-secondary);">
            Cliente: <strong>${escapeHtml(lp.cliente || '—')}</strong>
          </div>
        </div>
        <p style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">
          Escribe este código con plumón en la caja/paleta física.
        </p>
      </div>

      <!-- Formulario pistolaje -->
      <div class="card" style="margin-bottom:10px;">
        <p class="card-title" style="margin-bottom:10px;">Agregar ítem</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
          <div class="field">
            <label>SKU / Material</label>
            <input type="text" id="lpn-sku" placeholder="ENT960051374" style="font-family:monospace;">
          </div>
          <div class="field">
            <label>Serie (pistoleable)</label>
            <input type="text" id="lpn-serie" placeholder="Pistola o escribe la serie" style="font-family:monospace;">
          </div>
          <div class="field">
            <label>Cantidad</label>
            <input type="number" id="lpn-cantidad" value="1" min="1">
          </div>
          <div class="field">
            <label>N° Pedido del cliente</label>
            <input type="text" id="lpn-pedido" placeholder="MR-218, 4400669533...">
          </div>
          <div class="field">
            <label>Tipo ingreso</label>
            <select id="lpn-tipo">
              <option value="NUEVO">NUEVO</option>
              <option value="DESMONTADO">DESMONTADO</option>
              <option value="TRASPASO">TRASPASO</option>
              <option value="CONTRATA">CONTRATA</option>
              <option value="DEVOLUCION">DEVOLUCIÓN</option>
            </select>
          </div>
          <div class="field">
            <label>Observaciones</label>
            <input type="text" id="lpn-obs" placeholder="Opcional">
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-primary" id="btn-agregar-item-lpn">+ Agregar ítem</button>
          <button class="btn-secondary" id="btn-buscar-sku-lpn">Buscar descripción</button>
        </div>
        <div id="lpn-sku-info" style="margin-top:8px; font-size:11px; color:var(--text-secondary);"></div>
      </div>

      <!-- Lista de ítems -->
      <div class="card" style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Ítems en este LPN (<span id="lpn-count">0</span>)</p>
        </div>
        <div id="lpn-items-lista">
          <div class="empty-state" style="padding:20px 0;">
            <div class="empty-icon">📭</div>
            Aún no hay ítems. Empieza pistoleando.
          </div>
        </div>
      </div>

      <!-- Cerrar LPN -->
      <div class="card" style="background:var(--accent-dim); border-color:var(--accent);">
        <p class="card-title">¿Terminaste este contenedor?</p>
        <p style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          Al cerrar, los ítems quedan en stock con estado DISPONIBLE en zona RECEPCIÓN. 
          Puedes crear otro LPN para más mercadería o finalizar.
        </p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-primary" id="btn-cerrar-lpn">✓ Cerrar LPN y guardar</button>
          <button class="btn-secondary" id="btn-nuevo-lpn-mas">+ Crear otro LPN</button>
          <button class="btn-secondary" id="btn-exportar-lpn" style="display:none;">↓ Exportar Excel Sharepoint</button>
        </div>
        <div id="lpn-resultado" style="margin-top:10px;"></div>
      </div>
    `;

    this._bindLPNEventos(contenedor);
    this._renderItemsLPN();
  },

  _bindLPNEventos(contenedor) {
    // Enter en campos para pistolaje rápido
    ['lpn-sku','lpn-serie','lpn-cantidad','lpn-pedido'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-agregar-item-lpn')?.click();
      });
    });

    document.getElementById('btn-buscar-sku-lpn')?.addEventListener('click', async () => {
      const sku = document.getElementById('lpn-sku')?.value?.trim();
      if (!sku) return;
      const info = document.getElementById('lpn-sku-info');
      info.textContent = 'Buscando…';
      const art = await buscarEnMaestro(sku);
      if (art) {
        info.innerHTML = `<span style="color:var(--success);">✓ ${escapeHtml(art.descripcion)}</span>`;
      } else {
        info.innerHTML = `<span style="color:var(--warning);">SKU no encontrado en maestro — puedes cargarlo igual.</span>`;
      }
    });

    document.getElementById('btn-agregar-item-lpn')?.addEventListener('click', () => {
      const sku      = document.getElementById('lpn-sku')?.value?.trim().toUpperCase();
      const serie    = document.getElementById('lpn-serie')?.value?.trim();
      const cantidad = Number(document.getElementById('lpn-cantidad')?.value) || 1;
      const pedido   = document.getElementById('lpn-pedido')?.value?.trim();
      const tipo     = document.getElementById('lpn-tipo')?.value || 'NUEVO';
      const obs      = document.getElementById('lpn-obs')?.value?.trim();

      if (!sku) { alert('El SKU / Material es obligatorio.'); return; }

      this._itemsLPN.push({
        MATERIAL: sku,
        DESCRIPCION: document.getElementById('lpn-sku-info')?.textContent?.replace('✓ ','') || '',
        SERIE: serie || '-',
        CANTIDAD_RECIBIDA: cantidad,
        N_PEDIDO: pedido || '',
        CLIENTE: this._lpnActual.cliente || '',
        N_GUIA: this._lpnActual.n_guia || '',
        TIPO_INGRESO: tipo,
        OBSERVACIONES: obs || '',
        FECHA: new Date().toLocaleDateString('es-PE')
      });

      // Limpiar campos rápido para siguiente pistolaje
      document.getElementById('lpn-sku').value = '';
      document.getElementById('lpn-serie').value = '';
      document.getElementById('lpn-cantidad').value = '1';
      document.getElementById('lpn-sku-info').textContent = '';
      document.getElementById('lpn-sku')?.focus();

      this._renderItemsLPN();
    });

    document.getElementById('btn-cerrar-lpn')?.addEventListener('click', () => this._cerrarLPN());
    document.getElementById('btn-nuevo-lpn-mas')?.addEventListener('click', () => this._nuevoLPNMas(contenedor));
    document.getElementById('btn-exportar-lpn')?.addEventListener('click', () => {
      exportarRecepcionAExcel(this._itemsLPN, `recepcion_${this._lpnActual.codigo}.xlsx`);
    });
  },

  _renderItemsLPN() {
    const lista = document.getElementById('lpn-items-lista');
    const count = document.getElementById('lpn-count');
    if (count) count.textContent = this._itemsLPN.length;

    if (!this._itemsLPN.length) {
      if (lista) lista.innerHTML = `
        <div class="empty-state" style="padding:20px 0;">
          <div class="empty-icon">📭</div>Aún no hay ítems.
        </div>`;
      return;
    }

    if (!lista) return;
    lista.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>#</th><th>SKU</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th>Tipo</th><th></th>
          </tr></thead>
          <tbody>
            ${this._itemsLPN.map((it, i) => `
              <tr>
                <td style="color:var(--text-tertiary);">${i+1}</td>
                <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
                <td class="serie-cell" style="font-size:10px;">
                  ${it.SERIE && !it.SERIE.startsWith('-') ? escapeHtml(it.SERIE) : '<span style="color:var(--text-tertiary);">Sin serie</span>'}
                </td>
                <td style="font-weight:700; color:var(--accent);">${formatNum(it.CANTIDAD_RECIBIDA)}</td>
                <td style="font-size:11px;">${escapeHtml(it.N_PEDIDO) || '—'}</td>
                <td><span class="pill pill-neutral" style="font-size:10px;">${escapeHtml(it.TIPO_INGRESO)}</span></td>
                <td>
                  <button class="btn-icon" style="color:var(--danger);" onclick="RecepcionView._eliminarItemLPN(${i})" title="Eliminar">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _eliminarItemLPN(idx) {
    this._itemsLPN.splice(idx, 1);
    this._renderItemsLPN();
  },

  async _cerrarLPN() {
    if (!this._itemsLPN.length) { alert('Agrega al menos un ítem antes de cerrar el LPN.'); return; }
    const btn = document.getElementById('btn-cerrar-lpn');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    const { error, count } = await registrarItemsEnLPN(
      this._lpnActual.id,
      this._lpnActual.codigo,
      this._itemsLPN
    );

    const res = document.getElementById('lpn-resultado');
    if (error) {
      if (btn) { btn.disabled = false; btn.textContent = '✓ Cerrar LPN y guardar'; }
      if (res) res.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;
      return;
    }

    if (btn) btn.style.display = 'none';
    document.getElementById('btn-exportar-lpn').style.display = '';
    if (res) res.innerHTML = `
      <div class="alert alert-success">
        <strong>✓ LPN ${escapeHtml(this._lpnActual.codigo)} cerrado — ${count} ítems en stock (zona RECEPCIÓN).</strong><br>
        <span style="font-size:11px;">Exporta el Excel para subirlo al Sharepoint del cliente.</span>
      </div>
    `;
  },

  async _nuevoLPNMas(contenedor) {
    // Guarda los ítems del LPN actual y crea uno nuevo del mismo cliente
    this._itemsLPN = [];
    this._lpnActual = null;
    document.getElementById('lpn-setup-card').style.display = '';
    document.getElementById('lpn-trabajo').innerHTML = '';
    const btn = document.getElementById('btn-crear-lpn');
    if (btn) { btn.disabled = false; btn.textContent = 'Crear LPN y empezar'; }
  },

  // ============================================================
  // FLUJO B — Excel
  // ============================================================
  _renderExcel(c) {
    c.innerHTML = `
      ${this._btnVolver(c)}
      <div class="card">
        <p class="card-title">Flujo Excel — Subir ingresos</p>
        <p class="card-subtitle">
          El archivo debe tener <strong>10 columnas en este orden exacto</strong>. 
          Los encabezados no importan — el sistema lee por posición de columna.
        </p>
        <div class="table-wrap" style="margin-bottom:14px;">
          <table class="data-table">
            <thead><tr><th>#</th><th>Columna</th><th>Descripción</th><th>Ejemplo</th></tr></thead>
            <tbody>
              ${[
                ['1','FECHA','Fecha de ingreso','05/05/2026'],
                ['2','CLIENTE','ENTEL, CLARO o TELRAD','ENTEL'],
                ['3','N_PEDIDO','Número de pedido (cualquier formato)','MR-218'],
                ['4','MATERIAL','Código SKU del artículo','ENT960051374'],
                ['5','DESCRIPCION','Descripción del artículo','HUAWEI 25030432...'],
                ['6','SERIE','Serie del artículo (o "-" si no tiene)','024QLM10R8103263'],
                ['7','CANTIDAD_RECIBIDA','Cantidad recibida real','1'],
                ['8','N_GUIA','Número de guía de ingreso','T217-00042276'],
                ['9','TIPO_INGRESO','NUEVO, DESMONTADO, TRASPASO, CONTRATA, DEVOLUCION','NUEVO'],
                ['10','OBSERVACIONES','Notas adicionales (puede quedar vacío)',''],
              ].map(([n,col,desc,ej]) => `
                <tr>
                  <td style="color:var(--text-tertiary);font-weight:700;">${n}</td>
                  <td class="sku-cell">${col}</td>
                  <td style="font-size:11px;">${desc}</td>
                  <td style="font-size:11px;color:var(--text-secondary);">${ej}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="file-drop" id="file-drop-recep">
          <div class="file-drop-icon">📥</div>
          <strong>Seleccionar o arrastrar Excel</strong>
          <span style="font-size:11px;color:var(--text-tertiary);">.xlsx — 10 columnas en el orden indicado</span>
        </div>
        <input type="file" id="input-recep" accept=".xlsx,.xls" style="display:none;">
      </div>
      <div id="preview-recep"></div>
      <div id="resultado-recep"></div>
    `;
    this._bindVolver(c);

    const drop  = document.getElementById('file-drop-recep');
    const input = document.getElementById('input-recep');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) this._procesarExcel(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
      if (e.target.files[0]) this._procesarExcel(e.target.files[0]);
    });
  },

  async _procesarExcel(file) {
    const preview = document.getElementById('preview-recep');
    preview.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo Excel…</div>';
    try {
      await cargarXlsx();
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      let filas = [];
      for (const nombre of wb.SheetNames) {
        const ws   = wb.Sheets[nombre];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (data.length > 1) { filas = data; break; }
      }
      if (!filas.length) {
        preview.innerHTML = '<div class="alert alert-danger">El Excel está vacío.</div>';
        return;
      }
      // Detectar fila de encabezado
      const primeraFila = filas[0];
      const COLS = ['FECHA','CLIENTE','N_PEDIDO','MATERIAL','DESCRIPCION','SERIE','CANTIDAD','N_GUIA','TIPO','OBS'];
      const matchCount = COLS.filter(c => primeraFila.some(v => String(v).toUpperCase().includes(c.substring(0,4)))).length;
      const filaInicio = matchCount >= 3 ? 1 : 0;

      this._preview = filas.slice(filaInicio)
        .filter(r => r.some(v => v !== '' && v !== null))
        .map(r => ({
          FECHA:             r[0],
          CLIENTE:           String(r[1] || '').trim().toUpperCase(),
          N_PEDIDO:          String(r[2] || '').trim(),
          MATERIAL:          String(r[3] || '').trim().toUpperCase(),
          DESCRIPCION:       String(r[4] || '').trim(),
          SERIE:             String(r[5] || '').trim(),
          CANTIDAD_RECIBIDA: Number(r[6]) || 0,
          N_GUIA:            String(r[7] || '').trim(),
          TIPO_INGRESO:      String(r[8] || 'NUEVO').trim().toUpperCase() || 'NUEVO',
          OBSERVACIONES:     String(r[9] || '').trim(),
        }))
        .filter(r => r.MATERIAL && r.CANTIDAD_RECIBIDA > 0);

      if (!this._preview.length) {
        preview.innerHTML = '<div class="alert alert-danger">No se encontraron filas válidas. Verifica que MATERIAL esté en columna 4 y CANTIDAD_RECIBIDA en columna 7 con valor mayor a 0.</div>';
        return;
      }
      this._renderPreviewExcel(preview);
    } catch(err) {
      preview.innerHTML = `<div class="alert alert-danger">Error al leer: ${escapeHtml(err.message)}</div>`;
    }
  },

  _renderPreviewExcel(preview) {
    const sinSerie = this._preview.filter(r => !r.SERIE || r.SERIE.startsWith('-')).length;
    const pedidos  = [...new Set(this._preview.map(r => r.N_PEDIDO).filter(Boolean))];

    preview.innerHTML = `
      <div class="alert alert-info" style="margin-bottom:10px;">
        <strong>${this._preview.length} ítems</strong> en <strong>${pedidos.length} pedidos</strong>.
        ${sinSerie > 0 ? `<br><span style="font-size:11px;">${sinSerie} ítems sin serie.</span>` : ''}
      </div>
      <div class="table-wrap" style="margin-bottom:12px;">
        <table class="data-table">
          <thead><tr>
            <th>SKU</th><th>Descripción</th><th>Pedido</th>
            <th>Cant.</th><th>Serie</th><th>Tipo</th><th>Cliente</th>
          </tr></thead>
          <tbody>
            ${this._preview.slice(0,100).map(r => `
              <tr>
                <td class="sku-cell">${escapeHtml(r.MATERIAL)}</td>
                <td style="font-size:10px; max-width:280px;">${escapeHtml(r.DESCRIPCION)}</td>
                <td style="font-family:monospace;font-size:11px;">${escapeHtml(r.N_PEDIDO) || '—'}</td>
                <td style="font-weight:700;color:var(--accent);">${formatNum(r.CANTIDAD_RECIBIDA)}</td>
                <td class="serie-cell" style="font-size:10px;">
                  ${r.SERIE && !r.SERIE.startsWith('-') ? escapeHtml(r.SERIE) : '<span style="color:var(--text-tertiary);">Sin serie</span>'}
                </td>
                <td><span class="pill pill-neutral" style="font-size:10px;">${escapeHtml(r.TIPO_INGRESO)}</span></td>
                <td style="font-size:11px;">${escapeHtml(r.CLIENTE)}</td>
              </tr>
            `).join('')}
            ${this._preview.length > 100 ? `
              <tr><td colspan="7" style="text-align:center;font-size:11px;color:var(--text-tertiary);padding:8px;">
                … y ${this._preview.length - 100} ítems más
              </td></tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      <div class="btn-row">
        <button class="btn-primary" id="btn-cargar-excel-recep">Cargar ${this._preview.length} ítems al stock</button>
        <button class="btn-secondary" id="btn-cancelar-excel-recep">Cancelar</button>
      </div>
    `;

    document.getElementById('btn-cargar-excel-recep')?.addEventListener('click', () => this._cargarExcel(preview));
    document.getElementById('btn-cancelar-excel-recep')?.addEventListener('click', () => {
      preview.innerHTML = '';
      this._preview = [];
    });
  },

  async _cargarExcel(preview) {
    const btn = document.getElementById('btn-cargar-excel-recep');
    if (btn) { btn.disabled = true; btn.textContent = 'Cargando…'; }

    const { error, count } = await registrarIngresosDesdeExcel(this._preview);
    const res = document.getElementById('resultado-recep');
    preview.innerHTML = '';

    if (error) {
      if (res) res.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;
      return;
    }
    if (res) res.innerHTML = `
      <div class="alert alert-success">
        <strong>✓ ${count} ítems cargados al stock correctamente.</strong>
      </div>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-secondary" onclick="Router.navigate('recepcion')">Cargar otro Excel</button>
        <button class="btn-primary" onclick="Router.navigate('consulta')">Ver en consultas →</button>
      </div>
    `;
  },

  // ============================================================
  // FLUJO C — Manual
  // ============================================================
  _manualItems: [],

  _renderManual(c) {
    this._manualItems = [];
    c.innerHTML = `
      ${this._btnVolver(c)}
      <div class="card" style="margin-bottom:10px;">
        <p class="card-title">Ingreso manual — Agregar ítem</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
          <div class="field">
            <label>Fecha</label>
            <input type="date" id="man-fecha" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="field">
            <label>Cliente</label>
            <select id="man-cliente">
              <option value="">-- Seleccionar --</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
              <option value="AMERICATEL">AMERICATEL</option>
            </select>
          </div>
          <div class="field">
            <label>N° Pedido</label>
            <input type="text" id="man-pedido" placeholder="MR-218, 4400669533...">
          </div>
          <div class="field">
            <label>N° Guía</label>
            <input type="text" id="man-nguia" placeholder="T028-000001">
          </div>
          <div class="field">
            <label>SKU / Material *</label>
            <input type="text" id="man-sku" placeholder="ENT960051374" style="font-family:monospace;">
          </div>
          <div class="field">
            <label>Descripción</label>
            <input type="text" id="man-desc" placeholder="Se completa automático si está en maestro">
          </div>
          <div class="field">
            <label>Serie</label>
            <input type="text" id="man-serie" placeholder="Dejar vacío si no tiene" style="font-family:monospace;">
          </div>
          <div class="field">
            <label>Cantidad recibida *</label>
            <input type="number" id="man-cantidad" value="1" min="1">
          </div>
          <div class="field">
            <label>Tipo ingreso</label>
            <select id="man-tipo">
              <option value="NUEVO">NUEVO</option>
              <option value="DESMONTADO">DESMONTADO</option>
              <option value="TRASPASO">TRASPASO</option>
              <option value="CONTRATA">CONTRATA</option>
              <option value="DEVOLUCION">DEVOLUCIÓN</option>
            </select>
          </div>
          <div class="field">
            <label>Observaciones</label>
            <input type="text" id="man-obs" placeholder="Opcional">
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-primary" id="btn-agregar-manual">+ Agregar a la lista</button>
          <button class="btn-secondary" id="btn-buscar-sku-manual">Buscar en maestro</button>
        </div>
        <div id="man-sku-info" style="margin-top:6px; font-size:11px; color:var(--text-secondary);"></div>
      </div>

      <div class="card" style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Ítems a registrar (<span id="man-count">0</span>)</p>
        </div>
        <div id="man-items-lista">
          <div class="empty-state" style="padding:16px 0;">
            <div class="empty-icon">📝</div>Agrega ítems arriba
          </div>
        </div>
      </div>

      <div id="man-resultado"></div>
    `;
    this._bindVolver(c);
    this._bindManualEventos();
  },

  _bindManualEventos() {
    document.getElementById('btn-buscar-sku-manual')?.addEventListener('click', async () => {
      const sku  = document.getElementById('man-sku')?.value?.trim();
      const info = document.getElementById('man-sku-info');
      if (!sku) return;
      info.textContent = 'Buscando…';
      const art = await buscarEnMaestro(sku);
      if (art) {
        document.getElementById('man-desc').value = art.descripcion || '';
        info.innerHTML = `<span style="color:var(--success);">✓ Descripción completada desde maestro</span>`;
      } else {
        info.innerHTML = `<span style="color:var(--warning);">SKU no encontrado en maestro</span>`;
      }
    });

    document.getElementById('btn-agregar-manual')?.addEventListener('click', () => {
      const sku      = document.getElementById('man-sku')?.value?.trim().toUpperCase();
      const cantidad = Number(document.getElementById('man-cantidad')?.value) || 0;
      if (!sku)      { alert('El SKU es obligatorio.'); return; }
      if (!cantidad) { alert('La cantidad debe ser mayor a 0.'); return; }

      this._manualItems.push({
        FECHA:             document.getElementById('man-fecha')?.value || new Date().toISOString().slice(0,10),
        CLIENTE:           document.getElementById('man-cliente')?.value || '',
        N_PEDIDO:          document.getElementById('man-pedido')?.value?.trim() || '',
        MATERIAL:          sku,
        DESCRIPCION:       document.getElementById('man-desc')?.value?.trim() || '',
        SERIE:             document.getElementById('man-serie')?.value?.trim() || '-',
        CANTIDAD_RECIBIDA: cantidad,
        N_GUIA:            document.getElementById('man-nguia')?.value?.trim() || '',
        TIPO_INGRESO:      document.getElementById('man-tipo')?.value || 'NUEVO',
        OBSERVACIONES:     document.getElementById('man-obs')?.value?.trim() || '',
      });

      // Limpiar para siguiente ítem
      document.getElementById('man-sku').value     = '';
      document.getElementById('man-serie').value   = '';
      document.getElementById('man-desc').value    = '';
      document.getElementById('man-cantidad').value = '1';
      document.getElementById('man-obs').value     = '';
      document.getElementById('man-sku-info').textContent = '';
      document.getElementById('man-sku')?.focus();

      this._renderManualItems();
    });
  },

  _renderManualItems() {
    const lista = document.getElementById('man-items-lista');
    const count = document.getElementById('man-count');
    if (count) count.textContent = this._manualItems.length;

    if (!this._manualItems.length) {
      if (lista) lista.innerHTML = `<div class="empty-state" style="padding:16px 0;"><div class="empty-icon">📝</div>Agrega ítems arriba</div>`;
      return;
    }

    if (!lista) return;

    const btnGuardar = this._manualItems.length > 0 ? `
      <div class="btn-row" style="margin-top:10px;">
        <button class="btn-primary" id="btn-guardar-manual">✓ Guardar ${this._manualItems.length} ítems al stock</button>
      </div>
    ` : '';

    lista.innerHTML = `
      <div class="table-wrap" style="margin-bottom:8px;">
        <table class="data-table">
          <thead><tr>
            <th>#</th><th>SKU</th><th>Descripción</th><th>Serie</th>
            <th>Cant.</th><th>Pedido</th><th>Tipo</th><th></th>
          </tr></thead>
          <tbody>
            ${this._manualItems.map((it,i) => `
              <tr>
                <td style="color:var(--text-tertiary);">${i+1}</td>
                <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
                <td style="font-size:10px; max-width:220px;">${escapeHtml(it.DESCRIPCION) || '—'}</td>
                <td class="serie-cell" style="font-size:10px;">
                  ${it.SERIE && !it.SERIE.startsWith('-') ? escapeHtml(it.SERIE) : '<span style="color:var(--text-tertiary);">Sin serie</span>'}
                </td>
                <td style="font-weight:700;color:var(--accent);">${formatNum(it.CANTIDAD_RECIBIDA)}</td>
                <td style="font-size:11px;">${escapeHtml(it.N_PEDIDO) || '—'}</td>
                <td><span class="pill pill-neutral" style="font-size:10px;">${escapeHtml(it.TIPO_INGRESO)}</span></td>
                <td>
                  <button class="btn-icon" style="color:var(--danger);" onclick="RecepcionView._eliminarItemManual(${i})" title="Eliminar">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${btnGuardar}
    `;

    document.getElementById('btn-guardar-manual')?.addEventListener('click', () => this._guardarManual());
  },

  _eliminarItemManual(idx) {
    this._manualItems.splice(idx, 1);
    this._renderManualItems();
  },

  async _guardarManual() {
    const btn = document.getElementById('btn-guardar-manual');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    const { error, count } = await registrarIngresosDesdeExcel(this._manualItems);
    const res = document.getElementById('man-resultado');

    if (error) {
      if (btn) { btn.disabled = false; btn.textContent = `✓ Guardar ${this._manualItems.length} ítems al stock`; }
      if (res) res.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;
      return;
    }

    this._manualItems = [];
    this._renderManualItems();
    if (res) res.innerHTML = `
      <div class="alert alert-success">
        <strong>✓ ${count} ítems registrados en stock correctamente.</strong>
      </div>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-secondary" onclick="Router.navigate('recepcion')">Nueva recepción</button>
        <button class="btn-primary" onclick="Router.navigate('consulta')">Ver en consultas →</button>
      </div>
    `;
  }
};

Router.register('recepcion', RecepcionView);
