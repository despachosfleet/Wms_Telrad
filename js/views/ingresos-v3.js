// ============================================================
// INGRESOS — Módulo principal
// Submodulos: Excel | Manual | Recepción LPN | Ver pedidos
// ============================================================
const IngresosView = {
  title: 'Ingresos',
  _flujo: null,
  _preview: [],
  _manualItems: [],
  _gr: '',
  _tipoIngreso: 'INGRESO NUEVO',
  _fechaIngreso: new Date().toISOString().slice(0,10),
  // LPN
  _lpnActual: null,
  _itemsLPN: [],
  _pedidoActual: '',
  _sesionItems: [],
  _cadenaOrdenes: null,
  _pedidoSeleccionado: null,

  hasProgress() {
    return this._preview.length > 0 || this._manualItems.length > 0 || this._itemsLPN.length > 0;
  },

  render() {
    return `
      <div id="ing-selector">
        <div class="card">
          <p class="card-title">Ingresos</p>
          <p class="card-subtitle" style="margin-bottom:12px;">Selecciona cómo vas a registrar el ingreso</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button class="recep-opcion" data-flujo="excel">
              <div class="recep-op-icon">📊</div>
              <div class="recep-op-titulo">Subir Excel</div>
              <div class="recep-op-desc">Carga el Excel ya pistoleado con el formato del Sharepoint.</div>
            </button>
            <button class="recep-opcion" data-flujo="manual">
              <div class="recep-op-icon">✏️</div>
              <div class="recep-op-titulo">Ingreso manual</div>
              <div class="recep-op-desc">Ingresa ítems uno a uno manualmente.</div>
            </button>
            <button class="recep-opcion" data-flujo="lpn">
              <div class="recep-op-icon">📦</div>
              <div class="recep-op-titulo">Recepción LPN</div>
              <div class="recep-op-desc">Pistolaje con contenedores LPN en campo.</div>
            </button>
            <button class="recep-opcion" data-flujo="pedidos">
              <div class="recep-op-icon">📋</div>
              <div class="recep-op-titulo">Ver pedidos</div>
              <div class="recep-op-desc">Lista de pedidos cargados en el sistema.</div>
            </button>
          </div>
          <div style="margin-top:10px;">
            <button class="recep-opcion" data-flujo="imprimir-lote" style="width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;text-align:left;">
              <div class="recep-op-icon" style="font-size:20px;">🖨️</div>
              <div>
                <div class="recep-op-titulo">Imprimir lote LPN</div>
                <div class="recep-op-desc">Genera etiquetas LPN en blanco para el rollo del operario.</div>
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
    ({
      excel:          () => this._renderExcel(c),
      manual:         () => this._renderManual(c),
      lpn:            () => this._renderLPN(c),
      pedidos:        () => this._renderPedidos(c),
      'imprimir-lote':() => this._renderImprimirLote(c),
    })[this._flujo]?.();
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
  _renderCabecera() {
    return `
      <div class="card" style="margin-bottom:8px;padding:10px 12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
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
              <option value="MUDANZA" ${this._tipoIngreso==='MUDANZA'?'selected':''}>Mudanza</option>
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
          <div class="field" style="margin:0;grid-column:1/-1;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Cliente</label>
            <select id="ing-cliente" style="font-size:12px;padding:5px 7px;width:100%;">
              <option value="">— Seleccionar —</option>
              <option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
              <option>STP PARRES</option><option>AMERICATEL</option>
            </select>
          </div>
        </div>
      </div>`;
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

  // ── SUBIR EXCEL ───────────────────────────────────────────
  _renderExcel(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      ${this._renderCabecera()}
      <div class="card" style="margin-bottom:8px;padding:10px 12px;">
        <p style="font-size:11px;color:var(--text-tertiary);margin-bottom:8px;">
          Columnas: <strong>FECHA | N°PEDIDO | MATERIAL | DESCRIPCION | SERIE | CANTIDAD | N°GUIA | OBS</strong>
        </p>
        <label style="display:flex;align-items:center;justify-content:center;gap:8px;
          padding:10px;border:2px dashed var(--border-strong);border-radius:8px;
          cursor:pointer;font-size:13px;font-weight:600;color:var(--accent);">
          📊 Seleccionar Excel
          <input type="file" id="input-ing-excel" accept=".xlsx,.xls" style="display:none;">
        </label>
      </div>
      <div id="ing-preview"></div>
      <div id="ing-resultado"></div>
    `;
    this._bindVolver();
    document.querySelector('label[for]')?.addEventListener('click', ()=>document.getElementById('input-ing-excel')?.click());
    document.getElementById('input-ing-excel')?.addEventListener('change', e => {
      if (e.target.files[0]) this._procesarExcel(e.target.files[0]);
    });
    // Click en el label
    c.querySelector('label')?.addEventListener('click', ()=>document.getElementById('input-ing-excel')?.click());
  },

  async _procesarExcel(file) {
    const prev = document.getElementById('ing-preview');
    prev.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo…</div>';
    try {
      await cargarXlsx();
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type:'array', cellDates:true });
      let filas = [];
      for (const nombre of wb.SheetNames) {
        const ws   = wb.Sheets[nombre];
        const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false });
        if (data.length > 1) { filas = data; break; }
      }
      if (!filas.length) { prev.innerHTML='<div class="alert alert-danger">Excel vacío.</div>'; return; }

      const fila0  = filas[0];
      const esHdr  = ['FECHA','MATERIAL','PEDIDO','SKU','SERIE'].some(k => fila0.some(v=>String(v).toUpperCase().includes(k)));
      const inicio = esHdr ? 1 : 0;
      const cab    = this._leerCabecera();

      this._preview = filas.slice(inicio)
        .filter(r => r.some(v => v!==''&&v!==null))
        .map(r => {
          let fecha = cab.fecha;
          const raw = String(r[0]||'').trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) fecha = raw;
          else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) { const [d,m,y]=raw.split('/'); fecha=`${y}-${m}-${d}`; }
          else if (raw.includes('T')) fecha = raw.slice(0,10);
          return {
            FECHA:             fecha,
            N_PEDIDO:          String(r[1]||'').trim(),
            MATERIAL:          String(r[2]||'').trim().toUpperCase(),
            DESCRIPCION:       String(r[3]||'').trim(),
            SERIE:             String(r[4]||'').trim()||'-',
            CANTIDAD_RECIBIDA: Number(String(r[5]).replace(/,/g,''))||1,
            N_GUIA:            cab.gr || String(r[6]||'').trim(),
            TIPO_INGRESO:      cab.tipo,
            CONDICION:         cab.condicion,
            CLIENTE:           cab.cliente,
            OBSERVACIONES:     String(r[7]||'').trim(),
          };
        })
        .filter(r => r.MATERIAL && r.CANTIDAD_RECIBIDA > 0);

      if (!this._preview.length) { prev.innerHTML='<div class="alert alert-danger">Sin filas válidas.</div>'; return; }
      this._renderPreview(prev);
    } catch(e) {
      prev.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(e.message)}</div>`;
    }
  },

  _renderPreview(prev) {
    const porPedido = {};
    this._preview.forEach(r => {
      const p = r.N_PEDIDO||'(sin pedido)';
      if (!porPedido[p]) porPedido[p]=[];
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
          <div style="display:flex;gap:6px;">
            <button class="btn-primary" id="btn-confirmar-ing">✓ Confirmar ingreso</button>
            <button class="btn-ghost" id="btn-cancelar-ing">Cancelar</button>
          </div>
        </div>
        ${Object.entries(porPedido).map(([ped,items])=>`
          <details style="margin-bottom:6px;" open>
            <summary style="cursor:pointer;padding:6px 8px;background:var(--bg-row-alt);border-radius:6px;
              font-size:12px;font-weight:700;list-style:none;display:flex;justify-content:space-between;align-items:center;">
              <span>📦 ${escapeHtml(ped)}</span>
              <span style="font-size:11px;color:var(--text-tertiary);font-weight:400;">${items.length} ítem(s)</span>
            </summary>
            <div class="table-wrap" style="margin-top:4px;">
              <table class="data-table">
                <thead><tr><th>SKU</th><th>Descripción</th><th>Serie</th><th>Cant.</th><th>Fecha</th><th>OBS</th><th></th></tr></thead>
                <tbody>
                  ${items.map(it=>{
                    const idx=this._preview.indexOf(it);
                    return `<tr>
                      <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
                      <td style="font-size:11px;">${escapeHtml(it.DESCRIPCION||'—')}</td>
                      <td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE||'—')}</td>
                      <td style="font-weight:700;color:var(--accent);">${it.CANTIDAD_RECIBIDA}</td>
                      <td style="font-size:10px;">${it.FECHA||'—'}</td>
                      <td style="font-size:10px;">${escapeHtml(it.OBSERVACIONES||'—')}</td>
                      <td><button class="btn-icon" style="color:var(--danger);"
                        onclick="IngresosView._eliminarPreview(${idx})">
                        <svg viewBox="0 0 24 24" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button></td>
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
    document.getElementById('btn-confirmar-ing')?.addEventListener('click',()=>this._confirmarIngreso());
    document.getElementById('btn-cancelar-ing')?.addEventListener('click',()=>{
      this._preview=[];
      document.getElementById('ing-preview').innerHTML='';
    });
  },

  _eliminarPreview(idx) {
    this._preview.splice(idx,1);
    this._renderPreview(document.getElementById('ing-preview'));
  },

  async _confirmarIngreso() {
    const btn=document.getElementById('btn-confirmar-ing');
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    const {error,count}=await registrarIngresosDesdeExcel(this._preview);
    const res=document.getElementById('ing-resultado');
    this._preview=[];
    document.getElementById('ing-preview').innerHTML='';
    if(error){if(btn){btn.disabled=false;btn.textContent='✓ Confirmar ingreso';}
      if(res)res.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;return;}
    if(res)res.innerHTML=`
      <div class="alert alert-success"><strong>✓ ${count} ítems ingresados.</strong></div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
        <button class="btn-secondary" onclick="IngresosView._flujo=null;document.getElementById('ing-contenido').innerHTML='';document.getElementById('ing-selector').style.display='';">Nuevo ingreso</button>
        <button class="btn-primary" onclick="Router.navigate('consulta')">Ver en consultas →</button>
      </div>`;
  },

  // ── MANUAL ────────────────────────────────────────────────
  _renderManual(c) {
    c.innerHTML=`
      ${this._btnVolver()}
      ${this._renderCabecera()}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="card" style="padding:10px 12px;">
          <p class="card-title" style="margin-bottom:8px;">Agregar ítem</p>
          <div style="display:flex;flex-direction:column;gap:5px;">
            <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">SKU *</label>
              <input type="text" id="man-sku" autocomplete="off" style="font-family:monospace;font-size:13px;padding:6px 8px;"></div>
            <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Descripción</label>
              <input type="text" id="man-desc" autocomplete="off" style="font-size:12px;padding:5px 7px;"></div>
            <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Serie</label>
              <div style="display:flex;gap:4px;">
                <input type="text" id="man-serie" style="flex:1;font-family:monospace;font-size:12px;padding:5px 7px;">
                <button class="btn-icon btn-scan" id="btn-scan-serie-man" style="flex-shrink:0;padding:5px;">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg>
                </button>
              </div>
            </div>
            <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Cantidad *</label>
              <input type="number" id="man-cant" value="1" min="1" style="font-size:12px;padding:5px 7px;"></div>
            <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° Pedido / Paleta *</label>
              <input type="text" id="man-pedido" style="font-size:12px;padding:5px 7px;"></div>
            <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Observaciones</label>
              <input type="text" id="man-obs" style="font-size:12px;padding:5px 7px;"></div>
            <button class="btn-primary" id="btn-agregar-man" style="padding:8px;">+ Agregar</button>
          </div>
        </div>
        <div class="card" style="padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <p class="card-title" style="margin:0;">Ítems (<span id="man-count">0</span>)</p>
            <button class="btn-primary" id="btn-guardar-man" style="font-size:12px;padding:5px 12px;display:none;">✓ Guardar</button>
          </div>
          <div id="man-lista"><div class="empty-state" style="padding:12px 0;"><div class="empty-icon">📝</div>Sin ítems</div></div>
          <div id="man-resultado" style="margin-top:8px;"></div>
        </div>
      </div>
    `;
    this._bindVolver();
    this._renderManualLista();
    document.getElementById('btn-scan-serie-man')?.addEventListener('click',()=>{
      abrirEscaner('ing-contenido',txt=>{const i=document.getElementById('man-serie');if(i)i.value=txt;},e=>alert(e));
    });
    document.getElementById('btn-agregar-man')?.addEventListener('click',()=>{
      const sku=document.getElementById('man-sku')?.value.trim().toUpperCase();
      const cant=Number(document.getElementById('man-cant')?.value)||0;
      if(!sku){alert('SKU obligatorio.');return;}
      if(!cant){alert('Cantidad obligatoria.');return;}
      const cab=this._leerCabecera();
      this._manualItems.push({
        FECHA:cab.fecha, N_PEDIDO:document.getElementById('man-pedido')?.value.trim(),
        MATERIAL:sku, DESCRIPCION:document.getElementById('man-desc')?.value.trim()||'',
        SERIE:document.getElementById('man-serie')?.value.trim()||'-',
        CANTIDAD_RECIBIDA:cant, N_GUIA:cab.gr, TIPO_INGRESO:cab.tipo,
        CONDICION:cab.condicion, CLIENTE:cab.cliente,
        OBSERVACIONES:document.getElementById('man-obs')?.value.trim()||'',
      });
      ['man-sku','man-desc','man-serie','man-obs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
      document.getElementById('man-cant').value='1';
      document.getElementById('man-sku')?.focus();
      this._renderManualLista();
    });
    document.getElementById('btn-guardar-man')?.addEventListener('click',()=>this._guardarManual());
  },

  _renderManualLista() {
    const lista=document.getElementById('man-lista');
    const count=document.getElementById('man-count');
    const btnG=document.getElementById('btn-guardar-man');
    if(count)count.textContent=this._manualItems.length;
    if(btnG)btnG.style.display=this._manualItems.length>0?'':'none';
    if(!lista)return;
    if(!this._manualItems.length){lista.innerHTML='<div class="empty-state" style="padding:12px 0;"><div class="empty-icon">📝</div>Sin ítems</div>';return;}
    lista.innerHTML=`<div class="table-wrap"><table class="data-table">
      <thead><tr><th>SKU</th><th>Desc.</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th></th></tr></thead>
      <tbody>${this._manualItems.map((it,i)=>`<tr>
        <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
        <td style="font-size:11px;">${escapeHtml(it.DESCRIPCION||'—')}</td>
        <td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE||'—')}</td>
        <td style="font-weight:700;">${it.CANTIDAD_RECIBIDA}</td>
        <td style="font-size:11px;">${escapeHtml(it.N_PEDIDO||'—')}</td>
        <td><button class="btn-icon" style="color:var(--danger);" onclick="IngresosView._eliminarManual(${i})">
          <svg viewBox="0 0 24 24" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  },

  _eliminarManual(idx){this._manualItems.splice(idx,1);this._renderManualLista();},

  async _guardarManual(){
    const btn=document.getElementById('btn-guardar-man');
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    const {error,count}=await registrarIngresosDesdeExcel(this._manualItems);
    const res=document.getElementById('man-resultado');
    if(error){if(btn){btn.disabled=false;btn.textContent='✓ Guardar';}
      if(res)res.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;return;}
    this._manualItems=[];this._renderManualLista();
    if(res)res.innerHTML=`<div class="alert alert-success"><strong>✓ ${count} ítems registrados.</strong></div>`;
  },

  // ── VER PEDIDOS ───────────────────────────────────────────
  async _renderPedidos(c) {
    c.innerHTML=`
      ${this._btnVolver()}
      <div class="card" style="padding:10px 12px;">
        <p class="card-title" style="margin-bottom:8px;">Pedidos cargados</p>
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
          <select id="ped-tipo" style="font-size:11px;padding:4px 6px;">
            <option value="">Todos los tipos</option>
            <option value="INGRESO NUEVO">Ingreso nuevo</option>
            <option value="MUDANZA">Mudanza</option>
          </select>
          <select id="ped-cliente" style="font-size:11px;padding:4px 6px;">
            <option value="">Todos los clientes</option>
            <option>ENTEL</option><option>CLARO</option><option>TELRAD</option><option>STP PARRES</option>
          </select>
          <button class="btn-primary" id="btn-buscar-ped" style="font-size:11px;padding:4px 10px;">Buscar</button>
        </div>
        <div id="ped-lista"><div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div></div>
      </div>`;
    this._bindVolver();
    document.getElementById('btn-buscar-ped')?.addEventListener('click',()=>this._cargarPedidos());
    await this._cargarPedidos();
  },

  async _cargarPedidos(){
    const tipo=document.getElementById('ped-tipo')?.value||'';
    const cliente=document.getElementById('ped-cliente')?.value||'';
    const lista=document.getElementById('ped-lista');
    if(!lista)return;
    lista.innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';
    let q=sb.from('stock').select('paleta_pedido,cliente,tipo,fecha_ingreso,gr_ingreso').order('paleta_pedido');
    if(tipo)q=q.eq('tipo',tipo);
    if(cliente)q=q.eq('cliente',cliente);
    const {data}=await q;
    if(!data?.length){lista.innerHTML='<div class="empty-state"><div class="empty-icon">📭</div>Sin pedidos.</div>';return;}
    const pp={};
    data.forEach(r=>{const p=r.paleta_pedido||'(sin pedido)';if(!pp[p])pp[p]={items:0,cliente:r.cliente,tipo:r.tipo,fecha:r.fecha_ingreso,gr:r.gr_ingreso};pp[p].items++;});
    lista.innerHTML=Object.entries(pp).map(([ped,info])=>`
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
            <div><span style="color:var(--text-tertiary);">Tipo:</span> ${info.tipo||'—'}</div>
            <div><span style="color:var(--text-tertiary);">Ítems:</span> <strong>${info.items}</strong></div>
          </div>
        </div>
      </details>`).join('');
  },

  // ── IMPRIMIR LOTE LPN ─────────────────────────────────────
  async _renderImprimirLote(c){
    c.innerHTML=`
      ${this._btnVolver()}
      <div class="card" style="padding:10px 12px;">
        <p class="card-title">Generar lote de LPNs</p>
        <p class="card-subtitle" style="margin-bottom:10px;">Etiquetas en blanco para el rollo del operario.</p>
        <div class="field"><label>Cantidad</label><input type="number" id="lote-cant" value="50" min="1" max="500" style="max-width:100px;"></div>
        <button class="btn-primary" id="btn-generar-lote" style="margin-top:8px;">🖨️ Generar e imprimir</button>
        <div id="lote-res" style="margin-top:8px;"></div>
      </div>`;
    this._bindVolver();
    document.getElementById('btn-generar-lote')?.addEventListener('click',async()=>{
      const cant=Number(document.getElementById('lote-cant')?.value)||50;
      const codigos=await generarLoteLPN(cant);
      this._imprimirLoteLPN(codigos);
      document.getElementById('lote-res').innerHTML=`<div class="alert alert-success">✓ ${cant} etiquetas enviadas a imprimir (${codigos[0]} — ${codigos[codigos.length-1]})</div>`;
    });
  },

  _imprimirLoteLPN(codigos){
    const win=window.open('','_blank','width=500,height=600');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LPNs</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>@page{size:100mm 55mm;margin:0;}body{margin:0;}
      .e{width:100mm;height:55mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;padding:3mm;box-sizing:border-box;}
      .c{font-size:14pt;font-weight:900;font-family:monospace;margin-bottom:2mm;}svg{width:90mm;height:22mm;}
      .s{font-size:8pt;color:#666;margin-top:2mm;}</style></head><body>
      ${codigos.map(cd=>`<div class="e"><div class="c">${cd}</div><svg id="bc-${cd}"></svg><div class="s">Fleet WMS — Telrad</div></div>`).join('')}
      <script>window.onload=function(){
        ${codigos.map(cd=>`JsBarcode("#bc-${cd}","${cd}",{format:"CODE128",width:2.2,height:60,displayValue:false,margin:0});`).join('\n')}
        setTimeout(()=>window.print(),600);
      };<\/script></body></html>`);
    win.document.close();
  },

  // ── RECEPCIÓN LPN ─────────────────────────────────────────
  _renderLPN(c){
    const tieneExcel = !!this._cadenaOrdenes?.size;
    const orden = this._pedidoActual ? this._cadenaOrdenes?.get(this._pedidoActual) : null;
    const esperados = orden?.items || [];
    const recibidos = this._itemsLPN.length + this._sesionItems.filter(i=>i._lpn).length;
    const total     = esperados.length || 0;
    const pct       = total ? Math.round((this._itemsLPN.length / total) * 100) : 0;

    c.innerHTML = `
      ${this._btnVolver()}

      <!-- CABECERA COMPACTA -->
      <div class="card" style="margin-bottom:8px;padding:8px 12px;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr) auto;gap:6px;align-items:end;">
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Fecha *</label>
            <input type="date" id="lpn-fecha" value="${this._fechaIngreso}" style="font-size:11px;padding:4px 6px;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Tipo de ingreso *</label>
            <select id="lpn-tipo-ing" style="font-size:11px;padding:4px 6px;">
              <option value="" disabled ${!this._tipoIngreso?'selected':''}>Seleccionar...</option>
              <option value="INGRESO NUEVO" ${this._tipoIngreso==='INGRESO NUEVO'?'selected':''}>Ingreso nuevo</option>
              <option value="MUDANZA" ${this._tipoIngreso==='MUDANZA'?'selected':''}>Mudanza</option>
            </select>
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° GR</label>
            <input type="text" id="lpn-gr" value="${escapeHtml(this._gr)}" placeholder="T022-00381" style="font-size:11px;padding:4px 6px;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">LPN activo</label>
            <div style="display:flex;gap:3px;">
              <input type="text" id="lpn-codigo-inp" placeholder="LPN00001"
                style="flex:1;min-width:0;font-family:monospace;font-size:11px;padding:4px 6px;font-weight:700;color:var(--accent);"
                value="${this._lpnActual?.codigo||''}">
              <button class="btn-icon btn-scan" id="btn-scan-lpn" style="padding:4px;" title="Escanear LPN">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg>
              </button>
            </div>
          </div>
          <button class="btn-primary" id="btn-activar-lpn" style="font-size:11px;padding:5px 10px;white-space:nowrap;align-self:end;">
            ${this._lpnActual ? '✓ '+this._lpnActual.codigo : 'Activar'}
          </button>
        </div>

        <!-- Segunda fila: Excel + Pedido -->
        <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:6px;align-items:end;margin-top:6px;">
          <label style="display:inline-flex;align-items:center;gap:5px;padding:4px 8px;
            border:1px solid var(--border-strong);border-radius:6px;cursor:pointer;font-size:11px;white-space:nowrap;">
            📊 ${this._cadenaOrdenes ? 'Cambiar Excel' : 'Cargar Excel *'}
            <input type="file" id="input-cadena-lpn" accept=".xlsx,.xls" style="display:none;">
          </label>
          ${this._cadenaOrdenes ? `
            <div class="field" style="margin:0;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Pedido activo *</label>
              <select id="sel-pedido-lpn" style="width:100%;font-size:11px;padding:4px 6px;">
                <option value="">— Seleccionar pedido —</option>
                ${[...this._cadenaOrdenes.keys()].map(p=>`
                  <option value="${escapeHtml(p)}" ${this._pedidoActual===p?'selected':''}>${escapeHtml(p)}</option>
                `).join('')}
              </select>
            </div>
            <div class="field" style="margin:0;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">GR del pedido</label>
              <input type="text" id="lpn-gr-pedido" value="${escapeHtml(orden?.gr||this._gr)}"
                placeholder="Se llena al seleccionar" style="font-size:11px;padding:4px 6px;" readonly>
            </div>
          ` : `
            <div class="field" style="margin:0;grid-column:2/-1;">
              <label style="font-size:9px;color:var(--warning);font-weight:700;">⚠ Debes cargar el Excel de referencia para ver el progreso del pedido</label>
            </div>
          `}
        </div>
        <div id="lpn-msg" style="font-size:11px;margin-top:4px;"></div>
      </div>

      <!-- LAYOUT PRINCIPAL: izq pistolaje | der progreso -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:start;">

        <!-- COLUMNA IZQUIERDA: pistolaje -->
        <div>
          <!-- Selector de modo -->
          <div style="display:flex;gap:0;margin-bottom:6px;border:1px solid var(--border-strong);border-radius:8px;overflow:hidden;">
            <button id="modo-rapido" onclick="IngresosView._setModo('rapido')"
              style="flex:1;padding:6px;font-size:11px;font-weight:700;border:none;cursor:pointer;
              background:${this._modoRapido!==false?'var(--accent)':'var(--bg-input)'};
              color:${this._modoRapido!==false?'#fff':'var(--text-secondary)'};">
              ⚡ Modo rápido
            </button>
            <button id="modo-guiado" onclick="IngresosView._setModo('guiado')"
              style="flex:1;padding:6px;font-size:11px;font-weight:700;border:none;cursor:pointer;
              background:${this._modoRapido===false?'var(--accent)':'var(--bg-input)'};
              color:${this._modoRapido===false?'#fff':'var(--text-secondary)'};">
              🔍 Modo guiado
            </button>
          </div>

          ${this._modoRapido !== false ? `
          <!-- MODO RÁPIDO: pistolaje como tu superior -->
          <div class="card" style="padding:10px 12px;">
            <p style="font-size:10px;color:var(--text-tertiary);margin-bottom:8px;">
              Escanea series una tras otra. El sistema identifica el SKU automáticamente. 
              Para lotizados usa el formulario de abajo.
            </p>
            <div style="display:flex;gap:6px;margin-bottom:6px;">
              <input type="text" id="lpn-serie-rapido" placeholder="Escanear serie (Enter agrega automáticamente)"
                autofocus autocomplete="off"
                style="flex:1;font-family:monospace;font-size:14px;padding:8px 10px;
                border:2px solid var(--accent);border-radius:8px;background:var(--bg-input);color:var(--text);">
              <button class="btn-icon btn-scan" id="btn-scan-rapido" style="padding:8px;" title="Cámara">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg>
              </button>
            </div>
            <div id="lpn-rapido-resultado" style="min-height:36px;padding:6px 8px;border-radius:6px;
              background:var(--bg-row-alt);font-size:11px;margin-bottom:8px;">
              Listo para escanear...
            </div>
            <!-- Lotizados en modo rápido -->
            <details style="margin-top:4px;">
              <summary style="font-size:10px;color:var(--text-tertiary);cursor:pointer;padding:2px 0;">
                + Agregar ítem sin serie (lotizado)
              </summary>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px;margin-top:6px;align-items:end;">
                <input type="text" id="lpn-sku-lot" placeholder="SKU" autocomplete="off"
                  style="font-family:monospace;font-size:11px;padding:4px 6px;">
                <input type="number" id="lpn-cant-lot" value="1" min="1"
                  style="width:60px;font-size:11px;padding:4px 6px;">
                <button class="btn-secondary" id="btn-agregar-lot" style="font-size:11px;padding:4px 8px;white-space:nowrap;">+ Agregar</button>
              </div>
            </details>
          </div>
          ` : `
          <!-- MODO GUIADO: SKU → serie → cantidad -->
          <div class="card" style="padding:10px 12px;">
            <div class="field" style="margin-bottom:6px;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">SKU (buscar)</label>
              <input type="text" id="lpn-sku-search" placeholder="Escribe SKU o descripción..."
                autocomplete="off" autofocus style="width:100%;font-size:12px;padding:5px 7px;">
              <div id="lpn-sku-sugerencias" style="display:none;border:1px solid var(--border-strong);
                border-radius:0 0 6px 6px;background:var(--bg-card);max-height:130px;overflow-y:auto;"></div>
            </div>
            <div id="lpn-sku-info" style="display:none;padding:5px 8px;background:var(--accent-dim);
              border-radius:6px;font-size:11px;margin-bottom:6px;"></div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:6px;margin-bottom:6px;align-items:end;">
              <div class="field" style="margin:0;">
                <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Serie</label>
                <div style="display:flex;gap:4px;">
                  <input type="text" id="lpn-serie" placeholder="Serie o vacío si lotizado"
                    style="flex:1;font-family:monospace;font-size:12px;padding:5px 7px;">
                  <button class="btn-icon btn-scan" id="btn-scan-serie-lpn" style="padding:5px;">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg>
                  </button>
                </div>
              </div>
              <div class="field" style="margin:0;">
                <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Cant.</label>
                <input type="number" id="lpn-cant" value="1" min="1" style="width:60px;font-size:12px;padding:5px 6px;">
              </div>
            </div>
            <button class="btn-primary" id="btn-agregar-lpn" style="width:100%;padding:7px;">+ Agregar ítem</button>
          </div>
          `}

          <!-- Lista de ítems confirmados en este LPN -->
          <div class="card" style="padding:10px 12px;margin-top:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
              <p style="margin:0;font-size:12px;font-weight:700;">
                LPN actual — <span id="lpn-count" style="color:var(--accent);">0</span> ítem(s)
              </p>
              <button class="btn-success" id="btn-cerrar-lpn"
                style="font-size:11px;padding:4px 10px;display:none;">Cerrar LPN ✓</button>
            </div>
            <div id="lpn-lista" style="max-height:200px;overflow-y:auto;">
              <div class="empty-state" style="padding:8px 0;font-size:11px;">
                <div class="empty-icon" style="font-size:20px;">📭</div>Pistola ítems arriba
              </div>
            </div>
          </div>

          <!-- Sesión (LPNs cerrados) -->
          <div id="lpn-sesion" style="display:${this._sesionItems.length?'':'none'};">
            <div class="card" style="padding:10px 12px;margin-top:8px;border-left:3px solid var(--success);">
              <p style="font-size:12px;font-weight:700;margin-bottom:6px;">
                Sesión: <span id="sesion-count">${this._sesionItems.length}</span> ítem(s)
              </p>
              <div id="sesion-lpns"></div>
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
                <button class="btn-primary" id="btn-exportar-sesion" style="font-size:12px;">↓ Exportar Excel</button>
                <button class="btn-ghost" id="btn-nueva-sesion" style="font-size:12px;">Nueva sesión</button>
              </div>
            </div>
          </div>
        </div>

        <!-- COLUMNA DERECHA: progreso del pedido -->
        <div class="card" style="padding:10px 12px;">
          ${!tieneExcel ? `
            <div class="empty-state" style="padding:20px 0;">
              <div class="empty-icon">📊</div>
              <p style="font-size:12px;">Carga el Excel de referencia para ver el progreso del pedido</p>
            </div>
          ` : !this._pedidoActual ? `
            <div class="empty-state" style="padding:20px 0;">
              <div class="empty-icon">📋</div>
              <p style="font-size:12px;">Selecciona un pedido para ver los ítems esperados</p>
            </div>
          ` : `
            <!-- Resumen numérico -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px;text-align:center;">
              <div style="padding:6px 4px;background:var(--bg-row-alt);border-radius:6px;">
                <div style="font-size:18px;font-weight:900;color:var(--accent);">${total}</div>
                <div style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Esperados</div>
              </div>
              <div style="padding:6px 4px;background:var(--success-bg);border-radius:6px;">
                <div style="font-size:18px;font-weight:900;color:var(--success-text);">${this._itemsLPN.length}</div>
                <div style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Recibidos</div>
              </div>
              <div style="padding:6px 4px;background:var(--warning-bg);border-radius:6px;">
                <div style="font-size:18px;font-weight:900;color:var(--warning);">${Math.max(0,total-this._itemsLPN.length)}</div>
                <div style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Pendientes</div>
              </div>
            </div>

            <!-- Barra de progreso -->
            <div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-tertiary);margin-bottom:3px;">
                <span>Progreso de recepción</span><span>${pct}%</span>
              </div>
              <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:var(--success-text);border-radius:4px;transition:width .3s;"></div>
              </div>
            </div>

            <!-- Lista de ítems esperados -->
            <p style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:4px;">
              Ítems del pedido ${escapeHtml(this._pedidoActual)}
            </p>
            <div id="lpn-esperados" style="max-height:calc(100vh - 420px);overflow-y:auto;min-height:100px;">
              ${this._renderEsperados()}
            </div>
          `}
        </div>
      </div>
    `;
    this._bindVolver();
    this._bindLPNEventos();
    this._renderItemsLPN();
    if(this._sesionItems.length) this._renderSesion();
  },

  _setModo(modo){
    this._modoRapido = modo === 'rapido';
    this._renderLPN(document.getElementById('ing-contenido'));
  },

  _renderEsperados(){
    const orden = this._cadenaOrdenes?.get(this._pedidoActual);
    if(!orden?.items?.length) return '<p style="font-size:11px;color:var(--text-tertiary);">Sin ítems.</p>';
    return orden.items.map(it=>{
      const conf = this._itemsLPN.some(i=>
        (it.serie && i.SERIE && i.SERIE.toUpperCase()===String(it.serie).toUpperCase()) ||
        (!it.serie && i.MATERIAL===it.sku)
      ) || this._sesionItems.some(i=>
        (it.serie && i.SERIE && i.SERIE.toUpperCase()===String(it.serie).toUpperCase()) ||
        (!it.serie && i.MATERIAL===it.sku)
      );
      return `<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;
        border-radius:5px;margin-bottom:2px;transition:background .2s;
        background:${conf?'var(--success-bg)':'transparent'};">
        <span style="font-size:15px;flex-shrink:0;">${conf?'✅':'⬜'}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;font-family:monospace;">${escapeHtml(it.sku||'')}</div>
          <div style="font-size:10px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${escapeHtml(it.descripcion||'')}
          </div>
          ${it.serie?`<div style="font-size:9px;color:var(--text-tertiary);font-family:monospace;">${escapeHtml(it.serie)}</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <span style="font-size:12px;font-weight:700;${conf?'color:var(--success-text)':''}">${it.cantidad||1}</span>
          <div style="font-size:9px;color:var(--text-tertiary);">${it.serie?'seriado':'lotizado'}</div>
        </div>
      </div>`;
    }).join('');
  },

  _bindLPNEventos(){
    // Excel referencia
    document.getElementById('input-cadena-lpn')?.addEventListener('change',async e=>{
      if(!e.target.files[0])return;
      try{
        await cargarXlsx();
        const buf=await e.target.files[0].arrayBuffer();
        const wb=XLSX.read(buf,{type:'array',cellDates:true});
        let filas=[];
        for(const nombre of wb.SheetNames){
          const ws=wb.Sheets[nombre];
          const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
          if(data.length>1){filas=data;break;}
        }
        const fila0=filas[0]||[];
        const esHdr=['FECHA','MATERIAL','PEDIDO','SKU','SERIE'].some(k=>fila0.some(v=>String(v).toUpperCase().includes(k)));
        const inicio=esHdr?1:0;
        const porPedido=new Map();
        filas.slice(inicio).filter(r=>r.some(v=>v!=='')).forEach(r=>{
          const ped=String(r[1]||'').trim();
          const sku=String(r[2]||'').trim().toUpperCase();
          const desc=String(r[3]||'').trim();
          const serie=String(r[4]||'').trim();
          const cant=Number(String(r[5]).replace(/,/g,''))||1;
          const gr=String(r[6]||'').trim();
          if(!sku||!cant)return;
          if(!porPedido.has(ped))porPedido.set(ped,{pedido:ped,gr,items:[]});
          porPedido.get(ped).items.push({sku,descripcion:desc,serie,cantidad:cant,gr});
        });
        this._cadenaOrdenes=porPedido;
        this._pedidoActual='';
        this._renderLPN(document.getElementById('ing-contenido'));
      }catch(err){alert('Error leyendo Excel: '+err.message);}
    });

    // Selector pedido
    document.getElementById('sel-pedido-lpn')?.addEventListener('change',e=>{
      this._pedidoActual=e.target.value||'';
      const orden=this._cadenaOrdenes?.get(this._pedidoActual);
      if(orden?.gr){
        this._gr=orden.gr;
        const g=document.getElementById('lpn-gr'); if(g)g.value=orden.gr;
        const g2=document.getElementById('lpn-gr-pedido'); if(g2)g2.value=orden.gr;
      }
      const esp=document.getElementById('lpn-esperados');
      if(esp)esp.innerHTML=this._renderEsperados();
      // Actualizar resumen
      const c2=document.getElementById('ing-contenido');
      if(c2)this._renderLPN(c2);
    });

    // Escanear LPN
    document.getElementById('btn-scan-lpn')?.addEventListener('click',()=>{
      abrirEscaner('ing-contenido',txt=>{
        const i=document.getElementById('lpn-codigo-inp');if(i)i.value=txt.toUpperCase();
      },e=>alert(e));
    });

    // Activar LPN
    document.getElementById('btn-activar-lpn')?.addEventListener('click',()=>this._activarLPN());
    document.getElementById('lpn-codigo-inp')?.addEventListener('keydown',e=>{if(e.key==='Enter')this._activarLPN();});

    // ── MODO RÁPIDO ──
    const serieRapido=document.getElementById('lpn-serie-rapido');
    serieRapido?.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        const serie=serieRapido.value.trim();
        if(serie) this._pistolarSerieRapido(serie);
      }
    });
    document.getElementById('btn-scan-rapido')?.addEventListener('click',()=>{
      abrirEscaner('ing-contenido',txt=>{
        this._pistolarSerieRapido(txt.trim());
      },e=>alert(e));
    });
    document.getElementById('btn-agregar-lot')?.addEventListener('click',()=>{
      const sku=document.getElementById('lpn-sku-lot')?.value.trim().toUpperCase();
      const cant=Number(document.getElementById('lpn-cant-lot')?.value)||1;
      if(!sku){alert('Ingresa el SKU.');return;}
      if(!this._lpnActual){alert('Activa un LPN primero.');return;}
      this._agregarItemConfirmado({MATERIAL:sku,SERIE:'-',CANTIDAD_RECIBIDA:cant,DESCRIPCION:'',_lotizado:true});
      document.getElementById('lpn-sku-lot').value='';
      document.getElementById('lpn-cant-lot').value='1';
    });

    // ── MODO GUIADO ──
    let _skuTimer=null;
    document.getElementById('lpn-sku-search')?.addEventListener('input',e=>{
      clearTimeout(_skuTimer);
      const val=e.target.value.trim();
      if(val.length<2){document.getElementById('lpn-sku-sugerencias').style.display='none';return;}
      _skuTimer=setTimeout(()=>this._buscarSKU(val),300);
    });
    document.getElementById('btn-scan-serie-lpn')?.addEventListener('click',()=>{
      abrirEscaner('ing-contenido',txt=>{
        const i=document.getElementById('lpn-serie');if(i)i.value=txt;
      },e=>alert(e));
    });
    document.getElementById('btn-agregar-lpn')?.addEventListener('click',()=>this._agregarItemLPN());
    document.getElementById('lpn-serie')?.addEventListener('keydown',e=>{if(e.key==='Enter')this._agregarItemLPN();});

    // Cerrar LPN y sesión
    document.getElementById('btn-cerrar-lpn')?.addEventListener('click',()=>this._cerrarLPN());
    document.getElementById('btn-exportar-sesion')?.addEventListener('click',()=>{
      exportarRecepcionAExcel(this._sesionItems,`ingresos_${this._fechaIngreso}.xlsx`);
    });
    document.getElementById('btn-nueva-sesion')?.addEventListener('click',()=>{
      if(confirm('¿Iniciar nueva sesión? Los LPNs cerrados quedan guardados.')){
        this._sesionItems=[];this._lpnActual=null;this._itemsLPN=[];
        this._renderLPN(document.getElementById('ing-contenido'));
      }
    });
  },

  async _pistolarSerieRapido(serie){
    if(!this._lpnActual){
      document.getElementById('lpn-rapido-resultado').innerHTML=
        '<span style="color:var(--danger-text);">⚠ Activa un LPN primero.</span>';
      return;
    }
    const res=document.getElementById('lpn-rapido-resultado');
    if(res)res.innerHTML='<span style="color:var(--text-tertiary);">Buscando...</span>';

    // Buscar en ítems esperados del pedido activo primero
    let itemEncontrado=null;
    if(this._pedidoActual && this._cadenaOrdenes?.get(this._pedidoActual)){
      const items=this._cadenaOrdenes.get(this._pedidoActual).items||[];
      itemEncontrado=items.find(it=>it.serie && it.serie.toUpperCase()===serie.toUpperCase());
    }

    // Si no está en cadena, buscar en stock
    if(!itemEncontrado){
      const stockItem=await buscarPorSerie(serie);
      if(stockItem) itemEncontrado={sku:stockItem.sku,descripcion:stockItem.descripcion,serie,cantidad:1};
    }

    const sku = itemEncontrado?.sku||'';
    const desc= itemEncontrado?.descripcion||'';

    if(res){
      res.innerHTML=itemEncontrado
        ? `<span style="color:var(--success-text);">✅ ${escapeHtml(sku)} — ${escapeHtml(desc.slice(0,40))}</span>`
        : `<span style="color:var(--warning);">⚠ Serie no encontrada — se registra sin SKU</span>`;
    }

    this._agregarItemConfirmado({
      MATERIAL:sku, DESCRIPCION:desc, SERIE:serie, CANTIDAD_RECIBIDA:1,
    });

    // Limpiar campo y enfocar para siguiente pistolaje
    const inp=document.getElementById('lpn-serie-rapido');
    if(inp){inp.value='';inp.focus();}
  },

  _agregarItemConfirmado(item){
    const fecha=document.getElementById('lpn-fecha')?.value||this._fechaIngreso;
    const tipo=document.getElementById('lpn-tipo-ing')?.value||this._tipoIngreso||'INGRESO NUEVO';
    this._itemsLPN.push({
      MATERIAL:item.MATERIAL, DESCRIPCION:item.DESCRIPCION||'',
      SERIE:item.SERIE||'-', CANTIDAD_RECIBIDA:item.CANTIDAD_RECIBIDA||1,
      N_PEDIDO:this._pedidoActual, N_GUIA:this._gr,
      TIPO_INGRESO:tipo, FECHA:fecha,
      _lpn:this._lpnActual?.codigo,
    });
    this._renderItemsLPN();
    // Actualizar esperados sin re-render completo
    const esp=document.getElementById('lpn-esperados');
    if(esp)esp.innerHTML=this._renderEsperados();
    // Actualizar contadores y barra sin re-render completo
    const total=this._cadenaOrdenes?.get(this._pedidoActual)?.items?.length||0;
    const recv=this._itemsLPN.length;
    const pct=total?Math.round((recv/total)*100):0;
    ['lpn-count'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=recv;});
    const barra=document.querySelector('#ing-contenido [style*="width:"][style*="background:var(--success-text)"]');
    if(barra)barra.style.width=pct+'%';
  },


  _imprimirLoteLPN(codigos){
    const win=window.open('','_blank','width=500,height=600');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LPNs</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>@page{size:100mm 55mm;margin:0;}body{margin:0;}
      .e{width:100mm;height:55mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;padding:3mm;box-sizing:border-box;}
      .c{font-size:14pt;font-weight:900;font-family:monospace;margin-bottom:2mm;}svg{width:90mm;height:22mm;}
      .s{font-size:8pt;color:#666;margin-top:2mm;}</style></head><body>
      ${codigos.map(cd=>`<div class="e"><div class="c">${cd}</div><svg id="bc-${cd}"></svg><div class="s">Fleet WMS — Telrad</div></div>`).join('')}
      <script>window.onload=function(){
        ${codigos.map(cd=>`JsBarcode("#bc-${cd}","${cd}",{format:"CODE128",width:2.2,height:60,displayValue:false,margin:0});`).join('\n')}
        setTimeout(()=>window.print(),600);
      };<\/script></body></html>`);
    win.document.close();
  },

  // ── RECEPCIÓN LPN ─────────────────────────────────────────
  _renderLPN(c){
    c.innerHTML=`
      ${this._btnVolver()}

      <!-- Cabecera general: fecha + tipo + Excel cadena -->
      <div class="card" style="margin-bottom:8px;padding:10px 12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Fecha de ingreso *</label>
            <input type="date" id="lpn-fecha" value="${this._fechaIngreso}" style="font-size:12px;padding:5px 7px;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Tipo de ingreso</label>
            <select id="lpn-tipo-ing" style="font-size:12px;padding:5px 7px;">
              <option value="INGRESO NUEVO">Ingreso nuevo</option>
              <option value="MUDANZA">Mudanza</option>
            </select>
          </div>
        </div>

        <!-- Excel de cadena opcional -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <label style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;
            border:1px solid var(--border-strong);border-radius:6px;cursor:pointer;font-size:11px;">
            📊 ${this._cadenaOrdenes ? 'Cambiar Excel de referencia' : 'Cargar Excel de referencia (opcional)'}
            <input type="file" id="input-cadena-lpn" accept=".xlsx,.xls" style="display:none;">
          </label>
          ${this._cadenaOrdenes ? `<span style="font-size:11px;color:var(--success-text);">✓ ${this._cadenaOrdenes.size} pedido(s) cargados</span>` : ''}
        </div>

        <!-- Selector de pedido si hay cadena -->
        ${this._cadenaOrdenes ? `
          <div style="margin-top:8px;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Pedido activo</label>
            <select id="sel-pedido-lpn" style="width:100%;font-size:12px;padding:5px 7px;margin-top:3px;">
              <option value="">— Seleccionar pedido —</option>
              ${[...this._cadenaOrdenes.keys()].map(p=>`
                <option value="${escapeHtml(p)}" ${this._pedidoActual===p?'selected':''}>${escapeHtml(p)}</option>
              `).join('')}
            </select>
          </div>
        ` : `
          <div style="margin-top:8px;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° Pedido *</label>
            <input type="text" id="lpn-pedido-manual" value="${escapeHtml(this._pedidoActual)}"
              placeholder="Número de pedido" style="width:100%;font-size:12px;padding:5px 7px;margin-top:3px;">
          </div>
        `}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° GR</label>
            <input type="text" id="lpn-gr" value="${escapeHtml(this._gr)}"
              placeholder="T022-00381" style="font-size:12px;padding:5px 7px;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">LPN activo</label>
            <div style="display:flex;gap:4px;">
              <input type="text" id="lpn-codigo-inp" placeholder="LPN00001"
                style="flex:1;font-family:monospace;font-size:12px;padding:5px 7px;font-weight:700;color:var(--accent);"
                value="${this._lpnActual?.codigo||''}">
              <button class="btn-icon btn-scan" id="btn-scan-lpn" style="flex-shrink:0;padding:5px;" title="Escanear LPN">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg>
              </button>
            </div>
          </div>
        </div>
        <button class="btn-primary" id="btn-activar-lpn" style="margin-top:8px;width:100%;padding:7px;">
          ${this._lpnActual ? '✓ LPN activo: ' + this._lpnActual.codigo + ' — Cambiar' : 'Activar LPN'}
        </button>
        <div id="lpn-msg" style="font-size:11px;margin-top:4px;"></div>
      </div>

      <!-- Layout 2 columnas -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">

        <!-- Columna izquierda: pistolaje -->
        <div>
          <!-- Ítems esperados del pedido -->
          ${this._pedidoActual && this._cadenaOrdenes?.get(this._pedidoActual) ? `
            <div class="card" style="padding:10px 12px;margin-bottom:8px;">
              <p style="font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:6px;">
                Esperado — ${this._cadenaOrdenes.get(this._pedidoActual).items?.length||0} ítem(s)
              </p>
              <div id="lpn-esperados" style="max-height:180px;overflow-y:auto;">
                ${this._renderEsperados()}
              </div>
            </div>
          ` : ''}

          <!-- Panel de pistolaje -->
          <div class="card" style="padding:10px 12px;" id="panel-pistolaje">
            <p class="card-title" style="margin-bottom:8px;">Pistolaje</p>

            <!-- SKU con autocompletado -->
            <div class="field" style="margin-bottom:6px;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">SKU (escribe para buscar)</label>
              <input type="text" id="lpn-sku-search" placeholder="Buscar por SKU o descripción..."
                autocomplete="off" style="width:100%;font-size:12px;padding:5px 7px;">
              <div id="lpn-sku-sugerencias" style="display:none;border:1px solid var(--border-strong);
                border-radius:0 0 6px 6px;background:var(--bg-card);max-height:150px;overflow-y:auto;"></div>
            </div>

            <!-- Info del SKU seleccionado -->
            <div id="lpn-sku-info" style="display:none;padding:6px 8px;background:var(--accent-dim);
              border-radius:6px;font-size:11px;margin-bottom:6px;">
            </div>

            <!-- Serie -->
            <div class="field" style="margin-bottom:6px;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Serie</label>
              <div style="display:flex;gap:4px;">
                <input type="text" id="lpn-serie" placeholder="Escanear o escribir serie"
                  style="flex:1;font-family:monospace;font-size:12px;padding:5px 7px;">
                <button class="btn-icon btn-scan" id="btn-scan-serie-lpn" style="flex-shrink:0;padding:5px;">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg>
                </button>
              </div>
            </div>

            <!-- Cantidad -->
            <div class="field" style="margin-bottom:8px;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Cantidad</label>
              <input type="number" id="lpn-cant" value="1" min="1"
                style="font-size:12px;padding:5px 7px;width:100px;">
            </div>

            <button class="btn-primary" id="btn-agregar-lpn" style="width:100%;padding:8px;">
              + Agregar ítem
            </button>
          </div>
        </div>

        <!-- Columna derecha: lista de lo confirmado -->
        <div class="card" style="padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
            <p class="card-title" style="margin:0;">Confirmados (<span id="lpn-count">0</span>)</p>
            <button class="btn-secondary" id="btn-cerrar-lpn"
              style="font-size:11px;padding:4px 10px;display:none;">Cerrar LPN ✓</button>
          </div>
          <div id="lpn-lista" style="max-height:400px;overflow-y:auto;">
            <div class="empty-state" style="padding:12px 0;">
              <div class="empty-icon">📭</div>Sin ítems aún
            </div>
          </div>

          <!-- Resumen sesión al cerrar LPN -->
          <div id="lpn-sesion" style="display:${this._sesionItems.length?'':'none'};margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">
            <p style="font-size:11px;font-weight:700;margin-bottom:4px;">
              Sesión: <span id="sesion-count">${this._sesionItems.length}</span> ítem(s) en ${[...new Set(this._sesionItems.map(i=>i._lpn))].length} LPN(s)
            </p>
            <div id="sesion-lpns"></div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
              <button class="btn-primary" id="btn-exportar-sesion" style="font-size:12px;">↓ Exportar Excel</button>
              <button class="btn-ghost" id="btn-nueva-sesion" style="font-size:12px;">Nueva sesión</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this._bindVolver();
    this._bindLPNEventos();
    this._renderItemsLPN();
    if(this._sesionItems.length) this._renderSesion();
  },

  _renderEsperados(){
    const orden = this._cadenaOrdenes?.get(this._pedidoActual);
    if(!orden?.items?.length) return '<p style="font-size:11px;color:var(--text-tertiary);">Sin ítems.</p>';
    return orden.items.map(it=>{
      const conf = this._itemsLPN.some(i=>
        (it.serie && i.SERIE && i.SERIE.toUpperCase()===String(it.serie).toUpperCase()) ||
        (!it.serie && i.MATERIAL===it.sku)
      );
      return `<div style="display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:4px;
        background:${conf?'var(--success-bg)':'transparent'};">
        <span style="font-size:13px;">${conf?'✅':'⬜'}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;font-family:monospace;">${escapeHtml(it.sku||'')}</div>
          <div style="font-size:10px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(it.descripcion||'')}</div>
        </div>
        <span style="font-size:11px;font-weight:700;flex-shrink:0;">${it.cantidad||1}</span>
      </div>`;
    }).join('');
  },

  _bindLPNEventos(){
    // Excel referencia — mismo formato que Subir Excel (Sharepoint)
    // FECHA | N°PEDIDO | MATERIAL | DESCRIPCION | SERIE | CANTIDAD | N°GUIA
    document.getElementById('input-cadena-lpn')?.addEventListener('change',async e=>{
      if(!e.target.files[0])return;
      try {
        await cargarXlsx();
        const buf = await e.target.files[0].arrayBuffer();
        const wb  = XLSX.read(buf, {type:'array', cellDates:true});
        let filas = [];
        for(const nombre of wb.SheetNames){
          const ws = wb.Sheets[nombre];
          const data = XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
          if(data.length>1){filas=data;break;}
        }
        const fila0 = filas[0]||[];
        const esHdr = ['FECHA','MATERIAL','PEDIDO','SKU','SERIE'].some(k=>fila0.some(v=>String(v).toUpperCase().includes(k)));
        const inicio = esHdr?1:0;

        // Agrupar por pedido
        const porPedido = new Map();
        filas.slice(inicio).filter(r=>r.some(v=>v!=='')).forEach(r=>{
          const ped  = String(r[1]||'').trim();
          const sku  = String(r[2]||'').trim().toUpperCase();
          const desc = String(r[3]||'').trim();
          const serie= String(r[4]||'').trim();
          const cant = Number(String(r[5]).replace(/,/g,''))||1;
          const gr   = String(r[6]||'').trim();
          if(!sku||!cant) return;
          if(!porPedido.has(ped)) porPedido.set(ped,{pedido:ped,gr,items:[]});
          porPedido.get(ped).items.push({sku,descripcion:desc,serie,cantidad:cant,gr});
        });

        this._cadenaOrdenes = porPedido;
        this._pedidoActual  = '';
        this._renderLPN(document.getElementById('ing-contenido'));
      } catch(err){ alert('Error leyendo Excel: '+err.message); }
    });

    // Selector pedido
    document.getElementById('sel-pedido-lpn')?.addEventListener('change',e=>{
      this._pedidoActual = e.target.value||'';
      const orden = this._cadenaOrdenes?.get(this._pedidoActual);
      if(orden?.gr){ const g=document.getElementById('lpn-gr'); if(g) g.value=orden.gr; this._gr=orden.gr; }
      const esp = document.getElementById('lpn-esperados');
      if(esp) esp.innerHTML = this._renderEsperados();
    });

    // Escanear LPN
    document.getElementById('btn-scan-lpn')?.addEventListener('click',()=>{
      abrirEscaner('ing-contenido',txt=>{
        const i=document.getElementById('lpn-codigo-inp'); if(i) i.value=txt.toUpperCase();
      },e=>alert(e));
    });

    // Activar LPN
    document.getElementById('btn-activar-lpn')?.addEventListener('click',()=>this._activarLPN());
    document.getElementById('lpn-codigo-inp')?.addEventListener('keydown',e=>{if(e.key==='Enter')this._activarLPN();});

    // SKU autocompletado
    let _skuTimer = null;
    document.getElementById('lpn-sku-search')?.addEventListener('input',e=>{
      clearTimeout(_skuTimer);
      const val = e.target.value.trim();
      if(val.length < 2){ document.getElementById('lpn-sku-sugerencias').style.display='none'; return; }
      _skuTimer = setTimeout(()=>this._buscarSKU(val), 300);
    });

    // Escanear serie
    document.getElementById('btn-scan-serie-lpn')?.addEventListener('click',()=>{
      abrirEscaner('ing-contenido',txt=>{
        const i=document.getElementById('lpn-serie'); if(i){ i.value=txt; }
      },e=>alert(e));
    });

    // Agregar ítem
    document.getElementById('btn-agregar-lpn')?.addEventListener('click',()=>this._agregarItemLPN());
    document.getElementById('lpn-serie')?.addEventListener('keydown',e=>{if(e.key==='Enter')this._agregarItemLPN();});

    // Cerrar LPN
    document.getElementById('btn-cerrar-lpn')?.addEventListener('click',()=>this._cerrarLPN());

    // Exportar sesión
    document.getElementById('btn-exportar-sesion')?.addEventListener('click',()=>{
      exportarRecepcionAExcel(this._sesionItems,`ingresos_${this._fechaIngreso}.xlsx`);
    });

    document.getElementById('btn-nueva-sesion')?.addEventListener('click',()=>{
      if(confirm('¿Iniciar nueva sesión? Los LPNs cerrados quedan guardados.')){
        this._sesionItems=[]; this._lpnActual=null; this._itemsLPN=[];
        this._renderLPN(document.getElementById('ing-contenido'));
      }
    });
  },

  async _buscarSKU(texto){
    const sug = document.getElementById('lpn-sku-sugerencias');
    if(!sug) return;
    // Buscar en el pedido activo primero, luego en stock general
    let resultados = [];
    if(this._pedidoActual && this._cadenaOrdenes?.get(this._pedidoActual)){
      const items = this._cadenaOrdenes.get(this._pedidoActual).items||[];
      resultados = items.filter(it=>
        (it.sku||'').toUpperCase().includes(texto.toUpperCase()) ||
        (it.descripcion||'').toUpperCase().includes(texto.toUpperCase())
      ).slice(0,8).map(it=>({sku:it.sku, desc:it.descripcion, fuente:'cadena'}));
    }
    if(resultados.length < 3){
      const {data} = await buscarStockAvanzado({textoLibre:texto, limit:6});
      const yaHay = new Set(resultados.map(r=>r.sku));
      (data||[]).forEach(r=>{ if(!yaHay.has(r.sku)) resultados.push({sku:r.sku,desc:r.descripcion,fuente:'stock'}); });
    }
    if(!resultados.length){ sug.style.display='none'; return; }
    sug.style.display='';
    sug.innerHTML = resultados.map(r=>`
      <div class="lpn-sug-item" data-sku="${escapeHtml(r.sku)}" data-desc="${escapeHtml(r.desc||'')}"
        style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);">
        <span style="font-family:monospace;font-weight:700;">${escapeHtml(r.sku)}</span>
        <span style="color:var(--text-tertiary);font-size:10px;margin-left:6px;">${escapeHtml(r.desc||'')}</span>
        ${r.fuente==='cadena'?'<span class="pill pill-success" style="font-size:9px;margin-left:4px;">esperado</span>':''}
      </div>
    `).join('');
    sug.querySelectorAll('.lpn-sug-item').forEach(el=>{
      el.addEventListener('mouseenter',()=>el.style.background='var(--bg-row-alt)');
      el.addEventListener('mouseleave',()=>el.style.background='');
      el.addEventListener('click',()=>{
        const sku=el.dataset.sku, desc=el.dataset.desc;
        document.getElementById('lpn-sku-search').value=sku;
        sug.style.display='none';
        const info=document.getElementById('lpn-sku-info');
        if(info){
          info.style.display='';
          info.innerHTML=`<strong>${escapeHtml(sku)}</strong> — ${escapeHtml(desc)}`;
        }
        // Mostrar series esperadas si hay cadena
        if(this._pedidoActual && this._cadenaOrdenes?.get(this._pedidoActual)){
          const items=(this._cadenaOrdenes.get(this._pedidoActual).items||[]).filter(i=>i.sku===sku);
          if(items.length && info){
            const seriesEsp=items.filter(i=>i.serie).map(i=>i.serie);
            if(seriesEsp.length) info.innerHTML+=`<br><span style="font-size:10px;color:var(--text-tertiary);">Series esperadas: ${seriesEsp.join(', ')}</span>`;
          }
        }
        document.getElementById('lpn-serie')?.focus();
      });
    });
  },

  async _activarLPN(){
    const codigo = document.getElementById('lpn-codigo-inp')?.value.trim().toUpperCase();
    const pedido = document.getElementById('sel-pedido-lpn')?.value || document.getElementById('lpn-pedido-manual')?.value.trim() || '';
    const gr     = document.getElementById('lpn-gr')?.value.trim()||'';
    const tipo   = document.getElementById('lpn-tipo-ing')?.value||'';
    const msg    = document.getElementById('lpn-msg');

    if(!codigo){if(msg)msg.innerHTML='<span style="color:var(--danger-text);">Escanea o escribe el código LPN.</span>';return;}
    if(!pedido){if(msg)msg.innerHTML='<span style="color:var(--danger-text);">Selecciona o ingresa un N° de pedido.</span>';return;}
    if(!tipo){if(msg)msg.innerHTML='<span style="color:var(--danger-text);">Selecciona el tipo de ingreso.</span>';return;}

    // Verificar si el LPN ya tiene mercadería
    if(msg)msg.innerHTML='<span style="color:var(--text-tertiary);">Verificando LPN...</span>';
    const {data:lpnExist} = await sb.from('lpns').select('id,estado,codigo').eq('codigo',codigo).maybeSingle();

    if(lpnExist){
      // LPN existe — verificar si tiene ítems
      const {count} = await sb.from('stock').select('*',{count:'exact',head:true}).eq('lpn_id',lpnExist.id);
      if(count > 0){
        if(msg)msg.innerHTML=`<span style="color:var(--danger-text);">⚠ LPN ${escapeHtml(codigo)} ya tiene ${count} ítem(s). ¿Deseas continuar agregando a este LPN?</span>
          <button class="btn-secondary" style="font-size:11px;margin-left:8px;padding:3px 8px;" onclick="IngresosView._forzarActivarLPN('${codigo}','${escapeHtml(pedido)}','${escapeHtml(gr)}','${lpnExist.id}')">Sí, continuar</button>`;
        return;
      }
      // LPN existe pero vacío — OK
      this._lpnActual={id:lpnExist.id,codigo};
      if(msg)msg.innerHTML=`<span style="color:var(--success-text);">✓ LPN ${escapeHtml(codigo)} está vacío — activado.</span>`;
    } else {
      // LPN nuevo — crear
      const {data,error}=await crearLPN({codigo,cliente:'',n_guia:gr,observaciones:pedido});
      if(error){if(msg)msg.innerHTML=`<span style="color:var(--danger-text);">Error: ${escapeHtml(String(error))}</span>`;return;}
      this._lpnActual={id:data?.id,codigo};
      if(msg)msg.innerHTML=`<span style="color:var(--success-text);">✓ LPN ${escapeHtml(codigo)} nuevo — activado.</span>`;
    }

    this._pedidoActual=pedido; this._gr=gr; this._tipoIngreso=tipo;
    this._itemsLPN=[];
    document.getElementById('btn-activar-lpn').textContent=`✓ ${codigo}`;
    this._renderItemsLPN();
    document.getElementById('lpn-serie-rapido')?.focus();
  },

  async _forzarActivarLPN(codigo, pedido, gr, lpnId){
    this._lpnActual={id:lpnId,codigo};
    this._pedidoActual=pedido; this._gr=gr;
    this._itemsLPN=[];
    const msg=document.getElementById('lpn-msg');
    if(msg)msg.innerHTML=`<span style="color:var(--warning);">⚠ Continuando en LPN ${escapeHtml(codigo)} con ítems previos.</span>`;
    document.getElementById('btn-activar-lpn').textContent=`✓ ${codigo}`;
    this._renderItemsLPN();
  },

  _agregarItemLPN(){
    if(!this._lpnActual){alert('Activa un LPN primero.');return;}
    const sku  = document.getElementById('lpn-sku-search')?.value.trim().toUpperCase();
    const serie= document.getElementById('lpn-serie')?.value.trim()||'-';
    const cant = Number(document.getElementById('lpn-cant')?.value)||1;
    const desc = document.getElementById('lpn-sku-info')?.textContent?.split('—')[1]?.trim()||'';
    if(!sku){alert('Selecciona un SKU.');return;}
    const tipo = document.getElementById('lpn-tipo-ing')?.value||'INGRESO NUEVO';
    const fecha= document.getElementById('lpn-fecha')?.value||this._fechaIngreso;
    this._itemsLPN.push({
      MATERIAL:sku, DESCRIPCION:desc, SERIE:serie,
      CANTIDAD_RECIBIDA:cant, N_PEDIDO:this._pedidoActual,
      N_GUIA:this._gr, TIPO_INGRESO:tipo, FECHA:fecha,
      _lpn:this._lpnActual.codigo,
    });
    // Limpiar
    document.getElementById('lpn-sku-search').value='';
    document.getElementById('lpn-sku-info').style.display='none';
    document.getElementById('lpn-serie').value='';
    document.getElementById('lpn-cant').value='1';
    document.getElementById('lpn-sku-search')?.focus();
    this._renderItemsLPN();
    // Actualizar esperados
    const esp=document.getElementById('lpn-esperados');
    if(esp) esp.innerHTML=this._renderEsperados();
  },

  _renderItemsLPN(){
    const lista=document.getElementById('lpn-lista');
    const count=document.getElementById('lpn-count');
    const btnC=document.getElementById('btn-cerrar-lpn');
    if(count)count.textContent=this._itemsLPN.length;
    if(btnC)btnC.style.display=this._lpnActual&&this._itemsLPN.length>0?'':'none';
    if(!lista)return;
    if(!this._itemsLPN.length){lista.innerHTML='<div class="empty-state" style="padding:12px 0;"><div class="empty-icon">📭</div>Sin ítems</div>';return;}
    lista.innerHTML=`<div class="table-wrap"><table class="data-table">
      <thead><tr><th>SKU</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th></th></tr></thead>
      <tbody>${this._itemsLPN.map((it,i)=>`<tr>
        <td class="sku-cell" style="font-size:11px;">${escapeHtml(it.MATERIAL)}</td>
        <td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE||'—')}</td>
        <td style="font-weight:700;color:var(--accent);">${it.CANTIDAD_RECIBIDA}</td>
        <td style="font-size:10px;">${escapeHtml(it.N_PEDIDO||'—')}</td>
        <td><button class="btn-icon" style="color:var(--danger);" onclick="IngresosView._eliminarItemLPN(${i})">
          <svg viewBox="0 0 24 24" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  },

  _eliminarItemLPN(idx){this._itemsLPN.splice(idx,1);this._renderItemsLPN();},

  async _cerrarLPN(){
    if(!this._itemsLPN.length){alert('Agrega ítems antes de cerrar el LPN.');return;}
    const btn=document.getElementById('btn-cerrar-lpn');
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    // Registrar ítems en LPN y marcar ubicación como RECEPCION
    const {error,count}=await registrarItemsEnLPN(this._lpnActual.id,this._lpnActual.codigo,this._itemsLPN);
    if(error){if(btn){btn.disabled=false;btn.textContent='Cerrar LPN ✓';}alert('Error: '+error);return;}
    // Marcar LPN en zona RECEPCION
    try {
      await sb.from('lpns').update({
        estado:'RECEPCION',
        ubicacion:'RECEPCION'
      }).eq('id',this._lpnActual.id);
    } catch(e){}
    this._sesionItems.push(...this._itemsLPN.map(i=>({...i,_lpn:this._lpnActual.codigo})));
    this._itemsLPN=[]; this._lpnActual=null;
    document.getElementById('btn-activar-lpn').textContent='Activar LPN';
    document.getElementById('lpn-codigo-inp').value='';
    if(btn){btn.disabled=false;btn.textContent='Cerrar LPN ✓';btn.style.display='none';}
    this._renderItemsLPN();
    this._renderSesion();
    document.getElementById('lpn-sesion').style.display='';
    const msg=document.getElementById('lpn-msg');
    if(msg)msg.innerHTML=`<span style="color:var(--success-text);">✓ LPN ${this._sesionItems.slice(-count).map(i=>i._lpn)[0]||''} en zona RECEPCIÓN — ${count} ítem(s) guardados.</span>`;
  },

  _renderSesion(){
    const lista=document.getElementById('sesion-lpns');
    const count=document.getElementById('sesion-count');
    if(count)count.textContent=this._sesionItems.length;
    if(!lista)return;
    const lpns=[...new Set(this._sesionItems.map(i=>i._lpn))];
    lista.innerHTML=lpns.map(lpn=>{
      const items=this._sesionItems.filter(i=>i._lpn===lpn);
      const peds=[...new Set(items.map(i=>i.N_PEDIDO).filter(Boolean))];
      return `<div style="padding:5px 8px;background:var(--bg-row-alt);border-radius:5px;margin-bottom:3px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-family:monospace;font-weight:700;font-size:12px;color:var(--accent);">${escapeHtml(lpn)}</span>
          <span style="font-size:10px;color:var(--text-tertiary);margin-left:6px;">${items.length} ítem(s)</span>
          <div style="font-size:10px;color:var(--text-tertiary);">${peds.join(', ')||'—'}</div>
        </div>
        <span class="pill pill-success" style="font-size:9px;">Cerrado</span>
      </div>`;
    }).join('');
  },
};

Router.register('ingresos', IngresosView);
