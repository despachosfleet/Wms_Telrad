// ============================================================
// VISTA: NUEVA ORDEN DE PICKING
// 3 modos separados y expandibles: PDF (rapido, fuente principal),
// Excel (masivo, formato generico estandar -> lista de pendientes),
// Manual (escribir todo a mano).
// La validacion de stock (mudanza/ingreso nuevo/ubicacion) NO
// ocurre aqui -ocurre en Picking-, para no duplicar revision.
// ============================================================

const NuevoPickingView = {
  title: 'Nueva orden de picking',
  _modoAbierto: null,
  _filas: [],
  _guiaActivaId: null,

  render() {
    return `
      <div class="card">
        <p class="card-title">¿Cómo quieres registrar el picking?</p>
        <div class="expandable-group">
          <button class="expandable-header" data-toggle="pdf">
            <span>Importar PDF de la guía</span>
            <svg class="chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="expandable-body" id="body-pdf" style="display:none;"></div>

          <button class="expandable-header" data-toggle="excel">
            <span>Subir Excel masivo</span>
            <svg class="chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="expandable-body" id="body-excel" style="display:none;"></div>

          <button class="expandable-header" data-toggle="manual">
            <span>Registro manual</span>
            <svg class="chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="expandable-body" id="body-manual" style="display:none;"></div>
        </div>
      </div>
      <div id="formulario-orden-cont"></div>
    `;
  },

  afterRender() {
    this._modoAbierto = null;
    document.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => this.toggleModo(btn.dataset.toggle));
    });
  },

  toggleModo(modo) {
    const hayDatosSinGuardar = this._filas.some(f => f.sku && f.sku.trim());

    if (hayDatosSinGuardar && this._modoAbierto && this._modoAbierto !== modo) {
      this.confirmarCambioModo(modo);
      return;
    }

    this.cambiarModoReal(modo);
  },

  confirmarCambioModo(modoNuevo) {
    const modalCont = document.getElementById('modal-advertencia-cont') || (() => {
      const div = document.createElement('div');
      div.id = 'modal-advertencia-cont';
      document.body.appendChild(div);
      return div;
    })();

    modalCont.innerHTML = `
      <div class="modal-overlay" id="modal-overlay-cambio">
        <div class="modal-box">
          <p class="modal-title">⚠️ Vas a perder lo avanzado</p>
          <p class="modal-text">Ya tienes ítems cargados en este formulario. Si cambias de opción, se borrará todo lo que llevas hasta ahora.</p>
          <div class="modal-actions">
            <button class="btn-modal-secundario" id="btn-cancelar-cambio">Cancelar</button>
            <button class="btn-modal-primario" id="btn-confirmar-cambio" style="background:var(--danger-text);">Sí, descartar y cambiar</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modal-overlay-cambio').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay-cambio') modalCont.innerHTML = '';
    });
    document.getElementById('btn-cancelar-cambio').addEventListener('click', () => { modalCont.innerHTML = ''; });
    document.getElementById('btn-confirmar-cambio').addEventListener('click', () => {
      modalCont.innerHTML = '';
      this.cambiarModoReal(modoNuevo);
    });
  },

  cambiarModoReal(modo) {
    const yaAbierto = this._modoAbierto === modo;
    document.querySelectorAll('.expandable-body').forEach(b => b.style.display = 'none');
    document.querySelectorAll('.expandable-header').forEach(h => h.classList.remove('expanded'));

    if (yaAbierto) {
      this._modoAbierto = null;
      document.getElementById('formulario-orden-cont').innerHTML = '';
      return;
    }

    this._modoAbierto = modo;
    document.querySelector(`[data-toggle="${modo}"]`).classList.add('expanded');
    const body = document.getElementById(`body-${modo}`);
    body.style.display = 'block';

    if (modo === 'pdf') this.renderModoPDF(body);
    if (modo === 'excel') this.renderModoExcel(body);
    if (modo === 'manual') this.renderModoManual();
  },

  // ============================================================
  // MODO PDF
  // ============================================================
  renderModoPDF(body) {
    body.innerHTML = `
      <button class="btn-primary" id="btn-import-pdf" style="width:auto; padding:9px 18px;">Subir PDF</button>
      <input type="file" id="input-pdf" accept="application/pdf" style="display:none;" />
      <div id="pdf-status"></div>
    `;

    document.getElementById('btn-import-pdf').addEventListener('click', () => document.getElementById('input-pdf').click());
    document.getElementById('input-pdf').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.importarPDF(file);
      e.target.value = '';
    });
  },

  async importarPDF(file) {
    const statusEl = document.getElementById('pdf-status');
    statusEl.innerHTML = `<p class="status-msg status-loading">Leyendo guía...</p>`;

    const { data, error } = await procesarGuiaPDF(file);

    if (error || !data) {
      statusEl.innerHTML = `<p class="status-msg status-error">No se pudo leer el PDF: ${escapeHtml(error || 'error desconocido')}</p>`;
      return;
    }
    if (data.errores.length > 0) {
      statusEl.innerHTML = `<p class="status-msg status-warning">${escapeHtml(data.errores.join(' '))}</p>`;
      return;
    }

    statusEl.innerHTML = `<p class="status-msg status-loading">Validando ítems contra el catálogo...</p>`;

    const itemsCrudos = data.items.map(it => ({
      sku: it.codigo || '', descripcion: it.descripcion || '',
      cantidad: String(it.cantidad), serie: it.serie || '', identificadorPedido: it.identificadorPedido || ''
    }));

    const validados = await validarItemsContraMaestro(itemsCrudos);
    this._filas = validados;

    this.activarFormulario({
      gr: data.guia, destino: data.destino, razonSocial: data.razonSocial
    });

    const sinMaestro = validados.filter(f => f.enMaestro === false).length;
    let msg = `${data.items.length} ítems importados.`;
    if (sinMaestro > 0) msg += ` ${sinMaestro} SKU no encontrados en el catálogo — revisa antes de generar.`;
    statusEl.innerHTML = `<p class="status-msg status-success">${escapeHtml(msg)}</p>`;
  },

  // ============================================================
  // MODO EXCEL (formato generico estandar, no especial)
  // ============================================================
  renderModoExcel(body) {
    body.innerHTML = `
      <div class="format-guide">
        <p class="format-guide-title">El Excel debe tener estas columnas (en la primera fila):</p>
        <table class="format-guide-table">
          <tr><td><strong>GR</strong></td><td>Número de guía</td></tr>
          <tr><td><strong>SKU</strong></td><td>Código del producto</td></tr>
          <tr><td><strong>DESCRIPCION</strong></td><td>Descripción del producto</td></tr>
          <tr><td><strong>CANTIDAD</strong></td><td>Cantidad a pickear</td></tr>
          <tr><td><strong>SERIE</strong></td><td>Si aplica (opcional)</td></tr>
          <tr><td><strong>PEDIDO</strong></td><td>Si aplica (opcional)</td></tr>
          <tr><td><strong>CLIENTE</strong></td><td>Opcional</td></tr>
          <tr><td><strong>DESTINO</strong></td><td>Opcional</td></tr>
        </table>
        <p class="format-guide-note">El resto de columnas que traiga el archivo se ignoran. Si el Excel trae varias guías mezcladas, se separan automáticamente por GR.</p>
      </div>
      <button class="btn-primary" id="btn-subir-excel-masivo" style="width:auto; padding:9px 18px;">Seleccionar archivo Excel</button>
      <input type="file" id="input-excel-masivo" accept=".xlsx,.xls" style="display:none;" />
      <div id="masivo-status"></div>
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
    statusEl.innerHTML = `<p class="status-msg status-loading">Leyendo Excel...</p>`;

    const { data: guias, error } = await agruparGuiasGenerico(file);

    if (error || !guias) {
      statusEl.innerHTML = `<p class="status-msg status-error">${escapeHtml(error || 'Error al leer el archivo.')}</p>`;
      return;
    }

    const { data: guardadas, error: errGuardar } = await guardarGuiasPendientes(guias);

    if (errGuardar) {
      statusEl.innerHTML = `<p class="status-msg status-error">Se detectaron ${guias.length} guías, pero hubo un error al guardarlas. Revisa tu conexión.</p>`;
      return;
    }

    const nuevasGuardadas = guardadas ? guardadas.length : 0;
    const yaExistian = guias.length - nuevasGuardadas;
    let msg = `${nuevasGuardadas} guía(s) nueva(s) agregada(s) a pendientes.`;
    if (yaExistian > 0) msg += ` ${yaExistian} ya estaban en la lista (omitida(s)).`;

    statusEl.innerHTML = `<p class="status-msg status-success">${escapeHtml(msg)}</p>`;
    await this.cargarYRenderizarPendientes();
  },

  async cargarYRenderizarPendientes() {
    const cont = document.getElementById('lista-pendientes-cont');
    if (!cont) return;
    cont.innerHTML = `<p class="status-msg status-loading">Cargando pendientes...</p>`;

    const pendientes = await obtenerGuiasPendientes({ estado: 'PENDIENTE' });

    if (pendientes.length === 0) {
      cont.innerHTML = `<p class="status-msg status-loading">No hay guías pendientes por ahora.</p>`;
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
    this._modoAbierto = 'manual';
    document.querySelectorAll('.expandable-body').forEach(b => b.style.display = 'none');
    document.querySelectorAll('.expandable-header').forEach(h => h.classList.remove('expanded'));
    document.querySelector('[data-toggle="manual"]').classList.add('expanded');
    document.getElementById('body-manual').style.display = 'block';

    this._filas = (pendiente.items || []).map(it => ({
      sku: it.sku || '', descripcion: it.descripcion || '',
      cantidad: it.cantidad != null ? String(it.cantidad) : '',
      serie: it.serie || '', identificadorPedido: it.pedido_pallet || ''
    }));
    if (this._filas.length === 0) {
      this._filas = [{ sku: '', descripcion: '', cantidad: '', serie: '', identificadorPedido: '' }];
    }

    this.activarFormulario({
      gr: pendiente.gr, destino: pendiente.destino, razonSocial: pendiente.razon_social, cliente: pendiente.cliente
    });
  },

  // ============================================================
  // MODO MANUAL
  // ============================================================
  renderModoManual() {
    if (this._filas.length === 0) {
      this._filas = [{ sku: '', descripcion: '', cantidad: '', serie: '', identificadorPedido: '' }];
    }
    this.activarFormulario({});
  },

  // ============================================================
  // FORMULARIO COMPARTIDO (cabecera + tabla de items)
  // ============================================================
  activarFormulario(datosIniciales) {
    const cont = document.getElementById('formulario-orden-cont');
    cont.innerHTML = `
      <div class="card">
        <p class="card-title">Datos de la guía</p>
        <div class="field-grid">
          <div class="field"><label>N° GR</label><input type="text" id="f-gr" /></div>
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
          <div class="field"><label>Destino</label><input type="text" id="f-destino" /></div>
          <div class="field" style="grid-column: span 2;"><label>Razón social / Destinatario</label><input type="text" id="f-razon-social" /></div>
          <div class="field"><label>Contrata</label><input type="text" id="f-contrata" /></div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Ítems de la guía</p>
          <button class="btn-text" id="btn-add-row">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar fila
          </button>
        </div>
        <div style="overflow-x:auto;">
          <table class="item-table">
            <thead>
              <tr><th class="col-sku">SKU</th><th>Descripción</th><th>Cant.</th><th>Serie</th><th>Pedido</th><th class="col-del"></th></tr>
            </thead>
            <tbody id="filas-body"></tbody>
          </table>
        </div>
      </div>

      <div class="hint-box">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>La validación contra stock (mudanza o ingreso nuevo, ubicación) se hace al pickear, no aquí.</p>
      </div>

      <button class="btn-primary" id="btn-crear">Generar orden de picking</button>
    `;

    document.getElementById('f-fecha').value = new Date().toISOString().slice(0, 10);
    if (datosIniciales.gr) document.getElementById('f-gr').value = datosIniciales.gr;
    if (datosIniciales.destino) document.getElementById('f-destino').value = datosIniciales.destino;
    if (datosIniciales.razonSocial) document.getElementById('f-razon-social').value = datosIniciales.razonSocial;
    if (datosIniciales.cliente) document.getElementById('f-cliente').value = datosIniciales.cliente;

    document.getElementById('btn-add-row').addEventListener('click', () => {
      this._filas.push({ sku: '', descripcion: '', cantidad: '', serie: '', identificadorPedido: '' });
      this.renderFilas();
    });
    document.getElementById('btn-crear').addEventListener('click', () => this.crearOrdenPicking());

    this.renderFilas();
  },

  renderFilas() {
    const tbody = document.getElementById('filas-body');
    if (!tbody) return;

    tbody.innerHTML = this._filas.map((f, i) => `
      <tr>
        <td class="col-sku">
          <input type="text" value="${escapeHtml(f.sku)}" data-i="${i}" data-f="sku" />
          ${f.enMaestro === false ? '<div class="sku-warning">No está en el catálogo</div>' : ''}
        </td>
        <td><input type="text" value="${escapeHtml(f.descripcion || '')}" data-i="${i}" data-f="descripcion" /></td>
        <td><input type="number" value="${escapeHtml(f.cantidad)}" data-i="${i}" data-f="cantidad" min="0" step="any" /></td>
        <td><input type="text" value="${escapeHtml(f.serie || '')}" data-i="${i}" data-f="serie" /></td>
        <td><input type="text" value="${escapeHtml(f.identificadorPedido || '')}" data-i="${i}" data-f="identificadorPedido" /></td>
        <td class="col-del"><span class="del-icon" data-del="${i}"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></span></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = Number(e.target.dataset.i);
        const f = e.target.dataset.f;
        const cursorPos = e.target.selectionStart;
        this._filas[i][f] = e.target.value;
        const newInput = tbody.querySelector(`input[data-i="${i}"][data-f="${f}"]`);
        if (newInput) { newInput.setSelectionRange(cursorPos, cursorPos); }
      });
    });

    tbody.querySelectorAll('[data-del]').forEach(el => {
      el.addEventListener('click', () => {
        const i = Number(el.dataset.del);
        this._filas.splice(i, 1);
        if (this._filas.length === 0) this._filas = [{ sku: '', descripcion: '', cantidad: '', serie: '', identificadorPedido: '' }];
        this.renderFilas();
      });
    });
  },

  async crearOrdenPicking() {
    const btn = document.getElementById('btn-crear');
    const gr = document.getElementById('f-gr').value.trim();
    const fecha = document.getElementById('f-fecha').value;
    const cliente = document.getElementById('f-cliente').value;
    const destino = document.getElementById('f-destino').value.trim();
    const razonSocial = document.getElementById('f-razon-social').value.trim();
    const contrata = document.getElementById('f-contrata').value.trim();

    const itemsValidos = this._filas.filter(f => f.sku.trim() && Number(f.cantidad) > 0);
    if (itemsValidos.length === 0) {
      alert('Agrega al menos un ítem con SKU y cantidad.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Generando...';

    const items = itemsValidos.map(f => ({
      stock_id: null,
      sku: f.sku.trim(),
      descripcion: f.descripcion ? f.descripcion.trim() : null,
      serie: f.serie ? f.serie.trim() : null,
      cantidad: Number(f.cantidad),
      paleta_pedido: f.identificadorPedido ? f.identificadorPedido.trim() : null,
      ubicacion_fisica: null,
      encontrado: false
    }));

    const { data, error } = await crearDespacho({
      gr, fecha, cliente, destino, razonSocial,
      contrata, consignatarios: null,
      observaciones: null,
      items
    });

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
