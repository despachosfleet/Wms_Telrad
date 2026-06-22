// ============================================================
// RECEPCIÓN — Registrar ingreso de mercadería
// Mobile-first: campos claros, sin placeholders confusos
// ============================================================
const RecepcionView = {
  title: 'Recepción',
  _items: [],

  render() {
    return `
      <div class="card">
        <p class="card-title">Datos del ingreso</p>
        <div class="field-grid">
          <div class="field"><label>N° Pedido / Paleta</label><input id="r-pedido" type="text" style="font-family:monospace;"></div>
          <div class="field"><label>Cliente</label>
            <select id="r-cliente">
              <option value="">— Seleccionar —</option>
              <option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
            </select>
          </div>
        </div>
        <div class="field"><label>GR de ingreso</label><input id="r-gr" type="text" style="font-family:monospace;"></div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <p class="card-title" style="margin:0;">Ítems recibidos</p>
          <button class="btn-text" id="btn-add-recep">+ Agregar</button>
        </div>
        <div id="items-recep-list">
          <div class="empty-state" style="padding:16px;">Agrega los ítems recibidos.</div>
        </div>
      </div>

      <button class="btn-primary" id="btn-registrar-recep" style="width:100%;">Registrar ingreso</button>
      <div id="msg-recep" style="margin-top:8px;"></div>
    `;
  },

  afterRender() {
    this._items = [];
    document.getElementById('btn-add-recep').addEventListener('click', () => this._agregarItem());
    document.getElementById('btn-registrar-recep').addEventListener('click', () => this._registrar());
  },

  _agregarItem() {
    const i = this._items.length;
    this._items.push({});
    const list = document.getElementById('items-recep-list');
    if (i === 0) list.innerHTML = '';

    const div = document.createElement('div');
    div.className = 'recep-item';
    div.id = `ri-${i}`;
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">ÍTEM ${i + 1}</span>
        <button class="btn-text" style="color:var(--danger-text);" onclick="document.getElementById('ri-${i}').remove()">Quitar</button>
      </div>
      <div class="field-grid">
        <div class="field"><label>SKU</label><input id="ri-sku-${i}" type="text" style="font-family:monospace;"></div>
        <div class="field"><label>Cantidad</label><input id="ri-cant-${i}" type="number" value="1" min="1"></div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Serie</label><input id="ri-serie-${i}" type="text" style="font-family:monospace;"></div>
        <div class="field"><label>Unidad</label>
          <select id="ri-um-${i}">
            <option>UND</option><option>MTS</option><option>CJA</option><option>KIT</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Descripción</label><input id="ri-desc-${i}" type="text"></div>
    `;
    list.appendChild(div);
  },

  async _registrar() {
    const pedido = document.getElementById('r-pedido').value.trim();
    const cliente = document.getElementById('r-cliente').value;
    const gr = document.getElementById('r-gr').value.trim();
    const msg = document.getElementById('msg-recep');

    if (!pedido) { msg.innerHTML = '<p class="msg-error">Ingresa el número de pedido o paleta.</p>'; return; }
    if (!cliente) { msg.innerHTML = '<p class="msg-error">Selecciona el cliente.</p>'; return; }

    // Recoger ítems de los divs actuales en el DOM
    const divs = document.querySelectorAll('[id^="ri-"][id$="0"], [id^="ri-"][id$="1"], [id^="ri-"][id$="2"], [id^="ri-"][id$="3"], [id^="ri-"][id$="4"], [id^="ri-"][id$="5"], [id^="ri-"][id$="6"], [id^="ri-"][id$="7"], [id^="ri-"][id$="8"], [id^="ri-"][id$="9"]');
    const itemsDivs = document.querySelectorAll('.recep-item');
    const items = [];
    itemsDivs.forEach(d => {
      const id = d.id.replace('ri-', '');
      const sku = document.getElementById(`ri-sku-${id}`)?.value.trim();
      const cant = Number(document.getElementById(`ri-cant-${id}`)?.value) || 0;
      const serie = document.getElementById(`ri-serie-${id}`)?.value.trim() || null;
      const um = document.getElementById(`ri-um-${id}`)?.value || 'UND';
      const desc = document.getElementById(`ri-desc-${id}`)?.value.trim() || '';
      if (sku && cant > 0) items.push({ sku, cantidad: cant, serie, unidad_medida: um, descripcion: desc });
    });

    if (!items.length) { msg.innerHTML = '<p class="msg-error">Agrega al menos un ítem.</p>'; return; }

    const btn = document.getElementById('btn-registrar-recep');
    btn.disabled = true; btn.textContent = 'Registrando…';

    let ok = 0, err = 0;
    for (const it of items) {
      const { error } = await registrarIngreso({
        sku: it.sku, descripcion: it.descripcion,
        serie: it.serie, cantidad: it.cantidad,
        unidad_medida: it.unidad_medida,
        paleta_pedido: pedido, cliente, gr_ingreso: gr || null,
        fecha_ingreso: new Date().toISOString().slice(0, 10),
        usuario: null
      });
      if (error) err++; else ok++;
    }

    btn.disabled = false; btn.textContent = 'Registrar ingreso';
    if (err === 0) {
      msg.innerHTML = `<p class="msg-ok">✓ ${ok} ítem${ok !== 1 ? 's' : ''} registrado${ok !== 1 ? 's' : ''} correctamente.</p>`;
      setTimeout(() => Router.navigate('recepcion'), 1500);
    } else {
      msg.innerHTML = `<p class="msg-warning">${ok} ok · ${err} con error. Verifica los ítems con error.</p>`;
    }
  }
};

Router.register('recepcion', RecepcionView);
