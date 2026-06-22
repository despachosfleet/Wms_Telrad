// ============================================================
// PICKING — Lista completa, modo guía física
// Items: vista cerrada limpia, se expande al tocar
// Asignación de stock con lógica ingreso nuevo > mudanza
// ============================================================

// ---- LISTA DE ÓRDENES ----
const PickingListaView = {
  title: 'Órdenes de picking',
  _filtroEstado: 'PENDIENTE',
  _filtroFecha: 'TODAS',
  _despachos: [],

  render() {
    return `
      <div class="card">
        <div class="chips" id="chips-estado-pick" style="margin-bottom:6px;"></div>
        <div class="chips" id="chips-fecha-pick"></div>
      </div>
      <div id="lista-pick-cont"></div>
    `;
  },

  afterRender() { this._renderChips(); this._cargar(); },

  _renderChips() {
    const estados = [
      {v:'TODOS',l:'Todos'},{v:'PENDIENTE',l:'Pendiente'},
      {v:'EN_PROCESO',l:'En proceso'},{v:'PICKEADO',l:'Pickeado'},{v:'DESPACHADO',l:'Despachado'}
    ];
    const fechas = [{v:'TODAS',l:'Todas'},{v:'HOY',l:'Hoy'},{v:'AYER',l:'Ayer'}];

    document.getElementById('chips-estado-pick').innerHTML = estados.map(e =>
      `<button class="chip ${this._filtroEstado===e.v?'active':''}" data-est="${e.v}">${e.l}</button>`
    ).join('');
    document.getElementById('chips-fecha-pick').innerHTML = fechas.map(f =>
      `<button class="chip ${this._filtroFecha===f.v?'active':''}" data-fec="${f.v}">${f.l}</button>`
    ).join('');
    document.querySelectorAll('[data-est]').forEach(b => b.addEventListener('click', () => {
      this._filtroEstado = b.dataset.est; this._renderChips(); this._renderLista();
    }));
    document.querySelectorAll('[data-fec]').forEach(b => b.addEventListener('click', () => {
      this._filtroFecha = b.dataset.fec; this._renderChips(); this._cargar();
    }));
  },

  async _cargar() {
    document.getElementById('lista-pick-cont').innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';
    const hoy = new Date();
    let desde = null, hasta = null;
    if (this._filtroFecha === 'HOY') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
      hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()+1).toISOString();
    } else if (this._filtroFecha === 'AYER') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()-1).toISOString();
      hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    }
    this._despachos = await obtenerTodosLosDespachos({ fechaDesde: desde, fechaHasta: hasta });
    this._renderLista();
  },

  _renderLista() {
    const cont = document.getElementById('lista-pick-cont');
    let lista = this._despachos
      .filter(d => d.status !== 'BORRADOR')
      .map(d => ({ ...d, _est: calcularEstadoVisual(d) }));
    if (this._filtroEstado !== 'TODOS') lista = lista.filter(d => d._est === this._filtroEstado);
    if (!lista.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><strong>Sin órdenes</strong>Cambia los filtros.</div>`;
      return;
    }
    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th><th>Items</th><th>Progreso</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${lista.map(d => {
              const items = d.despachos_items || [];
              const pick = items.filter(it => it.observaciones?.startsWith('PICKEADO')).length;
              const pct  = items.length > 0 ? Math.round(pick/items.length*100) : 0;
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
                <td>
                  ${d._est!=='DESPACHADO'
                    ? `<button class="btn-primary" style="padding:5px 12px; font-size:11px;" data-pick="${d.id}">Pickear</button>`
                    : `<button class="btn-ghost" data-ver="${d.id}">Ver</button>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    cont.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => Router.navigate('picking', {despachoId: b.dataset.pick})));
    cont.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => Router.navigate('picking-detalle', {despachoId: b.dataset.ver})));
  }
};
Router.register('picking-lista', PickingListaView);

// ---- PICKING EN LISTA COMPLETA ----
const PickingView = {
  title: 'Picking',
  _despacho: null,
  _items: [],
  _expandido: null,
  _stockOpciones: {},   // itemId -> { principal, alternativas }
  _cargandoStock: {},   // itemId -> bool

  render() { return `<div id="picking-wrap"></div>`; },

  async afterRender(params) {
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);
    if (!despacho) {
      document.getElementById('picking-wrap').innerHTML = '<div class="empty-state">No se pudo cargar la orden.</div>';
      return;
    }
    this._despacho = despacho;
    this._items = items;
    this._expandido = null;
    this._stockOpciones = {};
    this._cargandoStock = {};
    this._render();
  },

  _pickeado(it)     { return it.observaciones?.startsWith('PICKEADO'); },
  _cantPickeada(it) {
    const m = it.observaciones?.match(/PICKEADO:\s*([\d.]+)/);
    return m ? Number(m[1]) : it.cantidad;
  },
  _serieValida(s)   { return s && !s.startsWith('-') && s.trim() !== '' && s.trim() !== '-'; },

  _render() {
    const wrap = document.getElementById('picking-wrap');
    if (!wrap) return;
    const total     = this._items.length;
    const pickeados = this._items.filter(it => this._pickeado(it)).length;
    const pct       = total > 0 ? Math.round(pickeados/total*100) : 0;
    const terminado = this._despacho.status === 'PICKEADO' || this._despacho.status === 'DESPACHADO';

    const pendientes  = this._items.filter(it => !this._pickeado(it));
    const completados = this._items.filter(it =>  this._pickeado(it));

    wrap.innerHTML = `
      <div class="orden-header-sticky">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
          <div style="min-width:0;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:3px;">
              <span style="font-family:monospace; font-size:15px; font-weight:800;">${escapeHtml(this._despacho.gr||'Sin GR')}</span>
              ${pillEstado(calcularEstadoVisual(this._despacho))}
            </div>
            <div style="font-size:11px; color:var(--text-secondary); line-height:1.5;">
              <span style="font-weight:600; color:var(--text);">Destino:</span> ${escapeHtml(this._despacho.destino||'-')}
              ${this._despacho.razon_social ? ` &nbsp;|&nbsp; <span style="font-weight:600; color:var(--text);">Destinatario:</span> ${escapeHtml(this._despacho.razon_social)}` : ''}
              ${this._despacho.cliente ? ` &nbsp;|&nbsp; <span style="font-weight:600; color:var(--text);">Cliente:</span> ${escapeHtml(this._despacho.cliente)}` : ''}
              ${this._despacho.contrata ? `<br><span style="font-weight:600; color:var(--text);">Contrata:</span> ${escapeHtml(this._despacho.contrata)}` : ''}
            </div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-size:20px; font-weight:800; color:var(--accent); line-height:1;">${pickeados}<span style="font-size:12px; color:var(--text-tertiary);">/${total}</span></div>
            <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">pickeados</div>
            ${!terminado && pickeados > 0 ? `<button class="btn-primary" id="btn-terminar-pick" style="margin-top:6px; padding:6px 12px; font-size:11px;">Terminar picking</button>` : ''}
          </div>
        </div>
        <div class="progress-bar" style="margin-top:8px;">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>

      <div id="items-list">
        ${pendientes.length ? `<p class="section-label">Por pickear (${pendientes.length})</p>` : ''}
        ${pendientes.map(it => this._renderItem(it, this._items.indexOf(it))).join('')}
        ${completados.length ? `<p class="section-label" style="color:var(--success-text);">Pickeados (${completados.length})</p>` : ''}
        ${completados.map(it => this._renderItem(it, this._items.indexOf(it))).join('')}
      </div>

      ${terminado ? `
        <div class="alert alert-success" style="margin-top:12px;">
          ${this._despacho.status==='DESPACHADO' ? '✓ Ya despachado.' : '✓ Picking terminado.'}
          ${this._despacho.status==='PICKEADO' ? `<button class="btn-success" id="btn-despachar-final" style="margin-left:10px;">Confirmar salida</button>` : ''}
        </div>
      ` : ''}
    `;

    document.getElementById('btn-terminar-pick')?.addEventListener('click', () => this._terminar());
    document.getElementById('btn-despachar-final')?.addEventListener('click', () => this._finalizar());
    if (this._expandido !== null) this._bindItemPanel(this._expandido);

    document.querySelectorAll('[data-item-idx]').forEach(el => {
      el.addEventListener('click', e => {
        if (['INPUT','SELECT','BUTTON'].includes(e.target.tagName)) return;
        const idx = Number(el.dataset.itemIdx);
        if (this._expandido === idx) { this._expandido = null; this._render(); return; }
        this._expandido = idx;
        this._render();
        setTimeout(() => el.scrollIntoView({behavior:'smooth', block:'nearest'}), 60);
        // Cargar opciones de stock si no las tiene aún
        const it = this._items[idx];
        if (!this._stockOpciones[it.id] && !this._cargandoStock[it.id]) {
          this._cargarOpcionesStock(it, idx);
        }
      });
    });
  },

  _renderItem(it, idx) {
    const pic  = this._pickeado(it);
    const exp  = this._expandido === idx;
    const serie = this._serieValida(it.serie) ? it.serie : null;

    let borderColor = pic ? 'var(--success)' : exp ? 'var(--accent)' : 'var(--border)';

    return `
      <div class="pick-item ${pic?'pickeado':''} ${exp?'expandido':''}"
           data-item-idx="${idx}"
           style="border-left-color:${borderColor};">

        <!-- VISTA CERRADA -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div style="flex:1; min-width:0;">
            <div class="pick-item-sku">${escapeHtml(it.sku||'-')}</div>
            <div class="pick-item-desc">${escapeHtml(it.descripcion||'')}</div>
          </div>
          <div style="flex-shrink:0; text-align:right;">
            ${pic
              ? `<div class="pick-qty-done">✓ ${formatNum(this._cantPickeada(it))}</div>`
              : `<div class="pick-qty-badge"><span style="font-size:9px; display:block; font-weight:600; color:var(--accent-text); margin-bottom:1px;">CANT.</span>${formatNum(it.cantidad)}</div>`}
          </div>
        </div>

        <!-- TAGS: serie siempre visible, pedido siempre visible -->
        <div class="pick-item-tags">
          ${serie
            ? `<span class="pick-tag serie-tag"><span class="pt-label">Serie:</span><span class="pt-val">${escapeHtml(serie)}</span></span>`
            : `<span class="pick-tag"><span class="pt-label">Serie:</span><span class="pt-val" style="color:var(--text-tertiary);">Sin serie</span></span>`}
          ${it.paleta_pedido
            ? `<span class="pick-tag"><span class="pt-label">Pedido/Paleta:</span><span class="pt-val">${escapeHtml(it.paleta_pedido)}</span></span>`
            : ''}
          ${it.ubicacion_fisica
            ? `<span class="pick-tag"><span class="pt-label">Ubic.:</span><span class="pt-val">${escapeHtml(it.ubicacion_fisica)}</span></span>`
            : ''}
          ${!pic && !exp ? `<span class="pick-tap-hint">Toca para confirmar</span>` : ''}
        </div>

        <!-- PANEL DE CONFIRMACIÓN (expandido) -->
        ${exp ? this._renderPanel(it, idx) : ''}
      </div>
    `;
  },

  _renderPanel(it, idx) {
    const serie  = this._serieValida(it.serie) ? it.serie : '';
    const opc    = this._stockOpciones[it.id];
    const carg   = this._cargandoStock[it.id];
    const pic    = this._pickeado(it);

    return `
      <div class="pick-confirm-panel" onclick="event.stopPropagation()">

        <!-- FUENTE DE STOCK -->
        <div id="stock-source-${idx}">
          ${carg ? `<div style="font-size:11px; color:var(--text-tertiary); padding:6px 0;">Buscando en stock…</div>` : ''}
          ${!carg && !opc ? `<div style="font-size:11px; color:var(--text-tertiary); padding:6px 0;">Toca el ítem nuevamente para ver stock disponible.</div>` : ''}
          ${opc ? this._renderStockOpciones(opc, idx) : ''}
        </div>

        <!-- CAMPOS DE CONFIRMACIÓN -->
        <div class="field-grid" style="margin-top:10px;">
          <div class="field">
            <label>Cant. solicitada</label>
            <input type="text" value="${formatNum(it.cantidad)}" disabled style="background:var(--bg-row-alt); font-weight:700; color:var(--text-tertiary);">
          </div>
          <div class="field">
            <label>Cant. a confirmar</label>
            <input type="number" id="pick-cant-${idx}" value="${pic ? this._cantPickeada(it) : it.cantidad}"
              min="0" step="1" style="font-size:16px; font-weight:800; text-align:center; color:var(--accent);">
          </div>
        </div>
        <div class="field">
          <label>Serie real</label>
          <input type="text" id="pick-serie-${idx}" value="${escapeHtml(serie)}"
            placeholder="Sin serie" style="font-family:monospace;">
        </div>
        <div class="field">
          <label>Pedido / Paleta</label>
          <input type="text" id="pick-pp-${idx}" value="${escapeHtml(it.paleta_pedido||'')}">
        </div>
        <div class="field">
          <label>Observación</label>
          <input type="text" id="pick-obs-${idx}" placeholder="Incidencia, cambio de SKU, etc.">
        </div>
        <div class="btn-row">
          <button class="btn-primary" id="pick-btn-${idx}" style="flex:1;">
            ${pic ? 'Corregir cantidad' : 'Confirmar ítem'}
          </button>
          <button class="btn-ghost" id="pick-cancel-${idx}">Cerrar</button>
        </div>
        <div id="pick-msg-${idx}"></div>
      </div>
    `;
  },

  _renderStockOpciones(opc, idx) {
    let html = '';
    if (opc.principal) {
      const p = opc.principal;
      const esIngreso = p.origen === 'INGRESO_NUEVO';
      html += `
        <div class="stock-source-box ${esIngreso ? 'ingreso' : 'mudanza'}">
          <div class="stock-source-title">
            ${esIngreso ? '✓ Ingreso nuevo — pickear de aquí' : 'Mudanza — fuente de stock'}
          </div>
          <div class="stock-source-detail">
            ${p.stock.paleta_pedido ? `<strong>Paleta/Pedido:</strong> ${escapeHtml(p.stock.paleta_pedido)} &nbsp;` : ''}
            ${p.stock.ubicacion_fisica ? `<strong>Ubic.:</strong> ${escapeHtml(p.stock.ubicacion_fisica)} &nbsp;` : ''}
            <strong>Disponible:</strong> ${formatNum(p.stock.cantidad)}
            ${p.stock.serie ? ` &nbsp;<strong>Serie:</strong> <span style="font-family:monospace;">${escapeHtml(p.stock.serie)}</span>` : ''}
          </div>
          <input type="hidden" id="pick-stock-id-${idx}" value="${p.stock.id}">
        </div>
      `;
    }

    if (opc.alternativas && opc.alternativas.length > 0) {
      html += `
        <div class="stock-source-alt">
          <div class="stock-source-alt-title">${opc.principal ? 'También disponible en:' : 'Disponible en:'}</div>
          ${opc.alternativas.map((alt, ai) => `
            <div class="stock-alt-option">
              <div style="font-size:11px;">
                <span class="pill ${alt.origen==='MUDANZA'?'pill-mudanza':'pill-neutral'}" style="margin-right:4px;">${alt.origen==='MUDANZA'?'Mudanza':'Stock'}</span>
                ${escapeHtml(alt.stock.paleta_pedido||'-')}
                ${alt.stock.ubicacion_fisica ? ` · ${escapeHtml(alt.stock.ubicacion_fisica)}` : ''}
                · Cant: ${formatNum(alt.stock.cantidad)}
              </div>
              <button class="btn-ghost" style="font-size:10px; padding:3px 8px;"
                data-usar-alt="${idx}" data-alt-stock="${alt.stock.id}" data-alt-pp="${escapeHtml(alt.stock.paleta_pedido||'')}">
                Usar este
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (!opc.principal && (!opc.alternativas || !opc.alternativas.length)) {
      html += `
        <div class="stock-source-box sin-stock">
          <div class="stock-source-title">Sin stock en sistema</div>
          <div class="stock-source-detail">No se encontró este ítem disponible. Se registrará con observación.</div>
        </div>
      `;
    }

    return html;
  },

  async _cargarOpcionesStock(it, idx) {
    this._cargandoStock[it.id] = true;
    const sourceDiv = document.getElementById(`stock-source-${idx}`);
    if (sourceDiv) sourceDiv.innerHTML = '<div style="font-size:11px; color:var(--text-tertiary); padding:6px 0;">Buscando en stock…</div>';

    const serie = this._serieValida(it.serie) ? it.serie : null;
    const { data: opciones, origen } = await buscarStockParaItem(it.sku, it.paleta_pedido, serie);

    this._cargandoStock[it.id] = false;

    if (!opciones || !opciones.length) {
      this._stockOpciones[it.id] = { principal: null, alternativas: [] };
    } else if (origen === 'INGRESO_NUEVO') {
      // Principal = primer resultado de ingreso nuevo
      const principal = { stock: opciones[0], origen: 'INGRESO_NUEVO' };
      // Buscar también en mudanza como alternativa
      const { data: mudanza } = await buscarStockAvanzado({ sku: it.sku, estado: 'DISPONIBLE', limit: 10 });
      const alts = (mudanza || [])
        .filter(s => s.id !== opciones[0].id && s.paleta_pedido?.startsWith('PALETA'))
        .map(s => ({ stock: s, origen: 'MUDANZA' }));
      this._stockOpciones[it.id] = { principal, alternativas: alts };
    } else {
      // Mudanza o búsqueda general: primero buscar si hay ingreso nuevo también
      const { data: ingNuevo } = await buscarStockAvanzado({ sku: it.sku, paleta: it.paleta_pedido || '', estado: 'DISPONIBLE', limit: 5 });
      const ingFiltrado = (ingNuevo || []).filter(s => !s.paleta_pedido?.startsWith('PALETA'));
      if (ingFiltrado.length) {
        const principal = { stock: ingFiltrado[0], origen: 'INGRESO_NUEVO' };
        const alts = opciones.slice(0, 3).map(s => ({ stock: s, origen: 'MUDANZA' }));
        this._stockOpciones[it.id] = { principal, alternativas: alts };
      } else {
        const principal = { stock: opciones[0], origen: 'MUDANZA' };
        const alts = opciones.slice(1, 4).map(s => ({ stock: s, origen: 'MUDANZA' }));
        this._stockOpciones[it.id] = { principal, alternativas: alts };
      }
    }

    // Re-renderizar solo el panel del ítem expandido
    if (this._expandido === idx) {
      const sourceDiv2 = document.getElementById(`stock-source-${idx}`);
      if (sourceDiv2) {
        sourceDiv2.innerHTML = this._renderStockOpciones(this._stockOpciones[it.id], idx);
        this._bindAltButtons(idx);
      }
    }
  },

  _bindItemPanel(idx) {
    const it = this._items[idx];
    document.getElementById(`pick-btn-${idx}`)?.addEventListener('click', e => { e.stopPropagation(); this._confirmar(idx); });
    document.getElementById(`pick-cancel-${idx}`)?.addEventListener('click', e => { e.stopPropagation(); this._expandido = null; this._render(); });
    this._bindAltButtons(idx);
  },

  _bindAltButtons(idx) {
    document.querySelectorAll(`[data-usar-alt="${idx}"]`).forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const stockId = btn.dataset.altStock;
        const pp      = btn.dataset.altPp;
        // Actualizar el campo oculto y el pedido/paleta
        const hiddenInput = document.getElementById(`pick-stock-id-${idx}`);
        if (hiddenInput) hiddenInput.value = stockId;
        const ppInput = document.getElementById(`pick-pp-${idx}`);
        if (ppInput) ppInput.value = pp;
        // Resaltar que se eligió una alternativa
        btn.textContent = '✓ Elegido';
        btn.classList.add('btn-success');
        btn.disabled = true;
      });
    });
  },

  async _confirmar(idx) {
    const it    = this._items[idx];
    const cant  = Number(document.getElementById(`pick-cant-${idx}`)?.value);
    const serie = document.getElementById(`pick-serie-${idx}`)?.value.trim() || null;
    const pp    = document.getElementById(`pick-pp-${idx}`)?.value.trim() || it.paleta_pedido;
    const obs   = document.getElementById(`pick-obs-${idx}`)?.value.trim() || '';
    const msgEl = document.getElementById(`pick-msg-${idx}`);
    const btn   = document.getElementById(`pick-btn-${idx}`);

    if (cant < 0) { if (msgEl) msgEl.innerHTML = '<p class="msg-error">Cantidad inválida.</p>'; return; }

    btn.disabled = true; btn.textContent = 'Guardando…';

    // Actualizar pedido/paleta si cambió
    if (pp && pp !== it.paleta_pedido) await actualizarPaletaPedidoItem(it.id, pp);

    // Obtener stock_id: primero del campo oculto (si eligió uno), si no del principal de opciones
    let stockId = document.getElementById(`pick-stock-id-${idx}`)?.value || null;
    if (!stockId) {
      const opc = this._stockOpciones[it.id];
      if (opc?.principal) stockId = String(opc.principal.stock.id);
    }
    if (!stockId && it.stock_id) stockId = String(it.stock_id);

    if (!stockId) {
      // Intentar buscar una última vez
      const { data: opts } = await buscarStockParaItem(it.sku, pp || it.paleta_pedido, serie);
      if (opts?.length) { stockId = String(opts[0].id); await asignarStockAItem(it.id, Number(stockId)); }
    }

    let obsTexto;
    if (!stockId || cant === 0) {
      obsTexto = `PICKEADO: ${cant} | SIN STOCK EN SISTEMA${obs ? ' | ' + obs : ''}`;
      await actualizarObservacionItem(it.id, obsTexto);
    } else {
      const { error } = await confirmarPicking(it.id, Number(stockId), cant, obs);
      if (error) {
        if (msgEl) msgEl.innerHTML = '<p class="msg-error">Error al confirmar. Intenta de nuevo.</p>';
        btn.disabled = false; btn.textContent = 'Confirmar ítem';
        return;
      }
      obsTexto = `PICKEADO: ${cant}${obs ? ' | ' + obs : ''}`;
    }

    const { items } = await obtenerDespachoConItems(this._despacho.id);
    this._items = items;
    this._expandido = null;
    this._render();
  },

  async _terminar() {
    const btn = document.getElementById('btn-terminar-pick');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    const { error } = await terminarPicking(this._despacho.id);
    if (error) { alert('Error al terminar.'); if (btn) { btn.disabled = false; btn.textContent = 'Terminar picking'; } return; }
    const { despacho, items } = await obtenerDespachoConItems(this._despacho.id);
    this._despacho = despacho; this._items = items; this._render();
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
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);
    const cont = document.getElementById('det-cont');
    if (!despacho) { cont.innerHTML = '<div class="empty-state">No encontrado.</div>'; return; }
    const est = calcularEstadoVisual({...despacho, despachos_items:items});
    cont.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
          <div>
            <p style="font-family:monospace; font-size:15px; font-weight:800; margin:0;">${escapeHtml(despacho.gr||'Sin GR')}</p>
            <p style="font-size:11px; color:var(--text-secondary); margin:4px 0 0;">
              ${escapeHtml(despacho.destino||'-')} · ${escapeHtml(despacho.razon_social||'-')} · ${escapeHtml(despacho.cliente||'-')}
            </p>
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
            ${items.map(it => `
              <tr>
                <td class="sku-cell">${escapeHtml(it.sku||'-')}</td>
                <td class="desc-cell">${escapeHtml(it.descripcion||'-')}</td>
                <td style="font-weight:700;">${formatNum(it.cantidad)}</td>
                <td class="serie-cell">${escapeHtml(it.serie||'-')}</td>
                <td>${escapeHtml(it.paleta_pedido||'-')}</td>
                <td>${it.observaciones?.startsWith('PICKEADO')
                  ? '<span class="pill pill-success">Pickeado</span>'
                  : '<span class="pill pill-neutral">Pendiente</span>'}</td>
              </tr>`).join('')||'<tr><td colspan="6" class="empty-state">Sin ítems</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('btn-ir-pick')?.addEventListener('click', () => Router.navigate('picking', {despachoId: despacho.id}));
  }
};
Router.register('picking-detalle', PickingDetalleView);

// ---- DESPACHOS Y SALIDAS ----
const DespachosSalidasView = {
  title: 'Despachos y salidas',
  _filtroEstado: 'PICKEADO',
  _despachos: [],
  render() {
    return `<div class="card"><div class="chips" id="chips-ds"></div></div><div id="lista-ds"></div>`;
  },
  afterRender() { this._renderChips(); this._cargar(); },
  _renderChips() {
    const estados = [{v:'TODOS',l:'Todos'},{v:'PICKEADO',l:'Pickeado'},{v:'DESPACHADO',l:'Despachado'}];
    document.getElementById('chips-ds').innerHTML = estados.map(e =>
      `<button class="chip ${this._filtroEstado===e.v?'active':''}" data-ds="${e.v}">${e.l}</button>`
    ).join('');
    document.querySelectorAll('[data-ds]').forEach(b => b.addEventListener('click', () => {
      this._filtroEstado=b.dataset.ds; this._renderChips(); this._renderLista();
    }));
  },
  async _cargar() {
    document.getElementById('lista-ds').innerHTML = '<div class="empty-state">Cargando…</div>';
    this._despachos = await obtenerTodosLosDespachos({});
    this._renderLista();
  },
  _renderLista() {
    const cont = document.getElementById('lista-ds');
    let lista = this._despachos.filter(d => d.status!=='BORRADOR').map(d => ({...d, _est:calcularEstadoVisual(d)}));
    if (this._filtroEstado!=='TODOS') lista = lista.filter(d => d._est===this._filtroEstado);
    if (!lista.length) { cont.innerHTML = `<div class="empty-state"><div class="empty-icon">🚛</div><strong>Sin despachos</strong></div>`; return; }
    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${lista.map(d => `<tr>
              <td class="sku-cell">${escapeHtml(d.gr||'-')}</td>
              <td>${escapeHtml(d.destino||'-')}</td>
              <td style="font-size:11px;">${escapeHtml(d.razon_social||'-')}</td>
              <td>${escapeHtml(d.cliente||'-')}</td>
              <td>${pillEstado(d._est)}</td>
              <td>${d._est==='PICKEADO'
                ? `<button class="btn-success" style="padding:5px 10px; font-size:11px;" data-desp="${d.id}">Despachar</button>`
                : `<button class="btn-ghost" data-ver-ds="${d.id}">Ver</button>`}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    cont.querySelectorAll('[data-desp]').forEach(b => b.addEventListener('click', () => this._confirmar(Number(b.dataset.desp))));
    cont.querySelectorAll('[data-ver-ds]').forEach(b => b.addEventListener('click', () => Router.navigate('picking-detalle', {despachoId: b.dataset.verDs})));
  },
  async _confirmar(id) {
    if (!confirm('¿Confirmar que este bulto ya salió del almacén?')) return;
    await finalizarDespacho(id); await this._cargar();
  }
};
Router.register('despachos-salidas', DespachosSalidasView);
