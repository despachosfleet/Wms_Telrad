// ============================================================
// RECEPCIÓN v2 — Flujos:
//   A) LPN  — pistolaje directo por serie, contenedor físico
//   B) Excel — sube Excel con pedido/GR
//   C) Manual — formulario ítem por ítem
//   D) Ver LPNs — lista y detalle
//   E) Imprimir lote LPN — generación masiva
// ============================================================

const RecepcionView = {
  title: 'Recepción',
  _flujo: null,
  _preview: [],
  _lpnActual: null,   // { id, codigo }
  _itemsLPN: [],      // ítems pistoleados en el LPN activo
  _pedidoActual: '',  // número de pedido activo
  _grActual: '',      // GR activa
  _manualItems: [],
  _sesionItems: [],   // todos los ítems de la sesión (varios LPNs)

  hasProgress() {
    return (
      (this._flujo === 'lpn'    && this._itemsLPN.length > 0) ||
      (this._flujo === 'manual' && this._manualItems.length > 0) ||
      (this._flujo === 'excel'  && this._preview.length > 0)
    );
  },

  saveState() {
    return {
      flujo: this._flujo, preview: this._preview,
      lpnActual: this._lpnActual, itemsLPN: this._itemsLPN,
      pedidoActual: this._pedidoActual, grActual: this._grActual,
      manualItems: this._manualItems, sesionItems: this._sesionItems,
    };
  },

  restoreState(s) {
    Object.assign(this, {
      _flujo: s.flujo, _preview: s.preview || [],
      _lpnActual: s.lpnActual, _itemsLPN: s.itemsLPN || [],
      _pedidoActual: s.pedidoActual || '', _grActual: s.grActual || '',
      _manualItems: s.manualItems || [], _sesionItems: s.sesionItems || [],
    });
    this.afterRender();
    if (this._flujo) {
      document.getElementById('recep-selector').style.display = 'none';
      this._renderFlujo(document.getElementById('recep-contenido'));
    }
  },

  // ── RENDER PRINCIPAL ─────────────────────────────────────
  render() {
    return `
      <div id="recep-selector">
        <div class="card" style="margin-bottom:0;">
          <p class="card-title">Recepción de mercadería</p>
          <p class="card-subtitle">Selecciona el flujo</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
            <button class="recep-opcion" data-flujo="lpn">
              <div class="recep-op-icon">📦</div>
              <div class="recep-op-titulo">Pistolaje LPN</div>
              <div class="recep-op-desc">Escaneas series directo. El sistema identifica el ítem y pedido automáticamente.</div>
            </button>
            <button class="recep-opcion" data-flujo="excel">
              <div class="recep-op-icon">📊</div>
              <div class="recep-op-titulo">Subir Excel</div>
              <div class="recep-op-desc">Ya pistoleaste en tu Excel y subiste al Sharepoint. Carga aquí para registrar.</div>
            </button>
            <button class="recep-opcion" data-flujo="manual">
              <div class="recep-op-icon">✏️</div>
              <div class="recep-op-titulo">Ingreso manual</div>
              <div class="recep-op-desc">Para ingresos pequeños o puntuales ítem por ítem.</div>
            </button>
            <button class="recep-opcion" data-flujo="lista-lpns">
              <div class="recep-op-icon">🗂️</div>
              <div class="recep-op-titulo">Ver LPNs</div>
              <div class="recep-op-desc">Consulta contenedores creados, su contenido y estado.</div>
            </button>
            <button class="recep-opcion" data-flujo="imprimir-lote" style="grid-column:1/-1;">
              <div class="recep-op-icon">🖨️</div>
              <div class="recep-op-titulo">Imprimir lote de LPNs</div>
              <div class="recep-op-desc">Genera e imprime etiquetas LPN en blanco para el rollo del operario.</div>
            </button>
          </div>
        </div>
      </div>
      <div id="recep-contenido"></div>
    `;
  },

  afterRender() {
    document.querySelectorAll('.recep-opcion').forEach(btn => {
      btn.addEventListener('click', () => {
        this._flujo = btn.dataset.flujo;
        document.getElementById('recep-selector').style.display = 'none';
        this._renderFlujo(document.getElementById('recep-contenido'));
      });
    });
  },

  _renderFlujo(c) {
    if (!c) c = document.getElementById('recep-contenido');
    const map = {
      'lpn': ()=>this._renderLPN(c),
      'excel': ()=>this._renderExcel(c),
      'manual': ()=>this._renderManual(c),
      'lista-lpns': ()=>this._renderListaLPNs(c),
      'imprimir-lote': ()=>this._renderImprimirLote(c),
    };
    if (map[this._flujo]) map[this._flujo]();
  },

  _btnVolver() {
    return `<button class="btn-secondary" id="btn-volver-recep" style="margin-bottom:12px;">← Volver</button>`;
  },

  _bindVolver(c) {
    document.getElementById('btn-volver-recep')?.addEventListener('click', () => {
      this._flujo = null; this._lpnActual = null;
      this._itemsLPN = []; this._preview = [];
      this._manualItems = []; this._sesionItems = [];
      this._pedidoActual = ''; this._grActual = '';
      if (c) c.innerHTML = '';
      document.getElementById('recep-selector').style.display = '';
    });
  },

  // ── FLUJO A — LPN ────────────────────────────────────────
  _renderLPN(c) {
    c.innerHTML = `
      ${this._btnVolver()}

      <!-- Header de sesión: LPN activo + Pedido + GR -->
      <div class="card" style="margin-bottom:8px;padding:10px 12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <div>
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">LPN Activo</label>
            <div style="font-family:monospace;font-weight:900;font-size:18px;color:var(--accent);" id="lpn-codigo-display">
              ${this._lpnActual?.codigo || '— Sin LPN —'}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button class="btn-secondary" id="btn-escanear-lpn" style="font-size:11px;padding:5px 8px;">
              📷 Escanear LPN del rollo
            </button>
            <input type="text" id="lpn-codigo-input" placeholder="O escribe el código LPN"
              style="font-family:monospace;font-size:12px;padding:4px 7px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-input);color:var(--text);">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° Pedido *</label>
            <input type="text" id="lpn-pedido" value="${escapeHtml(this._pedidoActual)}"
              placeholder="4400669281" style="font-size:12px;padding:5px 7px;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° GR</label>
            <input type="text" id="lpn-gr" value="${escapeHtml(this._grActual)}"
              placeholder="T022-00381" style="font-size:12px;padding:5px 7px;">
          </div>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          <button class="btn-primary" id="btn-activar-lpn" style="font-size:12px;padding:5px 12px;">
            ${this._lpnActual ? '✓ LPN Activo — Cambiar' : 'Activar LPN'}
          </button>
          <button class="btn-ghost" id="btn-cambiar-pedido" style="font-size:11px;padding:5px 10px;">Cambiar pedido/GR</button>
        </div>
        <div id="lpn-activar-msg" style="margin-top:6px;font-size:11px;"></div>
      </div>

      <!-- Panel de pistolaje -->
      <div class="card" style="margin-bottom:8px;padding:10px 12px;" id="panel-pistolaje" ${!this._lpnActual ? 'style="display:none;margin-bottom:8px;padding:10px 12px;"' : ''}>
        <p class="card-title" style="margin-bottom:8px;">Pistolaje</p>
        <div style="display:flex;gap:6px;margin-bottom:6px;">
          <input type="text" id="lpn-serie-input" placeholder="Escanea o escribe la serie"
            style="flex:1;font-family:monospace;font-size:13px;padding:8px 10px;border:2px solid var(--accent);border-radius:8px;background:var(--bg-input);color:var(--text);"
            autofocus>
          <button class="btn-icon btn-scan" id="btn-scan-serie-lpn" title="Escanear serie" style="flex-shrink:0;padding:8px;">
            <svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-3M16 16h.01M16 21h-2v-2M8 21H3v-3M8 12H3v-4M21 12V8h-5M12 3v5M12 12v1M12 16v5"/></svg>
          </button>
        </div>
        <div id="lpn-serie-resultado" style="min-height:48px;margin-bottom:6px;padding:6px 8px;border-radius:6px;background:var(--bg-row-alt);font-size:12px;">
          Escanea una serie para identificar el ítem automáticamente.
        </div>
        <!-- Para ítems sin serie -->
        <details style="margin-bottom:6px;">
          <summary style="font-size:11px;color:var(--text-tertiary);cursor:pointer;">Sin serie / Ítem lotizado</summary>
          <div style="padding:8px 0;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
            <div class="field" style="margin:0;">
              <label style="font-size:9px;">SKU</label>
              <input type="text" id="lpn-sku-manual" style="font-size:12px;padding:5px 7px;">
            </div>
            <div class="field" style="margin:0;">
              <label style="font-size:9px;">Cantidad</label>
              <input type="number" id="lpn-cant-manual" value="1" min="1" style="font-size:12px;padding:5px 7px;">
            </div>
          </div>
          <button class="btn-secondary" id="btn-agregar-lotizado" style="font-size:11px;padding:4px 10px;margin-top:4px;">+ Agregar lotizado</button>
        </details>
      </div>

      <!-- Lista de ítems del LPN activo -->
      <div class="card" style="margin-bottom:8px;padding:10px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <p class="card-title" style="margin:0;">
            LPN actual — <span id="lpn-items-count">0</span> ítem(s)
          </p>
          <button class="btn-secondary" id="btn-cerrar-lpn"
            style="font-size:11px;padding:4px 10px;display:${this._lpnActual && this._itemsLPN.length > 0 ? '' : 'none'}">
            Cerrar LPN ✓
          </button>
        </div>
        <div id="lpn-items-lista">
          <div class="empty-state" style="padding:12px 0;">
            <div class="empty-icon">📭</div>Empieza pistoleando series.
          </div>
        </div>
      </div>

      <!-- Resumen de sesión (todos los LPNs cerrados) -->
      <div class="card" style="padding:10px 12px;" id="sesion-resumen" ${!this._sesionItems.length ? 'style="display:none;padding:10px 12px;"' : ''}>
        <p class="card-title" style="margin-bottom:6px;">
          Sesión — <span id="sesion-count">${this._sesionItems.length}</span> ítem(s) en ${[...new Set(this._sesionItems.map(i=>i._lpn))].length} LPN(s)
        </p>
        <div id="sesion-lista"></div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          <button class="btn-primary" id="btn-exportar-sesion">↓ Exportar Excel Sharepoint</button>
          <button class="btn-ghost" id="btn-nueva-sesion">Nueva recepción</button>
        </div>
      </div>
    `;

    this._bindVolver(c);
    this._bindLPNEventos();
    this._renderItemsLPN();
    if (this._sesionItems.length) this._renderSesion();
  },

  _bindLPNEventos() {
    // Escanear LPN del rollo
    document.getElementById('btn-escanear-lpn')?.addEventListener('click', () => {
      abrirEscaner('recep-contenido', (txt) => {
        const inp = document.getElementById('lpn-codigo-input');
        if (inp) inp.value = txt.trim().toUpperCase();
      }, err => alert('Error cámara: ' + err));
    });

    // Activar LPN
    document.getElementById('btn-activar-lpn')?.addEventListener('click', () => this._activarLPN());
    document.getElementById('lpn-codigo-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._activarLPN();
    });

    // Cambiar pedido/GR sin cerrar LPN
    document.getElementById('btn-cambiar-pedido')?.addEventListener('click', () => {
      const pedido = document.getElementById('lpn-pedido')?.value.trim();
      const gr     = document.getElementById('lpn-gr')?.value.trim();
      this._pedidoActual = pedido;
      this._grActual     = gr;
      const msg = document.getElementById('lpn-activar-msg');
      if (msg) msg.innerHTML = `<span style="color:var(--success-text);">✓ Pedido: ${escapeHtml(pedido)} | GR: ${escapeHtml(gr||'—')}</span>`;
    });

    // Escanear serie
    document.getElementById('btn-scan-serie-lpn')?.addEventListener('click', () => {
      abrirEscaner('recep-contenido', (txt) => {
        const inp = document.getElementById('lpn-serie-input');
        if (inp) { inp.value = txt; this._procesarSerie(txt); }
      }, err => alert('Error cámara: ' + err));
    });

    document.getElementById('lpn-serie-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = document.getElementById('lpn-serie-input')?.value.trim();
        if (val) this._procesarSerie(val);
      }
    });

    // Agregar lotizado
    document.getElementById('btn-agregar-lotizado')?.addEventListener('click', () => this._agregarLotizado());

    // Cerrar LPN
    document.getElementById('btn-cerrar-lpn')?.addEventListener('click', () => this._cerrarLPN());

    // Exportar sesión
    document.getElementById('btn-exportar-sesion')?.addEventListener('click', () => {
      exportarRecepcionAExcel(this._sesionItems, `recepcion_${new Date().toISOString().slice(0,10)}.xlsx`);
    });

    document.getElementById('btn-nueva-sesion')?.addEventListener('click', () => {
      if (confirm('¿Iniciar nueva sesión? Los LPNs ya cerrados quedan guardados en el sistema.')) {
        this._sesionItems = []; this._lpnActual = null;
        this._itemsLPN = []; this._pedidoActual = ''; this._grActual = '';
        const c = document.getElementById('recep-contenido');
        if (c) this._renderLPN(c);
      }
    });
  },

  async _activarLPN() {
    const codigoInput = document.getElementById('lpn-codigo-input')?.value.trim().toUpperCase();
    const pedido = document.getElementById('lpn-pedido')?.value.trim();
    const gr     = document.getElementById('lpn-gr')?.value.trim();
    const msg    = document.getElementById('lpn-activar-msg');

    if (!codigoInput) { if (msg) msg.innerHTML = '<span style="color:var(--danger-text);">Escanea o escribe el código LPN.</span>'; return; }
    if (!pedido)      { if (msg) msg.innerHTML = '<span style="color:var(--danger-text);">El N° de pedido es obligatorio.</span>'; return; }

    this._pedidoActual = pedido;
    this._grActual     = gr;

    // Crear LPN en Supabase si no existe
    const { data, error } = await crearLPN({ codigo: codigoInput, cliente: '', n_guia: gr, observaciones: pedido });
    if (error && !error.message?.includes('duplicate')) {
      if (msg) msg.innerHTML = `<span style="color:var(--danger-text);">Error: ${escapeHtml(String(error))}</span>`;
      return;
    }

    this._lpnActual = { id: data?.id, codigo: codigoInput };
    this._itemsLPN  = [];

    // Actualizar display
    document.getElementById('lpn-codigo-display').textContent = codigoInput;
    document.getElementById('lpn-codigo-input').value = '';
    const panel = document.getElementById('panel-pistolaje');
    if (panel) panel.style.display = '';
    document.getElementById('btn-activar-lpn').textContent = '✓ LPN Activo — Cambiar';
    document.getElementById('btn-cerrar-lpn').style.display = 'none';
    if (msg) msg.innerHTML = `<span style="color:var(--success-text);">✓ LPN ${escapeHtml(codigoInput)} activado. Pedido: ${escapeHtml(pedido)}</span>`;
    document.getElementById('lpn-serie-input')?.focus();
  },

  async _procesarSerie(serie) {
    if (!this._lpnActual) { alert('Primero activa un LPN.'); return; }
    const resultado = document.getElementById('lpn-serie-resultado');
    if (resultado) resultado.innerHTML = '<span style="color:var(--text-tertiary);">Buscando…</span>';

    // Buscar serie en stock
    const item = await buscarPorSerie(serie);

    const inp = document.getElementById('lpn-serie-input');
    if (inp) inp.value = '';

    if (item) {
      // Serie encontrada en stock
      if (resultado) resultado.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">✅</span>
          <div>
            <div style="font-weight:700;font-size:12px;">${escapeHtml(item.sku)}</div>
            <div style="font-size:11px;color:var(--text-secondary);">${escapeHtml(item.descripcion||'')}</div>
            <div style="font-size:10px;color:var(--text-tertiary);">Pedido: ${escapeHtml(item.paleta_pedido||this._pedidoActual)}</div>
          </div>
        </div>`;

      this._itemsLPN.push({
        MATERIAL: item.sku,
        DESCRIPCION: item.descripcion || '',
        SERIE: serie,
        CANTIDAD_RECIBIDA: 1,
        N_PEDIDO: item.paleta_pedido || this._pedidoActual,
        N_GUIA: this._grActual,
        CLIENTE: item.cliente || '',
        TIPO_INGRESO: 'NUEVO',
        FECHA: new Date().toLocaleDateString('es-PE'),
        _lpn: this._lpnActual.codigo,
        _stock_id: item.id,
      });
    } else {
      // Serie no encontrada — puede ser ingreso nuevo real
      if (resultado) resultado.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">⚠️</span>
          <div>
            <div style="font-weight:700;font-size:12px;color:var(--warning);">Serie no encontrada en stock</div>
            <div style="font-size:11px;">Se registrará como ingreso nuevo bajo pedido: <strong>${escapeHtml(this._pedidoActual)}</strong></div>
          </div>
        </div>`;

      this._itemsLPN.push({
        MATERIAL: '',
        DESCRIPCION: '',
        SERIE: serie,
        CANTIDAD_RECIBIDA: 1,
        N_PEDIDO: this._pedidoActual,
        N_GUIA: this._grActual,
        CLIENTE: '',
        TIPO_INGRESO: 'NUEVO',
        FECHA: new Date().toLocaleDateString('es-PE'),
        _lpn: this._lpnActual.codigo,
        _pendiente_sku: true,
      });
    }

    this._renderItemsLPN();
    document.getElementById('lpn-serie-input')?.focus();
  },

  _agregarLotizado() {
    if (!this._lpnActual) { alert('Primero activa un LPN.'); return; }
    const sku  = document.getElementById('lpn-sku-manual')?.value.trim().toUpperCase();
    const cant = Number(document.getElementById('lpn-cant-manual')?.value) || 0;
    if (!sku)  { alert('Ingresa el SKU.'); return; }
    if (!cant) { alert('Ingresa la cantidad.'); return; }
    this._itemsLPN.push({
      MATERIAL: sku, DESCRIPCION: '', SERIE: '-',
      CANTIDAD_RECIBIDA: cant, N_PEDIDO: this._pedidoActual,
      N_GUIA: this._grActual, CLIENTE: '', TIPO_INGRESO: 'NUEVO',
      FECHA: new Date().toLocaleDateString('es-PE'),
      _lpn: this._lpnActual.codigo,
    });
    document.getElementById('lpn-sku-manual').value = '';
    document.getElementById('lpn-cant-manual').value = '1';
    this._renderItemsLPN();
  },

  _renderItemsLPN() {
    const lista  = document.getElementById('lpn-items-lista');
    const count  = document.getElementById('lpn-items-count');
    const btnCerrar = document.getElementById('btn-cerrar-lpn');
    if (count) count.textContent = this._itemsLPN.length;
    if (btnCerrar) btnCerrar.style.display = this._lpnActual && this._itemsLPN.length > 0 ? '' : 'none';

    if (!lista) return;
    if (!this._itemsLPN.length) {
      lista.innerHTML = '<div class="empty-state" style="padding:12px 0;"><div class="empty-icon">📭</div>Sin ítems aún.</div>';
      return;
    }

    lista.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>SKU</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th></th></tr></thead>
          <tbody>
            ${this._itemsLPN.map((it,i)=>`
              <tr ${it._pendiente_sku ? 'style="background:var(--warning-bg);"' : ''}>
                <td style="color:var(--text-tertiary);">${i+1}</td>
                <td class="sku-cell">${escapeHtml(it.MATERIAL)||'<span style="color:var(--warning);">⚠ Sin SKU</span>'}</td>
                <td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE)||'-'}</td>
                <td style="font-weight:700;color:var(--accent);">${it.CANTIDAD_RECIBIDA}</td>
                <td style="font-size:10px;">${escapeHtml(it.N_PEDIDO)||'—'}</td>
                <td>
                  <button class="btn-icon" style="color:var(--danger);" onclick="RecepcionView._eliminarItemLPN(${i})">
                    <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _eliminarItemLPN(idx) { this._itemsLPN.splice(idx,1); this._renderItemsLPN(); },

  async _cerrarLPN() {
    if (!this._itemsLPN.length) { alert('Agrega ítems antes de cerrar el LPN.'); return; }
    const btn = document.getElementById('btn-cerrar-lpn');
    if (btn) { btn.disabled=true; btn.textContent='Guardando…'; }

    const { error, count } = await registrarItemsEnLPN(
      this._lpnActual.id, this._lpnActual.codigo, this._itemsLPN
    );

    if (error) {
      if (btn) { btn.disabled=false; btn.textContent='Cerrar LPN ✓'; }
      alert('Error al cerrar LPN: ' + error);
      return;
    }

    // Mover ítems a sesión
    this._sesionItems.push(...this._itemsLPN.map(i=>({...i, _lpn: this._lpnActual.codigo})));
    this._itemsLPN = [];
    this._lpnActual = null;

    // Reset display
    document.getElementById('lpn-codigo-display').textContent = '— Sin LPN —';
    document.getElementById('btn-activar-lpn').textContent = 'Activar LPN';
    const panel = document.getElementById('panel-pistolaje');
    if (panel) panel.style.display = 'none';
    if (btn) { btn.disabled=false; btn.textContent='Cerrar LPN ✓'; btn.style.display='none'; }

    this._renderItemsLPN();
    this._renderSesion();

    // Mostrar resumen
    const resumen = document.getElementById('sesion-resumen');
    if (resumen) resumen.style.display = '';

    const msg = document.getElementById('lpn-activar-msg');
    if (msg) msg.innerHTML = `<span style="color:var(--success-text);">✓ LPN cerrado — ${count} ítem(s) guardados. Escanea otro LPN para continuar.</span>`;
  },

  _renderSesion() {
    const lista  = document.getElementById('sesion-lista');
    const count  = document.getElementById('sesion-count');
    if (count) count.textContent = this._sesionItems.length;
    if (!lista)  return;

    const lpns = [...new Set(this._sesionItems.map(i=>i._lpn))];
    lista.innerHTML = lpns.map(lpn => {
      const items = this._sesionItems.filter(i=>i._lpn===lpn);
      const pedidos = [...new Set(items.map(i=>i.N_PEDIDO).filter(Boolean))];
      return `
        <div style="padding:6px 8px;background:var(--bg-row-alt);border-radius:6px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-family:monospace;font-weight:700;font-size:12px;color:var(--accent);">${escapeHtml(lpn)}</span>
            <span style="font-size:11px;color:var(--text-secondary);margin-left:8px;">${items.length} ítem(s)</span>
            <div style="font-size:10px;color:var(--text-tertiary);">Pedidos: ${pedidos.join(', ')||'—'}</div>
          </div>
          <span class="pill pill-success" style="font-size:10px;">Cerrado</span>
        </div>
      `;
    }).join('');
  },

  // ── FLUJO B — Excel ───────────────────────────────────────
  _renderExcel(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      <div class="card">
        <p class="card-title">Subir Excel de ingresos</p>
        <p class="card-subtitle" style="margin-bottom:10px;">
          Ingresa la GR antes de subir. Si el Excel tiene varios pedidos, el N° GR se asigna a todos.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">
          <div class="field" style="margin:0;">
            <label>N° GR (opcional)</label>
            <input type="text" id="excel-gr" placeholder="T022-00381" style="font-size:12px;padding:5px 7px;">
          </div>
          <div class="field" style="margin:0;">
            <label>Condición</label>
            <select id="excel-condicion" style="font-size:12px;padding:5px 7px;">
              <option value="NUEVO">NUEVO</option>
              <option value="DESMONTADO">DESMONTADO</option>
              <option value="DEVOLUCION">DEVOLUCIÓN</option>
              <option value="EXCEDENTE">EXCEDENTE</option>
            </select>
          </div>
        </div>
        <div class="file-drop" id="file-drop-recep">
          <div class="file-drop-icon">📥</div>
          <strong>Seleccionar o arrastrar Excel</strong>
          <span style="font-size:11px;color:var(--text-tertiary);">.xlsx — columnas en orden fijo</span>
        </div>
        <input type="file" id="input-recep" accept=".xlsx,.xls" style="display:none;">
        <div style="margin-top:10px;font-size:11px;color:var(--text-tertiary);">
          Orden de columnas: FECHA | N°PEDIDO | MATERIAL | DESCRIPCION | SERIE | CANTIDAD | N°GUIA | TIPO | OBS
        </div>
      </div>
      <div id="preview-recep"></div>
      <div id="resultado-recep"></div>
    `;
    this._bindVolver(c);

    const drop  = document.getElementById('file-drop-recep');
    const input = document.getElementById('input-recep');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag-over'); if (e.dataTransfer.files[0]) this._procesarExcel(e.dataTransfer.files[0]); });
    input.addEventListener('change', e => { if (e.target.files[0]) this._procesarExcel(e.target.files[0]); });
  },

  async _procesarExcel(file) {
    const preview = document.getElementById('preview-recep');
    preview.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo…</div>';
    try {
      await cargarXlsx();
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type:'array' });
      let filas = [];
      for (const nombre of wb.SheetNames) {
        const ws = wb.Sheets[nombre];
        const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
        if (data.length > 1) { filas = data; break; }
      }
      if (!filas.length) { preview.innerHTML='<div class="alert alert-danger">El Excel está vacío.</div>'; return; }

      const primeraFila = filas[0];
      const matchCount  = ['FECHA','PEDIDO','MATERIAL','SERIE','CANTIDAD'].filter(c => primeraFila.some(v=>String(v).toUpperCase().includes(c))).length;
      const filaInicio  = matchCount >= 2 ? 1 : 0;
      const gr = document.getElementById('excel-gr')?.value.trim() || '';
      const condicion = document.getElementById('excel-condicion')?.value || 'NUEVO';

      this._preview = filas.slice(filaInicio)
        .filter(r => r.some(v=>v!==''&&v!==null))
        .map(r => ({
          FECHA:             r[0],
          N_PEDIDO:          String(r[1]||'').trim(),
          MATERIAL:          String(r[2]||'').trim().toUpperCase(),
          DESCRIPCION:       String(r[3]||'').trim(),
          SERIE:             String(r[4]||'').trim(),
          CANTIDAD_RECIBIDA: Number(r[5])||0,
          N_GUIA:            gr || String(r[6]||'').trim(),
          TIPO_INGRESO:      condicion,
          OBSERVACIONES:     String(r[8]||'').trim(),
          CLIENTE:           '',
        }))
        .filter(r => r.MATERIAL && r.CANTIDAD_RECIBIDA > 0);

      if (!this._preview.length) { preview.innerHTML='<div class="alert alert-danger">Sin filas válidas.</div>'; return; }
      this._renderPreviewExcel(preview);
    } catch(err) {
      preview.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(err.message)}</div>`;
    }
  },

  _renderPreviewExcel(preview) {
    const pedidos = [...new Set(this._preview.map(r=>r.N_PEDIDO).filter(Boolean))];
    preview.innerHTML = `
      <div class="alert alert-info" style="margin-bottom:10px;">
        <strong>${this._preview.length} ítems</strong> en <strong>${pedidos.length} pedido(s)</strong>: ${pedidos.join(', ')}
      </div>
      <div class="table-wrap" style="margin-bottom:12px;">
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th>GR</th></tr></thead>
          <tbody>
            ${this._preview.slice(0,50).map(r=>`<tr>
              <td class="sku-cell">${escapeHtml(r.MATERIAL)}</td>
              <td class="serie-cell" style="font-size:10px;">${escapeHtml(r.SERIE)||'—'}</td>
              <td style="font-weight:700;">${r.CANTIDAD_RECIBIDA}</td>
              <td style="font-size:11px;">${escapeHtml(r.N_PEDIDO)||'—'}</td>
              <td style="font-size:11px;">${escapeHtml(r.N_GUIA)||'—'}</td>
            </tr>`).join('')}
            ${this._preview.length>50?`<tr><td colspan="5" style="text-align:center;font-size:11px;color:var(--text-tertiary);">…y ${this._preview.length-50} más</td></tr>`:''}
          </tbody>
        </table>
      </div>
      <div class="btn-row">
        <button class="btn-primary" id="btn-cargar-excel-recep">Cargar ${this._preview.length} ítems al stock</button>
        <button class="btn-secondary" id="btn-cancelar-excel-recep">Cancelar</button>
      </div>
    `;
    document.getElementById('btn-cargar-excel-recep')?.addEventListener('click', ()=>this._cargarExcel(preview));
    document.getElementById('btn-cancelar-excel-recep')?.addEventListener('click', ()=>{ preview.innerHTML=''; this._preview=[]; });
  },

  async _cargarExcel(preview) {
    const btn = document.getElementById('btn-cargar-excel-recep');
    if (btn) { btn.disabled=true; btn.textContent='Cargando…'; }
    const { error, count } = await registrarIngresosDesdeExcel(this._preview);
    const res = document.getElementById('resultado-recep');
    preview.innerHTML=''; this._preview=[];
    if (error) { if(res) res.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`; return; }
    if (res) res.innerHTML=`
      <div class="alert alert-success"><strong>✓ ${count} ítems cargados.</strong></div>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-secondary" onclick="Router.navigate('recepcion')">Cargar otro</button>
        <button class="btn-primary" onclick="Router.navigate('consulta')">Ver en consultas →</button>
      </div>`;
  },

  // ── FLUJO C — Manual ──────────────────────────────────────
  _renderManual(c) {
    if (!this._manualItems) this._manualItems=[];
    c.innerHTML = `
      ${this._btnVolver()}
      <div class="card" style="margin-bottom:10px;">
        <p class="card-title" style="margin-bottom:8px;">Ingreso manual</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <div class="field" style="margin:0;"><label style="font-size:9px;">Fecha</label><input type="date" id="man-fecha" value="${new Date().toISOString().slice(0,10)}" style="font-size:12px;padding:5px 7px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;">Cliente</label>
            <select id="man-cliente" style="font-size:12px;padding:5px 7px;">
              <option value="">—</option><option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
            </select>
          </div>
          <div class="field" style="margin:0;"><label style="font-size:9px;">N° Pedido *</label><input type="text" id="man-pedido" style="font-size:12px;padding:5px 7px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;">N° Guía</label><input type="text" id="man-nguia" style="font-size:12px;padding:5px 7px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;">SKU *</label>
            <div style="display:flex;gap:4px;">
              <input type="text" id="man-sku" style="flex:1;font-family:monospace;font-size:12px;padding:5px 7px;">
              <button class="btn-icon btn-scan" id="btn-scan-man-sku" style="flex-shrink:0;padding:5px;">
                <svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-3M16 16h.01"/></svg>
              </button>
            </div>
          </div>
          <div class="field" style="margin:0;"><label style="font-size:9px;">Serie</label>
            <div style="display:flex;gap:4px;">
              <input type="text" id="man-serie" style="flex:1;font-family:monospace;font-size:12px;padding:5px 7px;">
              <button class="btn-icon btn-scan" id="btn-scan-man-serie" style="flex-shrink:0;padding:5px;">
                <svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-3M16 16h.01"/></svg>
              </button>
            </div>
          </div>
          <div class="field" style="margin:0;"><label style="font-size:9px;">Cantidad *</label><input type="number" id="man-cantidad" value="1" min="1" style="font-size:12px;padding:5px 7px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;">Condición</label>
            <select id="man-tipo" style="font-size:12px;padding:5px 7px;">
              <option value="">—</option><option>NUEVO</option><option>DESMONTADO</option><option>DEVOLUCION</option><option>EXCEDENTE</option>
            </select>
          </div>
        </div>
        <button class="btn-primary" id="btn-agregar-manual">+ Agregar</button>
      </div>
      <div class="card" style="margin-bottom:10px;">
        <p class="card-title" style="margin-bottom:8px;">Ítems (<span id="man-count">0</span>)</p>
        <div id="man-items-lista"><div class="empty-state" style="padding:12px 0;"><div class="empty-icon">📝</div>Agrega ítems arriba</div></div>
      </div>
      <div id="man-resultado"></div>
    `;
    this._bindVolver(c);
    this._bindManualEventos();
    this._renderManualItems();
  },

  _bindManualEventos() {
    document.getElementById('btn-scan-man-sku')?.addEventListener('click', ()=>{
      abrirEscaner('recep-contenido', txt=>{ const i=document.getElementById('man-sku'); if(i) i.value=txt.toUpperCase(); }, e=>alert(e));
    });
    document.getElementById('btn-scan-man-serie')?.addEventListener('click', ()=>{
      abrirEscaner('recep-contenido', txt=>{ const i=document.getElementById('man-serie'); if(i) i.value=txt; }, e=>alert(e));
    });
    document.getElementById('btn-agregar-manual')?.addEventListener('click', ()=>{
      const sku  = document.getElementById('man-sku')?.value.trim().toUpperCase();
      const cant = Number(document.getElementById('man-cantidad')?.value)||0;
      if (!sku)  { alert('SKU obligatorio.'); return; }
      if (!cant) { alert('Cantidad obligatoria.'); return; }
      this._manualItems.push({
        FECHA:             document.getElementById('man-fecha')?.value||new Date().toISOString().slice(0,10),
        CLIENTE:           document.getElementById('man-cliente')?.value||'',
        N_PEDIDO:          document.getElementById('man-pedido')?.value.trim()||'',
        MATERIAL:          sku,
        DESCRIPCION:       '',
        SERIE:             document.getElementById('man-serie')?.value.trim()||'-',
        CANTIDAD_RECIBIDA: cant,
        N_GUIA:            document.getElementById('man-nguia')?.value.trim()||'',
        TIPO_INGRESO:      document.getElementById('man-tipo')?.value||'NUEVO',
        OBSERVACIONES:     '',
      });
      document.getElementById('man-sku').value='';
      document.getElementById('man-serie').value='';
      document.getElementById('man-cantidad').value='1';
      document.getElementById('man-sku')?.focus();
      this._renderManualItems();
    });
  },

  _renderManualItems() {
    const lista=document.getElementById('man-items-lista');
    const count=document.getElementById('man-count');
    if(count) count.textContent=this._manualItems.length;
    if(!lista) return;
    if(!this._manualItems.length){lista.innerHTML='<div class="empty-state" style="padding:12px 0;"><div class="empty-icon">📝</div>Agrega ítems</div>';return;}
    lista.innerHTML=`
      <div class="table-wrap" style="margin-bottom:8px;">
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th></th></tr></thead>
          <tbody>
            ${this._manualItems.map((it,i)=>`<tr>
              <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
              <td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE)||'—'}</td>
              <td style="font-weight:700;">${it.CANTIDAD_RECIBIDA}</td>
              <td style="font-size:11px;">${escapeHtml(it.N_PEDIDO)||'—'}</td>
              <td><button class="btn-icon" style="color:var(--danger);" onclick="RecepcionView._eliminarItemManual(${i})">
                <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn-primary" id="btn-guardar-manual">✓ Guardar ${this._manualItems.length} ítems</button>
    `;
    document.getElementById('btn-guardar-manual')?.addEventListener('click',()=>this._guardarManual());
  },

  _eliminarItemManual(idx){this._manualItems.splice(idx,1);this._renderManualItems();},

  async _guardarManual(){
    const btn=document.getElementById('btn-guardar-manual');
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    const {error,count}=await registrarIngresosDesdeExcel(this._manualItems);
    const res=document.getElementById('man-resultado');
    if(error){if(btn){btn.disabled=false;btn.textContent=`✓ Guardar ${this._manualItems.length} ítems`;}if(res)res.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;return;}
    this._manualItems=[];this._renderManualItems();
    if(res)res.innerHTML=`<div class="alert alert-success"><strong>✓ ${count} ítems registrados.</strong></div>`;
  },

  // ── IMPRIMIR LOTE LPN ─────────────────────────────────────
  async _renderImprimirLote(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      <div class="card">
        <p class="card-title">Generar lote de LPNs para impresión</p>
        <p class="card-subtitle" style="margin-bottom:12px;">
          Se generan etiquetas en blanco correlativas. Imprímelas en la Zebra y entrégalas al operario en rollo.
        </p>
        <div class="field">
          <label>Cantidad de LPNs a generar</label>
          <input type="number" id="lote-cantidad" value="50" min="1" max="500" style="max-width:120px;">
        </div>
        <div id="lote-preview-codigos" style="margin:10px 0;font-size:11px;color:var(--text-tertiary);">
          Los códigos se calcularán automáticamente desde el siguiente correlativo disponible.
        </div>
        <button class="btn-primary" id="btn-generar-lote">Generar e imprimir</button>
        <div id="lote-resultado" style="margin-top:10px;"></div>
      </div>
    `;
    this._bindVolver(c);

    // Mostrar preview de qué códigos se generarán
    const codigos = await generarLoteLPN(0);
    const primerCodigo = codigos[0] || 'LPN00001';
    document.getElementById('lote-preview-codigos').textContent =
      `Empezará desde ${primerCodigo}`;

    document.getElementById('btn-generar-lote')?.addEventListener('click', async () => {
      const cant = Number(document.getElementById('lote-cantidad')?.value) || 50;
      const btn  = document.getElementById('btn-generar-lote');
      const res  = document.getElementById('lote-resultado');
      btn.disabled=true; btn.textContent='Generando…';

      const codigos = await generarLoteLPN(cant);
      this._imprimirLoteLPN(codigos);

      btn.disabled=false; btn.textContent='Generar e imprimir';
      res.innerHTML=`<div class="alert alert-success">✓ ${cant} etiquetas enviadas a imprimir (${codigos[0]} — ${codigos[codigos.length-1]})</div>`;
    });
  },

  _imprimirLoteLPN(codigos) {
    const win = window.open('', '_blank', 'width=500,height=600');
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8"><title>LPNs</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        @page { size: 100mm 55mm; margin:0; }
        body { margin:0; }
        .etiqueta { width:100mm; height:55mm; display:flex; flex-direction:column; align-items:center; justify-content:center; page-break-after:always; padding:3mm; box-sizing:border-box; }
        .lpn-cod { font-size:14pt; font-weight:900; font-family:monospace; margin-bottom:2mm; }
        svg { width:90mm; height:22mm; }
        .lpn-sub { font-size:8pt; color:#666; margin-top:2mm; }
      </style>
    </head><body>
      ${codigos.map(c=>`
        <div class="etiqueta">
          <div class="lpn-cod">${c}</div>
          <svg id="bc-${c}"></svg>
          <div class="lpn-sub">Fleet WMS — Telrad</div>
        </div>
      `).join('')}
      <script>
        window.onload = function() {
          ${codigos.map(c=>`JsBarcode("#bc-${c}","${c}",{format:"CODE128",width:2.2,height:60,displayValue:false,margin:0});`).join('\n')}
          setTimeout(()=>window.print(),600);
        };
      <\/script>
    </body></html>`);
    win.document.close();
  },

  // ── VER LPNs ──────────────────────────────────────────────
  async _renderListaLPNs(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      <div class="card" style="margin-bottom:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Contenedores LPN</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <select id="lpn-filtro-estado" style="font-size:11px;padding:4px 6px;">
              <option value="">Todos</option>
              <option value="RECEPCION">En recepción</option>
              <option value="UBICADO">Ubicados</option>
            </select>
          </div>
        </div>
        <div id="lpn-lista-contenido"><div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div></div>
      </div>
    `;
    this._bindVolver(c);
    document.getElementById('lpn-filtro-estado')?.addEventListener('change', ()=>this._cargarLPNs());
    await this._cargarLPNs();
  },

  async _cargarLPNs() {
    const estado = document.getElementById('lpn-filtro-estado')?.value||null;
    const lista  = document.getElementById('lpn-lista-contenido');
    if (!lista) return;
    lista.innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';
    const lpns = await obtenerLPNs({ estado });
    if (!lpns.length) { lista.innerHTML='<div class="empty-state"><div class="empty-icon">📭</div>Sin LPNs creados.</div>'; return; }
    lista.innerHTML=`
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Código</th><th>Estado</th><th>Ítems</th><th>Ubicación</th><th>Fecha</th><th></th></tr></thead>
          <tbody>
            ${lpns.map(lp=>`<tr>
              <td style="font-family:monospace;font-weight:700;color:var(--accent);">${escapeHtml(lp.codigo)}</td>
              <td><span class="pill ${lp.estado==='UBICADO'?'pill-success':'pill-warning'}" style="font-size:10px;">${lp.estado==='UBICADO'?'Ubicado':'En recepción'}</span></td>
              <td style="font-weight:700;">${lp.stock?.[0]?.count??'?'}</td>
              <td style="font-size:11px;">${escapeHtml(lp.ubicacion||'RECEPCIÓN')}</td>
              <td style="font-size:11px;">${formatFecha(lp.creado_en)}</td>
              <td style="display:flex;gap:4px;">
                <button class="btn-secondary" style="font-size:10px;padding:3px 7px;" onclick="RecepcionView._verDetalleLPN('${lp.id}','${escapeHtml(lp.codigo)}')">Ver</button>
                <button class="btn-secondary" style="font-size:10px;padding:3px 7px;" onclick="RecepcionView._imprimirEtiquetaLPN(${JSON.stringify(lp).split('"').join('&quot;')})">🖨</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _verDetalleLPN(lpnId, lpnCodigo) {
    const c = document.getElementById('recep-contenido');
    c.innerHTML = `<button class="btn-secondary" id="btn-volver-det-lpn" style="margin-bottom:12px;">← Volver a LPNs</button>
      <div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>`;
    document.getElementById('btn-volver-det-lpn')?.addEventListener('click', ()=>{ this._flujo='lista-lpns'; this._renderListaLPNs(c); });
    const { lpn, items } = await obtenerLPNConItems(lpnId);
    if (!lpn) { c.innerHTML+='<div class="alert alert-danger">No se pudo cargar.</div>'; return; }
    const pedidos = [...new Set(items.map(i=>i.paleta_pedido).filter(Boolean))];
    c.innerHTML = `
      <button class="btn-secondary" id="btn-volver-det-lpn2" style="margin-bottom:12px;">← Volver a LPNs</button>
      <div class="card" style="border-left:3px solid var(--accent);margin-bottom:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div>
            <span style="font-size:20px;font-weight:900;color:var(--accent);font-family:monospace;">${escapeHtml(lpn.codigo)}</span>
            <span class="pill ${lpn.estado==='UBICADO'?'pill-success':'pill-warning'}" style="margin-left:8px;">${lpn.estado==='UBICADO'?'Ubicado':'En recepción'}</span>
          </div>
          <button class="btn-secondary" style="font-size:11px;" onclick="RecepcionView._imprimirEtiquetaLPN(${JSON.stringify(lpn).split('"').join('&quot;')})">🖨 Imprimir etiqueta</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:10px;">
          <div><div style="font-size:10px;color:var(--text-tertiary);">Pedidos</div><div style="font-size:11px;font-weight:600;">${pedidos.join(', ')||'—'}</div></div>
          <div><div style="font-size:10px;color:var(--text-tertiary);">Total ítems</div><div style="font-size:18px;font-weight:900;color:var(--accent);">${items.length}</div></div>
          <div><div style="font-size:10px;color:var(--text-tertiary);">Creado</div><div style="font-size:11px;">${formatFecha(lpn.creado_en)}</div></div>
        </div>
      </div>
      <div class="card">
        <p class="card-title" style="margin-bottom:8px;">Ítems (${items.length})</p>
        ${items.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>SKU</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th>Estado</th></tr></thead>
              <tbody>${items.map(it=>`<tr>
                <td class="sku-cell">${escapeHtml(it.sku)}</td>
                <td class="serie-cell" style="font-size:10px;">${escapeHtml(it.serie||'—')}</td>
                <td style="font-weight:700;">${formatNum(it.cantidad)}</td>
                <td style="font-size:11px;">${escapeHtml(it.paleta_pedido||'—')}</td>
                <td><span class="pill ${it.estado==='DISPONIBLE'?'pill-success':'pill-warning'}" style="font-size:10px;">${it.estado}</span></td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        ` : '<div class="empty-state" style="padding:12px 0;">Sin ítems.</div>'}
      </div>
    `;
    document.getElementById('btn-volver-det-lpn2')?.addEventListener('click', ()=>{ this._flujo='lista-lpns'; this._renderListaLPNs(c); });
  },

  _imprimirEtiquetaLPN(lpn) {
    if (typeof lpn==='string') try { lpn=JSON.parse(lpn.replace(/&quot;/g,'"')); } catch(e){ alert('Error.'); return; }
    const win = window.open('','_blank','width=420,height=320');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${lpn.codigo}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>@page{size:100mm 55mm;margin:0;}*{margin:0;padding:0;box-sizing:border-box;}
      body{width:100mm;height:55mm;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;padding:3mm;}
      .cod{font-size:14pt;font-weight:900;margin-bottom:2mm;}svg{width:90mm;height:22mm;}
      .info{display:flex;gap:6mm;margin-top:2mm;font-size:7pt;color:#333;}
      </style></head><body>
      <div class="cod">${lpn.codigo}</div>
      <svg id="bc"></svg>
      <div class="info">
        <span>Fleet WMS — Telrad</span>
        <span>${formatFecha(lpn.creado_en)}</span>
      </div>
      <script>window.onload=function(){JsBarcode("#bc","${lpn.codigo}",{format:"CODE128",width:2.2,height:60,displayValue:false,margin:0});setTimeout(()=>window.print(),400);};<\/script>
    </body></html>`);
    win.document.close();
  },
};

Router.register('recepcion', RecepcionView);
