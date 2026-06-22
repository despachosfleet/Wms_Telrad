// ============================================================
// NUEVA ORDEN DE PICKING
// Flujo: Excel → preview editable por GR → confirmar → BORRADOR
// Las órdenes en BORRADOR NO aparecen en picking hasta ser validadas
// ============================================================

const NuevoDespachoView = {
  title: 'Nueva orden de picking',
  _ordenes: [],       // Map de órdenes del Excel
  _editando: null,    // GR actualmente expandido para edición

  render() {
    return `
      <div class="alert alert-info" style="margin-bottom:14px;">
        <div>
          <strong>Flujo:</strong> Sube el Excel de cadena → revisa y corrige los ítems → crea las órdenes.
          Las órdenes creadas quedan en <span class="pill pill-borrador">Borrador</span> hasta que las valides.
        </div>
      </div>

      <div class="card">
        <p class="card-title">Subir Excel de cadena de suministro</p>
        <p class="card-subtitle">El sistema detecta todos los GRs y genera una orden por cada uno.</p>
        <div class="file-drop" id="file-drop-excel">
          <div class="file-drop-icon">📊</div>
          <strong>Seleccionar archivo Excel</strong>
          Formato: cadena de suministro de Logística Telrad (.xlsx)
        </div>
        <input type="file" id="input-excel" accept=".xlsx,.xls" style="display:none;">
      </div>

      <div id="preview-cont"></div>
      <div id="resultado-cont"></div>
    `;
  },

  afterRender() {
    const drop  = document.getElementById('file-drop-excel');
    const input = document.getElementById('input-excel');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) this._procesar(f);
    });
    input.addEventListener('change', e => {
      if (e.target.files[0]) this._procesar(e.target.files[0]);
    });
  },

  async _procesar(file) {
    const preview = document.getElementById('preview-cont');
    preview.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo Excel…</div>`;
    try {
      const ordenesMap = await extraerTodasLasOrdenes(file);
      if (!ordenesMap || ordenesMap.size === 0) {
        preview.innerHTML = `<div class="alert alert-danger">No se encontraron órdenes. Verifica que el Excel tenga las columnas: GR DE INGRESO, SKU, CANTIDAD.</div>`;
        return;
      }
      this._ordenes = Array.from(ordenesMap.values());
      this._editando = null;
      this._renderPreview();
    } catch(err) {
      preview.innerHTML = `<div class="alert alert-danger">Error al leer el Excel: ${escapeHtml(err.message)}</div>`;
    }
  },

  _renderPreview() {
    const preview = document.getElementById('preview-cont');
    const total = this._ordenes.reduce((s, o) => s + o.items.length, 0);

    preview.innerHTML = `
      <div class="alert alert-info">
        Se encontraron <strong>${this._ordenes.length} GRs</strong> con <strong>${total} ítems</strong>.
        Revisa y corrige antes de crear las órdenes.
      </div>

      <div id="ordenes-list">
        ${this._ordenes.map((o, i) => this._renderOrdenCard(o, i)).join('')}
      </div>

      <div class="btn-row">
        <button class="btn-primary" id="btn-crear-todas">
          Crear ${this._ordenes.length} orden${this._ordenes.length !== 1 ? 'es' : ''} en borrador
        </button>
        <button class="btn-secondary" id="btn-cancelar-excel">Cancelar</button>
      </div>
    `;

    // Eventos expandir/contraer
    preview.querySelectorAll('[data-toggle-orden]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.toggleOrden);
        this._editando = this._editando === i ? null : i;
        this._renderPreview();
      });
    });

    // Agregar ítem
    preview.querySelectorAll('[data-add-item]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const i = Number(btn.dataset.addItem);
        this._ordenes[i].items.push({ sku: '', descripcion: '', cantidad: 1, serie: null, pedido_pallet: '' });
        this._editando = i;
        this._renderPreview();
      });
    });

    // Quitar ítem
    preview.querySelectorAll('[data-del-item]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const [oi, ii] = btn.dataset.delItem.split('-').map(Number);
        this._ordenes[oi].items.splice(ii, 1);
        this._renderPreview();
      });
    });

    document.getElementById('btn-crear-todas')?.addEventListener('click', () => this._crearTodas());
    document.getElementById('btn-cancelar-excel')?.addEventListener('click', () => {
      document.getElementById('preview-cont').innerHTML = '';
      this._ordenes = [];
    });
  },

  _renderOrdenCard(o, i) {
    const expandida = this._editando === i;
    return `
      <div class="orden-borrador-card" style="margin-bottom:10px;">
        <div class="ob-header">
          <div style="flex:1; min-width:0;">
            <span class="ob-gr">${escapeHtml(o.gr)}</span>
            <span class="pill pill-neutral" style="margin-left:8px;">${o.items.length} ítems</span>
          </div>
          <div style="font-size:11px; color:var(--text-secondary);">
            ${escapeHtml(o.destino || '')} ${o.razon_social ? '· ' + escapeHtml(o.razon_social) : ''}
          </div>
          <button class="btn-ghost" data-toggle-orden="${i}" style="flex-shrink:0;">
            ${expandida ? '▲ Cerrar' : '▼ Ver y editar ítems'}
          </button>
        </div>

        <div class="expandable-items ${expandida ? 'open' : ''}">
          <div class="table-wrap" style="margin-top:10px;">
            <table class="data-table">
              <thead><tr>
                <th>SKU</th><th>Descripción</th><th>Cant.</th>
                <th>Serie</th><th>Pedido/Paleta</th><th></th>
              </tr></thead>
              <tbody id="tbody-orden-${i}">
                ${o.items.map((it, ii) => `
                  <tr>
                    <td><input type="text" value="${escapeHtml(it.sku)}"
                      style="font-family:monospace; font-size:11px; background:var(--bg-input); border:1px solid var(--border); border-radius:3px; padding:3px 6px; width:120px;"
                      onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].sku=this.value"></td>
                    <td style="min-width:250px;"><input type="text" value="${escapeHtml(it.descripcion||'')}"
                      style="font-size:11px; background:var(--bg-input); border:1px solid var(--border); border-radius:3px; padding:3px 6px; width:100%; min-width:240px;"
                      onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].descripcion=this.value"></td>
                    <td><input type="number" value="${it.cantidad}" min="1"
                      style="font-size:13px; font-weight:800; background:var(--bg-input); border:1px solid var(--border); border-radius:3px; padding:3px 6px; width:65px; text-align:center; color:var(--accent);"
                      onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].cantidad=Number(this.value)"></td>
                    <td style="min-width:160px;"><input type="text" value="${escapeHtml(it.serie && !it.serie.startsWith('-') ? it.serie : '')}"
                      style="font-family:monospace; font-size:11px; background:var(--bg-input); border:1px solid var(--border); border-radius:3px; padding:3px 6px; width:100%; min-width:150px;"
                      onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].serie=this.value||null"></td>
                    <td><input type="text" value="${escapeHtml(it.pedido_pallet||'')}"
                      style="font-size:11px; background:var(--bg-input); border:1px solid var(--border); border-radius:3px; padding:3px 6px; width:110px;"
                      onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].pedido_pallet=this.value"></td>
                    <td><button class="btn-text" style="color:var(--danger-text); font-size:16px; line-height:1;" data-del-item="${i}-${ii}">×</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top:8px;">
            <button class="btn-ghost" data-add-item="${i}">+ Agregar ítem</button>
          </div>
        </div>
      </div>
    `;
  },

  async _crearTodas() {
    const btn = document.getElementById('btn-crear-todas');
    if (btn) { btn.disabled = true; btn.textContent = 'Creando órdenes…'; }

    let ok = 0, err = 0;
    const msgs = [];

    for (const orden of this._ordenes) {
      const itemsValidos = orden.items.filter(it => it.sku && it.cantidad > 0);
      if (!itemsValidos.length) { msgs.push(`⚠ GR ${orden.gr}: sin ítems válidos`); err++; continue; }

      const { data, error } = await crearDespacho({
        gr: orden.gr,
        fecha: new Date().toISOString().slice(0, 10),
        cliente: orden.cliente,
        destino: orden.destino,
        razonSocial: orden.razon_social,
        contrata: orden.agencia,
        consignatarios: orden.consignatarios,
        observaciones: null,
        status: 'BORRADOR',
        items: itemsValidos.map(it => ({
          sku: it.sku,
          descripcion: it.descripcion || '',
          cantidad: it.cantidad,
          serie: it.serie || null,
          paleta_pedido: it.pedido_pallet || null,
          encontrado: false,
        }))
      });

      if (error) { err++; msgs.push(`❌ GR ${orden.gr}: error`); }
      else       { ok++;  msgs.push(`✓ GR ${orden.gr} → Borrador`); }
    }

    document.getElementById('preview-cont').innerHTML = '';
    document.getElementById('resultado-cont').innerHTML = `
      <div class="alert ${err === 0 ? 'alert-success' : 'alert-warning'}">
        <strong>${ok} orden${ok !== 1 ? 'es' : ''} creada${ok !== 1 ? 's' : ''} en borrador</strong>
        ${err > 0 ? ` · ${err} con error` : ''}
      </div>
      <div style="font-size:11px; color:var(--text-secondary); margin-bottom:14px;">
        ${msgs.map(m => `<div>${escapeHtml(m)}</div>`).join('')}
      </div>
      <div class="alert alert-info">
        <div>Las órdenes están en <strong>Borrador</strong>. Ve a <strong>Validar órdenes</strong> para revisarlas y aprobarlas antes de pickear.</div>
      </div>
      <div class="btn-row">
        <button class="btn-primary" id="btn-ir-validar">Ir a Validar órdenes →</button>
        <button class="btn-secondary" id="btn-otra-carga">Cargar otro Excel</button>
      </div>
    `;
    document.getElementById('btn-ir-validar')?.addEventListener('click', () => Router.navigate('validar-ordenes'));
    document.getElementById('btn-otra-carga')?.addEventListener('click', () => Router.navigate('nuevo-despacho'));
  }
};

Router.register('nuevo-despacho', NuevoDespachoView);
