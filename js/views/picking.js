// ============================================================
// PICKING — Lista completa tipo guía física
// Solo aparecen órdenes en estado PENDIENTE (validadas)
// El header con datos de la guía queda siempre visible (sticky)
// Picking parcial siempre permitido
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

  afterRender() { this._renderChips(); this._cargar(); },

  _renderChips() {
    const estados = [
      { v: 'TODOS', l: 'Todos' },
      { v: 'PENDIENTE', l: 'Pendiente' },
      { v: 'EN_PROCESO', l: 'En proceso' },
      { v: 'PICKEADO', l: 'Pickeado' },
      { v: 'DESPACHADO', l: 'Despachado' },
    ];
    const fechas = [{ v: 'TODAS', l: 'Todas' }, { v: 'HOY', l: 'Hoy' }, { v: 'AYER', l: 'Ayer' }];
    document.getElementById('chips-estado').innerHTML = estados.map(e =>
      `<button class="chip ${this._filtroEstado === e.v ? 'active' : ''}" data-est="${e.v}">${e.l}</button>`
    ).join('');
    document.getElementById('chips-fecha').innerHTML = fechas.map(f =>
      `<button class="chip ${this._filtroFecha === f.v ? 'active' : ''}" data-fec="${f.v}">${f.l}</button>`
    ).join('');
    document.querySelectorAll('[data-est]').forEach(b => b.addEventListener('click', () => {
      this._filtroEstado = b.dataset.est; this._renderChips(); this._renderLista();
    }));
    document.querySelectorAll('[data-fec]').forEach(b => b.addEventListener('click', () => {
      this._filtroFecha = b.dataset.fec; this._renderChips(); this._cargar();
    }));
  },

  async _cargar() {
    document.getElementById('lista-ordenes-cont').innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';
    const hoy = new Date();
    let desde = null, hasta = null;
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
    let lista = this._despachos
      .filter(d => d.status !== 'BORRADOR') // Borradores solo en validar-ordenes
      .map(d => ({ ...d, _est: calcularEstadoVisual(d) }));

    if (this._filtroEstado !== 'TODOS') lista = lista.filter(d => d._est === this._filtroEstado);

    if (!lista.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><strong>Sin órdenes</strong>Cambia los filtros o crea una nueva orden.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th>
            <th>Ítems</th><th>Progreso</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            ${lista.map(d => {
              const items = d.despachos_items || [];
              const pickeados = items.filter(it => it.observaciones?.startsWith('PICKEADO')).length;
              const pct = items.length > 0 ? Math.round(pickeados / items.length * 100) : 0;
              return `
                <tr>
                  <td class="sku-cell">${escapeHtml(d.gr || 'Sin GR')}</td>
                  <td>${escapeHtml(d.destino || '-')}</td>
                  <td class="wrap">${escapeHtml(d.razon_social || '-')}</td>
                  <td>${escapeHtml(d.cliente || '-')}</td>
                  <td>${items.length}</td>
                  <td style="min-width:90px;">
                    <div style="font-size:10px; color:var(--text-tertiary); margin-bottom:3px;">${pickeados}/${items.length}</div>
                    <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
                  </td>
                  <td>${pillEstado(d._est)}</td>
                  <td>
                    ${d._est !== 'DESPACHADO'
                      ? `<button class="btn-primary" style="padding:6px 14px; font-size:11px;" data-pick="${d.id}">Pickear →</button>`
                      : `<button class="btn-ghost" data-ver="${d.id}">Ver</button>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    cont.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => Router.navigate('picking', { despachoId: b.dataset.pick })));
    cont.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => Router.navigate('picking-detalle', { despachoId: b.dataset.ver })));
  }
};

Router.register('picking-lista', PickingListaView);

// ============================================================
// PICKING EN MODO LISTA COMPLETA
// ============================================================
const PickingView = {
  title: 'Picking',
  _despacho: null,
  _items: [],
  _expandido: null,

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
    this._render();
  },

  _pickeado(it) { return it.observaciones?.startsWith('PICKEADO'); },
  _noEncontrado(it) { return it.observaciones?.startsWith('NO ENCONTRADO'); },

  _render() {
    const wrap = document.getElementById('picking-wrap');
    if (!wrap) return;

    const total = this._items.length;
    const pickeados = this._items.filter(it => this._pickeado(it)).length;
    const pct = total > 0 ? Math.round(pickeados / total * 100) : 0;
    const terminado = this._despacho.status === 'PICKEADO' || this._despacho.status === 'DESPACHADO';

    // Pendientes primero, pickeados al fondo
    const pendientes  = this._items.filter(it => !this._pickeado(it) && !this._noEncontrado(it));
    const noEnc       = this._items.filter(it => this._noEncontrado(it));
    const completados = this._items.filter(it => this._pickeado(it));
    const ordenados   = [...pendientes, ...noEnc, ...completados];

    wrap.innerHTML = `
      <!-- HEADER STICKY: siempre visible mientras scrolleas -->
      <div class="orden-header-sticky">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="min-width:0;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-family:monospace; font-size:14px; font-weight:800; color:var(--text);">${escapeHtml(this._despacho.gr || 'Sin GR')}</span>
              ${pillEstado(calcularEstadoVisual(this._despacho))}
            </div>
            <div style="font-size:11px; color:var(--text-secondary); margin-top:3px;">
              📍 ${escapeHtml(this._despacho.destino || '-')}
              ${this._despacho.razon_social ? ' · ' + escapeHtml(this._despacho.razon_social) : ''}
              ${this._despacho.cliente ? ' · ' + escapeHtml(this._despacho.cliente) : ''}
              ${this._despacho.contrata ? ' · Contrata: ' + escapeHtml(this._despacho.contrata) : ''}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
            <div style="text-align:center;">
              <div style="font-size:18px; font-weight:800; color:var(--accent);">${pickeados}<span style="font-size:12px; color:var(--text-tertiary);">/${total}</span></div>
              <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:.5px;">pickeados</div>
            </div>
            ${!terminado && pickeados > 0
              ? `<button class="btn-primary" id="btn-terminar-pick">Terminar picking</button>`
              : ''}
          </div>
        </div>
        <div class="progress-bar" style="margin-top:8px; height:6px;">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>

      <!-- LISTA DE ÍTEMS -->
      <div id="items-list">
        ${pendientes.length > 0 ? `<p class="section-label">Por pickear (${pendientes.length})</p>` : ''}
        ${pendientes.map((it, i) => this._renderItem(it, this._items.indexOf(it))).join('')}

        ${noEnc.length > 0 ? `<p class="section-label" style="color:var(--warning-text);">No encontrados (${noEnc.length})</p>` : ''}
        ${noEnc.map(it => this._renderItem(it, this._items.indexOf(it))).join('')}

        ${completados.length > 0 ? `<p class="section-label" style="color:var(--success-text);">Pickeados ✓ (${completados.length})</p>` : ''}
        ${completados.map(it => this._renderItem(it, this._items.indexOf(it))).join('')}
      </div>

      ${terminado ? `
        <div class="alert alert-success" style="margin-top:12px;">
          ✓ ${this._despacho.status === 'DESPACHADO' ? 'Ya despachado.' : 'Picking terminado.'}
          ${this._despacho.status === 'PICKEADO'
            ? `<button class="btn-success" style="margin-left:10px;" id="btn-despachar-final">Confirmar salida del almacén →</button>`
            : ''}
        </div>
      ` : ''}
    `;

    document.getElementById('btn-terminar-pick')?.addEventListener('click', () => this._terminar());
    document.getElementById('btn-despachar-final')?.addEventListener('click', () => this._finalizar());

    // Call afterRenderPanel for the expanded item if any
    if (this._expandido !== null) {
      this.afterRenderPanel(this._expandido);
    }

    document.querySelectorAll('[data-item-idx]').forEach(el => {
      el.addEventListener('click', e => {
        if (['INPUT','SELECT','BUTTON'].includes(e.target.tagName)) return;
        const idx = Number(el.dataset.itemIdx);
        this._expandido = this._expandido === idx ? null : idx;
        this._render();
        // Scroll al ítem expandido
        if (this._expandido === idx) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
        }
      });
    });
  },

  _renderItem(it, idx) {
    const pickeado    = this._pickeado(it);
    const noEncontrado = this._noEncontrado(it);
    const expandido   = this._expandido === idx;

    let borderColor = 'var(--border)';
    if (pickeado)     borderColor = 'var(--success)';
    else if (noEncontrado) borderColor = 'var(--warning)';

    // Cantidad pickeada del observaciones
    let cantPickeada = it.cantidad;
    if (pickeado) {
      const match = it.observaciones?.match(/PICKEADO:\s*([\d.]+)/);
      if (match) cantPickeada = Number(match[1]);
    }

    // Serie real: si viene con guion o vacía = sin serie
    const serieReal = it.serie && !it.serie.startsWith('-') && it.serie.trim() !== '' ? it.serie : null;

    return `
      <div class="pick-item ${pickeado ? 'pickeado' : ''} ${noEncontrado ? 'no-encontrado' : ''} ${expandido ? 'expandido' : ''}"
           data-item-idx="${idx}"
           style="border-left-color:${borderColor};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div style="flex:1; min-width:0;">
            <div class="pick-item-sku">${escapeHtml(it.sku || '-')}</div>
            <div class="pick-item-desc">${escapeHtml(it.descripcion || '')}</div>
          </div>
          <div style="flex-shrink:0; text-align:right;">
            ${pickeado
              ? `<span class="pill pill-success">✓ ${formatNum(cantPickeada)}</span>`
              : noEncontrado
              ? `<span class="pill pill-warning">No enc.</span>`
              : `<span class="pick-meta-qty">${formatNum(it.cantidad)}</span>`}
          </div>
        </div>

        <div class="pick-item-meta">
          ${serieReal ? `<span class="pick-meta-tag">🔖 ${escapeHtml(serieReal)}</span>` : ''}
          ${it.paleta_pedido ? `<span class="pick-meta-tag">📦 ${escapeHtml(it.paleta_pedido)}</span>` : ''}
          ${it.ubicacion_fisica ? `<span class="pick-meta-tag">📍 ${escapeHtml(it.ubicacion_fisica)}</span>` : ''}
          ${!pickeado && !noEncontrado ? `<span style="font-size:10px; color:var(--text-tertiary); margin-left:auto;">Toca para confirmar</span>` : ''}
        </div>

        ${expandido ? this._renderConfirmar(it, idx, serieReal, cantPickeada) : ''}
      </div>
    `;
  },

  _renderConfirmar(it, idx, serieReal, cantPickeada) {
    const pickeado = this._pickeado(it);
    return `
      <div class="pick-confirm-panel" onclick="event.stopPropagation()">
        <div class="field-grid">
          <div class="field">
            <label>Cantidad pickeada <span style="color:var(--text-tertiary);">(pedida: ${formatNum(it.cantidad)})</span></label>
            <input type="number" id="pick-cant-${idx}" value="${cantPickeada}"
              min="0" step="1"
              style="font-size:16px; font-weight:800; text-align:center; color:var(--accent);">
          </div>
          <div class="field">
            <label>Serie real</label>
            <input type="text" id="pick-serie-${idx}" value="${escapeHtml(serieReal || '')}"
              placeholder="${serieReal ? '' : 'Sin serie'}"
              style="font-family:monospace;">
          </div>
        </div>
        <div class="field">
          <label>Pedido / Paleta</label>
          <input type="text" id="pick-pp-${idx}" value="${escapeHtml(it.paleta_pedido || '')}"
            placeholder="Número de pedido o paleta">
        </div>
        <div class="field">
          <label>Observación (cambio SKU, incidencia, etc.)</label>
          <input type="text" id="pick-obs-${idx}" placeholder="">
        </div>
        <div class="btn-row">
          <button class="btn-primary" id="pick-btn-${idx}" style="flex:1;">
            ${pickeado ? '↺ Corregir cantidad' : '✓ Confirmar ítem'}
          </button>
          ${!pickeado ? `<button class="btn-warning" id="pick-skip-${idx}" style="padding:10px 14px;">No encontrado</button>` : ''}
          <button class="btn-ghost" id="pick-cancel-${idx}">Cerrar</button>
        </div>
        <div id="pick-msg-${idx}" style="margin-top:6px;"></div>
      </div>
    `;
  },

  afterRenderPanel(idx) {
    document.getElementById(`pick-btn-${idx}`)?.addEventListener('click', e => { e.stopPropagation(); this._confirmar(idx); });
    document.getElementById(`pick-skip-${idx}`)?.addEventListener('click', e => { e.stopPropagation(); this._marcarNoEncontrado(idx); });
    document.getElementById(`pick-cancel-${idx}`)?.addEventListener('click', e => { e.stopPropagation(); this._expandido = null; this._render(); });
  },

  async _confirmar(idx) {
    const it      = this._items[idx];
    const cant    = Number(document.getElementById(`pick-cant-${idx}`)?.value);
    const serie   = document.getElementById(`pick-serie-${idx}`)?.value.trim() || null;
    const pp      = document.getElementById(`pick-pp-${idx}`)?.value.trim() || it.paleta_pedido;
    const obs     = document.getElementById(`pick-obs-${idx}`)?.value.trim() || '';
    const msgEl   = document.getElementById(`pick-msg-${idx}`);
    const btn     = document.getElementById(`pick-btn-${idx}`);

    if (!cant || cant <= 0) {
      if (msgEl) msgEl.innerHTML = '<p class="msg-error">La cantidad debe ser mayor a 0.</p>';
      return;
    }

    btn.disabled = true; btn.textContent = 'Guardando…';

    // Actualizar pedido/paleta si cambió
    if (pp && pp !== it.paleta_pedido) {
      await actualizarPaletaPedidoItem(it.id, pp);
    }

    // Buscar stock si no tiene asignado
    let stockId = it.stock_id;
    if (!stockId) {
      const { data: opts } = await buscarStockParaItem(it.sku, pp || it.paleta_pedido, serie);
      if (opts?.length) {
        stockId = opts[0].id;
        await asignarStockAItem(it.id, stockId);
      }
    }

    if (!stockId) {
      // Sin stock en sistema — registrar con observación
      const obsTexto = `PICKEADO: ${cant} | SIN STOCK EN SISTEMA${obs ? ' | ' + obs : ''}`;
      await actualizarObservacionItem(it.id, obsTexto);
      this._items[idx].observaciones = obsTexto;
      this._expandido = null;
      this._render();
      return;
    }

    const { error } = await confirmarPicking(it.id, stockId, cant, obs);
    if (error) {
      if (msgEl) msgEl.innerHTML = '<p class="msg-error">Error al confirmar. Intenta de nuevo.</p>';
      btn.disabled = false; btn.textContent = '✓ Confirmar ítem';
      return;
    }

    const { items } = await obtenerDespachoConItems(this._despacho.id);
    this._items = items;
    this._expandido = null;
    this._render();
  },

  async _marcarNoEncontrado(idx) {
    const it  = this._items[idx];
    const obs = document.getElementById(`pick-obs-${idx}`)?.value.trim() || 'No encontrado en almacén';
    const obsNoEnc = `NO ENCONTRADO: ${obs}`;
    await actualizarObservacionItem(it.id, obsNoEnc);
    this._items[idx].observaciones = obsNoEnc;
    this._expandido = null;
    this._render();
  },

  async _terminar() {
    const btn = document.getElementById('btn-terminar-pick');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    const { error } = await terminarPicking(this._despacho.id);
    if (error) {
      alert('Error al terminar. Intenta de nuevo.');
      if (btn) { btn.disabled = false; btn.textContent = 'Terminar picking'; }
      return;
    }
    const { despacho, items } = await obtenerDespachoConItems(this._despacho.id);
    this._despacho = despacho;
    this._items = items;
    this._render();
  },

  async _finalizar() {
    const btn = document.getElementById('btn-despachar-final');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando…'; }
    await finalizarDespacho(this._despacho.id);
    Router.navigate('picking-lista');
  }
};

Router.register('picking', PickingView);

// ============================================================
// DETALLE (read-only)
// ============================================================
const PickingDetalleView = {
  title: 'Detalle de orden',
  render() { return `<div id="det-cont"></div>`; },
  async afterRender(params) {
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);
    const cont = document.getElementById('det-cont');
    if (!despacho) { cont.innerHTML = '<div class="empty-state">No encontrado.</div>'; return; }
    const est = calcularEstadoVisual({ ...despacho, despachos_items: items });
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
            ${est !== 'DESPACHADO' ? `<button class="btn-primary" id="btn-ir-pick" style="padding:7px 14px; font-size:12px;">Pickear →</button>` : ''}
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
                <td class="wrap">${escapeHtml(it.descripcion||'-')}</td>
                <td style="font-weight:700;">${formatNum(it.cantidad)}</td>
                <td style="font-family:monospace; font-size:11px;">${escapeHtml(it.serie||'-')}</td>
                <td>${escapeHtml(it.paleta_pedido||'-')}</td>
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
    document.getElementById('btn-ir-pick')?.addEventListener('click', () => Router.navigate('picking', { despachoId: despacho.id }));
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

  afterRender() { this._renderChips(); this._cargar(); },

  _renderChips() {
    const estados = [
      { v: 'TODOS', l: 'Todos' }, { v: 'PICKEADO', l: 'Pickeado' }, { v: 'DESPACHADO', l: 'Despachado' }
    ];
    document.getElementById('chips-ds').innerHTML = estados.map(e =>
      `<button class="chip ${this._filtroEstado === e.v ? 'active' : ''}" data-ds="${e.v}">${e.l}</button>`
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
    let lista = this._despachos
      .filter(d => d.status !== 'BORRADOR')
      .map(d => ({ ...d, _est: calcularEstadoVisual(d) }));
    if (this._filtroEstado !== 'TODOS') lista = lista.filter(d => d._est === this._filtroEstado);

    if (!lista.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-icon">🚛</div><strong>Sin despachos</strong>Cambia el filtro.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${lista.map(d => `
              <tr>
                <td class="sku-cell">${escapeHtml(d.gr||'-')}</td>
                <td>${escapeHtml(d.destino||'-')}</td>
                <td class="wrap">${escapeHtml(d.razon_social||'-')}</td>
                <td>${escapeHtml(d.cliente||'-')}</td>
                <td>${formatFecha(d.creado_en)}</td>
                <td>${pillEstado(d._est)}</td>
                <td>
                  ${d._est === 'PICKEADO'
                    ? `<button class="btn-success" style="padding:6px 12px; font-size:11px;" data-desp="${d.id}">🚛 Despachar</button>`
                    : `<button class="btn-ghost" data-ver-ds="${d.id}">Ver</button>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    cont.querySelectorAll('[data-desp]').forEach(b => b.addEventListener('click', () => this._confirmar(Number(b.dataset.desp))));
    cont.querySelectorAll('[data-ver-ds]').forEach(b => b.addEventListener('click', () => Router.navigate('picking-detalle', { despachoId: b.dataset.verDs })));
  },

  async _confirmar(id) {
    if (!confirm('¿Confirmar que este bulto ya salió físicamente del almacén?')) return;
    await finalizarDespacho(id);
    await this._cargar();
  }
};

Router.register('despachos-salidas', DespachosSalidasView);
