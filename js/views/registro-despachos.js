// ============================================================
// VISTA: REGISTRO DE DESPACHOS (historial completo, filtrable,
// exportable a Excel — equivalente a la hoja DESPACHOS del Excel
// viejo del usuario)
// ============================================================

const RegistroDespachosView = {
  title: 'Registro de despachos',
  _despachos: [],
  _filtroTexto: '',

  render() {
    return `
      <div class="card">
        <div class="field-grid">
          <div class="field" style="grid-column: span 2;">
            <label>Buscar (GR, SKU, serie, cliente, destino)</label>
            <input type="text" id="f-buscar-registro" placeholder="" />
          </div>
          <div class="field">
            <label>Desde</label>
            <input type="date" id="f-desde-registro" />
          </div>
          <div class="field">
            <label>Hasta</label>
            <input type="date" id="f-hasta-registro" />
          </div>
        </div>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="btn-primary" id="btn-filtrar-registro" style="width:auto; padding:8px 16px;">Filtrar</button>
          <button class="btn-text" id="btn-exportar-registro">Exportar a Excel</button>
        </div>
      </div>
      <div id="lista-registro-cont"></div>
    `;
  },

  afterRender() {
    document.getElementById('btn-filtrar-registro').addEventListener('click', () => this.cargarYRender());
    document.getElementById('btn-exportar-registro').addEventListener('click', () => this.exportar());
    document.getElementById('f-buscar-registro').addEventListener('input', (e) => {
      this._filtroTexto = e.target.value.trim().toLowerCase();
      this.renderLista();
    });
    this.cargarYRender();
  },

  async cargarYRender() {
    const cont = document.getElementById('lista-registro-cont');
    cont.innerHTML = `<div class="empty-state">Cargando...</div>`;

    const desde = document.getElementById('f-desde-registro').value;
    const hasta = document.getElementById('f-hasta-registro').value;

    this._despachos = await obtenerTodosLosDespachos({
      fechaDesde: desde ? new Date(desde).toISOString() : null,
      fechaHasta: hasta ? new Date(hasta + 'T23:59:59').toISOString() : null
    });

    this.renderLista();
  },

  renderLista() {
    const cont = document.getElementById('lista-registro-cont');
    let lista = this._despachos;

    if (this._filtroTexto) {
      const t = this._filtroTexto;
      lista = lista.filter(d => {
        const camposCabecera = [d.gr, d.cliente, d.destino].filter(Boolean).join(' ').toLowerCase();
        if (camposCabecera.includes(t)) return true;
        return (d.despachos_items || []).some(it =>
          [it.sku, it.serie].filter(Boolean).join(' ').toLowerCase().includes(t)
        );
      });
    }

    if (lista.length === 0) {
      cont.innerHTML = `<div class="empty-state">No hay registros con estos filtros.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>GR</th><th>Fecha</th><th>Cliente</th><th>Destino</th><th>Estado</th><th>Ítems</th></tr></thead>
          <tbody>
            ${lista.map((d, i) => `
              <tr data-idx="${i}">
                <td class="sku-cell">${escapeHtml(d.gr || 'Sin GR')}</td>
                <td>${escapeHtml(d.fecha || '-')}</td>
                <td>${escapeHtml(d.cliente || '-')}</td>
                <td class="wrap">${escapeHtml(d.destino || '-')}</td>
                <td>${pillEstado(calcularEstadoVisual(d))}</td>
                <td>${(d.despachos_items || []).length}</td>
              </tr>
              <tr class="detail-row-tr" data-detail-for="${i}" style="display:none;">
                <td colspan="6">
                  <div style="padding:10px 4px;">
                    ${(d.despachos_items || []).map(it => `
                      <div style="font-size:11px; padding:4px 0; border-bottom:1px solid var(--border-light);">
                        ${escapeHtml(it.sku)} · ${formatNum(it.cantidad)} ${it.serie ? '· ' + escapeHtml(it.serie) : ''}
                      </div>
                    `).join('') || '<span style="font-size:11px; color:var(--text-tertiary);">Sin ítems</span>'}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('tbody tr[data-idx]').forEach(tr => {
      tr.addEventListener('click', () => {
        const idx = tr.dataset.idx;
        const detailTr = cont.querySelector(`tr[data-detail-for="${idx}"]`);
        const isOpen = detailTr.style.display !== 'none';
        cont.querySelectorAll('.detail-row-tr').forEach(d => d.style.display = 'none');
        detailTr.style.display = isOpen ? 'none' : '';
      });
    });
  },

  async exportar() {
    if (typeof XLSX === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const filas = [];
    this._despachos.forEach(d => {
      const items = d.despachos_items || [];
      if (items.length === 0) {
        filas.push({ GR: d.gr, FECHA: d.fecha, CLIENTE: d.cliente, DESTINO: d.destino, ESTADO: calcularEstadoVisual(d), SKU: '', CANTIDAD: '', SERIE: '' });
      } else {
        items.forEach(it => {
          filas.push({
            GR: d.gr, FECHA: d.fecha, CLIENTE: d.cliente, DESTINO: d.destino,
            ESTADO: calcularEstadoVisual(d), SKU: it.sku, CANTIDAD: it.cantidad, SERIE: it.serie || ''
          });
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Despachos');
    XLSX.writeFile(wb, `registro_despachos_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
};

Router.register('registro-despachos', RegistroDespachosView);
