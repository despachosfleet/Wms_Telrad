// ============================================================
// VISTA: RECEPCION / INGRESO NUEVO
// 2 modos: Manual (registro suelto, como ya existia) o Subir
// Excel del cliente (expectativa) -> confirmar fisicamente lo
// que realmente llego, con escaner opcional de series.
// ============================================================

const RecepcionView = {
  title: 'Recepción',
  _modo: null,
  _pedidoActivo: null,
  _itemsConfirmacion: [],

  render() {
    return `
      <div class="card" id="selector-modo-recepcion">
        <p class="card-title">¿Cómo quieres registrar la recepción?</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" id="btn-modo-rec-excel" style="flex:1; min-width:140px;">Subir Excel del cliente</button>
          <button class="btn-primary" id="btn-modo-rec-manual" style="flex:1; min-width:140px; background:var(--neutral-bg); color:var(--text-primary);">Registro manual</button>
        </div>
      </div>
      <div id="contenido-modo-recepcion"></div>
    `;
  },

  afterRender() {
    document.getElementById('btn-modo-rec-excel').addEventListener('click', () => this.activarModoExcel());
    document.getElementById('btn-modo-rec-manual').addEventListener('click', () => this.activarModoManual());
    this.activarModoExcel();
  },

  // ============================================================
  // MODO EXCEL: subir programación del cliente -> lista de espera
  // ============================================================
  activarModoExcel() {
    this._modo = 'excel';
    const cont = document.getElementById('contenido-modo-recepcion');
    cont.innerHTML = `
      <div class="card">
        <p class="card-title">Subir Excel del cliente</p>
        <p style="font-size:11px; color:var(--text-secondary); margin:0 0 10px;">Sube el Excel que te manda el cliente. Esto solo crea la lista de espera — no ingresa nada a stock todavía.</p>
        <div class="format-guide">
          <p class="format-guide-title">El Excel debe tener estas columnas (en la primera fila):</p>
          <table class="format-guide-table">
            <tr><td><strong>PEDIDO</strong></td><td>Número de pedido del cliente</td></tr>
            <tr><td><strong>SKU</strong></td><td>Código del producto</td></tr>
            <tr><td><strong>DESCRIPCION</strong></td><td>Descripción del producto</td></tr>
            <tr><td><strong>CANTIDAD</strong></td><td>Cantidad esperada</td></tr>
          </table>
          <p class="format-guide-note">El resto de columnas que traiga el archivo se ignoran. Solo debe haber 1 fila por SKU/pedido.</p>
        </div>
        <button class="btn-primary" id="btn-subir-excel-recepcion">Seleccionar archivo Excel</button>
        <input type="file" id="input-excel-recepcion" accept=".xlsx,.xls" style="display:none;" />
        <div id="rec-excel-status" style="margin-top:8px;"></div>
      </div>
      <div id="lista-recepciones-cont"></div>
    `;

    document.getElementById('btn-subir-excel-recepcion').addEventListener('click', () => document.getElementById('input-excel-recepcion').click());
    document.getElementById('input-excel-recepcion').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.subirExcelRecepcion(file);
      e.target.value = '';
    });

    this.cargarYRenderizarRecepciones();
  },

  async subirExcelRecepcion(file) {
    const statusEl = document.getElementById('rec-excel-status');
    statusEl.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:0;">Leyendo Excel...</p>`;

    const { data: pedidos, error } = await agruparPedidosDeExcel(file);

    if (error || !pedidos) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:0;">${escapeHtml(error || 'Error al leer el archivo.')}</p>`;
      return;
    }

    const { data: guardados, error: errGuardar } = await guardarRecepcionesPendientes(pedidos);

    if (errGuardar) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:0;">Se detectaron ${pedidos.length} pedidos, pero hubo un error al guardarlos. Revisa tu conexión.</p>`;
      return;
    }

    const nuevos = guardados ? guardados.length : 0;
    const yaExistian = pedidos.length - nuevos;
    let msg = `${nuevos} pedido(s) nuevo(s) agregado(s) a la lista de espera.`;
    if (yaExistian > 0) msg += ` ${yaExistian} ya estaban (omitido(s)).`;

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:0;">${escapeHtml(msg)}</p>`;
    await this.cargarYRenderizarRecepciones();
  },

  async cargarYRenderizarRecepciones() {
    const cont = document.getElementById('lista-recepciones-cont');
    cont.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:14px 0 0;">Cargando...</p>`;

    const pendientes = await obtenerRecepcionesPendientes();

    if (pendientes.length === 0) {
      cont.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:14px 0 0;">No hay pedidos en espera por ahora.</p>`;
      return;
    }

    cont.innerHTML = `
      <div class="card" style="margin-top:14px;">
        <p class="card-title">Pedidos en espera (${pendientes.length})</p>
        <div id="tabla-recepciones"></div>
      </div>
    `;

    const tabla = document.getElementById('tabla-recepciones');
    tabla.innerHTML = pendientes.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-light);">
        <div>
          <div style="font-size:12.5px; font-weight:600;">${escapeHtml(p.pedido)}</div>
          <div style="font-size:11px; color:var(--text-secondary);">${escapeHtml(p.cliente || '-')} · ${(p.items || []).length} ítems esperados</div>
        </div>
        <button class="btn-text" data-confirmar="${p.id}">Confirmar recepción</button>
      </div>
    `).join('');

    tabla.querySelectorAll('[data-confirmar]').forEach(btn => {
      btn.addEventListener('click', () => this.abrirConfirmacion(pendientes.find(p => String(p.id) === btn.dataset.confirmar)));
    });
  },

  abrirConfirmacion(pedido) {
    this._pedidoActivo = pedido;
    this._itemsConfirmacion = (pedido.items || []).map(it => ({
      sku: it.sku || '',
      descripcion: it.descripcion || '',
      cantidad_esperada: it.cantidad_esperada,
      cantidad_recibida: it.cantidad_esperada != null ? String(it.cantidad_esperada) : '',
      serie: '',
      observacion: ''
    }));

    const cont = document.getElementById('contenido-modo-recepcion');
    cont.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <p class="card-title" style="margin:0;">Confirmar recepción: ${escapeHtml(pedido.pedido)}</p>
          <button class="btn-text" id="btn-volver-lista">← Volver</button>
        </div>
        <p style="font-size:11px; color:var(--text-secondary); margin:6px 0 0;">Coloca la cantidad que realmente llegó (puede ser menos de lo esperado). Escanea la serie si el ítem lo requiere.</p>
      </div>
      <div id="confirmacion-items"></div>
      <button class="btn-primary" id="btn-confirmar-recepcion">Confirmar recepción</button>
      <div id="confirmar-status"></div>
      <div id="scanner-container"></div>
    `;

    document.getElementById('btn-volver-lista').addEventListener('click', () => this.activarModoExcel());
    document.getElementById('btn-confirmar-recepcion').addEventListener('click', () => this.confirmarRecepcionActiva());

    this.renderItemsConfirmacion();
  },

  renderItemsConfirmacion() {
    const cont = document.getElementById('confirmacion-items');
    cont.innerHTML = this._itemsConfirmacion.map((it, i) => `
      <div class="card" style="margin-bottom:8px;">
        <div style="font-size:12.5px; font-weight:600;">${escapeHtml(it.sku)}</div>
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:8px;">${escapeHtml(it.descripcion || '')} · esperado: ${it.cantidad_esperada != null ? formatNum(it.cantidad_esperada) : '-'}</div>
        <div class="field-grid">
          <div class="field">
            <label>Cantidad recibida</label>
            <input type="number" min="0" step="any" value="${escapeHtml(it.cantidad_recibida)}" data-i="${i}" data-f="cantidad_recibida" />
          </div>
          <div class="field">
            <label>Serie (opcional)</label>
            <div style="display:flex; gap:6px;">
              <input type="text" value="${escapeHtml(it.serie)}" data-i="${i}" data-f="serie" placeholder="" style="flex:1;" />
              <button class="btn-text" data-scan="${i}" style="white-space:nowrap;">📷</button>
            </div>
          </div>
          <div class="field" style="grid-column: span 2;">
            <label>Observación</label>
            <input type="text" value="${escapeHtml(it.observacion)}" data-i="${i}" data-f="observacion" placeholder="" />
          </div>
        </div>
      </div>
    `).join('');

    cont.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = Number(e.target.dataset.i);
        const f = e.target.dataset.f;
        this._itemsConfirmacion[i][f] = e.target.value;
      });
    });

    cont.querySelectorAll('[data-scan]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.scan);
        abrirEscaner('scanner-container', (texto) => {
          this._itemsConfirmacion[i].serie = texto;
          this.renderItemsConfirmacion();
        }, (errMsg) => {
          alert('No se pudo abrir la cámara: ' + errMsg);
        });
      });
    });
  },

  async confirmarRecepcionActiva() {
    const btn = document.getElementById('btn-confirmar-recepcion');
    const statusEl = document.getElementById('confirmar-status');

    const itemsValidos = this._itemsConfirmacion.filter(it => it.sku && Number(it.cantidad_recibida) > 0);
    if (itemsValidos.length === 0) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--warning); margin:6px 0 0;">Ningún ítem tiene cantidad recibida mayor a 0.</p>`;
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Registrando...';

    const { error } = await confirmarRecepcion(
      this._pedidoActivo.id,
      this._pedidoActivo.pedido,
      this._pedidoActivo.cliente,
      itemsValidos
    );

    btn.disabled = false;
    btn.textContent = 'Confirmar recepción';

    if (error) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:6px 0 0;">Error al registrar. Intenta de nuevo.</p>`;
      return;
    }

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:6px 0 0;">Recepción registrada. El stock quedó ubicado en "${escapeHtml(this._pedidoActivo.pedido)}".</p>`;
    setTimeout(() => this.activarModoExcel(), 1200);
  },

  // ============================================================
  // MODO MANUAL (registro suelto, igual al flujo original)
  // ============================================================
  activarModoManual() {
    this._modo = 'manual';
    const cont = document.getElementById('contenido-modo-recepcion');
    cont.innerHTML = `
      <div class="card">
        <p class="card-title">Registrar ingreso</p>
        <div class="field-grid">
          <div class="field" style="grid-column: span 2;">
            <label>SKU *</label>
            <input type="text" id="r-sku" placeholder="" />
          </div>
          <div class="field" style="grid-column: span 2;">
            <label>Descripción</label>
            <input type="text" id="r-descripcion" placeholder="" />
          </div>
          <div class="field">
            <label>Cantidad *</label>
            <input type="number" id="r-cantidad" placeholder="0" min="0" step="any" />
          </div>
          <div class="field">
            <label>Unidad</label>
            <select id="r-unidad">
              <option value="UND">UND</option>
              <option value="METROS">METROS</option>
              <option value="CORTE">CORTE</option>
            </select>
          </div>
          <div class="field" style="grid-column: span 2;">
            <label>Serie</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="r-serie" placeholder="" style="flex:1;" />
              <button class="btn-text" id="btn-scan-manual">📷</button>
            </div>
          </div>
          <div class="field">
            <label>Cliente</label>
            <select id="r-cliente">
              <option value="">Seleccionar</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
              <option value="AMERICATEL">AMERICATEL</option>
            </select>
          </div>
          <div class="field">
            <label>N° Pedido</label>
            <input type="text" id="r-pedido" placeholder="" />
          </div>
          <div class="field">
            <label>GR de ingreso</label>
            <input type="text" id="r-gr" placeholder="" />
          </div>
          <div class="field">
            <label>Fecha</label>
            <input type="date" id="r-fecha" />
          </div>
        </div>
      </div>

      <div class="hint-box">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>El número de pedido se usa como ubicación física por defecto (igual que una paleta), hasta que lo muevas a una ubicación real desde Movimientos.</p>
      </div>

      <button class="btn-primary" id="btn-guardar-ingreso">Registrar ingreso</button>
      <div id="msg-ingreso"></div>
      <div id="scanner-container"></div>
    `;

    document.getElementById('r-fecha').value = new Date().toISOString().slice(0, 10);
    document.getElementById('btn-guardar-ingreso').addEventListener('click', () => this.guardarManual());
    document.getElementById('btn-scan-manual').addEventListener('click', () => {
      abrirEscaner('scanner-container', (texto) => {
        document.getElementById('r-serie').value = texto;
      }, (errMsg) => alert('No se pudo abrir la cámara: ' + errMsg));
    });
  },

  async guardarManual() {
    const btn = document.getElementById('btn-guardar-ingreso');
    const msg = document.getElementById('msg-ingreso');

    const sku = document.getElementById('r-sku').value.trim();
    const cantidad = Number(document.getElementById('r-cantidad').value);
    const descripcion = document.getElementById('r-descripcion').value.trim();
    const serie = document.getElementById('r-serie').value.trim();
    const unidad_medida = document.getElementById('r-unidad').value;
    const cliente = document.getElementById('r-cliente').value;
    const paleta_pedido = document.getElementById('r-pedido').value.trim();
    const gr_ingreso = document.getElementById('r-gr').value.trim();
    const fecha_ingreso = document.getElementById('r-fecha').value;

    if (!sku || !cantidad || cantidad <= 0) {
      msg.innerHTML = '<p style="color:var(--danger-text); font-size:12px; margin:8px 0 0;">Completa al menos SKU y cantidad.</p>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Registrando...';

    const { error } = await registrarIngreso({
      sku, descripcion, serie, cantidad, unidad_medida,
      paleta_pedido: paleta_pedido || null, cliente, gr_ingreso, fecha_ingreso
    });

    btn.disabled = false;
    btn.textContent = 'Registrar ingreso';

    if (error) {
      msg.innerHTML = '<p style="color:var(--danger-text); font-size:12px; margin:8px 0 0;">Error al registrar. Intenta de nuevo.</p>';
      return;
    }

    msg.innerHTML = '<p style="color:var(--success-text); font-size:12px; margin:8px 0 0;">Ingreso registrado correctamente.</p>';

    ['r-sku','r-descripcion','r-cantidad','r-serie','r-pedido','r-gr'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('r-cliente').value = '';
    document.getElementById('r-unidad').value = 'UND';
  }
};

Router.register('recepcion', RecepcionView);
