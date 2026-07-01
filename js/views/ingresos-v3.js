// INGRESOS v3 — Módulo principal con pistolaje completo (Bandeja + SKU)
// Integra el diseño avanzado de recepcion.js
const IngresosView = {
  title: 'Ingresos',
  // Estado base
  _flujo: null, _preview: [], _manualItems: [],
  // Estado pistolaje
  _pistView: 'bandeja', _pistCadenaCargada: false,
  _pistFecha: new Date().toISOString().slice(0,10),
  _pistCliente: '', _pistCondicion: 'NUEVO',
  _pistLines: [], _pistExtraPedidos: [], _pistGuiaByPedido: {},
  _pistSelectedPedido: '', _pistLpn: '', _pistLpnInput: '',
  _pistPrintedLpns: [], _pistLpnIds: {}, _pistSerieLpn: {},
  _pistPool: [], _pistPoolTarget: {}, _pistPendientes: [],
  _pistSesionGuardada: [], _pistOpenBand: null, _pistOpenSku: null,
  _pistObsMap: {}, _pistShowAdd: false, _pistAddMode: 'sku',
  _pistAddPedido: '', _pistAddGuia: '', _pistAddSku: '', _pistAddDesc: '',
  _pistAddKind: 'serie', _pistAddExp: '', _pistShowExport: false, _pistCatalog: [],
  _pistFb: { icon:'⌨', msg:'Carga el Excel de referencia y pistolea las series.', tone:'idle' },

  hasProgress() {
    return (
      (this._flujo === 'lpn'    && this._pistHasProgress()) ||
      (this._flujo === 'manual' && this._manualItems.length > 0) ||
      (this._flujo === 'excel'  && this._preview.length > 0)
    );
  },

  saveState() {
    return {
      flujo: this._flujo, preview: this._preview, manualItems: this._manualItems,
      pist: {
        view: this._pistView, cadenaCargada: this._pistCadenaCargada,
        fecha: this._pistFecha, cliente: this._pistCliente, condicion: this._pistCondicion,
        lines: this._pistLines, extraPedidos: this._pistExtraPedidos, guiaByPedido: this._pistGuiaByPedido,
        selectedPedido: this._pistSelectedPedido, lpn: this._pistLpn, printedLpns: this._pistPrintedLpns,
        lpnIds: this._pistLpnIds, serieLpn: this._pistSerieLpn, pool: this._pistPool,
        poolTarget: this._pistPoolTarget, pendientes: this._pistPendientes,
        sesionGuardada: this._pistSesionGuardada, obsMap: this._pistObsMap, catalog: this._pistCatalog,
      },
    };
  },

  restoreState(s) {
    this._flujo = s.flujo; this._preview = s.preview || []; this._manualItems = s.manualItems || [];
    const p = s.pist || {};
    this._pistView = p.view || 'bandeja'; this._pistCadenaCargada = !!p.cadenaCargada;
    this._pistFecha = p.fecha || new Date().toISOString().slice(0,10);
    this._pistCliente = p.cliente || ''; this._pistCondicion = p.condicion || 'NUEVO';
    this._pistLines = p.lines || []; this._pistExtraPedidos = p.extraPedidos || [];
    this._pistGuiaByPedido = p.guiaByPedido || {}; this._pistSelectedPedido = p.selectedPedido || '';
    this._pistLpn = p.lpn || ''; this._pistPrintedLpns = p.printedLpns || [];
    this._pistLpnIds = p.lpnIds || {}; this._pistSerieLpn = p.serieLpn || {};
    this._pistPool = p.pool || []; this._pistPoolTarget = p.poolTarget || {};
    this._pistPendientes = p.pendientes || []; this._pistSesionGuardada = p.sesionGuardada || [];
    this._pistObsMap = p.obsMap || {}; this._pistCatalog = p.catalog || [];
    this.afterRender();
    if (this._flujo) {
      document.getElementById('ing-selector').style.display = 'none';
      this._renderFlujo(document.getElementById('ing-contenido'));
    }
  },

  render() {
    return `
    <div id="ing-selector">
      <div class="card">
        <p class="card-title">Ingresos</p>
        <p class="card-subtitle" style="margin-bottom:12px;">Selecciona cómo registrar el ingreso</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button class="recep-opcion" data-flujo="lpn">
            <div class="recep-op-icon">📦</div>
            <div class="recep-op-titulo">Pistolaje LPN</div>
            <div class="recep-op-desc">Carga el Excel de pedidos y pistolea por bandeja masiva o por SKU, con LPN.</div>
          </button>
          <button class="recep-opcion" data-flujo="excel">
            <div class="recep-op-icon">📊</div>
            <div class="recep-op-titulo">Subir Excel</div>
            <div class="recep-op-desc">Excel ya pistoleado, formato Sharepoint.</div>
          </button>
          <button class="recep-opcion" data-flujo="manual">
            <div class="recep-op-icon">✏️</div>
            <div class="recep-op-titulo">Ingreso manual</div>
            <div class="recep-op-desc">Ítems uno por uno.</div>
          </button>
          <button class="recep-opcion" data-flujo="lista-lpns">
            <div class="recep-op-icon">🗂️</div>
            <div class="recep-op-titulo">Ver LPNs</div>
            <div class="recep-op-desc">Contenedores creados, su contenido y estado.</div>
          </button>
        </div>
        <button class="recep-opcion" data-flujo="imprimir-lote" style="margin-top:10px;width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;">
          <div class="recep-op-icon" style="font-size:20px;">🖨️</div>
          <div><div class="recep-op-titulo">Imprimir lote LPN</div><div class="recep-op-desc">Etiquetas para el rollo del operario.</div></div>
        </button>
      </div>
    </div>
    <div id="ing-contenido"></div>`;
  },

  afterRender() {
    document.querySelectorAll('[data-flujo]').forEach(btn => btn.addEventListener('click', () => {
      this._flujo = btn.dataset.flujo;
      document.getElementById('ing-selector').style.display = 'none';
      this._renderFlujo(document.getElementById('ing-contenido'));
    }));
  },

  _renderFlujo(c) {
    if (!c) c = document.getElementById('ing-contenido');
    const map = {
      'lpn':          () => this._renderLPN(c),
      'excel':        () => this._renderExcel(c),
      'manual':       () => this._renderManual(c),
      'lista-lpns':   () => this._renderListaLPNs(c),
      'imprimir-lote':() => this._renderImprimirLote(c),
    };
    if (map[this._flujo]) map[this._flujo]();
  },

  _btnVolver() { return `<button class="btn-secondary" id="btn-volver-recep" style="margin-bottom:12px;">← Volver</button>`; },

  _bindVolver(c) {
    document.getElementById('btn-volver-recep')?.addEventListener('click', () => {
      this._flujo = null; this._preview = []; this._manualItems = [];
      this._pistCadenaCargada = false; this._pistLines = []; this._pistPool = [];
      this._pistPoolTarget = {}; this._pistSelectedPedido = ''; this._pistPendientes = [];
      if (c) c.innerHTML = '';
      document.getElementById('ing-selector').style.display = '';
    });
  },

  hasProgress() {
    return (
      (this._flujo === 'lpn'    && this._pistHasProgress()) ||
      (this._flujo === 'manual' && this._manualItems.length > 0) ||
      (this._flujo === 'excel'  && this._preview.length > 0)
    );
  },

  saveState() {
    return {
      flujo: this._flujo, preview: this._preview, manualItems: this._manualItems,
      pist: {
        view: this._pistView, cadenaCargada: this._pistCadenaCargada,
        fecha: this._pistFecha, cliente: this._pistCliente, condicion: this._pistCondicion,
        lines: this._pistLines, extraPedidos: this._pistExtraPedidos, guiaByPedido: this._pistGuiaByPedido,
        selectedPedido: this._pistSelectedPedido, lpn: this._pistLpn, printedLpns: this._pistPrintedLpns,
        lpnIds: this._pistLpnIds, serieLpn: this._pistSerieLpn, pool: this._pistPool, poolTarget: this._pistPoolTarget,
        pendientes: this._pistPendientes, sesionGuardada: this._pistSesionGuardada, obsMap: this._pistObsMap,
        catalog: this._pistCatalog,
      },
    };
  },

  restoreState(s) {
    this._flujo = s.flujo; this._preview = s.preview || []; this._manualItems = s.manualItems || [];
    const p = s.pist || {};
    this._pistView = p.view || 'bandeja'; this._pistCadenaCargada = !!p.cadenaCargada;
    this._pistFecha = p.fecha || new Date().toISOString().slice(0,10);
    this._pistCliente = p.cliente || ''; this._pistCondicion = p.condicion || 'NUEVO';
    this._pistLines = p.lines || []; this._pistExtraPedidos = p.extraPedidos || []; this._pistGuiaByPedido = p.guiaByPedido || {};
    this._pistSelectedPedido = p.selectedPedido || ''; this._pistLpn = p.lpn || ''; this._pistPrintedLpns = p.printedLpns || [];
    this._pistLpnIds = p.lpnIds || {}; this._pistSerieLpn = p.serieLpn || {}; this._pistPool = p.pool || []; this._pistPoolTarget = p.poolTarget || {};
    this._pistPendientes = p.pendientes || []; this._pistSesionGuardada = p.sesionGuardada || []; this._pistObsMap = p.obsMap || {};
    this._pistCatalog = p.catalog || [];
    this.afterRender();
    if (this._flujo) {
      document.getElementById('ing-selector').style.display = 'none';
      this._renderFlujo(document.getElementById('ing-contenido'));
    }
  },

  // ── RENDER PRINCIPAL ─────────────────────────────────────
  render() {
    return `
      <div id="ing-selector">
        <div class="card" style="margin-bottom:0;">
          <p class="card-title">Recepción de mercadería</p>
          <p class="card-subtitle">Selecciona el flujo</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
            <button class="recep-opcion" data-flujo="lpn">
              <div class="recep-op-icon">📦</div>
              <div class="recep-op-titulo">Pistolaje (Bandeja + SKU)</div>
              <div class="recep-op-desc">Carga el Excel de pedidos esperados y pistolea por bandeja masiva o por SKU, con LPN y export a Excel.</div>
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
      <div id="ing-contenido"></div>
    `;
  },

  afterRender() {
    document.querySelectorAll('.recep-opcion').forEach(btn => {
      btn.addEventListener('click', () => {
        this._flujo = btn.dataset.flujo;
        document.getElementById('ing-selector').style.display = 'none';
        this._renderFlujo(document.getElementById('ing-contenido'));
      });
    });
  },

  _renderFlujo(c) {
    if (!c) c = document.getElementById('ing-contenido');
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
      this._flujo = null;
      this._preview = []; this._manualItems = [];
      this._pistCadenaCargada = false; this._pistLines = []; this._pistExtraPedidos = [];
      this._pistGuiaByPedido = {}; this._pistSelectedPedido = ''; this._pistLpn = ''; this._pistLpnInput = '';
      this._pistPrintedLpns = []; this._pistLpnIds = {}; this._pistSerieLpn = {}; this._pistPool = [];
      this._pistPoolTarget = {}; this._pistPendientes = []; this._pistSesionGuardada = []; this._pistObsMap = {};
      this._pistOpenBand = null; this._pistOpenSku = null; this._pistShowAdd = false; this._pistShowExport = false;
      this._pistCatalog = [];
      if (c) c.innerHTML = '';
      document.getElementById('ing-selector').style.display = '';
    });
  },

  // ── FLUJO A — PISTOLEO (Bandeja masiva + Por SKU) ────────
  _renderLPN(c) {
    // Paso 0: sin Excel de referencia cargado todavía
    if (!this._pistCadenaCargada) {
      c.innerHTML = `
        ${this._btnVolver()}
        <div class="card">
          <p class="card-title">Pistolaje de recepción</p>
          <p class="card-subtitle" style="margin-bottom:12px;">
            Carga el Excel con los pedidos y SKUs esperados (el mismo formato de cadena de suministro, o uno simple
            con columnas Fecha | Pedido | SKU | Descripción | Serie | Cantidad | Guía). El sistema detecta el formato solo.
          </p>
          <div class="file-drop" id="pist-file-drop">
            <div class="file-drop-icon">📊</div>
            <strong>Seleccionar Excel de referencia</strong>
            <span style="font-size:11px;color:var(--text-tertiary);">.xlsx — detecta el formato automáticamente</span>
          </div>
          <input type="file" id="pist-input-cadena" accept=".xlsx,.xls" style="display:none;">
          <div id="pist-cadena-msg" style="margin-top:10px;font-size:12px;"></div>
        </div>
      `;
      this._bindVolver(c);
      const drop = document.getElementById('pist-file-drop');
      const input = document.getElementById('pist-input-cadena');
      drop?.addEventListener('click', () => input.click());
      drop?.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
      drop?.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
      drop?.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag-over'); if (e.dataTransfer.files[0]) this._pistCargarCadena(e.dataTransfer.files[0]); });
      input?.addEventListener('change', e => { if (e.target.files[0]) this._pistCargarCadena(e.target.files[0]); });
      return;
    }

    const peds = this._pistPedidos();
    if (!this._pistSelectedPedido && peds.length) this._pistSelectedPedido = peds[0];

    c.innerHTML = `
      <div class="pist-shell">
      <!-- Barra 1+2 fusionadas: volver+toggle+meta / pedido+lpn -->
      <div class="pist-shell-bar card" style="padding:7px 12px 8px;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button class="btn-secondary" id="btn-volver-recep" style="font-size:11px;padding:5px 9px;">← Volver</button>
          <div style="display:flex;background:var(--bg-row-alt);border:1px solid var(--border);border-radius:9px;padding:3px;gap:3px;">
            <button id="pist-btn-bandeja" style="border:none;cursor:pointer;font-size:12px;font-weight:700;padding:5px 12px;border-radius:6px;background:${this._pistView==='bandeja'?'var(--accent)':'transparent'};color:${this._pistView==='bandeja'?'#fff':'var(--text-secondary)'};">🗂 Bandeja masiva</button>
            <button id="pist-btn-sku" style="border:none;cursor:pointer;font-size:12px;font-weight:700;padding:5px 12px;border-radius:6px;background:${this._pistView==='sku'?'var(--accent)':'transparent'};color:${this._pistView==='sku'?'#fff':'var(--text-secondary)'};">▦ Por SKU</button>
          </div>
          <span style="font-size:11px;color:var(--success-text);">✓ ${peds.length} pedido(s)</span>
          <button class="btn-ghost" id="pist-btn-cambiar-excel" style="font-size:11px;">Cambiar Excel</button>
          <div style="flex:1"></div>
          <div style="display:flex;align-items:center;gap:5px;"><span style="font-size:11px;font-weight:600;color:var(--text-tertiary);">Fecha</span><input type="date" id="pist-fecha" value="${this._pistFecha}" style="font-family:monospace;font-size:11px;padding:3px 5px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-input);color:var(--text);"></div>
          <div style="display:flex;align-items:center;gap:5px;"><span style="font-size:11px;font-weight:600;color:var(--text-tertiary);">Cliente</span><select id="pist-cliente" style="font-size:11px;padding:3px 5px;">
            <option value="">Cliente…</option>
            ${['ENTEL','CLARO','TELRAD','STP PARRES','AMERICATEL'].map(cl=>`<option ${this._pistCliente===cl?'selected':''}>${cl}</option>`).join('')}
          </select></div>
          <div style="display:flex;align-items:center;gap:5px;"><span style="font-size:11px;font-weight:600;color:var(--text-tertiary);">Cond.</span><select id="pist-condicion" style="font-size:11px;padding:3px 5px;">
            ${['NUEVO','DESMONTADO','DEVOLUCION','EXCEDENTE'].map(cv=>`<option ${this._pistCondicion===cv?'selected':''}>${cv}</option>`).join('')}
          </select></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:7px;padding-top:7px;border-top:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:600;color:var(--text-tertiary);">Pedido</span><select id="pist-sel-pedido" style="font-family:monospace;font-weight:700;font-size:12px;padding:4px 6px;">
            ${peds.map(p=>{const st=this._pistStats(p); return `<option value="${escapeHtml(p)}" ${this._pistSelectedPedido===p?'selected':''}>${escapeHtml(p)} · ${st.d}/${st.t}</option>`;}).join('')}
          </select></div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:600;color:var(--text-tertiary);">Guía</span><input type="text" id="pist-guia" value="${escapeHtml(this._pistCurGuia())}" placeholder="T022-00381" style="font-family:monospace;font-size:12px;padding:4px 6px;width:120px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-input);color:var(--text);"></div>
          <div style="display:flex;align-items:center;gap:8px;background:var(--bg-row-alt);border:1px solid var(--border);border-radius:9px;padding:5px 8px;">
            <span style="font-size:9px;font-weight:800;letter-spacing:.4px;color:var(--text-tertiary);text-transform:uppercase;">LPN</span>
            <input type="text" id="pist-lpn-input" placeholder="escanea / escribe LPN…" value="${this._pistLpnInput}" style="font-family:monospace;font-size:12px;font-weight:700;border:1.5px solid var(--border-strong);border-radius:8px;padding:5px 8px;outline:none;width:120px;text-transform:uppercase;background:var(--bg-input);color:var(--text);">
            <span id="pist-lpn-cand"></span>
            <span id="pist-lpn-badge"></span>
            <button class="btn-secondary" id="pist-btn-buscar-vacio" style="font-size:11px;padding:5px 8px;">🔎 Vacío</button>
            <button class="btn-secondary" id="pist-btn-generar-lpn" style="font-size:11px;padding:5px 8px;">⚙ Generar</button>
            ${this._pistPrintedLpns.length>1?`<select id="pist-lpn-select" style="font-family:monospace;font-size:11px;">${this._pistPrintedLpns.map(cd=>`<option value="${cd}" ${this._pistLpn===cd?'selected':''}>${cd}</option>`).join('')}</select>`:''}
          </div>
          <div style="flex:1"></div>
          <button class="btn-secondary" id="pist-btn-add-sku" style="font-size:11px;padding:5px 9px;">+ SKU</button>
          <button class="btn-primary" id="pist-btn-add-pedido" style="font-size:11px;padding:5px 9px;">+ Nuevo pedido</button>
        </div>
      </div>

      <div id="pist-kpi-strip" class="pist-shell-bar"></div>

      ${this._pistView==='bandeja' ? `
        <div class="pist-shell-bar" style="padding:2px 0 6px;display:flex;align-items:center;gap:12px;">
          <input type="text" id="pist-scan" placeholder="Pistolea las series de corrido (de cualquier pedido) — caen a la bandeja y el sistema sugiere su SKU…" style="flex:1;font-family:monospace;font-size:14px;font-weight:600;padding:8px 12px;border:2px solid var(--accent);border-radius:9px;outline:none;background:var(--bg-input);color:var(--text);box-shadow:0 0 0 4px var(--accent-dim);" autofocus>
          <div id="pist-fb" style="min-width:260px;max-width:380px;"></div>
        </div>
        <div class="pist-split">
          <div class="pist-panel">
            <div class="pist-panel-head">
              <strong style="font-size:13px;">🗂 Bandeja de series</strong>
              <span id="pist-pool-label" style="font-size:11px;color:var(--text-tertiary);font-family:monospace;"></span>
              <div style="flex:1"></div>
              <button class="btn-secondary" id="pist-btn-asignar-sug" style="font-size:11px;">✓ Asignar sugeridas</button>
            </div>
            <div id="pist-pool-list" class="pist-panel-body"></div>
          </div>
          <div class="pist-panel">
            <div class="pist-panel-head">
              <strong style="font-size:13px;">Ítems · ${escapeHtml(this._pistSelectedPedido||'')}</strong>
            </div>
            <div id="pist-lines-list" class="pist-panel-body"></div>
          </div>
        </div>
      ` : `
        <div id="pist-fb" class="pist-shell-bar"></div>
        <div class="pist-panel" style="flex:1;min-height:0;margin-bottom:6px;">
          <div class="pist-panel-head" style="flex-wrap:wrap;">
            <strong style="font-size:13px;">Ítems · ${escapeHtml(this._pistSelectedPedido||'')}</strong>
            <span style="font-size:11px;color:var(--text-tertiary);">Abre un SKU y pistolea sus series · Enter salta al siguiente</span>
          </div>
          <div id="pist-sku-list" class="pist-panel-body"></div>
        </div>
      `}

      <!-- BARRA INFERIOR -->
      <div class="pist-bottombar card" style="padding:7px 12px;margin-bottom:0;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <div style="font-size:11px;color:var(--text-secondary);">Recepción total <strong id="pist-global" style="font-family:monospace;color:var(--text);"></strong></div>
        <div style="font-size:11px;color:var(--text-tertiary);"><strong id="pist-pool-count" style="font-family:monospace;"></strong> en bandeja</div>
        <div style="font-size:11px;color:var(--text-tertiary);"><strong id="pist-pend-count" style="font-family:monospace;"></strong> por guardar</div>
        <div style="flex:1"></div>
        <button class="btn-secondary" id="pist-btn-guardar" style="font-size:12px;padding:6px 11px;">💾 Guardar avance</button>
        <button class="btn-primary" id="pist-btn-exportar" style="font-size:12px;padding:6px 11px;">⬇ Exportar recepción</button>
      </div>

      <div id="pist-modal-root"></div>
      </div>
    `;

    this._bindVolver(c);
    this._bindPistEventos();
    this._pistRenderKPI();
    this._pistRenderPool();
    this._pistRenderLines();
    this._pistRenderLpnBadge();
    this._pistRenderFb();
    this._pistRenderModals();
  },

  _bindPistEventos() {
    document.getElementById('pist-btn-cambiar-excel')?.addEventListener('click', () => {
      if (!confirm('¿Cambiar el Excel de referencia? Se perderá el progreso de pistolaje actual no guardado.')) return;
      this._pistCadenaCargada = false; this._pistLines = []; this._pistPool = []; this._pistPoolTarget = {};
      this._pistSelectedPedido = ''; this._pistPendientes = [];
      const c = document.getElementById('ing-contenido'); if (c) this._renderLPN(c);
    });

    document.getElementById('pist-btn-bandeja')?.addEventListener('click', () => { this._pistView='bandeja'; const c=document.getElementById('ing-contenido'); if(c) this._renderLPN(c); });
    document.getElementById('pist-btn-sku')?.addEventListener('click', () => { this._pistView='sku'; const c=document.getElementById('ing-contenido'); if(c) this._renderLPN(c); });

    document.getElementById('pist-fecha')?.addEventListener('change', e => this._pistFecha = e.target.value);
    document.getElementById('pist-cliente')?.addEventListener('change', e => this._pistCliente = e.target.value);
    document.getElementById('pist-condicion')?.addEventListener('change', e => this._pistCondicion = e.target.value);

    document.getElementById('pist-sel-pedido')?.addEventListener('change', e => {
      this._pistSelectedPedido = e.target.value; this._pistOpenBand=null; this._pistOpenSku=null;
      const c = document.getElementById('ing-contenido'); if (c) this._renderLPN(c);
    });
    document.getElementById('pist-guia')?.addEventListener('change', e => { this._pistGuiaByPedido[this._pistSelectedPedido] = e.target.value.trim(); });

    const lpnInput = document.getElementById('pist-lpn-input');
    lpnInput?.addEventListener('input', e => { this._pistLpnInput = this._pistFmtLpn(e.target.value); e.target.value = this._pistLpnInput; this._pistRenderLpnBadge(); });
    lpnInput?.addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); this._pistActivarLpn(e.target.value); e.target.value=''; this._pistRenderLpnBadge(); } });
    document.getElementById('pist-btn-buscar-vacio')?.addEventListener('click', () => this._pistBuscarVacio());
    document.getElementById('pist-btn-generar-lpn')?.addEventListener('click', () => this._pistGenerarLpn());
    document.getElementById('pist-lpn-select')?.addEventListener('change', e => { this._pistLpn = e.target.value; this._pistRenderLpnBadge(); });

    document.getElementById('pist-btn-add-sku')?.addEventListener('click', () => this._pistOpenAddSku());
    document.getElementById('pist-btn-add-pedido')?.addEventListener('click', () => this._pistOpenAddPedido());

    // Scan (bandeja masiva)
    document.getElementById('pist-scan')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this._pistProcessBulk(e.target.value); e.target.value=''; }
    });

    // Delegación — bandeja (pool)
    const pool = document.getElementById('pist-pool-list');
    pool?.addEventListener('change', e => {
      const serie = e.target.dataset.serie; if (!serie) return;
      if (e.target.dataset.role === 'pedido') this._pistSetPoolPedido(serie, e.target.value);
      else if (e.target.dataset.role === 'sku') this._pistSetPoolSku(serie, e.target.value);
    });
    pool?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]'); if (!btn) return;
      const serie = btn.dataset.serie;
      if (btn.dataset.action === 'assign') this._pistAssignFromPool(serie);
      else if (btn.dataset.action === 'remove') this._pistRemoveFromPool(serie);
    });
    document.getElementById('pist-btn-asignar-sug')?.addEventListener('click', () => this._pistAssignAllSugg());

    // Delegación — lines (bandeja) / sku list
    ['pist-lines-list','pist-sku-list'].forEach(id => {
      const cont = document.getElementById(id); if (!cont) return;
      cont.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]'); if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'toggle') {
          const mode = btn.dataset.mode, lineId = btn.dataset.line;
          if (mode==='band') this._pistOpenBand = this._pistOpenBand===lineId?null:lineId;
          else this._pistOpenSku = this._pistOpenSku===lineId?null:lineId;
          this._pistRenderLines();
        } else if (action === 'topool') {
          this._pistReturnToPool(btn.dataset.line, btn.dataset.serie);
        } else if (action === 'removeserie') {
          this._pistRemoveSerie(btn.dataset.line, btn.dataset.serie);
        } else if (action === 'full') {
          const l = this._pistLines.find(x=>x.id===btn.dataset.line);
          if (l) { if (!this._pistLpn) { this._pistSetFb('⚠️','Activa un LPN antes de ingresar cantidad.','warn'); return; } l.qty = String(l.exp); this._pistQueueLote(l); this._pistRenderLines(); this._pistRenderKPI(); }
        }
      });
      cont.addEventListener('change', e => {
        if (e.target.dataset.role === 'qty') {
          const l = this._pistLines.find(x=>x.id===e.target.dataset.line);
          if (l) {
            if (!this._pistLpn) { this._pistSetFb('⚠️','Activa un LPN antes de ingresar cantidad.','warn'); e.target.value = l.qty||''; return; }
            l.qty = e.target.value; this._pistQueueLote(l); this._pistRenderKPI();
          }
        } else if (e.target.dataset.role === 'obs') {
          this._pistObsMap[e.target.dataset.line] = e.target.value;
        } else if (e.target.dataset.role === 'obsunit') {
          this._pistObsMap[e.target.dataset.line+':'+e.target.dataset.idx] = e.target.value;
        } else if (e.target.dataset.role === 'serie') {
          this._pistSetSerieSlot(e.target.dataset.line, Number(e.target.dataset.idx), e.target.value);
          this._pistRenderLines(); this._pistRenderKPI();
        }
      });
      cont.addEventListener('keydown', e => {
        if (e.target.dataset.role === 'serie' && e.key === 'Enter') {
          e.preventDefault();
          this._pistOnSerieKey(e.target.dataset.line, Number(e.target.dataset.idx), e);
        }
      });
    });

    document.getElementById('pist-btn-guardar')?.addEventListener('click', () => this._pistGuardarAvance());
    document.getElementById('pist-btn-exportar')?.addEventListener('click', () => { this._pistShowExport = true; this._pistRenderModals(); });
  },

  // ── Carga y parseo del Excel de referencia ───────────────
  async _pistCargarCadena(file) {
    const msg = document.getElementById('pist-cadena-msg');
    if (msg) msg.innerHTML = '<span style="color:var(--text-tertiary);">Leyendo…</span>';
    try {
      const porPedido = await this._pistParseExcelCadena(file);
      if (!porPedido.size) { if (msg) msg.innerHTML = '<div class="alert alert-danger">No se encontraron pedidos/SKUs válidos en el Excel.</div>'; return; }
      const lines = [];
      const catalog = [];
      let autoId = 0;
      for (const [pedido, orden] of porPedido) {
        this._pistGuiaByPedido[pedido] = orden.gr || this._pistGuiaByPedido[pedido] || '';
        const bySku = new Map();
        orden.items.forEach(it => {
          const key = it.sku;
          if (!bySku.has(key)) bySku.set(key, { serieRows: [], loteQty: 0, desc: it.descripcion || '' });
          const g = bySku.get(key);
          if (!g.desc && it.descripcion) g.desc = it.descripcion;
          if (it.serie) g.serieRows.push(it.serie);
          else g.loteQty += (it.cantidad || 1);
        });
        for (const [sku, g] of bySku) {
          if (g.serieRows.length) {
            const prefix = this._pistCommonPrefix(g.serieRows);
            lines.push({ id: 'p'+(autoId++), pedido, sku, desc: g.desc, kind:'serie', exp: g.serieRows.length, prefix, got: [], qty:'', serials: g.serieRows });
            catalog.push({ sku, desc: g.desc, prefix, kind:'serie' });
          }
          if (g.loteQty > 0) {
            lines.push({ id: 'p'+(autoId++), pedido, sku, desc: g.desc, kind:'lote', exp: g.loteQty, prefix:'', got: [], qty:'', serials: [] });
            catalog.push({ sku, desc: g.desc, prefix:'', kind:'lote' });
          }
        }
      }
      this._pistLines = lines;
      this._pistCatalog = catalog;
      this._pistCadenaCargada = true;
      this._pistSelectedPedido = '';
      const c = document.getElementById('ing-contenido');
      if (c) this._renderLPN(c);
    } catch (err) {
      if (msg) msg.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(err.message)}</div>`;
    }
  },

  _pistCommonPrefix(arr) {
    if (!arr.length) return '';
    let pre = arr[0].toUpperCase();
    for (let i=1;i<arr.length;i++) {
      const s = arr[i].toUpperCase();
      let j=0; while (j<pre.length && j<s.length && pre[j]===s[j]) j++;
      pre = pre.slice(0,j);
    }
    return pre.length >= 4 ? pre : '';
  },

  // Detecta automáticamente el formato: "cadena de suministro" (encabezados
  // CLIENTE/PEDIDO-PALLET/GR/SKU/...) o uno simple (columnas en orden fijo
  // FECHA|PEDIDO|SKU|DESCRIPCION|SERIE|CANTIDAD|GUIA|OBS).
  async _pistParseExcelCadena(file) {
    const ordenes = await extraerTodasLasOrdenes(file);
    const porPedido = new Map();
    if (ordenes.size) {
      for (const [gr, orden] of ordenes) {
        for (const item of orden.items) {
          const ped = item.pedido_pallet || gr;
          if (!porPedido.has(ped)) porPedido.set(ped, { pedido: ped, gr, items: [] });
          porPedido.get(ped).items.push(item);
        }
      }
      return porPedido;
    }
    await cargarXlsx();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type:'array', cellDates:true });
    let filas = [];
    for (const n of wb.SheetNames) {
      const ws = wb.Sheets[n];
      const d = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false });
      if (d.length > 1) { filas = d; break; }
    }
    if (!filas.length) return porPedido;
    const f0 = filas[0];
    const esHeader = ['FECHA','PEDIDO','SKU','MATERIAL','SERIE'].some(k => f0.some(v => String(v).toUpperCase().includes(k)));
    filas.slice(esHeader?1:0).filter(r => r.some(v => v !== '')).forEach(r => {
      const pedido = String(r[1]||'').trim();
      const sku    = String(r[2]||'').trim().toUpperCase();
      const desc   = String(r[3]||'').trim();
      const serie  = String(r[4]||'').trim();
      const cant   = Number(String(r[5]||'').replace(/,/g,'')) || 1;
      const gr     = String(r[6]||'').trim();
      if (!pedido || !sku) return;
      if (!porPedido.has(pedido)) porPedido.set(pedido, { pedido, gr, items: [] });
      porPedido.get(pedido).items.push({ sku, descripcion: desc, cantidad: cant, serie: serie || null, pedido_pallet: pedido });
    });
    return porPedido;
  },

  // ── Helpers de datos ──────────────────────────────────────
  _pistDone(l) { return (l.got||[]).filter(Boolean).length; },
  _pistFirstEmpty(l) { for (let i=0;i<l.exp;i++) if (!l.got[i]) return i; return -1; },
  _pistSetSlot(l,idx,v) { const g=[...(l.got||[])]; while(g.length<=idx) g.push(''); g[idx]=v; return g; },
  _pistSerieRegistrada(v) { const up=(v||'').toUpperCase(); return this._pistLines.some(l=>(l.got||[]).some(x=>(x||'').toUpperCase()===up)) || this._pistPool.some(p=>p.serie.toUpperCase()===up); },
  _pistPedidos() { const o=[]; this._pistLines.forEach(l=>{ if(!o.includes(l.pedido)) o.push(l.pedido); }); this._pistExtraPedidos.forEach(p=>{ if(!o.includes(p)) o.push(p); }); return o; },
  _pistPedLines(p) { return this._pistLines.filter(l=>l.pedido===p); },
  _pistSerieLinesOf(p) { return this._pistPedLines(p).filter(l=>l.kind==='serie'); },
  _pistCurGuia() { return this._pistGuiaByPedido[this._pistSelectedPedido]||''; },
  _pistStats(p) { let d=0,t=0; this._pistPedLines(p).forEach(l=>{ if(l.kind==='serie'){d+=this._pistDone(l);t+=l.exp;} else {const q=parseInt(l.qty,10); d+=isNaN(q)?0:Math.min(q,l.exp); t+=l.exp;} }); return {d,t,full:d>=t&&t>0,some:d>0}; },
  _pistLpnStats(code) {
    let n=0; const peds=new Set();
    this._pistLines.forEach(l=>(l.got||[]).forEach(s=>{ if(s && this._pistSerieLpn[s]===code){n++; peds.add(l.pedido);} }));
    this._pistLines.forEach(l=>{ if(l.kind==='lote' && l.lpn===code && parseInt(l.qty,10)>0){ peds.add(l.pedido); } });
    this._pistPool.forEach(p=>{ if(p.lpn===code) n++; });
    return {n, peds:peds.size};
  },
  _pistHasProgress() { return this._pistPool.length>0 || this._pistPendientes.length>0 || this._pistLines.some(l=>(l.got||[]).some(Boolean) || (l.qty && l.qty!=='')); },

  _pistSetFb(icon,msg,tone) { this._pistFb = {icon,msg,tone}; this._pistRenderFb(); },

  // ── LPN ───────────────────────────────────────────────────
  _pistFmtLpn(raw) { let s=(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,''); s=s.replace(/^LPN/,''); const digits=s.replace(/\D/g,'').slice(0,5); if(!digits && !raw) return ''; return 'LPN'+digits; },
  _pistActivarLpn(v) {
    const up=(v||'').trim().toUpperCase();
    if (!/^LPN\d{5}$/.test(up)) { this._pistSetFb('⚠️','LPN inválido. Debe ser LPN + 5 dígitos (ej. LPN00007).','warn'); return; }
    if (!this._pistPrintedLpns.includes(up)) this._pistPrintedLpns.push(up);
    this._pistLpn = up; this._pistLpnInput = '';
    const u = this._pistLpnStats(up);
    this._pistSetFb(u.n>0?'📦':'🟢','Paleta '+up+(u.n>0?(' · ocupada ('+u.n+' series, '+u.peds+' pedido(s))'):' · vacía y activa'), u.n>0?'info':'ok');
  },
  _pistBuscarVacio() {
    const empty = this._pistPrintedLpns.find(cd => this._pistLpnStats(cd).n===0);
    if (empty) { this._pistLpn = empty; this._pistSetFb('🔎','LPN vacío encontrado: '+empty+' — activado.','ok'); this._pistRenderLpnBadge(); }
    else this._pistGenerarLpn();
  },
  async _pistGenerarLpn() {
    let max=0; this._pistPrintedLpns.forEach(cd=>{const m=cd.match(/^LPN(\d{5})$/); if(m) max=Math.max(max,parseInt(m[1],10));});
    let code = 'LPN'+String(max+1).padStart(5,'0');
    try { const sugerido = await generarCodigoLPN(); if (sugerido && sugerido > code) code = sugerido; } catch(e) {}
    this._pistPrintedLpns.push(code); this._pistLpn = code;
    this._pistSetFb('⚙','Generado LPN: '+code+' — activo.','ok');
    this._pistRenderLpnBadge();
  },
  async _pistEnsureLpnId(code) {
    if (this._pistLpnIds[code]) return this._pistLpnIds[code];
    const { data: ex } = await sb.from('lpns').select('id').eq('codigo', code).maybeSingle();
    if (ex) { this._pistLpnIds[code] = ex.id; return ex.id; }
    const { data, error } = await crearLPN({ codigo: code, cliente: this._pistCliente||'', n_guia: this._pistCurGuia(), observaciones: this._pistSelectedPedido||'' });
    if (error) { console.error('crearLPN', error); return null; }
    this._pistLpnIds[code] = data.id; return data.id;
  },

  // ── Sugerencia por prefijo ────────────────────────────────
  _pistSuggest(serie) {
    const up = (serie||'').toUpperCase();
    const cands = this._pistLines.filter(l=>l.kind==='serie' && l.prefix && up.startsWith(l.prefix));
    if (!cands.length) return null;
    const pend = cands.find(l=>this._pistDone(l)<l.exp) || cands[0];
    return { lineId: pend.id, pedido: pend.pedido, sku: pend.sku };
  },

  // ── Bandeja masiva ────────────────────────────────────────
  _pistProcessBulk(raw) {
    const v = (raw||'').trim(); if (!v) return;
    const up = v.toUpperCase();
    if (up.startsWith('LPN') && /^LPN\d{0,5}$/.test(up)) { this._pistActivarLpn(up); this._pistRenderLpnBadge(); return; }
    if (!this._pistLpn) { this._pistSetFb('⚠️','Activa un LPN antes de pistolear.','warn'); return; }
    if (this._pistSerieRegistrada(v)) { this._pistSetFb('⚠️','Serie '+v+' ya estaba registrada — se omitió.','warn'); return; }
    const sg = this._pistSuggest(v);
    const tgt = sg ? {pedido:sg.pedido||'',lineId:sg.lineId||''} : {pedido:'',lineId:''};
    this._pistPool.unshift({ serie:v, lpn:this._pistLpn });
    this._pistPoolTarget[v] = tgt;
    this._pistSerieLpn[v] = this._pistLpn;
    if (sg && sg.lineId) this._pistSetFb('🎯','Serie '+v+' → sugerido '+sg.sku+' ('+sg.pedido+'). Revisa y confirma con ✓.','info');
    else this._pistSetFb('❓','Serie '+v+' no reconocida. Quedó en bandeja — asígnala manual.','warn');
    this._pistRenderPool(); this._pistRenderKPI();
  },

  _pistSetPoolPedido(serie,ped) { const t={...(this._pistPoolTarget[serie]||{})}; t.pedido=ped; const sl=this._pistSerieLinesOf(ped); t.lineId = sl.length===1?sl[0].id:''; this._pistPoolTarget[serie]=t; this._pistRenderPool(); },
  _pistSetPoolSku(serie,lineId) { const t={...(this._pistPoolTarget[serie]||{})}; t.lineId=lineId; const ln=this._pistLines.find(l=>l.id===lineId); if(ln) t.pedido=ln.pedido; this._pistPoolTarget[serie]=t; this._pistRenderPool(); },
  _pistAssignFromPool(serie) {
    const t = this._pistPoolTarget[serie];
    if (!t || !t.lineId) { this._pistSetFb('⚠️','Elige pedido y SKU para asignar '+serie+'.','warn'); return; }
    const ln = this._pistLines.find(l=>l.id===t.lineId);
    if (!ln || ln.kind!=='serie') return;
    const idx = this._pistFirstEmpty(ln);
    if (idx<0) { this._pistSetFb('🟠',ln.sku+' ya está completo. Quita una serie o elige otro SKU.','warn'); return; }
    ln.got = this._pistSetSlot(ln, idx, serie);
    delete this._pistPoolTarget[serie];
    this._pistPool = this._pistPool.filter(p=>p.serie!==serie);
    this._pistQueuePendiente(ln, serie, idx);
    this._pistSetFb('✅',serie+' → '+ln.sku+' ('+ln.pedido+') en '+(this._pistSerieLpn[serie]||this._pistLpn),'ok');
    this._pistRenderPool(); this._pistRenderLines(); this._pistRenderKPI();
  },
  _pistRemoveFromPool(serie) { delete this._pistPoolTarget[serie]; delete this._pistSerieLpn[serie]; this._pistPool = this._pistPool.filter(p=>p.serie!==serie); this._pistRenderPool(); },
  _pistAssignAllSugg() {
    const ready = this._pistPool.filter(p=>{ const t=this._pistPoolTarget[p.serie]; if(!t||!t.lineId) return false; const ln=this._pistLines.find(l=>l.id===t.lineId); return ln && ln.kind==='serie' && this._pistFirstEmpty(ln)>=0; });
    if (!ready.length) { this._pistSetFb('ℹ️','No hay series con SKU asignable ahora mismo.','info'); return; }
    const assigned = [];
    ready.forEach(p => {
      const t = this._pistPoolTarget[p.serie]; const ln = this._pistLines.find(l=>l.id===t.lineId);
      const idx = this._pistFirstEmpty(ln);
      if (idx>=0) { ln.got = this._pistSetSlot(ln, idx, p.serie); this._pistQueuePendiente(ln, p.serie, idx); delete this._pistPoolTarget[p.serie]; assigned.push(p.serie); }
    });
    this._pistPool = this._pistPool.filter(p=>!assigned.includes(p.serie));
    this._pistSetFb('✅','Asignadas '+assigned.length+' series sugeridas.','ok');
    this._pistRenderPool(); this._pistRenderLines(); this._pistRenderKPI();
  },
  _pistRemoveSerie(id,serie) { const ln=this._pistLines.find(l=>l.id===id); if(ln) ln.got=(ln.got||[]).filter(x=>x!==serie); delete this._pistSerieLpn[serie]; this._pistUnqueuePendiente(serie); this._pistRenderLines(); this._pistRenderKPI(); },
  _pistReturnToPool(lineId,serie) {
    const lpn = this._pistSerieLpn[serie] || this._pistLpn;
    const ln = this._pistLines.find(l=>l.id===lineId); if (ln) ln.got = (ln.got||[]).filter(x=>x!==serie);
    this._pistUnqueuePendiente(serie);
    this._pistPool.unshift({serie,lpn});
    this._pistPoolTarget[serie] = {pedido:'',lineId:''};
    this._pistSetFb('↩','Serie '+serie+' devuelta a la bandeja. Elige el Pedido y SKU correctos y confirma con ✓.','info');
    this._pistRenderPool(); this._pistRenderLines(); this._pistRenderKPI();
  },

  // ── Cola de pendientes por guardar ────────────────────────
  _pistQueuePendiente(line, serie, idx) { this._pistPendientes.push({ key: line.id+':'+serie, lineId: line.id, serie, idx, kind:'serie' }); },
  _pistUnqueuePendiente(serie) { this._pistPendientes = this._pistPendientes.filter(p=>p.serie!==serie); },
  _pistQueueLote(line) {
    line.lpn = this._pistLpn;
    this._pistPendientes = this._pistPendientes.filter(p=>!(p.lineId===line.id && p.kind==='lote'));
    this._pistPendientes.push({ key:line.id+':lote', lineId: line.id, kind:'lote' });
  },

  // ── Por SKU ───────────────────────────────────────────────
  _pistSetSerieSlot(lineId,idx,val) {
    const t = (val||'').trim();
    const ln = this._pistLines.find(l=>l.id===lineId); if (!ln) return;
    const prevVal = (ln.got||[])[idx];
    if (prevVal) { delete this._pistSerieLpn[prevVal]; this._pistUnqueuePendiente(prevVal); }
    const g = [...(ln.got||[])]; while (g.length<=idx) g.push(''); g[idx]=t; ln.got=g;
    if (t) {
      if (!this._pistLpn) { this._pistSetFb('⚠️','Activa un LPN antes de pistolear.','warn'); return; }
      this._pistSerieLpn[t] = this._pistLpn;
      this._pistQueuePendiente(ln, t, idx);
    }
  },
  _pistOnSerieKey(lineId, idx, e) {
    const val = e.target.value;
    this._pistSetSerieSlot(lineId, idx, val);
    const line = this._pistLines.find(l=>l.id===lineId);
    this._pistRenderLines();
    this._pistRenderKPI();
    const next = idx+1;
    setTimeout(() => {
      if (line && next < line.exp) {
        const el = document.getElementById('pist-ser-'+lineId+'-'+next);
        if (el) { el.focus(); el.select && el.select(); }
      }
    }, 30);
  },

  // ── Render: KPIs / feedback / badge LPN ──────────────────
  _pistRenderKPI() {
    const el = document.getElementById('pist-kpi-strip'); if (!el) return;
    const cur = this._pistSelectedPedido;
    const st = cur ? this._pistStats(cur) : {d:0,t:0};
    const pend = Math.max(0, st.t - st.d);
    const pct = st.t ? Math.round(st.d/st.t*100) : 0;
    let gd=0, gt=0;
    this._pistLines.forEach(l=>{ if(l.kind==='serie'){ gd+=this._pistDone(l); gt+=l.exp; } else { const q=parseInt(l.qty,10); gd+=isNaN(q)?0:Math.min(q,l.exp); gt+=l.exp; } });
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr) 1.6fr;gap:10px;margin-bottom:8px;">
        <div class="stat-card"><div class="stat-label">Esperado · pedido</div><div class="stat-value" style="font-family:monospace;">${st.t}</div></div>
        <div class="stat-card" style="border-left-color:var(--success);"><div class="stat-label">Recibido</div><div class="stat-value" style="font-family:monospace;color:var(--success-text);">${st.d}</div></div>
        <div class="stat-card" style="border-left-color:${pend>0?'var(--warning)':'var(--success)'};"><div class="stat-label">Pendiente</div><div class="stat-value" style="font-family:monospace;color:${pend>0?'var(--warning-text)':'var(--success-text)'};">${pend}</div></div>
        <div class="stat-card" style="border-left-color:${this._pistPool.length>0?'var(--warning)':'var(--border-strong)'};"><div class="stat-label">En bandeja</div><div class="stat-value" style="font-family:monospace;">${this._pistPool.length}</div></div>
        <div class="stat-card">
          <div style="display:flex;justify-content:space-between;"><div class="stat-label">Avance del pedido</div><span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--accent);">${pct}%</span></div>
          <div class="progress-bar" style="margin-top:8px;"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
        </div>
      </div>
    `;
    const g1=document.getElementById('pist-global'); if(g1) g1.textContent = `${gd}/${gt}`;
    const g2=document.getElementById('pist-pool-count'); if(g2) g2.textContent = this._pistPool.length;
    const g3=document.getElementById('pist-pend-count'); if(g3) g3.textContent = this._pistPendientes.length;
    const lbl=document.getElementById('pist-pool-label'); if(lbl) lbl.textContent = this._pistPool.length + ' sueltas';
  },

  _pistRenderFb() {
    const el = document.getElementById('pist-fb'); if (!el) return;
    const map = { idle:['var(--bg-row-alt)','var(--border)','var(--text-secondary)'], info:['var(--blue-bg)','var(--accent-dim)','var(--blue-text)'], ok:['var(--success-bg)','var(--success)','var(--success-text)'], warn:['var(--warning-bg)','var(--warning)','var(--warning-text)'] };
    const [bg,bd,color] = map[this._pistFb.tone] || map.idle;
    el.innerHTML = `<div style="display:flex;align-items:center;gap:9px;background:${bg};border:1px solid ${bd};border-radius:9px;padding:9px 13px;margin-bottom:8px;"><span style="font-size:15px;">${this._pistFb.icon}</span><span style="font-size:12px;font-weight:600;color:${color};">${escapeHtml(this._pistFb.msg)}</span></div>`;
  },

  _pistRenderLpnBadge() {
    const cand = document.getElementById('pist-lpn-cand');
    const badge = document.getElementById('pist-lpn-badge');
    if (!cand || !badge) return;
    const input = this._pistLpnInput || '';
    const valid = /^LPN\d{5}$/.test(input);
    if (input.length >= 4) {
      if (valid) {
        const u = this._pistLpnStats(input);
        cand.innerHTML = u.n===0
          ? `<span style="font-size:11px;font-weight:700;color:var(--success-text);background:var(--success-bg);border-radius:8px;padding:5px 9px;">✓ vacío</span>`
          : `<span style="font-size:11px;font-weight:700;color:var(--warning-text);background:var(--warning-bg);border-radius:8px;padding:5px 9px;">● ocupado · ${u.n}</span>`;
      } else cand.innerHTML = `<span style="font-size:11px;color:var(--text-tertiary);">faltan dígitos…</span>`;
    } else cand.innerHTML = '';
    if (this._pistLpn) {
      const u = this._pistLpnStats(this._pistLpn);
      badge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;background:${u.n===0?'var(--success-bg)':'var(--warning-bg)'};border:1px solid ${u.n===0?'var(--success)':'var(--warning)'};border-radius:8px;padding:6px 11px;font-family:monospace;font-size:12px;font-weight:700;">${this._pistLpn} <span style="color:${u.n===0?'var(--success-text)':'var(--warning-text)'};">${u.n===0?'vacía':u.n+' ser.'}</span></span>`;
    } else {
      badge.innerHTML = `<span style="font-size:11px;color:var(--text-tertiary);">— sin LPN activo —</span>`;
    }
  },

  // ── Render: bandeja ───────────────────────────────────────
  _pistRenderPool() {
    const el = document.getElementById('pist-pool-list'); if (!el) return;
    if (!this._pistPool.length) { el.innerHTML = `<div class="empty-state" style="padding:30px 16px;"><div class="empty-icon">📭</div>La bandeja está vacía. Pistolea series y caerán aquí.</div>`; return; }
    const pedidoOptions = this._pistPedidos();
    el.innerHTML = this._pistPool.map(p => {
      const t = this._pistPoolTarget[p.serie] || {pedido:'',lineId:''};
      const sg = this._pistSuggest(p.serie);
      const skuOpts = t.pedido ? this._pistSerieLinesOf(t.pedido) : [];
      let suggTxt, suggColor;
      if (t.lineId) { const ln=this._pistLines.find(l=>l.id===t.lineId); suggTxt='→ '+(ln?ln.sku:'')+' · '+t.pedido; suggColor='var(--blue-text)'; }
      else if (sg) { suggTxt='sugerido: '+sg.sku+(sg.pedido?' · '+sg.pedido:''); suggColor='var(--warning-text)'; }
      else { suggTxt='sin reconocer — asigna manual'; suggColor='var(--danger-text)'; }
      const canAssign = !!t.lineId;
      return `
        <div style="border-bottom:1px solid var(--border);padding:10px 14px;display:flex;flex-direction:column;gap:7px;">
          <div style="display:flex;align-items:center;gap:9px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${canAssign?'var(--accent)':(sg?'var(--warning)':'var(--danger)')};flex-shrink:0;"></span>
            <span style="font-family:monospace;font-size:12.5px;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.serie)}</span>
            <span class="pill pill-success" style="font-size:9px;">${escapeHtml(p.lpn||'—')}</span>
            <span style="font-size:10.5px;font-weight:700;color:${suggColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${suggTxt}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <select data-role="pedido" data-serie="${escapeHtml(p.serie)}" style="font-family:monospace;font-size:11px;font-weight:700;padding:5px 6px;border:1px solid var(--border-strong);border-radius:6px;width:100px;flex-shrink:0;">
              <option value="">Pedido…</option>
              ${pedidoOptions.map(o=>`<option value="${escapeHtml(o)}" ${t.pedido===o?'selected':''}>${escapeHtml(o)}</option>`).join('')}
            </select>
            <select data-role="sku" data-serie="${escapeHtml(p.serie)}" style="font-family:monospace;font-size:11px;padding:5px 6px;border:1px solid var(--border-strong);border-radius:6px;flex:1;min-width:0;">
              <option value="">SKU…</option>
              ${skuOpts.map(l=>`<option value="${l.id}" ${t.lineId===l.id?'selected':''}>${escapeHtml(l.sku)} (${this._pistDone(l)}/${l.exp})</option>`).join('')}
            </select>
            <button data-action="assign" data-serie="${escapeHtml(p.serie)}" ${canAssign?'':'disabled'} class="btn-secondary" style="font-size:11px;padding:5px 10px;flex-shrink:0;${canAssign?'':'opacity:.4;cursor:not-allowed;'}">✓</button>
            <button data-action="remove" data-serie="${escapeHtml(p.serie)}" style="background:none;border:none;color:var(--text-tertiary);cursor:pointer;font-size:13px;flex-shrink:0;">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ── Render: líneas (bandeja + por SKU comparten el mismo modelo) ─
  _pistRenderLines() {
    const lines = this._pistPedLines(this._pistSelectedPedido);
    const el = document.getElementById('pist-lines-list');
    if (el) el.innerHTML = lines.length ? lines.map(l=>this._pistLineRowHtml(l,'band')).join('') : `<div class="empty-state" style="padding:24px 16px;">Sin ítems en este pedido.</div>`;
    const el2 = document.getElementById('pist-sku-list');
    if (el2) el2.innerHTML = lines.length ? lines.map(l=>this._pistLineRowHtml(l,'sku')).join('') : `<div class="empty-state" style="padding:24px 16px;">Sin ítems en este pedido.</div>`;
  },

  _pistLineRowHtml(l, mode) {
    const done = this._pistDone(l);
    const disp = l.kind==='serie' ? done : (parseInt(l.qty,10)||0);
    const complete = l.kind==='serie' ? done>=l.exp : (disp>=l.exp && l.exp>0);
    const partial = disp>0 && !complete;
    const isOpen = mode==='band' ? this._pistOpenBand===l.id : this._pistOpenSku===l.id;
    const pillTxt = complete?'Completo':(partial?'Parcial':'Pendiente');
    const pillCls = complete?'pill-success':(partial?'pill-info':'pill-neutral');
    let inner = '';
    if (isOpen) {
      if (mode==='band') {
        const caps = (l.got||[]).filter(Boolean);
        inner = l.kind==='serie' ? `
          <div style="padding:8px 16px 14px 46px;display:flex;flex-wrap:wrap;gap:6px;">
            ${caps.map(s=>`
              <div style="display:flex;align-items:center;gap:6px;background:var(--bg-card);border:1px solid var(--success);border-radius:8px;padding:4px 6px 4px 9px;">
                <span style="width:6px;height:6px;border-radius:50%;background:var(--success);"></span>
                <span style="font-family:monospace;font-size:11px;font-weight:600;">${escapeHtml(s)}</span>
                <span class="pill pill-success" style="font-size:9px;">${escapeHtml(this._pistSerieLpn[s]||'—')}</span>
                <button data-action="topool" data-line="${l.id}" data-serie="${escapeHtml(s)}" class="btn-text" style="font-size:10px;">↩ bandeja</button>
                <button data-action="removeserie" data-line="${l.id}" data-serie="${escapeHtml(s)}" style="background:none;border:none;color:var(--text-tertiary);cursor:pointer;">✕</button>
              </div>
            `).join('')}
            ${!caps.length ? `<span style="font-size:11px;color:var(--text-tertiary);font-style:italic;">Aún sin series — pistolea y asígnalas desde la bandeja.</span>` : ''}
          </div>
        ` : `<div style="padding:8px 16px 14px 46px;font-size:11.5px;color:var(--text-tertiary);">Lote a granel · ${disp} de ${l.exp} recibidas.</div>`;
      } else {
        if (l.kind==='serie') {
          const nextIdx = this._pistFirstEmpty(l);
          inner = `<div style="padding:6px 18px 14px 58px;">${this._pistSlotsHtml(l, nextIdx)}</div>`;
        } else {
          inner = `
            <div style="padding:6px 18px 14px 58px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span style="font-size:12px;color:var(--text-secondary);font-weight:600;">Cantidad recibida:</span>
              <input type="text" inputmode="numeric" data-role="qty" data-line="${l.id}" value="${escapeHtml(l.qty||'')}" placeholder="0" style="width:80px;text-align:center;font-family:monospace;font-size:15px;font-weight:700;padding:6px;border:1.5px solid var(--border-strong);border-radius:8px;background:var(--bg-input);color:var(--text);">
              <span style="font-size:11px;color:var(--text-tertiary);font-family:monospace;">de ${l.exp}</span>
              <button data-action="full" data-line="${l.id}" class="btn-success" style="font-size:11px;">✓ Todas</button>
              <input type="text" data-role="obs" data-line="${l.id}" value="${escapeHtml(this._pistObsMap[l.id]||'')}" placeholder="Obs de este lote…" style="flex:1;min-width:160px;font-size:12px;padding:6px 9px;border:1px solid var(--border-strong);border-radius:8px;background:var(--bg-input);color:var(--text);">
            </div>
          `;
        }
      }
    }
    return `
      <div style="border-bottom:1px solid var(--border);">
        <div data-action="toggle" data-mode="${mode}" data-line="${l.id}" style="display:flex;align-items:center;gap:11px;padding:11px 16px;cursor:pointer;background:${isOpen?'var(--accent-dim)':'transparent'};">
          <div style="width:30px;height:30px;border-radius:8px;background:${complete?'var(--success-bg)':'var(--bg-row-alt)'};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">${complete?'✅':(l.kind==='serie'?'🔢':'🧾')}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:7px;"><span style="font-family:monospace;font-size:13px;font-weight:700;color:var(--accent);">${escapeHtml(l.sku)}</span><span class="pill ${l.kind==='serie'?'pill-info':'pill-warning'}" style="font-size:9px;">${l.kind==='serie'?'SERIE':'LOTE'}</span></div>
            <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(l.desc||'')}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;"><span style="font-family:monospace;font-size:15px;font-weight:700;color:${complete?'var(--success-text)':'var(--text)'};">${disp}</span><span style="font-family:monospace;font-size:12px;color:var(--text-tertiary);">/${l.exp}</span></div>
          <span class="pill ${pillCls}" style="flex-shrink:0;">${pillTxt}</span>
          <span style="font-size:11px;color:var(--text-tertiary);transform:${isOpen?'rotate(180deg)':'rotate(0)'};transition:transform .15s;">▾</span>
        </div>
        ${inner}
      </div>
    `;
  },

  _pistSlotsHtml(l, nextIdx) {
    return `<div style="border:1px solid var(--border);border-radius:9px;overflow:hidden;max-width:640px;background:var(--bg-card);">
      ${Array.from({length:l.exp}).map((_,i)=>{
        const val = (l.got||[])[i] || '';
        const isNext = i===nextIdx;
        return `
          <div id="pist-slotrow-${l.id}-${i}" style="display:flex;align-items:center;gap:10px;padding:7px 11px;border-bottom:1px solid var(--border);background:${isNext?'var(--accent-dim)':'transparent'};">
            <span style="font-family:monospace;font-size:10px;font-weight:700;color:var(--text-tertiary);width:22px;text-align:right;flex-shrink:0;">${i+1}</span>
            <span style="width:7px;height:7px;border-radius:50%;background:${val?'var(--success)':(isNext?'var(--accent)':'var(--border-strong)')};flex-shrink:0;"></span>
            <input id="pist-ser-${l.id}-${i}" data-role="serie" data-line="${l.id}" data-idx="${i}" value="${escapeHtml(val)}" placeholder="escanea serie…" style="flex:1.4;min-width:0;border:none;outline:none;background:none;font-family:monospace;font-size:12px;font-weight:600;color:var(--text);">
            <input data-role="obsunit" data-line="${l.id}" data-idx="${i}" value="${escapeHtml(this._pistObsMap[l.id+':'+i]||'')}" placeholder="obs…" style="flex:1;min-width:0;border:none;border-left:1px solid var(--border);outline:none;font-size:11px;color:var(--text-secondary);background:none;padding-left:9px;">
            <span class="pill pill-success" style="font-size:9px;flex-shrink:0;">${val?escapeHtml(this._pistSerieLpn[val]||'—'):'—'}</span>
          </div>
        `;
      }).join('')}
    </div>`;
  },

  // ── Modales: agregar pedido/SKU · exportar ────────────────
  _pistOpenAddPedido() { this._pistShowAdd=true; this._pistAddMode='pedido'; this._pistAddPedido=''; this._pistAddGuia=''; this._pistRenderModals(); },
  _pistOpenAddSku() { this._pistShowAdd=true; this._pistAddMode='sku'; this._pistAddPedido=this._pistSelectedPedido; this._pistAddSku=''; this._pistAddDesc=''; this._pistAddKind='serie'; this._pistAddExp=''; this._pistRenderModals(); },
  _pistCloseAdd() { this._pistShowAdd=false; this._pistRenderModals(); },
  _pistCommitAdd() {
    if (this._pistAddMode==='pedido') {
      const code=(this._pistAddPedido||'').trim().toUpperCase();
      if (!code) { this._pistSetFb('⚠️','Escribe el código del pedido.','warn'); return; }
      if (this._pistPedidos().includes(code)) { this._pistSetFb('⚠️','El pedido '+code+' ya existe.','warn'); return; }
      this._pistExtraPedidos.push(code);
      this._pistGuiaByPedido[code] = (this._pistAddGuia||'').trim();
      this._pistSelectedPedido = code; this._pistShowAdd=false;
      this._pistSetFb('🟢','Pedido '+code+' creado. Agrégale SKUs con + SKU.','ok');
      const c=document.getElementById('ing-contenido'); if(c) this._renderLPN(c);
      return;
    }
    const sku=(this._pistAddSku||'').trim().toUpperCase();
    const exp=parseInt(this._pistAddExp,10);
    if (!sku) { this._pistSetFb('⚠️','Escribe el SKU.','warn'); return; }
    if (isNaN(exp)||exp<1) { this._pistSetFb('⚠️','Cantidad esperada inválida.','warn'); return; }
    const cat = this._pistCatalog.find(x=>x.sku.toUpperCase()===sku);
    const id = 'x'+Date.now();
    this._pistLines.push({ id, pedido: this._pistAddPedido, sku, desc: this._pistAddDesc||(cat?cat.desc:'')||'—', kind: this._pistAddKind, prefix: cat?cat.prefix:'', exp, got: [], qty:'', serials: [] });
    this._pistSelectedPedido = this._pistAddPedido; this._pistShowAdd=false;
    this._pistSetFb('🟢','SKU '+sku+' agregado a '+this._pistAddPedido+'.','ok');
    const c=document.getElementById('ing-contenido'); if(c) this._renderLPN(c);
  },
  _pistOnCatalogPick(sku) {
    const c = this._pistCatalog.find(x=>x.sku.toUpperCase()===(sku||'').toUpperCase());
    this._pistAddSku = sku;
    if (c) { this._pistAddDesc = c.desc; this._pistAddKind = c.kind; }
  },

  _pistRenderModals() {
    const root = document.getElementById('pist-modal-root'); if (!root) return;
    let html = '';
    if (this._pistShowAdd) {
      const isPedido = this._pistAddMode==='pedido';
      html += `
        <div class="modal-overlay" id="pist-modal-add">
          <div class="modal-box">
            <div class="modal-header"><h3>${isPedido?'Nuevo pedido':'Agregar SKU al pedido'}</h3><button class="btn-modal-close" id="pist-add-close">✕</button></div>
            <div class="modal-body">
              ${isPedido ? `
                <div class="field"><label>Código del pedido</label><input type="text" id="pist-add-pedido" value="${escapeHtml(this._pistAddPedido)}" placeholder="ej. MR-801" style="font-family:monospace;text-transform:uppercase;"></div>
                <div class="field"><label>N° Guía (opcional)</label><input type="text" id="pist-add-guia" value="${escapeHtml(this._pistAddGuia)}" placeholder="T022-XXXXX" style="font-family:monospace;"></div>
                <div class="alert alert-info">El pedido nuevo nace vacío. Luego agrégale SKUs con <strong>+ SKU al pedido</strong>.</div>
              ` : `
                <div class="field"><label>Pedido destino</label>
                  <select id="pist-add-pedido-sel">${this._pistPedidos().map(p=>`<option value="${escapeHtml(p)}" ${this._pistAddPedido===p?'selected':''}>${escapeHtml(p)}</option>`).join('')}</select>
                </div>
                <div class="field"><label>SKU</label><input type="text" id="pist-add-sku" value="${escapeHtml(this._pistAddSku)}" list="pist-catalog-skus" placeholder="ENT…" style="font-family:monospace;"><datalist id="pist-catalog-skus">${this._pistCatalog.map(cc=>`<option value="${escapeHtml(cc.sku)}">${escapeHtml(cc.desc)}</option>`).join('')}</datalist></div>
                <div class="field"><label>Descripción</label><input type="text" id="pist-add-desc" value="${escapeHtml(this._pistAddDesc)}"></div>
                <div class="field-grid">
                  <div class="field"><label>Tipo</label><select id="pist-add-kind"><option value="serie" ${this._pistAddKind==='serie'?'selected':''}>Serie (1 x 1)</option><option value="lote" ${this._pistAddKind==='lote'?'selected':''}>Lote (a granel)</option></select></div>
                  <div class="field"><label>Cant. esperada</label><input type="text" inputmode="numeric" id="pist-add-exp" value="${escapeHtml(this._pistAddExp)}" style="font-family:monospace;text-align:center;"></div>
                </div>
              `}
            </div>
            <div class="modal-footer"><button class="btn-secondary" id="pist-add-cancel">Cancelar</button><button class="btn-primary" id="pist-add-commit">${isPedido?'Crear pedido':'Agregar SKU'}</button></div>
          </div>
        </div>
      `;
    }
    if (this._pistShowExport) {
      const rows = this._pistBuildExportRows();
      html += `
        <div class="modal-overlay" id="pist-modal-export">
          <div class="modal-box modal-lg" style="max-width:1100px;">
            <div class="modal-header"><h3>Vista previa del export — ${rows.length} filas</h3><button class="btn-modal-close" id="pist-export-close">✕</button></div>
            <div class="modal-body">
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>Fecha</th><th>Pedido</th><th>SKU</th><th>Desc.</th><th>Qty sol</th><th>Serie</th><th>Recep.</th><th>Cuadre</th><th>Guía</th><th>LPN</th><th>Obs</th></tr></thead>
                  <tbody>${rows.map(r=>`<tr>
                    <td style="font-family:monospace;white-space:nowrap;">${escapeHtml(r.fecha)}</td>
                    <td class="sku-cell">${escapeHtml(r.pedido)}</td>
                    <td class="sku-cell">${escapeHtml(r.sku)}</td>
                    <td class="desc-cell">${escapeHtml(r.desc)}</td>
                    <td style="text-align:center;">${r.qtySol}</td>
                    <td class="serie-cell">${escapeHtml(r.serie)}</td>
                    <td style="text-align:center;font-weight:700;color:var(--success-text);">${r.recep}</td>
                    <td style="text-align:center;font-weight:700;color:${r.cuadre===0?'var(--success-text)':'var(--danger-text)'};">${r.cuadre}</td>
                    <td style="font-family:monospace;">${escapeHtml(r.guia)}</td>
                    <td style="font-family:monospace;color:var(--success-text);">${escapeHtml(r.lpn)}</td>
                    <td>${escapeHtml(r.obs)}</td>
                  </tr>`).join('')}</tbody>
                </table>
              </div>
              <p style="font-size:11px;color:var(--text-tertiary);margin-top:8px;">El archivo descargado usa el formato estándar Sharepoint (10 columnas) del sistema.</p>
            </div>
            <div class="modal-footer"><button class="btn-secondary" id="pist-export-cancel">Cerrar</button><button class="btn-primary" id="pist-export-download">⬇ Descargar .xlsx</button></div>
          </div>
        </div>
      `;
    }
    root.innerHTML = html;

    document.getElementById('pist-add-close')?.addEventListener('click', () => this._pistCloseAdd());
    document.getElementById('pist-add-cancel')?.addEventListener('click', () => this._pistCloseAdd());
    document.getElementById('pist-modal-add')?.addEventListener('click', e => { if (e.target.id==='pist-modal-add') this._pistCloseAdd(); });
    document.getElementById('pist-add-pedido')?.addEventListener('input', e => this._pistAddPedido = e.target.value);
    document.getElementById('pist-add-guia')?.addEventListener('input', e => this._pistAddGuia = e.target.value);
    document.getElementById('pist-add-pedido-sel')?.addEventListener('change', e => this._pistAddPedido = e.target.value);
    document.getElementById('pist-add-sku')?.addEventListener('input', e => this._pistOnCatalogPick(e.target.value));
    document.getElementById('pist-add-desc')?.addEventListener('input', e => this._pistAddDesc = e.target.value);
    document.getElementById('pist-add-kind')?.addEventListener('change', e => this._pistAddKind = e.target.value);
    document.getElementById('pist-add-exp')?.addEventListener('input', e => this._pistAddExp = e.target.value);
    document.getElementById('pist-add-commit')?.addEventListener('click', () => this._pistCommitAdd());

    document.getElementById('pist-export-close')?.addEventListener('click', () => { this._pistShowExport=false; this._pistRenderModals(); });
    document.getElementById('pist-export-cancel')?.addEventListener('click', () => { this._pistShowExport=false; this._pistRenderModals(); });
    document.getElementById('pist-modal-export')?.addEventListener('click', e => { if (e.target.id==='pist-modal-export') { this._pistShowExport=false; this._pistRenderModals(); } });
    document.getElementById('pist-export-download')?.addEventListener('click', () => this._pistDownloadXlsx());
  },

  // ── Export / guardado ─────────────────────────────────────
  _pistBuildExportRows() {
    const rows = [];
    this._pistLines.forEach(l => {
      const guia = this._pistGuiaByPedido[l.pedido] || '';
      if (l.kind==='serie') {
        for (let i=0;i<l.exp;i++) {
          const serie = (l.got&&l.got[i]) || '';
          rows.push({ fecha:this._pistFecha, pedido:l.pedido, sku:l.sku, desc:l.desc, qtySol:1, serie, recep:serie?1:0, guia, lpn:(serie&&this._pistSerieLpn[serie])||'', obs:this._pistObsMap[l.id+':'+i]||'', cuadre:(serie?0:1) });
        }
      } else {
        const q = parseInt(l.qty,10); const recep = isNaN(q)?0:q;
        rows.push({ fecha:this._pistFecha, pedido:l.pedido, sku:l.sku, desc:l.desc, qtySol:l.exp, serie:'', recep, guia, lpn:l.lpn||'', obs:this._pistObsMap[l.id]||'', cuadre:l.exp-recep });
      }
    });
    return rows;
  },

  _pistDownloadXlsx() {
    const rows = this._pistBuildExportRows();
    const filas = rows.map(r => ({
      FECHA: r.fecha, CLIENTE: this._pistCliente, N_PEDIDO: r.pedido, MATERIAL: r.sku, DESCRIPCION: r.desc,
      SERIE: r.serie || '-', CANTIDAD_RECIBIDA: r.recep, N_GUIA: r.guia, TIPO_INGRESO: this._pistCondicion, OBSERVACIONES: r.obs,
    }));
    exportarRecepcionAExcel(filas, `Recepcion_${this._pistCliente||'cliente'}_${this._pistFecha}.xlsx`);
    this._pistShowExport=false; this._pistRenderModals();
  },

  async _pistGuardarAvance() {
    if (!this._pistPendientes.length) { this._pistSetFb('ℹ️','No hay ítems nuevos por guardar.','info'); return; }
    const btn = document.getElementById('pist-btn-guardar');
    if (btn) { btn.disabled=true; btn.textContent='Guardando…'; }

    const grupos = new Map();
    for (const p of this._pistPendientes) {
      const l = this._pistLines.find(x=>x.id===p.lineId); if (!l) continue;
      let code, item;
      if (p.kind==='serie') {
        code = this._pistSerieLpn[p.serie] || this._pistLpn;
        item = { MATERIAL:l.sku, DESCRIPCION:l.desc, SERIE:p.serie, CANTIDAD_RECIBIDA:1, N_PEDIDO:l.pedido, N_GUIA:this._pistGuiaByPedido[l.pedido]||'', CLIENTE:this._pistCliente, TIPO_INGRESO:this._pistCondicion, FECHA:this._pistFecha, OBSERVACIONES:this._pistObsMap[l.id+':'+p.idx]||'' };
      } else {
        code = l.lpn || this._pistLpn;
        const q = parseInt(l.qty,10); if (isNaN(q) || q<=0) continue;
        item = { MATERIAL:l.sku, DESCRIPCION:l.desc, SERIE:'-', CANTIDAD_RECIBIDA:q, N_PEDIDO:l.pedido, N_GUIA:this._pistGuiaByPedido[l.pedido]||'', CLIENTE:this._pistCliente, TIPO_INGRESO:this._pistCondicion, FECHA:this._pistFecha, OBSERVACIONES:this._pistObsMap[l.id]||'' };
      }
      if (!code) continue;
      if (!grupos.has(code)) grupos.set(code, []);
      grupos.get(code).push({ ...item, _pendKey: p.key });
    }

    let totalGuardado = 0;
    const errores = [];
    for (const [code, items] of grupos) {
      const lpnId = await this._pistEnsureLpnId(code);
      if (!lpnId) { errores.push(code); continue; }
      const { error, count } = await registrarItemsEnLPN(lpnId, code, items);
      if (error) { errores.push(code); continue; }
      totalGuardado += count;
      const keys = items.map(it=>it._pendKey);
      this._pistPendientes = this._pistPendientes.filter(p=>!keys.includes(p.key));
      this._pistSesionGuardada.push(...items);
    }

    if (btn) { btn.disabled=false; btn.textContent='💾 Guardar avance'; }
    if (errores.length) this._pistSetFb('⚠️', `Guardado parcial: ${totalGuardado} ítem(s). Error en LPN ${errores.join(', ')}.`, 'warn');
    else this._pistSetFb('✅', `✓ ${totalGuardado} ítem(s) guardados en Supabase.`, 'ok');
    this._pistRenderKPI();
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
        <button class="btn-secondary" onclick="Router.navigate('ingresos')">Cargar otro</button>
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
      abrirEscaner('ing-contenido', txt=>{ const i=document.getElementById('man-sku'); if(i) i.value=txt.toUpperCase(); }, e=>alert(e));
    });
    document.getElementById('btn-scan-man-serie')?.addEventListener('click', ()=>{
      abrirEscaner('ing-contenido', txt=>{ const i=document.getElementById('man-serie'); if(i) i.value=txt; }, e=>alert(e));
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
                <button class="btn-secondary" style="font-size:10px;padding:3px 7px;" onclick="IngresosView._verDetalleLPN('${lp.id}','${escapeHtml(lp.codigo)}')">Ver</button>
                <button class="btn-secondary" style="font-size:10px;padding:3px 7px;" onclick="IngresosView._imprimirEtiquetaLPN(${JSON.stringify(lp).split('"').join('&quot;')})">🖨</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _verDetalleLPN(lpnId, lpnCodigo) {
    const c = document.getElementById('ing-contenido');
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
          <button class="btn-secondary" style="font-size:11px;" onclick="IngresosView._imprimirEtiquetaLPN(${JSON.stringify(lpn).split('"').join('&quot;')})">🖨 Imprimir etiqueta</button>
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

Router.register('ingresos', IngresosView);
