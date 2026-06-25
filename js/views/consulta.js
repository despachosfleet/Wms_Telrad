// CONSULTA DE STOCK
const ConsultaView = {
  title: 'Consultar stock',
  _resultados: [], _orden: 'sku', _dir: 'asc',
  _estadoFiltro: '', _tipoFiltro: '', _expandidaFila: null,

  hasProgress() { return false; },

  render() {
    return `
      <div class="filtros-barra">
        <div class="filtros-grid">
          <div class="field"><label>SKU</label><input id="f-sku" type="text" autocomplete="off"></div>
          <div class="field"><label>Serie</label><input id="f-serie" type="text" autocomplete="off" style="font-family:monospace;"></div>
          <div class="field"><label>Descripción</label><input id="f-desc" type="text" autocomplete="off"></div>
          <div class="field"><label>Pedido / Paleta</label><input id="f-paleta" type="text" autocomplete="off"></div>
          <div class="field"><label>Ubicación</label><input id="f-ubic" type="text" autocomplete="off"></div>
        </div>
        <!-- Chips estado — scroll horizontal en móvil -->
        <div class="filtros-chips-row" id="chips-estado-stock">
          <span class="chips-label">Estado:</span>
          ${['','DISPONIBLE','RESERVADO','DESPACHADO','DAÑADO'].map((e,i)=>
            `<button class="chip ${i===0?'active':''}" data-est-stock="${e}">${i===0?'Todos':e}</button>`
          ).join('')}
        </div>
        <!-- Chips tipo + cliente + botones en fila -->
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:nowrap; overflow-x:auto; padding-bottom:4px; scrollbar-width:none;">
          <span style="font-size:9px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;white-space:nowrap;flex-shrink:0;">Tipo:</span>
          <div class="chips-inline" id="chips-tipo-stock" style="flex-shrink:0;">
            ${['','MUDANZA','INGRESO NUEVO'].map((t,i)=>
              `<button class="chip ${i===0?'active':''}" data-tipo-stock="${t}">${i===0?'Todos':t==='INGRESO NUEVO'?'Ing. Nuevo':t}</button>`
            ).join('')}
          </div>
          <select id="f-cliente" style="font-size:11px;padding:4px 6px;flex-shrink:0;max-width:100px;">
            <option value="">Todos</option><option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
          </select>
          <button class="btn-primary" id="btn-buscar-stock" style="flex-shrink:0;white-space:nowrap;padding:5px 14px;font-size:12px;">Buscar</button>
          <button class="btn-ghost"   id="btn-limpiar-stock" style="flex-shrink:0;white-space:nowrap;padding:5px 10px;font-size:12px;">Limpiar</button>
        </div>
      </div>
      <div id="cont-resultado-stock"></div>
    `;
  },

  afterRender() {
    this._estadoFiltro=''; this._tipoFiltro=''; this._expandidaFila=null;
    this._extraVisible = false;

    document.getElementById('btn-buscar-stock').addEventListener('click', ()=>this._buscar());
    document.getElementById('btn-limpiar-stock').addEventListener('click', ()=>this._limpiar());

    // Toggle filtros extra
    document.getElementById('btn-toggle-extra')?.addEventListener('click', () => {
      this._extraVisible = !this._extraVisible;
      const extra = document.getElementById('filtros-extra');
      const btn   = document.getElementById('btn-toggle-extra');
      if (extra) extra.style.display = this._extraVisible ? '' : 'none';
      if (btn)   btn.textContent = this._extraVisible ? '− Menos filtros' : '+ Más filtros';
    });

    document.querySelectorAll('[data-est-stock]').forEach(c=>{
      c.addEventListener('click', ()=>{
        this._estadoFiltro=c.dataset.estStock;
        document.querySelectorAll('[data-est-stock]').forEach(x=>x.classList.remove('active'));
        c.classList.add('active');
        this._buscar();
      });
    });

    document.querySelectorAll('[data-tipo-stock]').forEach(c=>{
      c.addEventListener('click', ()=>{
        this._tipoFiltro=c.dataset.tipoStock;
        document.querySelectorAll('[data-tipo-stock]').forEach(x=>x.classList.remove('active'));
        c.classList.add('active');
        this._buscar();
      });
    });

    ['f-sku','f-serie','f-desc','f-paleta','f-ubic'].forEach(id=>{
      document.getElementById(id)?.addEventListener('keydown', e=>{ if(e.key==='Enter') this._buscar(); });
    });

    document.getElementById('f-cliente')?.addEventListener('change', ()=>this._buscar());
  },

  _limpiar() {
    ['f-sku','f-serie','f-desc','f-paleta','f-ubic'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const cl=document.getElementById('f-cliente'); if(cl) cl.value='';
    const clpc=document.getElementById('f-cliente-pc'); if(clpc) clpc.value='';
    this._estadoFiltro=''; this._tipoFiltro='';
    document.querySelectorAll('[data-est-stock]').forEach((c,i)=>c.classList.toggle('active',i===0));
    document.querySelectorAll('[data-tipo-stock]').forEach((c,i)=>c.classList.toggle('active',i===0));
    document.getElementById('cont-resultado-stock').innerHTML='';
    this._resultados=[]; this._expandidaFila=null;
  },

  async _buscar() {
    const btn=document.getElementById('btn-buscar-stock');
    const cont=document.getElementById('cont-resultado-stock');
    if(btn){ btn.disabled=true; btn.textContent='Buscando…'; }
    const { data } = await buscarStockAvanzado({
      sku:         document.getElementById('f-sku')?.value.trim()||'',
      serie:       document.getElementById('f-serie')?.value.trim()||'',
      descripcion: document.getElementById('f-desc')?.value.trim()||'',
      paleta:      document.getElementById('f-paleta')?.value.trim()||'',
      ubic:        document.getElementById('f-ubic')?.value.trim()||'',
      cliente:     (document.getElementById('f-cliente')?.value || document.getElementById('f-cliente-pc')?.value || ''),
      estado:      this._estadoFiltro,
      tipo:        this._tipoFiltro,
      orden:this._orden, dir:this._dir, limit:300,
    });
    this._resultados=data||[]; this._expandidaFila=null;
    if(btn){ btn.disabled=false; btn.textContent='Buscar'; }
    this._renderTabla(cont);
  },

  _renderTabla(cont) {
    if(!this._resultados.length){
      cont.innerHTML=`<div class="empty-state"><div class="empty-icon">🔍</div><strong>Sin resultados</strong>Prueba con otros filtros.</div>`;
      return;
    }
    const th=(campo,label)=>{
      const act=this._orden===campo;
      return `<th class="sortable" data-col="${campo}">${label}${act?(this._dir==='asc'?' ↑':' ↓'):''}</th>`;
    };
    cont.innerHTML=`
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; gap:8px;">
        <p style="font-size:11px;color:var(--text-tertiary);margin:0;">${this._resultados.length} resultado${this._resultados.length!==1?'s':''} · clic en fila para ver detalle</p>
        <button class="btn-secondary" id="btn-exportar-consulta" style="font-size:11px; padding:4px 10px; flex-shrink:0;">↓ Excel</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            ${th('sku','SKU')} ${th('descripcion','Descripción')} ${th('serie','Serie')}
            ${th('cantidad','Cant.')} ${th('ubicacion_fisica','Ubicación')} ${th('paleta_pedido','Paleta/Pedido')}
            ${th('tipo','Tipo')} ${th('estado','Estado')}
          </tr></thead>
          <tbody id="tbody-stock">${this._renderFilas()}</tbody>
        </table>
      </div>`;
    document.getElementById('btn-exportar-consulta')?.addEventListener('click', ()=>this._exportar());
    cont.querySelectorAll('th.sortable').forEach(th=>{
      th.addEventListener('click', ()=>{
        const col=th.dataset.col;
        if(this._orden===col) this._dir=this._dir==='asc'?'desc':'asc'; else{this._orden=col;this._dir='asc';}
        this._resultados=[...this._resultados].sort((a,b)=>{
          const va=String(a[col]??'').toLowerCase(),vb=String(b[col]??'').toLowerCase();
          return this._dir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
        });
        this._renderTabla(cont);
      });
    });
    this._bindFilas();
  },

  _renderFilas() {
    return this._resultados.map((r,i)=>{
      const exp=this._expandidaFila===i;
      const estadoPill=r.estado==='DISPONIBLE'?'<span class="pill pill-success">Disponible</span>'
        :r.estado==='RESERVADO'?'<span class="pill pill-warning">Reservado</span>'
        :r.estado==='DAÑADO'?'<span class="pill pill-danger">Dañado</span>'
        :`<span class="pill pill-neutral">${escapeHtml(r.estado||'-')}</span>`;
      const tipoPill=r.tipo==='MUDANZA'
        ?`<span class="pill pill-info" style="font-size:10px;">Mudanza</span>`
        :r.tipo==='INGRESO NUEVO'
        ?`<span class="pill pill-success" style="font-size:10px;">Ingreso nuevo</span>`
        :r.tipo?`<span class="pill pill-neutral" style="font-size:10px;">${escapeHtml(r.tipo)}</span>`:'';
      return `
        <tr data-fila="${i}" class="${exp?'tr-expanded':''}" style="cursor:pointer;">
          <td class="sku-cell">${escapeHtml(r.sku||'-')}</td>
          <td class="desc-cell">${escapeHtml(r.descripcion||'-')}</td>
          <td class="serie-cell">${escapeHtml(r.serie||'-')}</td>
          <td style="font-weight:700;white-space:nowrap;color:${Number(r.cantidad)<=0?'var(--danger-text)':'var(--text)'};">${formatNum(r.cantidad)}</td>
          <td style="white-space:nowrap;">${escapeHtml(r.ubicacion_fisica||'-')}</td>
          <td style="font-family:monospace;font-size:11px;white-space:nowrap;">${escapeHtml(r.paleta_pedido||'-')}</td>
          <td>${tipoPill}</td>
          <td>${estadoPill}</td>
        </tr>
        ${exp?`<tr class="tr-detalle"><td colspan="8">
          <div class="tr-detalle-inner">
            <span><strong>Cliente:</strong> ${escapeHtml(r.cliente||'-')}</span>
            <span><strong>Condición:</strong> ${escapeHtml(r.condicion||'-')}</span>
            <span><strong>GR ingreso:</strong> ${escapeHtml(r.gr_ingreso||'-')}</span>
            <span><strong>Fecha ingreso:</strong> ${formatFecha(r.fecha_ingreso)}</span>
            ${r.observaciones?`<span><strong>Obs.:</strong> ${escapeHtml(r.observaciones)}</span>`:''}
          </div>
        </td></tr>`:''}
      `;
    }).join('');
  },

  async _exportar() {
    if (!this._resultados.length) return;
    await cargarXlsx();
    const ws = XLSX.utils.json_to_sheet(this._resultados.map(r=>({
      SKU:           r.sku,
      Descripcion:   r.descripcion||'',
      Serie:         r.serie||'',
      Cantidad:      r.cantidad,
      Cliente:       r.cliente||'',
      PaletaPedido:  r.paleta_pedido||'',
      Ubicacion:     r.ubicacion_fisica||'',
      Tipo:          r.tipo||'',
      Estado:        r.estado||'',
      Condicion:     r.condicion||'',
      FechaIngreso:  r.fecha_ingreso||'',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, `consulta_stock_${new Date().toISOString().slice(0,10)}.xlsx`);
  },

  _bindFilas() {
    document.querySelectorAll('[data-fila]').forEach(tr=>{
      tr.addEventListener('click', ()=>{
        const i=Number(tr.dataset.fila);
        this._expandidaFila=this._expandidaFila===i?null:i;
        const tbody=document.getElementById('tbody-stock');
        if(tbody){tbody.innerHTML=this._renderFilas();this._bindFilas();}
      });
    });
  }
};
Router.register('consulta', ConsultaView);
