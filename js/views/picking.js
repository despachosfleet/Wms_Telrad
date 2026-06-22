// ============================================================
// VISTA: ORDENES DE PICKING (lista filtrable, expandible)
// Estados: PENDIENTE -> EN_PROCESO (calculado) -> PICKEADO -> DESPACHADO
// Mismo patron de expandir/colapsar que Consulta de Stock.
// ============================================================

const ESTADOS_FILTRO = [
  { valor: 'TODOS', label: 'Todos' },
  { valor: 'PENDIENTE', label: 'Pendiente' },
  { valor: 'EN_PROCESO', label: 'En proceso' },
  { valor: 'PICKEADO', label: 'Pickeado' },
  { valor: 'DESPACHADO', label: 'Despachado' }
];

const FECHAS_FILTRO = [
  { valor: 'TODAS', label: 'Todas' },
  { valor: 'HOY', label: 'Hoy' },
  { valor: 'AYER', label: 'Ayer' }
];

function pillEstado(estado) {
  if (estado === 'PICKEADO') return '<span class="pill pill-success">Pickeado</span>';
  if (estado === 'DESPACHADO') return '<span class="pill" style="background:#37415110; color:#374151;">Despachado</span>';
  if (estado === 'EN_PROCESO') return '<span class="pill" style="background:var(--neutral-bg); color:var(--text-secondary);">En proceso</span>';
  return '<span class="pill" style="background:var(--neutral-bg); color:var(--text-secondary);">Pendiente</span>';
}

function rangoFecha(filtro) {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (filtro === 'HOY') {
    return { desde: inicioHoy.toISOString(), hasta: new Date(inicioHoy.getTime() + 86400000).toISOString() };
  }
  if (filtro === 'AYER') {
    const ayer = new Date(inicioHoy.getTime() - 86400000);
    return { desde: ayer.toISOString(), hasta: inicioHoy.toISOString() };
  }
  return { desde: null, hasta: null };
}

// ============================================================
// LISTA: ORDENES DE PICKING (sin boton de despachar)
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
        <div class="chips" id="chips-fecha" style="margin-top:8px;"></div>
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
      btn.addEventListener('click', () => {
        this._filtroEstado = btn.dataset.estado;
        this.renderChips();
        this.renderLista();
      });
    });
    document.querySelectorAll('[data-fecha]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._filtroFecha = btn.dataset.fecha;
        this.renderChips();
        this.cargarYRender();
      });
    });
  },

  async cargarYRender() {
    const cont = document.getElementById('lista-ordenes-cont');
    cont.innerHTML = `<div class="empty-state">Cargando órdenes...</div>`;

    const { desde, hasta } = rangoFecha(this._filtroFecha);
    this._despachos = await obtenerTodosLosDespachos({ fechaDesde: desde, fechaHasta: hasta });
    this.renderLista();
  },

  renderLista() {
    const cont = document.getElementById('lista-ordenes-cont');
    let lista = this._despachos.map(d => ({ ...d, _estadoVisual: calcularEstadoVisual(d) }));

    if (this._filtroEstado !== 'TODOS') {
      lista = lista.filter(d => d._estadoVisual === this._filtroEstado);
    }

    if (lista.length === 0) {
      cont.innerHTML = `<div class="empty-state">No hay órdenes con estos filtros.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th><th>Ítems</th><th>Estado</th><th></th><th></th></tr></thead>
          <tbody>
            ${lista.map(d => `
              <tr>
                <td class="sku-cell">${escapeHtml(d.gr || 'Sin GR')}</td>
                <td class="wrap">${escapeHtml(d.destino || '-')}</td>
                <td class="wrap">${escapeHtml(d.razon_social || '-')}</td>
                <td>${escapeHtml(d.cliente || '-')}</td>
                <td>${(d.despachos_items || []).length}</td>
                <td>${pillEstado(d._estadoVisual)}</td>
                <td><button class="btn-text" data-ver-detalle="${d.id}">Ver detalle</button></td>
                <td><button class="btn-text" data-picar="${d.id}">Pickear</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('[data-ver-detalle]').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate('picking-detalle', { despachoId: btn.dataset.verDetalle }));
    });
    cont.querySelectorAll('[data-picar]').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate('picking', { despachoId: btn.dataset.picar }));
    });
  }
};

Router.register('picking-lista', PickingListaView);

// ============================================================
// DETALLE DE ORDEN: lista completa de items (SKU, descripcion,
// cantidad, serie, pedido) antes de empezar a pickear. Boton
// "Pickear" arriba lleva a la pantalla real de pickeo por lineas.
// ============================================================
const PickingDetalleView = {
  title: 'Detalle de la orden',
  _despacho: null,
  _items: [],

  render() {
    return `<div id="detalle-content"></div>`;
  },

  async afterRender(params) {
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);
    const cont = document.getElementById('detalle-content');

    if (!despacho) {
      cont.innerHTML = '<div class="empty-state">No se pudo cargar el despacho.</div>';
      return;
    }

    this._despacho = despacho;
    this._items = items;
    const estadoVisual = calcularEstadoVisual({ ...despacho, despachos_items: items });

    cont.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
          <div>
            <p class="card-title" style="margin:0;">${escapeHtml(despacho.gr || 'Sin GR')}</p>
            <p style="font-size:11px; color:var(--text-secondary); margin:4px 0 0;">
              Destino: ${escapeHtml(despacho.destino || '-')} · Destinatario: ${escapeHtml(despacho.razon_social || '-')} · Cliente: ${escapeHtml(despacho.cliente || '-')}
            </p>
          </div>
          <button class="btn-pickear" id="btn-picar-detalle">Pickear</button>
        </div>
        <div style="margin-top:8px;">${pillEstado(estadoVisual)}</div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Descripción</th><th>Cantidad</th><th>Serie</th><th>Pedido</th></tr></thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td class="sku-cell">${escapeHtml(it.sku || '-')}</td>
                <td class="wrap">${escapeHtml(it.descripcion || '-')}</td>
                <td>${formatNum(it.cantidad)}</td>
                <td>${escapeHtml(it.serie || '-')}</td>
                <td>${escapeHtml(it.paleta_pedido || '-')}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty-state">Sin ítems</td></tr>'}
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
// PICKING POR LINEAS: ver todos los items a la vez, trabajar
// el que quieras, en cualquier orden, sin perder lo ya hecho.
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
    const completados = this._items.filter(it => it.observaciones && it.observaciones.startsWith('PICKEADO')).length;
    const total = this._items.length;

    cont.innerHTML = `
      <div class="card">
        <p class="card-title" style="margin:0;">${escapeHtml(this._despacho.gr || 'Despacho')}</p>
        <p style="font-size:11px; color:var(--text-secondary); margin:4px 0 0;">${escapeHtml(this._despacho.destino || '-')} · ${completados}/${total} ítems pickeados</p>
      </div>
      <div id="items-picking-cont"></div>
      ${completados >= total && total > 0 ? `<button class="btn-primary" id="btn-terminar-picking">Terminar picking</button>` : ''}
    `;

    const itemsCont = document.getElementById('items-picking-cont');
    itemsCont.innerHTML = this._items.map((it, i) => {
      const yaPickeado = it.observaciones && it.observaciones.startsWith('PICKEADO');
      return `
        <div class="card" style="margin-bottom:8px; ${yaPickeado ? 'border-color:var(--success-text);' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-size:12.5px; font-weight:600;">${escapeHtml(it.sku)}</div>
              <div style="font-size:11px; color:var(--text-secondary);">Pedido: ${formatNum(it.cantidad)} ${it.serie ? '· Serie: ' + escapeHtml(it.serie) : ''}</div>
            </div>
            ${yaPickeado ? '<span class="pill pill-success">Pickeado</span>' : ''}
          </div>
          <div id="item-detalle-${i}" style="margin-top:8px; ${yaPickeado ? 'display:none;' : ''}"></div>
          ${!yaPickeado ? `<button class="btn-text" data-expandir="${i}" style="margin-top:6px;">Trabajar este ítem</button>` : `<button class="btn-text" data-expandir="${i}" style="margin-top:6px;">Ver / corregir</button>`}
        </div>
      `;
    }).join('');

    itemsCont.querySelectorAll('[data-expandir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.expandir);
        this.renderDetalleItem(i);
      });
    });

    const btnTerminar = document.getElementById('btn-terminar-picking');
    if (btnTerminar) btnTerminar.addEventListener('click', () => this.terminarPickingYRedirigir());
  },

  async renderDetalleItem(index) {
    const item = this._items[index];
    const detalleEl = document.getElementById(`item-detalle-${index}`);
    detalleEl.style.display = '';
    detalleEl.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary);">Buscando stock...</p>`;

    let opciones = [];
    let origen = null;

    if (item.stock_id) {
      const { data: stockActual } = await sb.from('stock').select('*').eq('id', item.stock_id).single();
      if (stockActual) opciones = [stockActual];
    } else {
      const resultado = await buscarStockParaItem(item.sku, item.paleta_pedido, item.serie);
      opciones = resultado.data;
      origen = resultado.origen;
    }

    if (opciones.length === 0) {
      const esPorSerie = origen === 'POR_REVISAR';
      detalleEl.innerHTML = `
        <div class="pill pill-danger" style="margin-bottom:8px;">${esPorSerie ? 'Serie no encontrada — revisar manual' : 'Sin stock identificado — revisar manual'}</div>
        <p style="font-size:11px; color:var(--text-secondary);">${esPorSerie ? `La serie "${escapeHtml(item.serie || '')}" no se encontró en stock disponible. No se sugiere otra unidad del mismo SKU porque la guía exige esta serie exacta.` : 'No se encontró por pedido ni por SKU. Verifica el SKU o asigna manualmente desde Movimientos.'}</p>
      `;
      return;
    }

    const origenTxt = origen === 'INGRESO_NUEVO' ? 'Ingreso nuevo' : (origen === 'MUDANZA' ? 'Mudanza' : '');

    detalleEl.innerHTML = `
      ${origenTxt ? `<p style="font-size:11px; color:var(--text-secondary); margin:0 0 6px;">Origen detectado: <strong>${origenTxt}</strong></p>` : ''}
      <div class="field">
        <label>Ubicación / paleta</label>
        <select id="select-stock-${index}">
          ${opciones.map(o => `<option value="${o.id}">${escapeHtml(o.ubicacion_fisica || o.paleta_pedido || 'sin ubicación')} (disp: ${formatNum(o.cantidad)})</option>`).join('')}
        </select>
      </div>
      <div class="field-grid" style="margin-top:8px;">
        <div class="field">
          <label>Cantidad pickeada</label>
          <input type="number" id="cant-pickeada-${index}" value="${item.cantidad}" min="0" step="any" />
        </div>
        <div class="field">
          <label>Observación</label>
          <input type="text" id="obs-pickeada-${index}" placeholder="" />
        </div>
      </div>
      <button class="btn-primary" id="btn-confirmar-item-${index}" style="margin-top:10px;">Confirmar este ítem</button>
      <div id="msg-item-${index}"></div>
    `;

    document.getElementById(`btn-confirmar-item-${index}`).addEventListener('click', () => this.confirmarItem(index, opciones));
  },

  async confirmarItem(index, opciones) {
    const item = this._items[index];
    const stockId = Number(document.getElementById(`select-stock-${index}`).value);
    const cantidad = Number(document.getElementById(`cant-pickeada-${index}`).value);
    const observacion = document.getElementById(`obs-pickeada-${index}`).value.trim();
    const msgEl = document.getElementById(`msg-item-${index}`);

    if (!cantidad || cantidad <= 0) {
      msgEl.innerHTML = `<p style="font-size:11px; color:var(--danger);">Ingresa una cantidad válida.</p>`;
      return;
    }

    // Si el item aun no tenia stock asignado, asignarlo primero (reserva)
    if (!item.stock_id || item.stock_id !== stockId) {
      await asignarStockAItem(item.id, stockId);
    }

    const { error } = await confirmarPicking(item.id, stockId, cantidad, observacion);

    if (error) {
      msgEl.innerHTML = `<p style="font-size:11px; color:var(--danger);">Error al confirmar. Intenta de nuevo.</p>`;
      return;
    }

    const { items } = await obtenerDespachoConItems(this._despacho.id);
    this._items = items;
    await this.renderListaItems();
  },

  async terminarPickingYRedirigir() {
    const { error } = await terminarPicking(this._despacho.id);
    if (error) {
      alert('Error al marcar el picking como terminado. Intenta de nuevo.');
      return;
    }
    Router.navigate('picking-lista');
  },

  renderConfirmarDespacho() {
    const cont = document.getElementById('picking-content');
    const yaDespachado = this._despacho.status === 'DESPACHADO';
    cont.innerHTML = `
      <div class="card" style="text-align:center; padding:24px;">
        <p style="font-size:15px; font-weight:600; margin:0 0 6px;">${yaDespachado ? 'Ya despachado' : 'Ya está pickeado'}</p>
        <p style="font-size:13px; color:var(--text-secondary); margin:0 0 16px;">
          ${escapeHtml(this._despacho.gr || 'Este despacho')} ${yaDespachado ? 'ya fue confirmado como despachado.' : 'está listo. Confirma cuando el bulto haya salido realmente del almacén.'}
        </p>
        ${!yaDespachado ? `<button class="btn-primary" id="btn-confirmar-despacho">Confirmar despacho (ya salió)</button>` : ''}
      </div>
    `;
    if (!yaDespachado) {
      document.getElementById('btn-confirmar-despacho').addEventListener('click', () => this.finalizar());
    }
  },

  async finalizar() {
    await finalizarDespacho(this._despacho.id);
    Router.navigate('picking-lista');
  }
};

Router.register('picking', PickingView);

// ============================================================
// DESPACHOS Y SALIDAS: misma data, con boton de despachar
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
        <div class="chips" id="chips-fecha-desp" style="margin-top:8px;"></div>
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
      btn.addEventListener('click', () => {
        this._filtroEstado = btn.dataset.estadoD;
        this.renderChips();
        this.renderLista();
      });
    });
    document.querySelectorAll('[data-fecha-d]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._filtroFecha = btn.dataset.fechaD;
        this.renderChips();
        this.cargarYRender();
      });
    });
  },

  async cargarYRender() {
    const cont = document.getElementById('lista-despachos-cont');
    cont.innerHTML = `<div class="empty-state">Cargando...</div>`;
    const { desde, hasta } = rangoFecha(this._filtroFecha);
    this._despachos = await obtenerTodosLosDespachos({ fechaDesde: desde, fechaHasta: hasta });
    this.renderLista();
  },

  renderLista() {
    const cont = document.getElementById('lista-despachos-cont');
    let lista = this._despachos.map(d => ({ ...d, _estadoVisual: calcularEstadoVisual(d) }));

    if (this._filtroEstado !== 'TODOS') {
      lista = lista.filter(d => d._estadoVisual === this._filtroEstado);
    }

    if (lista.length === 0) {
      cont.innerHTML = `<div class="empty-state">No hay despachos con estos filtros.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Destino</th><th>Destinatario</th><th>Cliente</th><th>Estado</th><th></th><th></th></tr></thead>
          <tbody>
            ${lista.map(d => `
              <tr>
                <td class="sku-cell">${escapeHtml(d.gr || 'Sin GR')}</td>
                <td class="wrap">${escapeHtml(d.destino || '-')}</td>
                <td class="wrap">${escapeHtml(d.razon_social || '-')}</td>
                <td>${escapeHtml(d.cliente || '-')}</td>
                <td>${pillEstado(d._estadoVisual)}</td>
                <td><button class="btn-text" data-ver-detalle-desp="${d.id}">Ver detalle</button></td>
                <td>${d._estadoVisual === 'PICKEADO' ? `<button class="btn-despachar-sq" data-despachar="${d.id}">🚛 Despachar</button>` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('[data-ver-detalle-desp]').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate('picking-detalle', { despachoId: btn.dataset.verDetalleDesp }));
    });

    cont.querySelectorAll('[data-despachar]').forEach(btn => {
      btn.addEventListener('click', () => this.abrirModalDespachar(Number(btn.dataset.despachar)));
    });
  },

  abrirModalDespachar(despachoId) {
    const modalCont = document.getElementById('modal-despachar-cont');
    modalCont.innerHTML = `
      <div class="modal-overlay" id="modal-overlay-despachar">
        <div class="modal-box">
          <p class="modal-title">Confirmar despacho</p>
          <p class="modal-text">¿Confirmas que este bulto ya salió del almacén?</p>
          <div class="modal-actions">
            <button class="btn-modal-secundario" id="btn-modal-cancelar">Cancelar</button>
            <button class="btn-modal-primario" id="btn-modal-aceptar">Aceptar</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modal-overlay-despachar').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay-despachar') modalCont.innerHTML = '';
    });
    document.getElementById('btn-modal-cancelar').addEventListener('click', () => { modalCont.innerHTML = ''; });
    document.getElementById('btn-modal-aceptar').addEventListener('click', async () => {
      modalCont.innerHTML = '';
      await finalizarDespacho(despachoId);
      await this.cargarYRender();
    });
  }
};

Router.register('despachos-salidas', DespachosSalidasView);
