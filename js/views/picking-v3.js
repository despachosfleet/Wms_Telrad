// ============================================================
// PICKING — Lista completa, modo guía física
// PC y móvil. Header diferenciado. Items con etiquetas claras.
// ============================================================

// ---- LISTA DE ÓRDENES ----
const PickingListaView = {
  title: 'Órdenes de picking',
  _filtroEstado: 'PENDIENTE',
  _despachos: [],

  render() {
    return `
      <div id="pick-dashboard" class="dashboard-stats" style="margin-bottom:6px;"></div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;padding:8px 10px;">
        <!-- GR + Destino -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° GR</label><input type="text" id="pick-f-gr" autocomplete="off" style="padding:5px 7px;font-size:12px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Destino</label><input type="text" id="pick-f-destino" autocomplete="off" style="padding:5px 7px;font-size:12px;"></div>
        </div>
        <!-- Selects + Fechas + Botones -->
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-bottom:5px;">
          <select id="pick-f-estado" style="flex:1;min-width:80px;font-size:11px;padding:4px 3px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
            <option value="">Estado</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="PICKEADO">Pickeado</option>
            <option value="DESPACHADO">Despachado</option>
          </select>
          <select id="pick-f-cliente" style="flex:1;min-width:70px;font-size:11px;padding:4px 3px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
            <option value="">Cliente</option>
            <option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
          </select>
          <input type="date" id="pick-desde" style="flex:1;min-width:100px;font-size:11px;padding:4px 3px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
          <input type="date" id="pick-hasta" style="flex:1;min-width:100px;font-size:11px;padding:4px 3px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
          <button class="btn-primary" id="pick-btn-buscar" style="flex-shrink:0;padding:5px 10px;font-size:12px;white-space:nowrap;">Buscar</button>
          <button class="btn-ghost"   id="pick-btn-limpiar" style="flex-shrink:0;padding:5px 7px;font-size:12px;">✕</button>
        </div>
      </div>
      <div id="lista-pick-cont"></div>
    `;
  },

  afterRender() {
    // Fecha de hoy por defecto
    const hoy = new Date().toISOString().slice(0,10);
    const desdeEl = document.getElementById('pick-desde');
    const hastaEl = document.getElementById('pick-hasta');
    if (desdeEl) desdeEl.value = hoy;
    if (hastaEl) hastaEl.value = hoy;

    this._renderChips();
    this._cargar();

    document.getElementById('pick-btn-buscar')?.addEventListener('click', ()=>this._cargar());
    document.getElementById('pick-btn-limpiar')?.addEventListener('click', ()=>{
      ['pick-f-gr','pick-f-destino','pick-desde','pick-hasta'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.value='';
      });
      const cl=document.getElementById('pick-f-cliente'); if(cl) cl.value='';
      this._cargar();
    });
    ['pick-f-gr','pick-f-destino'].forEach(id=>{
      document.getElementById(id)?.addEventListener('keydown', e=>{ if(e.key==='Enter') this._cargar(); });
    });
    document.getElementById('pick-f-cliente')?.addEventListener('change', ()=>this._cargar());
  },

  _renderChips() {
    const estados = [{v:'TODOS',l:'Todos'},{v:'PENDIENTE',l:'Pendiente'},{v:'EN_PROCESO',l:'En proc.'},{v:'PICKEADO',l:'Pickeado'},{v:'DESPACHADO',l:'Despachado'}];
    const el = document.getElementById('chips-estado-pick');
    if (!el) return;
    el.innerHTML = estados.map(e =>
      `<button class="chip ${this._filtroEstado===e.v?'active':''}" data-est="${e.v}" style="white-space:nowrap;flex-shrink:0;padding:3px 8px;font-size:10px;">${e.l}</button>`
    ).join('');
    document.querySelectorAll('[data-est]').forEach(b => b.addEventListener('click', () => {
      this._filtroEstado=b.dataset.est; this._renderChips(); this._renderLista();
    }));
  },

  async _cargar() {
    document.getElementById('lista-pick-cont').innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';
    const desde   = document.getElementById('pick-desde')?.value;
    const hasta   = document.getElementById('pick-hasta')?.value;
    // Dashboard: carga TODOS (sin filtro de fecha) para mostrar totales reales del sistema
    const [todosDespachos, filtrados] = await Promise.all([
      obtenerTodosLosDespachos({}),
      obtenerTodosLosDespachos({
        fechaDesde: desde ? desde+'T00:00:00' : null,
        fechaHasta: hasta ? hasta+'T23:59:59' : null,
      })
    ]);
    this._todosDespachos = todosDespachos;
    this._despachos = filtrados;
    this._renderDashboard();
    this._renderLista();
  },

  _renderDashboard() {
    const dash = document.getElementById('pick-dashboard');
    if (!dash) return;
    // Siempre usa TODOS los despachos para el dashboard
    const todos = (this._todosDespachos || this._despachos).filter(d=>d.status!=='BORRADOR');
    const conts = {PENDIENTE:0, EN_PROCESO:0, PICKEADO:0, DESPACHADO:0};
    todos.forEach(d => { const e=calcularEstadoVisual(d); if(conts[e]!==undefined) conts[e]++; });
    dash.innerHTML = [
      {l:'Pendientes',  v:conts.PENDIENTE,  c:'var(--text)'},
      {l:'En proceso',  v:conts.EN_PROCESO,  c:'var(--warning)'},
      {l:'Pickeados',   v:conts.PICKEADO,    c:'var(--success-text)'},
      {l:'Despachados', v:conts.DESPACHADO,  c:'var(--text-tertiary)'},
    ].map(s=>`
      <div class="stat-card" style="cursor:pointer;" onclick="PickingListaView._filtroEstado='${s.l==='Pendientes'?'PENDIENTE':s.l==='En proceso'?'EN_PROCESO':s.l==='Pickeados'?'PICKEADO':'DESPACHADO'}'; PickingListaView._renderChips(); PickingListaView._renderLista();">
        <div class="stat-value" style="color:${s.c}; font-size:24px;">${s.v}</div>
        <div class="stat-label">${s.l}</div>
      </div>
    `).join('');
  },

  _renderLista() {
    const cont    = document.getElementById('lista-pick-cont');
    const fGR     = (document.getElementById('pick-f-gr')?.value||'').trim().toLowerCase();
    const fDest   = (document.getElementById('pick-f-destino')?.value||'').trim().toLowerCase();
    const fCliente= (document.getElementById('pick-f-cliente')?.value||'').toUpperCase();
    const fEstado = document.getElementById('pick-f-estado')?.value||'';
    let lista = this._despachos
      .filter(d => d.status !== 'BORRADOR')
      .map(d => ({...d, _est: calcularEstadoVisual(d)}));
    if (fEstado) lista = lista.filter(d => d._est===fEstado);
    if (fGR)      lista = lista.filter(d => (d.gr||'').toLowerCase().includes(fGR));
    if (fDest)    lista = lista.filter(d => (d.destino||'').toLowerCase().includes(fDest) || (d.razon_social||'').toLowerCase().includes(fDest));
    if (fCliente) lista = lista.filter(d => (d.cliente||'').toUpperCase()===fCliente);
    if (!lista.length) {
      cont.innerHTML=`<div class="empty-state"><div class="empty-icon">📋</div><strong>Sin órdenes</strong>Cambia los filtros.</div>`;
      return;
    }
    cont.innerHTML=`
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th><th>Ítems</th><th>Progreso</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${lista.map(d => {
              const items=d.despachos_items||[];
              const pick=items.filter(it=>it.observaciones?.startsWith('PICKEADO')).length;
              const pct=items.length>0?Math.round(pick/items.length*100):0;
              return `<tr>
                <td class="sku-cell">${escapeHtml(d.gr||'Sin GR')}</td>
                <td>${escapeHtml(d.destino||'-')}</td>
                <td style="max-width:160px; word-break:break-word; white-space:normal; font-size:11px;">${escapeHtml(d.razon_social||'-')}</td>
                <td>${escapeHtml(d.cliente||'-')}</td>
                <td>${items.length}</td>
                <td style="min-width:80px;">
                  <div style="font-size:10px; color:var(--text-tertiary); margin-bottom:2px;">${pick}/${items.length}</div>
                  <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
                </td>
                <td>${pillEstado(d._est)}</td>
                <td>${d._est!=='DESPACHADO'
                  ?`<button class="btn-primary" style="padding:5px 12px; font-size:11px;" data-pick="${d.id}">Pickear</button>`
                  :`<button class="btn-ghost" data-ver="${d.id}">Ver</button>`}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    cont.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => Router.navigate('picking',{despachoId:b.dataset.pick})));
    cont.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => Router.navigate('picking-detalle',{despachoId:b.dataset.ver})));
  }
};
Router.register('picking-lista', PickingListaView);

// ---- PICKING EN LISTA ----
const PickingView = {
  title: 'Picking',
  _despacho: null,
  _items: [],
  _expandido: null,
  _stockOpciones: {},
  _cargandoStock: {},

  render() { return `<div id="picking-wrap"></div>`; },

  async afterRender(params) {
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);
    if (!despacho) { document.getElementById('picking-wrap').innerHTML='<div class="empty-state">No se pudo cargar la orden.</div>'; return; }
    this._despacho=despacho; this._items=items;
    this._expandido=null; this._stockOpciones={}; this._cargandoStock={};
    this._render();
  },

  _pickeado(it)   { return it.observaciones?.startsWith('PICKEADO'); },
  _cantPick(it)   { const m=it.observaciones?.match(/PICKEADO:\s*([\d.]+)/); return m?Number(m[1]):it.cantidad; },
  _serieOk(s)     { return s && s.trim() !== '' && s.trim() !== '-' && !s.trim().startsWith('-'); },

  _render() {
    const wrap = document.getElementById('picking-wrap');
    if (!wrap) return;
    const total     = this._items.length;
    const pickeados = this._items.filter(it=>this._pickeado(it)).length;
    const pct       = total>0 ? Math.round(pickeados/total*100) : 0;
    const terminado = this._despacho.status==='PICKEADO' || this._despacho.status==='DESPACHADO';
    const pendientes  = this._items.filter(it=>!this._pickeado(it));
    const completados = this._items.filter(it=> this._pickeado(it));

    wrap.innerHTML=`
      <button class="btn-secondary" style="margin-bottom:10px; font-size:12px;" onclick="Router.navigate('picking-lista')">← Volver a órdenes</button>
      <!-- HEADER: color diferenciado, fondo azul oscuro -->
      <div style="
        background: var(--bg-header);
        color: var(--text-header);
        border-radius: var(--radius);
        padding: 14px 16px;
        margin-bottom: 12px;
        position: sticky;
        top: calc(var(--header-h) + var(--nav-h) + 6px);
        z-index: 50;
        box-shadow: var(--shadow);
      ">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
          <div style="min-width:0; flex:1;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
              <span style="font-family:monospace; font-size:15px; font-weight:900; letter-spacing:-.5px;">${escapeHtml(this._despacho.gr||'Sin GR')}</span>
              ${pillEstado(calcularEstadoVisual(this._despacho))}
            </div>
            <div style="font-size:11px; opacity:.85; display:flex; flex-wrap:wrap; gap:x 12px; row-gap:2px;">
              <span style="margin-right:12px;"><span style="opacity:.7;">Destino:</span> <strong>${escapeHtml(this._despacho.destino||'-')}</strong></span>
              ${this._despacho.razon_social?`<span style="margin-right:12px;"><span style="opacity:.7;">Destinatario:</span> <strong>${escapeHtml(this._despacho.razon_social)}</strong></span>`:''}
              ${this._despacho.cliente?`<span style="margin-right:12px;"><span style="opacity:.7;">Cliente:</span> <strong>${escapeHtml(this._despacho.cliente)}</strong></span>`:''}

            </div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-size:22px; font-weight:900; color:#fff; line-height:1;">${pickeados}<span style="font-size:13px; opacity:.6;">/${total}</span></div>
            <div style="font-size:10px; opacity:.6; text-transform:uppercase; letter-spacing:.5px;">pickeados</div>
            ${!terminado && pickeados>0?`<button class="btn-primary" id="btn-terminar-pick" style="margin-top:8px; padding:6px 14px; font-size:11px;">Terminar picking</button>`:''}
          </div>
        </div>
        <div style="height:4px; background:rgba(255,255,255,.2); border-radius:2px; margin-top:10px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:#fff; border-radius:2px; transition:width .4s;"></div>
        </div>
      </div>

      <div id="items-list">
        ${pendientes.length?`<p class="section-label">Por pickear (${pendientes.length})</p>`:''}
        ${pendientes.map(it=>this._renderItem(it,this._items.indexOf(it))).join('')}
        ${completados.length?`<p class="section-label" style="color:var(--success-text);">Pickeados (${completados.length})</p>`:''}
        ${completados.map(it=>this._renderItem(it,this._items.indexOf(it))).join('')}
      </div>

      ${terminado?`
        <div class="alert alert-success" style="margin-top:12px;">
          ${this._despacho.status==='DESPACHADO'?'✓ Ya despachado.':'✓ Picking terminado.'}
          ${this._despacho.status==='PICKEADO'?`<button class="btn-success" id="btn-despachar-final" style="margin-left:10px;">Confirmar salida del almacén</button>`:''}
        </div>
      `:''}
    `;

    document.getElementById('btn-terminar-pick')?.addEventListener('click', ()=>this._terminar());
    document.getElementById('btn-despachar-final')?.addEventListener('click', ()=>this._finalizar());
    if (this._expandido!==null) this._bindPanel(this._expandido);

    document.querySelectorAll('[data-item-idx]').forEach(el => {
      el.addEventListener('click', e => {
        if (['INPUT','SELECT','BUTTON'].includes(e.target.tagName)) return;
        const idx=Number(el.dataset.itemIdx);
        if (this._expandido===idx) { this._expandido=null; this._render(); return; }
        this._expandido=idx;
        this._render();
        setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),60);
        const it=this._items[idx];
        if (!this._stockOpciones[it.id] && !this._cargandoStock[it.id]) this._cargarStock(it,idx);
      });
    });
  },

  _renderItem(it, idx) {
    const pic = this._pickeado(it);
    const exp = this._expandido===idx;
    const serie = this._serieOk(it.serie) ? it.serie : null;
    const borderColor = pic?'var(--success)': exp?'var(--accent)':'var(--border)';

    return `
      <div class="pick-item ${pic?'pickeado':''} ${exp?'expandido':''}"
           data-item-idx="${idx}" style="border-left-color:${borderColor};">

        <!-- VISTA CERRADA -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div style="flex:1; min-width:0;">
            <div style="font-family:monospace; font-size:13px; font-weight:800; color:var(--text-mono);">${escapeHtml(it.sku||'-')}</div>
            <div style="font-size:11px; color:var(--text); margin-top:4px; line-height:1.5; word-break:break-word;">${escapeHtml(it.descripcion||'')}</div>
          </div>
          <div style="flex-shrink:0; text-align:center; min-width:52px;">
            ${pic
              ? `<div style="background:var(--success-bg); border:1.5px solid var(--success); border-radius:6px; padding:4px 10px;">
                   <div style="font-size:9px; font-weight:700; color:var(--success-text); text-transform:uppercase;">Pickeado</div>
                   <div style="font-size:15px; font-weight:800; color:var(--success-text);">${formatNum(this._cantPick(it))}</div>
                 </div>`
              : `<div style="background:var(--accent-dim); border:1.5px solid var(--accent); border-radius:6px; padding:4px 10px;">
                   <div style="font-size:9px; font-weight:700; color:var(--accent-text); text-transform:uppercase;">Cant.</div>
                   <div style="font-size:17px; font-weight:900; color:var(--accent);">${formatNum(it.cantidad)}</div>
                 </div>`}
          </div>
        </div>

        <!-- TAGS SIEMPRE VISIBLES -->
        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:8px;">
          <span style="font-size:11px; background:var(--bg-row-alt); border:1px solid var(--border); border-radius:4px; padding:3px 8px; white-space:nowrap;">
            <span style="color:var(--text-tertiary); font-weight:600;">Serie: </span>
            <span style="font-family:monospace; font-weight:700; color:${serie?'var(--accent-text)':'var(--text-tertiary)'};">${serie?escapeHtml(serie):'Sin serie'}</span>
          </span>
          ${it.paleta_pedido?`
            <span style="font-size:11px; background:var(--bg-row-alt); border:1px solid var(--border); border-radius:4px; padding:3px 8px; white-space:nowrap;">
              <span style="color:var(--text-tertiary); font-weight:600;">Pedido/Paleta: </span>
              <span style="font-family:monospace; font-weight:700;">${escapeHtml(it.paleta_pedido)}</span>
            </span>`:''}
          ${it.ubicacion_fisica?`
            <span style="font-size:11px; background:var(--bg-row-alt); border:1px solid var(--border); border-radius:4px; padding:3px 8px; white-space:nowrap;">
              <span style="color:var(--text-tertiary); font-weight:600;">Ubic.: </span>
              <span style="font-weight:700;">${escapeHtml(it.ubicacion_fisica)}</span>
            </span>`:''}
          ${!pic&&!exp?`<span style="font-size:10px; color:var(--text-tertiary); margin-left:auto; align-self:center;">Toca para confirmar</span>`:''}
        </div>

        <!-- PANEL DE CONFIRMACIÓN -->
        ${exp?this._renderPanel(it,idx):''}
      </div>
    `;
  },

  _renderPanel(it, idx) {
    const serie = this._serieOk(it.serie) ? it.serie : '';
    const opc   = this._stockOpciones[it.id];
    const carg  = this._cargandoStock[it.id];
    const pic   = this._pickeado(it);

    return `
      <div style="margin-top:12px; padding-top:12px; border-top:1.5px dashed var(--border);" onclick="event.stopPropagation()">

        <!-- FUENTE DE STOCK -->
        <div id="stock-source-${idx}" style="margin-bottom:12px;">
          ${carg?`<div style="font-size:11px; color:var(--text-tertiary);">Buscando en stock…</div>`:''}
          ${!carg&&!opc?`<div style="font-size:11px; color:var(--text-tertiary);">Cargando fuente de stock…</div>`:''}
          ${opc?this._renderStockOpc(opc,idx):''}
        </div>

        <!-- CAMPOS -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div class="field">
            <label>Cant. solicitada</label>
            <input type="text" value="${formatNum(it.cantidad)}" disabled style="background:var(--bg-row-alt); font-weight:700; color:var(--text-tertiary); text-align:center; font-size:15px;">
          </div>
          <div class="field">
            <label>Cant. a confirmar</label>
            <input type="number" id="pick-cant-${idx}" value="${pic?this._cantPick(it):it.cantidad}"
              min="0" step="1" style="font-size:17px; font-weight:900; text-align:center; color:var(--accent);">
          </div>
        </div>
        <!-- Pedido/Paleta con selector -->
        <div class="field">
          <label>Pedido / Paleta</label>
          <div style="display:flex; gap:6px;">
            <input type="text" id="pick-pp-${idx}" value="${escapeHtml(it.paleta_pedido||'')}" style="flex:1;">
            <button class="btn-icon btn-scan" style="flex-shrink:0;" title="Seleccionar paleta/pedido disponible"
              onclick="event.stopPropagation(); PickingView._abrirSelectorPP(${idx})">
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M21 10H3M16 6l-4-4-4 4M8 18l4 4 4-4"/></svg>
            </button>
          </div>
        </div>
        <!-- Serie con selector -->
        <div class="field">
          <label>Serie</label>
          <div style="display:flex; gap:6px;">
            <input type="text" id="pick-serie-${idx}" value="${escapeHtml(serie)}"
              placeholder="Sin serie" style="font-family:monospace; font-size:13px; flex:1;">
            <button class="btn-icon btn-scan" style="flex-shrink:0;" title="Ver series disponibles"
              onclick="event.stopPropagation(); PickingView._abrirSelectorSerie(${idx})">
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M21 10H3M16 6l-4-4-4 4M8 18l4 4 4-4"/></svg>
            </button>
          </div>
        </div>
        <div class="field">
          <label>Observación</label>
          <input type="text" id="pick-obs-${idx}" placeholder="Incidencia, cambio de SKU…">
        </div>
        <input type="hidden" id="pick-stock-id-${idx}" value="">

        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
          <button class="btn-primary" id="pick-btn-${idx}" style="flex:1;">${pic?'Corregir':'Confirmar ítem'}</button>
          <button class="btn-ghost"   id="pick-cancel-${idx}">Cerrar</button>
        </div>
        <div id="pick-msg-${idx}" style="margin-top:6px;"></div>
      </div>
    `;
  },

  _renderStockOpc(opc, idx) {
    let html='';
    if (opc.principal) {
      const p=opc.principal;
      const esIng=p.origen==='INGRESO_NUEVO';
      html+=`
        <div style="background:${esIng?'var(--success-bg)':'var(--blue-bg)'}; border:1.5px solid ${esIng?'var(--success)':'var(--accent)'}; border-radius:var(--radius-sm); padding:8px 12px; margin-bottom:6px;">
          <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:${esIng?'var(--success-text)':'var(--blue-text)'}; margin-bottom:4px;">
            ${esIng?'✓ Ingreso nuevo — pickear de aquí':'Stock mudanza'}
          </div>
          <div style="font-size:11px; color:var(--text-secondary);">
            ${p.stock.paleta_pedido?`<strong>Pedido/Paleta:</strong> ${escapeHtml(p.stock.paleta_pedido)} &nbsp; `:''}
            ${p.stock.ubicacion_fisica?`<strong>Ubic.:</strong> ${escapeHtml(p.stock.ubicacion_fisica)} &nbsp; `:''}
            <strong>Disp.:</strong> ${formatNum(p.stock.cantidad)}
            ${p.stock.serie?` &nbsp; <strong>Serie:</strong> <span style="font-family:monospace;">${escapeHtml(p.stock.serie)}</span>`:''}
          </div>
        </div>
      `;
    }
    if (opc.alternativas?.length) {
      html+=`<div style="margin-top:4px;">
        <div style="font-size:10px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:4px;">También disponible en:</div>
        ${opc.alternativas.map(alt=>`
          <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; font-size:11px; border-bottom:1px solid var(--border);">
            <div>
              <span class="pill ${alt.origen==='MUDANZA'?'pill-info':'pill-neutral'}" style="margin-right:6px;">${alt.origen==='MUDANZA'?'Mudanza':'Stock'}</span>
              ${escapeHtml(alt.stock.paleta_pedido||'-')}
              ${alt.stock.ubicacion_fisica?` · ${escapeHtml(alt.stock.ubicacion_fisica)}`:''}
              · Cant: ${formatNum(alt.stock.cantidad)}
            </div>
            <button class="btn-ghost" style="font-size:10px; padding:2px 8px; flex-shrink:0;"
              data-usar-alt="${idx}" data-alt-sid="${alt.stock.id}" data-alt-pp="${escapeHtml(alt.stock.paleta_pedido||'')}">
              Usar este
            </button>
          </div>`).join('')}
      </div>`;
    }
    if (!opc.principal && !opc.alternativas?.length) {
      html+=`<div style="background:var(--warning-bg); border:1px solid var(--warning); border-radius:var(--radius-sm); padding:8px 12px; font-size:11px; color:var(--warning-text);">
        Sin stock en sistema. Se registrará con observación.
      </div>`;
    }
    return html;
  },

  async _cargarStock(it, idx) {
    this._cargandoStock[it.id]=true;
    const serie = this._serieOk(it.serie) ? it.serie : null;
    const { data:opciones, origen } = await buscarStockParaItem(it.sku, it.paleta_pedido, serie);
    this._cargandoStock[it.id]=false;

    if (!opciones?.length) {
      this._stockOpciones[it.id]={ principal:null, alternativas:[] };
    } else if (origen==='INGRESO_NUEVO') {
      const { data:mud } = await buscarStockAvanzado({ sku:it.sku, estado:'DISPONIBLE', limit:5 });
      const alts=(mud||[]).filter(s=>s.id!==opciones[0].id && s.paleta_pedido?.toUpperCase().startsWith('PALETA')).map(s=>({stock:s,origen:'MUDANZA'}));
      this._stockOpciones[it.id]={ principal:{stock:opciones[0],origen:'INGRESO_NUEVO'}, alternativas:alts };
    } else {
      // Buscar si hay ingreso nuevo también
      const { data:ing } = await buscarStockAvanzado({ sku:it.sku, paleta:it.paleta_pedido||'', estado:'DISPONIBLE', limit:5 });
      const ingFilt=(ing||[]).filter(s=>!s.paleta_pedido?.toUpperCase().startsWith('PALETA'));
      if (ingFilt.length) {
        this._stockOpciones[it.id]={ principal:{stock:ingFilt[0],origen:'INGRESO_NUEVO'}, alternativas:opciones.slice(0,3).map(s=>({stock:s,origen:'MUDANZA'})) };
      } else {
        this._stockOpciones[it.id]={ principal:{stock:opciones[0],origen:'MUDANZA'}, alternativas:opciones.slice(1,4).map(s=>({stock:s,origen:'MUDANZA'})) };
      }
    }

    if (this._expandido===idx) {
      const src=document.getElementById(`stock-source-${idx}`);
      if (src) { src.innerHTML=this._renderStockOpc(this._stockOpciones[it.id],idx); this._bindAlt(idx); }
    }
  },

  _abrirSelectorPP(idx) {
    const it  = this._items[idx];
    const opc = this._stockOpciones[it.id];
    const opciones = [];
    if (opc?.principal?.stock?.paleta_pedido) opciones.push({ pp: opc.principal.stock.paleta_pedido, cant: opc.principal.stock.cantidad, orig: opc.principal.origen });
    if (opc?.alternativas) opc.alternativas.forEach(a => { if (a.stock?.paleta_pedido) opciones.push({ pp: a.stock.paleta_pedido, cant: a.stock.cantidad, orig: a.origen }); });

    if (!opciones.length) { alert('No hay paletas/pedidos alternativos disponibles para este SKU.'); return; }

    const modal = document.createElement('div');
    modal.className = 'pick-modal-overlay';
    modal.innerHTML = `
      <div class="pick-modal">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <strong>Seleccionar Paleta / Pedido</strong>
          <button class="btn-icon" onclick="this.closest('.pick-modal-overlay').remove()">✕</button>
        </div>
        <p style="font-size:11px; color:var(--text-secondary); margin-bottom:10px;">
          Si seleccionas uno distinto al recomendado se mostrará una alerta de confirmación.
        </p>
        ${opciones.map((o,i) => `
          <div class="pick-modal-opcion ${i===0?'recomendada':''}" data-pp="${escapeHtml(o.pp)}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-family:monospace; font-weight:700; font-size:13px;">${escapeHtml(o.pp)}</span>
                ${i===0?'<span class="pill pill-success" style="font-size:10px; margin-left:6px;">Recomendado</span>':''}
              </div>
              <span style="font-size:11px; color:var(--text-secondary);">Disp: ${formatNum(o.cant)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.pick-modal-opcion').forEach((el, i) => {
      el.addEventListener('click', () => {
        const pp = el.dataset.pp;
        const actual = document.getElementById(`pick-pp-${idx}`)?.value;
        if (i > 0 && pp !== actual) {
          if (!confirm(`Vas a cambiar de "${actual}" a "${pp}". ¿Confirmas que es correcto?`)) return;
        }
        const inp = document.getElementById(`pick-pp-${idx}`);
        if (inp) inp.value = pp;
        modal.remove();
      });
    });
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  },

  async _abrirSelectorSerie(idx) {
    const it  = this._items[idx];
    const ppEl = document.getElementById(`pick-pp-${idx}`);
    const pp   = ppEl?.value || it.paleta_pedido || '';

    const modal = document.createElement('div');
    modal.className = 'pick-modal-overlay';
    modal.innerHTML = `<div class="pick-modal"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><strong>Series disponibles</strong><button class="btn-icon" onclick="this.closest('.pick-modal-overlay').remove()">✕</button></div><div class="empty-state" style="padding:20px 0;"><div class="empty-icon">⏳</div>Buscando series…</div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    const { data } = await buscarStockAvanzado({ sku: it.sku, paleta: pp, estado: 'DISPONIBLE', limit: 50 });
    const series = (data || []).filter(r => r.serie && r.serie !== '-' && r.serie !== '');

    const inner = modal.querySelector('.pick-modal');
    if (!series.length) {
      inner.innerHTML += '<p style="color:var(--text-tertiary);font-size:12px;">No hay series registradas para este SKU y pedido/paleta.</p>';
      return;
    }

    const actualSerie = document.getElementById(`pick-serie-${idx}`)?.value?.trim();
    inner.querySelector('.empty-state')?.remove();

    const lista = document.createElement('div');
    lista.innerHTML = `
      <p style="font-size:11px; color:var(--text-secondary); margin-bottom:8px;">
        Toca una serie para seleccionarla. Si difiere de la solicitada se pedirá confirmación.
      </p>
      ${series.map(r => `
        <div class="pick-modal-opcion ${r.serie===actualSerie?'recomendada':''}" data-serie="${escapeHtml(r.serie)}" data-sid="${r.id}" data-pp="${escapeHtml(r.paleta_pedido||'')}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:monospace; font-weight:700; font-size:12px;">${escapeHtml(r.serie)}</span>
            <div style="font-size:11px; color:var(--text-secondary); text-align:right;">
              ${r.paleta_pedido?`<div>${escapeHtml(r.paleta_pedido)}</div>`:''}
              ${r.ubicacion_fisica?`<div>${escapeHtml(r.ubicacion_fisica)}</div>`:''}
            </div>
          </div>
        </div>
      `).join('')}
    `;
    inner.appendChild(lista);

    lista.querySelectorAll('.pick-modal-opcion').forEach(el => {
      el.addEventListener('click', () => {
        const serie    = el.dataset.serie;
        const sid      = el.dataset.sid;
        const pp       = el.dataset.pp;
        const pedida   = it.serie;
        if (pedida && serie !== pedida && pedida !== '-') {
          if (!confirm(`La serie solicitada es "${pedida}" pero seleccionaste "${serie}". ¿Confirmas que es correcta?`)) return;
        }
        const serieInp = document.getElementById(`pick-serie-${idx}`);
        const ppInp    = document.getElementById(`pick-pp-${idx}`);
        const sidInp   = document.getElementById(`pick-stock-id-${idx}`);
        if (serieInp) serieInp.value = serie;
        if (ppInp && pp) ppInp.value = pp;
        if (sidInp && sid) sidInp.value = sid;
        modal.remove();
      });
    });
  },

  _bindPanel(idx) {
    document.getElementById(`pick-btn-${idx}`)?.addEventListener('click', e=>{e.stopPropagation();this._confirmar(idx);});
    document.getElementById(`pick-cancel-${idx}`)?.addEventListener('click', e=>{e.stopPropagation();this._expandido=null;this._render();});
    this._bindAlt(idx);
  },

  _bindAlt(idx) {
    document.querySelectorAll(`[data-usar-alt="${idx}"]`).forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        document.getElementById(`pick-stock-id-${idx}`).value=btn.dataset.altSid;
        document.getElementById(`pick-pp-${idx}`).value=btn.dataset.altPp;
        btn.textContent='✓ Elegido'; btn.classList.add('btn-success'); btn.disabled=true;
      });
    });
  },

  async _confirmar(idx) {
    const it  = this._items[idx];
    const cant= Number(document.getElementById(`pick-cant-${idx}`)?.value);
    const serie=document.getElementById(`pick-serie-${idx}`)?.value.trim()||null;
    const pp  =document.getElementById(`pick-pp-${idx}`)?.value.trim()||it.paleta_pedido;
    const obs =document.getElementById(`pick-obs-${idx}`)?.value.trim()||'';
    const msgEl=document.getElementById(`pick-msg-${idx}`);
    const btn =document.getElementById(`pick-btn-${idx}`);

    if (cant<0) { if(msgEl) msgEl.innerHTML='<p class="msg-error">Cantidad inválida.</p>'; return; }
    btn.disabled=true; btn.textContent='Guardando…';

    if (pp&&pp!==it.paleta_pedido) await actualizarPaletaPedidoItem(it.id,pp);

    let stockId=document.getElementById(`pick-stock-id-${idx}`)?.value||'';
    if (!stockId) { const opc=this._stockOpciones[it.id]; if(opc?.principal) stockId=String(opc.principal.stock.id); }
    if (!stockId&&it.stock_id) stockId=String(it.stock_id);
    if (!stockId) {
      const {data:opts}=await buscarStockParaItem(it.sku,pp||it.paleta_pedido,serie);
      if(opts?.length){stockId=String(opts[0].id);await asignarStockAItem(it.id,Number(stockId));}
    }

    if (!stockId||cant===0) {
      await actualizarObservacionItem(it.id,`PICKEADO: ${cant} | SIN STOCK${obs?' | '+obs:''}`);
    } else {
      const {error}=await confirmarPicking(it.id,Number(stockId),cant,obs);
      if(error){if(msgEl)msgEl.innerHTML='<p class="msg-error">Error al confirmar.</p>';btn.disabled=false;btn.textContent='Confirmar ítem';return;}
    }

    const {items}=await obtenerDespachoConItems(this._despacho.id);
    this._items=items; this._expandido=null; this._render();
  },

  async _terminar() {
    const btn=document.getElementById('btn-terminar-pick');
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    const {error}=await terminarPicking(this._despacho.id);
    if(error){alert('Error al terminar.');if(btn){btn.disabled=false;btn.textContent='Terminar picking';}return;}
    const {despacho,items}=await obtenerDespachoConItems(this._despacho.id);
    this._despacho=despacho;this._items=items;this._render();
  },

  async _finalizar() {
    await finalizarDespacho(this._despacho.id);
    Router.navigate('picking-lista');
  }
};
Router.register('picking', PickingView);

// ---- DETALLE READ-ONLY ----
const PickingDetalleView = {
  title: 'Detalle de orden',
  render() { return `<div id="det-cont"></div>`; },
  async afterRender(params) {
    const {despacho,items}=await obtenerDespachoConItems(params.despachoId);
    const cont=document.getElementById('det-cont');
    if(!despacho){cont.innerHTML='<div class="empty-state">No encontrado.</div>';return;}
    const est=calcularEstadoVisual({...despacho,despachos_items:items});
    cont.innerHTML=`
      <button class="btn-secondary" style="margin-bottom:10px; font-size:12px;" onclick="Router.navigate('picking-lista')">← Volver a órdenes</button>
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
          <div>
            <p style="font-family:monospace; font-size:15px; font-weight:800; margin:0;">${escapeHtml(despacho.gr||'Sin GR')}</p>
            <p style="font-size:11px; color:var(--text-secondary); margin:4px 0 0;">${escapeHtml(despacho.destino||'-')} · ${escapeHtml(despacho.razon_social||'-')} · ${escapeHtml(despacho.cliente||'-')}</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            ${pillEstado(est)}
            ${est!=='DESPACHADO'?`<button class="btn-primary" id="btn-ir-pick" style="padding:6px 12px; font-size:11px;">Pickear</button>`:''}
          </div>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Descripción</th><th>Cant.</th><th>Serie</th><th>Pedido/Paleta</th><th>Estado</th></tr></thead>
          <tbody>
            ${items.map(it=>`<tr>
              <td class="sku-cell">${escapeHtml(it.sku||'-')}</td>
              <td style="font-size:11px; max-width:300px; word-break:break-word; white-space:normal;">${escapeHtml(it.descripcion||'-')}</td>
              <td style="font-weight:700;">${formatNum(it.cantidad)}</td>
              <td style="font-family:monospace; font-size:11px;">${escapeHtml(it.serie||'-')}</td>
              <td>${escapeHtml(it.paleta_pedido||'-')}</td>
              <td>${it.observaciones?.startsWith('PICKEADO')?'<span class="pill pill-success">Pickeado</span>':'<span class="pill pill-neutral">Pendiente</span>'}</td>
            </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-tertiary);">Sin ítems</td></tr>'}
          </tbody>
        </table>
      </div>`;
    document.getElementById('btn-ir-pick')?.addEventListener('click',()=>Router.navigate('picking',{despachoId:despacho.id}));
  }
};
Router.register('picking-detalle', PickingDetalleView);

// ---- DESPACHOS Y SALIDAS ----
const DespachosSalidasView = {
  title: 'Despachos y salidas',
  _filtroEstado: 'PICKEADO',
  _despachos: [],

  render() {
    return `
      <div id="ds-dashboard" class="dashboard-stats" style="margin-bottom:6px;"></div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;padding:8px 10px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">N° GR</label><input type="text" id="ds-f-gr" autocomplete="off" style="padding:5px 7px;font-size:12px;"></div>
          <div class="field" style="margin:0;"><label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Destino</label><input type="text" id="ds-f-destino" autocomplete="off" style="padding:5px 7px;font-size:12px;"></div>
        </div>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
          <select id="ds-f-estado" style="flex:1;min-width:90px;font-size:11px;padding:4px 3px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
            <option value="">Estado</option>
            <option value="PICKEADO">Pickeado</option>
            <option value="DESPACHADO">Despachado</option>
          </select>
          <select id="ds-f-cliente" style="flex:1;min-width:70px;font-size:11px;padding:4px 3px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
            <option value="">Cliente</option>
            <option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
          </select>
          <input type="date" id="ds-desde" style="flex:1;min-width:100px;font-size:11px;padding:4px 3px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
          <input type="date" id="ds-hasta" style="flex:1;min-width:100px;font-size:11px;padding:4px 3px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
          <button class="btn-primary" id="ds-btn-buscar" style="flex-shrink:0;padding:5px 10px;font-size:12px;white-space:nowrap;">Buscar</button>
          <button class="btn-ghost"   id="ds-btn-limpiar" style="flex-shrink:0;padding:5px 7px;font-size:12px;">✕</button>
        </div>
      </div>
      <div id="lista-ds"></div>
    `;
  },

  afterRender() {
    const hoy = new Date().toISOString().slice(0,10);
    const desdeEl = document.getElementById('ds-desde');
    const hastaEl = document.getElementById('ds-hasta');
    if (desdeEl) desdeEl.value = hoy;
    if (hastaEl) hastaEl.value = hoy;

    this._renderChips();
    this._cargar();

    document.getElementById('ds-btn-buscar')?.addEventListener('click', ()=>this._cargar());
    document.getElementById('ds-btn-limpiar')?.addEventListener('click', ()=>{
      ['ds-f-gr','ds-f-destino','ds-desde','ds-hasta'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.value='';
      });
      const cl=document.getElementById('ds-f-cliente'); if(cl) cl.value='';
      this._cargar();
    });
    ['ds-f-gr','ds-f-destino'].forEach(id=>{
      document.getElementById(id)?.addEventListener('keydown', e=>{ if(e.key==='Enter') this._cargar(); });
    });
    document.getElementById('ds-f-cliente')?.addEventListener('change', ()=>this._cargar());
  },

  _renderChips() {
    const el = document.getElementById('chips-ds');
    if (!el) return;
    el.innerHTML = [{v:'TODOS',l:'Todos'},{v:'PICKEADO',l:'Pickeado'},{v:'DESPACHADO',l:'Despachado'}].map(e=>
      `<button class="chip ${this._filtroEstado===e.v?'active':''}" data-ds="${e.v}" style="white-space:nowrap;flex-shrink:0;padding:3px 8px;font-size:10px;">${e.l}</button>`
    ).join('');
    document.querySelectorAll('[data-ds]').forEach(b=>b.addEventListener('click',()=>{
      this._filtroEstado=b.dataset.ds; this._renderChips(); this._renderLista();
    }));
  },

  async _cargar() {
    document.getElementById('lista-ds').innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';
    const desde = document.getElementById('ds-desde')?.value;
    const hasta = document.getElementById('ds-hasta')?.value;
    const [todosDespachos, filtrados] = await Promise.all([
      obtenerTodosLosDespachos({}),
      obtenerTodosLosDespachos({
        fechaDesde: desde ? desde+'T00:00:00' : null,
        fechaHasta: hasta ? hasta+'T23:59:59' : null,
      })
    ]);
    this._todosDespachos = todosDespachos;
    this._despachos = filtrados;
    this._renderDashboard();
    this._renderLista();
  },

  _renderDashboard() {
    const dash = document.getElementById('ds-dashboard');
    if (!dash) return;
    const todos = (this._todosDespachos || this._despachos).filter(d=>d.status!=='BORRADOR');
    const conts = {PICKEADO:0, DESPACHADO:0};
    todos.forEach(d => { const e=calcularEstadoVisual(d); if(conts[e]!==undefined) conts[e]++; });
    dash.innerHTML = [
      {l:'Listos para despachar', v:conts.PICKEADO,   c:'var(--success-text)'},
      {l:'Despachados',           v:conts.DESPACHADO,  c:'var(--text-tertiary)'},
      {l:'Total en período',      v:todos.length,      c:'var(--accent)'},
    ].map(s=>`
      <div class="stat-card">
        <div class="stat-value" style="color:${s.c}; font-size:24px;">${s.v}</div>
        <div class="stat-label">${s.l}</div>
      </div>
    `).join('');
  },

  _renderLista() {
    const cont    = document.getElementById('lista-ds');
    const fGR     = (document.getElementById('ds-f-gr')?.value||'').trim().toLowerCase();
    const fDest   = (document.getElementById('ds-f-destino')?.value||'').trim().toLowerCase();
    const fCliente= (document.getElementById('ds-f-cliente')?.value||'').toUpperCase();
    const fEstadoDS = document.getElementById('ds-f-estado')?.value||'';
    let lista = this._despachos.filter(d=>d.status!=='BORRADOR').map(d=>({...d,_est:calcularEstadoVisual(d)}));
    if (fEstadoDS) lista=lista.filter(d=>d._est===fEstadoDS);
    if (fGR)      lista=lista.filter(d=>(d.gr||'').toLowerCase().includes(fGR));
    if (fDest)    lista=lista.filter(d=>(d.destino||'').toLowerCase().includes(fDest)||(d.razon_social||'').toLowerCase().includes(fDest));
    if (fCliente) lista=lista.filter(d=>(d.cliente||'').toUpperCase()===fCliente);

    if (!lista.length) {
      cont.innerHTML=`<div class="empty-state"><div class="empty-icon">🚛</div><strong>Sin despachos en este período</strong></div>`;
      return;
    }

    cont.innerHTML=`
      <p style="font-size:11px;color:var(--text-tertiary);margin-bottom:6px;padding:0 2px;">${lista.length} despacho${lista.length!==1?'s':''} — toca para ver detalle</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${lista.map(d=>`
          <div class="ds-card" data-id="${d.id}">
            <div class="ds-card-head" onclick="DespachosSalidasView._toggleDetalle(${d.id})">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span style="font-family:monospace;font-weight:800;font-size:13px;">${escapeHtml(d.gr||'Sin GR')}</span>
                  ${pillEstado(d._est)}
                  <span style="font-size:11px;color:var(--text-tertiary);">${escapeHtml(d.cliente||'')}</span>
                </div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">
                  ${escapeHtml(d.destino||'')}${d.razon_social?` · ${escapeHtml(d.razon_social)}`:''}
                </div>
                <div style="font-size:10px;color:var(--text-tertiary);margin-top:1px;">
                  ${d.despachos_items?.length||0} ítem${(d.despachos_items?.length||0)!==1?'s':''}
                  ${d.fecha_despacho?` · ${formatFecha(d.fecha_despacho)}`:''}
                </div>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" class="ds-chevron" id="chev-${d.id}" style="flex-shrink:0;fill:none;stroke:var(--text-tertiary);stroke-width:2;stroke-linecap:round;"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="ds-card-detalle" id="det-${d.id}" style="display:none;">
              ${(d.despachos_items||[]).length ? `
                <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;">
                  <table style="width:100%;border-collapse:collapse;font-size:11px;">
                    <thead><tr style="color:var(--text-tertiary);font-size:10px;">
                      <th style="text-align:left;padding:3px 4px;">SKU</th>
                      <th style="text-align:left;padding:3px 4px;">Serie</th>
                      <th style="text-align:right;padding:3px 4px;">Cant.</th>
                    </tr></thead>
                    <tbody>
                      ${(d.despachos_items||[]).map(it=>`
                        <tr style="border-top:1px solid var(--border);">
                          <td style="padding:4px;font-family:monospace;font-size:10px;">${escapeHtml(it.sku||'-')}</td>
                          <td style="padding:4px;font-size:10px;color:var(--text-secondary);">${escapeHtml(it.serie||'-')}</td>
                          <td style="padding:4px;text-align:right;font-weight:700;">${formatNum(it.cantidad_despachada||it.cantidad||0)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '<p style="font-size:11px;color:var(--text-tertiary);padding:8px 0 0;">Sin ítems registrados.</p>'}
              <div style="margin-top:10px;display:flex;gap:6px;">
                ${d._est==='PICKEADO'
                  ? `<button class="btn-success" style="flex:1;padding:8px;" data-desp="${d.id}">✓ Confirmar salida</button>`
                  : `<button class="btn-ghost" style="padding:8px 12px;" data-ver-ds="${d.id}">Ver picking →</button>`
                }
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;

    cont.querySelectorAll('[data-desp]').forEach(b=>b.addEventListener('click',()=>this._confirmar(Number(b.dataset.desp))));
    cont.querySelectorAll('[data-ver-ds]').forEach(b=>b.addEventListener('click',()=>Router.navigate('picking-detalle',{despachoId:b.dataset.verDs})));
  },

  _toggleDetalle(id) {
    const det  = document.getElementById(`det-${id}`);
    const chev = document.getElementById(`chev-${id}`);
    if (!det) return;
    const abierto = det.style.display !== 'none';
    det.style.display  = abierto ? 'none' : '';
    if (chev) chev.style.transform = abierto ? '' : 'rotate(180deg)';
  },

  async _confirmar(id) {
    if (!confirm('¿Confirmar salida del almacén?')) return;
    await finalizarDespacho(id);
    await this._cargar();
  }
};
Router.register('despachos-salidas', DespachosSalidasView);
