// ============================================================
// RECEPCIÓN — 3 flujos:
//   A) LPN  — pistoleo directo al WMS, crea contenedor físico
//   B) Excel — sube formato de 10 columnas ya validado
//   C) Manual — formulario ítem por ítem
// + Vista de LPNs creados con detalle e impresión de etiqueta
// ============================================================

const RecepcionView = {
  title: 'Recepción',
  _flujo: null,         // 'lpn' | 'excel' | 'manual' | 'lista-lpns' | 'detalle-lpn'
  _preview: [],         // ítems leídos del Excel (flujo B)
  _lpnActual: null,     // { id, codigo, cliente } (flujo A)
  _itemsLPN: [],        // ítems pistoleados en el LPN activo
  _manualItems: [],     // ítems acumulados en flujo manual
  _lpnModoEscaneo: false, // true = escaneando LPN impreso, false = automático

  // ============================================================
  // PRESERVACIÓN DE ESTADO (PC — pestañas)
  // ============================================================
  hasProgress() {
    return (
      (this._flujo === 'lpn'    && this._itemsLPN.length > 0) ||
      (this._flujo === 'manual' && this._manualItems.length > 0) ||
      (this._flujo === 'excel'  && this._preview.length > 0)
    );
  },

  saveState() {
    return {
      flujo:        this._flujo,
      preview:      this._preview,
      lpnActual:    this._lpnActual,
      itemsLPN:     this._itemsLPN,
      manualItems:  this._manualItems,
      lpnModoEscaneo: this._lpnModoEscaneo,
    };
  },

  restoreState(s) {
    this._flujo          = s.flujo;
    this._preview        = s.preview        || [];
    this._lpnActual      = s.lpnActual      || null;
    this._itemsLPN       = s.itemsLPN       || [];
    this._manualItems    = s.manualItems    || [];
    this._lpnModoEscaneo = s.lpnModoEscaneo || false;

    // Ejecutar afterRender para ligar eventos base
    this.afterRender();

    // Restaurar sub-flujo si había uno activo
    if (this._flujo) {
      const sel = document.getElementById('recep-selector');
      if (sel) sel.style.display = 'none';
      const c = document.getElementById('recep-contenido');
      if (c) this._renderFlujo(c);
    }
  },

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  render() {
    return `
      <div id="recep-selector">
        <div class="card" style="margin-bottom:0;">
          <p class="card-title">Recepción de mercadería</p>
          <p class="card-subtitle">Selecciona el flujo según tu situación</p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">

            <button class="recep-opcion" data-flujo="lpn">
              <div class="recep-op-icon">📦</div>
              <div class="recep-op-titulo">Flujo LPN</div>
              <div class="recep-op-desc">Pistoleas directo al sistema. Crea contenedor físico (LPN) con los ítems. Exporta Excel para Sharepoint.</div>
            </button>

            <button class="recep-opcion" data-flujo="excel">
              <div class="recep-op-icon">📊</div>
              <div class="recep-op-titulo">Flujo Excel</div>
              <div class="recep-op-desc">Ya pistoleaste en tu Excel y lo subiste al Sharepoint. Subes ese mismo Excel aquí para registrar el stock.</div>
            </button>

            <button class="recep-opcion" data-flujo="manual">
              <div class="recep-op-icon">✏️</div>
              <div class="recep-op-titulo">Ingreso manual</div>
              <div class="recep-op-desc">Para ingresos pequeños o casos puntuales. Ingresas ítem por ítem con el formulario.</div>
            </button>

            <button class="recep-opcion" data-flujo="lista-lpns">
              <div class="recep-op-icon">🗂️</div>
              <div class="recep-op-titulo">Ver LPNs</div>
              <div class="recep-op-desc">Consulta todos los contenedores creados, su contenido y estado. Imprime etiquetas.</div>
            </button>

          </div>
        </div>
      </div>

      <div id="recep-contenido"></div>
    `;
  },

  afterRender() {
    document.querySelectorAll('.recep-opcion').forEach(btn => {
      btn.addEventListener('click', () => {
        this._flujo = btn.dataset.flujo;
        document.getElementById('recep-selector').style.display = 'none';
        const c = document.getElementById('recep-contenido');
        this._renderFlujo(c);
      });
    });
  },

  _renderFlujo(c) {
    if (!c) c = document.getElementById('recep-contenido');
    if (this._flujo === 'lpn')        this._renderLPN(c);
    if (this._flujo === 'excel')      this._renderExcel(c);
    if (this._flujo === 'manual')     this._renderManual(c);
    if (this._flujo === 'lista-lpns') this._renderListaLPNs(c);
    if (this._flujo === 'detalle-lpn') { /* se maneja con params */ }
  },

  _btnVolver() {
    return `<button class="btn-secondary" id="btn-volver-recep" style="margin-bottom:12px;">← Volver</button>`;
  },

  _bindVolver(contenedor) {
    document.getElementById('btn-volver-recep')?.addEventListener('click', () => {
      this._flujo       = null;
      this._lpnActual   = null;
      this._itemsLPN    = [];
      this._preview     = [];
      this._manualItems = [];
      if (contenedor) contenedor.innerHTML = '';
      const sel = document.getElementById('recep-selector');
      if (sel) sel.style.display = '';
    });
  },

  // ============================================================
  // FLUJO A — LPN
  // ============================================================
  _renderLPN(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      <div class="card" id="lpn-modo-card">
        <p class="card-title">Flujo LPN — ¿Cómo quieres identificar el contenedor?</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">

          <button class="recep-opcion" id="btn-modo-auto">
            <div class="recep-op-icon">⚡</div>
            <div class="recep-op-titulo">LPN automático</div>
            <div class="recep-op-desc">El sistema genera el código (LPN00001). Lo ves en pantalla y lo escribes con plumón en la caja si quieres.</div>
          </button>

          <button class="recep-opcion" id="btn-modo-impreso">
            <div class="recep-op-icon">🏷️</div>
            <div class="recep-op-titulo">LPN impreso</div>
            <div class="recep-op-desc">Ya tienes etiquetas impresas. Escaneas el código de barras de la etiqueta para asociarla al contenedor.</div>
          </button>

        </div>
      </div>
      <div class="card" id="lpn-setup-card" style="display:none;">
        <p class="card-title" id="lpn-setup-titulo">Nuevo LPN</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div class="field">
            <label>Cliente</label>
            <select id="lpn-cliente">
              <option value="">-- Seleccionar --</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
              <option value="AMERICATEL">AMERICATEL</option>
            </select>
          </div>
          <div class="field" id="lpn-codigo-manual-wrap" style="display:none;">
            <label>Escanear código LPN impreso</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="lpn-codigo-manual" placeholder="Escanea o escribe el código" style="font-family:monospace; flex:1;">
              <button class="btn-icon btn-scan" id="btn-scan-lpn-codigo" title="Escanear con cámara">
                <svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-3M16 16h.01M16 21h-2v-2M8 21H3v-3M8 12H3v-4M21 12V8h-5M12 3v5M12 12v1M12 16v5"/></svg>
              </button>
            </div>
          </div>
        </div>
        <button class="btn-primary" id="btn-crear-lpn">Crear LPN y empezar</button>
      </div>
      <div id="lpn-trabajo"></div>
    `;
    this._bindVolver(c);

    document.getElementById('btn-modo-auto')?.addEventListener('click', () => {
      this._lpnModoEscaneo = false;
      document.getElementById('lpn-modo-card').style.display = 'none';
      document.getElementById('lpn-setup-card').style.display = '';
      document.getElementById('lpn-setup-titulo').textContent = 'Nuevo LPN — automático';
      document.getElementById('lpn-codigo-manual-wrap').style.display = 'none';
    });

    document.getElementById('btn-modo-impreso')?.addEventListener('click', () => {
      this._lpnModoEscaneo = true;
      document.getElementById('lpn-modo-card').style.display = 'none';
      document.getElementById('lpn-setup-card').style.display = '';
      document.getElementById('lpn-setup-titulo').textContent = 'Nuevo LPN — escanear etiqueta impresa';
      document.getElementById('lpn-codigo-manual-wrap').style.display = '';
    });

    document.getElementById('btn-scan-lpn-codigo')?.addEventListener('click', () => {
      abrirEscaner('lpn-setup-card', (texto) => {
        const inp = document.getElementById('lpn-codigo-manual');
        if (inp) { inp.value = texto; inp.focus(); }
      }, (err) => alert('Error cámara: ' + err));
    });

    document.getElementById('btn-crear-lpn')?.addEventListener('click', () => this._crearLPN());

    // Si hay LPN activo (restaurando estado), mostrar trabajo directamente
    if (this._lpnActual) {
      document.getElementById('lpn-modo-card').style.display = 'none';
      document.getElementById('lpn-setup-card').style.display = 'none';
      this._renderLPNTrabajo(document.getElementById('lpn-trabajo'));
    }
  },

  async _crearLPN() {
    const cliente = document.getElementById('lpn-cliente')?.value || '';
    const btn     = document.getElementById('btn-crear-lpn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }

    let codigo;
    if (this._lpnModoEscaneo) {
      codigo = document.getElementById('lpn-codigo-manual')?.value?.trim().toUpperCase();
      if (!codigo) {
        alert('Escanea o escribe el código del LPN impreso.');
        if (btn) { btn.disabled = false; btn.textContent = 'Crear LPN y empezar'; }
        return;
      }
    } else {
      codigo = await generarCodigoLPN();
    }

    const { data, error } = await crearLPN({ codigo, cliente });
    if (error || !data) {
      if (btn) { btn.disabled = false; btn.textContent = 'Crear LPN y empezar'; }
      alert('Error al crear LPN: ' + (error?.message || error));
      return;
    }

    this._lpnActual = { id: data.id, codigo: data.codigo, cliente };
    this._itemsLPN  = [];
    document.getElementById('lpn-setup-card').style.display = 'none';
    this._renderLPNTrabajo(document.getElementById('lpn-trabajo'));
  },

  _renderLPNTrabajo(contenedor) {
    const lp = this._lpnActual;
    contenedor.innerHTML = `
      <div class="card" style="border-left:3px solid var(--accent); margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <div>
            <span style="font-size:20px; font-weight:900; color:var(--accent); font-family:monospace; letter-spacing:1px;">${escapeHtml(lp.codigo)}</span>
            <span class="pill pill-warning" style="margin-left:8px;">EN RECEPCIÓN</span>
          </div>
          <div style="font-size:12px; color:var(--text-secondary);">
            Cliente: <strong>${escapeHtml(lp.cliente || '—')}</strong>
          </div>
        </div>
        <p style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">
          Escribe <strong>${escapeHtml(lp.codigo)}</strong> con plumón en la caja/paleta física si no tienes etiqueta.
        </p>
      </div>

      <!-- Formulario pistolaje -->
      <div class="card" style="margin-bottom:10px;">
        <p class="card-title" style="margin-bottom:10px;">Agregar ítem</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
          <div class="field">
            <label>SKU / Material</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="lpn-sku" style="font-family:monospace; flex:1;">
              <button class="btn-icon btn-scan" id="btn-scan-sku" title="Escanear SKU">
                <svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-3M16 16h.01M16 21h-2v-2M8 21H3v-3M8 12H3v-4M21 12V8h-5M12 3v5M12 12v1M12 16v5"/></svg>
              </button>
            </div>
          </div>
          <div class="field">
            <label>Serie</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="lpn-serie" style="font-family:monospace; flex:1;">
              <button class="btn-icon btn-scan" id="btn-scan-serie" title="Escanear serie">
                <svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-3M16 16h.01M16 21h-2v-2M8 21H3v-3M8 12H3v-4M21 12V8h-5M12 3v5M12 12v1M12 16v5"/></svg>
              </button>
            </div>
          </div>
          <div class="field">
            <label>Cantidad</label>
            <input type="number" id="lpn-cantidad" value="1" min="1">
          </div>
          <div class="field">
            <label>N° Pedido del cliente</label>
            <input type="text" id="lpn-pedido">
          </div>
          <div class="field">
            <label>Tipo ingreso</label>
            <select id="lpn-tipo">
              <option value="NUEVO">NUEVO</option>
              <option value="DESMONTADO">DESMONTADO</option>
              <option value="TRASPASO">TRASPASO</option>
              <option value="CONTRATA">CONTRATA</option>
              <option value="DEVOLUCION">DEVOLUCIÓN</option>
            </select>
          </div>
          <div class="field">
            <label>Observaciones</label>
            <input type="text" id="lpn-obs">
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-primary" id="btn-agregar-item-lpn">+ Agregar ítem</button>
          <button class="btn-secondary" id="btn-buscar-sku-lpn">Buscar descripción</button>
        </div>
        <div id="lpn-sku-info" style="margin-top:8px; font-size:11px; color:var(--text-secondary);"></div>
      </div>

      <!-- Lista de ítems -->
      <div class="card" style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Ítems en este LPN (<span id="lpn-count">0</span>)</p>
        </div>
        <div id="lpn-items-lista">
          <div class="empty-state" style="padding:20px 0;">
            <div class="empty-icon">📭</div>
            Aún no hay ítems. Empieza pistoleando.
          </div>
        </div>
      </div>

      <!-- Cerrar LPN -->
      <div class="card" style="background:var(--accent-dim); border-color:var(--accent);">
        <p class="card-title">¿Terminaste este contenedor?</p>
        <p style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          Al cerrar, los ítems quedan en stock con estado DISPONIBLE en zona RECEPCIÓN.
          Puedes crear otro LPN para más mercadería o finalizar.
        </p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-primary" id="btn-cerrar-lpn">✓ Cerrar LPN y guardar</button>
          <button class="btn-secondary" id="btn-nuevo-lpn-mas">+ Crear otro LPN</button>
          <button class="btn-secondary" id="btn-exportar-lpn" style="display:none;">↓ Exportar Excel Sharepoint</button>
        </div>
        <div id="lpn-resultado" style="margin-top:10px;"></div>
      </div>
    `;

    this._bindLPNEventos(contenedor);
    this._renderItemsLPN();
  },

  _bindLPNEventos(contenedor) {
    // Scanners de cámara
    document.getElementById('btn-scan-sku')?.addEventListener('click', () => {
      abrirEscaner('lpn-trabajo', (txt) => {
        const inp = document.getElementById('lpn-sku');
        if (inp) { inp.value = txt.toUpperCase(); this._buscarDescripcionSKU(txt); }
      }, err => alert('Error cámara: ' + err));
    });

    document.getElementById('btn-scan-serie')?.addEventListener('click', () => {
      abrirEscaner('lpn-trabajo', (txt) => {
        const inp = document.getElementById('lpn-serie');
        if (inp) { inp.value = txt; document.getElementById('lpn-cantidad')?.focus(); }
      }, err => alert('Error cámara: ' + err));
    });

    // Enter en campos para pistolaje rápido
    ['lpn-sku','lpn-serie','lpn-cantidad','lpn-pedido'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-agregar-item-lpn')?.click();
      });
    });

    // Auto-buscar descripción al salir del campo SKU
    document.getElementById('lpn-sku')?.addEventListener('blur', () => {
      const sku = document.getElementById('lpn-sku')?.value?.trim();
      if (sku) this._buscarDescripcionSKU(sku);
    });

    document.getElementById('btn-buscar-sku-lpn')?.addEventListener('click', () => {
      const sku = document.getElementById('lpn-sku')?.value?.trim();
      if (sku) this._buscarDescripcionSKU(sku);
    });

    document.getElementById('btn-agregar-item-lpn')?.addEventListener('click', () => {
      const sku      = document.getElementById('lpn-sku')?.value?.trim().toUpperCase();
      const serie    = document.getElementById('lpn-serie')?.value?.trim();
      const cantidad = Number(document.getElementById('lpn-cantidad')?.value) || 1;
      const pedido   = document.getElementById('lpn-pedido')?.value?.trim();
      const tipo     = document.getElementById('lpn-tipo')?.value || 'NUEVO';
      const obs      = document.getElementById('lpn-obs')?.value?.trim();
      const desc     = document.getElementById('lpn-sku-info')?.dataset?.desc || '';

      if (!sku) { alert('El SKU / Material es obligatorio.'); return; }

      this._itemsLPN.push({
        MATERIAL: sku,
        DESCRIPCION: desc,
        SERIE: serie || '-',
        CANTIDAD_RECIBIDA: cantidad,
        N_PEDIDO: pedido || '',
        CLIENTE: this._lpnActual.cliente || '',
        TIPO_INGRESO: tipo,
        OBSERVACIONES: obs || '',
        FECHA: new Date().toLocaleDateString('es-PE')
      });

      // Limpiar para siguiente pistolaje
      document.getElementById('lpn-sku').value     = '';
      document.getElementById('lpn-serie').value   = '';
      document.getElementById('lpn-cantidad').value = '1';
      const info = document.getElementById('lpn-sku-info');
      if (info) { info.textContent = ''; info.dataset.desc = ''; }
      document.getElementById('lpn-sku')?.focus();

      this._renderItemsLPN();
    });

    document.getElementById('btn-cerrar-lpn')?.addEventListener('click',     () => this._cerrarLPN());
    document.getElementById('btn-nuevo-lpn-mas')?.addEventListener('click',  () => this._nuevoLPNMas());
    document.getElementById('btn-exportar-lpn')?.addEventListener('click',   () => {
      exportarRecepcionAExcel(this._itemsLPN, `recepcion_${this._lpnActual.codigo}.xlsx`);
    });
  },

  async _buscarDescripcionSKU(sku) {
    const info = document.getElementById('lpn-sku-info');
    if (!info || !sku) return;
    info.textContent = 'Buscando…';
    const art = await buscarEnMaestro(sku);
    if (art) {
      info.innerHTML = `<span style="color:var(--success);">✓ ${escapeHtml(art.descripcion)}</span>`;
      info.dataset.desc = art.descripcion || '';
    } else {
      info.innerHTML = `<span style="color:var(--warning);">SKU no encontrado en maestro — puedes cargarlo igual.</span>`;
      info.dataset.desc = '';
    }
  },

  _renderItemsLPN() {
    const lista = document.getElementById('lpn-items-lista');
    const count = document.getElementById('lpn-count');
    if (count) count.textContent = this._itemsLPN.length;

    if (!this._itemsLPN.length) {
      if (lista) lista.innerHTML = `
        <div class="empty-state" style="padding:20px 0;">
          <div class="empty-icon">📭</div>Aún no hay ítems.
        </div>`;
      return;
    }

    if (!lista) return;
    lista.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>#</th><th>SKU</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th>Tipo</th><th></th>
          </tr></thead>
          <tbody>
            ${this._itemsLPN.map((it, i) => `
              <tr>
                <td style="color:var(--text-tertiary);">${i+1}</td>
                <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
                <td class="serie-cell" style="font-size:10px;">
                  ${it.SERIE && it.SERIE !== '-' ? escapeHtml(it.SERIE) : '<span style="color:var(--text-tertiary);">Sin serie</span>'}
                </td>
                <td style="font-weight:700; color:var(--accent);">${formatNum(it.CANTIDAD_RECIBIDA)}</td>
                <td style="font-size:11px;">${escapeHtml(it.N_PEDIDO) || '—'}</td>
                <td><span class="pill pill-neutral" style="font-size:10px;">${escapeHtml(it.TIPO_INGRESO)}</span></td>
                <td>
                  <button class="btn-icon" style="color:var(--danger);" onclick="RecepcionView._eliminarItemLPN(${i})" title="Eliminar">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _eliminarItemLPN(idx) {
    this._itemsLPN.splice(idx, 1);
    this._renderItemsLPN();
  },

  async _cerrarLPN() {
    if (!this._itemsLPN.length) { alert('Agrega al menos un ítem antes de cerrar el LPN.'); return; }
    const btn = document.getElementById('btn-cerrar-lpn');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    const { error, count } = await registrarItemsEnLPN(
      this._lpnActual.id,
      this._lpnActual.codigo,
      this._itemsLPN
    );

    const res = document.getElementById('lpn-resultado');
    if (error) {
      if (btn) { btn.disabled = false; btn.textContent = '✓ Cerrar LPN y guardar'; }
      if (res) res.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;
      return;
    }

    if (btn) btn.style.display = 'none';
    const btnExportar = document.getElementById('btn-exportar-lpn');
    if (btnExportar) btnExportar.style.display = '';
    if (res) res.innerHTML = `
      <div class="alert alert-success">
        <strong>✓ LPN ${escapeHtml(this._lpnActual.codigo)} cerrado — ${count} ítems en stock (zona RECEPCIÓN).</strong><br>
        <span style="font-size:11px;">Exporta el Excel para subirlo al Sharepoint del cliente.</span>
      </div>
    `;
  },

  _nuevoLPNMas() {
    this._itemsLPN  = [];
    this._lpnActual = null;
    const c = document.getElementById('recep-contenido');
    if (c) this._renderLPN(c);
  },

  // ============================================================
  // FLUJO B — Excel
  // ============================================================
  _renderExcel(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      <div class="card">
        <p class="card-title">Flujo Excel — Subir ingresos</p>
        <p class="card-subtitle">
          El archivo debe tener <strong>10 columnas en este orden exacto</strong>.
          Los encabezados no importan — el sistema lee por posición de columna.
        </p>
        <div class="table-wrap" style="margin-bottom:14px;">
          <table class="data-table">
            <thead><tr><th>#</th><th>Columna</th><th>Descripción</th><th>Ejemplo</th></tr></thead>
            <tbody>
              ${[
                ['1','FECHA','Fecha de ingreso','05/05/2026'],
                ['2','CLIENTE','ENTEL, CLARO o TELRAD','ENTEL'],
                ['3','N_PEDIDO','Número de pedido','MR-218'],
                ['4','MATERIAL','Código SKU del artículo','ENT960051374'],
                ['5','DESCRIPCION','Descripción del artículo','HUAWEI 25030432...'],
                ['6','SERIE','Serie del artículo (o "-" si no tiene)','024QLM10R8103263'],
                ['7','CANTIDAD_RECIBIDA','Cantidad recibida real','1'],
                ['8','N_GUIA','Número de guía de ingreso','T217-00042276'],
                ['9','TIPO_INGRESO','NUEVO, DESMONTADO, TRASPASO, CONTRATA, DEVOLUCION','NUEVO'],
                ['10','OBSERVACIONES','Notas adicionales (puede quedar vacío)',''],
              ].map(([n,col,desc,ej]) => `
                <tr>
                  <td style="color:var(--text-tertiary);font-weight:700;">${n}</td>
                  <td class="sku-cell">${col}</td>
                  <td style="font-size:11px;">${desc}</td>
                  <td style="font-size:11px;color:var(--text-secondary);">${ej}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="file-drop" id="file-drop-recep">
          <div class="file-drop-icon">📥</div>
          <strong>Seleccionar o arrastrar Excel</strong>
          <span style="font-size:11px;color:var(--text-tertiary);">.xlsx — 10 columnas en el orden indicado</span>
        </div>
        <input type="file" id="input-recep" accept=".xlsx,.xls" style="display:none;">
      </div>
      <div id="preview-recep"></div>
      <div id="resultado-recep"></div>
    `;
    this._bindVolver(c);

    const drop  = document.getElementById('file-drop-recep');
    const input = document.getElementById('input-recep');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) this._procesarExcel(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
      if (e.target.files[0]) this._procesarExcel(e.target.files[0]);
    });
  },

  async _procesarExcel(file) {
    const preview = document.getElementById('preview-recep');
    preview.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo Excel…</div>';
    try {
      await cargarXlsx();
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      let filas = [];
      for (const nombre of wb.SheetNames) {
        const ws   = wb.Sheets[nombre];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (data.length > 1) { filas = data; break; }
      }
      if (!filas.length) {
        preview.innerHTML = '<div class="alert alert-danger">El Excel está vacío.</div>';
        return;
      }

      const primeraFila  = filas[0];
      const COLS         = ['FECHA','CLIENTE','N_PEDIDO','MATERIAL','DESCRIPCION','SERIE','CANTIDAD','N_GUIA','TIPO','OBS'];
      const matchCount   = COLS.filter(c => primeraFila.some(v => String(v).toUpperCase().includes(c.substring(0,4)))).length;
      const filaInicio   = matchCount >= 3 ? 1 : 0;

      this._preview = filas.slice(filaInicio)
        .filter(r => r.some(v => v !== '' && v !== null))
        .map(r => ({
          FECHA:             r[0],
          CLIENTE:           String(r[1] || '').trim().toUpperCase(),
          N_PEDIDO:          String(r[2] || '').trim(),
          MATERIAL:          String(r[3] || '').trim().toUpperCase(),
          DESCRIPCION:       String(r[4] || '').trim(),
          SERIE:             String(r[5] || '').trim(),
          CANTIDAD_RECIBIDA: Number(r[6]) || 0,
          N_GUIA:            String(r[7] || '').trim(),
          TIPO_INGRESO:      String(r[8] || 'NUEVO').trim().toUpperCase() || 'NUEVO',
          OBSERVACIONES:     String(r[9] || '').trim(),
        }))
        .filter(r => r.MATERIAL && r.CANTIDAD_RECIBIDA > 0);

      if (!this._preview.length) {
        preview.innerHTML = '<div class="alert alert-danger">No se encontraron filas válidas.</div>';
        return;
      }
      this._renderPreviewExcel(preview);
    } catch(err) {
      preview.innerHTML = `<div class="alert alert-danger">Error al leer: ${escapeHtml(err.message)}</div>`;
    }
  },

  _renderPreviewExcel(preview) {
    const sinSerie = this._preview.filter(r => !r.SERIE || r.SERIE.startsWith('-')).length;
    const pedidos  = [...new Set(this._preview.map(r => r.N_PEDIDO).filter(Boolean))];

    preview.innerHTML = `
      <div class="alert alert-info" style="margin-bottom:10px;">
        <strong>${this._preview.length} ítems</strong> en <strong>${pedidos.length} pedidos</strong>.
        ${sinSerie > 0 ? `<br><span style="font-size:11px;">${sinSerie} ítems sin serie.</span>` : ''}
      </div>
      <div class="table-wrap" style="margin-bottom:12px;">
        <table class="data-table">
          <thead><tr>
            <th>SKU</th><th>Descripción</th><th>Pedido</th>
            <th>Cant.</th><th>Serie</th><th>Tipo</th><th>Cliente</th>
          </tr></thead>
          <tbody>
            ${this._preview.slice(0,100).map(r => `
              <tr>
                <td class="sku-cell">${escapeHtml(r.MATERIAL)}</td>
                <td style="font-size:10px; max-width:280px;">${escapeHtml(r.DESCRIPCION)}</td>
                <td style="font-family:monospace;font-size:11px;">${escapeHtml(r.N_PEDIDO) || '—'}</td>
                <td style="font-weight:700;color:var(--accent);">${formatNum(r.CANTIDAD_RECIBIDA)}</td>
                <td class="serie-cell" style="font-size:10px;">
                  ${r.SERIE && !r.SERIE.startsWith('-') ? escapeHtml(r.SERIE) : '<span style="color:var(--text-tertiary);">Sin serie</span>'}
                </td>
                <td><span class="pill pill-neutral" style="font-size:10px;">${escapeHtml(r.TIPO_INGRESO)}</span></td>
                <td style="font-size:11px;">${escapeHtml(r.CLIENTE)}</td>
              </tr>
            `).join('')}
            ${this._preview.length > 100 ? `
              <tr><td colspan="7" style="text-align:center;font-size:11px;color:var(--text-tertiary);padding:8px;">
                … y ${this._preview.length - 100} ítems más
              </td></tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      <div class="btn-row">
        <button class="btn-primary" id="btn-cargar-excel-recep">Cargar ${this._preview.length} ítems al stock</button>
        <button class="btn-secondary" id="btn-cancelar-excel-recep">Cancelar</button>
      </div>
    `;

    document.getElementById('btn-cargar-excel-recep')?.addEventListener('click',   () => this._cargarExcel(preview));
    document.getElementById('btn-cancelar-excel-recep')?.addEventListener('click', () => {
      preview.innerHTML = '';
      this._preview = [];
    });
  },

  async _cargarExcel(preview) {
    const btn = document.getElementById('btn-cargar-excel-recep');
    if (btn) { btn.disabled = true; btn.textContent = 'Cargando…'; }

    const { error, count } = await registrarIngresosDesdeExcel(this._preview);
    const res = document.getElementById('resultado-recep');
    preview.innerHTML = '';
    this._preview = [];

    if (error) {
      if (res) res.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;
      return;
    }
    if (res) res.innerHTML = `
      <div class="alert alert-success">
        <strong>✓ ${count} ítems cargados al stock correctamente.</strong>
      </div>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-secondary" onclick="Router.navigate('recepcion')">Cargar otro Excel</button>
        <button class="btn-primary"   onclick="Router.navigate('consulta')">Ver en consultas →</button>
      </div>
    `;
  },

  // ============================================================
  // FLUJO C — Manual
  // ============================================================
  _renderManual(c) {
    if (!this._manualItems) this._manualItems = [];
    c.innerHTML = `
      ${this._btnVolver()}
      <div class="card" style="margin-bottom:10px;">
        <p class="card-title">Ingreso manual — Agregar ítem</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
          <div class="field">
            <label>Fecha</label>
            <input type="date" id="man-fecha" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="field">
            <label>Cliente</label>
            <select id="man-cliente">
              <option value="">-- Seleccionar --</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
              <option value="AMERICATEL">AMERICATEL</option>
            </select>
          </div>
          <div class="field">
            <label>N° Pedido</label>
            <input type="text" id="man-pedido">
          </div>
          <div class="field">
            <label>N° Guía</label>
            <input type="text" id="man-nguia">
          </div>
          <div class="field">
            <label>SKU / Material *</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="man-sku" style="font-family:monospace; flex:1;">
              <button class="btn-icon btn-scan" id="btn-scan-man-sku" title="Escanear">
                <svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-3M16 16h.01M16 21h-2v-2M8 21H3v-3M8 12H3v-4M21 12V8h-5M12 3v5M12 12v1M12 16v5"/></svg>
              </button>
            </div>
          </div>
          <div class="field">
            <label>Descripción</label>
            <input type="text" id="man-desc">
          </div>
          <div class="field">
            <label>Serie</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="man-serie" style="font-family:monospace; flex:1;">
              <button class="btn-icon btn-scan" id="btn-scan-man-serie" title="Escanear">
                <svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-3M16 16h.01M16 21h-2v-2M8 21H3v-3M8 12H3v-4M21 12V8h-5M12 3v5M12 12v1M12 16v5"/></svg>
              </button>
            </div>
          </div>
          <div class="field">
            <label>Cantidad recibida *</label>
            <input type="number" id="man-cantidad" value="1" min="1">
          </div>
          <div class="field">
            <label>Tipo ingreso</label>
            <select id="man-tipo">
              <option value="NUEVO">NUEVO</option>
              <option value="DESMONTADO">DESMONTADO</option>
              <option value="TRASPASO">TRASPASO</option>
              <option value="CONTRATA">CONTRATA</option>
              <option value="DEVOLUCION">DEVOLUCIÓN</option>
            </select>
          </div>
          <div class="field">
            <label>Observaciones</label>
            <input type="text" id="man-obs">
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-primary"   id="btn-agregar-manual">+ Agregar a la lista</button>
          <button class="btn-secondary" id="btn-buscar-sku-manual">Buscar en maestro</button>
        </div>
        <div id="man-sku-info" style="margin-top:6px; font-size:11px; color:var(--text-secondary);"></div>
      </div>

      <div class="card" style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Ítems a registrar (<span id="man-count">0</span>)</p>
        </div>
        <div id="man-items-lista">
          <div class="empty-state" style="padding:16px 0;">
            <div class="empty-icon">📝</div>Agrega ítems arriba
          </div>
        </div>
      </div>
      <div id="man-resultado"></div>
    `;
    this._bindVolver(c);
    this._bindManualEventos();
    this._renderManualItems();
  },

  _bindManualEventos() {
    document.getElementById('btn-scan-man-sku')?.addEventListener('click', () => {
      abrirEscaner('recep-contenido', (txt) => {
        const inp = document.getElementById('man-sku');
        if (inp) { inp.value = txt.toUpperCase(); this._buscarDescManual(txt); }
      }, err => alert('Error cámara: ' + err));
    });

    document.getElementById('btn-scan-man-serie')?.addEventListener('click', () => {
      abrirEscaner('recep-contenido', (txt) => {
        const inp = document.getElementById('man-serie');
        if (inp) { inp.value = txt; document.getElementById('man-cantidad')?.focus(); }
      }, err => alert('Error cámara: ' + err));
    });

    document.getElementById('btn-buscar-sku-manual')?.addEventListener('click', () => {
      const sku = document.getElementById('man-sku')?.value?.trim();
      if (sku) this._buscarDescManual(sku);
    });

    document.getElementById('man-sku')?.addEventListener('blur', () => {
      const sku = document.getElementById('man-sku')?.value?.trim();
      if (sku) this._buscarDescManual(sku);
    });

    document.getElementById('btn-agregar-manual')?.addEventListener('click', () => {
      const sku      = document.getElementById('man-sku')?.value?.trim().toUpperCase();
      const cantidad = Number(document.getElementById('man-cantidad')?.value) || 0;
      if (!sku)      { alert('El SKU es obligatorio.'); return; }
      if (!cantidad) { alert('La cantidad debe ser mayor a 0.'); return; }

      this._manualItems.push({
        FECHA:             document.getElementById('man-fecha')?.value || new Date().toISOString().slice(0,10),
        CLIENTE:           document.getElementById('man-cliente')?.value || '',
        N_PEDIDO:          document.getElementById('man-pedido')?.value?.trim() || '',
        MATERIAL:          sku,
        DESCRIPCION:       document.getElementById('man-desc')?.value?.trim() || '',
        SERIE:             document.getElementById('man-serie')?.value?.trim() || '-',
        CANTIDAD_RECIBIDA: cantidad,
        N_GUIA:            document.getElementById('man-nguia')?.value?.trim() || '',
        TIPO_INGRESO:      document.getElementById('man-tipo')?.value || 'NUEVO',
        OBSERVACIONES:     document.getElementById('man-obs')?.value?.trim() || '',
      });

      document.getElementById('man-sku').value      = '';
      document.getElementById('man-serie').value    = '';
      document.getElementById('man-desc').value     = '';
      document.getElementById('man-cantidad').value = '1';
      document.getElementById('man-obs').value      = '';
      document.getElementById('man-sku-info').textContent = '';
      document.getElementById('man-sku')?.focus();

      this._renderManualItems();
    });
  },

  async _buscarDescManual(sku) {
    const info = document.getElementById('man-sku-info');
    if (!info) return;
    info.textContent = 'Buscando…';
    const art = await buscarEnMaestro(sku);
    if (art) {
      document.getElementById('man-desc').value = art.descripcion || '';
      info.innerHTML = `<span style="color:var(--success);">✓ Descripción completada desde maestro</span>`;
    } else {
      info.innerHTML = `<span style="color:var(--warning);">SKU no encontrado en maestro</span>`;
    }
  },

  _renderManualItems() {
    const lista = document.getElementById('man-items-lista');
    const count = document.getElementById('man-count');
    if (count) count.textContent = this._manualItems.length;

    if (!this._manualItems.length) {
      if (lista) lista.innerHTML = `<div class="empty-state" style="padding:16px 0;"><div class="empty-icon">📝</div>Agrega ítems arriba</div>`;
      return;
    }

    if (!lista) return;
    lista.innerHTML = `
      <div class="table-wrap" style="margin-bottom:8px;">
        <table class="data-table">
          <thead><tr>
            <th>#</th><th>SKU</th><th>Serie</th>
            <th>Cant.</th><th>Pedido</th><th>Tipo</th><th></th>
          </tr></thead>
          <tbody>
            ${this._manualItems.map((it,i) => `
              <tr>
                <td style="color:var(--text-tertiary);">${i+1}</td>
                <td class="sku-cell">${escapeHtml(it.MATERIAL)}</td>
                <td class="serie-cell" style="font-size:10px;">
                  ${it.SERIE && it.SERIE !== '-' ? escapeHtml(it.SERIE) : '<span style="color:var(--text-tertiary);">Sin serie</span>'}
                </td>
                <td style="font-weight:700;color:var(--accent);">${formatNum(it.CANTIDAD_RECIBIDA)}</td>
                <td style="font-size:11px;">${escapeHtml(it.N_PEDIDO) || '—'}</td>
                <td><span class="pill pill-neutral" style="font-size:10px;">${escapeHtml(it.TIPO_INGRESO)}</span></td>
                <td>
                  <button class="btn-icon" style="color:var(--danger);" onclick="RecepcionView._eliminarItemManual(${i})" title="Eliminar">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="btn-row" style="margin-top:10px;">
        <button class="btn-primary" id="btn-guardar-manual">✓ Guardar ${this._manualItems.length} ítems al stock</button>
      </div>
    `;

    document.getElementById('btn-guardar-manual')?.addEventListener('click', () => this._guardarManual());
  },

  _eliminarItemManual(idx) {
    this._manualItems.splice(idx, 1);
    this._renderManualItems();
  },

  async _guardarManual() {
    const btn = document.getElementById('btn-guardar-manual');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    const { error, count } = await registrarIngresosDesdeExcel(this._manualItems);
    const res = document.getElementById('man-resultado');

    if (error) {
      if (btn) { btn.disabled = false; btn.textContent = `✓ Guardar ${this._manualItems.length} ítems al stock`; }
      if (res) res.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(String(error))}</div>`;
      return;
    }

    this._manualItems = [];
    this._renderManualItems();
    if (res) res.innerHTML = `
      <div class="alert alert-success">
        <strong>✓ ${count} ítems registrados en stock correctamente.</strong>
      </div>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-secondary" onclick="Router.navigate('recepcion')">Nueva recepción</button>
        <button class="btn-primary"   onclick="Router.navigate('consulta')">Ver en consultas →</button>
      </div>
    `;
  },

  // ============================================================
  // VISTA DE LPNs — listado y detalle
  // ============================================================
  async _renderListaLPNs(c) {
    c.innerHTML = `
      ${this._btnVolver()}
      <div class="card" style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
          <p class="card-title" style="margin:0;">Contenedores LPN</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <select id="lpn-filtro-estado" style="font-size:12px;">
              <option value="">Todos los estados</option>
              <option value="RECEPCION">En recepción</option>
              <option value="UBICADO">Ubicados</option>
            </select>
            <select id="lpn-filtro-cliente" style="font-size:12px;">
              <option value="">Todos los clientes</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
            </select>
          </div>
        </div>
        <div id="lpn-lista-contenido">
          <div class="empty-state"><div class="empty-icon">⏳</div>Cargando LPNs…</div>
        </div>
      </div>
    `;
    this._bindVolver(c);

    document.getElementById('lpn-filtro-estado')?.addEventListener('change',  () => this._cargarLPNs());
    document.getElementById('lpn-filtro-cliente')?.addEventListener('change', () => this._cargarLPNs());

    await this._cargarLPNs();
  },

  async _cargarLPNs() {
    const estado  = document.getElementById('lpn-filtro-estado')?.value  || null;
    const cliente = document.getElementById('lpn-filtro-cliente')?.value || null;
    const lista   = document.getElementById('lpn-lista-contenido');
    if (!lista) return;

    lista.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';
    const lpns = await obtenerLPNs({ estado, cliente });

    if (!lpns.length) {
      lista.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div>No hay LPNs creados aún.</div>';
      return;
    }

    lista.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Código</th><th>Cliente</th><th>Ítems</th><th>Estado</th><th>Ubicación</th><th>Fecha</th><th></th>
          </tr></thead>
          <tbody>
            ${lpns.map(lp => {
              const itemCount = lp.stock?.[0]?.count ?? '?';
              const estadoPill = lp.estado === 'UBICADO'
                ? `<span class="pill pill-success">Ubicado</span>`
                : `<span class="pill pill-warning">En recepción</span>`;
              return `
                <tr>
                  <td style="font-family:monospace; font-weight:700; font-size:13px; color:var(--accent);">${escapeHtml(lp.codigo)}</td>
                  <td style="font-size:12px;">${escapeHtml(lp.cliente || '—')}</td>
                  <td style="font-weight:700;">${itemCount}</td>
                  <td>${estadoPill}</td>
                  <td style="font-size:11px;">${escapeHtml(lp.ubicacion || 'RECEPCIÓN')}</td>
                  <td style="font-size:11px;">${formatFecha(lp.creado_en)}</td>
                  <td style="display:flex; gap:6px;">
                    <button class="btn-secondary" style="font-size:11px; padding:4px 8px;" onclick="RecepcionView._verDetalleLPN('${lp.id}', '${escapeHtml(lp.codigo)}')">Ver</button>
                    <button class="btn-secondary" style="font-size:11px; padding:4px 8px;" onclick="RecepcionView._imprimirEtiquetaLPN(${JSON.stringify(lp).split('"').join('&quot;')})">🖨 Etiqueta</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _verDetalleLPN(lpnId, lpnCodigo) {
    const c = document.getElementById('recep-contenido');
    c.innerHTML = `
      <button class="btn-secondary" id="btn-volver-detalle-lpn" style="margin-bottom:12px;">← Volver a LPNs</button>
      <div class="empty-state"><div class="empty-icon">⏳</div>Cargando detalle…</div>
    `;
    document.getElementById('btn-volver-detalle-lpn')?.addEventListener('click', () => {
      this._flujo = 'lista-lpns';
      this._renderListaLPNs(c);
    });

    const { lpn, items } = await obtenerLPNConItems(lpnId);
    if (!lpn) {
      c.innerHTML += '<div class="alert alert-danger">No se pudo cargar el LPN.</div>';
      return;
    }

    const pedidos = [...new Set(items.map(i => i.paleta_pedido).filter(Boolean))];
    const estadoPill = lpn.estado === 'UBICADO'
      ? `<span class="pill pill-success">Ubicado</span>`
      : `<span class="pill pill-warning">En recepción</span>`;

    c.innerHTML = `
      <button class="btn-secondary" id="btn-volver-detalle-lpn2" style="margin-bottom:12px;">← Volver a LPNs</button>

      <div class="card" style="border-left:3px solid var(--accent); margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <div>
            <span style="font-size:22px; font-weight:900; color:var(--accent); font-family:monospace;">${escapeHtml(lpn.codigo)}</span>
            <span style="margin-left:8px;">${estadoPill}</span>
          </div>
          <button class="btn-secondary" onclick="RecepcionView._imprimirEtiquetaLPN(${JSON.stringify(lpn).split('"').join('&quot;')})">🖨 Imprimir etiqueta</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:8px; margin-top:12px;">
          <div>
            <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Cliente</div>
            <div style="font-weight:600;">${escapeHtml(lpn.cliente || '—')}</div>
          </div>
          <div>
            <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Ubicación</div>
            <div style="font-weight:600;">${escapeHtml(lpn.ubicacion || 'RECEPCIÓN')}</div>
          </div>
          <div>
            <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Pedidos</div>
            <div style="font-weight:600; font-size:11px;">${pedidos.length ? pedidos.map(p => escapeHtml(p)).join(', ') : '—'}</div>
          </div>
          <div>
            <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Total ítems</div>
            <div style="font-weight:700; font-size:18px; color:var(--accent);">${items.length}</div>
          </div>
          <div>
            <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Creado</div>
            <div style="font-weight:600;">${formatFechaHora(lpn.creado_en)}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <p class="card-title" style="margin-bottom:8px;">Ítems en el contenedor (${items.length})</p>
        ${items.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr>
                <th>#</th><th>SKU</th><th>Descripción</th><th>Serie</th><th>Cant.</th><th>Pedido</th><th>Estado</th>
              </tr></thead>
              <tbody>
                ${items.map((it, i) => `
                  <tr>
                    <td style="color:var(--text-tertiary);">${i+1}</td>
                    <td class="sku-cell">${escapeHtml(it.sku)}</td>
                    <td style="font-size:10px; max-width:240px;">${escapeHtml(it.descripcion || '—')}</td>
                    <td class="serie-cell" style="font-size:10px;">
                      ${it.serie ? escapeHtml(it.serie) : '<span style="color:var(--text-tertiary);">Sin serie</span>'}
                    </td>
                    <td style="font-weight:700; color:var(--accent);">${formatNum(it.cantidad)}</td>
                    <td style="font-size:11px;">${escapeHtml(it.paleta_pedido || '—')}</td>
                    <td><span class="pill ${it.estado === 'DISPONIBLE' ? 'pill-success' : 'pill-warning'}" style="font-size:10px;">${escapeHtml(it.estado || '—')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty-state" style="padding:16px 0;"><div class="empty-icon">📭</div>Sin ítems registrados.</div>'}
      </div>
    `;

    document.getElementById('btn-volver-detalle-lpn2')?.addEventListener('click', () => {
      this._flujo = 'lista-lpns';
      this._renderListaLPNs(c);
    });
  },

  // ============================================================
  // IMPRESIÓN DE ETIQUETA LPN
  // ============================================================
  _imprimirEtiquetaLPN(lpn) {
    if (typeof lpn === 'string') {
      try { lpn = JSON.parse(lpn.replace(/&quot;/g, '"')); } catch(e) { alert('Error al leer datos del LPN.'); return; }
    }

    // Cargar JsBarcode si no está disponible
    const _doImprimir = () => {
      const pedidos = lpn._pedidos || lpn.pedidos || '';
      const fecha   = formatFecha(lpn.creado_en);

      const win = window.open('', '_blank', 'width=420,height=320');
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Etiqueta ${lpn.codigo}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
          <style>
            @page { size: 100mm 55mm; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: 100mm; height: 55mm;
              display: flex; flex-direction: column;
              align-items: center; justify-content: center;
              font-family: Arial, sans-serif;
              padding: 3mm;
            }
            .lpn-codigo {
              font-size: 14pt; font-weight: 900;
              letter-spacing: 1px; margin-bottom: 2mm;
            }
            svg#barcode { width: 90mm; height: 22mm; }
            .lpn-info {
              display: flex; gap: 6mm; margin-top: 2mm;
              font-size: 7pt; color: #333;
            }
            .lpn-info span { display: flex; flex-direction: column; align-items: center; }
            .lpn-info strong { font-size: 8pt; }
          </style>
        </head>
        <body>
          <div class="lpn-codigo">${lpn.codigo}</div>
          <svg id="barcode"></svg>
          <div class="lpn-info">
            <span>CLIENTE<strong>${lpn.cliente || '—'}</strong></span>
            <span>FECHA<strong>${fecha}</strong></span>
            ${lpn.ubicacion && lpn.ubicacion !== 'RECEPCION' ? `<span>UBICACIÓN<strong>${lpn.ubicacion}</strong></span>` : ''}
          </div>
          <script>
            window.onload = function() {
              JsBarcode("#barcode", "${lpn.codigo}", {
                format: "CODE128",
                width: 2.2,
                height: 60,
                displayValue: false,
                margin: 0
              });
              setTimeout(() => window.print(), 400);
            };
          <\/script>
        </body>
        </html>
      `);
      win.document.close();
    };

    _doImprimir();
  }
};

Router.register('recepcion', RecepcionView);
