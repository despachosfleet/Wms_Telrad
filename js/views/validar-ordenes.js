// ============================================================
// VALIDAR ÓRDENES — Paso entre BORRADOR y PENDIENTE
// El coordinador revisa los ítems contra la guía física,
// corrige lo que sea necesario, y da OK → pasa a PENDIENTE
// Solo las órdenes PENDIENTE aparecen en picking
// ============================================================

const ValidarOrdenesView = {
  title: 'Validar órdenes',
  _ordenes: [],
  _expandido: null,

  render() {
    return `
      <div class="alert alert-warning" style="margin-bottom:14px;">
        <div>
          Las órdenes en <span class="pill pill-borrador">Borrador</span> no pueden pickearse hasta que las apruebes.
          Revisalas contra la guía física y da <strong>OK para pickear</strong>.
        </div>
      </div>
      <div id="validar-cont"><div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div></div>
    `;
  },

  async afterRender() {
    await this._cargar();
  },

  async _cargar() {
    this._ordenes = await obtenerOrdenesBorrador();
    this._render();
  },

  _render() {
    const cont = document.getElementById('validar-cont');
    if (!this._ordenes.length) {
      cont.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <strong>Sin órdenes por validar</strong>
          Todas las órdenes ya fueron aprobadas o no hay borradores pendientes.
        </div>
      `;
      return;
    }

    cont.innerHTML = this._ordenes.map((d, i) => this._renderCard(d, i)).join('');

    cont.querySelectorAll('[data-toggle-val]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.toggleVal);
        this._expandido = this._expandido === i ? null : i;
        this._render();
      });
    });

    cont.querySelectorAll('[data-aprobar]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.aprobar);
        await this._aprobar(id, btn);
      });
    });

    cont.querySelectorAll('[data-anular-borrador]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.anularBorrador);
        if (confirm('¿Anular esta orden? Se eliminará permanentemente.')) {
          await anularOrdenBorrador(id);
          await this._cargar();
        }
      });
    });

    // Edición inline de ítems
    cont.querySelectorAll('[data-edit-cant]').forEach(input => {
      input.addEventListener('change', async () => {
        const { itemId } = input.dataset;
        await actualizarCantidadItem(Number(itemId), Number(input.value));
      });
    });

    cont.querySelectorAll('[data-edit-serie]').forEach(input => {
      input.addEventListener('change', async () => {
        const { itemId } = input.dataset;
        await actualizarSerieItem(Number(itemId), input.value || null);
      });
    });

    cont.querySelectorAll('[data-edit-pp]').forEach(input => {
      input.addEventListener('change', async () => {
        const { itemId } = input.dataset;
        await actualizarPaletaPedidoItem(Number(itemId), input.value || null);
      });
    });
  },

  _renderCard(d, i) {
    const items = d.despachos_items || [];
    const exp = this._expandido === i;
    return `
      <div class="orden-borrador-card">
        <div class="ob-header">
          <div style="flex:1; min-width:0;">
            <span class="ob-gr">${escapeHtml(d.gr || 'Sin GR')}</span>
            <span class="pill pill-borrador" style="margin-left:6px;">Borrador</span>
            <span class="pill pill-neutral" style="margin-left:4px;">${items.length} ítems</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <span style="font-size:11px; color:var(--text-secondary);">
              ${escapeHtml(d.destino || '-')} · ${escapeHtml(d.razon_social || '-')}
            </span>
            <button class="btn-ghost" data-toggle-val="${i}">
              ${exp ? '▲ Cerrar' : '▼ Ver ítems'}
            </button>
            <button class="btn-success" data-aprobar="${d.id}">✓ OK para pickear</button>
            <button class="btn-danger" data-anular-borrador="${d.id}" style="padding:6px 10px; font-size:11px;">Anular</button>
          </div>
        </div>
        <div class="ob-meta">
          Cliente: <strong>${escapeHtml(d.cliente || '-')}</strong>
          · Contrata: ${escapeHtml(d.contrata || '-')}
          · Creado: ${formatFecha(d.creado_en)}
        </div>

        ${exp ? `
          <div style="margin-top:12px;">
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr>
                  <th>SKU</th><th>Descripción</th>
                  <th>Cant. pedida</th><th>Serie</th><th>Pedido/Paleta</th>
                </tr></thead>
                <tbody>
                  ${items.map(it => `
                    <tr>
                      <td class="sku-cell">${escapeHtml(it.sku||'-')}</td>
                      <td class="wrap" style="font-size:11px;">${escapeHtml(it.descripcion||'-')}</td>
                      <td>
                        <input type="number" value="${it.cantidad}" min="1"
                          data-edit-cant data-item-id="${it.id}"
                          style="width:70px; text-align:center; font-weight:700;
                            font-size:13px; background:var(--bg-input);
                            border:1.5px solid var(--border-strong);
                            border-radius:4px; padding:4px 6px; color:var(--accent);">
                      </td>
                      <td>
                        <input type="text" value="${escapeHtml(it.serie||'')}"
                          data-edit-serie data-item-id="${it.id}"
                          placeholder="Sin serie"
                          style="font-family:monospace; font-size:11px; width:140px;
                            background:var(--bg-input); border:1px solid var(--border-strong);
                            border-radius:4px; padding:4px 6px;">
                      </td>
                      <td>
                        <input type="text" value="${escapeHtml(it.paleta_pedido||'')}"
                          data-edit-pp data-item-id="${it.id}"
                          placeholder="Pedido o paleta"
                          style="font-size:11px; width:120px;
                            background:var(--bg-input); border:1px solid var(--border-strong);
                            border-radius:4px; padding:4px 6px;">
                      </td>
                    </tr>
                  `).join('') || '<tr><td colspan="5" class="empty-state">Sin ítems</td></tr>'}
                </tbody>
              </table>
            </div>
            <p style="font-size:11px; color:var(--text-tertiary); margin-top:6px;">
              Edita cantidad, serie o pedido/paleta directamente en la tabla. Los cambios se guardan al salir del campo.
            </p>
          </div>
        ` : ''}
      </div>
    `;
  },

  async _aprobar(despachoId, btn) {
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Aprobando…';
    const { error } = await aprobarOrdenBorrador(despachoId);
    if (error) {
      alert('Error al aprobar la orden. Intenta de nuevo.');
      btn.disabled = false; btn.textContent = orig;
      return;
    }
    await this._cargar();
  }
};

Router.register('validar-ordenes', ValidarOrdenesView);
