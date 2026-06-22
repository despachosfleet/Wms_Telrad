// ============================================================
// MÓDULO DE ADMINISTRACIÓN
// Todas las operaciones de corrección, reversión y gestión
// que antes requerían SQL manual ahora están en la interfaz
// ============================================================

const AdminView = {
  title: 'Administración',

  render() {
    return `
      <p class="section-label">Gestión de órdenes y despachos</p>
      <div class="admin-grid" style="margin-bottom:16px;">
        <div class="admin-action-card" onclick="AdminView.abrirModal('revertir-despacho')">
          <div class="aa-icon">↩️</div>
          <div class="aa-title">Revertir despacho</div>
          <div class="aa-desc">Devuelve el stock y anula el registro</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('anular-orden')">
          <div class="aa-icon">🚫</div>
          <div class="aa-title">Anular orden de picking</div>
          <div class="aa-desc">Elimina una orden sin ejecutar</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('limpiar-pruebas')">
          <div class="aa-icon danger-card">🗑️</div>
          <div class="aa-title">Limpiar datos de prueba</div>
          <div class="aa-desc">Borra todas las órdenes de prueba y restaura el stock</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('cambiar-estado-orden')">
          <div class="aa-icon">🔄</div>
          <div class="aa-title">Cambiar estado de orden</div>
          <div class="aa-desc">Forzar estado de una orden manualmente</div>
        </div>
      </div>

      <p class="section-label">Gestión de stock</p>
      <div class="admin-grid" style="margin-bottom:16px;">
        <div class="admin-action-card" onclick="AdminView.abrirModal('editar-stock')">
          <div class="aa-icon">✏️</div>
          <div class="aa-title">Editar ítem de stock</div>
          <div class="aa-desc">Cantidad, serie, ubicación, paleta</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('ajuste-inventario')">
          <div class="aa-icon">⚖️</div>
          <div class="aa-title">Ajuste de inventario</div>
          <div class="aa-desc">Regularizar diferencias con motivo</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('marcar-danado')">
          <div class="aa-icon">⚠️</div>
          <div class="aa-title">Marcar como dañado</div>
          <div class="aa-desc">Dar de baja un ítem inutilizable</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('fusionar-paletas')">
          <div class="aa-icon">🔗</div>
          <div class="aa-title">Fusionar paletas/pedidos</div>
          <div class="aa-desc">Unir dos agrupaciones en una sola</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('cambiar-paleta')">
          <div class="aa-icon">📦</div>
          <div class="aa-title">Cambiar paleta/pedido de ítem</div>
          <div class="aa-desc">Reasignar un ítem a otra agrupación</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('revertir-recepcion')">
          <div class="aa-icon">↩️</div>
          <div class="aa-title">Revertir recepción</div>
          <div class="aa-desc">Deshacer un ingreso registrado por error</div>
        </div>
      </div>

      <p class="section-label">Kardex y trazabilidad</p>
      <div class="admin-grid" style="margin-bottom:16px;">
        <div class="admin-action-card" onclick="AdminView.abrirModal('ver-kardex-item')">
          <div class="aa-icon">📋</div>
          <div class="aa-title">Kardex de un ítem</div>
          <div class="aa-desc">Ver historial completo de movimientos</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('editar-kardex')">
          <div class="aa-icon">🖊️</div>
          <div class="aa-title">Corregir movimiento kardex</div>
          <div class="aa-desc">Editar observación o anular un movimiento</div>
        </div>
      </div>

      <p class="section-label">Ubicaciones y estructura</p>
      <div class="admin-grid">
        <div class="admin-action-card" onclick="AdminView.abrirModal('crear-ubicacion')">
          <div class="aa-icon">📍</div>
          <div class="aa-title">Crear ubicación</div>
          <div class="aa-desc">Agregar posición nueva en el almacén</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('desactivar-ubicacion')">
          <div class="aa-icon">🔒</div>
          <div class="aa-title">Desactivar ubicación</div>
          <div class="aa-desc">Marcar una posición como no disponible</div>
        </div>
        <div class="admin-action-card" onclick="AdminView.abrirModal('mover-masivo')">
          <div class="aa-icon">🚛</div>
          <div class="aa-title">Movimiento masivo</div>
          <div class="aa-desc">Mover toda una ubicación a otra</div>
        </div>
      </div>

      <!-- MODAL CONTAINER -->
      <div id="admin-modal-cont"></div>
    `;
  },

  afterRender() {},

  abrirModal(tipo) {
    const cont = document.getElementById('admin-modal-cont');
    const configs = {
      'revertir-despacho': {
        titulo: '↩️ Revertir despacho',
        size: 'modal-lg',
        body: this._bodyRevertirDespacho()
      },
      'anular-orden': {
        titulo: '🚫 Anular orden de picking',
        body: this._bodyAnularOrden()
      },
      'limpiar-pruebas': {
        titulo: '🗑️ Limpiar datos de prueba',
        body: this._bodyLimpiarPruebas()
      },
      'editar-stock': {
        titulo: '✏️ Editar ítem de stock',
        size: 'modal-lg',
        body: this._bodyEditarStock()
      },
      'ajuste-inventario': {
        titulo: '⚖️ Ajuste de inventario',
        body: this._bodyAjusteInventario()
      },
      'marcar-danado': {
        titulo: '⚠️ Marcar como dañado',
        body: this._bodyMarcarDanado()
      },
      'fusionar-paletas': {
        titulo: '🔗 Fusionar paletas/pedidos',
        body: this._bodyFusionarPaletas()
      },
      'cambiar-paleta': {
        titulo: '📦 Cambiar paleta/pedido de ítem',
        body: this._bodyCambiarPaleta()
      },
      'revertir-recepcion': {
        titulo: '↩️ Revertir recepción',
        body: this._bodyRevertirRecepcion()
      },
      'ver-kardex-item': {
        titulo: '📋 Kardex de ítem',
        size: 'modal-lg',
        body: this._bodyVerKardex()
      },
      'cambiar-estado-orden': {
        titulo: '🔄 Cambiar estado de orden',
        body: this._bodyCambiarEstadoOrden()
      },
      'crear-ubicacion': {
        titulo: '📍 Crear ubicación',
        body: this._bodyCrearUbicacion()
      },
      'mover-masivo': {
        titulo: '🚛 Movimiento masivo de ubicación',
        body: this._bodyMoverMasivo()
      },
    };
    const cfg = configs[tipo];
    if (!cfg) return;

    cont.innerHTML = `
      <div class="modal-overlay" id="admin-overlay">
        <div class="modal-box ${cfg.size || ''}">
          <div class="modal-header">
            <h3>${cfg.titulo}</h3>
            <button class="btn-modal-close" onclick="AdminView.cerrarModal()">×</button>
          </div>
          <div class="modal-body" id="admin-modal-body">
            ${cfg.body}
          </div>
          <div class="modal-footer" id="admin-modal-footer"></div>
        </div>
      </div>
    `;
    document.getElementById('admin-overlay').addEventListener('click', e => {
      if (e.target.id === 'admin-overlay') this.cerrarModal();
    });
    this._bindModalEvents(tipo);
  },

  cerrarModal() {
    const cont = document.getElementById('admin-modal-cont');
    if (cont) cont.innerHTML = '';
  },

  // ---- BODIES DE CADA MODAL ----

  _bodyRevertirDespacho() {
    return `
      <div class="field">
        <label>Buscar despacho (GR o ID)</label>
        <input id="adm-busq-despacho" type="text">
      </div>
      <button class="btn-secondary" id="adm-btn-buscar-despacho">Buscar</button>
      <div id="adm-resultado-despacho" style="margin-top:12px;"></div>
    `;
  },

  _bodyAnularOrden() {
    return `
      <div class="field">
        <label>Buscar orden (GR o número)</label>
        <input id="adm-busq-orden" type="text">
      </div>
      <button class="btn-secondary" id="adm-btn-buscar-orden">Buscar</button>
      <div id="adm-resultado-orden" style="margin-top:12px;"></div>
    `;
  },

  _bodyLimpiarPruebas() {
    return `
      <div class="alert alert-danger">
        <div>
          <strong>⚠ Acción irreversible</strong><br>
          Esto borrará TODAS las órdenes de picking (despachos e ítems) que existan actualmente
          y restaurará el stock a DISPONIBLE. Úsalo solo para limpiar datos de prueba antes de comenzar a operar en producción.
        </div>
      </div>
      <div class="field">
        <label>Escribe CONFIRMAR para habilitar el botón</label>
        <input id="adm-confirm-limpiar" type="text" placeholder="">
      </div>
      <button class="btn-danger" id="adm-btn-limpiar" disabled style="width:100%;">
        🗑️ Borrar todos los despachos y restaurar stock
      </button>
      <div id="adm-msg-limpiar" style="margin-top:8px;"></div>
    `;
  },

  _bodyEditarStock() {
    return `
      <div class="field">
        <label>Buscar por SKU, serie o paleta</label>
        <input id="adm-busq-stock" type="text" autocomplete="off">
      </div>
      <button class="btn-secondary" id="adm-btn-buscar-stock">Buscar</button>
      <div id="adm-resultado-stock" style="margin-top:12px;"></div>
    `;
  },

  _bodyAjusteInventario() {
    return `
      <div class="field">
        <label>Buscar ítem (SKU o serie)</label>
        <input id="adm-sku-ajuste" type="text" autocomplete="off">
      </div>
      <button class="btn-secondary" id="adm-btn-buscar-ajuste">Buscar</button>
      <div id="adm-resultado-ajuste" style="margin-top:12px;"></div>
    `;
  },

  _bodyMarcarDanado() {
    return `
      <div class="field">
        <label>Buscar ítem (SKU o serie)</label>
        <input id="adm-sku-danado" type="text" autocomplete="off">
      </div>
      <button class="btn-secondary" id="adm-btn-buscar-danado">Buscar</button>
      <div id="adm-resultado-danado" style="margin-top:12px;"></div>
    `;
  },

  _bodyFusionarPaletas() {
    return `
      <div class="alert alert-warning">Todos los ítems de la paleta origen pasarán a la paleta destino.</div>
      <div class="field"><label>Paleta/Pedido origen (a eliminar)</label><input id="adm-fus-origen" type="text"></div>
      <div class="field"><label>Paleta/Pedido destino (la que queda)</label><input id="adm-fus-destino" type="text"></div>
      <div class="field"><label>Motivo</label><input id="adm-fus-motivo" type="text"></div>
      <button class="btn-warning" id="adm-btn-fusionar" style="width:100%;">Fusionar</button>
      <div id="adm-msg-fusionar" style="margin-top:8px;"></div>
    `;
  },

  _bodyCambiarPaleta() {
    return `
      <div class="field">
        <label>Buscar ítem (SKU o serie)</label>
        <input id="adm-sku-cambpp" type="text">
      </div>
      <button class="btn-secondary" id="adm-btn-buscar-cambpp">Buscar</button>
      <div id="adm-resultado-cambpp" style="margin-top:12px;"></div>
    `;
  },

  _bodyRevertirRecepcion() {
    return `
      <div class="field">
        <label>Número de pedido / paleta</label>
        <input id="adm-pp-recep" type="text">
      </div>
      <button class="btn-secondary" id="adm-btn-buscar-recep">Buscar ítems</button>
      <div id="adm-resultado-recep" style="margin-top:12px;"></div>
    `;
  },

  _bodyVerKardex() {
    return `
      <div class="field">
        <label>SKU</label>
        <input id="adm-sku-kardex" type="text" autocomplete="off">
      </div>
      <button class="btn-secondary" id="adm-btn-ver-kardex">Ver historial</button>
      <div id="adm-resultado-kardex" style="margin-top:12px;"></div>
    `;
  },

  _bodyCambiarEstadoOrden() {
    return `
      <div class="field">
        <label>Buscar orden (GR)</label>
        <input id="adm-gr-estado" type="text">
      </div>
      <button class="btn-secondary" id="adm-btn-buscar-estado">Buscar</button>
      <div id="adm-resultado-estado" style="margin-top:12px;"></div>
    `;
  },

  _bodyCrearUbicacion() {
    return `
      <div class="field-grid">
        <div class="field"><label>Zona (ej: A, B, C)</label><input id="adm-ubic-zona" type="text"></div>
        <div class="field"><label>Nivel (ej: 01)</label><input id="adm-ubic-nivel" type="text"></div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Columna (ej: 01)</label><input id="adm-ubic-col" type="text"></div>
        <div class="field"><label>Posición (ej: 01)</label><input id="adm-ubic-pos" type="text"></div>
      </div>
      <div class="field">
        <label>Tipo</label>
        <select id="adm-ubic-tipo">
          <option value="RACK">Rack</option>
          <option value="PISO">Piso</option>
          <option value="PASILLO">Pasillo</option>
        </select>
      </div>
      <button class="btn-primary" id="adm-btn-crear-ubic" style="width:100%;">Crear ubicación</button>
      <div id="adm-msg-ubic" style="margin-top:8px;"></div>
    `;
  },

  _bodyMoverMasivo() {
    return `
      <div class="field"><label>Ubicación origen</label><input id="adm-mov-origen" type="text"></div>
      <div class="field"><label>Ubicación destino</label><input id="adm-mov-destino" type="text"></div>
      <div class="field"><label>Motivo</label><input id="adm-mov-motivo" type="text"></div>
      <button class="btn-warning" id="adm-btn-mover-masivo" style="width:100%;">Mover todos los ítems</button>
      <div id="adm-msg-mover" style="margin-top:8px;"></div>
    `;
  },

  // ---- BIND DE EVENTOS POR MODAL ----
  _bindModalEvents(tipo) {
    switch(tipo) {
      case 'revertir-despacho':  this._bindRevertirDespacho(); break;
      case 'anular-orden':       this._bindAnularOrden(); break;
      case 'limpiar-pruebas':    this._bindLimpiarPruebas(); break;
      case 'editar-stock':       this._bindEditarStock(); break;
      case 'ajuste-inventario':  this._bindAjusteInventario(); break;
      case 'marcar-danado':      this._bindMarcarDanado(); break;
      case 'fusionar-paletas':   this._bindFusionarPaletas(); break;
      case 'cambiar-paleta':     this._bindCambiarPaleta(); break;
      case 'revertir-recepcion': this._bindRevertirRecepcion(); break;
      case 'ver-kardex-item':    this._bindVerKardex(); break;
      case 'cambiar-estado-orden': this._bindCambiarEstadoOrden(); break;
      case 'crear-ubicacion':    this._bindCrearUbicacion(); break;
      case 'mover-masivo':       this._bindMoverMasivo(); break;
    }
  },

  _bindLimpiarPruebas() {
    const input = document.getElementById('adm-confirm-limpiar');
    const btn   = document.getElementById('adm-btn-limpiar');
    input.addEventListener('input', () => {
      btn.disabled = input.value.trim().toUpperCase() !== 'CONFIRMAR';
    });
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Limpiando…';
      const { error, count } = await limpiarDatosPrueba();
      const msg = document.getElementById('adm-msg-limpiar');
      if (error) {
        msg.innerHTML = `<p class="msg-error">Error al limpiar: ${escapeHtml(String(error))}</p>`;
        btn.disabled = false; btn.textContent = '🗑️ Borrar todos los despachos y restaurar stock';
      } else {
        msg.innerHTML = `<p class="msg-ok">✓ Limpieza completa. ${count || ''} registros eliminados. Stock restaurado.</p>`;
        btn.textContent = '✓ Listo';
      }
    });
  },

  _bindRevertirDespacho() {
    document.getElementById('adm-btn-buscar-despacho')?.addEventListener('click', async () => {
      const q = document.getElementById('adm-busq-despacho').value.trim();
      const cont = document.getElementById('adm-resultado-despacho');
      if (!q) return;
      cont.innerHTML = '<p class="msg-warning">Buscando…</p>';
      const despachos = await obtenerTodosLosDespachos({});
      const found = despachos.filter(d => d.gr?.includes(q) || String(d.id) === q);
      if (!found.length) { cont.innerHTML = '<p class="msg-error">No encontrado.</p>'; return; }
      cont.innerHTML = found.map(d => `
        <div class="card" style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <strong style="font-family:monospace;">${escapeHtml(d.gr||'Sin GR')}</strong>
              <span style="margin-left:8px; font-size:11px; color:var(--text-secondary);">
                ${escapeHtml(d.destino||'')} · ${escapeHtml(d.cliente||'')} · ${pillEstado(calcularEstadoVisual(d))}
              </span>
            </div>
            <button class="btn-danger" data-rev-id="${d.id}">↩ Revertir</button>
          </div>
        </div>
      `).join('');
      cont.querySelectorAll('[data-rev-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Revertir este despacho? El stock se restaurará.')) return;
          btn.disabled = true; btn.textContent = 'Revirtiendo…';
          const { error } = await revertirDespacho(Number(btn.dataset.revId));
          if (error) { btn.disabled = false; btn.textContent = '↩ Revertir'; alert('Error al revertir.'); }
          else { btn.textContent = '✓ Revertido'; btn.className = 'btn-ghost'; }
        });
      });
    });
  },

  _bindAnularOrden() {
    document.getElementById('adm-btn-buscar-orden')?.addEventListener('click', async () => {
      const q = document.getElementById('adm-busq-orden').value.trim();
      const cont = document.getElementById('adm-resultado-orden');
      if (!q) return;
      cont.innerHTML = '<p class="msg-warning">Buscando…</p>';
      const despachos = await obtenerTodosLosDespachos({});
      const found = despachos.filter(d => d.gr?.includes(q) || String(d.id) === q);
      if (!found.length) { cont.innerHTML = '<p class="msg-error">No encontrado.</p>'; return; }
      cont.innerHTML = found.map(d => `
        <div class="card" style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
            <div>
              <strong style="font-family:monospace;">${escapeHtml(d.gr||'Sin GR')}</strong>
              <span style="margin-left:8px; font-size:11px;">${pillEstado(calcularEstadoVisual(d))}</span>
            </div>
            <button class="btn-danger" data-anul-id="${d.id}">Anular orden</button>
          </div>
        </div>
      `).join('');
      cont.querySelectorAll('[data-anul-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Anular esta orden de picking?')) return;
          btn.disabled = true;
          const { error } = await anularOrdenCompleta(Number(btn.dataset.anulId));
          if (error) { btn.disabled = false; alert('Error al anular.'); }
          else { btn.textContent = '✓ Anulada'; btn.className = 'btn-ghost'; }
        });
      });
    });
  },

  _bindEditarStock() {
    document.getElementById('adm-btn-buscar-stock')?.addEventListener('click', async () => {
      const q = document.getElementById('adm-busq-stock').value.trim();
      const cont = document.getElementById('adm-resultado-stock');
      if (!q) return;
      cont.innerHTML = '<p class="msg-warning">Buscando…</p>';
      const { data } = await buscarStockAvanzado({ sku: q, serie: q, paleta: q, limit: 20 });
      if (!data?.length) { cont.innerHTML = '<p class="msg-error">No encontrado.</p>'; return; }
      cont.innerHTML = `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>SKU</th><th>Serie</th><th>Cantidad</th><th>Paleta/Pedido</th><th>Ubicación</th><th></th></tr></thead>
            <tbody>
              ${data.map(r => `
                <tr id="adm-row-${r.id}">
                  <td class="sku-cell">${escapeHtml(r.sku)}</td>
                  <td style="font-family:monospace; font-size:11px;">${escapeHtml(r.serie||'-')}</td>
                  <td>
                    <input type="number" value="${r.cantidad}" min="0"
                      id="adm-cant-${r.id}"
                      style="width:70px; text-align:center; background:var(--bg-input); border:1px solid var(--border-strong); border-radius:4px; padding:3px 6px; font-weight:700;">
                  </td>
                  <td>
                    <input type="text" value="${escapeHtml(r.paleta_pedido||'')}"
                      id="adm-pp-${r.id}"
                      style="width:110px; background:var(--bg-input); border:1px solid var(--border-strong); border-radius:4px; padding:3px 6px; font-size:11px;">
                  </td>
                  <td>
                    <input type="text" value="${escapeHtml(r.ubicacion_fisica||'')}"
                      id="adm-ubic-${r.id}"
                      style="width:100px; background:var(--bg-input); border:1px solid var(--border-strong); border-radius:4px; padding:3px 6px; font-size:11px;">
                  </td>
                  <td>
                    <button class="btn-primary" style="padding:5px 10px; font-size:11px;" data-guardar-stock="${r.id}">Guardar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      cont.querySelectorAll('[data-guardar-stock]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.dataset.guardarStock);
          const cant  = Number(document.getElementById(`adm-cant-${id}`)?.value);
          const pp    = document.getElementById(`adm-pp-${id}`)?.value.trim();
          const ubic  = document.getElementById(`adm-ubic-${id}`)?.value.trim();
          btn.disabled = true; btn.textContent = '…';
          const { error } = await editarStock(id, { cantidad: cant, paleta_pedido: pp, ubicacion_fisica: ubic });
          btn.disabled = false;
          btn.textContent = error ? '❌ Error' : '✓ Guardado';
          btn.className = error ? 'btn-danger' : 'btn-success';
        });
      });
    });
  },

  _bindAjusteInventario() {
    document.getElementById('adm-btn-buscar-ajuste')?.addEventListener('click', async () => {
      const q = document.getElementById('adm-sku-ajuste').value.trim();
      const cont = document.getElementById('adm-resultado-ajuste');
      if (!q) return;
      const { data } = await buscarStockAvanzado({ sku: q, serie: q, limit: 10 });
      if (!data?.length) { cont.innerHTML = '<p class="msg-error">No encontrado.</p>'; return; }
      const r = data[0];
      cont.innerHTML = `
        <div class="card">
          <p style="font-family:monospace; font-weight:700;">${escapeHtml(r.sku)}</p>
          <p style="font-size:11px; color:var(--text-secondary);">${escapeHtml(r.descripcion||'')}</p>
          <div class="field-grid" style="margin-top:10px;">
            <div class="field"><label>Cantidad actual</label><input type="number" value="${r.cantidad}" disabled style="background:var(--bg-row-alt);"></div>
            <div class="field"><label>Nueva cantidad real</label><input type="number" id="adm-nueva-cant" min="0" value="${r.cantidad}"></div>
          </div>
          <div class="field"><label>Motivo del ajuste</label>
            <select id="adm-motivo-ajuste">
              <option value="Conteo físico">Conteo físico</option>
              <option value="Error de ingreso">Error de ingreso</option>
              <option value="Pérdida">Pérdida</option>
              <option value="Devolución">Devolución</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div class="field"><label>Observación</label><input type="text" id="adm-obs-ajuste"></div>
          <button class="btn-warning" id="adm-btn-ajustar" style="width:100%;">Confirmar ajuste</button>
          <div id="adm-msg-ajuste" style="margin-top:8px;"></div>
        </div>
      `;
      document.getElementById('adm-btn-ajustar')?.addEventListener('click', async () => {
        const nuevaCant = Number(document.getElementById('adm-nueva-cant').value);
        const motivo    = document.getElementById('adm-motivo-ajuste').value;
        const obs       = document.getElementById('adm-obs-ajuste').value.trim();
        const btn       = document.getElementById('adm-btn-ajustar');
        btn.disabled = true; btn.textContent = 'Ajustando…';
        const { error } = await ajustarInventario(r.id, nuevaCant, motivo, obs);
        const msg = document.getElementById('adm-msg-ajuste');
        msg.innerHTML = error
          ? `<p class="msg-error">Error al ajustar.</p>`
          : `<p class="msg-ok">✓ Stock ajustado de ${r.cantidad} a ${nuevaCant}. Motivo: ${escapeHtml(motivo)}</p>`;
        btn.disabled = false; btn.textContent = '✓ Ajustado';
      });
    });
  },

  _bindMarcarDanado() {
    document.getElementById('adm-btn-buscar-danado')?.addEventListener('click', async () => {
      const q = document.getElementById('adm-sku-danado').value.trim();
      const cont = document.getElementById('adm-resultado-danado');
      const { data } = await buscarStockAvanzado({ sku: q, serie: q, limit: 10 });
      if (!data?.length) { cont.innerHTML = '<p class="msg-error">No encontrado.</p>'; return; }
      cont.innerHTML = data.map(r => `
        <div class="card" style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <span class="sku-cell">${escapeHtml(r.sku)}</span>
              ${r.serie ? `<span style="font-size:11px; margin-left:6px;">${escapeHtml(r.serie)}</span>` : ''}
            </div>
            <button class="btn-danger" data-danar="${r.id}">Marcar dañado</button>
          </div>
        </div>
      `).join('');
      cont.querySelectorAll('[data-danar]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Marcar este ítem como DAÑADO? Saldrá del stock disponible.')) return;
          btn.disabled = true;
          await editarStock(Number(btn.dataset.danar), { estado: 'DAÑADO' });
          btn.textContent = '✓ Marcado'; btn.className = 'btn-ghost';
        });
      });
    });
  },

  _bindFusionarPaletas() {
    document.getElementById('adm-btn-fusionar')?.addEventListener('click', async () => {
      const origen  = document.getElementById('adm-fus-origen').value.trim();
      const destino = document.getElementById('adm-fus-destino').value.trim();
      const motivo  = document.getElementById('adm-fus-motivo').value.trim();
      const msg = document.getElementById('adm-msg-fusionar');
      if (!origen || !destino) { msg.innerHTML = '<p class="msg-error">Completa ambos campos.</p>'; return; }
      const btn = document.getElementById('adm-btn-fusionar');
      btn.disabled = true; btn.textContent = 'Fusionando…';
      const { error, count } = await fusionarPaletas(origen, destino, motivo);
      msg.innerHTML = error
        ? `<p class="msg-error">Error al fusionar.</p>`
        : `<p class="msg-ok">✓ ${count} ítems movidos de "${escapeHtml(origen)}" a "${escapeHtml(destino)}"</p>`;
      btn.disabled = false; btn.textContent = '🔗 Fusionar';
    });
  },

  _bindCambiarPaleta() {
    document.getElementById('adm-btn-buscar-cambpp')?.addEventListener('click', async () => {
      const q = document.getElementById('adm-sku-cambpp').value.trim();
      const cont = document.getElementById('adm-resultado-cambpp');
      const { data } = await buscarStockAvanzado({ sku: q, serie: q, limit: 10 });
      if (!data?.length) { cont.innerHTML = '<p class="msg-error">No encontrado.</p>'; return; }
      cont.innerHTML = data.map(r => `
        <div class="card" style="margin-bottom:8px;">
          <div style="margin-bottom:6px;">
            <span class="sku-cell">${escapeHtml(r.sku)}</span>
            <span style="font-size:11px; color:var(--text-secondary); margin-left:6px;">Pedido actual: ${escapeHtml(r.paleta_pedido||'-')}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="nuevo-pp-${r.id}" placeholder="Nuevo pedido/paleta" style="flex:1; background:var(--bg-input); border:1px solid var(--border-strong); border-radius:4px; padding:6px 8px; font-size:12px;">
            <button class="btn-primary" style="padding:6px 12px; font-size:12px;" data-cambpp="${r.id}">Cambiar</button>
          </div>
        </div>
      `).join('');
      cont.querySelectorAll('[data-cambpp]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.dataset.cambpp);
          const nuevo = document.getElementById(`nuevo-pp-${id}`)?.value.trim();
          if (!nuevo) return;
          btn.disabled = true;
          await editarStock(id, { paleta_pedido: nuevo });
          btn.textContent = '✓'; btn.className = 'btn-ghost';
        });
      });
    });
  },

  _bindRevertirRecepcion() {
    document.getElementById('adm-btn-buscar-recep')?.addEventListener('click', async () => {
      const pp = document.getElementById('adm-pp-recep').value.trim();
      const cont = document.getElementById('adm-resultado-recep');
      if (!pp) return;
      const { data } = await buscarStockAvanzado({ paleta: pp, limit: 50 });
      if (!data?.length) { cont.innerHTML = '<p class="msg-error">No se encontraron ítems con ese pedido/paleta.</p>'; return; }
      cont.innerHTML = `
        <div class="alert alert-warning">Se encontraron ${data.length} ítems con pedido/paleta "${escapeHtml(pp)}". Revertir los eliminará del stock.</div>
        <button class="btn-danger" id="adm-btn-conf-revertir-recep" style="width:100%;">↩ Revertir ${data.length} ítems</button>
        <div id="adm-msg-rev-recep" style="margin-top:8px;"></div>
      `;
      document.getElementById('adm-btn-conf-revertir-recep')?.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar los ${data.length} ítems con pedido/paleta "${pp}"? Esta acción no se puede deshacer.`)) return;
        const btn = document.getElementById('adm-btn-conf-revertir-recep');
        btn.disabled = true; btn.textContent = 'Revirtiendo…';
        const { error } = await revertirRecepcionPorPaleta(pp);
        const msg = document.getElementById('adm-msg-rev-recep');
        msg.innerHTML = error ? '<p class="msg-error">Error al revertir.</p>' : '<p class="msg-ok">✓ Recepción revertida.</p>';
      });
    });
  },

  _bindVerKardex() {
    document.getElementById('adm-btn-ver-kardex')?.addEventListener('click', async () => {
      const sku = document.getElementById('adm-sku-kardex').value.trim();
      const cont = document.getElementById('adm-resultado-kardex');
      if (!sku) return;
      cont.innerHTML = '<p class="msg-warning">Cargando…</p>';
      const movs = await obtenerKardex({ sku, limit: 100 });
      if (!movs?.length) { cont.innerHTML = '<p class="msg-error">Sin movimientos para ese SKU.</p>'; return; }
      cont.innerHTML = `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Referencia</th><th>Usuario</th></tr></thead>
            <tbody>
              ${movs.map(m => `
                <tr>
                  <td>${formatFecha(m.fecha || m.creado_en)}</td>
                  <td><span class="pill ${m.tipo_movimiento === 'ENTRADA' ? 'pill-success' : 'pill-danger'}">${escapeHtml(m.tipo_movimiento)}</span></td>
                  <td>${formatNum(m.cantidad)}</td>
                  <td>${escapeHtml(m.referencia||'-')}</td>
                  <td>${escapeHtml(m.usuario||'-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });
  },

  _bindCambiarEstadoOrden() {
    document.getElementById('adm-btn-buscar-estado')?.addEventListener('click', async () => {
      const q = document.getElementById('adm-gr-estado').value.trim();
      const cont = document.getElementById('adm-resultado-estado');
      const despachos = await obtenerTodosLosDespachos({});
      const found = despachos.filter(d => d.gr?.includes(q));
      if (!found.length) { cont.innerHTML = '<p class="msg-error">No encontrado.</p>'; return; }
      const d = found[0];
      cont.innerHTML = `
        <div class="card">
          <p style="font-family:monospace; font-weight:700;">${escapeHtml(d.gr)}</p>
          <p style="font-size:11px; color:var(--text-secondary); margin-bottom:10px;">Estado actual: ${pillEstado(d.status)}</p>
          <div class="field"><label>Nuevo estado</label>
            <select id="adm-nuevo-estado">
              <option value="BORRADOR">BORRADOR</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="EN_PROCESO">EN_PROCESO</option>
              <option value="PICKEADO">PICKEADO</option>
              <option value="DESPACHADO">DESPACHADO</option>
            </select>
          </div>
          <button class="btn-warning" id="adm-btn-cambiar-estado" style="width:100%;">Cambiar estado</button>
          <div id="adm-msg-estado" style="margin-top:8px;"></div>
        </div>
      `;
      document.getElementById('adm-btn-cambiar-estado')?.addEventListener('click', async () => {
        const nuevoEstado = document.getElementById('adm-nuevo-estado').value;
        const { error } = await cambiarEstadoOrden(d.id, nuevoEstado);
        document.getElementById('adm-msg-estado').innerHTML = error
          ? '<p class="msg-error">Error al cambiar estado.</p>'
          : `<p class="msg-ok">✓ Estado cambiado a ${nuevoEstado}</p>`;
      });
    });
  },

  _bindCrearUbicacion() {
    document.getElementById('adm-btn-crear-ubic')?.addEventListener('click', async () => {
      const zona  = document.getElementById('adm-ubic-zona').value.trim().toUpperCase();
      const nivel = document.getElementById('adm-ubic-nivel').value.trim().padStart(2,'0');
      const col   = document.getElementById('adm-ubic-col').value.trim().padStart(2,'0');
      const pos   = document.getElementById('adm-ubic-pos').value.trim().padStart(2,'0');
      const tipo  = document.getElementById('adm-ubic-tipo').value;
      const msg   = document.getElementById('adm-msg-ubic');
      if (!zona) { msg.innerHTML = '<p class="msg-error">Ingresa la zona.</p>'; return; }
      const codigo = zona === 'A' ? `${zona}-${nivel}-${col}-${pos}` : `${zona}-${nivel}-${col}`;
      const { error } = await crearUbicacion({ zona, pasillo: col, posicion: pos, subPosicion: nivel, tipo });
      msg.innerHTML = error
        ? `<p class="msg-error">Error: ${escapeHtml(String(error))}</p>`
        : `<p class="msg-ok">✓ Ubicación ${codigo} creada.</p>`;
    });
  },

  _bindMoverMasivo() {
    document.getElementById('adm-btn-mover-masivo')?.addEventListener('click', async () => {
      const origen  = document.getElementById('adm-mov-origen').value.trim();
      const destino = document.getElementById('adm-mov-destino').value.trim();
      const msg     = document.getElementById('adm-msg-mover');
      if (!origen || !destino) { msg.innerHTML = '<p class="msg-error">Completa ambos campos.</p>'; return; }
      if (!confirm(`¿Mover todos los ítems de "${origen}" a "${destino}"?`)) return;
      const btn = document.getElementById('adm-btn-mover-masivo');
      btn.disabled = true; btn.textContent = 'Moviendo…';
      const { error, count } = await moverPaletaCompleta(origen, destino);
      msg.innerHTML = error
        ? '<p class="msg-error">Error al mover.</p>'
        : `<p class="msg-ok">✓ ${count||'Todos los'} ítems movidos a "${escapeHtml(destino)}"</p>`;
      btn.disabled = false; btn.textContent = 'Mover todos los ítems';
    });
  },
};

Router.register('admin', AdminView);
