// ============================================================
// VISTA: NUEVA ORDEN DE PICKING
// 2 modos: Manual (formulario directo) o Subir archivo (Excel
// masivo que genera una lista de guias pendientes para resolver
// una por una con su PDF correspondiente).
// ============================================================

const NuevoPickingView = {
  title: 'Nueva orden de picking',
  _modo: null, // 'manual' | 'archivo'
  _filas: [],
  _checkTimeout: null,
  _guiaActivaId: null,

  render() {
    return `
      <div class="card" id="selector-modo">
        <p class="card-title">¿Cómo quieres registrar el picking?</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" id="btn-modo-manual" style="flex:1; min-width:140px;">Manual</button>
          <button class="btn-primary" id="btn-modo-archivo" style="flex:1; min-width:140px; background:var(--neutral-bg); color:var(--text-primary);">Subir archivo</button>
        </div>
      </div>
      <div id="contenido-modo"></div>
    `;
  },

  afterRender() {
    this._modo = null;
    document.getElementById('btn-modo-manual').addEventListener('click', () => this.activarModoManual());
    document.getElementById('btn-modo-archivo').addEventListener('click', () => this.activarModoArchivo());
  },

  // ============================================================
  // MODO MANUAL (formulario directo, igual al flujo anterior)
  // ============================================================
  activarModoManual() {
    this._modo = 'manual';
    this._filas = [{ sku: '', cantidad: '', serie: '', stockInfo: null, estadoValidacion: null }];

    const cont = document.getElementById('contenido-modo');
    cont.innerHTML = `
      <div class="card">
        <p class="card-title">Datos de la guía</p>
        <div class="field-grid">
          <div class="field"><label>N° GR</label><input type="text" id="f-gr" placeholder="T022-0000000132" /></div>
          <div class="field"><label>Fecha</label><input type="date" id="f-fecha" /></div>
          <div class="field">
            <label>Cliente</label>
            <select id="f-cliente">
              <option value="">Seleccionar</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
              <option value="AMERICATEL">AMERICATEL</option>
            </select>
          </div>
          <div class="field"><label>Destino</label><input type="text" id="f-destino" placeholder="Moyobamba" /></div>
          <div class="field"><label>Contrata</label><input type="text" id="f-contrata" placeholder="Opcional" /></div>
          <div class="field" style="grid-column: span 2;"><label>Consignatarios</label><input type="text" id="f-consignatarios" placeholder="Opcional" /></div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
          <p class="card-title" style="margin:0;">Ítems de la guía</p>
          <div style="display:flex; gap:14px;">
            <button class="btn-text" id="btn-import-excel-single">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Importar Excel
            </button>
            <input type="file" id="input-excel-single" accept=".xlsx,.xls" style="display:none;" />
            <button class="btn-text" id="btn-add-row">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar fila
            </button>
          </div>
        </div>
        <div id="excel-status"></div>
        <div style="overflow-x:auto;">
          <table class="item-table">
            <thead>
              <tr><th class="col-sku">SKU</th><th class="col-cant">Cant.</th><th class="col-stock">Stock disponible</th><th class="col-val">Validación</th><th class="col-del"></th></tr>
            </thead>
            <tbody id="filas-body"></tbody>
          </table>
        </div>
        <div style="margin-top:10px; border-top:1px solid var(--border-light); padding-top:10px;">
          <button class="btn-text" id="btn-import-pdf">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Validar con PDF de la guía
          </button>
          <input type="file" id="input-pdf" accept="application/pdf" style="display:none;" />
          <div id="pdf-status"></div>
        </div>
      </div>

      <div class="hint-box">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>Puedes escribir todo a mano, importar un Excel para llenar rápido, o validar siempre con el PDF de la guía antes de generar (la guía manda si algo no coincide).</p>
      </div>

      <button class="btn-primary" id="btn-crear">Generar orden de picking</button>
    `;

    document.getElementById('f-fecha').value = new Date().toISOString().slice(0, 10);

    document.getElementById('btn-add-row').addEventListener('click', () => {
      this._filas.push({ sku: '', cantidad: '', serie: '', stockInfo: null, estadoValidacion: null });
      this.renderFilas();
    });

    document.getElementById('btn-import-excel-single').addEventListener('click', () => document.getElementById('input-excel-single').click());
    document.getElementById('input-excel-single').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.importarExcelSimple(file);
      e.target.value = '';
    });

    document.getElementById('btn-import-pdf').addEventListener('click', () => document.getElementById('input-pdf').click());
    document.getElementById('input-pdf').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.validarConPDF(file);
      e.target.value = '';
    });

    document.getElementById('btn-crear').addEventListener('click', () => this.crearOrdenPicking());

    this.renderFilas();
  },

  async importarExcelSimple(file) {
    const statusEl = document.getElementById('excel-status');
    let gr = document.getElementById('f-gr').value.trim();

    if (!gr) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--warning); margin:0 0 8px;">Escribe primero el N° GR para buscarlo en el Excel.</p>`;
      return;
    }

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:0 0 8px;">Buscando GR ${escapeHtml(gr)} en el Excel...</p>`;

    const { data, error } = await extraerDespachoDeExcel(file, gr);

    if (error || !data) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:0 0 8px;">${escapeHtml(error || 'No se encontraron datos.')}</p>`;
      return;
    }

    this.aplicarDatosAFormulario(data);
    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:0 0 8px;">${data.items.length} ítems importados. Verificando stock...</p>`;
    this.renderFilas();
    await this.verificarStockTodas();
    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:0 0 8px;">${data.items.length} ítems importados y verificados. Recomendado: valida con el PDF antes de generar.</p>`;
  },

  aplicarDatosAFormulario(data) {
    if (data.cabecera) {
      if (data.cabecera.cliente) document.getElementById('f-cliente').value = data.cabecera.cliente;
      if (data.cabecera.destino) document.getElementById('f-destino').value = data.cabecera.destino;
      const consig = [data.cabecera.consignatario_1, data.cabecera.consignatario_2].filter(Boolean).join(' / ');
      if (consig) document.getElementById('f-consignatarios').value = consig;
    }
    this._filas = data.items.map(it => ({
      sku: it.sku || '', cantidad: it.cantidad != null ? String(it.cantidad) : '',
      serie: it.serie || '', stockInfo: null, estadoValidacion: null
    }));
  },

  async validarConPDF(file) {
    const statusEl = document.getElementById('pdf-status');
    statusEl.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:6px 0 0;">Leyendo guía...</p>`;

    const { data, error } = await procesarGuiaPDF(file);

    if (error || !data) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:6px 0 0;">No se pudo leer el PDF: ${escapeHtml(error || 'error desconocido')}</p>`;
      return;
    }
    if (data.errores.length > 0) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--warning); margin:6px 0 0;">${escapeHtml(data.errores.join(' '))}</p>`;
      return;
    }

    if (data.guia) document.getElementById('f-gr').value = data.guia;

    const itemsExcelActuales = this._filas
      .filter(f => f.sku.trim())
      .map(f => ({ sku: f.sku.trim(), cantidad: Number(f.cantidad) || 0, serie: f.serie ? f.serie.trim() : null }));

    const validado = validarContraPDF(itemsExcelActuales, data.items);

    this._filas = validado.map(v => ({
      sku: v.sku || '', cantidad: v.cantidad != null ? String(v.cantidad) : '',
      serie: v.serie || '', stockInfo: null,
      estadoValidacion: v.estado_validacion, notaValidacion: v.nota
    }));

    const corregidos = validado.filter(v => v.estado_validacion === 'CORREGIDO').length;
    const soloPdf = validado.filter(v => v.estado_validacion === 'SOLO_EN_PDF').length;
    let msg = `Validado contra la guía: ${validado.length} ítems.`;
    if (corregidos > 0) msg += ` ${corregidos} corregido(s) según la guía.`;
    if (soloPdf > 0) msg += ` ${soloPdf} fila(s) nueva(s) solo en la guía — revísalas.`;
    if (corregidos === 0 && soloPdf === 0) msg += ` Todo coincide.`;

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:6px 0 0;">${escapeHtml(msg)}</p>`;
    this.renderFilas();
    await this.verificarStockTodas();
  },

  // ============================================================
  // MODO ARCHIVO (Excel masivo -> lista de guias pendientes)
  // ============================================================
  activarModoArchivo() {
    this._modo = 'archivo';
    const cont = document.getElementById('contenido-modo');
    cont.innerHTML = `
      <div class="card">
        <p class="card-title">Subir Excel de programación</p>
        <p style="font-size:11px; color:var(--text-secondary); margin:0 0 10px;">Sube el Excel completo (con varias guías). El sistema detectará cada guía y la agregará a la lista de pendientes para que las resuelvas una por una con su PDF.</p>
        <button class="btn-primary" id="btn-subir-excel-masivo">Seleccionar archivo Excel</button>
        <input type="file" id="input-excel-masivo" accept=".xlsx,.xls" style="display:none;" />
        <div id="masivo-status" style="margin-top:8px;"></div>
      </div>
      <div id="lista-pendientes-cont"></div>
    `;

    document.getElementById('btn-subir-excel-masivo').addEventListener('click', () => document.getElementById('input-excel-masivo').click());
    document.getElementById('input-excel-masivo').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.subirExcelMasivo(file);
      e.target.value = '';
    });

    this.cargarYRenderizarPendientes();
  },

  async subirExcelMasivo(file) {
    const statusEl = document.getElementById('masivo-status');
    statusEl.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:0;">Leyendo Excel...</p>`;

    const { data: guias, error } = await agruparTodasLasGuiasDeExcel(file);

    if (error || !guias) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:0;">${escapeHtml(error || 'Error al leer el archivo.')}</p>`;
      return;
    }

    const { data: guardadas, error: errGuardar } = await guardarGuiasPendientes(guias);

    if (errGuardar) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:0;">Se detectaron ${guias.length} guías, pero hubo un error al guardarlas. Revisa tu conexión.</p>`;
      return;
    }

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:0;">${guias.length} guías detectadas y agregadas a la lista de pendientes.</p>`;
    await this.cargarYRenderizarPendientes();
  },

  async cargarYRenderizarPendientes() {
    const cont = document.getElementById('lista-pendientes-cont');
    cont.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:14px 0 0;">Cargando pendientes...</p>`;

    const pendientes = await obtenerGuiasPendientes({ estado: 'PENDIENTE' });

    if (pendientes.length === 0) {
      cont.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:14px 0 0;">No hay guías pendientes por ahora.</p>`;
      return;
    }

    cont.innerHTML = `
      <div class="card" style="margin-top:14px;">
        <p class="card-title">Guías pendientes (${pendientes.length})</p>
        <div id="tabla-pendientes"></div>
      </div>
    `;

    const tabla = document.getElementById('tabla-pendientes');
    tabla.innerHTML = pendientes.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-light);">
        <div>
          <div style="font-size:12.5px; font-weight:600;">${escapeHtml(p.gr)}</div>
          <div style="font-size:11px; color:var(--text-secondary);">${escapeHtml(p.cliente || '-')} · ${escapeHtml(p.destino || 'sin destino')} · ${(p.items || []).length} ítems</div>
        </div>
        <button class="btn-text" data-resolver="${p.id}">Resolver</button>
      </div>
    `).join('');

    tabla.querySelectorAll('[data-resolver]').forEach(btn => {
      btn.addEventListener('click', () => this.resolverPendiente(pendientes.find(p => String(p.id) === btn.dataset.resolver)));
    });
  },

  resolverPendiente(pendiente) {
    this._guiaActivaId = pendiente.id;
    this.activarModoManual();

    document.getElementById('f-gr').value = pendiente.gr;
    if (pendiente.cliente) document.getElementById('f-cliente').value = pendiente.cliente;
    if (pendiente.destino) document.getElementById('f-destino').value = pendiente.destino;
    const consig = [pendiente.consignatario_1, pendiente.consignatario_2].filter(Boolean).join(' / ');
    if (consig) document.getElementById('f-consignatarios').value = consig;

    this._filas = (pendiente.items || []).map(it => ({
      sku: it.sku || '', cantidad: it.cantidad != null ? String(it.cantidad) : '',
      serie: it.serie || '', stockInfo: null, estadoValidacion: null
    }));
    if (this._filas.length === 0) {
      this._filas = [{ sku: '', cantidad: '', serie: '', stockInfo: null, estadoValidacion: null }];
    }
    this.renderFilas();
    this.verificarStockTodas();
  },

  // ============================================================
  // COMPARTIDO: tabla de filas, verificacion de stock, crear orden
  // ============================================================
  renderFilas() {
    const tbody = document.getElementById('filas-body');
    if (!tbody) return;

    tbody.innerHTML = this._filas.map((f, i) => {
      let stockCell = '<span style="color:var(--text-tertiary); font-size:11px;">-</span>';
      if (f.checking) {
        stockCell = '<span style="color:var(--text-tertiary); font-size:11px;">Buscando...</span>';
      } else if (f.sku && f.stockInfo) {
        if (f.stockInfo.length === 0) {
          stockCell = '<span class="pill pill-danger">No encontrado</span>';
        } else {
          const totalDisp = f.stockInfo.reduce((sum, s) => sum + Number(s.cantidad), 0);
          const cantPedida = Number(f.cantidad) || 0;
          const alcanza = cantPedida === 0 || cantPedida <= totalDisp;
          const ubicaciones = [...new Set(f.stockInfo.map(s => s.ubicacion_fisica || s.paleta_pedido).filter(Boolean))];
          const pillClass = alcanza ? 'pill-success' : 'pill-warning';
          const ubicTxt = ubicaciones.length > 0 ? ubicaciones.slice(0,2).join(', ') : 'sin ubicación';
          stockCell = `<span class="pill ${pillClass}">${formatNum(totalDisp)} en ${escapeHtml(ubicTxt)}</span>`;
          if (f.stockInfo.length > 1) stockCell += `<div style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">${f.stockInfo.length} lotes/tramos</div>`;
        }
      }

      let valCell = '<span style="color:var(--text-tertiary); font-size:11px;">-</span>';
      if (f.estadoValidacion === 'OK') valCell = '<span class="pill pill-success">Confirmado</span>';
      else if (f.estadoValidacion === 'CORREGIDO') valCell = `<span class="pill pill-warning" title="${escapeHtml(f.notaValidacion || '')}">Corregido por guía</span>`;
      else if (f.estadoValidacion === 'SOLO_EN_PDF') valCell = '<span class="pill pill-danger">Solo en guía — revisar</span>';

      return `
        <tr>
          <td class="col-sku"><input type="text" value="${escapeHtml(f.sku)}" data-i="${i}" data-f="sku" placeholder="SKU" /></td>
          <td class="col-cant"><input type="number" value="${escapeHtml(f.cantidad)}" data-i="${i}" data-f="cantidad" placeholder="0" min="0" step="any" /></td>
          <td class="col-stock">${stockCell}</td>
          <td class="col-val">${valCell}</td>
          <td class="col-del"><span class="del-icon" data-del="${i}"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></span></td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = Number(e.target.dataset.i);
        const f = e.target.dataset.f;
        const cursorPos = e.target.selectionStart;
        this._filas[i][f] = e.target.value;
        if (f === 'sku') {
          this._filas[i].stockInfo = null;
          if (e.target.value.trim().length >= 3) {
            this._filas[i].checking = true;
            clearTimeout(this._checkTimeout);
            this._checkTimeout = setTimeout(() => this.verificarStock(i), 400);
          }
        }
        this.renderFilas();
        const newInput = tbody.querySelector(`input[data-i="${i}"][data-f="${f}"]`);
        if (newInput) { newInput.focus(); newInput.setSelectionRange(cursorPos, cursorPos); }
      });
    });

    tbody.querySelectorAll('[data-del]').forEach(el => {
      el.addEventListener('click', () => {
        const i = Number(el.dataset.del);
        this._filas.splice(i, 1);
        if (this._filas.length === 0) this._filas = [{ sku: '', cantidad: '', serie: '', stockInfo: null, estadoValidacion: null }];
        this.renderFilas();
      });
    });
  },

  async verificarStock(index) {
    const sku = this._filas[index].sku.trim();
    if (!sku) { this._filas[index].checking = false; return; }
    const resultados = await buscarStockPorSKU(sku, true);
    if (this._filas[index].sku.trim() === sku) {
      this._filas[index].stockInfo = resultados;
      this._filas[index].checking = false;
      this.renderFilas();
    }
  },

  async verificarStockTodas() {
    for (let i = 0; i < this._filas.length; i++) {
      this._filas[i].checking = true;
      await this.verificarStock(i);
    }
  },

  async crearOrdenPicking() {
    const btn = document.getElementById('btn-crear');
    const gr = document.getElementById('f-gr').value.trim();
    const fecha = document.getElementById('f-fecha').value;
    const cliente = document.getElementById('f-cliente').value;
    const destino = document.getElementById('f-destino').value.trim();
    const contrata = document.getElementById('f-contrata').value.trim();
    const consignatarios = document.getElementById('f-consignatarios').value.trim();

    const itemsValidos = this._filas.filter(f => f.sku.trim() && Number(f.cantidad) > 0);
    if (itemsValidos.length === 0) {
      alert('Agrega al menos un ítem con SKU y cantidad.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Generando...';

    const items = itemsValidos.map(f => {
      const stockInfo = f.stockInfo && f.stockInfo.length > 0 ? f.stockInfo[0] : null;
      return {
        stock_id: stockInfo ? stockInfo.id : null,
        sku: f.sku.trim(),
        descripcion: stockInfo ? stockInfo.descripcion : null,
        serie: f.serie ? f.serie.trim() : null,
        cantidad: Number(f.cantidad),
        paleta_pedido: stockInfo ? stockInfo.paleta_pedido : null,
        ubicacion_fisica: stockInfo ? stockInfo.ubicacion_fisica : null,
        encontrado: !!stockInfo
      };
    });

    const { data, error } = await crearDespacho({ gr, fecha, cliente, destino, contrata, consignatarios, items });

    if (error) {
      alert('Error al generar la orden. Revisa tu conexión.');
      btn.disabled = false;
      btn.textContent = 'Generar orden de picking';
      return;
    }

    if (this._guiaActivaId) {
      await marcarGuiaPendienteProcesada(this._guiaActivaId, data.id);
    }

    Router.navigate('picking', { despachoId: data.id });
  }
};

Router.register('nuevo-despacho', NuevoPickingView);
