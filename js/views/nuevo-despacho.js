// ============================================================
// VISTA: NUEVA ORDEN DE PICKING
// 2 modos: Manual (PDF directo, fuente principal y rapida) o
// Subir archivo (Excel masivo -> lista de guias pendientes,
// para cuando llega la programacion de cadena de suministro).
// La validacion de stock (mudanza/ingreso nuevo/ubicacion) NO
// ocurre aqui -ocurre despues, en la pantalla de Picking-, para
// no duplicar el trabajo de revision que ya se hace al pickear.
// ============================================================

const NuevoPickingView = {
  title: 'Nueva orden de picking',
  _modo: null,
  _filas: [],
  _guiaActivaId: null,

  render() {
    return `
      <div class="card" id="selector-modo">
        <p class="card-title">¿Cómo quieres registrar el picking?</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" id="btn-modo-manual" style="flex:1; min-width:140px;">Manual (PDF)</button>
          <button class="btn-primary" id="btn-modo-archivo" style="flex:1; min-width:140px; background:var(--neutral-bg); color:var(--text-primary);">Subir Excel</button>
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
  // MODO MANUAL: el PDF es la fuente principal y rapida
  // ============================================================
  activarModoManual() {
    this._modo = 'manual';
    this._filas = [{ sku: '', cantidad: '', serie: '', identificadorPedido: '' }];

    const cont = document.getElementById('contenido-modo');
    cont.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Importar guía (PDF)</p>
          <button class="btn-primary" id="btn-import-pdf" style="width:auto; padding:8px 18px;">Subir PDF</button>
        </div>
        <input type="file" id="input-pdf" accept="application/pdf" style="display:none;" />
        <div id="pdf-status"></div>
        <p style="font-size:11px; color:var(--text-secondary); margin:8px 0 0;">Extrae automáticamente GR, destino, razón social e ítems. Revisa y corrige antes de generar.</p>
      </div>

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
          <div class="field" style="grid-column: span 2;"><label>Razón social / Destinatario</label><input type="text" id="f-razon-social" placeholder="Opcional" /></div>
          <div class="field"><label>Contrata</label><input type="text" id="f-contrata" placeholder="Opcional" /></div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
          <p class="card-title" style="margin:0;">Ítems de la guía</p>
          <button class="btn-text" id="btn-add-row">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar fila
          </button>
        </div>
        <div style="overflow-x:auto;">
          <table class="item-table">
            <thead>
              <tr><th class="col-sku">SKU</th><th>Cant.</th><th>Serie / Pedido</th><th class="col-del"></th></tr>
            </thead>
            <tbody id="filas-body"></tbody>
          </table>
        </div>
      </div>

      <div class="hint-box">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>La validación contra stock (mudanza o ingreso nuevo, ubicación) se hace al pickear, no aquí — para no revisar dos veces.</p>
      </div>

      <button class="btn-primary" id="btn-crear">Generar orden de picking</button>
    `;

    document.getElementById('f-fecha').value = new Date().toISOString().slice(0, 10);

    document.getElementById('btn-add-row').addEventListener('click', () => {
      this._filas.push({ sku: '', cantidad: '', serie: '', identificadorPedido: '' });
      this.renderFilas();
    });

    document.getElementById('btn-import-pdf').addEventListener('click', () => document.getElementById('input-pdf').click());
    document.getElementById('input-pdf').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.importarPDF(file);
      e.target.value = '';
    });

    document.getElementById('btn-crear').addEventListener('click', () => this.crearOrdenPicking());

    this.renderFilas();
  },

  async importarPDF(file) {
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
    if (data.destino) document.getElementById('f-destino').value = data.destino;
    if (data.razonSocial) document.getElementById('f-razon-social').value = data.razonSocial;

    this._filas = data.items.map(it => ({
      sku: it.codigo || '',
      cantidad: String(it.cantidad),
      serie: it.serie || '',
      identificadorPedido: it.identificadorPedido || ''
    }));

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:6px 0 0;">${data.items.length} ítems importados. Revisa antes de generar.</p>`;
    this.renderFilas();
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

    const nuevasGuardadas = guardadas ? guardadas.length : 0;
    const yaExistian = guias.length - nuevasGuardadas;
    let msg = `${nuevasGuardadas} guía(s) nueva(s) agregada(s) a pendientes.`;
    if (yaExistian > 0) msg += ` ${yaExistian} ya estaban en la lista (omitida(s)).`;

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:0;">${escapeHtml(msg)}</p>`;
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
    if (pendiente.razon_social) document.getElementById('f-razon-social').value = pendiente.razon_social;

    this._filas = (pendiente.items || []).map(it => ({
      sku: it.sku || '', cantidad: it.cantidad != null ? String(it.cantidad) : '',
      serie: it.serie || '', identificadorPedido: it.pedido_pallet || ''
    }));
    if (this._filas.length === 0) {
      this._filas = [{ sku: '', cantidad: '', serie: '', identificadorPedido: '' }];
    }
    this.renderFilas();
  },

  // ============================================================
  // COMPARTIDO: tabla de filas y crear orden
  // ============================================================
  renderFilas() {
    const tbody = document.getElementById('filas-body');
    if (!tbody) return;

    tbody.innerHTML = this._filas.map((f, i) => `
      <tr>
        <td class="col-sku"><input type="text" value="${escapeHtml(f.sku)}" data-i="${i}" data-f="sku" placeholder="SKU" /></td>
        <td><input type="number" value="${escapeHtml(f.cantidad)}" data-i="${i}" data-f="cantidad" placeholder="0" min="0" step="any" /></td>
        <td><input type="text" value="${escapeHtml(f.serie || f.identificadorPedido || '')}" data-i="${i}" data-f="serie" placeholder="Serie o pedido" /></td>
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
        if (this._filas.length === 0) this._filas = [{ sku: '', cantidad: '', serie: '', identificadorPedido: '' }];
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

    // Aqui NO se busca stock todavia (eso se hace en Picking). Solo
    // se guarda el identificador de pedido como referencia para esa
    // busqueda posterior.
    const items = itemsValidos.map(f => ({
      stock_id: null,
      sku: f.sku.trim(),
      descripcion: null,
      serie: f.serie ? f.serie.trim() : null,
      cantidad: Number(f.cantidad),
      paleta_pedido: f.identificadorPedido ? f.identificadorPedido.trim() : null,
      ubicacion_fisica: null,
      encontrado: false
    }));

    const { data, error } = await crearDespacho({
      gr, fecha, cliente, destino,
      contrata, consignatarios: null,
      observaciones: razonSocial ? `Destinatario: ${razonSocial}` : null,
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
