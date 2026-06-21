// ============================================================
// VISTA: GUIAS PENDIENTES
// Entrada directa a la lista de guias cargadas (desde Excel o
// manual) que aun no se han resuelto con su PDF. Reutiliza el
// flujo de resolucion de NuevoPickingView.
// ============================================================

const GuiasPendientesView = {
  title: 'Guías pendientes',

  render() {
    return `
      <div class="card">
        <p class="card-title">¿No tienes Excel para esta guía?</p>
        <p style="font-size:11px; color:var(--text-secondary); margin:0 0 10px;">Agrega el GR manualmente y resuélvela solo con el PDF.</p>
        <div style="display:flex; gap:8px;">
          <input type="text" id="f-gr-manual" placeholder="" style="flex:1; border:1.5px solid var(--border-strong); border-radius:var(--radius-sm); padding:7px 9px; font-size:12.5px;" />
          <button class="btn-primary" id="btn-agregar-manual" style="width:auto; padding:0 16px;">Agregar</button>
        </div>
        <div id="manual-status"></div>
      </div>
      <div id="lista-pendientes-cont"></div>
    `;
  },

  afterRender() {
    document.getElementById('btn-agregar-manual').addEventListener('click', () => this.agregarManual());
    this.cargarYRenderizarPendientes();
  },

  async agregarManual() {
    const input = document.getElementById('f-gr-manual');
    const statusEl = document.getElementById('manual-status');
    const gr = input.value.trim();

    if (!gr) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--warning); margin:6px 0 0;">Escribe el N° GR.</p>`;
      return;
    }

    const { error } = await guardarGuiaPendienteManual(gr);

    if (error) {
      statusEl.innerHTML = `<p style="font-size:11px; color:var(--danger); margin:6px 0 0;">No se pudo agregar (¿ya existe ese GR pendiente?).</p>`;
      return;
    }

    input.value = '';
    statusEl.innerHTML = `<p style="font-size:11px; color:var(--success); margin:6px 0 0;">Guía agregada a la lista.</p>`;
    await this.cargarYRenderizarPendientes();
  },

  async cargarYRenderizarPendientes() {
    const cont = document.getElementById('lista-pendientes-cont');
    cont.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:14px 0 0;">Cargando pendientes...</p>`;

    const pendientes = await obtenerGuiasPendientes({ estado: 'PENDIENTE' });

    if (pendientes.length === 0) {
      cont.innerHTML = `<p style="font-size:11px; color:var(--text-tertiary); margin:14px 0 0;">No hay guías pendientes por ahora.</p>`;
      return;
    }

    cont.innerHTML = `
      <div class="card" style="margin-top:14px;">
        <p class="card-title">Guías pendientes (${pendientes.length})</p>
        <div id="tabla-pendientes"></div>
      </div>
    `;

    const tabla = document.getElementById('tabla-pendientes');
    tabla.innerHTML = pendientes.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-light);">
        <div>
          <div style="font-size:12.5px; font-weight:600;">${escapeHtml(p.gr)}</div>
          <div style="font-size:11px; color:var(--text-secondary);">${escapeHtml(p.cliente || '-')} · ${escapeHtml(p.destino || 'sin destino')} · ${(p.items || []).length} ítems${p.origen === 'MANUAL' ? ' · agregada manual' : ''}</div>
        </div>
        <button class="btn-text" data-resolver="${p.id}">Resolver</button>
      </div>
    `).join('');

    tabla.querySelectorAll('[data-resolver]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pendiente = pendientes.find(p => String(p.id) === btn.dataset.resolver);
        Router.navigate('nuevo-despacho');
        // Pequeño retraso para asegurar que la vista ya renderizo antes de aplicar el modo manual
        setTimeout(() => {
          NuevoPickingView._guiaActivaId = pendiente.id;
          NuevoPickingView.activarModoManual();
          document.getElementById('f-gr').value = pendiente.gr;
          if (pendiente.cliente) document.getElementById('f-cliente').value = pendiente.cliente;
          if (pendiente.destino) document.getElementById('f-destino').value = pendiente.destino;
          const consig = [pendiente.consignatario_1, pendiente.consignatario_2].filter(Boolean).join(' / ');
          if (consig) document.getElementById('f-consignatarios').value = consig;
          NuevoPickingView._filas = (pendiente.items || []).map(it => ({
            sku: it.sku || '', cantidad: it.cantidad != null ? String(it.cantidad) : '',
            serie: it.serie || '', stockInfo: null, estadoValidacion: null
          }));
          if (NuevoPickingView._filas.length === 0) {
            NuevoPickingView._filas = [{ sku: '', cantidad: '', serie: '', stockInfo: null, estadoValidacion: null }];
          }
          NuevoPickingView.renderFilas();
          NuevoPickingView.verificarStockTodas();
        }, 50);
      });
    });
  }
};

Router.register('guias-pendientes', GuiasPendientesView);
