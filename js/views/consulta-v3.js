// CONSULTA DE STOCK
const ConsultaView = {
  title: 'Consultar stock',
  _resultados: [], _orden: 'sku', _dir: 'asc',
  _estadoFiltro: '', _tipoFiltro: '', _expandidaFila: null,

  hasProgress() { return false; },

  render() {
    return `
      <div style="background:var(--bg-card);border-bottom:1px solid var(--border);padding:8px 10px;">

        <!-- Fila 1: SKU + Serie -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">SKU</label>
            <input id="f-sku" type="text" autocomplete="off" style="padding:5px 7px;font-size:12px;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Serie</label>
            <input id="f-serie" type="text" autocomplete="off" style="padding:5px 7px;font-size:12px;font-family:monospace;">
          </div>
        </div>

        <!-- Fila 2: Paleta + Buscar + X + ⊕ -->
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:5px;">
          <input id="f-paleta" type="text" placeholder="Paleta / Pedido" autocomplete="off"
            style="flex:1;min-width:0;padding:5px 7px;font-size:12px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
          <button class="btn-primary" id="btn-buscar-stock" style="flex-shrink:0;padding:5px 10px;font-size:12px;">Buscar</button>
          <button class="btn-ghost"   id="btn-limpiar-stock" style="flex-shrink:0;padding:5px 8px;font-size:12px;">✕</button>
          <button class="btn-ghost"   id="btn-toggle-extra" style="flex-shrink:0;padding:5px 8px;font-size:11px;" title="Más filtros">⊕</button>
        </div>

        <!-- Filtros extra — ocultos por defecto -->
        <div id="filtros-extra" style="display:none;margin-bottom:5px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:4px;">
            <div class="field" style="margin:0;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Descripción</label>
              <input id="f-desc" type="text" autocomplete="off" style="padding:5px 7px;font-size:12px;">
            </div>
            <div class="field" style="margin:0;">
              <label style="font-size:9px;text-transform:uppercase;color:var(--text-tertiary);">Ubicación</label>
              <input id="f-ubic" type="text" autocomplete="off" style="padding:5px 7px;font-size:12px;">
            </div>
          </div>
          <select id="f-cliente" style="width:100%;font-size:12px;padding:5px 7px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);">
            <option value="">Todos los clientes</option><option>ENTEL</option><option>CLARO</option><option>TELRAD</option>
          </select>
        </div>

        <!-- Fila 3: Chips Est + Tipo en scroll separado -->
        <div style="display:flex;gap:3px;overflow-x:auto;scrollbar-width:none;flex-wrap:nowrap;align-items:center;padding-bottom:2px;">
          <span style="font-size:9px;font-weight:700;color:var(--text-tertiary);white-space:nowrap;flex-shrink:0;">Est:</span>
          <div id="chips-estado-stock" style="display:flex;gap:2px;flex-wrap:nowrap;flex-shrink:0;">
            ${['','DISPONIBLE','RESERVADO','DESPACHADO','DAÑADO'].map((e,i)=>
              `<button class="chip ${i===0?'active':''}" data-est-stock="${e}" style="white-space:nowrap;flex-shrink:0;padding:2px 6px;font-size:9px;">${i===0?'Todos':e==='DISPONIBLE'?'Disp':e==='RESERVADO'?'Res':e==='DESPACHADO'?'Desp':'Dañ'}</button>`
            ).join('')}
          </div>
          <span style="font-size:9px;font-weight:700;color:var(--text-tertiary);white-space:nowrap;flex-shrink:0;margin-left:4px;">Tipo:</span>
          <div id="chips-tipo-stock" style="display:flex;gap:2px;flex-wrap:nowrap;flex-shrink:0;">
            ${['','MUDANZA','INGRESO NUEVO'].map((t,i)=>
              `<button class="chip ${i===0?'active':''}" data-tipo-stock="${t}" style="white-space:nowrap;flex-shrink:0;padding:2px 6px;font-size:9px;">${i===0?'Todos':t==='MUDANZA'?'Mud':'Ing'}</button>`
            ).join('')}
          </div>
        </div>

      </div>
      <div id="cont-resultado-stock" style="padding:4px 2px;"></div>
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
