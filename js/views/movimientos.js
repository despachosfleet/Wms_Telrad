// MOVIMIENTOS — con filtros completos y Enter para buscar
const MovimientosView = {
  title: 'Movimientos',
  _modo: 'item',

  render() {
    return `
      <div class="card" style="margin-bottom:8px;">
        <div class="chips">
          <button class="chip active" id="tab-mov-item">Por ítem / serie</button>
          <button class="chip" id="tab-mov-paleta">Paleta / pedido completo</button>
          <button class="chip" id="tab-mov-ubic">Por ubicación</button>
        </div>
      </div>
      <div id="panel-mov-item">${this._renderItem()}</div>
      <div id="panel-mov-paleta" style="display:none;">${this._renderPaleta()}</div>
      <div id="panel-mov-ubic" style="display:none;">${this._renderUbic()}</div>
    `;
  },

  afterRender() {
    [['tab-mov-item','panel-mov-item','item'],['tab-mov-paleta','panel-mov-paleta','paleta'],['tab-mov-ubic','panel-mov-ubic','ubic']].forEach(([btn,panel,modo])=>{
      document.getElementById(btn)?.addEventListener('click',()=>{
        ['tab-mov-item','tab-mov-paleta','tab-mov-ubic'].forEach(b=>document.getElementById(b)?.classList.remove('active'));
        ['panel-mov-item','panel-mov-paleta','panel-mov-ubic'].forEach(p=>{const el=document.getElementById(p);if(el)el.style.display='none';});
        document.getElementById(btn)?.classList.add('active');
        const el=document.getElementById(panel);if(el)el.style.display='';
        this._modo=modo;
      });
    });
    this._bindItem(); this._bindPaleta(); this._bindUbic();
  },

  _renderFiltrosBusqueda(prefijo) {
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:8px;">
        <div class="field"><label>SKU</label><input id="${prefijo}-sku" type="text" autocomplete="off"></div>
        <div class="field"><label>Serie</label><input id="${prefijo}-serie" type="text" autocomplete="off" style="font-family:monospace;"></div>
        <div class="field"><label>Descripción</label><input id="${prefijo}-desc" type="text" autocomplete="off"></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr auto; gap:8px; align-items:end; margin-bottom:0;">
        <div class="field" style="margin-bottom:0;"><label>Pedido / Paleta</label><input id="${prefijo}-paleta" type="text" autocomplete="off"></div>
        <div class="field" style="margin-bottom:0;"><label>Ubicación</label><input id="${prefijo}-ubic" type="text" autocomplete="off"></div>
        <button class="btn-primary" id="${prefijo}-btn" style="height:36px; padding:0 16px;">Buscar</button>
      </div>
    `;
  },

  _renderItem() {
    return `
      <div class="card">
        <p class="card-title">Mover ítem individual</p>
        <p class="card-subtitle">Busca el ítem y verás qué encontró antes de moverlo.</p>
        ${this._renderFiltrosBusqueda('mi')}
      </div>
      <div id="resultado-mov-item"></div>
    `;
  },

  _renderPaleta() {
    return `
      <div class="card">
        <p class="card-title">Mover paleta/pedido completo</p>
        <p class="card-subtitle">Mueve todos los ítems de un pedido o paleta a una nueva ubicación.</p>
        <div class="field"><label>N° Paleta o Pedido</label><input id="mp-paleta" type="text" autocomplete="off"></div>
        <button class="btn-secondary" id="mp-btn">Ver ítems</button>
        <div id="resultado-mov-paleta"></div>
      </div>
    `;
  },

  _renderUbic() {
    return `
      <div class="card">
        <p class="card-title">Mover desde una ubicación</p>
        <p class="card-subtitle">Ve qué hay en una ubicación y mueve todo a otra.</p>
        <div class="field"><label>Ubicación actual</label><input id="mu-ubic" type="text" autocomplete="off"></div>
        <button class="btn-secondary" id="mu-btn">Ver contenido</button>
        <div id="resultado-mov-ubic"></div>
      </div>
    `;
  },

  _bindItem() {
    const buscar = async () => {
      const cont=document.getElementById('resultado-mov-item');
      const sku=document.getElementById('mi-sku')?.value.trim()||'';
      const serie=document.getElementById('mi-serie')?.value.trim()||'';
      const desc=document.getElementById('mi-desc')?.value.trim()||'';
      const paleta=document.getElementById('mi-paleta')?.value.trim()||'';
      const ubic=document.getElementById('mi-ubic')?.value.trim()||'';
      if (!sku&&!serie&&!desc&&!paleta&&!ubic) { cont.innerHTML='<div class="alert alert-warning">Ingresa al menos un filtro.</div>'; return; }
      cont.innerHTML='<p style="font-size:11px;color:var(--text-tertiary);padding:8px 0;">Buscando…</p>';
      const { data } = await buscarStockAvanzado({ sku, serie, descripcion:desc, paleta, ubic, limit:50 });
      if (!data?.length) { cont.innerHTML='<div class="alert alert-warning">No se encontraron ítems con esos filtros.</div>'; return; }
      cont.innerHTML=`
        <p style="font-size:11px;color:var(--text-tertiary);margin:8px 0 6px;">${data.length} ítem${data.length!==1?'s':''} encontrado${data.length!==1?'s':''}</p>
        ${data.map(r=>`
          <div class="recep-item" id="movr-${r.id}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
              <div style="min-width:0;">
                <span style="font-family:monospace;font-size:13px;font-weight:700;color:var(--text-mono);">${escapeHtml(r.sku)}</span>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;word-break:break-word;">${escapeHtml((r.descripcion||'').substring(0,80))}</div>
              </div>
              <span class="pill ${r.estado==='DISPONIBLE'?'pill-success':r.estado==='RESERVADO'?'pill-warning':'pill-neutral'}">${escapeHtml(r.estado||'-')}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;font-size:11px;">
              ${r.serie?`<span style="background:var(--bg-card);border:1px solid var(--border);border-radius:3px;padding:2px 7px;"><strong>Serie:</strong> <span style="font-family:monospace;">${escapeHtml(r.serie)}</span></span>`:''}
              ${r.paleta_pedido?`<span style="background:var(--bg-card);border:1px solid var(--border);border-radius:3px;padding:2px 7px;"><strong>Pedido/Paleta:</strong> ${escapeHtml(r.paleta_pedido)}</span>`:''}
              <span style="background:var(--bg-card);border:1px solid var(--border);border-radius:3px;padding:2px 7px;"><strong>Cant.:</strong> ${formatNum(r.cantidad)}</span>
              <span style="background:var(--bg-card);border:1px solid var(--border);border-radius:3px;padding:2px 7px;"><strong>Ubic. actual:</strong> ${escapeHtml(r.ubicacion_fisica||'Sin ubicación')}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="text" id="nueva-ubic-${r.id}" value="${escapeHtml(r.ubicacion_fisica||'')}"
                placeholder="Nueva ubicación"
                style="flex:1;background:var(--bg-input);border:1.5px solid var(--border-strong);border-radius:4px;padding:7px 10px;font-size:12px;">
              <button class="btn-primary" style="padding:7px 14px;font-size:12px;white-space:nowrap;" data-mover-item="${r.id}">Mover</button>
            </div>
            <div id="msg-mov-${r.id}"></div>
          </div>`).join('')}
      `;
      cont.querySelectorAll('[data-mover-item]').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          const id=Number(btn.dataset.moverItem);
          const nuevaUbic=document.getElementById(`nueva-ubic-${id}`)?.value.trim();
          const msg=document.getElementById(`msg-mov-${id}`);
          if (!nuevaUbic) { msg.innerHTML='<p class="msg-error">Ingresa la nueva ubicación.</p>'; return; }
          btn.disabled=true; btn.textContent='Moviendo…';
          const {error}=await moverUbicacion(id,nuevaUbic);
          if (error) { msg.innerHTML='<p class="msg-error">Error al mover.</p>'; btn.disabled=false; btn.textContent='Mover'; }
          else { msg.innerHTML=`<p class="msg-ok">✓ Movido a ${escapeHtml(nuevaUbic)}</p>`; btn.textContent='✓ Movido'; btn.className='btn-ghost'; btn.disabled=true; }
        });
      });
    };
    document.getElementById('mi-btn')?.addEventListener('click', buscar);
    ['mi-sku','mi-serie','mi-desc','mi-paleta','mi-ubic'].forEach(id=>{
      document.getElementById(id)?.addEventListener('keydown', e=>{ if(e.key==='Enter') buscar(); });
    });
  },

  _bindPaleta() {
    const buscar = async () => {
      const pp=document.getElementById('mp-paleta')?.value.trim();
      const cont=document.getElementById('resultado-mov-paleta');
      if (!pp) return;
      cont.innerHTML='<p style="font-size:11px;color:var(--text-tertiary);padding:8px 0;">Buscando…</p>';
      const {data}=await buscarStockAvanzado({paleta:pp,limit:100});
      if (!data?.length) { cont.innerHTML='<div class="alert alert-warning">No se encontraron ítems.</div>'; return; }
      cont.innerHTML=`
        <div class="card" style="margin-top:8px;">
          <p class="card-title">${data.length} ítems — Pedido/Paleta: <span style="font-family:monospace;">${escapeHtml(pp)}</span></p>
          <div class="table-wrap" style="margin-bottom:10px;">
            <table class="data-table"><thead><tr><th>SKU</th><th>Descripción</th><th>Cant.</th><th>Serie</th><th>Ubic. actual</th></tr></thead>
            <tbody>${data.slice(0,20).map(r=>`<tr><td class="sku-cell">${escapeHtml(r.sku)}</td><td class="desc-cell">${escapeHtml((r.descripcion||'').substring(0,50))}</td><td>${formatNum(r.cantidad)}</td><td style="font-family:monospace;font-size:11px;">${escapeHtml(r.serie||'-')}</td><td>${escapeHtml(r.ubicacion_fisica||'-')}</td></tr>`).join('')}
            ${data.length>20?`<tr><td colspan="5" style="text-align:center;font-size:11px;color:var(--text-tertiary);">… y ${data.length-20} más</td></tr>`:''}</tbody></table>
          </div>
          <div class="field"><label>Nueva ubicación para todos los ítems</label><input id="nueva-ubic-paleta" type="text" autocomplete="off"></div>
          <button class="btn-primary" id="btn-confirmar-mov-paleta">Mover ${data.length} ítems</button>
          <div id="msg-mov-paleta" style="margin-top:6px;"></div>
        </div>`;
      document.getElementById('btn-confirmar-mov-paleta')?.addEventListener('click', async ()=>{
        const nuevaUbic=document.getElementById('nueva-ubic-paleta')?.value.trim();
        const msg=document.getElementById('msg-mov-paleta');
        if (!nuevaUbic) { msg.innerHTML='<p class="msg-error">Ingresa la nueva ubicación.</p>'; return; }
        const btn=document.getElementById('btn-confirmar-mov-paleta');
        btn.disabled=true; btn.textContent='Moviendo…';
        const {error}=await moverPaletaCompleta(pp,nuevaUbic);
        msg.innerHTML=error?'<p class="msg-error">Error al mover.</p>':`<p class="msg-ok">✓ ${data.length} ítems movidos a ${escapeHtml(nuevaUbic)}</p>`;
        btn.disabled=false; btn.textContent='Mover ítems';
      });
    };
    document.getElementById('mp-btn')?.addEventListener('click', buscar);
    document.getElementById('mp-paleta')?.addEventListener('keydown', e=>{ if(e.key==='Enter') buscar(); });
  },

  _bindUbic() {
    const buscar = async () => {
      const q=document.getElementById('mu-ubic')?.value.trim();
      const cont=document.getElementById('resultado-mov-ubic');
      if (!q) return;
      cont.innerHTML='<p style="font-size:11px;color:var(--text-tertiary);padding:8px 0;">Buscando…</p>';
      const {data}=await buscarStockAvanzado({ubic:q,limit:100});
      if (!data?.length) { cont.innerHTML='<div class="alert alert-warning">No hay ítems en esa ubicación.</div>'; return; }
      cont.innerHTML=`
        <div class="card" style="margin-top:8px;">
          <p class="card-title">${data.length} ítems en <span style="font-family:monospace;">${escapeHtml(q)}</span></p>
          <div class="table-wrap" style="margin-bottom:10px;">
            <table class="data-table"><thead><tr><th>SKU</th><th>Descripción</th><th>Cant.</th><th>Paleta/Pedido</th></tr></thead>
            <tbody>${data.slice(0,30).map(r=>`<tr><td class="sku-cell">${escapeHtml(r.sku)}</td><td class="desc-cell">${escapeHtml((r.descripcion||'').substring(0,60))}</td><td>${formatNum(r.cantidad)}</td><td style="font-family:monospace;font-size:11px;">${escapeHtml(r.paleta_pedido||'-')}</td></tr>`).join('')}</tbody>
          </table></div>
          <div class="field"><label>Nueva ubicación para todos</label><input id="nueva-ubic-ubic" type="text" autocomplete="off"></div>
          <button class="btn-primary" id="btn-confirmar-mov-ubic">Mover todos</button>
          <div id="msg-mov-ubic" style="margin-top:6px;"></div>
        </div>`;
      document.getElementById('btn-confirmar-mov-ubic')?.addEventListener('click', async ()=>{
        const nuevaUbic=document.getElementById('nueva-ubic-ubic')?.value.trim();
        const msg=document.getElementById('msg-mov-ubic');
        if (!nuevaUbic) { msg.innerHTML='<p class="msg-error">Ingresa la nueva ubicación.</p>'; return; }
        const btn=document.getElementById('btn-confirmar-mov-ubic');
        btn.disabled=true; btn.textContent='Moviendo…';
        const {error}=await moverPaletaCompleta(q,nuevaUbic);
        msg.innerHTML=error?'<p class="msg-error">Error al mover.</p>':`<p class="msg-ok">✓ Ítems movidos a ${escapeHtml(nuevaUbic)}</p>`;
        btn.disabled=false; btn.textContent='Mover todos';
      });
    };
    document.getElementById('mu-btn')?.addEventListener('click', buscar);
    document.getElementById('mu-ubic')?.addEventListener('keydown', e=>{ if(e.key==='Enter') buscar(); });
  }
};
Router.register('movimientos', MovimientosView);
