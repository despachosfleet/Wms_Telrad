// INGRESOS v3 — Módulo principal
// Submódulos: Excel | Manual | Recepción LPN | Ver pedidos | Imprimir LPNs
const IngresosView = {
  title: 'Ingresos',
  _flujo: null, _preview: [], _manualItems: [],
  _gr: '', _tipoIngreso: '', _fechaIngreso: new Date().toISOString().slice(0,10),
  _lpnActual: null, _itemsLPN: [], _pedidoActual: '', _sesionItems: [],
  _cadenaOrdenes: null, _modoRapido: true,

  hasProgress() { return this._preview.length>0||this._manualItems.length>0||this._itemsLPN.length>0; },
  saveState() { return {flujo:this._flujo,preview:this._preview,manualItems:this._manualItems,gr:this._gr,tipoIngreso:this._tipoIngreso,fechaIngreso:this._fechaIngreso,lpnActual:this._lpnActual,itemsLPN:this._itemsLPN,pedidoActual:this._pedidoActual,sesionItems:this._sesionItems,cadenaOrdenes:this._cadenaOrdenes,modoRapido:this._modoRapido}; },
  restoreState(s) { Object.assign(this,{_flujo:s.flujo,_preview:s.preview||[],_manualItems:s.manualItems||[],_gr:s.gr||'',_tipoIngreso:s.tipoIngreso||'',_fechaIngreso:s.fechaIngreso||new Date().toISOString().slice(0,10),_lpnActual:s.lpnActual,_itemsLPN:s.itemsLPN||[],_pedidoActual:s.pedidoActual||'',_sesionItems:s.sesionItems||[],_cadenaOrdenes:s.cadenaOrdenes,_modoRapido:s.modoRapido!==false}); this.afterRender(); if(this._flujo){document.getElementById('ing-selector').style.display='none';this._renderFlujo();} },

  render() {
    return `
    <div id="ing-selector">
      <div class="card">
        <p class="card-title">Ingresos</p>
        <p class="card-subtitle" style="margin-bottom:12px;">Selecciona cómo registrar el ingreso</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
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
          <button class="recep-opcion" data-flujo="lpn">
            <div class="recep-op-icon">📦</div>
            <div class="recep-op-titulo">Recepción LPN</div>
            <div class="recep-op-desc">Pistolaje con contenedores en campo.</div>
          </button>
          <button class="recep-opcion" data-flujo="pedidos">
            <div class="recep-op-icon">📋</div>
            <div class="recep-op-titulo">Ver pedidos</div>
            <div class="recep-op-desc">Pedidos cargados en el sistema.</div>
          </button>
        </div>
        <button class="recep-opcion" data-flujo="imprimir" style="margin-top:10px;width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;">
          <div class="recep-op-icon" style="font-size:20px;">🖨️</div>
          <div><div class="recep-op-titulo">Imprimir lote LPN</div><div class="recep-op-desc">Genera etiquetas para el rollo del operario.</div></div>
        </button>
      </div>
    </div>
    <div id="ing-contenido"></div>`;
  },

  afterRender() {
    document.querySelectorAll('[data-flujo]').forEach(btn=>btn.addEventListener('click',()=>{
      this._flujo=btn.dataset.flujo;
      document.getElementById('ing-selector').style.display='none';
      this._renderFlujo();
    }));
  },

  _renderFlujo() {
    const c=document.getElementById('ing-contenido');
    if(!c)return;
    ({excel:()=>this._renderExcel(c),manual:()=>this._renderManual(c),lpn:()=>this._renderLPN(c),pedidos:()=>this._renderPedidos(c),imprimir:()=>this._renderImprimir(c)})[this._flujo]?.();
  },

  _volver() { return `<button class="btn-secondary" id="btn-volver-ing" style="margin-bottom:12px;font-size:12px;">← Volver</button>`; },
  _bindVolver() {
    document.getElementById('btn-volver-ing')?.addEventListener('click',()=>{
      this._flujo=null; this._preview=[]; this._manualItems=[];
      document.getElementById('ing-contenido').innerHTML='';
      document.getElementById('ing-selector').style.display='';
    });
  },

  // ── CABECERA COMÚN ─────────────────────────────────────
  _cab() {
    return `<div class="card" style="margin-bottom:8px;padding:10px 12px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Fecha de ingreso *</label>
          <input type="date" id="ing-fecha" value="${this._fechaIngreso}" style="font-size:12px;padding:5px 7px;"></div>
        <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Tipo de ingreso *</label>
          <select id="ing-tipo" style="font-size:12px;padding:5px 7px;">
            <option value="" disabled ${!this._tipoIngreso?'selected':''}>Seleccionar...</option>
            <option value="INGRESO NUEVO" ${this._tipoIngreso==='INGRESO NUEVO'?'selected':''}>Ingreso nuevo</option>
            <option value="MUDANZA" ${this._tipoIngreso==='MUDANZA'?'selected':''}>Mudanza</option>
          </select></div>
        <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° Guía (GR)</label>
          <input type="text" id="ing-gr" value="${escapeHtml(this._gr)}" placeholder="T022-00381" style="font-size:12px;padding:5px 7px;"></div>
        <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Condición</label>
          <select id="ing-cond" style="font-size:12px;padding:5px 7px;">
            <option value="NUEVO">Nuevo</option><option value="DESMONTADO">Desmontado</option>
            <option value="DEVOLUCION">Devolución</option><option value="EXCEDENTE">Excedente</option>
          </select></div>
        <div class="field" style="margin:0;grid-column:1/-1;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Cliente</label>
          <select id="ing-cliente" style="font-size:12px;padding:5px 7px;width:100%;">
            <option value="">— Seleccionar —</option>
            <option>ENTEL</option><option>CLARO</option><option>TELRAD</option><option>STP PARRES</option><option>AMERICATEL</option>
          </select></div>
      </div>
    </div>`;
  },

  _leerCab() {
    this._fechaIngreso=document.getElementById('ing-fecha')?.value||new Date().toISOString().slice(0,10);
    this._gr=document.getElementById('ing-gr')?.value.trim()||'';
    this._tipoIngreso=document.getElementById('ing-tipo')?.value||'';
    return {fecha:this._fechaIngreso,gr:this._gr,tipo:this._tipoIngreso,condicion:document.getElementById('ing-cond')?.value||'NUEVO',cliente:document.getElementById('ing-cliente')?.value||''};
  },

  // ── SUBIR EXCEL ────────────────────────────────────────
  _renderExcel(c) {
    c.innerHTML=`${this._volver()}${this._cab()}
    <div class="card" style="margin-bottom:8px;padding:10px 12px;">
      <p style="font-size:11px;color:var(--text-tertiary);margin-bottom:8px;">Columnas: FECHA | N°PEDIDO | MATERIAL | DESCRIPCION | SERIE | CANTIDAD | N°GUIA | OBS</p>
      <label id="lbl-excel-ing" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;border:2px dashed var(--border-strong);border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:var(--accent);">
        📊 Seleccionar Excel<input type="file" id="inp-excel-ing" accept=".xlsx,.xls" style="display:none;">
      </label>
    </div>
    <div id="ing-preview"></div><div id="ing-resultado"></div>`;
    this._bindVolver();
    document.getElementById('lbl-excel-ing')?.addEventListener('click',()=>document.getElementById('inp-excel-ing')?.click());
    document.getElementById('inp-excel-ing')?.addEventListener('change',e=>{if(e.target.files[0])this._procesarExcel(e.target.files[0]);});
  },

  async _procesarExcel(file) {
    const prev=document.getElementById('ing-preview');
    prev.innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo…</div>';
    try {
      await cargarXlsx();
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array',cellDates:true});
      let filas=[];
      for(const n of wb.SheetNames){const ws=wb.Sheets[n];const d=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});if(d.length>1){filas=d;break;}}
      if(!filas.length){prev.innerHTML='<div class="alert alert-danger">Excel vacío.</div>';return;}
      const f0=filas[0];
      const esH=['FECHA','MATERIAL','PEDIDO','SKU','SERIE'].some(k=>f0.some(v=>String(v).toUpperCase().includes(k)));
      const cab=this._leerCab();
      this._preview=filas.slice(esH?1:0).filter(r=>r.some(v=>v!=='')).map(r=>{
        let fecha=cab.fecha;
        const raw=String(r[0]||'').trim();
        if(/^\d{4}-\d{2}-\d{2}$/.test(raw))fecha=raw;
        else if(/^\d{2}\/\d{2}\/\d{4}$/.test(raw)){const[d,m,y]=raw.split('/');fecha=`${y}-${m}-${d}`;}
        else if(raw.includes('T'))fecha=raw.slice(0,10);
        return {FECHA:fecha,N_PEDIDO:String(r[1]||'').trim(),MATERIAL:String(r[2]||'').trim().toUpperCase(),
          DESCRIPCION:String(r[3]||'').trim(),SERIE:String(r[4]||'').trim()||'-',
          CANTIDAD_RECIBIDA:Number(String(r[5]).replace(/,/g,''))||1,
          N_GUIA:cab.gr||String(r[6]||'').trim(),TIPO_INGRESO:cab.tipo,
          CONDICION:cab.condicion,CLIENTE:cab.cliente,OBSERVACIONES:String(r[7]||'').trim()};
      }).filter(r=>r.MATERIAL&&r.CANTIDAD_RECIBIDA>0);
      if(!this._preview.length){prev.innerHTML='<div class="alert alert-danger">Sin filas válidas.</div>';return;}
      this._renderPreview(prev);
    }catch(e){prev.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(e.message)}</div>`;}
  },

  _renderPreview(prev) {
    if(!prev)return;
    const pp={};
    this._preview.forEach(r=>{const p=r.N_PEDIDO||'(sin pedido)';if(!pp[p])pp[p]=[];pp[p].push(r);});
    prev.innerHTML=`<div class="card" style="margin-bottom:8px;padding:10px 12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <div><p class="card-title" style="margin:0;">${this._preview.length} ítems · ${Object.keys(pp).length} pedido(s)</p>
          <p style="font-size:11px;color:var(--text-tertiary);margin:2px 0 0;">Tipo: <strong>${this._tipoIngreso||'—'}</strong> · GR: <strong>${this._gr||'—'}</strong></p></div>
        <div style="display:flex;gap:6px;">
          <button class="btn-primary" id="btn-conf-ing">✓ Confirmar ingreso</button>
          <button class="btn-ghost" id="btn-canc-ing">Cancelar</button>
        </div>
      </div>
      ${Object.entries(pp).map(([ped,items])=>`
        <details style="margin-bottom:6px;" open>
          <summary style="cursor:pointer;padding:6px 8px;background:var(--bg-row-alt);border-radius:6px;font-size:12px;font-weight:700;list-style:none;display:flex;justify-content:space-between;">
            <span>📦 ${escapeHtml(ped)}</span><span style="font-size:11px;color:var(--text-tertiary);font-weight:400;">${items.length} ítem(s)</span>
          </summary>
          <div class="table-wrap" style="margin-top:4px;">
            <table class="data-table"><thead><tr><th>SKU</th><th>Descripción</th><th>Serie</th><th>Cant.</th><th>Fecha</th><th>OBS</th><th></th></tr></thead>
            <tbody>${items.map(it=>{const idx=this._preview.indexOf(it);return`<tr>
              <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
              <td style="font-size:11px;">${escapeHtml(it.DESCRIPCION||'—')}</td>
              <td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE||'—')}</td>
              <td style="font-weight:700;color:var(--accent);">${it.CANTIDAD_RECIBIDA}</td>
              <td style="font-size:10px;">${it.FECHA||'—'}</td>
              <td style="font-size:10px;">${escapeHtml(it.OBSERVACIONES||'—')}</td>
              <td><button class="btn-icon" style="color:var(--danger);" onclick="IngresosView._delPreview(${idx})">
                <svg viewBox="0 0 24 24" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button></td>
            </tr>`;}).join('')}</tbody></table>
          </div>
        </details>`).join('')}
    </div><div id="ing-resultado"></div>`;
    document.getElementById('btn-conf-ing')?.addEventListener('click',()=>this._confirmar());
    document.getElementById('btn-canc-ing')?.addEventListener('click',()=>{this._preview=[];prev.innerHTML='';});
  },

  _delPreview(idx){this._preview.splice(idx,1);this._renderPreview(document.getElementById('ing-preview'));},

  async _confirmar() {
    const btn=document.getElementById('btn-conf-ing');
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    const {error,count}=await registrarIngresosDesdeExcel(this._preview);
    const res=document.getElementById('ing-resultado');
    this._preview=[];document.getElementById('ing-preview').innerHTML='';
    if(error){if(btn){btn.disabled=false;btn.textContent='✓ Confirmar ingreso';}if(res)res.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;return;}
    if(res)res.innerHTML=`<div class="alert alert-success"><strong>✓ ${count} ítems ingresados.</strong></div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
        <button class="btn-secondary" onclick="IngresosView._flujo=null;document.getElementById('ing-contenido').innerHTML='';document.getElementById('ing-selector').style.display='';">Nuevo ingreso</button>
        <button class="btn-primary" onclick="Router.navigate('consulta')">Ver en consultas →</button>
      </div>`;
  },

  // ── MANUAL ─────────────────────────────────────────────
  _renderManual(c) {
    c.innerHTML=`${this._volver()}${this._cab()}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div class="card" style="padding:10px 12px;">
        <p class="card-title" style="margin-bottom:8px;">Agregar ítem</p>
        <div style="display:flex;flex-direction:column;gap:5px;">
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;">SKU *</label><input type="text" id="man-sku" style="font-family:monospace;font-size:13px;padding:6px 8px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;">Descripción</label><input type="text" id="man-desc" style="font-size:12px;padding:5px 7px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;">Serie</label>
            <div style="display:flex;gap:4px;">
              <input type="text" id="man-serie" style="flex:1;font-family:monospace;font-size:12px;padding:5px 7px;">
              <button class="btn-icon btn-scan" id="btn-scan-man" style="padding:5px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg></button>
            </div></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;">Cantidad *</label><input type="number" id="man-cant" value="1" min="1" style="font-size:12px;padding:5px 7px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;">N° Pedido / Paleta *</label><input type="text" id="man-pedido" style="font-size:12px;padding:5px 7px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;">Observaciones</label><input type="text" id="man-obs" style="font-size:12px;padding:5px 7px;"></div>
          <button class="btn-primary" id="btn-ag-man" style="padding:8px;">+ Agregar</button>
        </div>
      </div>
      <div class="card" style="padding:10px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Ítems (<span id="man-count">0</span>)</p>
          <button class="btn-primary" id="btn-guar-man" style="font-size:12px;padding:5px 12px;display:none;">✓ Guardar</button>
        </div>
        <div id="man-lista"><div class="empty-state" style="padding:12px 0;"><div class="empty-icon">📝</div>Sin ítems</div></div>
        <div id="man-res" style="margin-top:8px;"></div>
      </div>
    </div>`;
    this._bindVolver();
    this._renderManualLista();
    document.getElementById('btn-scan-man')?.addEventListener('click',()=>abrirEscaner('ing-contenido',txt=>{const i=document.getElementById('man-serie');if(i)i.value=txt;},e=>alert(e)));
    document.getElementById('btn-ag-man')?.addEventListener('click',()=>{
      const sku=document.getElementById('man-sku')?.value.trim().toUpperCase();
      const cant=Number(document.getElementById('man-cant')?.value)||0;
      if(!sku){alert('SKU obligatorio.');return;}if(!cant){alert('Cantidad obligatoria.');return;}
      const cab=this._leerCab();
      this._manualItems.push({FECHA:cab.fecha,N_PEDIDO:document.getElementById('man-pedido')?.value.trim(),MATERIAL:sku,DESCRIPCION:document.getElementById('man-desc')?.value.trim()||'',SERIE:document.getElementById('man-serie')?.value.trim()||'-',CANTIDAD_RECIBIDA:cant,N_GUIA:cab.gr,TIPO_INGRESO:cab.tipo,CONDICION:cab.condicion,CLIENTE:cab.cliente,OBSERVACIONES:document.getElementById('man-obs')?.value.trim()||''});
      ['man-sku','man-desc','man-serie','man-obs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
      document.getElementById('man-cant').value='1';document.getElementById('man-sku')?.focus();
      this._renderManualLista();
    });
    document.getElementById('btn-guar-man')?.addEventListener('click',()=>this._guardarManual());
  },

  _renderManualLista() {
    const lista=document.getElementById('man-lista'),count=document.getElementById('man-count'),btn=document.getElementById('btn-guar-man');
    if(count)count.textContent=this._manualItems.length;
    if(btn)btn.style.display=this._manualItems.length>0?'':'none';
    if(!lista)return;
    if(!this._manualItems.length){lista.innerHTML='<div class="empty-state" style="padding:12px 0;"><div class="empty-icon">📝</div>Sin ítems</div>';return;}
    lista.innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>SKU</th><th>Desc.</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th></th></tr></thead><tbody>
      ${this._manualItems.map((it,i)=>`<tr><td class="sku-cell">${escapeHtml(it.MATERIAL)}</td><td style="font-size:11px;">${escapeHtml(it.DESCRIPCION||'—')}</td><td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE||'—')}</td><td style="font-weight:700;">${it.CANTIDAD_RECIBIDA}</td><td style="font-size:11px;">${escapeHtml(it.N_PEDIDO||'—')}</td>
      <td><button class="btn-icon" style="color:var(--danger);" onclick="IngresosView._delManual(${i})"><svg viewBox="0 0 24 24" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></td></tr>`).join('')}
    </tbody></table></div>`;
  },

  _delManual(idx){this._manualItems.splice(idx,1);this._renderManualLista();},

  async _guardarManual() {
    const btn=document.getElementById('btn-guar-man');
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    const {error,count}=await registrarIngresosDesdeExcel(this._manualItems);
    const res=document.getElementById('man-res');
    if(error){if(btn){btn.disabled=false;btn.textContent='✓ Guardar';}if(res)res.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;return;}
    this._manualItems=[];this._renderManualLista();
    if(res)res.innerHTML=`<div class="alert alert-success"><strong>✓ ${count} ítems registrados.</strong></div>`;
  },

  // ── RECEPCIÓN LPN ──────────────────────────────────────
  _renderLPN(c) {
    const orden=this._pedidoActual?this._cadenaOrdenes?.get(this._pedidoActual):null;
    const esperados=orden?.items||[];
    const total=esperados.length;
    const recv=this._itemsLPN.length;
    const pct=total?Math.round((recv/total)*100):0;

    c.innerHTML=`${this._volver()}

    <!-- CABECERA COMPACTA -->
    <div class="card" style="margin-bottom:8px;padding:8px 12px;">
      <div style="display:grid;grid-template-columns:repeat(5,1fr) auto;gap:6px;align-items:end;">
        <div class="field" style="margin:0;">
          <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Fecha *</label>
          <input type="date" id="lpn-fecha" value="${this._fechaIngreso}" style="font-size:11px;padding:4px 5px;">
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Tipo *</label>
          <select id="lpn-tipo" style="font-size:11px;padding:4px 5px;">
            <option value="" disabled ${!this._tipoIngreso?'selected':''}>Seleccionar...</option>
            <option value="INGRESO NUEVO" ${this._tipoIngreso==='INGRESO NUEVO'?'selected':''}>Ing. Nuevo</option>
            <option value="MUDANZA" ${this._tipoIngreso==='MUDANZA'?'selected':''}>Mudanza</option>
          </select>
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° GR</label>
          <input type="text" id="lpn-gr" value="${escapeHtml(this._gr)}" placeholder="T022-00381" style="font-size:11px;padding:4px 5px;">
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">LPN activo</label>
          <div style="display:flex;gap:2px;">
            <input type="text" id="lpn-cod" placeholder="LPN00001" value="${this._lpnActual?.codigo||''}"
              style="flex:1;min-width:0;font-family:monospace;font-size:11px;padding:4px 5px;font-weight:700;color:var(--accent);">
            <button class="btn-icon" id="btn-scan-lpn" style="padding:4px;flex-shrink:0;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg>
            </button>
          </div>
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Excel ref.</label>
          <label style="display:flex;align-items:center;gap:4px;padding:4px 6px;border:1px solid var(--border-strong);border-radius:6px;cursor:pointer;font-size:10px;white-space:nowrap;">
            📊 ${this._cadenaOrdenes?'✓ Cargado':'Cargar'}
            <input type="file" id="inp-cadena" accept=".xlsx,.xls" style="display:none;">
          </label>
        </div>
        <button class="btn-primary" id="btn-act-lpn" style="font-size:11px;padding:5px 10px;white-space:nowrap;align-self:end;">
          ${this._lpnActual?'✓ '+this._lpnActual.codigo:'Activar LPN'}
        </button>
      </div>

      <!-- Pedido selector -->
      ${this._cadenaOrdenes?`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Pedido activo *</label>
            <select id="sel-ped" style="width:100%;font-size:11px;padding:4px 5px;">
              <option value="">— Seleccionar —</option>
              ${[...this._cadenaOrdenes.keys()].map(p=>`<option value="${escapeHtml(p)}" ${this._pedidoActual===p?'selected':''}>${escapeHtml(p)}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">GR del pedido</label>
            <input type="text" id="lpn-gr-ped" value="${escapeHtml(orden?.gr||this._gr)}" style="font-size:11px;padding:4px 5px;" readonly>
          </div>
        </div>`:`
        <div style="margin-top:6px;">
          <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° Pedido *</label>
          <input type="text" id="lpn-ped-man" value="${escapeHtml(this._pedidoActual)}" placeholder="Número de pedido" style="width:100%;font-size:11px;padding:4px 5px;margin-top:2px;">
        </div>`}

      <div id="lpn-msg" style="font-size:11px;margin-top:5px;min-height:18px;"></div>
    </div>

    <!-- LAYOUT 2 COLUMNAS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">

      <!-- IZQ: Pistolaje -->
      <div>
        <!-- Selector modo -->
        <div style="display:flex;border:1px solid var(--border-strong);border-radius:8px;overflow:hidden;margin-bottom:6px;">
          <button onclick="IngresosView._setModo(true)" style="flex:1;padding:7px;font-size:11px;font-weight:700;border:none;cursor:pointer;background:${this._modoRapido?'var(--accent)':'var(--bg-input)'};color:${this._modoRapido?'#fff':'var(--text-secondary)'};">⚡ Modo rápido</button>
          <button onclick="IngresosView._setModo(false)" style="flex:1;padding:7px;font-size:11px;font-weight:700;border:none;cursor:pointer;background:${!this._modoRapido?'var(--accent)':'var(--bg-input)'};color:${!this._modoRapido?'#fff':'var(--text-secondary)'};">🔍 Modo guiado</button>
        </div>

        ${this._modoRapido?`
        <!-- MODO RÁPIDO -->
        <div class="card" style="padding:10px 12px;margin-bottom:6px;">
          <p style="font-size:10px;color:var(--text-tertiary);margin-bottom:8px;">Escanea series una tras otra — Enter agrega automáticamente. Para lotizados usa el formulario de abajo.</p>
          <div style="display:flex;gap:6px;margin-bottom:6px;">
            <input type="text" id="lpn-serie-r" placeholder="Escanear serie y Enter..." autofocus autocomplete="off"
              style="flex:1;font-family:monospace;font-size:14px;padding:8px 10px;border:2px solid var(--accent);border-radius:8px;background:var(--bg-input);color:var(--text);">
            <button class="btn-icon btn-scan" id="btn-scan-r" style="padding:8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg>
            </button>
          </div>
          <div id="lpn-r-res" style="padding:6px 8px;border-radius:6px;background:var(--bg-row-alt);font-size:11px;min-height:32px;">Listo para escanear…</div>
          <details style="margin-top:8px;">
            <summary style="font-size:10px;color:var(--text-tertiary);cursor:pointer;">+ Lotizado (sin serie)</summary>
            <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px;margin-top:6px;align-items:end;">
              <input type="text" id="lpn-sku-lot" placeholder="SKU" style="font-family:monospace;font-size:11px;padding:4px 6px;">
              <input type="number" id="lpn-cant-lot" value="1" min="1" style="width:60px;font-size:11px;padding:4px 6px;">
              <button class="btn-secondary" id="btn-lot" style="font-size:11px;padding:4px 8px;white-space:nowrap;">+ Agregar</button>
            </div>
          </details>
        </div>`:`
        <!-- MODO GUIADO -->
        <div class="card" style="padding:10px 12px;margin-bottom:6px;">
          <div class="field" style="margin-bottom:6px;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">SKU (buscar)</label>
            <input type="text" id="lpn-sku-g" placeholder="Escribe SKU o descripción..." autofocus autocomplete="off" style="width:100%;font-size:12px;padding:5px 7px;">
            <div id="lpn-sug" style="display:none;border:1px solid var(--border-strong);border-radius:0 0 6px 6px;background:var(--bg-card);max-height:130px;overflow-y:auto;"></div>
          </div>
          <div id="lpn-sku-inf" style="display:none;padding:5px 8px;background:var(--accent-dim);border-radius:6px;font-size:11px;margin-bottom:6px;"></div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:6px;margin-bottom:6px;align-items:end;">
            <div class="field" style="margin:0;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Serie</label>
              <div style="display:flex;gap:4px;">
                <input type="text" id="lpn-serie-g" placeholder="Serie o vacío si lotizado" style="flex:1;font-family:monospace;font-size:12px;padding:5px 7px;">
                <button class="btn-icon btn-scan" id="btn-scan-g" style="padding:5px;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/></svg></button>
              </div>
            </div>
            <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Cant.</label>
              <input type="number" id="lpn-cant-g" value="1" min="1" style="width:60px;font-size:12px;padding:5px 6px;"></div>
          </div>
          <button class="btn-primary" id="btn-ag-g" style="width:100%;padding:7px;">+ Agregar ítem</button>
        </div>`}

        <!-- Lista ítems LPN actual -->
        <div class="card" style="padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
            <p style="margin:0;font-size:12px;font-weight:700;">LPN actual — <span id="lpn-count" style="color:var(--accent);">0</span> ítem(s)</p>
            <button class="btn-success" id="btn-cerrar-lpn" style="font-size:11px;padding:4px 10px;display:none;">Cerrar LPN ✓</button>
          </div>
          <div id="lpn-lista" style="max-height:200px;overflow-y:auto;">
            <div class="empty-state" style="padding:8px 0;font-size:11px;"><div class="empty-icon" style="font-size:20px;">📭</div>Pistola ítems arriba</div>
          </div>
        </div>

        <!-- Sesión -->
        <div id="lpn-sesion" style="display:${this._sesionItems.length?'':'none'};margin-top:8px;">
          <div class="card" style="padding:10px 12px;border-left:3px solid var(--success);">
            <p style="font-size:12px;font-weight:700;margin-bottom:6px;">Sesión: <span id="ses-count">${this._sesionItems.length}</span> ítem(s)</p>
            <div id="ses-lista"></div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
              <button class="btn-primary" id="btn-exp-ses" style="font-size:12px;">↓ Exportar Excel</button>
              <button class="btn-ghost" id="btn-nueva-ses" style="font-size:12px;">Nueva sesión</button>
            </div>
          </div>
        </div>
      </div>

      <!-- DER: Progreso del pedido -->
      <div class="card" style="padding:10px 12px;">
        ${!this._cadenaOrdenes?`
          <div class="empty-state" style="padding:20px 0;">
            <div class="empty-icon">📊</div>
            <p style="font-size:12px;">Carga el Excel de referencia para ver el progreso</p>
          </div>`
        :!this._pedidoActual?`
          <div class="empty-state" style="padding:20px 0;">
            <div class="empty-icon">📋</div>
            <p style="font-size:12px;">Selecciona un pedido para ver los ítems esperados</p>
          </div>`:`
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px;text-align:center;">
            <div style="padding:6px 4px;background:var(--bg-row-alt);border-radius:6px;">
              <div style="font-size:18px;font-weight:900;color:var(--accent);">${total}</div>
              <div style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Esperados</div>
            </div>
            <div style="padding:6px 4px;background:var(--success-bg);border-radius:6px;">
              <div style="font-size:18px;font-weight:900;color:var(--success-text);">${recv}</div>
              <div style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Recibidos</div>
            </div>
            <div style="padding:6px 4px;background:var(--warning-bg);border-radius:6px;">
              <div style="font-size:18px;font-weight:900;color:var(--warning);">${Math.max(0,total-recv)}</div>
              <div style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Pendientes</div>
            </div>
          </div>
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-tertiary);margin-bottom:3px;">
              <span>Progreso</span><span>${pct}%</span>
            </div>
            <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
              <div id="lpn-barra" style="height:100%;width:${pct}%;background:var(--success-text);border-radius:4px;transition:width .3s;"></div>
            </div>
          </div>
          <p style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:4px;">
            Ítems del pedido ${escapeHtml(this._pedidoActual)}
          </p>
          <div id="lpn-esp" style="max-height:calc(100vh - 380px);overflow-y:auto;min-height:80px;">
            ${this._renderEsp()}
          </div>`}
      </div>
    </div>`;

    this._bindVolver();
    this._bindLPN();
    this._renderItemsLPN();
    if(this._sesionItems.length)this._renderSesion();
  },

  _setModo(rapido) { this._modoRapido=rapido; this._renderLPN(document.getElementById('ing-contenido')); },

  _renderEsp() {
    const orden=this._cadenaOrdenes?.get(this._pedidoActual);
    if(!orden?.items?.length)return'<p style="font-size:11px;color:var(--text-tertiary);">Sin ítems.</p>';
    return orden.items.map(it=>{
      const conf=this._itemsLPN.some(i=>(it.serie&&i.SERIE&&i.SERIE.toUpperCase()===String(it.serie).toUpperCase())||(!it.serie&&i.MATERIAL===it.sku))
        ||this._sesionItems.some(i=>(it.serie&&i.SERIE&&i.SERIE.toUpperCase()===String(it.serie).toUpperCase())||(!it.serie&&i.MATERIAL===it.sku));
      return`<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:5px;margin-bottom:2px;background:${conf?'var(--success-bg)':'transparent'};">
        <span style="font-size:15px;flex-shrink:0;">${conf?'✅':'⬜'}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;font-family:monospace;">${escapeHtml(it.sku||'')}</div>
          <div style="font-size:10px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(it.descripcion||'')}</div>
          ${it.serie?`<div style="font-size:9px;color:var(--text-tertiary);font-family:monospace;">${escapeHtml(it.serie)}</div>`:''}
        </div>
        <span style="font-size:12px;font-weight:700;${conf?'color:var(--success-text)':''}">${it.cantidad||1}</span>
      </div>`;
    }).join('');
  },

  _bindLPN() {
    // Excel referencia
    document.getElementById('inp-cadena')?.addEventListener('change',async e=>{
      if(!e.target.files[0])return;
      try{
        await cargarXlsx();
        const buf=await e.target.files[0].arrayBuffer();
        const wb=XLSX.read(buf,{type:'array',cellDates:true});
        let filas=[];
        for(const n of wb.SheetNames){const ws=wb.Sheets[n];const d=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});if(d.length>1){filas=d;break;}}
        const f0=filas[0]||[];
        const esH=['FECHA','MATERIAL','PEDIDO','SKU','SERIE'].some(k=>f0.some(v=>String(v).toUpperCase().includes(k)));
        const pp=new Map();
        filas.slice(esH?1:0).filter(r=>r.some(v=>v!=='')).forEach(r=>{
          const ped=String(r[1]||'').trim(),sku=String(r[2]||'').trim().toUpperCase(),desc=String(r[3]||'').trim(),serie=String(r[4]||'').trim(),cant=Number(String(r[5]).replace(/,/g,''))||1,gr=String(r[6]||'').trim();
          if(!sku||!cant)return;
          if(!pp.has(ped))pp.set(ped,{pedido:ped,gr,items:[]});
          pp.get(ped).items.push({sku,descripcion:desc,serie,cantidad:cant,gr});
        });
        this._cadenaOrdenes=pp;this._pedidoActual='';
        this._renderLPN(document.getElementById('ing-contenido'));
      }catch(err){alert('Error: '+err.message);}
    });

    // Selector pedido
    document.getElementById('sel-ped')?.addEventListener('change',e=>{
      this._pedidoActual=e.target.value||'';
      const orden=this._cadenaOrdenes?.get(this._pedidoActual);
      if(orden?.gr){this._gr=orden.gr;const g=document.getElementById('lpn-gr');if(g)g.value=orden.gr;const g2=document.getElementById('lpn-gr-ped');if(g2)g2.value=orden.gr;}
      this._renderLPN(document.getElementById('ing-contenido'));
    });

    // LPN scan y activar
    document.getElementById('btn-scan-lpn')?.addEventListener('click',()=>abrirEscaner('ing-contenido',txt=>{const i=document.getElementById('lpn-cod');if(i)i.value=txt.toUpperCase();},e=>alert(e)));
    document.getElementById('btn-act-lpn')?.addEventListener('click',()=>this._activarLPN());
    document.getElementById('lpn-cod')?.addEventListener('keydown',e=>{if(e.key==='Enter')this._activarLPN();});

    // Modo rápido
    document.getElementById('lpn-serie-r')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const s=document.getElementById('lpn-serie-r')?.value.trim();if(s)this._pistolarRapido(s);}});
    document.getElementById('btn-scan-r')?.addEventListener('click',()=>abrirEscaner('ing-contenido',txt=>this._pistolarRapido(txt.trim()),e=>alert(e)));
    document.getElementById('btn-lot')?.addEventListener('click',()=>{
      const sku=document.getElementById('lpn-sku-lot')?.value.trim().toUpperCase(),cant=Number(document.getElementById('lpn-cant-lot')?.value)||1;
      if(!sku){alert('Ingresa el SKU.');return;}if(!this._lpnActual){alert('Activa un LPN.');return;}
      this._addItem({MATERIAL:sku,SERIE:'-',CANTIDAD_RECIBIDA:cant,DESCRIPCION:''});
      document.getElementById('lpn-sku-lot').value='';document.getElementById('lpn-cant-lot').value='1';
    });

    // Modo guiado
    let _t=null;
    document.getElementById('lpn-sku-g')?.addEventListener('input',e=>{clearTimeout(_t);const v=e.target.value.trim();if(v.length<2){document.getElementById('lpn-sug').style.display='none';return;}_t=setTimeout(()=>this._buscarSKU(v),300);});
    document.getElementById('btn-scan-g')?.addEventListener('click',()=>abrirEscaner('ing-contenido',txt=>{const i=document.getElementById('lpn-serie-g');if(i)i.value=txt;},e=>alert(e)));
    document.getElementById('btn-ag-g')?.addEventListener('click',()=>this._agregarGuiado());
    document.getElementById('lpn-serie-g')?.addEventListener('keydown',e=>{if(e.key==='Enter')this._agregarGuiado();});

    // Cerrar LPN y sesión
    document.getElementById('btn-cerrar-lpn')?.addEventListener('click',()=>this._cerrarLPN());
    document.getElementById('btn-exp-ses')?.addEventListener('click',()=>exportarRecepcionAExcel(this._sesionItems,`ingresos_${this._fechaIngreso}.xlsx`));
    document.getElementById('btn-nueva-ses')?.addEventListener('click',()=>{if(confirm('¿Nueva sesión?')){this._sesionItems=[];this._lpnActual=null;this._itemsLPN=[];this._renderLPN(document.getElementById('ing-contenido'));}});
  },

  async _activarLPN() {
    const codigo=document.getElementById('lpn-cod')?.value.trim().toUpperCase();
    const pedido=document.getElementById('sel-ped')?.value||document.getElementById('lpn-ped-man')?.value.trim()||'';
    const gr=document.getElementById('lpn-gr')?.value.trim()||document.getElementById('lpn-gr-ped')?.value.trim()||'';
    const tipo=document.getElementById('lpn-tipo')?.value||'';
    const msg=document.getElementById('lpn-msg');
    if(!codigo){if(msg)msg.innerHTML='<span style="color:var(--danger-text);">Escribe o escanea el código LPN.</span>';return;}
    if(!pedido){if(msg)msg.innerHTML='<span style="color:var(--danger-text);">Selecciona o ingresa un pedido.</span>';return;}
    if(!tipo){if(msg)msg.innerHTML='<span style="color:var(--danger-text);">Selecciona el tipo de ingreso.</span>';return;}
    if(msg)msg.innerHTML='<span style="color:var(--text-tertiary);">Verificando LPN…</span>';
    const {data:ex}=await sb.from('lpns').select('id,estado,codigo').eq('codigo',codigo).maybeSingle();
    if(ex){
      const {count}=await sb.from('stock').select('*',{count:'exact',head:true}).eq('lpn_id',ex.id);
      if(count>0){if(msg)msg.innerHTML=`<span style="color:var(--warning);">⚠ LPN ${escapeHtml(codigo)} tiene ${count} ítem(s). <button class="btn-secondary" style="font-size:10px;padding:2px 6px;margin-left:6px;" onclick="IngresosView._forzarLPN('${codigo}','${escapeHtml(pedido)}','${escapeHtml(gr)}','${ex.id}')">Continuar de todas formas</button></span>`;return;}
      this._lpnActual={id:ex.id,codigo};if(msg)msg.innerHTML=`<span style="color:var(--success-text);">✓ LPN ${escapeHtml(codigo)} vacío — activado.</span>`;
    }else{
      const {data,error}=await crearLPN({codigo,cliente:'',n_guia:gr,observaciones:pedido});
      if(error){if(msg)msg.innerHTML=`<span style="color:var(--danger-text);">Error: ${escapeHtml(String(error))}</span>`;return;}
      this._lpnActual={id:data?.id,codigo};if(msg)msg.innerHTML=`<span style="color:var(--success-text);">✓ LPN ${escapeHtml(codigo)} nuevo — activado.</span>`;
    }
    this._pedidoActual=pedido;this._gr=gr;this._tipoIngreso=tipo;this._itemsLPN=[];
    document.getElementById('btn-act-lpn').textContent=`✓ ${codigo}`;
    this._renderItemsLPN();
    document.getElementById('lpn-serie-r')?.focus()||document.getElementById('lpn-sku-g')?.focus();
  },

  _forzarLPN(codigo,pedido,gr,id){
    this._lpnActual={id,codigo};this._pedidoActual=pedido;this._gr=gr;this._itemsLPN=[];
    document.getElementById('btn-act-lpn').textContent=`✓ ${codigo}`;
    const msg=document.getElementById('lpn-msg');if(msg)msg.innerHTML=`<span style="color:var(--warning);">⚠ Continuando en LPN con ítems previos.</span>`;
    this._renderItemsLPN();
  },

  async _pistolarRapido(serie) {
    if(!this._lpnActual){const r=document.getElementById('lpn-r-res');if(r)r.innerHTML='<span style="color:var(--danger-text);">⚠ Activa un LPN primero.</span>';return;}
    const r=document.getElementById('lpn-r-res');if(r)r.innerHTML='<span style="color:var(--text-tertiary);">Buscando…</span>';
    let sku='',desc='';
    if(this._pedidoActual&&this._cadenaOrdenes?.get(this._pedidoActual)){
      const it=this._cadenaOrdenes.get(this._pedidoActual).items?.find(i=>i.serie&&i.serie.toUpperCase()===serie.toUpperCase());
      if(it){sku=it.sku;desc=it.descripcion||'';}
    }
    if(!sku){const s=await buscarPorSerie(serie);if(s){sku=s.sku;desc=s.descripcion||'';}}
    if(r)r.innerHTML=sku?`<span style="color:var(--success-text);">✅ ${escapeHtml(sku)} — ${escapeHtml(desc.slice(0,50))}</span>`:`<span style="color:var(--warning);">⚠ Serie no encontrada — se registra sin SKU</span>`;
    this._addItem({MATERIAL:sku,SERIE:serie,CANTIDAD_RECIBIDA:1,DESCRIPCION:desc});
    const inp=document.getElementById('lpn-serie-r');if(inp){inp.value='';inp.focus();}
  },

  async _buscarSKU(txt) {
    const sug=document.getElementById('lpn-sug');if(!sug)return;
    let res=[];
    if(this._pedidoActual&&this._cadenaOrdenes?.get(this._pedidoActual)){
      res=this._cadenaOrdenes.get(this._pedidoActual).items?.filter(it=>(it.sku||'').toUpperCase().includes(txt.toUpperCase())||(it.descripcion||'').toUpperCase().includes(txt.toUpperCase())).slice(0,6).map(it=>({sku:it.sku,desc:it.descripcion,fuente:'esperado'}))||[];
    }
    if(res.length<3){const {data}=await buscarStockAvanzado({textoLibre:txt,limit:5});const ya=new Set(res.map(r=>r.sku));(data||[]).forEach(r=>{if(!ya.has(r.sku))res.push({sku:r.sku,desc:r.descripcion,fuente:'stock'});});}
    if(!res.length){sug.style.display='none';return;}
    sug.style.display='';
    sug.innerHTML=res.map(r=>`<div class="lpn-sug-item" data-sku="${escapeHtml(r.sku)}" data-desc="${escapeHtml(r.desc||'')}" style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);">
      <span style="font-family:monospace;font-weight:700;">${escapeHtml(r.sku)}</span>
      <span style="color:var(--text-tertiary);font-size:10px;margin-left:6px;">${escapeHtml((r.desc||'').slice(0,40))}</span>
      ${r.fuente==='esperado'?'<span class="pill pill-success" style="font-size:9px;margin-left:4px;">esperado</span>':''}
    </div>`).join('');
    sug.querySelectorAll('.lpn-sug-item').forEach(el=>{
      el.addEventListener('mouseenter',()=>el.style.background='var(--bg-row-alt)');
      el.addEventListener('mouseleave',()=>el.style.background='');
      el.addEventListener('click',()=>{
        const sku=el.dataset.sku,desc=el.dataset.desc;
        document.getElementById('lpn-sku-g').value=sku;sug.style.display='none';
        const inf=document.getElementById('lpn-sku-inf');if(inf){inf.style.display='';inf.innerHTML=`<strong>${escapeHtml(sku)}</strong> — ${escapeHtml(desc)}`;}
        document.getElementById('lpn-serie-g')?.focus();
      });
    });
  },

  _agregarGuiado() {
    if(!this._lpnActual){alert('Activa un LPN primero.');return;}
    const sku=document.getElementById('lpn-sku-g')?.value.trim().toUpperCase(),serie=document.getElementById('lpn-serie-g')?.value.trim()||'-',cant=Number(document.getElementById('lpn-cant-g')?.value)||1,desc=document.getElementById('lpn-sku-inf')?.textContent?.split('—')[1]?.trim()||'';
    if(!sku){alert('Selecciona un SKU.');return;}
    this._addItem({MATERIAL:sku,SERIE:serie,CANTIDAD_RECIBIDA:cant,DESCRIPCION:desc});
    document.getElementById('lpn-sku-g').value='';document.getElementById('lpn-sku-inf').style.display='none';document.getElementById('lpn-serie-g').value='';document.getElementById('lpn-cant-g').value='1';document.getElementById('lpn-sug').style.display='none';document.getElementById('lpn-sku-g')?.focus();
  },

  _addItem(item) {
    const fecha=document.getElementById('lpn-fecha')?.value||this._fechaIngreso;
    const tipo=document.getElementById('lpn-tipo')?.value||this._tipoIngreso||'INGRESO NUEVO';
    this._itemsLPN.push({MATERIAL:item.MATERIAL,DESCRIPCION:item.DESCRIPCION||'',SERIE:item.SERIE||'-',CANTIDAD_RECIBIDA:item.CANTIDAD_RECIBIDA||1,N_PEDIDO:this._pedidoActual,N_GUIA:this._gr,TIPO_INGRESO:tipo,FECHA:fecha,_lpn:this._lpnActual?.codigo});
    this._renderItemsLPN();
    // Actualizar esperados y barra sin re-render completo
    const esp=document.getElementById('lpn-esp');if(esp)esp.innerHTML=this._renderEsp();
    const total=this._cadenaOrdenes?.get(this._pedidoActual)?.items?.length||0;
    const pct=total?Math.round((this._itemsLPN.length/total)*100):0;
    const barra=document.getElementById('lpn-barra');if(barra)barra.style.width=pct+'%';
    const cnt=document.querySelectorAll('#lpn-count');cnt.forEach(el=>el.textContent=this._itemsLPN.length);
  },

  _renderItemsLPN() {
    const lista=document.getElementById('lpn-lista'),count=document.getElementById('lpn-count'),btn=document.getElementById('btn-cerrar-lpn');
    if(count)count.textContent=this._itemsLPN.length;
    if(btn)btn.style.display=this._lpnActual&&this._itemsLPN.length>0?'':'none';
    if(!lista)return;
    if(!this._itemsLPN.length){lista.innerHTML='<div class="empty-state" style="padding:8px 0;font-size:11px;"><div class="empty-icon" style="font-size:20px;">📭</div>Sin ítems</div>';return;}
    lista.innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>SKU</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th></th></tr></thead><tbody>
      ${this._itemsLPN.map((it,i)=>`<tr><td class="sku-cell" style="font-size:11px;">${escapeHtml(it.MATERIAL||'—')}</td><td class="serie-cell" style="font-size:10px;">${escapeHtml(it.SERIE||'—')}</td><td style="font-weight:700;color:var(--accent);">${it.CANTIDAD_RECIBIDA}</td><td style="font-size:10px;">${escapeHtml(it.N_PEDIDO||'—')}</td>
      <td><button class="btn-icon" style="color:var(--danger);" onclick="IngresosView._delItemLPN(${i})"><svg viewBox="0 0 24 24" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></td></tr>`).join('')}
    </tbody></table></div>`;
  },

  _delItemLPN(idx){this._itemsLPN.splice(idx,1);this._renderItemsLPN();},

  async _cerrarLPN() {
    if(!this._itemsLPN.length){alert('Agrega ítems antes de cerrar.');return;}
    const btn=document.getElementById('btn-cerrar-lpn');if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    const {error,count}=await registrarItemsEnLPN(this._lpnActual.id,this._lpnActual.codigo,this._itemsLPN);
    if(error){if(btn){btn.disabled=false;btn.textContent='Cerrar LPN ✓';}alert('Error: '+error);return;}
    try{await sb.from('lpns').update({estado:'RECEPCION',ubicacion:'RECEPCION'}).eq('id',this._lpnActual.id);}catch(e){}
    this._sesionItems.push(...this._itemsLPN.map(i=>({...i,_lpn:this._lpnActual.codigo})));
    this._itemsLPN=[];this._lpnActual=null;
    document.getElementById('btn-act-lpn').textContent='Activar LPN';
    document.getElementById('lpn-cod').value='';
    if(btn){btn.disabled=false;btn.textContent='Cerrar LPN ✓';btn.style.display='none';}
    this._renderItemsLPN();this._renderSesion();
    document.getElementById('lpn-sesion').style.display='';
    const msg=document.getElementById('lpn-msg');if(msg)msg.innerHTML=`<span style="color:var(--success-text);">✓ LPN cerrado — ${count} ítem(s) en zona RECEPCIÓN. Activa otro LPN para continuar.</span>`;
  },

  _renderSesion() {
    const lista=document.getElementById('ses-lista'),count=document.getElementById('ses-count');
    if(count)count.textContent=this._sesionItems.length;
    if(!lista)return;
    const lpns=[...new Set(this._sesionItems.map(i=>i._lpn))];
    lista.innerHTML=lpns.map(lpn=>{const items=this._sesionItems.filter(i=>i._lpn===lpn),peds=[...new Set(items.map(i=>i.N_PEDIDO).filter(Boolean))];
      return`<div style="padding:5px 8px;background:var(--bg-row-alt);border-radius:5px;margin-bottom:3px;display:flex;justify-content:space-between;align-items:center;">
        <div><span style="font-family:monospace;font-weight:700;font-size:12px;color:var(--accent);">${escapeHtml(lpn)}</span><span style="font-size:10px;color:var(--text-tertiary);margin-left:6px;">${items.length} ítem(s)</span><div style="font-size:10px;color:var(--text-tertiary);">${peds.join(', ')||'—'}</div></div>
        <span class="pill pill-success" style="font-size:9px;">Cerrado</span>
      </div>`;
    }).join('');
  },

  // ── VER PEDIDOS ────────────────────────────────────────
  async _renderPedidos(c) {
    c.innerHTML=`${this._volver()}
    <div class="card" style="padding:10px 12px;">
      <p class="card-title" style="margin-bottom:8px;">Pedidos cargados</p>
      <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
        <select id="ped-tipo" style="font-size:11px;padding:4px 6px;"><option value="">Todos los tipos</option><option value="INGRESO NUEVO">Ingreso nuevo</option><option value="MUDANZA">Mudanza</option></select>
        <select id="ped-cli" style="font-size:11px;padding:4px 6px;"><option value="">Todos los clientes</option><option>ENTEL</option><option>CLARO</option><option>TELRAD</option><option>STP PARRES</option></select>
        <button class="btn-primary" id="btn-bus-ped" style="font-size:11px;padding:4px 10px;">Buscar</button>
      </div>
      <div id="ped-lista"><div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div></div>
    </div>`;
    this._bindVolver();
    document.getElementById('btn-bus-ped')?.addEventListener('click',()=>this._cargarPedidos());
    await this._cargarPedidos();
  },

  async _cargarPedidos() {
    const tipo=document.getElementById('ped-tipo')?.value||'',cli=document.getElementById('ped-cli')?.value||'',lista=document.getElementById('ped-lista');
    if(!lista)return;
    lista.innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';
    let q=sb.from('stock').select('paleta_pedido,cliente,tipo,fecha_ingreso,gr_ingreso').order('paleta_pedido');
    if(tipo)q=q.eq('tipo',tipo);if(cli)q=q.eq('cliente',cli);
    const {data}=await q;
    if(!data?.length){lista.innerHTML='<div class="empty-state"><div class="empty-icon">📭</div>Sin pedidos.</div>';return;}
    const pp={};data.forEach(r=>{const p=r.paleta_pedido||'(sin pedido)';if(!pp[p])pp[p]={items:0,cliente:r.cliente,tipo:r.tipo,fecha:r.fecha_ingreso,gr:r.gr_ingreso};pp[p].items++;});
    lista.innerHTML=Object.entries(pp).map(([ped,info])=>`<details style="margin-bottom:4px;">
      <summary style="cursor:pointer;padding:8px 10px;background:var(--bg-row-alt);border-radius:6px;font-size:12px;display:flex;justify-content:space-between;align-items:center;list-style:none;">
        <div><span style="font-family:monospace;font-weight:700;color:var(--accent);">${escapeHtml(ped)}</span><span style="font-size:10px;color:var(--text-tertiary);margin-left:8px;">${escapeHtml(info.cliente||'')}</span></div>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;"><span class="pill ${info.tipo==='MUDANZA'?'pill-warning':'pill-success'}" style="font-size:9px;">${info.tipo||'—'}</span><span style="font-size:11px;color:var(--text-tertiary);">${info.items} ítem(s)</span></div>
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

  // ── IMPRIMIR LPN ───────────────────────────────────────
  async _renderImprimir(c) {
    c.innerHTML=`${this._volver()}
    <div class="card" style="padding:10px 12px;">
      <p class="card-title">Generar lote de LPNs</p>
      <p class="card-subtitle" style="margin-bottom:10px;">Etiquetas en blanco correlativos para el rollo del operario.</p>
      <div class="field"><label>Cantidad</label><input type="number" id="lote-cant" value="50" min="1" max="500" style="max-width:100px;"></div>
      <button class="btn-primary" id="btn-gen-lote" style="margin-top:8px;">🖨️ Generar e imprimir</button>
      <div id="lote-res" style="margin-top:8px;"></div>
    </div>`;
    this._bindVolver();
    document.getElementById('btn-gen-lote')?.addEventListener('click',async()=>{
      const cant=Number(document.getElementById('lote-cant')?.value)||50;
      const codigos=await generarLoteLPN(cant);
      this._imprimirLote(codigos);
      document.getElementById('lote-res').innerHTML=`<div class="alert alert-success">✓ ${cant} etiquetas enviadas a imprimir (${codigos[0]} — ${codigos[codigos.length-1]})</div>`;
    });
  },

  _imprimirLote(codigos) {
    const win=window.open('','_blank','width=500,height=600');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LPNs</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>@page{size:100mm 55mm;margin:0;}body{margin:0;}.e{width:100mm;height:55mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;padding:3mm;box-sizing:border-box;}.c{font-size:14pt;font-weight:900;font-family:monospace;margin-bottom:2mm;}svg{width:90mm;height:22mm;}.s{font-size:8pt;color:#666;margin-top:2mm;}</style></head><body>
      ${codigos.map(cd=>`<div class="e"><div class="c">${cd}</div><svg id="bc-${cd}"></svg><div class="s">Fleet WMS — Telrad</div></div>`).join('')}
      <script>window.onload=function(){${codigos.map(cd=>`JsBarcode("#bc-${cd}","${cd}",{format:"CODE128",width:2.2,height:60,displayValue:false,margin:0});`).join('')}setTimeout(()=>window.print(),600);};<\/script></body></html>`);
    win.document.close();
  },
};

Router.register('ingresos', IngresosView);
