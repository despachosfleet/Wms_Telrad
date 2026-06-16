// ============================================================
// VISTA: NUEVO DESPACHO
// ============================================================

const NuevoDespachoView = {
  title: 'Nuevo despacho',
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
          <div class="field" style="grid-column: span 2;">
            <label>Contrata</label>
            <input type="text" id="f-contrata" placeholder="Opcional" />
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Ítems de la guía</p>
          <button class="btn-text" id="btn-add-row">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar fila
          </button>
        </div>
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
      </div>

      <div class="hint-box">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>Al escribir el SKU se muestra automáticamente cuánto stock hay y en qué ubicación. Verifica antes de enviar a picking.</p>
      </div>

      <button class="btn-primary" id="btn-crear">Crear despacho y enviar a picking</button>
    `;
  },

  afterRender() {
    this._filas = [{ sku: '', cantidad: '', serie: '', stockInfo: null }];

    document.getElementById('f-fecha').value = new Date().toISOString().slice(0, 10);

    document.getElementById('btn-add-row').addEventListener('click', () => {
      this._filas.push({ sku: '', cantidad: '', serie: '', stockInfo: null });
      this.renderFilas();
    });

    document.getElementById('btn-crear').addEventListener('click', () => this.crearDespacho());

    this.renderFilas();
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

  async crearDespacho() {
    const btn = document.getElementById('btn-crear');
    const gr = document.getElementById('f-gr').value.trim();
    const fecha = document.getElementById('f-fecha').value;
    const cliente = document.getElementById('f-cliente').value;
    const destino = document.getElementById('f-destino').value.trim();
    const contrata = document.getElementById('f-contrata').value.trim();

    const itemsValidos = this._filas.filter(f => f.sku.trim() && Number(f.cantidad) > 0);

    if (itemsValidos.length === 0) {
      alert('Agrega al menos un ítem con SKU y cantidad.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creando...';

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
      gr, fecha, cliente, destino,
      destino_lugar: destino,
      contrata,
      items
    });

    if (error) {
      alert('Error al crear el despacho. Revisa tu conexión.');
      btn.disabled = false;
      btn.textContent = 'Crear despacho y enviar a picking';
      return;
    }

    Router.navigate('picking', { despachoId: data.id });
  }
};

Router.register('nuevo-despacho', NuevoDespachoView);
