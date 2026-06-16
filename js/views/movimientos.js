// ============================================================
// VISTA: MOVIMIENTOS DE UBICACION
// ============================================================

const MovimientosView = {
  title: 'Movimientos',
  _modo: 'item', // 'item' o 'paleta'
  _itemSeleccionado: null,
  _searchTimeout: null,

  render() {
    return `
      <div class="chips">
        <button class="chip active" data-modo="item">Mover ítem</button>
        <button class="chip" data-modo="paleta">Mover paleta/pedido completo</button>
      </div>

      <div id="modo-content"></div>
    `;
  },

  afterRender() {
    this._modo = 'item';
    document.querySelectorAll('[data-modo]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('[data-modo]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this._modo = chip.dataset.modo;
        this._itemSeleccionado = null;
        this.renderModo();
      });
    });
    this.renderModo();
  },

  renderModo() {
    const cont = document.getElementById('modo-content');

    if (this._modo === 'item') {
      cont.innerHTML = `
        <div class="suggestions-wrap" style="margin-top:12px;">
          <div class="search-bar">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <input id="mov-buscador" type="text" placeholder="Buscar SKU, serie o paleta" autocomplete="off" />
          </div>
          <div id="mov-sugerencias" class="suggestions"></div>
        </div>
        <div id="mov-seleccion" style="margin-top:12px;"></div>
      `;

      const buscador = document.getElementById('mov-buscador');
      buscador.addEventListener('input', () => {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => this.buscarItemMov(), 300);
      });
      buscador.addEventListener('focus', () => this.buscarItemMov());

    } else {
      cont.innerHTML = `
        <div class="card" style="margin-top:12px;">
          <p class="card-title">Mover paleta o pedido completo</p>
          <div class="field">
            <label>N° de paleta o pedido</label>
            <input type="text" id="mov-paleta" placeholder="Ej: PALETA 160" />
          </div>
          <div class="field" style="margin-top:10px;">
            <label>Nueva ubicación física</label>
            <input type="text" id="mov-nueva-ubic-paleta" placeholder="Ej: B-01-02" />
          </div>
          <button class="btn-primary" id="btn-mover-paleta" style="margin-top:12px;">Mover paleta completa</button>
          <div id="msg-mov-paleta"></div>
        </div>
        <div class="hint-box" style="margin-top:10px;">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <p>Esto actualizará la ubicación física de todos los ítems registrados bajo esa paleta o pedido.</p>
        </div>
      `;

      document.getElementById('btn-mover-paleta').addEventListener('click', () => this.moverPaleta());
    }
  },

  async buscarItemMov() {
    const texto = document.getElementById('mov-buscador').value.trim();
    const sugDiv = document.getElementById('mov-sugerencias');

    if (!texto || texto.length < 2) {
      sugDiv.style.display = 'none';
      return;
    }

    const { data } = await buscarStock({ texto, limit: 10 });

    if (!data || data.length === 0) {
      sugDiv.style.display = 'none';
      return;
    }

    sugDiv.innerHTML = data.map(item => `
      <div class="suggestion-item" data-id="${item.id}">
        <b>${escapeHtml(item.sku)}</b> — ${escapeHtml(item.descripcion || '').slice(0,40)}
        <div style="font-size:11px; color:var(--text-tertiary); margin-top:2px;">
          ${escapeHtml(item.paleta_pedido || '-')} · ${escapeHtml(item.ubicacion_fisica || 'sin ubicación')} · Cant: ${formatNum(item.cantidad)}
        </div>
      </div>
    `).join('');
    sugDiv.style.display = 'block';

    sugDiv.querySelectorAll('.suggestion-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        this._itemSeleccionado = data[i];
        sugDiv.style.display = 'none';
        document.getElementById('mov-buscador').value = '';
        this.renderSeleccion();
      });
    });
  },

  renderSeleccion() {
    const cont = document.getElementById('mov-seleccion');
    const item = this._itemSeleccionado;

    if (!item) {
      cont.innerHTML = '';
      return;
    }

    cont.innerHTML = `
      <div class="card">
        <p class="card-title">Ítem seleccionado</p>
        <p style="font-size:14px; font-weight:600; margin:0 0 4px;">${escapeHtml(item.sku)}</p>
        <p style="font-size:12px; color:var(--text-secondary); margin:0 0 10px;">${escapeHtml(item.descripcion || '')}</p>
        <div class="stock-meta" style="margin-bottom:12px;">
          <span><span class="meta-label">Paleta/Ped:</span> <b>${escapeHtml(item.paleta_pedido || '-')}</b></span>
          <span><span class="meta-label">Ubic. actual:</span> <b>${escapeHtml(item.ubicacion_fisica || 'sin ubicación')}</b></span>
        </div>
        <div class="field">
          <label>Nueva ubicación física</label>
          <input type="text" id="mov-nueva-ubic" placeholder="Ej: A-01-01-03" />
        </div>
        <button class="btn-primary" id="btn-mover-item" style="margin-top:12px;">Confirmar movimiento</button>
        <div id="msg-mov-item"></div>
      </div>
    `;

    document.getElementById('btn-mover-item').addEventListener('click', () => this.moverItem());
  },

  async moverItem() {
    const item = this._itemSeleccionado;
    const nuevaUbic = document.getElementById('mov-nueva-ubic').value.trim();
    const msg = document.getElementById('msg-mov-item');
    const btn = document.getElementById('btn-mover-item');

    if (!nuevaUbic) {
      msg.innerHTML = '<p style="color:var(--danger-text); font-size:12px; margin:8px 0 0;">Ingresa la nueva ubicación.</p>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Moviendo...';

    const { error } = await moverUbicacion(item.id, nuevaUbic);

    btn.disabled = false;
    btn.textContent = 'Confirmar movimiento';

    if (error) {
      msg.innerHTML = '<p style="color:var(--danger-text); font-size:12px; margin:8px 0 0;">Error al mover. Intenta de nuevo.</p>';
      return;
    }

    msg.innerHTML = `<p style="color:var(--success-text); font-size:12px; margin:8px 0 0;">Movido a ${escapeHtml(nuevaUbic)} correctamente.</p>`;
    this._itemSeleccionado.ubicacion_fisica = nuevaUbic;
    setTimeout(() => this.renderSeleccion(), 1200);
  },

  async moverPaleta() {
    const paleta = document.getElementById('mov-paleta').value.trim();
    const nuevaUbic = document.getElementById('mov-nueva-ubic-paleta').value.trim();
    const msg = document.getElementById('msg-mov-paleta');
    const btn = document.getElementById('btn-mover-paleta');

    if (!paleta || !nuevaUbic) {
      msg.innerHTML = '<p style="color:var(--danger-text); font-size:12px; margin:8px 0 0;">Completa ambos campos.</p>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Moviendo...';

    const { error, actualizados } = await moverPaletaCompleta(paleta, nuevaUbic);

    btn.disabled = false;
    btn.textContent = 'Mover paleta completa';

    if (error) {
      msg.innerHTML = '<p style="color:var(--danger-text); font-size:12px; margin:8px 0 0;">Error al mover. Intenta de nuevo.</p>';
      return;
    }

    if (actualizados === 0) {
      msg.innerHTML = '<p style="color:var(--warning-text); font-size:12px; margin:8px 0 0;">No se encontraron ítems con esa paleta/pedido.</p>';
      return;
    }

    msg.innerHTML = `<p style="color:var(--success-text); font-size:12px; margin:8px 0 0;">${actualizados} ítem(s) movidos a ${escapeHtml(nuevaUbic)}.</p>`;
  }
};

Router.register('movimientos', MovimientosView);
