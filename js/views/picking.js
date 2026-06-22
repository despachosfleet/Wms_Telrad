// ============================================================
// PICKING — Lista completa, modo guía física en celular
// El operario ve todos los ítems a la vez y pica en el orden
// que le convenga físicamente. Sin flujo forzado.
// FIXES: picking parcial, edición de serie/cantidad en celular,
// sin llamadas directas a sb.from()
// ============================================================

// ============================================================
// LISTA DE ÓRDENES
// ============================================================
const PickingListaView = {
  title: 'Órdenes de picking',
  _filtroEstado: 'PENDIENTE',
  _filtroFecha: 'TODAS',
  _despachos: [],

  render() {
    return `
      <div class="card">
        <div class="chips" id="chips-estado" style="margin-bottom:6px;"></div>
        <div class="chips" id="chips-fecha"></div>
      </div>
      <div id="lista-ordenes-cont"></div>
    `;
  },

  afterRender() {
    this._renderChips();
    this._cargar();
  },

  _renderChips() {
    const estados = ['TODOS','PENDIENTE','EN_PROCESO','PICKEADO','DESPACHADO'];
    const fechas  = ['TODAS','HOY','AYER'];
    document.getElementById('chips-estado').innerHTML = estados.map(e =>
      `<button class="chip ${this._filtroEstado === e ? 'active' : ''}" data-est="${e}">${e === 'TODOS' ? 'Todos' : e === 'EN_PROCESO' ? 'En proceso' : e.charAt(0) + e.slice(1).toLowerCase()}</button>`
    ).join('');
    document.getElementById('chips-fecha').innerHTML = fechas.map(f =>
      `<button class="chip ${this._filtroFecha === f ? 'active' : ''}" data-fec="${f}">${f === 'TODAS' ? 'Todas' : f.charAt(0) + f.slice(1).toLowerCase()}</button>`
    ).join('');

    document.querySelectorAll('[data-est]').forEach(b => b.addEventListener('click', () => {
      this._filtroEstado = b.dataset.est; this._renderChips(); this._renderLista();
    }));
    document.querySelectorAll('[data-fec]').forEach(b => b.addEventListener('click', () => {
      this._filtroFecha = b.dataset.fec; this._renderChips(); this._cargar();
    }));
  },

  async _cargar() {
    document.getElementById('lista-ordenes-cont').innerHTML = '<div class="empty-state">Cargando…</div>';
    let desde = null, hasta = null;
    const hoy = new Date();
    if (this._filtroFecha === 'HOY') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
      hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString();
    } else if (this._filtroFecha === 'AYER') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1).toISOString();
      hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    }
    this._despachos = await obtenerTodosLosDespachos({ fechaDesde: desde, fechaHasta: hasta });
    this._renderLista();
  },

  _renderLista() {
    const cont = document.getElementById('lista-ordenes-cont');
    let lista = this._despachos.map(d => ({ ...d, _est: calcularEstadoVisual(d) }));
    if (this._filtroEstado !== 'TODOS') lista = lista.filter(d => d._est === this._filtroEstado);

    if (!lista.length) {
      cont.innerHTML = `<div class="empty-state"><strong>Sin órdenes</strong>Cambia los filtros o crea una nueva orden.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th><th>Ítems</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${lista.map(d => `
              <tr>
                <td class="sku-cell">${escapeHtml(d.gr || 'Sin GR')}</td>
                <td>${escapeHtml(d.destino || '-')}</td>
                <td class="wrap">${escapeHtml(d.razon_social || '-')}</td>
                <td>${escapeHtml(d.cliente || '-')}</td>
                <td>${(d.despachos_items || []).length}</td>
                <td>${pillEstado(d._est)}</td>
                <td>
                  ${d._est !== 'DESPACHADO'
                    ? `<button class="btn-pickear" style="padding:6px 14px; font-size:12px;" data-pick="${d.id}">Pickear</button>`
                    : `<button class="btn-text" data-ver="${d.id}">Ver</button>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('[data-pick]').forEach(b =>
      b.addEventListener('click', () => Router.navigate('picking', { despachoId: b.dataset.pick }))
    );
    cont.querySelectorAll('[data-ver]').forEach(b =>
      b.addEventListener('click', () => Router.navigate('picking-detalle', { despachoId: b.dataset.ver }))
    );
  }
};

Router.register('picking-lista', PickingListaView);

// ============================================================
// PICKING EN MODO LISTA COMPLETA
// Todos los ítems visibles, el operario pica en cualquier orden
// ============================================================
const PickingView = {
  title: 'Picking',
  _despacho: null,
  _items: [],
  _expandido: null,

  render() {
    return `<div id="picking-wrap"></div>`;
  },

  async afterRender(params) {
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);
    if (!despacho) {
      document.getElementById('picking-wrap').innerHTML = '<div class="empty-state">No se pudo cargar la orden.</div>';
      return;
    }
    this._despacho = despacho;
    this._items = items;
    this._expandido = null;
    this._render();
  },

  _itemPickeado(it) {
    return it.observaciones && it.observaciones.startsWith('PICKEADO');
  },

  _render() {
    const wrap = document.getElementById('picking-wrap');
    if (!wrap) return;

    const total = this._items.length;
    const pickeados = this._items.filter(it => this._itemPickeado(it)).length;
    const pct = total > 0 ? Math.round((pickeados / total) * 100) : 0;
    const yaTerminado = this._despacho.status === 'PICKEADO' || this._despacho.status === 'DESPACHADO';

    // Separar: pendientes primero, pickeados al fondo
    const pendientes = this._items.filter(it => !this._itemPickeado(it));
    const completados = this._items.filter(it => this._itemPickeado(it));
    const ordenados = [...pendientes, ...completados];

    wrap.innerHTML = `
      <div class="orden-header">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
          <div>
            <span style="font-size:13px; font-weight:700; font-family:monospace;">${escapeHtml(this._despacho.gr || 'Sin GR')}</span>
            <span style="font-size:11px; color:var(--text-secondary); margin-left:8px;">${escapeHtml(this._despacho.destino || '')} ${this._despacho.razon_social ? '· ' + escapeHtml(this._despacho.razon_social) : ''}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; color:var(--text-secondary);"><strong style="color:var(--text);">${pickeados}/${total}</strong></span>
            ${!yaTerminado && pickeados > 0
              ? `<button class="btn-pickear" id="btn-terminar" style="padding:7px 14px; font-size:12px;">Terminar picking</button>`
              : ''}
          </div>
        </div>
        <div class="progress-bar" style="margin-top:8px;">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>

      <div id="items-list">
        ${ordenados.map((it, i) => this._renderItem(it, i)).join('')}
      </div>

      ${yaTerminado ? `
        <div class="alert alert-success" style="margin-top:12px;">
          ✓ Picking ${this._despacho.status === 'DESPACHADO' ? 'despachado' : 'terminado'}
          ${this._despacho.status === 'PICKEADO'
            ? `<button class="btn-success" style="margin-left:10px;" id="btn-despachar-final">Confirmar salida →</button>`
            : ''}
        </div>
      ` : ''}
    `;

    // Eventos
    document.getElementById('btn-terminar')?.addEventListener('click', () => this._terminar());
    document.getElementById('btn-despachar-final')?.addEventListener('click', () => this._finalizarDespacho());

    // Items: click para expandir
    document.querySelectorAll('[data-item-idx]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        const idx = Number(el.dataset.itemIdx);
        this._expandido = this._expandido === idx ? null : idx;
        this._render();
      });
    });
  },

  _renderItem(it, idx) {
    const pickeado = this._itemPickeado(it);
    const expandido = this._expandido === idx;
    const noEncontrado = !it.stock_id && !pickeado;

    let borderColor = 'var(--border)';
    if (pickeado) borderColor = 'var(--success)';
    else if (noEncontrado && it.observaciones) borderColor = 'var(--warning)';

    return `
      <div class="pick-item ${pickeado ? 'pickeado' : ''} ${expandido ? 'expandido' : ''}"
           data-item-idx="${idx}"
           style="border-left-color:${borderColor};">
        <div class="pick-item-header">
          <div style="flex:1; min-width:0;">
            <div class="pick-item-sku">${escapeHtml(it.sku || '-')}</div>
            <div class="pick-item-desc">${escapeHtml(it.descripcion || '')}</div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            ${pickeado
              ? `<span class="pill pill-success">✓ Pickeado</span>`
              : `<span style="font-size:12px; font-weight:700; color:var(--text);">${formatNum(it.cantidad)}</span>`}
          </div>
        </div>

        <div class="pick-item-meta">
          ${it.serie ? `<span class="pick-meta-tag">Serie: ${escapeHtml(it.serie)}</span>` : ''}
          ${it.paleta_pedido ? `<span class="pick-meta-tag">${escapeHtml(it.paleta_pedido)}</span>` : ''}
          ${it.ubicacion_fisica ? `<span class="pick-meta-tag">📍 ${escapeHtml(it.ubicacion_fisica)}</span>` : ''}
        </div>

        ${expandido ? this._renderConfirmPanel(it, idx) : ''}
      </div>
    `;
  },

  _renderConfirmPanel(it, idx) {
    const pickeado = this._itemPickeado(it);
    const cantOrig = it.cantidad;
    const serieOrig = it.serie || '';

    return `
      <div class="pick-confirm-panel" onclick="event.stopPropagation()">
        <div class="field-grid" style="margin-bottom:8px;">
          <div class="field">
            <label>Cantidad pickeada</label>
            <input type="number" id="pick-cant-${idx}" value="${cantOrig}" min="0" step="1"
              style="font-size:16px; font-weight:700; text-align:center;">
          </div>
          <div class="field">
            <label>Serie real</label>
            <input type="text" id="pick-serie-${idx}" value="${escapeHtml(serieOrig)}"
              style="font-family:monospace;">
          </div>
        </div>
        <div class="field" style="margin-bottom:10px;">
          <label>Observación (cambio SKU, faltante, etc.)</label>
          <input type="text" id="pick-obs-${idx}" placeholder="">
        </div>
        <div class="btn-row">
          ${!pickeado
            ? `<button class="btn-primary" id="pick-confirm-${idx}" style="flex:1;">✓ Confirmar ítem</button>`
            : `<button class="btn-secondary" id="pick-confirm-${idx}" style="flex:1;">↺ Corregir</button>`}
          <button class="btn-secondary" id="pick-skip-${idx}">No encontrado</button>
        </div>
        <div id="pick-msg-${idx}"></div>
      </div>
    `;
  },

  afterRenderPanel(idx) {
    const btnConfirm = document.getElementById(`pick-confirm-${idx}`);
    const btnSkip = document.getElementById(`pick-skip-${idx}`);
    if (btnConfirm) btnConfirm.addEventListener('click', e => { e.stopPropagation(); this._confirmarItem(idx); });
    if (btnSkip) btnSkip.addEventListener('click', e => { e.stopPropagation(); this._marcarNoEncontrado(idx); });
  },

  async _confirmarItem(idx) {
    const it = this._items[idx];
    const cant = Number(document.getElementById(`pick-cant-${idx}`)?.value);
    const serie = document.getElementById(`pick-serie-${idx}`)?.value.trim() || it.serie;
    const obs = document.getElementById(`pick-obs-${idx}`)?.value.trim() || '';
    const msgEl = document.getElementById(`pick-msg-${idx}`);

    if (!cant || cant <= 0) {
      if (msgEl) msgEl.innerHTML = '<p class="msg-error">Cantidad debe ser mayor a 0.</p>';
      return;
    }

    const btn = document.getElementById(`pick-confirm-${idx}`);
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    // Buscar stock si no tiene asignado
    let stockId = it.stock_id;
    if (!stockId) {
      const { data: stockOpts } = await buscarStockParaItem(it.sku, it.paleta_pedido, serie);
      if (stockOpts && stockOpts.length > 0) {
        stockId = stockOpts[0].id;
        await asignarStockAItem(it.id, stockId);
      }
    }

    if (!stockId) {
      // Sin stock: registrar de todos modos como observación
      const obsTexto = `PICKEADO: ${cant} | SIN STOCK EN SISTEMA${obs ? ' | ' + obs : ''}`;
      const { error } = await actualizarObservacionItem(it.id, obsTexto);
      if (!error) {
        this._items[idx].observaciones = obsTexto;
        this._expandido = null;
        this._render();
      }
      return;
    }

    const { error } = await confirmarPicking(it.id, stockId, cant, obs);
    if (error) {
      if (msgEl) msgEl.innerHTML = '<p class="msg-error">Error al confirmar. Intenta de nuevo.</p>';
      if (btn) { btn.disabled = false; btn.textContent = '✓ Confirmar ítem'; }
      return;
    }

    // Refrescar lista
    const { items } = await obtenerDespachoConItems(this._despacho.id);
    this._items = items;
    this._expandido = null;
    this._render();
  },

  async _marcarNoEncontrado(idx) {
    const it = this._items[idx];
    const obs = document.getElementById(`pick-obs-${idx}`)?.value.trim() || 'No encontrado';
    const obsNoEnc = `NO ENCONTRADO: ${obs}`;
    await actualizarObservacionItem(it.id, obsNoEnc);
    this._items[idx].observaciones = obsNoEnc;
    this._expandido = null;
    this._render();
  },

  async _terminar() {
    const btn = document.getElementById('btn-terminar');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    const { error } = await terminarPicking(this._despacho.id);
    if (error) {
      alert('Error al terminar el picking. Intenta de nuevo.');
      if (btn) { btn.disabled = false; btn.textContent = 'Terminar picking'; }
      return;
    }
    this._despacho.status = 'PICKEADO';
    this._render();
  },

  async _finalizarDespacho() {
    const btn = document.getElementById('btn-despachar-final');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando…'; }
    await finalizarDespacho(this._despacho.id);
    Router.navigate('picking-lista');
  }
};

Router.register('picking', PickingView);

// ============================================================
// DETALLE DE ORDEN (vista read-only)
// ============================================================
const PickingDetalleView = {
  title: 'Detalle de orden',
  render() { return `<div id="detalle-cont"></div>`; },
  async afterRender(params) {
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);
    const cont = document.getElementById('detalle-cont');
    if (!despacho) { cont.innerHTML = '<div class="empty-state">No encontrado.</div>'; return; }

    const estado = calcularEstadoVisual({ ...despacho, despachos_items: items });
    cont.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
          <div>
            <p class="card-title" style="margin:0; font-family:monospace;">${escapeHtml(despacho.gr || 'Sin GR')}</p>
            <p style="font-size:11px; color:var(--text-secondary); margin:4px 0 0;">
              ${escapeHtml(despacho.destino || '-')} · ${escapeHtml(despacho.razon_social || '-')} · ${escapeHtml(despacho.cliente || '-')}
            </p>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            ${pillEstado(estado)}
            ${estado !== 'DESPACHADO' ? `<button class="btn-pickear" style="padding:7px 14px; font-size:12px;" id="btn-ir-pick">Pickear</button>` : ''}
          </div>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Descripción</th><th>Cant.</th><th>Serie</th><th>Pedido/Paleta</th><th>Estado</th></tr></thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td class="sku-cell">${escapeHtml(it.sku || '-')}</td>
                <td class="wrap">${escapeHtml(it.descripcion || '-')}</td>
                <td>${formatNum(it.cantidad)}</td>
                <td style="font-family:monospace; font-size:11px;">${escapeHtml(it.serie || '-')}</td>
                <td>${escapeHtml(it.paleta_pedido || '-')}</td>
                <td>${it.observaciones?.startsWith('PICKEADO')
                  ? '<span class="pill pill-success">Pickeado</span>'
                  : it.observaciones?.startsWith('NO ENCONTRADO')
                  ? '<span class="pill pill-warning">No enc.</span>'
                  : '<span class="pill pill-neutral">Pendiente</span>'}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-state">Sin ítems</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('btn-ir-pick')?.addEventListener('click', () =>
      Router.navigate('picking', { despachoId: despacho.id })
    );
  }
};

Router.register('picking-detalle', PickingDetalleView);

// ============================================================
// DESPACHOS Y SALIDAS
// ============================================================
const DespachosSalidasView = {
  title: 'Despachos y salidas',
  _filtroEstado: 'PICKEADO',
  _despachos: [],

  render() {
    return `
      <div class="card"><div class="chips" id="chips-ds"></div></div>
      <div id="lista-ds"></div>
    `;
  },

  afterRender() {
    this._renderChips();
    this._cargar();
  },

  _renderChips() {
    const estados = ['TODOS','PENDIENTE','EN_PROCESO','PICKEADO','DESPACHADO'];
    document.getElementById('chips-ds').innerHTML = estados.map(e =>
      `<button class="chip ${this._filtroEstado === e ? 'active' : ''}" data-ds="${e}">${e === 'TODOS' ? 'Todos' : e === 'EN_PROCESO' ? 'En proceso' : e.charAt(0) + e.slice(1).toLowerCase()}</button>`
    ).join('');
    document.querySelectorAll('[data-ds]').forEach(b => b.addEventListener('click', () => {
      this._filtroEstado = b.dataset.ds; this._renderChips(); this._renderLista();
    }));
  },

  async _cargar() {
    document.getElementById('lista-ds').innerHTML = '<div class="empty-state">Cargando…</div>';
    this._despachos = await obtenerTodosLosDespachos({});
    this._renderLista();
  },

  _renderLista() {
    const cont = document.getElementById('lista-ds');
    let lista = this._despachos.map(d => ({ ...d, _est: calcularEstadoVisual(d) }));
    if (this._filtroEstado !== 'TODOS') lista = lista.filter(d => d._est === this._filtroEstado);

    if (!lista.length) {
      cont.innerHTML = `<div class="empty-state"><strong>Sin despachos</strong>Cambia el filtro.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${lista.map(d => `
              <tr>
                <td class="sku-cell">${escapeHtml(d.gr || '-')}</td>
                <td>${escapeHtml(d.destino || '-')}</td>
                <td class="wrap">${escapeHtml(d.razon_social || '-')}</td>
                <td>${escapeHtml(d.cliente || '-')}</td>
                <td>${pillEstado(d._est)}</td>
                <td>
                  ${d._est === 'PICKEADO'
                    ? `<button class="btn-success" style="padding:6px 12px; font-size:11px;" data-desp="${d.id}">Despachar →</button>`
                    : `<button class="btn-text" data-ver-ds="${d.id}">Ver</button>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('[data-desp]').forEach(b => b.addEventListener('click', () => this._confirmarDespacho(Number(b.dataset.desp))));
    cont.querySelectorAll('[data-ver-ds]').forEach(b => b.addEventListener('click', () => Router.navigate('picking-detalle', { despachoId: b.dataset.verDs })));
  },

  async _confirmarDespacho(id) {
    if (!confirm('¿Confirmar que este bulto ya salió físicamente del almacén?')) return;
    await finalizarDespacho(id);
    await this._cargar();
  }
};

Router.register('despachos-salidas', DespachosSalidasView);
