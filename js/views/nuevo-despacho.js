// ============================================================
// NUEVA ORDEN DE PICKING
// Flujo: subir Excel de cadena → sistema lee TODOS los GRs
// → genera N órdenes de picking de una sola vez.
// También permite registro manual como respaldo.
// ============================================================

const NuevoDespachoView = {
  title: 'Nueva orden de picking',
  _ordenesPrevisualizadas: [],
  _modoActivo: 'excel', // 'excel' | 'manual'

  render() {
    return `
      <div class="card" style="margin-bottom:12px;">
        <div class="chips">
          <button class="chip active" id="tab-excel">📊 Importar Excel</button>
          <button class="chip" id="tab-manual">✏️ Registro manual</button>
        </div>
      </div>
      <div id="panel-excel">${this._renderPanelExcel()}</div>
      <div id="panel-manual" style="display:none;">${this._renderPanelManual()}</div>
    `;
  },

  _renderPanelExcel() {
    return `
      <div class="card">
        <p class="card-title">Subir Excel de cadena de suministro</p>
        <p style="font-size:11px; color:var(--text-secondary); margin-bottom:12px;">
          El sistema detectará todos los GRs del archivo y creará una orden de picking por cada uno.
        </p>
        <div class="file-drop" id="file-drop-excel">
          <strong>Seleccionar archivo Excel</strong>
          .xlsx · cadena de suministro de Logística Telrad
        </div>
        <input type="file" id="input-excel" accept=".xlsx,.xls" style="display:none;">
      </div>
      <div id="preview-ordenes"></div>
      <div id="resultado-creacion"></div>
    `;
  },

  _renderPanelManual() {
    return `
      <div class="card">
        <p class="card-title">Datos de la guía</p>
        <div class="field-grid">
          <div class="field"><label>N° GR</label><input id="m-gr" type="text"></div>
          <div class="field"><label>Cliente</label>
            <select id="m-cliente">
              <option value="">— Seleccionar —</option>
              <option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
            </select>
          </div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Destino (provincia)</label><input id="m-destino" type="text"></div>
          <div class="field"><label>Razón social</label><input id="m-razon" type="text"></div>
        </div>
        <div class="field"><label>Contrata</label><input id="m-contrata" type="text"></div>
        <div class="field"><label>Consignatarios</label><input id="m-consig" type="text"></div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <p class="card-title" style="margin:0;">Ítems</p>
          <button class="btn-text" id="btn-add-item">+ Agregar ítem</button>
        </div>
        <div id="items-manual-list"></div>
      </div>

      <button class="btn-primary" id="btn-crear-manual" style="width:100%;">
        Generar orden de picking
      </button>
      <div id="msg-manual"></div>
    `;
  },

  afterRender() {
    this._setupTabs();
    this._setupExcel();
    this._setupManual();
  },

  _setupTabs() {
    const tabExcel = document.getElementById('tab-excel');
    const tabManual = document.getElementById('tab-manual');
    const panelExcel = document.getElementById('panel-excel');
    const panelManual = document.getElementById('panel-manual');

    tabExcel.addEventListener('click', () => {
      tabExcel.classList.add('active'); tabManual.classList.remove('active');
      panelExcel.style.display = ''; panelManual.style.display = 'none';
      this._modoActivo = 'excel';
    });
    tabManual.addEventListener('click', () => {
      tabManual.classList.add('active'); tabExcel.classList.remove('active');
      panelManual.style.display = ''; panelExcel.style.display = 'none';
      this._modoActivo = 'manual';
    });
  },

  _setupExcel() {
    const drop = document.getElementById('file-drop-excel');
    const input = document.getElementById('input-excel');
    if (!drop || !input) return;

    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) this._procesarExcel(f);
    });
    input.addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) this._procesarExcel(f);
    });
  },

  async _procesarExcel(file) {
    const preview = document.getElementById('preview-ordenes');
    const resultado = document.getElementById('resultado-creacion');
    preview.innerHTML = `<div class="empty-state">Leyendo Excel…</div>`;
    resultado.innerHTML = '';

    try {
      const ordenes = await extraerTodasLasOrdenes(file);

      if (!ordenes || ordenes.size === 0) {
        preview.innerHTML = `<div class="alert alert-danger">No se encontraron órdenes en el Excel. Verifica que el archivo tenga columnas: GR DE INGRESO, SKU, CANTIDAD.</div>`;
        return;
      }

      this._ordenesPrevisualizadas = Array.from(ordenes.values());
      this._renderPreview(preview, resultado);

    } catch (err) {
      console.error(err);
      preview.innerHTML = `<div class="alert alert-danger">Error al leer el Excel: ${escapeHtml(err.message)}</div>`;
    }
  },

  _renderPreview(preview, resultado) {
    const ordenes = this._ordenesPrevisualizadas;
    const total = ordenes.reduce((s, o) => s + o.items.length, 0);

    preview.innerHTML = `
      <div class="alert alert-info" style="margin-bottom:10px;">
        Se encontraron <strong>${ordenes.length} GRs</strong> con <strong>${total} ítems</strong> en total.
        Revisa antes de crear las órdenes.
      </div>

      <div class="table-wrap" style="margin-bottom:12px;">
        <table class="data-table">
          <thead><tr>
            <th>GR</th><th>Destino</th><th>Razón social</th><th>Cliente</th><th>Ítems</th>
          </tr></thead>
          <tbody>
            ${ordenes.map((o, i) => `
              <tr>
                <td class="sku-cell">${escapeHtml(o.gr)}</td>
                <td>${escapeHtml(o.destino || '-')}</td>
                <td>${escapeHtml(o.razon_social || '-')}</td>
                <td>${escapeHtml(o.cliente || '-')}</td>
                <td>${o.items.length}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <button class="btn-primary" id="btn-crear-todas" style="width:100%;">
        Crear ${ordenes.length} orden${ordenes.length !== 1 ? 'es' : ''} de picking
      </button>
    `;

    document.getElementById('btn-crear-todas').addEventListener('click', () => {
      this._crearTodasLasOrdenes(preview, resultado);
    });
  },

  async _crearTodasLasOrdenes(preview, resultado) {
    const btn = document.getElementById('btn-crear-todas');
    if (btn) { btn.disabled = true; btn.textContent = 'Creando órdenes…'; }

    let creadas = 0;
    let errores = 0;
    const msgs = [];

    for (const orden of this._ordenesPrevisualizadas) {
      const { data, error } = await crearDespacho({
        gr: orden.gr,
        fecha: new Date().toISOString().slice(0, 10),
        cliente: orden.cliente,
        destino: orden.destino,
        razonSocial: orden.razon_social,
        contrata: orden.agencia,
        consignatarios: orden.consignatarios,
        observaciones: null,
        items: orden.items.map(it => ({
          sku: it.sku,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          serie: it.serie,
          paleta_pedido: it.pedido_pallet,
          encontrado: false,
        }))
      });

      if (error) {
        errores++;
        msgs.push(`❌ GR ${orden.gr}: error al crear`);
      } else {
        creadas++;
        msgs.push(`✓ GR ${orden.gr} — orden PICK creada`);
      }
    }

    preview.innerHTML = '';
    resultado.innerHTML = `
      <div class="alert ${errores === 0 ? 'alert-success' : 'alert-warning'}" style="margin-bottom:10px;">
        <div>
          <strong>${creadas} orden${creadas !== 1 ? 'es' : ''} creada${creadas !== 1 ? 's' : ''}</strong>
          ${errores > 0 ? ` · ${errores} con error` : ''}
        </div>
      </div>
      <div style="font-size:11px; color:var(--text-secondary); margin-bottom:12px;">
        ${msgs.map(m => `<div>${escapeHtml(m)}</div>`).join('')}
      </div>
      <div class="btn-row">
        <button class="btn-primary" id="btn-ir-picking">Ver órdenes de picking →</button>
        <button class="btn-secondary" id="btn-nueva-carga">Cargar otro Excel</button>
      </div>
    `;

    document.getElementById('btn-ir-picking').addEventListener('click', () => Router.navigate('picking-lista'));
    document.getElementById('btn-nueva-carga').addEventListener('click', () => Router.navigate('nuevo-despacho'));
  },

  // ---- MODO MANUAL ----
  _itemsManual: [],

  _setupManual() {
    this._itemsManual = [];
    const btnAdd = document.getElementById('btn-add-item');
    if (btnAdd) btnAdd.addEventListener('click', () => this._agregarItemManual());
    const btnCrear = document.getElementById('btn-crear-manual');
    if (btnCrear) btnCrear.addEventListener('click', () => this._crearOrdenManual());
  },

  _agregarItemManual() {
    const i = this._itemsManual.length;
    this._itemsManual.push({ sku: '', cantidad: 1, serie: '', pedido_pallet: '' });
    const list = document.getElementById('items-manual-list');
    const div = document.createElement('div');
    div.className = 'recep-item';
    div.id = `item-m-${i}`;
    div.innerHTML = `
      <div class="field-grid" style="margin-bottom:6px;">
        <div class="field"><label>SKU</label><input id="m-sku-${i}" type="text" style="font-family:monospace;"></div>
        <div class="field"><label>Cantidad</label><input id="m-cant-${i}" type="number" value="1" min="1"></div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Serie</label><input id="m-serie-${i}" type="text" style="font-family:monospace;"></div>
        <div class="field"><label>Pedido / Paleta</label><input id="m-pp-${i}" type="text"></div>
      </div>
      <button class="btn-text" style="color:var(--danger-text);" onclick="document.getElementById('item-m-${i}').remove()">Quitar</button>
    `;
    list.appendChild(div);
  },

  async _crearOrdenManual() {
    const gr = document.getElementById('m-gr').value.trim();
    const cliente = document.getElementById('m-cliente').value;
    const destino = document.getElementById('m-destino').value.trim();
    const razonSocial = document.getElementById('m-razon').value.trim();
    const contrata = document.getElementById('m-contrata').value.trim();
    const consignatarios = document.getElementById('m-consig').value.trim();
    const msg = document.getElementById('msg-manual');

    if (!gr) { msg.innerHTML = '<p class="msg-error">Ingresa el número de GR.</p>'; return; }

    // Recoger ítems
    const items = [];
    const divs = document.querySelectorAll('[id^="item-m-"]');
    divs.forEach((d, i) => {
      const id = d.id.replace('item-m-', '');
      const sku = document.getElementById(`m-sku-${id}`)?.value.trim();
      const cant = Number(document.getElementById(`m-cant-${id}`)?.value) || 0;
      const serie = document.getElementById(`m-serie-${id}`)?.value.trim() || null;
      const pp = document.getElementById(`m-pp-${id}`)?.value.trim() || null;
      if (sku && cant > 0) items.push({ sku, cantidad: cant, serie, pedido_pallet: pp });
    });

    if (items.length === 0) { msg.innerHTML = '<p class="msg-error">Agrega al menos un ítem.</p>'; return; }

    const btn = document.getElementById('btn-crear-manual');
    btn.disabled = true; btn.textContent = 'Creando…';

    const { data, error } = await crearDespacho({
      gr, fecha: new Date().toISOString().slice(0, 10),
      cliente, destino, razonSocial, contrata, consignatarios,
      observaciones: null,
      items: items.map(it => ({
        sku: it.sku, descripcion: '', cantidad: it.cantidad,
        serie: it.serie, paleta_pedido: it.pedido_pallet, encontrado: false
      }))
    });

    if (error) {
      msg.innerHTML = `<p class="msg-error">Error al crear la orden. Intenta de nuevo.</p>`;
      btn.disabled = false; btn.textContent = 'Generar orden de picking';
      return;
    }

    msg.innerHTML = `<p class="msg-ok">✓ Orden creada: GR ${escapeHtml(gr)}</p>`;
    setTimeout(() => Router.navigate('picking-lista'), 1200);
  }
};

Router.register('nuevo-despacho', NuevoDespachoView);
