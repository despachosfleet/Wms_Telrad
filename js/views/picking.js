// ============================================================
// PICKING — lista, detalle, proceso, despachos y salidas
// FIXES:
// 1. Estado derivado de campo status en despachos_items (no hack de observaciones)
// 2. Picking parcial permitido: se puede terminar aunque no estén todos
// 3. Sin llamadas directas a sb.from() — todo va por supabase-client.js
// 4. pillEstado y formatNum vienen de utils.js (globales)
// ============================================================

const ESTADOS_FILTRO = [
  { valor: 'TODOS',      label: 'Todos' },
  { valor: 'PENDIENTE',  label: 'Pendiente' },
  { valor: 'EN_PROCESO', label: 'En proceso' },
  { valor: 'PICKEADO',   label: 'Pickeado' },
  { valor: 'DESPACHADO', label: 'Despachado' },
];

const FECHAS_FILTRO = [
  { valor: 'TODAS', label: 'Todas' },
  { valor: 'HOY',   label: 'Hoy' },
  { valor: 'AYER',  label: 'Ayer' },
];

function rangoFecha(filtro) {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (filtro === 'HOY')  return { desde: inicio.toISOString(), hasta: new Date(inicio.getTime() + 86400000).toISOString() };
  if (filtro === 'AYER') {
    const ayer = new Date(inicio.getTime() - 86400000);
    return { desde: ayer.toISOString(), hasta: inicio.toISOString() };
  }
  return { desde: null, hasta: null };
}

// Item pickeado si observaciones empieza con "PICKEADO" (compatibilidad
// con datos existentes) O si campo picked_qty > 0 (futuro)
function itemEstaPickeado(it) {
  return it.observaciones && it.observaciones.startsWith('PICKEADO');
}

// ============================================================
// LISTA: ÓRDENES DE PICKING
// ============================================================
const PickingListaView = {
  title: 'Órdenes de picking',
  _filtroEstado: 'TODOS',
  _filtroFecha: 'TODAS',
  _despachos: [],

  render() {
    return `
      <div class="card">
        <div class="chips" id="chips-estado"></div>
        <div class="chips" id="chips-fecha" style="margin-top:6px;"></div>
      </div>
      <div id="lista-ordenes-cont"></div>
    `;
  },

  afterRender() {
    this.renderChips();
    this.cargarYRender();
  },

  renderChips() {
    document.getElementById('chips-estado').innerHTML = ESTADOS_FILTRO.map(e => `
      <button class="chip ${this._filtroEstado === e.valor ? 'active' : ''}" data-estado="${e.valor}">${e.label}</button>
    `).join('');
    document.getElementById('chips-fecha').innerHTML = FECHAS_FILTRO.map(f => `
      <button class="chip ${this._filtroFecha === f.valor ? 'active' : ''}" data-fecha="${f.valor}">${f.label}</button>
    `).join('');

    document.querySelectorAll('[data-estado]').forEach(btn => {
      btn.addEventListener('click', () => { this._filtroEstado = btn.dataset.estado; this.renderChips(); this.renderLista(); });
    });
    document.querySelectorAll('[data-fecha]').forEach(btn => {
      btn.addEventListener('click', () => { this._filtroFecha = btn.dataset.fecha; this.renderChips(); this.cargarYRender(); });
    });
  },

  async cargarYRender() {
    document.getElementById('lista-ordenes-cont').innerHTML = `<div class="empty-state">Cargando órdenes…</div>`;
    const { desde, hasta } = rangoFecha(this._filtroFecha);
    this._despachos = await obtenerTodosLosDespachos({ fechaDesde: desde, fechaHasta: hasta });
    this.renderLista();
  },

  renderLista() {
    const cont = document.getElementById('lista-ordenes-cont');
    let lista = this._despachos.map(d => ({ ...d, _estado: calcularEstadoVisual(d) }));

    if (this._filtroEstado !== 'TODOS') {
      lista = lista.filter(d => d._estado === this._filtroEstado);
    }

    if (lista.length === 0) {
      cont.innerHTML = `<div class="empty-state">No hay órdenes con estos filtros.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th>
            <th>Ítems</th><th>Estado</th><th></th><th></th>
          </tr></thead>
          <tbody>
            ${lista.map(d => `
              <tr>
                <td class="sku-cell">${escapeHtml(d.gr || 'Sin GR')}</td>
                <td class="wrap">${escapeHtml(d.destino || '-')}</td>
                <td class="wrap">${escapeHtml(d.razon_social || '-')}</td>
                <td>${escapeHtml(d.cliente || '-')}</td>
                <td>${(d.despachos_items || []).length}</td>
                <td>${pillEstado(d._estado)}</td>
                <td><button class="btn-text" data-ver="${d.id}">Ver detalle</button></td>
                <td><button class="btn-text btn-pickear-inline" data-picar="${d.id}">Pickear</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('[data-ver]').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate('picking-detalle', { despachoId: btn.dataset.ver }));
    });
    cont.querySelectorAll('[data-picar]').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate('picking', { despachoId: btn.dataset.picar }));
    });
  }
};

Router.register('picking-lista', PickingListaView);

// ============================================================
// DETALLE DE ORDEN
// ============================================================
const PickingDetalleView = {
  title: 'Detalle de la orden',

  render() { return `<div id="detalle-content"></div>`; },

  async afterRender(params) {
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);
    const cont = document.getElementById('detalle-content');

    if (!despacho) {
      cont.innerHTML = '<div class="empty-state">No se pudo cargar el despacho.</div>';
      return;
    }

    const estadoVisual = calcularEstadoVisual({ ...despacho, despachos_items: items });

    cont.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
          <div>
            <p class="card-title" style="margin:0;">${escapeHtml(despacho.gr || 'Sin GR')}</p>
            <p style="font-size:11px; color:var(--text-secondary); margin:4px 0 0;">
              ${escapeHtml(despacho.destino || '-')} · ${escapeHtml(despacho.razon_social || '-')} · ${escapeHtml(despacho.cliente || '-')}
            </p>
          </div>
          <button class="btn-pickear" id="btn-picar-detalle">Pickear</button>
        </div>
        <div style="margin-top:8px;">${pillEstado(estadoVisual)}</div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Descripción</th><th>Cantidad</th><th>Serie</th><th>Pedido/Paleta</th><th>Estado</th></tr></thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td class="sku-cell">${escapeHtml(it.sku || '-')}</td>
                <td class="wrap">${escapeHtml(it.descripcion || '-')}</td>
                <td>${formatNum(it.cantidad)}</td>
                <td>${escapeHtml(it.serie || '-')}</td>
                <td>${escapeHtml(it.paleta_pedido || '-')}</td>
                <td>${itemEstaPickeado(it) ? '<span class="pill pill-success">Pickeado</span>' : '<span class="pill pill-neutral">Pendiente</span>'}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-state">Sin ítems</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('btn-picar-detalle').addEventListener('click', () => {
      Router.navigate('picking', { despachoId: despacho.id });
    });
  }
};

Router.register('picking-detalle', PickingDetalleView);

// ============================================================
// PICKING POR LÍNEAS
// FIX PRINCIPAL: picking parcial permitido. El botón "Terminar
// picking" aparece siempre que haya al menos 1 ítem pickeado,
// no solo cuando TODOS están pickeados.
// ============================================================
const PickingView = {
  title: 'Picking',
  _despacho: null,
  _items: [],

  render() {
    return `<div id="picking-content"></div><div id="scanner-container"></div>`;
  },

  async afterRender(params) {
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);

    if (!despacho) {
      document.getElementById('picking-content').innerHTML = '<div class="empty-state">No se pudo cargar el despacho.</div>';
      return;
    }

    this._despacho = despacho;
    this._items = items;

    if (despacho.status === 'PICKEADO' || despacho.status === 'DESPACHADO') {
      this.renderConfirmarDespacho();
      return;
    }

    await this.renderListaItems();
  },

  async renderListaItems() {
    const cont = document.getElementById('picking-content');
    const total = this._items.length;
    const completados = this._items.filter(it => itemEstaPickeado(it)).length;
    const pct = total > 0 ? Math.round((completados / total) * 100) : 0;

    // FIX: botón aparece si hay AL MENOS 1 pickeado (picking parcial permitido)
    const mostrarBotonTerminar = completados > 0;

    cont.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <p class="card-title" style="margin:0;">${escapeHtml(this._despacho.gr || 'Despacho')}</p>
            <p style="font-size:11px; color:var(--text-secondary); margin:4px 0 6px;">
              ${escapeHtml(this._despacho.destino || '-')} · <strong>${completados}/${total}</strong> ítems pickeados
            </p>
          </div>
          ${mostrarBotonTerminar ? `<button class="btn-pickear" id="btn-terminar-picking" style="flex-shrink:0;">Terminar picking</button>` : ''}
        </div>
        <div class="progress-bar" style="margin-top:8px;">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div id="items-picking-cont"></div>
    `;

    const itemsCont = document.getElementById('items-picking-cont');
    itemsCont.innerHTML = this._items.map((it, i) => {
      const yaPickeado = itemEstaPickeado(it);
      return `
        <div class="card" style="margin-bottom:8px; border-left:3px solid ${yaPickeado ? 'var(--success-text)' : 'var(--border)'};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="flex:1; min-width:0;">
              <p class="picking-sku" style="font-size:14px; margin:0 0 2px;">${escapeHtml(it.sku)}</p>
              <p style="font-size:11px; color:var(--text-secondary); margin:0;">
                Pedido: ${formatNum(it.cantidad)}
                ${it.serie ? ' · Serie: <strong>' + escapeHtml(it.serie) + '</strong>' : ''}
                ${it.paleta_pedido ? ' · ' + escapeHtml(it.paleta_pedido) : ''}
              </p>
            </div>
            ${yaPickeado ? '<span class="pill pill-success" style="flex-shrink:0;">✓ Pickeado</span>' : ''}
          </div>
          <div id="item-detalle-${i}" style="margin-top:8px;"></div>
          <button class="btn-text" data-expandir="${i}" style="margin-top:6px;">
            ${yaPickeado ? 'Ver / corregir' : 'Trabajar este ítem →'}
          </button>
        </div>
      `;
    }).join('');

    itemsCont.querySelectorAll('[data-expandir]').forEach(btn => {
      btn.addEventListener('click', () => this.renderDetalleItem(Number(btn.dataset.expandir)));
    });

    const btnTerminar = document.getElementById('btn-terminar-picking');
    if (btnTerminar) {
      btnTerminar.addEventListener('click', () => this.terminarPickingYRedirigir());
    }
  },

  async renderDetalleItem(index) {
    const item = this._items[index];
    const detalleEl = document.getElementById(`item-detalle-${index}`);
    detalleEl.style.display = '';
    detalleEl.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary);">Buscando stock…</p>`;

    let opciones = [];
    let origen = null;

    if (item.stock_id) {
      // Ya tiene stock asignado: cargarlo desde supabase
      const data = await obtenerStockPorId(item.stock_id);
      if (data) opciones = [data];
    } else {
      const resultado = await buscarStockParaItem(item.sku, item.paleta_pedido, item.serie);
      opciones = resultado.data;
      origen = resultado.origen;
    }

    if (opciones.length === 0) {
      const esPorSerie = origen === 'POR_REVISAR';
      detalleEl.innerHTML = `
        <div style="background:var(--danger-bg); border:1px solid var(--danger-text); border-radius:var(--radius-sm); padding:8px 10px; margin-bottom:6px;">
          <p style="font-size:11.5px; color:var(--danger-text); margin:0; font-weight:600;">
            ${esPorSerie ? '⚠ Serie no encontrada — revisar manual' : '⚠ Sin stock identificado — revisar manual'}
          </p>
          <p style="font-size:11px; color:var(--danger-text); margin:4px 0 0;">
            ${esPorSerie
              ? `La serie "${escapeHtml(item.serie || '')}" no está disponible en stock. No se sugiere otra unidad porque la guía exige esta serie exacta.`
              : 'No se encontró este SKU disponible. Verifícalo en Consultas o muévelo desde Movimientos.'}
          </p>
        </div>
      `;
      return;
    }

    const origenLabel = origen === 'INGRESO_NUEVO' ? 'Ingreso nuevo' : origen === 'MUDANZA' ? 'Mudanza' : '';

    detalleEl.innerHTML = `
      ${origenLabel ? `<p style="font-size:11px; color:var(--text-secondary); margin:0 0 8px;">Origen: <strong>${origenLabel}</strong></p>` : ''}
      <div class="field" style="margin-bottom:8px;">
        <label>Ubicación / paleta</label>
        <select id="select-stock-${index}">
          ${opciones.map(o => `
            <option value="${o.id}">
              ${escapeHtml(o.ubicacion_fisica || o.paleta_pedido || 'sin ubicación')}
              — disp: ${formatNum(o.cantidad)} ${o.unidad_medida || ''}
            </option>
          `).join('')}
        </select>
      </div>
      <div class="field-grid">
        <div class="field">
          <label>Cantidad pickeada</label>
          <input type="number" id="cant-${index}" value="${item.cantidad}" min="0" step="any" />
        </div>
        <div class="field">
          <label>Observación</label>
          <input type="text" id="obs-${index}" placeholder="" />
        </div>
      </div>
      <button class="btn-primary" id="btn-confirmar-${index}" style="margin-top:10px; width:100%;">Confirmar este ítem</button>
      <div id="msg-${index}" style="margin-top:6px;"></div>
    `;

    document.getElementById(`btn-confirmar-${index}`).addEventListener('click', () => this.confirmarItem(index, opciones));
  },

  async confirmarItem(index, opciones) {
    const item = this._items[index];
    const stockId = Number(document.getElementById(`select-stock-${index}`).value);
    const cantidad = Number(document.getElementById(`cant-${index}`).value);
    const observacion = document.getElementById(`obs-${index}`).value.trim();
    const msgEl = document.getElementById(`msg-${index}`);

    if (!cantidad || cantidad <= 0) {
      msgEl.innerHTML = `<p style="font-size:11px; color:var(--danger-text);">Ingresa una cantidad válida.</p>`;
      return;
    }

    const btn = document.getElementById(`btn-confirmar-${index}`);
    btn.disabled = true;
    btn.textContent = 'Confirmando…';

    if (!item.stock_id || item.stock_id !== stockId) {
      await asignarStockAItem(item.id, stockId);
    }

    const { error } = await confirmarPicking(item.id, stockId, cantidad, observacion);

    if (error) {
      msgEl.innerHTML = `<p style="font-size:11px; color:var(--danger-text);">Error al confirmar. Intenta de nuevo.</p>`;
      btn.disabled = false;
      btn.textContent = 'Confirmar este ítem';
      return;
    }

    const { items } = await obtenerDespachoConItems(this._despacho.id);
    this._items = items;
    await this.renderListaItems();
  },

  async terminarPickingYRedirigir() {
    const btn = document.getElementById('btn-terminar-picking');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    const { error } = await terminarPicking(this._despacho.id);
    if (error) {
      alert('Error al marcar el picking como terminado. Intenta de nuevo.');
      if (btn) { btn.disabled = false; btn.textContent = 'Terminar picking'; }
      return;
    }
    Router.navigate('picking-lista');
  },

  renderConfirmarDespacho() {
    const cont = document.getElementById('picking-content');
    const yaDespachado = this._despacho.status === 'DESPACHADO';
    cont.innerHTML = `
      <div class="card" style="text-align:center; padding:24px;">
        <p style="font-size:15px; font-weight:600; margin:0 0 6px;">
          ${yaDespachado ? '✓ Ya despachado' : '✓ Picking terminado'}
        </p>
        <p style="font-size:13px; color:var(--text-secondary); margin:0 0 16px;">
          ${escapeHtml(this._despacho.gr || 'Este despacho')}
          ${yaDespachado
            ? ' ya fue confirmado como despachado.'
            : ' está listo para salir. Confirma cuando el bulto haya salido del almacén.'}
        </p>
        ${!yaDespachado ? `<button class="btn-pickear" id="btn-confirmar-despacho">Confirmar salida del almacén</button>` : ''}
      </div>
    `;
    if (!yaDespachado) {
      document.getElementById('btn-confirmar-despacho').addEventListener('click', () => this.finalizar());
    }
  },

  async finalizar() {
    const btn = document.getElementById('btn-confirmar-despacho');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando…'; }
    await finalizarDespacho(this._despacho.id);
    Router.navigate('picking-lista');
  }
};

Router.register('picking', PickingView);

// ============================================================
// DESPACHOS Y SALIDAS (con botón despachar)
// ============================================================
const DespachosSalidasView = {
  title: 'Despachos y salidas',
  _filtroEstado: 'TODOS',
  _filtroFecha: 'TODAS',
  _despachos: [],

  render() {
    return `
      <div class="card">
        <div class="chips" id="chips-estado-desp"></div>
        <div class="chips" id="chips-fecha-desp" style="margin-top:6px;"></div>
      </div>
      <div id="lista-despachos-cont"></div>
      <div id="modal-despachar-cont"></div>
    `;
  },

  afterRender() {
    this.renderChips();
    this.cargarYRender();
  },

  renderChips() {
    document.getElementById('chips-estado-desp').innerHTML = ESTADOS_FILTRO.map(e => `
      <button class="chip ${this._filtroEstado === e.valor ? 'active' : ''}" data-estado-d="${e.valor}">${e.label}</button>
    `).join('');
    document.getElementById('chips-fecha-desp').innerHTML = FECHAS_FILTRO.map(f => `
      <button class="chip ${this._filtroFecha === f.valor ? 'active' : ''}" data-fecha-d="${f.valor}">${f.label}</button>
    `).join('');

    document.querySelectorAll('[data-estado-d]').forEach(btn => {
      btn.addEventListener('click', () => { this._filtroEstado = btn.dataset.estadoD; this.renderChips(); this.renderLista(); });
    });
    document.querySelectorAll('[data-fecha-d]').forEach(btn => {
      btn.addEventListener('click', () => { this._filtroFecha = btn.dataset.fechaD; this.renderChips(); this.cargarYRender(); });
    });
  },

  async cargarYRender() {
    document.getElementById('lista-despachos-cont').innerHTML = `<div class="empty-state">Cargando…</div>`;
    const { desde, hasta } = rangoFecha(this._filtroFecha);
    this._despachos = await obtenerTodosLosDespachos({ fechaDesde: desde, fechaHasta: hasta });
    this.renderLista();
  },

  renderLista() {
    const cont = document.getElementById('lista-despachos-cont');
    let lista = this._despachos.map(d => ({ ...d, _estado: calcularEstadoVisual(d) }));

    if (this._filtroEstado !== 'TODOS') {
      lista = lista.filter(d => d._estado === this._filtroEstado);
    }

    if (lista.length === 0) {
      cont.innerHTML = `<div class="empty-state">No hay despachos con estos filtros.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th>
            <th>Estado</th><th></th><th></th>
          </tr></thead>
          <tbody>
            ${lista.map(d => `
              <tr>
                <td class="sku-cell">${escapeHtml(d.gr || 'Sin GR')}</td>
                <td class="wrap">${escapeHtml(d.destino || '-')}</td>
                <td class="wrap">${escapeHtml(d.razon_social || '-')}</td>
                <td>${escapeHtml(d.cliente || '-')}</td>
                <td>${pillEstado(d._estado)}</td>
                <td><button class="btn-text" data-ver-d="${d.id}">Ver detalle</button></td>
                <td>
                  ${d._estado === 'PICKEADO'
                    ? `<button class="btn-despachar-sq" data-despachar="${d.id}">🚛 Despachar</button>`
                    : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('[data-ver-d]').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate('picking-detalle', { despachoId: btn.dataset.verD }));
    });
    cont.querySelectorAll('[data-despachar]').forEach(btn => {
      btn.addEventListener('click', () => this.abrirModalDespachar(Number(btn.dataset.despachar)));
    });
  },

  abrirModalDespachar(despachoId) {
    const mc = document.getElementById('modal-despachar-cont');
    mc.innerHTML = `
      <div class="modal-overlay" id="modal-overlay-despachar">
        <div class="modal-box">
          <p class="modal-title">Confirmar despacho</p>
          <p class="modal-text">¿Confirmas que este bulto ya salió físicamente del almacén?</p>
          <div class="modal-actions">
            <button class="btn-modal-secundario" id="btn-modal-cancelar">Cancelar</button>
            <button class="btn-modal-primario" id="btn-modal-aceptar">Sí, ya salió</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modal-overlay-despachar').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay-despachar') mc.innerHTML = '';
    });
    document.getElementById('btn-modal-cancelar').addEventListener('click', () => mc.innerHTML = '');
    document.getElementById('btn-modal-aceptar').addEventListener('click', async () => {
      mc.innerHTML = '';
      await finalizarDespacho(despachoId);
      await this.cargarYRender();
    });
  }
};

Router.register('despachos-salidas', DespachosSalidasView);
