// CONSULTA DE STOCK — filtros compactos en barra sticky, tabla limpia
const ConsultaView = {
  title: 'Consultar stock',
  _resultados: [], _orden: 'sku', _dir: 'asc',
  _estadoFiltro: '', _expandidaFila: null,

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
        <div class="filtros-grid-2">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="font-size:10px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase; white-space:nowrap;">Estado:</span>
            <div class="chips-inline" id="chips-estado-stock">
              ${['','DISPONIBLE','RESERVADO','DESPACHADO','DAÑADO'].map((e,i)=>
                `<button class="chip ${i===0?'active':''}" data-est-stock="${e}">${i===0?'Todos':e}</button>`
              ).join('')}
            </div>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label>Cliente</label>
            <select id="f-cliente"><option value="">Todos</option><option>ENTEL</option><option>CLARO</option><option>TELRAD</option></select>
          </div>
          <button class="btn-primary" id="btn-buscar-stock" style="height:34px; padding:0 16px; align-self:end;">Buscar</button>
          <button class="btn-ghost"   id="btn-limpiar-stock" style="height:34px; align-self:end;">Limpiar</button>
        </div>
      </div>
      <div id="cont-resultado-stock"></div>
    `;
  },

  afterRender() {
    this._estadoFiltro=''; this._expandidaFila=null;
    document.getElementById('btn-buscar-stock').addEventListener('click', ()=>this._buscar());
    document.getElementById('btn-limpiar-stock').addEventListener('click', ()=>this._limpiar());
    document.querySelectorAll('[data-est-stock]').forEach(c=>{
      c.addEventListener('click', ()=>{
        this._estadoFiltro=c.dataset.estStock;
        document.querySelectorAll('[data-est-stock]').forEach(x=>x.classList.remove('active'));
        c.classList.add('active');
      });
    });
    ['f-sku','f-serie','f-desc','f-paleta','f-ubic'].forEach(id=>{
      document.getElementById(id)?.addEventListener('keydown', e=>{ if(e.key==='Enter') this._buscar(); });
    });
  },

  _limpiar() {
    ['f-sku','f-serie','f-desc','f-paleta','f-ubic'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const cl=document.getElementById('f-cliente'); if(cl) cl.value='';
    this._estadoFiltro='';
    document.querySelectorAll('[data-est-stock]').forEach((c,i)=>c.classList.toggle('active',i===0));
    document.getElementById('cont-resultado-stock').innerHTML='';
    this._resultados=[]; this._expandidaFila=null;
  },

  async _buscar() {
    const btn=document.getElementById('btn-buscar-stock');
    const cont=document.getElementById('cont-resultado-stock');
    btn.disabled=true; btn.textContent='Buscando…';
    const { data } = await buscarStockAvanzado({
      sku:         document.getElementById('f-sku')?.value.trim()||'',
      serie:       document.getElementById('f-serie')?.value.trim()||'',
      descripcion: document.getElementById('f-desc')?.value.trim()||'',
      paleta:      document.getElementById('f-paleta')?.value.trim()||'',
      ubic:        document.getElementById('f-ubic')?.value.trim()||'',
      cliente:     document.getElementById('f-cliente')?.value||'',
      estado:      this._estadoFiltro,
      orden:this._orden, dir:this._dir, limit:300,
    });
    this._resultados=data||[]; this._expandidaFila=null;
    btn.disabled=false; btn.textContent='Buscar';
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
      <p style="font-size:11px;color:var(--text-tertiary);margin-bottom:5px;">${this._resultados.length} resultado${this._resultados.length!==1?'s':''} · clic en fila para ver detalle</p>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            ${th('sku','SKU')} ${th('descripcion','Descripción')} ${th('serie','Serie')}
            ${th('cantidad','Cant.')} ${th('ubicacion_fisica','Ubicación')} ${th('paleta_pedido','Paleta/Pedido')} ${th('estado','Estado')}
          </tr></thead>
          <tbody id="tbody-stock">${this._renderFilas()}</tbody>
        </table>
      </div>`;
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
      return `
        <tr data-fila="${i}" class="${exp?'tr-expanded':''}" style="cursor:pointer;">
          <td class="sku-cell">${escapeHtml(r.sku||'-')}</td>
          <td class="desc-cell">${escapeHtml(r.descripcion||'-')}</td>
          <td class="serie-cell">${escapeHtml(r.serie||'-')}</td>
          <td style="font-weight:700;white-space:nowrap;color:${Number(r.cantidad)<=0?'var(--danger-text)':'var(--text)'};">${formatNum(r.cantidad)}</td>
          <td style="white-space:nowrap;">${escapeHtml(r.ubicacion_fisica||'-')}</td>
          <td style="font-family:monospace;font-size:11px;white-space:nowrap;">${escapeHtml(r.paleta_pedido||'-')}</td>
          <td>${estadoPill}</td>
        </tr>
        ${exp?`<tr class="tr-detalle"><td colspan="7">
          <div class="tr-detalle-inner">
            <span><strong>Cliente:</strong> ${escapeHtml(r.cliente||'-')}</span>
            <span><strong>Tipo:</strong> ${escapeHtml(r.tipo||'-')}</span>
            <span><strong>Condición:</strong> ${escapeHtml(r.condicion||'-')}</span>
            <span><strong>GR ingreso:</strong> ${escapeHtml(r.gr_ingreso||'-')}</span>
            <span><strong>Fecha ingreso:</strong> ${formatFecha(r.fecha_ingreso)}</span>
            ${r.observaciones?`<span><strong>Obs.:</strong> ${escapeHtml(r.observaciones)}</span>`:''}
          </div>
        </td></tr>`:''}
      `;
    }).join('');
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
