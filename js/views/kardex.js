// KARDEX — filtros completos
const KardexView = {
  title: 'Kardex',

  render() {
    return `
      <div class="card">
        <p class="card-title">Filtros</p>
        <div class="filtros-grid">
          <div class="field"><label>SKU</label><input type="text" id="kx-sku" autocomplete="off"></div>
          <div class="field"><label>Serie</label><input type="text" id="kx-serie" autocomplete="off" style="font-family:monospace;"></div>
          <div class="field"><label>Descripción</label><input type="text" id="kx-desc" autocomplete="off"></div>
          <div class="field"><label>Pedido / Paleta</label><input type="text" id="kx-pedido" autocomplete="off"></div>
          <div class="field">
            <label>Tipo movimiento</label>
            <select id="kx-tipo">
              <option value="">Todos</option>
              <option value="INGRESO">Ingreso</option>
              <option value="SALIDA">Salida</option>
              <option value="MOVIMIENTO_UBICACION">Movimiento ubicación</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>
          <div class="field"><label>Fecha desde</label><input type="date" id="kx-desde"></div>
          <div class="field"><label>Fecha hasta</label><input type="date" id="kx-hasta"></div>
        </div>
        <div style="display:flex; gap:6px; margin-top:10px; flex-wrap:wrap;">
          <button class="btn-primary" id="kx-btn-buscar">Buscar</button>
          <button class="btn-ghost"   id="kx-btn-limpiar">Limpiar</button>
          <button class="btn-secondary" id="kx-btn-exportar" style="display:none;">↓ Exportar Excel</button>
        </div>
      </div>
      <p class="result-count" id="kx-contador"></p>
      <div id="kx-resultados"></div>
    `;
  },

  afterRender() {
    document.getElementById('kx-btn-buscar').addEventListener('click',  ()=>this.cargar());
    document.getElementById('kx-btn-limpiar').addEventListener('click', ()=>this._limpiar());
    document.getElementById('kx-btn-exportar').addEventListener('click',()=>this._exportar());
    ['kx-sku','kx-serie','kx-desc','kx-pedido'].forEach(id=>{
      document.getElementById(id)?.addEventListener('keydown', e=>{ if(e.key==='Enter') this.cargar(); });
    });
    this.cargar();
  },

  _limpiar() {
    ['kx-sku','kx-serie','kx-desc','kx-pedido','kx-desde','kx-hasta'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    const t=document.getElementById('kx-tipo'); if(t) t.value='';
    document.getElementById('kx-resultados').innerHTML='';
    document.getElementById('kx-contador').textContent='';
    document.getElementById('kx-btn-exportar').style.display='none';
    this._data=[];
  },

  async cargar() {
    const sku    = document.getElementById('kx-sku')?.value.trim()||'';
    const serie  = document.getElementById('kx-serie')?.value.trim()||'';
    const desc   = document.getElementById('kx-desc')?.value.trim()||'';
    const pedido = document.getElementById('kx-pedido')?.value.trim()||'';
    const tipo   = document.getElementById('kx-tipo')?.value||'';
    const desde  = document.getElementById('kx-desde')?.value||'';
    const hasta  = document.getElementById('kx-hasta')?.value||'';

    const cont    = document.getElementById('kx-resultados');
    const contador= document.getElementById('kx-contador');
    cont.innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Cargando…</div>';

    let data = await obtenerKardex({ sku, serie, descripcion: desc, pedido, limite: 500 });
    if (tipo)  data = data.filter(m=>m.tipo_movimiento===tipo);
    if (desde) data = data.filter(m=>m.fecha && m.fecha >= desde);
    if (hasta) data = data.filter(m=>m.fecha && m.fecha <= hasta+'T23:59:59');

    this._data = data;
    contador.textContent = `${data.length} movimiento${data.length!==1?'s':''}`;

    const exportBtn = document.getElementById('kx-btn-exportar');
    if(exportBtn) exportBtn.style.display = data.length ? '' : 'none';

    if(!data.length){
      cont.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div>Sin movimientos.</div>';
      return;
    }

    const tipoConfig = {
      'INGRESO':             { label:'Ingreso',    clase:'pill-success' },
      'SALIDA':              { label:'Salida',     clase:'pill-danger'  },
      'MOVIMIENTO_UBICACION':{ label:'Movimiento', clase:'pill-warning' },
      'AJUSTE':              { label:'Ajuste',     clase:'pill-neutral' },
    };

    cont.innerHTML=`
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Fecha</th><th>SKU</th><th>Descripción</th><th>Serie</th>
            <th>Tipo</th><th>Cant.</th><th>Detalle</th>
          </tr></thead>
          <tbody>
            ${data.map(mov=>{
              const conf=tipoConfig[mov.tipo_movimiento]||{label:mov.tipo_movimiento,clase:'pill-neutral'};
              const fechaStr=mov.fecha?new Date(mov.fecha).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'-';
              let detalle='';
              if(mov.tipo_movimiento==='MOVIMIENTO_UBICACION'){
                detalle=`${escapeHtml(mov.ubicacion_origen||'sin ubicación')} → ${escapeHtml(mov.ubicacion_destino||'-')}`;
              } else if(mov.referencia){
                detalle=`Ref: ${escapeHtml(mov.referencia)}`;
              } else if(mov.observaciones){
                detalle=escapeHtml(mov.observaciones);
              }
              return `<tr>
                <td style="white-space:nowrap;font-size:11px;">${fechaStr}</td>
                <td class="sku-cell">${escapeHtml(mov.sku)}</td>
                <td style="font-size:11px;max-width:200px;">${escapeHtml(mov.descripcion||'-')}</td>
                <td class="serie-cell" style="font-size:10px;">${escapeHtml(mov.serie||'-')}</td>
                <td><span class="pill ${conf.clase}">${conf.label}</span></td>
                <td class="num-cell" style="font-weight:700;">${formatNum(mov.cantidad)}</td>
                <td style="font-size:11px;">${detalle||'-'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async _exportar() {
    if(!this._data?.length) return;
    await cargarXlsx();
    const ws = XLSX.utils.json_to_sheet(this._data.map(m=>({
      Fecha:      m.fecha?new Date(m.fecha).toLocaleString('es-PE'):'-',
      SKU:        m.sku,
      Descripcion:m.descripcion||'',
      Serie:      m.serie||'',
      Tipo:       m.tipo_movimiento,
      Cantidad:   m.cantidad,
      Detalle:    m.referencia||m.observaciones||'',
    })));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Kardex');
    XLSX.writeFile(wb,`kardex_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
};
Router.register('kardex', KardexView);
