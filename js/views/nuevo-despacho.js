// ============================================================
// VISTA: NUEVA ORDEN DE PICKING
// ============================================================

const NuevoPickingView = {
  title: 'Nueva orden de picking',
  _filas: [],
  _checkTimeout: null,

  render() {
    this._filas = [{ sku: '', cantidad: '', serie: '', stockInfo: null }];

    return `
      <div class="card">
        <p class="card-title">Datos de la guía</p>
        <div class="field-grid">
          <div class="field">
            <label>N° GR</label>
            <input type="text" id="f-gr" placeholder="T022-0000000132" />
          </div>
          <div class="field">
            <label>Fecha</label>
            <input type="date" id="f-fecha" />
          </div>
          <div class="field">
            <label>Cliente</label>
            <select id="f-cliente">
              <option value="">Seleccionar</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
              <option value="AMERICATEL">AMERICATEL</option>
            </select>
          </div>
          <div class="field">
            <label>Destino</label>
            <input type="text" id="f-destino" placeholder="Moyobamba" />
          </div>
          <div class="field">
            <label>Contrata</label>
            <input type="text" id="f-contrata" placeholder="Opcional" />
          </div>
          <div class="field" style="grid-column: span 2;">
            <label>Consignatarios</label>
            <input type="text" id="f-consignatarios" placeholder="Opcional" />
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
          <p class="card-title" style="margin:0;">Ítems de la guía</p>
          <div style="display:flex; gap:14px;">
            <button class="btn-text" id="btn-import-pdf">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Importar PDF
            </button>
            <input type="file" id="input-pdf" accept="application/pdf" style="display:none;" />
            <button class="btn-text" id="btn-add-row">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar fila
            </button>
          </div>
        </div>
        <div id="pdf-status"></div>
        <div style="overflow-x:auto;">
          <table class="item-table">
            <thead>
              <tr>
                <th class="col-sku">SKU</th>
                <th class="col-cant">Cant.</th>
                <th class="col-stock">Stock disponible</th>
                <th class="col-del"></th>
              </tr>
            </thead>
            <tbody id="filas-body"></tbody>
          </table>
        </div>
        <div style="margin-top:10px; border-top:1px solid var(--border-light); padding-top:10px;">
          <button class="btn-text" id="btn-import-excel">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Importar Excel para completar
          </button>
          <input type="file" id="input-excel" accept=".xlsx,.xls" style="display:none;" />
          <div id="excel-status"></div>
        </div>
      </div>

      <div class="hint-box">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>Importa el PDF de la guía para llenar los ítems automáticamente. El Excel del cliente solo completa destino/consignatarios — los ítems siempre vienen de la guía, que es la fuente confiable.</p>
      </div>

      <button class="btn-primary" id="btn-crear">Generar orden de picking</button>
    `;
  },

  afterRender() {
    this._filas = [{ sku: '', cantidad: '', serie: '', stockInfo: null }];

    document.getElementById('f-fecha').value = new Date().toISOString().slice(0, 10);

    document.getElementById('btn-add-row').addEventListener('click', () => {
      this._filas.push({ sku: '', cantidad: '', serie: '', stockInfo: null });
      this.renderFilas();
    });

    document.getElementById('btn-import-pdf').addEventListener('click', () => {
      document.getElementById('input-pdf').click();
    });

    document.getElementById('input-pdf').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.importarPDF(file);
      e.target.value = '';
    });

    document.getElementById('btn-import-excel').addEventListener('click', () => {
      document.getElementById('input-excel').click();
    });

    document.getElementById('input-excel').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.importarExcel(file);
      e.target.value = '';
    });

    document.getElementById('btn-crear').addEventListener('click', () => this.crearOrdenPicking());

    this.renderFilas();
  },

  async importarPDF(file) {
    const statusEl = document.getElementById('pdf-status');
    statusEl.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:0 0 8px;">Leyendo guía...</p>`;

    const { data, error } = await procesarGuiaPDF(file);

    if (error || !data) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:0 0 8px;">No se pudo leer el PDF: ${escapeHtml(error || 'error desconocido')}</p>`;
      return;
    }

    if (data.errores.length > 0) {
      const textoEscapado = escapeHtml(data.textoCrudo || '');
      statusEl.innerHTML = `
        <p style="font-size:11px; color:var(--warning); margin:0 0 8px;">${escapeHtml(data.errores.join(' '))}</p>
        <p style="font-size:11px; color:var(--text-secondary); margin:0 0 4px;">Copia el texto de abajo y pégalo en el chat para diagnosticar:</p>
        <textarea readonly style="width:100%; height:160px; font-size:10px; font-family:monospace; border:1px solid var(--border-strong); border-radius:6px; padding:6px;">${textoEscapado}</textarea>
      `;
      return;
    }

    if (data.guia) document.getElementById('f-gr').value = data.guia;

    this._filas = data.items.map(it => ({
      sku: it.codigo,
      cantidad: String(it.cantidad),
      serie: it.serie || '',
      stockInfo: null
    }));

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:0 0 8px;">${data.items.length} ítems importados. Verificando stock...</p>`;
    this.renderFilas();

    for (let i = 0; i < this._filas.length; i++) {
      this._filas[i].checking = true;
      await this.verificarStock(i);
    }

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:0 0 8px;">${data.items.length} ítems importados y verificados contra stock.</p>`;
  },

  async importarExcel(file) {
    const statusEl = document.getElementById('excel-status');
    const gr = document.getElementById('f-gr').value.trim();

    if (!gr) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--warning); margin:6px 0 0;">Primero importa el PDF (o escribe el N° GR) para poder buscar en el Excel.</p>`;
      return;
    }

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:6px 0 0;">Buscando GR ${escapeHtml(gr)} en el Excel...</p>`;

    const { data, error } = await buscarDatosPorGR(file, gr);

    if (error || !data) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:6px 0 0;">${escapeHtml(error || 'No se encontraron datos.')}</p>`;
      return;
    }

    if (data.destino) document.getElementById('f-destino').value = data.destino;

    const consig = [data.consignatario_1, data.consignatario_2].filter(Boolean).join(' / ');
    if (consig) document.getElementById('f-consignatarios').value = consig;

    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:6px 0 0;">Datos completados desde la hoja "${escapeHtml(data.hoja)}" (destino y consignatarios). Los ítems no se modificaron.</p>`;
  },

  renderFilas() {
    const tbody = document.getElementById('filas-body');

    tbody.innerHTML = this._filas.map((f, i) => {
      let stockCell = '<span style="color:var(--text-tertiary); font-size:11px;">-</span>';

      if (f.checking) {
        stockCell = '<span style="color:var(--text-tertiary); font-size:11px;">Buscando...</span>';
      } else if (f.sku && f.stockInfo) {
        if (f.stockInfo.length === 0) {
          stockCell = '<span class="pill pill-danger">No encontrado</span>';
        } else {
          const totalDisp = f.stockInfo.reduce((sum, s) => sum + Number(s.cantidad), 0);
          const cantPedida = Number(f.cantidad) || 0;
          const alcanza = cantPedida === 0 || cantPedida <= totalDisp;
          const ubicaciones = [...new Set(f.stockInfo.map(s => s.ubicacion_fisica || s.paleta_pedido).filter(Boolean))];
          const pillClass = alcanza ? 'pill-success' : 'pill-warning';
          const ubicTxt = ubicaciones.length > 0 ? ubicaciones.slice(0,2).join(', ') : 'sin ubicación';
          stockCell = `<span class="pill ${pillClass}">${formatNum(totalDisp)} en ${escapeHtml(ubicTxt)}</span>`;
          if (f.stockInfo.length > 1) {
            stockCell += `<div style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">${f.stockInfo.length} lotes/tramos</div>`;
          }
        }
      }

      return `
        <tr>
          <td class="col-sku"><input type="text" value="${escapeHtml(f.sku)}" data-i="${i}" data-f="sku" placeholder="SKU" /></td>
          <td class="col-cant"><input type="number" value="${escapeHtml(f.cantidad)}" data-i="${i}" data-f="cantidad" placeholder="0" min="0" step="any" /></td>
          <td class="col-stock">${stockCell}</td>
          <td class="col-del"><span class="del-icon" data-del="${i}"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></span></td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = Number(e.target.dataset.i);
        const f = e.target.dataset.f;
        const cursorPos = e.target.selectionStart;
        this._filas[i][f] = e.target.value;

        if (f === 'sku') {
          this._filas[i].stockInfo = null;
          if (e.target.value.trim().length >= 3) {
            this._filas[i].checking = true;
            clearTimeout(this._checkTimeout);
            this._checkTimeout = setTimeout(() => this.verificarStock(i), 400);
          }
        }

        this.renderFilas();

        const newInput = tbody.querySelector(`input[data-i="${i}"][data-f="${f}"]`);
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(cursorPos, cursorPos);
        }
      });
    });

    tbody.querySelectorAll('[data-del]').forEach(el => {
      el.addEventListener('click', () => {
        const i = Number(el.dataset.del);
        this._filas.splice(i, 1);
        if (this._filas.length === 0) {
          this._filas = [{ sku: '', cantidad: '', serie: '', stockInfo: null }];
        }
        this.renderFilas();
      });
    });
  },

  async verificarStock(index) {
    const sku = this._filas[index].sku.trim();
    if (!sku) {
      this._filas[index].checking = false;
      return;
    }

    const resultados = await buscarStockPorSKU(sku, true);

    if (this._filas[index].sku.trim() === sku) {
      this._filas[index].stockInfo = resultados;
      this._filas[index].checking = false;
      this.renderFilas();
    }
  },

  async crearOrdenPicking() {
    const btn = document.getElementById('btn-crear');
    const gr = document.getElementById('f-gr').value.trim();
    const fecha = document.getElementById('f-fecha').value;
    const cliente = document.getElementById('f-cliente').value;
    const destino = document.getElementById('f-destino').value.trim();
    const contrata = document.getElementById('f-contrata').value.trim();
    const consignatarios = document.getElementById('f-consignatarios').value.trim();

    const itemsValidos = this._filas.filter(f => f.sku.trim() && Number(f.cantidad) > 0);

    if (itemsValidos.length === 0) {
      alert('Agrega al menos un ítem con SKU y cantidad.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Generando...';

    const items = itemsValidos.map(f => {
      const stockInfo = f.stockInfo && f.stockInfo.length > 0 ? f.stockInfo[0] : null;
      return {
        stock_id: stockInfo ? stockInfo.id : null,
        sku: f.sku.trim(),
        descripcion: stockInfo ? stockInfo.descripcion : null,
        serie: f.serie ? f.serie.trim() : null,
        cantidad: Number(f.cantidad),
        paleta_pedido: stockInfo ? stockInfo.paleta_pedido : null,
        ubicacion_fisica: stockInfo ? stockInfo.ubicacion_fisica : null,
        encontrado: !!stockInfo
      };
    });

    const { data, error } = await crearDespacho({
      gr, fecha, cliente, destino, contrata, consignatarios,
      items
    });

    if (error) {
      alert('Error al generar la orden. Revisa tu conexión.');
      btn.disabled = false;
      btn.textContent = 'Generar orden de picking';
      return;
    }

    Router.navigate('picking', { despachoId: data.id });
  }
};

Router.register('nuevo-despacho', NuevoPickingView);
