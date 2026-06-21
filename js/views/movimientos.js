// ============================================================
// VISTA: MOVIMIENTOS DE UBICACION
// Buscador con lista desplegable real (igual que Consulta) en
// ambos modos: para el item/paleta a mover y para la nueva
// ubicacion destino.
// ============================================================

const MovimientosView = {
  title: 'Movimientos',
  _modo: 'item',
  _itemSeleccionado: null,
  _paletaSeleccionada: null,
  _ubicacionDestino: null,
  _ubicacionDestinoPaleta: null,
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
        this._paletaSeleccionada = null;
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
            <input id="mov-buscador" type="text" autocomplete="off" />
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
          <p class="card-title">Buscar paleta o pedido</p>
          <div class="suggestions-wrap">
            <div class="search-bar">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input id="mov-paleta-buscador" type="text" autocomplete="off" />
            </div>
            <div id="mov-paleta-sugerencias" class="suggestions"></div>
          </div>
        </div>
        <div id="mov-paleta-seleccion" style="margin-top:12px;"></div>
      `;

      const buscadorPaleta = document.getElementById('mov-paleta-buscador');
      buscadorPaleta.addEventListener('input', () => {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => this.buscarPaletaMov(), 300);
      });
      buscadorPaleta.addEventListener('focus', () => this.buscarPaletaMov());
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
      sugDiv.innerHTML = `<div class="suggestion-item-empty">Sin resultados</div>`;
      sugDiv.style.display = 'block';
      return;
    }

    sugDiv.innerHTML = data.map(item => `
      <div class="suggestion-item" data-id="${item.id}">
        <b>${escapeHtml(item.sku)}</b> — ${escapeHtml((item.descripcion || '').slice(0,40))}
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
        document.getElementById('mov-buscador').value = `${data[i].sku} — ${data[i].paleta_pedido || ''}`;
        this.renderSeleccion();
      });
    });
  },

  renderSeleccion() {
    const cont = document.getElementById('mov-seleccion');
    const item = this._itemSeleccionado;

    if (!item) { cont.innerHTML = ''; return; }

    cont.innerHTML = `
      <div class="card">
        <p class="card-title">Ítem seleccionado</p>
        <p style="font-size:14px; font-weight:600; margin:0 0 4px;">${escapeHtml(item.sku)}</p>
        <p style="font-size:12px; color:var(--text-secondary); margin:0 0 10px;">${escapeHtml(item.descripcion || '')}</p>
        <div style="display:flex; gap:14px; font-size:12px; margin-bottom:12px;">
          <span><span style="color:var(--text-tertiary);">Paleta/Ped:</span> <b>${escapeHtml(item.paleta_pedido || '-')}</b></span>
          <span><span style="color:var(--text-tertiary);">Ubic. actual:</span> <b>${escapeHtml(item.ubicacion_fisica || 'sin ubicación')}</b></span>
        </div>
        <div class="field">
          <label>Nueva ubicación física</label>
          <div class="suggestions-wrap">
            <input type="text" id="mov-nueva-ubic" autocomplete="off" />
            <div id="mov-ubic-sugerencias" class="suggestions"></div>
          </div>
        </div>
        <button class="btn-primary" id="btn-mover-item" style="margin-top:12px;">Confirmar movimiento</button>
        <div id="msg-mov-item"></div>
      </div>
    `;

    this._ubicacionDestino = null;
    const inputUbic = document.getElementById('mov-nueva-ubic');
    inputUbic.addEventListener('input', () => {
      this._ubicacionDestino = null;
      clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(() => this.buscarUbicacionDestino('mov-nueva-ubic', 'mov-ubic-sugerencias', (codigo) => { this._ubicacionDestino = codigo; }), 250);
    });

    document.getElementById('btn-mover-item').addEventListener('click', () => this.moverItem());
  },

  async buscarUbicacionDestino(inputId, sugId, onSelect) {
    const texto = document.getElementById(inputId).value.trim();
    const sugDiv = document.getElementById(sugId);

    if (!texto) { sugDiv.style.display = 'none'; return; }

    const ubicaciones = await buscarUbicacionesReales(texto);

    if (ubicaciones.length === 0) {
      sugDiv.innerHTML = `<div class="suggestion-item-empty">Sin ubicaciones que coincidan. Puedes escribir una nueva.</div>`;
      sugDiv.style.display = 'block';
      return;
    }

    sugDiv.innerHTML = ubicaciones.map(u => `
      <div class="suggestion-item" data-codigo="${escapeHtml(u.codigo)}">
        <b>${escapeHtml(u.codigo)}</b>
        <div style="font-size:11px; color:var(--text-tertiary);">Zona ${escapeHtml(u.zona)} · Pasillo ${escapeHtml(u.pasillo)}</div>
      </div>
    `).join('');
    sugDiv.style.display = 'block';

    sugDiv.querySelectorAll('.suggestion-item').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById(inputId).value = el.dataset.codigo;
        sugDiv.style.display = 'none';
        onSelect(el.dataset.codigo);
      });
    });
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

  async buscarPaletaMov() {
    const texto = document.getElementById('mov-paleta-buscador').value.trim();
    const sugDiv = document.getElementById('mov-paleta-sugerencias');

    if (!texto || texto.length < 2) { sugDiv.style.display = 'none'; return; }

    const resultados = await buscarPaletasOPedidos(texto);

    if (resultados.length === 0) {
      sugDiv.innerHTML = `<div class="suggestion-item-empty">Sin resultados</div>`;
      sugDiv.style.display = 'block';
      return;
    }

    sugDiv.innerHTML = resultados.map(r => `
      <div class="suggestion-item" data-paleta="${escapeHtml(r.paleta_pedido)}">
        <b>${escapeHtml(r.paleta_pedido)}</b>
        <div style="font-size:11px; color:var(--text-tertiary); margin-top:2px;">
          ${escapeHtml(r.ubicacion_fisica || 'sin ubicación')} · ${r.cantidadItems} ítem(s)
        </div>
      </div>
    `).join('');
    sugDiv.style.display = 'block';

    sugDiv.querySelectorAll('.suggestion-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        this._paletaSeleccionada = resultados[i];
        sugDiv.style.display = 'none';
        document.getElementById('mov-paleta-buscador').value = resultados[i].paleta_pedido;
        this.renderSeleccionPaleta();
      });
    });
  },

  renderSeleccionPaleta() {
    const cont = document.getElementById('mov-paleta-seleccion');
    const p = this._paletaSeleccionada;

    if (!p) { cont.innerHTML = ''; return; }

    cont.innerHTML = `
      <div class="card">
        <p class="card-title">Paleta/pedido seleccionado</p>
        <p style="font-size:14px; font-weight:600; margin:0 0 4px;">${escapeHtml(p.paleta_pedido)}</p>
        <p style="font-size:12px; color:var(--text-secondary); margin:0 0 12px;">${p.cantidadItems} ítem(s) · Ubicación actual: ${escapeHtml(p.ubicacion_fisica || 'sin ubicación')}</p>
        <div class="field">
          <label>Nueva ubicación física</label>
          <div class="suggestions-wrap">
            <input type="text" id="mov-nueva-ubic-paleta" autocomplete="off" />
            <div id="mov-ubic-paleta-sugerencias" class="suggestions"></div>
          </div>
        </div>
        <button class="btn-primary" id="btn-mover-paleta" style="margin-top:12px;">Mover paleta completa</button>
        <div id="msg-mov-paleta"></div>
      </div>
      <div class="hint-box" style="margin-top:10px;">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>Esto actualizará la ubicación física de todos los ítems registrados bajo esa paleta o pedido.</p>
      </div>
    `;

    this._ubicacionDestinoPaleta = null;
    const inputUbic = document.getElementById('mov-nueva-ubic-paleta');
    inputUbic.addEventListener('input', () => {
      this._ubicacionDestinoPaleta = null;
      clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(() => this.buscarUbicacionDestino('mov-nueva-ubic-paleta', 'mov-ubic-paleta-sugerencias', (codigo) => { this._ubicacionDestinoPaleta = codigo; }), 250);
    });

    document.getElementById('btn-mover-paleta').addEventListener('click', () => this.moverPaleta());
  },

  async moverPaleta() {
    const paleta = this._paletaSeleccionada ? this._paletaSeleccionada.paleta_pedido : '';
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
