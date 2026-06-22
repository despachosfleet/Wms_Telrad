// ============================================================
// MOVIMIENTOS — Buscar primero, mover después
// El operario siempre ve qué ítem está moviendo antes de confirmar
// ============================================================

const MovimientosView = {
  title: 'Movimientos',
  _modo: 'item',

  render() {
    return `
      <div class="card">
        <div class="chips" style="margin-bottom:14px;">
          <button class="chip active" id="tab-mov-item">Por ítem / serie</button>
          <button class="chip" id="tab-mov-paleta">Paleta / pedido completo</button>
          <button class="chip" id="tab-mov-ubic">Por ubicación</button>
        </div>
        <div id="panel-mov-item">${this._renderPanelItem()}</div>
        <div id="panel-mov-paleta" style="display:none;">${this._renderPanelPaleta()}</div>
        <div id="panel-mov-ubic" style="display:none;">${this._renderPanelUbic()}</div>
      </div>
    `;
  },

  afterRender() {
    const tabs = [
      { btn: 'tab-mov-item',   panel: 'panel-mov-item',   modo: 'item' },
      { btn: 'tab-mov-paleta', panel: 'panel-mov-paleta', modo: 'paleta' },
      { btn: 'tab-mov-ubic',   panel: 'panel-mov-ubic',   modo: 'ubic' },
    ];
    tabs.forEach(t => {
      document.getElementById(t.btn)?.addEventListener('click', () => {
        tabs.forEach(x => {
          document.getElementById(x.btn)?.classList.remove('active');
          const p = document.getElementById(x.panel);
          if (p) p.style.display = 'none';
        });
        document.getElementById(t.btn)?.classList.add('active');
        const panel = document.getElementById(t.panel);
        if (panel) panel.style.display = '';
        this._modo = t.modo;
      });
    });

    document.getElementById('btn-buscar-mov-item')?.addEventListener('click', () => this._buscarItem());
    document.getElementById('btn-buscar-mov-paleta')?.addEventListener('click', () => this._buscarPaleta());
    document.getElementById('btn-buscar-mov-ubic')?.addEventListener('click', () => this._buscarUbic());

    ['busq-mov-item','busq-mov-paleta','busq-mov-ubic'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          if (id.includes('item')) this._buscarItem();
          else if (id.includes('paleta')) this._buscarPaleta();
          else this._buscarUbic();
        }
      });
    });
  },

  _renderPanelItem() {
    return `
      <p class="card-title">Mover ítem individual</p>
      <p class="card-subtitle">Busca por SKU, serie o código. Verás el ítem antes de moverlo.</p>
      <div class="field-grid">
        <div class="field">
          <label>Buscar (SKU, serie o descripción)</label>
          <input id="busq-mov-item" type="text" autocomplete="off">
        </div>
        <div style="display:flex; align-items:flex-end; padding-bottom:12px;">
          <button class="btn-secondary" id="btn-buscar-mov-item" style="width:100%;">Buscar</button>
        </div>
      </div>
      <div id="resultado-mov-item"></div>
    `;
  },

  _renderPanelPaleta() {
    return `
      <p class="card-title">Mover paleta/pedido completo</p>
      <p class="card-subtitle">Mueve todos los ítems de un pedido o paleta a una nueva ubicación.</p>
      <div class="field">
        <label>Número de paleta o pedido</label>
        <input id="busq-mov-paleta" type="text" autocomplete="off">
      </div>
      <button class="btn-secondary" id="btn-buscar-mov-paleta">Ver ítems</button>
      <div id="resultado-mov-paleta"></div>
    `;
  },

  _renderPanelUbic() {
    return `
      <p class="card-title">Mover desde una ubicación</p>
      <p class="card-subtitle">Ve qué hay en una ubicación y mueve todo a otra.</p>
      <div class="field">
        <label>Ubicación actual</label>
        <input id="busq-mov-ubic" type="text" autocomplete="off" placeholder="">
      </div>
      <button class="btn-secondary" id="btn-buscar-mov-ubic">Ver contenido</button>
      <div id="resultado-mov-ubic"></div>
    `;
  },

  async _buscarItem() {
    const q    = document.getElementById('busq-mov-item')?.value.trim();
    const cont = document.getElementById('resultado-mov-item');
    if (!q) return;
    cont.innerHTML = '<p class="msg-warning">Buscando…</p>';
    const { data } = await buscarStockAvanzado({ sku: q, serie: q, descripcion: q, estado: 'DISPONIBLE', limit: 20 });
    if (!data?.length) { cont.innerHTML = '<div class="alert alert-warning">No se encontraron ítems disponibles.</div>'; return; }
    this._renderResultadoItems(cont, data, 'item');
  },

  async _buscarPaleta() {
    const q    = document.getElementById('busq-mov-paleta')?.value.trim();
    const cont = document.getElementById('resultado-mov-paleta');
    if (!q) return;
    cont.innerHTML = '<p class="msg-warning">Buscando…</p>';
    const { data } = await buscarStockAvanzado({ paleta: q, limit: 100 });
    if (!data?.length) { cont.innerHTML = '<div class="alert alert-warning">No se encontraron ítems con ese pedido/paleta.</div>'; return; }

    const ubicActual = data[0].ubicacion_fisica || 'Sin ubicación asignada';
    cont.innerHTML = `
      <div class="card" style="margin-top:10px;">
        <p class="card-title">${data.length} ítems encontrados</p>
        <p class="card-subtitle">Pedido/Paleta: <strong>${escapeHtml(q)}</strong> · Ubicación actual: <strong>${escapeHtml(ubicActual)}</strong></p>
        <div class="table-wrap" style="margin-bottom:12px;">
          <table class="data-table">
            <thead><tr><th>SKU</th><th>Descripción</th><th>Cant.</th><th>Serie</th><th>Ubicación</th></tr></thead>
            <tbody>
              ${data.slice(0,20).map(r => `
                <tr>
                  <td class="sku-cell">${escapeHtml(r.sku)}</td>
                  <td class="wrap" style="font-size:10px;">${escapeHtml((r.descripcion||'').substring(0,50))}</td>
                  <td>${formatNum(r.cantidad)}</td>
                  <td style="font-family:monospace; font-size:10px;">${escapeHtml(r.serie||'-')}</td>
                  <td>${escapeHtml(r.ubicacion_fisica||'-')}</td>
                </tr>
              `).join('')}
              ${data.length > 20 ? `<tr><td colspan="5" style="text-align:center; font-size:11px; color:var(--text-tertiary);">… y ${data.length - 20} más</td></tr>` : ''}
            </tbody>
          </table>
        </div>
        <div class="field">
          <label>Nueva ubicación para TODOS los ítems</label>
          <input id="nueva-ubic-paleta" type="text" autocomplete="off">
        </div>
        <button class="btn-primary" id="btn-confirmar-mov-paleta">Mover ${data.length} ítems</button>
        <div id="msg-mov-paleta" style="margin-top:8px;"></div>
      </div>
    `;
    document.getElementById('btn-confirmar-mov-paleta')?.addEventListener('click', async () => {
      const nuevaUbic = document.getElementById('nueva-ubic-paleta')?.value.trim();
      const msg = document.getElementById('msg-mov-paleta');
      if (!nuevaUbic) { msg.innerHTML = '<p class="msg-error">Ingresa la nueva ubicación.</p>'; return; }
      const btn = document.getElementById('btn-confirmar-mov-paleta');
      btn.disabled = true; btn.textContent = 'Moviendo…';
      const { error } = await moverPaletaCompleta(q, nuevaUbic);
      msg.innerHTML = error
        ? '<p class="msg-error">Error al mover. Intenta de nuevo.</p>'
        : `<p class="msg-ok">✓ ${data.length} ítems movidos a ${escapeHtml(nuevaUbic)}</p>`;
      btn.textContent = error ? 'Reintentar' : '✓ Movido';
      btn.disabled = false;
    });
  },

  async _buscarUbic() {
    const q    = document.getElementById('busq-mov-ubic')?.value.trim();
    const cont = document.getElementById('resultado-mov-ubic');
    if (!q) return;
    cont.innerHTML = '<p class="msg-warning">Buscando…</p>';
    const { data } = await buscarStockAvanzado({ ubic: q, limit: 100 });
    if (!data?.length) { cont.innerHTML = '<div class="alert alert-warning">No hay ítems en esa ubicación.</div>'; return; }
    this._renderResultadoItems(cont, data, 'ubic', q);
  },

  _renderResultadoItems(cont, data, modo, ubiActual) {
    cont.innerHTML = `
      <div style="margin-top:10px;">
        <p style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">
          ${data.length} ítem${data.length !== 1 ? 's' : ''} encontrado${data.length !== 1 ? 's' : ''}
          ${ubiActual ? ` en <strong>${escapeHtml(ubiActual)}</strong>` : ''}
        </p>
        ${data.map(r => `
          <div class="recep-item" id="movr-${r.id}">
            <div class="recep-item-header">
              <div style="flex:1; min-width:0;">
                <span class="sku-cell" style="font-size:13px;">${escapeHtml(r.sku)}</span>
                <div style="font-size:10px; color:var(--text-secondary); margin-top:2px;">
                  ${escapeHtml((r.descripcion||'').substring(0,60))}
                </div>
              </div>
              <div style="text-align:right; flex-shrink:0;">
                <div style="font-size:14px; font-weight:800; color:var(--accent);">${formatNum(r.cantidad)}</div>
                <div style="font-size:10px; color:var(--text-tertiary);">${escapeHtml(r.unidad_medida||'')}</div>
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px;">
              ${r.serie ? `<span class="pick-meta-tag">🔖 ${escapeHtml(r.serie)}</span>` : ''}
              ${r.paleta_pedido ? `<span class="pick-meta-tag">📦 ${escapeHtml(r.paleta_pedido)}</span>` : ''}
              <span class="pick-meta-tag">📍 ${escapeHtml(r.ubicacion_fisica||'Sin ubicación')}</span>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" id="nueva-ubic-${r.id}"
                value="${escapeHtml(r.ubicacion_fisica||'')}"
                placeholder="Nueva ubicación"
                style="flex:1; background:var(--bg-input); border:1.5px solid var(--border-strong); border-radius:4px; padding:7px 10px; font-size:12px;">
              <button class="btn-primary" style="padding:7px 14px; font-size:12px;" data-mover-item="${r.id}">Mover</button>
            </div>
            <div id="msg-mov-${r.id}"></div>
          </div>
        `).join('')}
      </div>
    `;

    cont.querySelectorAll('[data-mover-item]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.moverItem);
        const nuevaUbic = document.getElementById(`nueva-ubic-${id}`)?.value.trim();
        const msg = document.getElementById(`msg-mov-${id}`);
        if (!nuevaUbic) { msg.innerHTML = '<p class="msg-error">Ingresa la nueva ubicación.</p>'; return; }
        btn.disabled = true; btn.textContent = 'Moviendo…';
        const { error } = await moverUbicacion(id, nuevaUbic);
        if (error) {
          msg.innerHTML = '<p class="msg-error">Error al mover.</p>';
          btn.disabled = false; btn.textContent = 'Mover';
        } else {
          msg.innerHTML = `<p class="msg-ok">✓ Movido a ${escapeHtml(nuevaUbic)}</p>`;
          btn.textContent = '✓'; btn.className = 'btn-ghost'; btn.disabled = true;
          // Actualizar tag de ubicación visible
          const tags = document.getElementById(`movr-${id}`)?.querySelectorAll('.pick-meta-tag');
          tags?.forEach(t => { if (t.textContent.includes('📍')) t.textContent = `📍 ${nuevaUbic}`; });
        }
      });
    });
  }
};

Router.register('movimientos', MovimientosView);
