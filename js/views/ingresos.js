// ============================================================
// INGRESOS — Subir Excel ya pistoleado + Manual
// Separado de Recepción (pistolaje LPN)
// ============================================================

const IngresosView = {
  title: 'Ingresos',
  _flujo: null,
  _preview: [],
  _manualItems: [],
  _gr: '',
  _tipoIngreso: 'INGRESO NUEVO',
  _fechaIngreso: new Date().toISOString().slice(0,10),

  hasProgress() {
    return this._preview.length > 0 || this._manualItems.length > 0;
  },

  saveState() {
    return {
      flujo: this._flujo, preview: this._preview,
      manualItems: this._manualItems, gr: this._gr,
      tipoIngreso: this._tipoIngreso, fechaIngreso: this._fechaIngreso,
    };
  },

  restoreState(s) {
    this._flujo       = s.flujo;
    this._preview     = s.preview || [];
    this._manualItems = s.manualItems || [];
    this._gr          = s.gr || '';
    this._tipoIngreso = s.tipoIngreso || 'INGRESO NUEVO';
    this._fechaIngreso= s.fechaIngreso || new Date().toISOString().slice(0,10);
    this.afterRender();
    if (this._flujo) {
      document.getElementById('ing-selector').style.display = 'none';
      this._renderFlujo();
    }
  },

  render() {
    return `
      <div id="ing-selector">
        <div class="card">
          <p class="card-title">Ingresos de mercadería</p>
          <p class="card-subtitle">Registra stock que ya fue pistoleado o ingresa manualmente</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
            <button class="recep-opcion" data-flujo="excel">
              <div class="recep-op-icon">📊</div>
              <div class="recep-op-titulo">Subir Excel</div>
              <div class="recep-op-desc">Carga el Excel que ya pistoleaste. Mismo formato del Sharepoint.</div>
            </button>
            <button class="recep-opcion" data-flujo="manual">
              <div class="recep-op-icon">✏️</div>
              <div class="recep-op-titulo">Ingreso manual</div>
              <div class="recep-op-desc">Ingresa ítems uno por uno para ingresos pequeños o puntuales.</div>
            </button>
          </div>
          <div style="margin-top:12px;">
            <button class="recep-opcion" data-flujo="pedidos" style="width:100%;text-align:left;display:flex;align-items:center;gap:12px;padding:12px 14px;">
              <div class="recep-op-icon">📋</div>
              <div>
                <div class="recep-op-titulo">Ver pedidos cargados</div>
                <div class="recep-op-desc">Lista de todos los pedidos ingresados al sistema con su detalle.</div>
              </div>
            </button>
          </div>
        </div>
      </div>
      <div id="ing-contenido"></div>
    `;
  },

  afterRender() {
    document.querySelectorAll('[data-flujo]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._flujo = btn.dataset.flujo;
        document.getElementById('ing-selector').style.display = 'none';
        this._renderFlujo();
      });
    });
  },

  _renderFlujo() {
    const c = document.getElementById('ing-contenido');
    if (!c) return;
    const map = {
      excel:   () => this._renderExcel(c),
      manual:  () => this._renderManual(c),
      pedidos: () => this._renderPedidos(c),
    };
    if (map[this._flujo]) map[this._flujo]();
  },

  _btnVolver() {
    return `<button class="btn-secondary" id="btn-volver-ing" style="margin-bottom:12px;font-size:12px;">← Volver</button>`;
  },

  _bindVolver() {
    document.getElementById('btn-volver-ing')?.addEventListener('click', () => {
      this._flujo = null;
      this._preview = []; this._manualItems = [];
      document.getElementById('ing-contenido').innerHTML = '';
      document.getElementById('ing-selector').style.display = '';
    });
  },

  // ── CABECERA COMÚN ────────────────────────────────────────
  _renderCabecera(id) {
    return `
      <div class="card" style="margin-bottom:8px;padding:10px 12px;" id="${id}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Fecha de ingreso *</label>
            <input type="date" id="ing-fecha" value="${this._fechaIngreso}" style="font-size:12px;padding:5px 7px;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° Guía (GR)</label>
            <input type="text" id="ing-gr" value="${escapeHtml(this._gr)}" placeholder="T022-00381" style="font-size:12px;padding:5px 7px;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Tipo de ingreso *</label>
            <select id="ing-tipo" style="font-size:12px;padding:5px 7px;">
              <option value="INGRESO NUEVO" ${this._tipoIngreso==='INGRESO NUEVO'?'selected':''}>Ingreso nuevo</option>
              <option value="MUDANZA"       ${this._tipoIngreso==='MUDANZA'?'selected':''}>Mudanza</option>
            </select>
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Condición</label>
            <select id="ing-condicion" style="font-size:12px;padding:5px 7px;">
              <option value="NUEVO">Nuevo</option>
              <option value="DESMONTADO">Desmontado</option>
              <option value="DEVOLUCION">Devolución</option>
              <option value="EXCEDENTE">Excedente</option>
            </select>
          </div>
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Cliente</label>
          <select id="ing-cliente" style="font-size:12px;padding:5px 7px;width:100%;">
            <option value="">— Seleccionar —</option>
            <option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
            <option>STP PARRES</option><option>AMERICATEL</option>
          </select>
        </div>
      </div>
    `;
  },

  _leerCabecera() {
    this._fechaIngreso = document.getElementById('ing-fecha')?.value || new Date().toISOString().slice(0,10);
    this._gr           = document.getElementById('ing-gr')?.value.trim() || '';
    this._tipoIngreso  = document.getElementById('ing-tipo')?.value || 'INGRESO NUEVO';
    return {
      fecha:     this._fechaIngreso,
      gr:        this._gr,
      tipo:      this._tipoIngreso,
      condicion: document.getElementById('ing-condicion')?.value || 'NUEVO',
      cliente:   document.getElementById('ing-cliente')?.value || '',
    };
  },

  // ── FLUJO EXCEL ───────────────────────────────────────────
  _renderExcel(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      ${this._renderCabecera('cab-excel')}
      <div class="card" style="margin-bottom:8px;padding:10px 12px;">
        <p style="font-size:11px;color:var(--text-tertiary);margin-bottom:8px;">
          Formato de columnas: <strong>FECHA | N°PEDIDO | MATERIAL | DESCRIPCION | SERIE | CANTIDAD | N°GUIA | TIPO | OBS</strong>
        </p>
        <label style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border:2px dashed var(--border-strong);border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:var(--accent);" id="label-file-ing">
          📊 Seleccionar Excel
          <input type="file" id="input-ing-excel" accept=".xlsx,.xls" style="display:none;">
        </label>
      </div>
      <div id="ing-preview"></div>
      <div id="ing-resultado"></div>
    `;
    this._bindVolver();
    document.getElementById('label-file-ing')?.addEventListener('click', ()=>
      document.getElementById('input-ing-excel')?.click());
    document.getElementById('input-ing-excel')?.addEventListener('change', e=>{
      if (e.target.files[0]) this._procesarExcel(e.target.files[0]);
    });
  },

  async _procesarExcel(file) {
    const prev = document.getElementById('ing-preview');
    prev.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo Excel…</div>';
    try {
      await cargarXlsx();
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type:'array', cellDates:true });
      let filas = [];
      for (const nombre of wb.SheetNames) {
        const ws = wb.Sheets[nombre];
        const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false });
        if (data.length > 1) { filas = data; break; }
      }
      if (!filas.length) { prev.innerHTML='<div class="alert alert-danger">Excel vacío.</div>'; return; }

      // Detectar si fila 0 es encabezado
      const fila0 = filas[0];
      const esHeader = ['FECHA','MATERIAL','PEDIDO','SKU','SERIE'].some(k =>
        fila0.some(v => String(v).toUpperCase().includes(k)));
      const inicio = esHeader ? 1 : 0;

      const cab = this._leerCabecera();

      this._preview = filas.slice(inicio)
        .filter(r => r.some(v => v !== '' && v !== null))
        .map(r => {
          // Parsear fecha sin problema de timezone
          let fecha = cab.fecha;
          if (r[0]) {
            const raw = String(r[0]).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) fecha = raw;
            else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
              const [d,m,y] = raw.split('/');
              fecha = `${y}-${m}-${d}`;
            } else if (raw.includes('T')) fecha = raw.slice(0,10);
          }
          return {
            FECHA:             fecha,
            N_PEDIDO:          String(r[1]||'').trim(),
            MATERIAL:          String(r[2]||'').trim().toUpperCase(),
            DESCRIPCION:       String(r[3]||'').trim(),
            SERIE:             String(r[4]||'').trim() || '-',
            CANTIDAD_RECIBIDA: Number(String(r[5]).replace(/,/g,''))||1,
            N_GUIA:            cab.gr || String(r[6]||'').trim(),
            TIPO_INGRESO:      cab.tipo,
            CONDICION:         cab.condicion,
            CLIENTE:           cab.cliente || String(r[7]||'').trim().toUpperCase(),
            OBSERVACIONES:     String(r[8]||'').trim(),
          };
        })
        .filter(r => r.MATERIAL && r.CANTIDAD_RECIBIDA > 0);

      if (!this._preview.length) { prev.innerHTML='<div class="alert alert-danger">Sin filas válidas.</div>'; return; }
      this._renderPreview(prev);
    } catch(e) {
      prev.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(e.message)}</div>`;
    }
  },

  _renderPreview(prev) {
    // Agrupar por pedido para mostrar resumen
    const porPedido = {};
    this._preview.forEach(r => {
      const p = r.N_PEDIDO || '(sin pedido)';
      if (!porPedido[p]) porPedido[p] = [];
      porPedido[p].push(r);
    });

    prev.innerHTML = `
      <div class="card" style="margin-bottom:8px;padding:10px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
          <div>
            <p class="card-title" style="margin:0;">${this._preview.length} ítems · ${Object.keys(porPedido).length} pedido(s)</p>
            <p style="font-size:11px;color:var(--text-tertiary);margin:2px 0 0;">
              Tipo: <strong>${this._tipoIngreso}</strong> · GR: <strong>${this._gr||'—'}</strong>
            </p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn-primary" id="btn-confirmar-ing">✓ Confirmar ingreso</button>
            <button class="btn-ghost"   id="btn-cancelar-ing">Cancelar</button>
          </div>
        </div>

        <!-- Tabla dinámica por pedido -->
        ${Object.entries(porPedido).map(([ped, items])=>`
          <details style="margin-bottom:6px;" open>
            <summary style="cursor:pointer;padding:6px 8px;background:var(--bg-row-alt);border-radius:6px;font-size:12px;font-weight:700;list-style:none;display:flex;justify-content:space-between;align-items:center;">
              <span>📦 ${escapeHtml(ped)}</span>
              <span style="font-size:11px;color:var(--text-tertiary);font-weight:400;">${items.length} ítem(s)</span>
            </summary>
            <div class="table-wrap" style="margin-top:4px;">
              <table class="data-table">
                <thead><tr><th>SKU</th><th>Descripción</th><th>Serie</th><th>Cant.</th><th>Fecha</th><th>OBS</th><th></th></tr></thead>
                <tbody>
                  ${items.map((it,i)=>{
                    const idx = this._preview.indexOf(it);
                    return `<tr id="prev-row-${idx}">
                      <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
                      <td style="font-size:11px;">${escapeHtml(it.DESCRIPCION||'—')}</td>
                      <td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE||'—')}</td>
                      <td style="font-weight:700;color:var(--accent);">${it.CANTIDAD_RECIBIDA}</td>
                      <td style="font-size:10px;">${it.FECHA||'—'}</td>
                      <td style="font-size:10px;">${escapeHtml(it.OBSERVACIONES||'—')}</td>
                      <td>
                        <button class="btn-icon" style="color:var(--danger);" onclick="IngresosView._eliminarPreview(${idx})" title="Eliminar">
                          <svg viewBox="0 0 24 24" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </details>
        `).join('')}
      </div>
      <div id="ing-resultado"></div>
    `;

    document.getElementById('btn-confirmar-ing')?.addEventListener('click', ()=>this._confirmarIngreso());
    document.getElementById('btn-cancelar-ing')?.addEventListener('click', ()=>{
      this._preview = [];
      const prev2 = document.getElementById('ing-preview');
      if (prev2) prev2.innerHTML = '';
    });
  },

  _eliminarPreview(idx) {
    this._preview.splice(idx, 1);
    const prev = document.getElementById('ing-preview');
    if (prev) this._renderPreview(prev);
  },

  async _confirmarIngreso() {
    const btn = document.getElementById('btn-confirmar-ing');
    if (btn) { btn.disabled=true; btn.textContent='Guardando…'; }

    // Asegurar que tipo siempre tenga valor
    const items = this._preview.map(r => ({...r,
      tipo: r.TIPO_INGRESO || this._tipoIngreso || 'INGRESO NUEVO'
    }));

    const { error, count } = await registrarIngresosDesdeExcel(items);
    const res = document.getElementById('ing-resultado');
    this._preview = [];
    document.getElementById('ing-preview').innerHTML = '';

    if (error) {
      if (btn) { btn.disabled=false; btn.textContent='✓ Confirmar ingreso'; }
      if (res) res.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;
      return;
    }
    if (res) res.innerHTML = `
      <div class="alert alert-success">
        <strong>✓ ${count} ítems ingresados correctamente.</strong>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
        <button class="btn-secondary" onclick="IngresosView._flujo=null;document.getElementById('ing-contenido').innerHTML='';document.getElementById('ing-selector').style.display='';">
          Nuevo ingreso
        </button>
        <button class="btn-primary" onclick="Router.navigate('consulta')">Ver en consultas →</button>
      </div>`;
  },

  // ── FLUJO MANUAL ──────────────────────────────────────────
  _renderManual(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      ${this._renderCabecera('cab-manual')}
      <div style="display:grid;grid-template-columns:1fr;gap:8px;">
        <!-- Formulario -->
        <div class="card" style="padding:10px 12px;">
          <p class="card-title" style="margin-bottom:8px;">Agregar ítem</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
            <div class="field" style="margin:0;grid-column:1/-1;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">SKU *</label>
              <input type="text" id="man-sku" placeholder="Código del producto" autocomplete="off"
                style="font-family:monospace;font-size:13px;padding:6px 8px;">
            </div>
            <div class="field" style="margin:0;grid-column:1/-1;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Descripción</label>
              <input type="text" id="man-desc" placeholder="Descripción del ítem" autocomplete="off" style="font-size:12px;padding:5px 7px;">
            </div>
            <div class="field" style="margin:0;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Serie</label>
              <div style="display:flex;gap:4px;">
                <input type="text" id="man-serie" placeholder="Sin serie: dejar vacío"
                  style="flex:1;font-family:monospace;font-size:12px;padding:5px 7px;">
                <button class="btn-icon btn-scan" id="btn-scan-serie-man" title="Escanear serie" style="flex-shrink:0;padding:5px;">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-3M16 16h.01"/></svg>
                </button>
              </div>
            </div>
            <div class="field" style="margin:0;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Cantidad *</label>
              <input type="number" id="man-cant" value="1" min="1" style="font-size:12px;padding:5px 7px;">
            </div>
            <div class="field" style="margin:0;grid-column:1/-1;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° Pedido / Paleta *</label>
              <input type="text" id="man-pedido" placeholder="Número de pedido o paleta" style="font-size:12px;padding:5px 7px;">
            </div>
            <div class="field" style="margin:0;grid-column:1/-1;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Observaciones</label>
              <input type="text" id="man-obs" placeholder="Opcional" style="font-size:12px;padding:5px 7px;">
            </div>
          </div>
          <button class="btn-primary" id="btn-agregar-man" style="width:100%;padding:8px;">+ Agregar ítem</button>
        </div>

        <!-- Lista de ítems -->
        <div class="card" style="padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <p class="card-title" style="margin:0;">Ítems (<span id="man-count">0</span>)</p>
            <button class="btn-primary" id="btn-guardar-man" style="font-size:12px;padding:5px 12px;display:none;">
              ✓ Guardar todo
            </button>
          </div>
          <div id="man-lista">
            <div class="empty-state" style="padding:12px 0;">
              <div class="empty-icon">📝</div>Agrega ítems con el formulario
            </div>
          </div>
          <div id="man-resultado" style="margin-top:8px;"></div>
        </div>
      </div>
    `;
    this._bindVolver();
    this._renderManualLista();

    document.getElementById('btn-scan-serie-man')?.addEventListener('click', ()=>{
      abrirEscaner('ing-contenido', txt=>{
        const i = document.getElementById('man-serie'); if(i) i.value = txt;
      }, e=>alert('Error cámara: '+e));
    });

    document.getElementById('btn-agregar-man')?.addEventListener('click', ()=>{
      const sku  = document.getElementById('man-sku')?.value.trim().toUpperCase();
      const cant = Number(document.getElementById('man-cant')?.value)||0;
      const ped  = document.getElementById('man-pedido')?.value.trim();
      if (!sku)  { alert('SKU es obligatorio.'); return; }
      if (!cant) { alert('Cantidad es obligatoria.'); return; }
      const cab = this._leerCabecera();
      this._manualItems.push({
        FECHA:             cab.fecha,
        N_PEDIDO:          ped,
        MATERIAL:          sku,
        DESCRIPCION:       document.getElementById('man-desc')?.value.trim()||'',
        SERIE:             document.getElementById('man-serie')?.value.trim()||'-',
        CANTIDAD_RECIBIDA: cant,
        N_GUIA:            cab.gr,
        TIPO_INGRESO:      cab.tipo,
        CONDICION:         cab.condicion,
        CLIENTE:           cab.cliente,
        OBSERVACIONES:     document.getElementById('man-obs')?.value.trim()||'',
      });
      // Limpiar campos del ítem
      ['man-sku','man-desc','man-serie','man-obs'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.value='';
      });
      document.getElementById('man-cant').value='1';
      document.getElementById('man-sku')?.focus();
      this._renderManualLista();
    });

    document.getElementById('btn-guardar-man')?.addEventListener('click', ()=>this._guardarManual());
  },

  _renderManualLista() {
    const lista = document.getElementById('man-lista');
    const count = document.getElementById('man-count');
    const btnGuardar = document.getElementById('btn-guardar-man');
    if (count) count.textContent = this._manualItems.length;
    if (btnGuardar) btnGuardar.style.display = this._manualItems.length > 0 ? '' : 'none';
    if (!lista) return;
    if (!this._manualItems.length) {
      lista.innerHTML='<div class="empty-state" style="padding:12px 0;"><div class="empty-icon">📝</div>Sin ítems aún.</div>';
      return;
    }
    lista.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Desc.</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th></th></tr></thead>
          <tbody>
            ${this._manualItems.map((it,i)=>`<tr>
              <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
              <td style="font-size:11px;">${escapeHtml(it.DESCRIPCION||'—')}</td>
              <td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE||'—')}</td>
              <td style="font-weight:700;color:var(--accent);">${it.CANTIDAD_RECIBIDA}</td>
              <td style="font-size:11px;">${escapeHtml(it.N_PEDIDO||'—')}</td>
              <td>
                <button class="btn-icon" style="color:var(--danger);" onclick="IngresosView._eliminarManual(${i})">
                  <svg viewBox="0 0 24 24" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _eliminarManual(idx) { this._manualItems.splice(idx,1); this._renderManualLista(); },

  async _guardarManual() {
    const btn = document.getElementById('btn-guardar-man');
    if (btn) { btn.disabled=true; btn.textContent='Guardando…'; }
    const { error, count } = await registrarIngresosDesdeExcel(this._manualItems);
    const res = document.getElementById('man-resultado');
    if (error) {
      if (btn) { btn.disabled=false; btn.textContent=`✓ Guardar todo`; }
      if (res) res.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;
      return;
    }
    this._manualItems=[];
    this._renderManualLista();
    if (res) res.innerHTML=`<div class="alert alert-success"><strong>✓ ${count} ítems registrados.</strong></div>`;
  },

  // ── VER PEDIDOS CARGADOS ──────────────────────────────────
  async _renderPedidos(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      <div class="card" style="padding:10px 12px;">
        <p class="card-title" style="margin-bottom:8px;">Pedidos ingresados al sistema</p>
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
          <select id="ped-filtro-tipo" style="font-size:11px;padding:4px 6px;">
            <option value="">Todos los tipos</option>
            <option value="INGRESO NUEVO">Ingreso nuevo</option>
            <option value="MUDANZA">Mudanza</option>
          </select>
          <select id="ped-filtro-cliente" style="font-size:11px;padding:4px 6px;">
            <option value="">Todos los clientes</option>
            <option>ENTEL</option><option>CLARO</option><option>TELRAD</option><option>STP PARRES</option>
          </select>
          <button class="btn-primary" id="btn-buscar-pedidos" style="font-size:11px;padding:4px 10px;">Buscar</button>
        </div>
        <div id="ped-lista"><div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div></div>
      </div>
    `;
    this._bindVolver();
    document.getElementById('btn-buscar-pedidos')?.addEventListener('click', ()=>this._cargarPedidos());
    await this._cargarPedidos();
  },

  async _cargarPedidos() {
    const tipo    = document.getElementById('ped-filtro-tipo')?.value||'';
    const cliente = document.getElementById('ped-filtro-cliente')?.value||'';
    const lista   = document.getElementById('ped-lista');
    if (!lista) return;
    lista.innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';

    let q = sb.from('stock')
      .select('paleta_pedido, cliente, tipo, fecha_ingreso, gr_ingreso')
      .order('paleta_pedido');
    if (tipo)    q = q.eq('tipo', tipo);
    if (cliente) q = q.eq('cliente', cliente);
    const { data } = await q;
    if (!data?.length) { lista.innerHTML='<div class="empty-state"><div class="empty-icon">📭</div>Sin pedidos.</div>'; return; }

    // Agrupar por pedido
    const porPedido = {};
    data.forEach(r => {
      const p = r.paleta_pedido || '(sin pedido)';
      if (!porPedido[p]) porPedido[p] = { items:0, cliente:r.cliente, tipo:r.tipo, fecha:r.fecha_ingreso, gr:r.gr_ingreso };
      porPedido[p].items++;
    });

    lista.innerHTML = Object.entries(porPedido).map(([ped, info])=>`
      <details style="margin-bottom:4px;">
        <summary style="cursor:pointer;padding:8px 10px;background:var(--bg-row-alt);border-radius:6px;
          font-size:12px;display:flex;justify-content:space-between;align-items:center;list-style:none;">
          <div>
            <span style="font-family:monospace;font-weight:700;color:var(--accent);">${escapeHtml(ped)}</span>
            <span style="font-size:10px;color:var(--text-tertiary);margin-left:8px;">${escapeHtml(info.cliente||'')}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
            <span class="pill ${info.tipo==='MUDANZA'?'pill-warning':'pill-success'}" style="font-size:9px;">${info.tipo||'—'}</span>
            <span style="font-size:11px;color:var(--text-tertiary);">${info.items} ítem(s)</span>
          </div>
        </summary>
        <div style="padding:8px 10px;border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;font-size:11px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div><span style="color:var(--text-tertiary);">Fecha:</span> ${formatFecha(info.fecha)}</div>
            <div><span style="color:var(--text-tertiary);">GR:</span> ${escapeHtml(info.gr||'—')}</div>
            <div><span style="color:var(--text-tertiary);">Tipo de ingreso:</span> ${info.tipo||'—'}</div>
            <div><span style="color:var(--text-tertiary);">Ítems:</span> <strong>${info.items}</strong></div>
          </div>
          <button class="btn-secondary" style="font-size:10px;padding:3px 8px;margin-top:6px;"
            onclick="Router.navigate('consulta')">
            Ver en consultas →
          </button>
        </div>
      </details>
    `).join('');
  },
};

Router.register('ingresos', IngresosView);
