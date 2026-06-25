// ============================================================
// ADMIN — helper compartido: búsqueda de stock con todos los filtros
// ============================================================

async function _adminBuscarStock(q, cont) {
  if (!q) { cont.innerHTML = '<p class="msg-error">Ingresa un valor para buscar.</p>'; return null; }
  cont.innerHTML = '<p style="font-size:11px; color:var(--text-tertiary);">Buscando…</p>';
  const { data } = await buscarStockAvanzado({
    sku: q, serie: q, descripcion: q, paleta: q, ubic: q, limit: 30
  });
  if (!data?.length) { cont.innerHTML = '<p class="msg-error">No se encontraron resultados.</p>'; return null; }
  return data;
}

function _adminTablaStock(data, onSelect) {
  return `
    <div class="table-wrap" style="margin-top:8px;">
      <table class="data-table">
        <thead><tr><th>SKU</th><th>Descripción</th><th>Serie</th><th>Cant.</th><th>Paleta/Pedido</th><th>Ubic.</th><th></th></tr></thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td class="sku-cell">${escapeHtml(r.sku)}</td>
              <td class="desc-cell" style="max-width:200px;">${escapeHtml((r.descripcion||'').substring(0,60))}</td>
              <td class="serie-cell">${escapeHtml(r.serie||'-')}</td>
              <td style="font-weight:700;">${formatNum(r.cantidad)}</td>
              <td style="font-family:monospace; font-size:11px;">${escapeHtml(r.paleta_pedido||'-')}</td>
              <td>${escapeHtml(r.ubicacion_fisica||'-')}</td>
              <td><button class="btn-primary" style="padding:4px 10px; font-size:11px;" data-sel-stock="${r.id}"
                onclick="(${onSelect.toString()})(${JSON.stringify(r)})">Seleccionar</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

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
        <div class="admin-action-card" onclick="AdminView.abrirModal('renombrar-paleta')">
          <div class="aa-icon">✏️</div>
          <div class="aa-title">Renombrar paleta/pedido</div>
          <div class="aa-desc">Corregir el nombre de un pedido en todos sus ítems a la vez</div>
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

      <p class="section-label" style="margin-top:16px;">Usuarios y acceso</p>
      <div class="admin-grid" style="margin-bottom:16px;">
        <div class="admin-action-card" onclick="AdminView.abrirModal('gestionar-usuarios')">
          <div class="aa-icon">👥</div>
          <div class="aa-title">Gestionar usuarios</div>
          <div class="aa-desc">Crear, activar o cambiar rol de usuarios del sistema</div>
        </div>
      </div>

      <p class="section-label">Configuración</p>
      <div class="admin-grid">
        <div class="admin-action-card" onclick="AdminView.abrirModal('gestionar-condiciones')">
          <div class="aa-icon">🏷️</div>
          <div class="aa-title">Condiciones de ingreso</div>
          <div class="aa-desc">Agregar o desactivar valores de condición (NUEVO, DESMONTADO, etc.)</div>
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
      'gestionar-usuarios': {
        titulo: '👥 Gestionar usuarios',
        size: 'modal-lg',
        body: this._bodyGestionarUsuarios()
      },
      'desactivar-ubicacion': {
        titulo: '🔒 Desactivar ubicación',
        body: this._bodyDesactivarUbicacion()
      },
      'editar-kardex': {
        titulo: '🖊️ Corregir movimiento kardex',
        size: 'modal-lg',
        body: this._bodyEditarKardex()
      },
      'renombrar-paleta': {
        titulo: '✏️ Renombrar paleta/pedido masivo',
        body: this._bodyRenombrarPaleta()
      },
      'gestionar-condiciones': {
        titulo: '🏷️ Condiciones de ingreso',
        body: this._bodyGestionarCondiciones()
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
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
        Busca por uno o más campos. Aquí puedes corregir el <strong>código SKU</strong>, la <strong>serie</strong> o la <strong>cantidad</strong> de un ítem.
        Para mover a otra paleta/pedido o ubicación usa los módulos <em>Movimientos</em> o <em>Renombrar paleta/pedido</em>.
      </p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
        <div class="field"><label>SKU</label><input id="adm-busq-sku" type="text" autocomplete="off"></div>
        <div class="field"><label>Serie</label><input id="adm-busq-serie" type="text" autocomplete="off" style="font-family:monospace;"></div>
        <div class="field"><label>Descripción</label><input id="adm-busq-desc" type="text" autocomplete="off"></div>
        <div class="field"><label>Pedido / Paleta</label><input id="adm-busq-paleta" type="text" autocomplete="off"></div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn-primary" id="adm-btn-buscar-stock">Buscar</button>
        <button class="btn-ghost" id="adm-btn-limpiar-busq-stock">Limpiar</button>
      </div>
      <div id="adm-resultado-stock" style="margin-top:12px;"></div>
    `;
  },

  _bodyRenombrarPaleta() {
    return `
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
        Cambia el nombre de paleta/pedido a <strong>todos los ítems</strong> que tengan ese identificador.
        Útil cuando te equivocaste al escribir un número de pedido.
      </p>
      <div class="field"><label>Paleta/Pedido actual (el que está mal)</label><input id="adm-ren-origen" type="text" style="font-family:monospace;"></div>
      <div class="field"><label>Nombre correcto</label><input id="adm-ren-destino" type="text" style="font-family:monospace;"></div>
      <button class="btn-secondary" id="adm-btn-preview-ren">Ver ítems afectados</button>
      <div id="adm-resultado-ren" style="margin-top:10px;"></div>
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
      case 'mover-masivo':          this._bindMoverMasivo(); break;
      case 'gestionar-usuarios':    this._bindGestionarUsuarios(); break;
      case 'desactivar-ubicacion': this._bindDesactivarUbicacion(); break;
      case 'editar-kardex':        this._bindEditarKardex(); break;
      case 'renombrar-paleta':      this._bindRenombrarPaleta(); break;
      case 'gestionar-condiciones': this._bindGestionarCondiciones(); break;
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
    const buscar = async () => {
      const sku    = document.getElementById('adm-busq-sku')?.value.trim()    || '';
      const serie  = document.getElementById('adm-busq-serie')?.value.trim()  || '';
      const desc   = document.getElementById('adm-busq-desc')?.value.trim()   || '';
      const paleta = document.getElementById('adm-busq-paleta')?.value.trim() || '';
      const cont   = document.getElementById('adm-resultado-stock');
      if (!sku && !serie && !desc && !paleta) {
        cont.innerHTML = '<div class="alert alert-warning">Ingresa al menos un filtro.</div>'; return;
      }
      cont.innerHTML = '<p class="msg-warning">Buscando…</p>';
      const { data } = await buscarStockAvanzado({ sku, serie, descripcion: desc, paleta, limit: 50 });
      if (!data?.length) { cont.innerHTML = '<p class="msg-error">No encontrado.</p>'; return; }
      cont.innerHTML = `
        <p style="font-size:11px; color:var(--text-tertiary); margin-bottom:6px;">
          ${data.length} ítem${data.length!==1?'s':''} — edita SKU, serie y cantidad.
          Para cambiar paleta/pedido o ubicación usa <strong>Renombrar paleta/pedido</strong> o <strong>Movimientos</strong>.
        </p>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>SKU <small style="font-weight:400;color:var(--accent);font-size:9px;">editable</small></th>
              <th>Serie <small style="font-weight:400;color:var(--accent);font-size:9px;">editable</small></th>
              <th>Cant. <small style="font-weight:400;color:var(--accent);font-size:9px;">editable</small></th>
              <th>Paleta/Pedido</th>
              <th>Ubicación</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${data.map(r => `
                <tr id="adm-row-${r.id}">
                  <td>
                    <input type="text" value="${escapeHtml(r.sku||'')}"
                      id="adm-sku-edit-${r.id}"
                      style="width:130px; font-family:monospace; font-size:11px; font-weight:700; background:var(--bg-input); border:1px solid var(--accent-dim); border-radius:4px; padding:3px 6px;">
                  </td>
                  <td>
                    <input type="text" value="${escapeHtml(r.serie||'')}"
                      id="adm-serie-edit-${r.id}"
                      style="width:130px; font-family:monospace; font-size:10px; background:var(--bg-input); border:1px solid var(--accent-dim); border-radius:4px; padding:3px 6px;">
                  </td>
                  <td style="font-weight:700; color:var(--accent); text-align:center;">${formatNum(r.cantidad)}</td>
                  <td style="font-size:11px; color:var(--text-secondary);">${escapeHtml(r.paleta_pedido||'-')}</td>
                  <td style="font-size:11px; color:var(--text-secondary);">${escapeHtml(r.ubicacion_fisica||'-')}</td>
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
          const id   = Number(btn.dataset.guardarStock);
          const sku  = document.getElementById(`adm-sku-edit-${id}`)?.value.trim().toUpperCase();
          const serie= document.getElementById(`adm-serie-edit-${id}`)?.value.trim();
          if (!sku) { alert('El SKU no puede quedar vacío.'); return; }
          btn.disabled = true; btn.textContent = '…';
          const { error } = await editarStock(id, { sku, serie });
          btn.disabled = false;
          btn.textContent = error ? '❌ Error' : '✓ Guardado';
          btn.className   = error ? 'btn-danger' : 'btn-success';
        });
      });
    };

    document.getElementById('adm-btn-buscar-stock')?.addEventListener('click', buscar);
    document.getElementById('adm-btn-limpiar-busq-stock')?.addEventListener('click', () => {
      ['adm-busq-sku','adm-busq-serie','adm-busq-desc','adm-busq-paleta'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      const cont = document.getElementById('adm-resultado-stock');
      if (cont) cont.innerHTML = '';
    });
    ['adm-busq-sku','adm-busq-serie','adm-busq-desc','adm-busq-paleta'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
    });
  },

  _bindRenombrarPaleta() {
    document.getElementById('adm-btn-preview-ren')?.addEventListener('click', async () => {
      const origen  = document.getElementById('adm-ren-origen')?.value.trim();
      const destino = document.getElementById('adm-ren-destino')?.value.trim();
      const cont    = document.getElementById('adm-resultado-ren');
      if (!origen) { cont.innerHTML = '<p class="msg-error">Ingresa el nombre actual.</p>'; return; }
      cont.innerHTML = '<p class="msg-warning">Buscando…</p>';
      const { data } = await buscarStockAvanzado({ paleta: origen, limit: 200 });
      if (!data?.length) { cont.innerHTML = '<p class="msg-error">No se encontraron ítems con ese nombre.</p>'; return; }
      cont.innerHTML = `
        <div class="alert alert-warning" style="margin-bottom:10px;">
          Se renombrarán <strong>${data.length} ítems</strong> de
          <code>${escapeHtml(origen)}</code> → <code>${escapeHtml(destino||'?')}</code>
        </div>
        <div class="table-wrap" style="margin-bottom:10px;">
          <table class="data-table">
            <thead><tr><th>SKU</th><th>Serie</th><th>Cant.</th><th>Ubicación</th></tr></thead>
            <tbody>
              ${data.slice(0,10).map(r => `<tr>
                <td class="sku-cell">${escapeHtml(r.sku)}</td>
                <td style="font-size:10px; font-family:monospace;">${escapeHtml(r.serie||'-')}</td>
                <td>${formatNum(r.cantidad)}</td>
                <td>${escapeHtml(r.ubicacion_fisica||'-')}</td>
              </tr>`).join('')}
              ${data.length > 10 ? `<tr><td colspan="4" style="text-align:center;font-size:11px;color:var(--text-tertiary);">… y ${data.length-10} más</td></tr>` : ''}
            </tbody>
          </table>
        </div>
        <button class="btn-warning" id="adm-btn-confirmar-ren" ${!destino?'disabled':''}>
          Renombrar ${data.length} ítems ${destino ? '→ ' + escapeHtml(destino) : '(falta el nombre correcto)'}
        </button>
        <div id="adm-msg-ren" style="margin-top:8px;"></div>
      `;
      document.getElementById('adm-btn-confirmar-ren')?.addEventListener('click', async () => {
        const dest = document.getElementById('adm-ren-destino')?.value.trim();
        if (!dest) { alert('Ingresa el nombre correcto.'); return; }
        if (!confirm(`¿Renombrar "${origen}" → "${dest}" en ${data.length} ítems? Esta acción no se puede deshacer fácilmente.`)) return;
        const btn = document.getElementById('adm-btn-confirmar-ren');
        btn.disabled = true; btn.textContent = 'Renombrando…';
        const { error } = await renombrarPaletaPedido(origen, dest);
        const msg = document.getElementById('adm-msg-ren');
        if (error) {
          msg.innerHTML = `<p class="msg-error">Error: ${escapeHtml(String(error))}</p>`;
          btn.disabled = false;
        } else {
          msg.innerHTML = `<p class="msg-ok">✓ ${data.length} ítems renombrados correctamente.</p>`;
          btn.textContent = '✓ Listo'; btn.className = 'btn-ghost';
        }
      });
    });
  },

  _bindAjusteInventario() {
    document.getElementById('adm-btn-buscar-ajuste')?.addEventListener('click', async () => {
      const q = document.getElementById('adm-sku-ajuste').value.trim();
      const cont = document.getElementById('adm-resultado-ajuste');
      if (!q) return;
      const { data } = await buscarStockAvanzado({ textoLibre: q, limit: 20 });
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
      const { data } = await buscarStockAvanzado({ textoLibre: q, limit: 20 });
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
      const { data } = await buscarStockAvanzado({ textoLibre: q, limit: 20 });
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

  // ── DESACTIVAR UBICACIÓN ───────────────────────────────────
  _bodyDesactivarUbicacion() {
    return `
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
        Marca una ubicación como no disponible. Los ítems que ya están ahí no se mueven — 
        solo se bloquea para nuevas asignaciones.
      </p>
      <div class="field"><label>Código de ubicación</label>
        <input id="adm-ubic-desact" type="text" placeholder="Ej: A-01-01-01" autocomplete="off">
      </div>
      <div class="field"><label>Motivo (opcional)</label>
        <input id="adm-ubic-desact-motivo" type="text">
      </div>
      <button class="btn-secondary" id="adm-btn-preview-desact">Ver ubicación</button>
      <div id="adm-resultado-desact" style="margin-top:10px;"></div>
    `;
  },

  _bindDesactivarUbicacion() {
    document.getElementById('adm-btn-preview-desact')?.addEventListener('click', async () => {
      const codigo = document.getElementById('adm-ubic-desact')?.value.trim().toUpperCase();
      const cont   = document.getElementById('adm-resultado-desact');
      if (!codigo) { cont.innerHTML='<p class="msg-error">Ingresa el código.</p>'; return; }
      cont.innerHTML = '<p class="msg-warning">Buscando…</p>';
      const { data } = await buscarStockAvanzado({ ubic: codigo, limit: 50 });
      const items = data || [];
      cont.innerHTML = `
        <div class="alert ${items.length?'alert-warning':'alert-info'}" style="margin-bottom:10px;">
          ${items.length
            ? `Esta ubicación tiene <strong>${items.length} ítems</strong>. Se desactivará pero los ítems quedan en su lugar.`
            : `La ubicación <strong>${escapeHtml(codigo)}</strong> está vacía.`}
        </div>
        ${items.length ? `
          <div class="table-wrap" style="margin-bottom:10px;">
            <table class="data-table">
              <thead><tr><th>SKU</th><th>Serie</th><th>Cant.</th><th>Paleta/Pedido</th></tr></thead>
              <tbody>
                ${items.slice(0,8).map(r=>`<tr>
                  <td class="sku-cell">${escapeHtml(r.sku)}</td>
                  <td style="font-size:10px;font-family:monospace;">${escapeHtml(r.serie||'-')}</td>
                  <td>${formatNum(r.cantidad)}</td>
                  <td style="font-size:11px;">${escapeHtml(r.paleta_pedido||'-')}</td>
                </tr>`).join('')}
                ${items.length>8?`<tr><td colspan="4" style="text-align:center;font-size:11px;color:var(--text-tertiary);">…y ${items.length-8} más</td></tr>`:''}
              </tbody>
            </table>
          </div>
        `:''}
        <button class="btn-warning" id="adm-btn-confirmar-desact">🔒 Desactivar ${escapeHtml(codigo)}</button>
        <div id="adm-msg-desact" style="margin-top:8px;"></div>
      `;
      document.getElementById('adm-btn-confirmar-desact')?.addEventListener('click', async () => {
        const motivo = document.getElementById('adm-ubic-desact-motivo')?.value.trim();
        if (!confirm(`¿Desactivar la ubicación "${codigo}"?`)) return;
        const btn = document.getElementById('adm-btn-confirmar-desact');
        btn.disabled=true; btn.textContent='Desactivando…';
        const { error } = await desactivarUbicacion(codigo, motivo);
        const msg = document.getElementById('adm-msg-desact');
        if (error) {
          msg.innerHTML=`<p class="msg-error">Error: ${escapeHtml(String(error))}</p>`;
          btn.disabled=false;
        } else {
          msg.innerHTML=`<p class="msg-ok">✓ Ubicación ${escapeHtml(codigo)} desactivada.</p>`;
          btn.textContent='✓ Listo'; btn.className='btn-ghost';
        }
      });
    });
    document.getElementById('adm-ubic-desact')?.addEventListener('keydown', e=>{
      if(e.key==='Enter') document.getElementById('adm-btn-preview-desact')?.click();
    });
  },

  // ── EDITAR KARDEX ──────────────────────────────────────────
  _bodyEditarKardex() {
    return `
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
        Busca movimientos del kardex para corregir observaciones o anular un registro erróneo.
      </p>
      <div class="filtros-grid" style="margin-bottom:8px;">
        <div class="field"><label>SKU</label><input id="adm-kx-sku" type="text" autocomplete="off"></div>
        <div class="field"><label>Serie</label><input id="adm-kx-serie" type="text" autocomplete="off" style="font-family:monospace;"></div>
        <div class="field"><label>Fecha desde</label><input id="adm-kx-desde" type="date"></div>
        <div class="field"><label>Fecha hasta</label><input id="adm-kx-hasta" type="date"></div>
      </div>
      <div style="display:flex; gap:6px; margin-bottom:10px;">
        <button class="btn-primary" id="adm-btn-buscar-kx-edit">Buscar</button>
      </div>
      <div id="adm-resultado-kx-edit"></div>
    `;
  },

  _bindEditarKardex() {
    const buscar = async () => {
      const sku   = document.getElementById('adm-kx-sku')?.value.trim()   || '';
      const serie = document.getElementById('adm-kx-serie')?.value.trim() || '';
      const desde = document.getElementById('adm-kx-desde')?.value        || '';
      const hasta = document.getElementById('adm-kx-hasta')?.value        || '';
      const cont  = document.getElementById('adm-resultado-kx-edit');
      if (!sku && !serie) { cont.innerHTML='<p class="msg-error">Ingresa al menos SKU o serie.</p>'; return; }
      cont.innerHTML='<p class="msg-warning">Buscando…</p>';
      let data = await obtenerKardex({ sku, serie, limite: 100 });
      if (desde) data = data.filter(m=>m.fecha && m.fecha >= desde);
      if (hasta) data = data.filter(m=>m.fecha && m.fecha <= hasta+'T23:59:59');
      if (!data.length) { cont.innerHTML='<p class="msg-error">Sin movimientos con esos filtros.</p>'; return; }
      cont.innerHTML = `
        <p style="font-size:11px; color:var(--text-tertiary); margin-bottom:6px;">${data.length} movimiento${data.length!==1?'s':''}</p>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Fecha</th><th>SKU</th><th>Tipo</th><th>Cant.</th><th>Observación</th><th></th></tr></thead>
            <tbody>
              ${data.map(m=>{
                const fechaStr = m.fecha ? new Date(m.fecha).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-';
                return `<tr id="kx-row-${m.id}">
                  <td style="font-size:10px; white-space:nowrap;">${fechaStr}</td>
                  <td class="sku-cell">${escapeHtml(m.sku)}</td>
                  <td><span class="pill pill-neutral" style="font-size:10px;">${escapeHtml(m.tipo_movimiento||'-')}</span></td>
                  <td style="font-weight:700;">${formatNum(m.cantidad)}</td>
                  <td>
                    <input type="text" id="kx-obs-${m.id}" value="${escapeHtml(m.observaciones||m.referencia||'')}"
                      style="width:160px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-strong); border-radius:4px; padding:3px 6px;">
                  </td>
                  <td style="display:flex; gap:4px;">
                    <button class="btn-primary" style="font-size:10px; padding:3px 8px;" data-save-kx="${m.id}">Guardar</button>
                    <button class="btn-danger"  style="font-size:10px; padding:3px 8px;" data-del-kx="${m.id}" title="Anular movimiento">✕</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      cont.querySelectorAll('[data-save-kx]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id  = btn.dataset.saveKx;
          const obs = document.getElementById(`kx-obs-${id}`)?.value.trim();
          btn.disabled=true; btn.textContent='…';
          const { error } = await editarMovimientoKardex(id, { observaciones: obs });
          btn.disabled=false;
          btn.textContent = error ? '❌' : '✓';
          btn.className   = error ? 'btn-danger' : 'btn-success';
        });
      });

      cont.querySelectorAll('[data-del-kx]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Anular este movimiento del kardex? Es solo para corrección de errores.')) return;
          const id = btn.dataset.delKx;
          btn.disabled=true; btn.textContent='…';
          const { error } = await eliminarMovimientoKardex(id);
          if (error) { btn.disabled=false; btn.textContent='✕'; alert('Error al anular.'); }
          else { document.getElementById(`kx-row-${id}`)?.remove(); }
        });
      });
    };

    document.getElementById('adm-btn-buscar-kx-edit')?.addEventListener('click', buscar);
    ['adm-kx-sku','adm-kx-serie'].forEach(id=>{
      document.getElementById(id)?.addEventListener('keydown', e=>{ if(e.key==='Enter') buscar(); });
    });
  },

  _bodyGestionarUsuarios() {
    return `
      <div id="adm-usuarios-lista">
        <div class="empty-state"><div class="empty-icon">⏳</div>Cargando usuarios…</div>
      </div>
      <hr style="margin:16px 0; border-color:var(--border);">
      <p class="card-title" style="margin-bottom:10px;">Crear nuevo usuario</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div class="field"><label>Nombre</label><input type="text" id="adm-usr-nombre"></div>
        <div class="field"><label>Correo</label><input type="email" id="adm-usr-email"></div>
        <div class="field"><label>Contraseña</label><input type="password" id="adm-usr-pass" placeholder="Mínimo 6 caracteres"></div>
        <div class="field"><label>Rol</label>
          <select id="adm-usr-rol">
            <option value="operario">Operario</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <button class="btn-primary" id="adm-btn-crear-usr">+ Crear usuario</button>
      <div id="adm-usr-msg" style="margin-top:8px;"></div>
    `;
  },

  async _bindGestionarUsuarios() {
    // Cargar lista de usuarios
    const lista = await Auth.obtenerUsuarios();
    const cont  = document.getElementById('adm-usuarios-lista');
    if (cont) {
      if (!lista.length) {
        cont.innerHTML = '<p style="color:var(--text-tertiary);font-size:12px;">Sin usuarios registrados.</p>';
      } else {
        cont.innerHTML = `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                ${lista.map(u=>`
                  <tr>
                    <td style="font-weight:600;">${escapeHtml(u.nombre)}</td>
                    <td style="font-size:11px;">${escapeHtml(u.email)}</td>
                    <td>
                      <select class="adm-usr-rol-sel" data-uid="${u.id}" style="font-size:11px;padding:3px 6px;">
                        <option value="operario" ${u.rol==='operario'?'selected':''}>Operario</option>
                        <option value="admin"    ${u.rol==='admin'   ?'selected':''}>Admin</option>
                      </select>
                    </td>
                    <td>
                      <span class="pill ${u.activo?'pill-success':'pill-danger'}">${u.activo?'Activo':'Inactivo'}</span>
                    </td>
                    <td>
                      <button class="btn-ghost" style="font-size:10px;padding:3px 8px;" data-toggle-usr="${u.id}" data-activo="${u.activo}">
                        ${u.activo?'Desactivar':'Activar'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        cont.querySelectorAll('.adm-usr-rol-sel').forEach(sel=>{
          sel.addEventListener('change', async ()=>{
            const { error } = await Auth.actualizarRol(sel.dataset.uid, sel.value);
            if (error) alert('Error al cambiar rol.');
            else sel.style.color='var(--success-text)';
          });
        });
        cont.querySelectorAll('[data-toggle-usr]').forEach(btn=>{
          btn.addEventListener('click', async ()=>{
            const activo = btn.dataset.activo === 'true';
            const { error } = await Auth.toggleActivo(btn.dataset.toggleUsr, !activo);
            if (error) { alert('Error.'); return; }
            this._bindGestionarUsuarios();
          });
        });
      }
    }

    // Crear usuario
    document.getElementById('adm-btn-crear-usr')?.addEventListener('click', async ()=>{
      const nombre = document.getElementById('adm-usr-nombre')?.value.trim();
      const email  = document.getElementById('adm-usr-email')?.value.trim();
      const pass   = document.getElementById('adm-usr-pass')?.value;
      const rol    = document.getElementById('adm-usr-rol')?.value;
      const msg    = document.getElementById('adm-usr-msg');
      if (!nombre||!email||!pass) { msg.innerHTML='<p class="msg-error">Completa todos los campos.</p>'; return; }
      if (pass.length < 6)        { msg.innerHTML='<p class="msg-error">La contraseña debe tener al menos 6 caracteres.</p>'; return; }
      const btn = document.getElementById('adm-btn-crear-usr');
      btn.disabled=true; btn.textContent='Creando…';
      const { error } = await Auth.crearUsuario(email, pass, nombre, rol);
      btn.disabled=false; btn.textContent='+ Crear usuario';
      if (error) { msg.innerHTML=`<p class="msg-error">Error: ${escapeHtml(error)}</p>`; return; }
      msg.innerHTML='<p class="msg-ok">✓ Usuario creado. Ya puede ingresar al sistema.</p>';
      document.getElementById('adm-usr-nombre').value='';
      document.getElementById('adm-usr-email').value='';
      document.getElementById('adm-usr-pass').value='';
      this._bindGestionarUsuarios();
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

  // ── CONDICIONES DE INGRESO ──────────────────────────────────
  _CONDICIONES_KEY: 'wms_condiciones_ingreso',

  _getCondiciones() {
    try {
      const raw = localStorage.getItem(this._CONDICIONES_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return ['NUEVO','DESMONTADO','TRASPASO','CONTRATA','DEVOLUCION','EXCEDENTE'];
  },

  _saveCondiciones(lista) {
    localStorage.setItem(this._CONDICIONES_KEY, JSON.stringify(lista));
  },

  _bodyGestionarCondiciones() {
    const lista = this._getCondiciones();
    return `
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
        Estos valores aparecen en el campo <strong>Condición</strong> al recepcionar mercadería.
        Puedes agregar nuevos o eliminar los que no uses.
      </p>
      <div id="adm-cond-lista" style="margin-bottom:12px;">
        ${this._renderCondicionesList(lista)}
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input type="text" id="adm-cond-nueva" placeholder="Nueva condición" style="flex:1; text-transform:uppercase;">
        <button class="btn-primary" id="adm-btn-add-cond">+ Agregar</button>
      </div>
      <div id="adm-cond-msg" style="margin-top:8px;"></div>
    `;
  },

  _renderCondicionesList(lista) {
    if (!lista.length) return '<p style="color:var(--text-tertiary); font-size:12px;">Sin condiciones definidas.</p>';
    return lista.map((c, i) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px;
                  background:var(--bg-row-alt); border-radius:6px; margin-bottom:4px;">
        <span style="font-family:monospace; font-weight:600; font-size:13px;">${escapeHtml(c)}</span>
        <button class="btn-icon" style="color:var(--danger-text);"
          onclick="AdminView._eliminarCondicion(${i})" title="Eliminar">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      </div>
    `).join('');
  },

  _eliminarCondicion(idx) {
    const lista = this._getCondiciones();
    const nombre = lista[idx];
    if (!confirm(`¿Eliminar la condición "${nombre}"?`)) return;
    lista.splice(idx, 1);
    this._saveCondiciones(lista);
    const cont = document.getElementById('adm-cond-lista');
    if (cont) cont.innerHTML = this._renderCondicionesList(lista);
  },

  _bindGestionarCondiciones() {
    document.getElementById('adm-btn-add-cond')?.addEventListener('click', () => {
      const inp  = document.getElementById('adm-cond-nueva');
      const msg  = document.getElementById('adm-cond-msg');
      const val  = (inp?.value || '').trim().toUpperCase();
      if (!val) { msg.innerHTML = '<p class="msg-error">Escribe un nombre.</p>'; return; }
      const lista = this._getCondiciones();
      if (lista.includes(val)) { msg.innerHTML = '<p class="msg-error">Ya existe esa condición.</p>'; return; }
      lista.push(val);
      this._saveCondiciones(lista);
      inp.value = '';
      msg.innerHTML = `<p class="msg-ok">✓ "${val}" agregado.</p>`;
      const cont = document.getElementById('adm-cond-lista');
      if (cont) cont.innerHTML = this._renderCondicionesList(lista);
    });

    document.getElementById('adm-cond-nueva')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('adm-btn-add-cond')?.click();
    });
  },
};

Router.register('admin', AdminView);
