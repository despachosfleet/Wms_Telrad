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
        <div class="filtros-grid">
          <div class="field"><label>N° GR</label><input type="text" id="f-gr-registro" autocomplete="off"></div>
          <div class="field"><label>Cliente</label>
            <select id="f-cliente-registro">
              <option value="">Todos</option>
              <option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
            </select>
          </div>
          <div class="field"><label>Destino / Destinatario</label><input type="text" id="f-destino-registro" autocomplete="off"></div>
          <div class="field"><label>SKU</label><input type="text" id="f-sku-registro" autocomplete="off"></div>
          <div class="field"><label>Serie</label><input type="text" id="f-serie-registro" autocomplete="off" style="font-family:monospace;"></div>
          <div class="field"><label>Fecha desde</label><input type="date" id="f-desde-registro"></div>
          <div class="field"><label>Fecha hasta</label><input type="date" id="f-hasta-registro"></div>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button class="btn-primary" id="btn-filtrar-registro">Buscar</button>
          <button class="btn-ghost"   id="btn-limpiar-registro">Limpiar</button>
          <button class="btn-secondary" id="btn-exportar-registro">↓ Exportar Excel</button>
        </div>
      </div>
      <div id="lista-registro-cont"></div>
    `;
  },

  afterRender() {
    document.getElementById('btn-filtrar-registro')?.addEventListener('click',  () => this.cargarYRender());
    document.getElementById('btn-exportar-registro')?.addEventListener('click', () => this.exportar());
    document.getElementById('btn-limpiar-registro')?.addEventListener('click',  () => {
      ['f-gr-registro','f-destino-registro','f-sku-registro','f-serie-registro','f-desde-registro','f-hasta-registro'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.value='';
      });
      const cl=document.getElementById('f-cliente-registro'); if(cl) cl.value='';
      this._filtros={};
      document.getElementById('lista-registro-cont').innerHTML='';
    });
    ['f-gr-registro','f-destino-registro','f-sku-registro','f-serie-registro'].forEach(id=>{
      document.getElementById(id)?.addEventListener('keydown', e=>{ if(e.key==='Enter') this.cargarYRender(); });
    });
    this.cargarYRender();
  },

  async cargarYRender() {
    const cont = document.getElementById('lista-registro-cont');
    cont.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>`;

    const desde   = document.getElementById('f-desde-registro')?.value;
    const hasta   = document.getElementById('f-hasta-registro')?.value;
    const gr      = document.getElementById('f-gr-registro')?.value.trim().toLowerCase()      || '';
    const destino = document.getElementById('f-destino-registro')?.value.trim().toLowerCase() || '';
    const sku     = document.getElementById('f-sku-registro')?.value.trim().toLowerCase()     || '';
    const serie   = document.getElementById('f-serie-registro')?.value.trim().toLowerCase()   || '';
    const cliente = document.getElementById('f-cliente-registro')?.value || '';

    this._filtros = { gr, destino, sku, serie, cliente };

    this._despachos = await obtenerTodosLosDespachos({
      fechaDesde: desde ? new Date(desde).toISOString() : null,
      fechaHasta: hasta ? new Date(hasta + 'T23:59:59').toISOString() : null
    });

    this.renderLista();
  },

  renderLista() {
    const cont = document.getElementById('lista-registro-cont');
    let lista = this._despachos;
    const f = this._filtros || {};

    if (f.gr)      lista = lista.filter(d => (d.gr||'').toLowerCase().includes(f.gr));
    if (f.destino) lista = lista.filter(d => (d.destino||'').toLowerCase().includes(f.destino) || (d.razon_social||'').toLowerCase().includes(f.destino));
    if (f.cliente) lista = lista.filter(d => (d.cliente||'').toUpperCase() === f.cliente.toUpperCase());
    if (f.sku || f.serie) {
      lista = lista.filter(d => (d.despachos_items||[]).some(it =>
        (!f.sku   || (it.sku  ||'').toLowerCase().includes(f.sku))  &&
        (!f.serie || (it.serie||'').toLowerCase().includes(f.serie))
      ));
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
