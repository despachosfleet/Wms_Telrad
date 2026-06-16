// ============================================================
// VISTA: LISTA DE DESPACHOS PENDIENTES (PICKING)
// ============================================================

const PickingListaView = {
  title: 'Picking',

  render() {
    return `
      <p class="result-count" id="contador-pend">Cargando despachos pendientes...</p>
      <div id="lista-pendientes"></div>
    `;
  },

  async afterRender() {
    const cont = document.getElementById('lista-pendientes');
    const contador = document.getElementById('contador-pend');

    const pendientes = await obtenerDespachosPendientes();

    contador.textContent = `${pendientes.length} despacho${pendientes.length === 1 ? '' : 's'} pendiente${pendientes.length === 1 ? '' : 's'}`;

    if (pendientes.length === 0) {
      cont.innerHTML = `
        <div class="empty-state">
          No hay despachos pendientes.<br>
          <button class="btn-text" style="margin-top:8px; display:inline-flex;" id="btn-ir-nuevo">Crear nuevo despacho</button>
        </div>
      `;
      const btn = document.getElementById('btn-ir-nuevo');
      if (btn) btn.addEventListener('click', () => Router.navigate('nuevo-despacho'));
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Cliente</th><th>Destino</th><th>Fecha</th><th>Estado</th></tr></thead>
          <tbody>
            ${pendientes.map(d => `
              <tr data-id="${d.id}">
                <td class="sku-cell">${escapeHtml(d.gr || 'Sin GR')}</td>
                <td>${escapeHtml(d.cliente || '-')}</td>
                <td class="wrap">${escapeHtml(d.destino || '-')}</td>
                <td>${escapeHtml(d.fecha || '-')}</td>
                <td><span class="pill pill-warning">Pendiente</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('tr[data-id]').forEach(card => {
      card.addEventListener('click', () => {
        Router.navigate('picking', { despachoId: Number(card.dataset.id) });
      });
    });
  }
};

Router.register('picking-lista', PickingListaView);


// ============================================================
// VISTA: PICKING GUIADO (item por item)
// ============================================================

const PickingView = {
  title: 'Picking guiado',
  _items: [],
  _despacho: null,
  _index: 0,

  render(params) {
    if (!params || !params.despachoId) {
      return '<div class="empty-state">Despacho no especificado.</div>';
    }
    return `<div id="picking-content"><div class="loading">Cargando despacho...</div></div>`;
  },

  async afterRender(params) {
    const { despacho, items } = await obtenerDespachoConItems(params.despachoId);

    if (!despacho) {
      document.getElementById('picking-content').innerHTML = '<div class="empty-state">No se pudo cargar el despacho.</div>';
      return;
    }

    this._despacho = despacho;
    this._items = items;
    this._index = items.findIndex(it => !it.observaciones || !it.observaciones.startsWith('PICKEADO'));
    if (this._index === -1) this._index = items.length;

    this.renderEstado();
  },

  renderEstado() {
    const cont = document.getElementById('picking-content');
    const total = this._items.length;
    const completados = this._items.filter(it => it.observaciones && it.observaciones.startsWith('PICKEADO')).length;
    const pct = total > 0 ? Math.round((completados / total) * 100) : 0;

    let bodyHtml = '';

    if (this._index >= total) {
      // Todo pickeado
      bodyHtml = `
        <div class="card" style="text-align:center; padding:24px;">
          <p style="font-size:15px; font-weight:600; margin:0 0 6px;">Picking completado</p>
          <p style="font-size:13px; color:var(--text-secondary); margin:0 0 16px;">
            ${completados} de ${total} ítems pickeados para ${escapeHtml(this._despacho.gr || 'este despacho')}.
          </p>
          <button class="btn-primary" id="btn-finalizar">Finalizar despacho</button>
        </div>
      `;
    } else {
      const item = this._items[this._index];

      bodyHtml = `
        <div class="picking-item-card">
          <div>
            <p style="font-size:11px; color:var(--text-tertiary); margin:0 0 4px; text-transform:uppercase; font-weight:600; letter-spacing:0.04em;">Ítem ${this._index + 1} de ${total}</p>
            <p class="picking-sku">${escapeHtml(item.sku)}</p>
            <p style="font-size:13px; color:var(--text-secondary); margin:4px 0 0;">${escapeHtml(item.descripcion || '')}</p>
          </div>

          ${item.encontrado === false ? `
            <div class="hint-box" style="background:var(--danger-bg);">
              <svg viewBox="0 0 24 24" stroke="#C0362C"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style="color:var(--danger-text);">Este SKU no se encontró en el stock disponible. Verifica con Logística antes de continuar.</p>
            </div>
          ` : `
            <div class="picking-loc">
              <div class="loc-badge">
                <div style="font-size:10px; opacity:0.7; margin-bottom:2px;">UBICACIÓN</div>
                ${escapeHtml(item.ubicacion_fisica || 'Sin asignar')}
              </div>
              <div class="loc-badge">
                <div style="font-size:10px; opacity:0.7; margin-bottom:2px;">PALETA / PEDIDO</div>
                ${escapeHtml(item.paleta_pedido || '-')}
              </div>
            </div>
          `}

          <div class="field">
            <label>Cantidad solicitada: <b>${formatNum(item.cantidad)}</b></label>
            <label style="margin-top:6px;">Cantidad pickeada</label>
            <input type="number" id="cant-pickeada" value="${item.cantidad}" min="0" step="any" />
          </div>

          ${item.serie ? `
            <div class="field">
              <label>Serie esperada</label>
              <input type="text" value="${escapeHtml(item.serie)}" readonly style="background:var(--bg-secondary);" />
            </div>
          ` : ''}

          <button class="btn-primary" id="btn-confirmar">Confirmar y continuar</button>
          <button class="btn-secondary" id="btn-omitir">Omitir / reportar diferencia</button>
        </div>
      `;
    }

    cont.innerHTML = `
      <div class="card" style="padding:12px 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <p class="picking-progress">${escapeHtml(this._despacho.gr || 'Despacho')} · ${escapeHtml(this._despacho.destino || '')}</p>
          <p class="picking-progress">${completados}/${total}</p>
        </div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
      </div>
      ${bodyHtml}
    `;

    const btnConfirmar = document.getElementById('btn-confirmar');
    if (btnConfirmar) btnConfirmar.addEventListener('click', () => this.confirmarItem());

    const btnOmitir = document.getElementById('btn-omitir');
    if (btnOmitir) btnOmitir.addEventListener('click', () => this.omitirItem());

    const btnFinalizar = document.getElementById('btn-finalizar');
    if (btnFinalizar) btnFinalizar.addEventListener('click', () => this.finalizar());
  },

  async confirmarItem() {
    const item = this._items[this._index];
    const cantInput = document.getElementById('cant-pickeada');
    const cantidad = Number(cantInput.value);

    if (!cantidad || cantidad < 0) {
      alert('Ingresa una cantidad válida.');
      return;
    }

    if (item.encontrado !== false && item.stock_id) {
      const { error } = await confirmarPicking(item.id, item.stock_id, cantidad);
      if (error) {
        alert('Error al registrar el picking. Intenta de nuevo.');
        return;
      }
      this._items[this._index].observaciones = 'PICKEADO: ' + cantidad;
    } else {
      this._items[this._index].observaciones = 'PICKEADO: ' + cantidad + ' (no encontrado en stock)';
    }

    this._index++;
    this.renderEstado();
  },

  omitirItem() {
    this._items[this._index].observaciones = 'OMITIDO';
    this._index++;
    this.renderEstado();
  },

  async finalizar() {
    await finalizarDespacho(this._despacho.id);
    Router.navigate('picking-lista');
  }
};

Router.register('picking', PickingView);
