// ============================================================
// MOVIMIENTOS — Mover ítem o paleta completa
// ============================================================
const MovimientosView = {
  title: 'Movimientos',
  _modo: 'item', // 'item' | 'paleta'
  _resultados: [],

  render() {
    return `
      <div class="card">
        <div class="chips" style="margin-bottom:12px;">
          <button class="chip active" id="tab-item-mov">Por ítem</button>
          <button class="chip" id="tab-paleta-mov">Paleta completa</button>
        </div>
        <div id="panel-item-mov">${this._renderPanelItem()}</div>
        <div id="panel-paleta-mov" style="display:none;">${this._renderPanelPaleta()}</div>
      </div>
    `;
  },

  afterRender() {
    document.getElementById('tab-item-mov').addEventListener('click', () => {
      this._modo = 'item';
      document.getElementById('tab-item-mov').classList.add('active');
      document.getElementById('tab-paleta-mov').classList.remove('active');
      document.getElementById('panel-item-mov').style.display = '';
      document.getElementById('panel-paleta-mov').style.display = 'none';
    });
    document.getElementById('tab-paleta-mov').addEventListener('click', () => {
      this._modo = 'paleta';
      document.getElementById('tab-paleta-mov').classList.add('active');
      document.getElementById('tab-item-mov').classList.remove('active');
      document.getElementById('panel-paleta-mov').style.display = '';
      document.getElementById('panel-item-mov').style.display = 'none';
    });

    document.getElementById('btn-buscar-item-mov')?.addEventListener('click', () => this._buscarItem());
    document.getElementById('btn-mover-paleta')?.addEventListener('click', () => this._moverPaleta());
  },

  _renderPanelItem() {
    return `
      <p class="card-title">Mover ítem individual</p>
      <div class="field"><label>SKU o serie del ítem</label>
        <input id="busq-item-mov" type="text" style="font-family:monospace;" autocomplete="off">
      </div>
      <button class="btn-secondary" id="btn-buscar-item-mov" style="width:100%; margin-bottom:12px;">Buscar</button>
      <div id="resultado-item-mov"></div>
    `;
  },

  _renderPanelPaleta() {
    return `
      <p class="card-title">Mover paleta completa</p>
      <div class="field"><label>N° Paleta o Pedido</label>
        <input id="pp-paleta-mov" type="text" autocomplete="off">
      </div>
      <div class="field"><label>Nueva ubicación</label>
        <input id="ubic-paleta-mov" type="text" autocomplete="off">
      </div>
      <button class="btn-primary" id="btn-mover-paleta" style="width:100%;">Mover paleta completa</button>
      <div id="msg-paleta-mov" style="margin-top:8px;"></div>
    `;
  },

  async _buscarItem() {
    const texto = document.getElementById('busq-item-mov').value.trim();
    const cont = document.getElementById('resultado-item-mov');
    if (!texto) { cont.innerHTML = '<p class="msg-error">Ingresa un SKU o serie.</p>'; return; }

    cont.innerHTML = '<div class="empty-state">Buscando…</div>';
    const resultados = await buscarStockAvanzado({ sku: texto, serie: texto, estado: 'DISPONIBLE', limit: 20 });

    if (!resultados.length) {
      cont.innerHTML = '<div class="empty-state">No se encontraron ítems disponibles.</div>';
      return;
    }

    cont.innerHTML = resultados.map((r, i) => `
      <div class="recep-item" id="mov-r-${r.id}">
        <div style="margin-bottom:8px;">
          <span class="pick-item-sku">${escapeHtml(r.sku)}</span>
          <span style="font-size:11px; color:var(--text-secondary); margin-left:8px;">${escapeHtml(r.descripcion || '')}</span>
        </div>
        <div class="pick-item-meta" style="margin-bottom:8px;">
          ${r.serie ? `<span class="pick-meta-tag">Serie: ${escapeHtml(r.serie)}</span>` : ''}
          <span class="pick-meta-tag">Cant: ${formatNum(r.cantidad)}</span>
          <span class="pick-meta-tag">Paleta: ${escapeHtml(r.paleta_pedido || '-')}</span>
          <span class="pick-meta-tag">Ubic: ${escapeHtml(r.ubicacion_fisica || 'Sin ubic.')}</span>
        </div>
        <div class="field-grid">
          <div class="field"><label>Nueva ubicación</label>
            <input id="nueva-ubic-${r.id}" type="text" value="${escapeHtml(r.ubicacion_fisica || '')}">
          </div>
          <div style="display:flex; align-items:flex-end;">
            <button class="btn-primary" style="width:100%; padding:9px;" data-mover="${r.id}">Mover</button>
          </div>
        </div>
        <div id="msg-mov-${r.id}"></div>
      </div>
    `).join('');

    cont.querySelectorAll('[data-mover]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.mover;
        const nuevaUbic = document.getElementById(`nueva-ubic-${id}`).value.trim();
        const msgEl = document.getElementById(`msg-mov-${id}`);
        if (!nuevaUbic) { msgEl.innerHTML = '<p class="msg-error">Ingresa la nueva ubicación.</p>'; return; }
        btn.disabled = true; btn.textContent = 'Moviendo…';
        const { error } = await moverUbicacion(Number(id), nuevaUbic);
        if (error) {
          msgEl.innerHTML = '<p class="msg-error">Error al mover. Intenta de nuevo.</p>';
          btn.disabled = false; btn.textContent = 'Mover';
        } else {
          msgEl.innerHTML = `<p class="msg-ok">✓ Movido a ${escapeHtml(nuevaUbic)}</p>`;
          btn.textContent = '✓ Movido'; btn.disabled = true;
        }
      });
    });
  },

  async _moverPaleta() {
    const pp = document.getElementById('pp-paleta-mov').value.trim();
    const ubic = document.getElementById('ubic-paleta-mov').value.trim();
    const msg = document.getElementById('msg-paleta-mov');
    if (!pp) { msg.innerHTML = '<p class="msg-error">Ingresa el número de paleta o pedido.</p>'; return; }
    if (!ubic) { msg.innerHTML = '<p class="msg-error">Ingresa la nueva ubicación.</p>'; return; }

    const btn = document.getElementById('btn-mover-paleta');
    btn.disabled = true; btn.textContent = 'Moviendo…';

    const { error, count } = await moverPaletaCompleta(pp, ubic);
    btn.disabled = false; btn.textContent = 'Mover paleta completa';

    if (error) {
      msg.innerHTML = `<p class="msg-error">Error al mover la paleta.</p>`;
    } else {
      msg.innerHTML = `<p class="msg-ok">✓ ${count || 'Todos los'} ítems movidos a ${escapeHtml(ubic)}</p>`;
    }
  }
};

Router.register('movimientos', MovimientosView);
