// ============================================================
// NUEVA ORDEN DE PICKING — 3 modos:
// 1. Excel de cadena (Logística Telrad)
// 2. Excel formato propio (10 columnas)
// 3. Manual (formulario)
// ============================================================

// Formato propio: CLIENTE|PEDIDO_PALETA|GR|SKU|DESCRIPCION|UND|CANTIDAD|SERIE|DESTINO|CONTRATA
const FORMATO_PROPIO_COLS = ['CLIENTE','PEDIDO_PALETA','GR','SKU','DESCRIPCION','UND','CANTIDAD','SERIE','DESTINO','CONTRATA'];

const NuevoDespachoView = {
  title: 'Nueva orden de picking',
  _ordenes: [],
  _modoTab: 'cadena',

  render() {
    return `
      <div class="card" style="margin-bottom:8px;">
        <div class="chips">
          <button class="chip active" id="tab-nd-cadena">Excel de cadena</button>
          <button class="chip" id="tab-nd-propio">Excel formato propio</button>
          <button class="chip" id="tab-nd-manual">Manual</button>
        </div>
      </div>
      <div id="panel-nd-cadena">${this._renderCadena()}</div>
      <div id="panel-nd-propio" style="display:none;">${this._renderPropio()}</div>
      <div id="panel-nd-manual" style="display:none;">${this._renderManual()}</div>
      <div id="preview-nd"></div>
      <div id="resultado-nd"></div>
    `;
  },

  afterRender() {
    [['tab-nd-cadena','panel-nd-cadena','cadena'],
     ['tab-nd-propio','panel-nd-propio','propio'],
     ['tab-nd-manual','panel-nd-manual','manual']].forEach(([btn,panel,modo])=>{
      document.getElementById(btn)?.addEventListener('click',()=>{
        ['tab-nd-cadena','tab-nd-propio','tab-nd-manual'].forEach(b=>document.getElementById(b)?.classList.remove('active'));
        ['panel-nd-cadena','panel-nd-propio','panel-nd-manual'].forEach(p=>{const el=document.getElementById(p);if(el)el.style.display='none';});
        document.getElementById(btn)?.classList.add('active');
        const el=document.getElementById(panel);if(el)el.style.display='';
        this._modoTab=modo;
        document.getElementById('preview-nd').innerHTML='';
        document.getElementById('resultado-nd').innerHTML='';
      });
    });
    this._setupDropZone('file-drop-cadena','input-cadena', f=>this._procesarCadena(f));
    this._setupDropZone('file-drop-propio','input-propio', f=>this._procesarPropio(f));
    this._setupManual();
  },

  _setupDropZone(dropId, inputId, cb) {
    const drop=document.getElementById(dropId), input=document.getElementById(inputId);
    if (!drop||!input) return;
    drop.addEventListener('click',()=>input.click());
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag-over');});
    drop.addEventListener('dragleave',()=>drop.classList.remove('drag-over'));
    drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag-over');if(e.dataTransfer.files[0])cb(e.dataTransfer.files[0]);});
    input.addEventListener('change',e=>{if(e.target.files[0])cb(e.target.files[0]);});
  },

  _renderCadena() {
    return `
      <div class="card">
        <p class="card-title">Excel de cadena de suministro</p>
        <p class="card-subtitle">Formato de Logística Telrad. El sistema detecta todos los GRs automáticamente.</p>
        <div class="file-drop" id="file-drop-cadena">
          <div class="file-drop-icon">📊</div>
          <strong>Seleccionar archivo Excel</strong>
          Cadena de suministro Telrad (.xlsx)
        </div>
        <input type="file" id="input-cadena" accept=".xlsx,.xls" style="display:none;">
      </div>`;
  },

  _renderPropio() {
    return `
      <div class="card">
        <p class="card-title">Excel formato propio</p>
        <p class="card-subtitle">Para cuando no tienes el Excel de cadena. Usa estas 10 columnas en este orden:</p>
        <div class="table-wrap" style="margin-bottom:12px;">
          <table class="data-table">
            <thead><tr><th>#</th><th>Columna</th><th>Ejemplo</th></tr></thead>
            <tbody>
              ${FORMATO_PROPIO_COLS.map((c,i)=>{
                const ejemplos=['ENTEL','MR-304','T028-0000000064','ENT960055212','HUAWEI 03050JMG...','UND','1','2103050JMG10R4100447','AREQUIPA','SHALOM'];
                return `<tr><td style="font-weight:700;color:var(--text-tertiary);">${i+1}</td><td class="sku-cell">${c}</td><td style="font-size:11px;color:var(--text-secondary);">${ejemplos[i]}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="file-drop" id="file-drop-propio">
          <div class="file-drop-icon">📋</div>
          <strong>Seleccionar Excel formato propio</strong>
          10 columnas en el orden indicado (.xlsx)
        </div>
        <input type="file" id="input-propio" accept=".xlsx,.xls" style="display:none;">
      </div>`;
  },

  _renderManual() {
    return `
      <div class="card" id="form-manual-cab">
        <p class="card-title">Datos de la guía</p>
        <div class="field-grid">
          <div class="field"><label>N° GR</label><input id="m-gr" type="text" style="font-family:monospace;"></div>
          <div class="field"><label>Cliente</label>
            <select id="m-cliente"><option value="">— Seleccionar —</option><option>ENTEL</option><option>CLARO</option><option>TELRAD</option></select>
          </div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Destino</label><input id="m-destino" type="text"></div>
          <div class="field"><label>Destinatario / Razón social</label><input id="m-razon" type="text"></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Contrata</label><input id="m-contrata" type="text"></div>
          <div class="field"><label>Consignatarios</label><input id="m-consig" type="text"></div>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <p class="card-title" style="margin:0;">Ítems</p>
          <button class="btn-text" id="btn-add-item-m">+ Agregar ítem</button>
        </div>
        <div id="items-manual-list"><div style="font-size:11px;color:var(--text-tertiary);text-align:center;padding:16px;">Agrega los ítems de la guía</div></div>
      </div>
      <button class="btn-primary" id="btn-crear-manual" style="width:100%;">Generar orden de picking</button>
      <div id="msg-manual" style="margin-top:6px;"></div>
    `;
  },

  async _procesarCadena(file) {
    const preview=document.getElementById('preview-nd');
    preview.innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo Excel…</div>';
    try {
      const ordenesMap=await extraerTodasLasOrdenes(file);
      if (!ordenesMap||ordenesMap.size===0){preview.innerHTML='<div class="alert alert-danger">No se encontraron GRs. Verifica el formato del archivo.</div>';return;}
      this._ordenes=Array.from(ordenesMap.values());
      this._renderPreview();
    } catch(err) { preview.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(err.message)}</div>`; }
  },

  async _procesarPropio(file) {
    const preview=document.getElementById('preview-nd');
    preview.innerHTML='<div class="empty-state"><div class="empty-icon">⏳</div>Leyendo Excel…</div>';
    try {
      await cargarXlsx();
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const filas=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      if (!filas||filas.length<2){preview.innerHTML='<div class="alert alert-danger">El Excel está vacío.</div>';return;}

      // Detectar si primera fila es encabezado
      let inicio=0;
      const primera=filas[0].map(v=>String(v).toUpperCase().trim());
      if (primera.some(v=>FORMATO_PROPIO_COLS.includes(v))) inicio=1;

      // Agrupar por GR
      const mapa=new Map();
      filas.slice(inicio).forEach(r=>{
        const [cliente,pp,gr,sku,desc,und,cant,serie,destino,contrata]=r.map(v=>String(v||'').trim());
        if (!gr||!sku) return;
        const grKey=gr.toUpperCase();
        if (!mapa.has(grKey)) mapa.set(grKey,{gr:grKey,cliente:cliente.toUpperCase(),destino,razon_social:'',agencia:contrata,consignatarios:'',items:[]});
        const cantN=Number(cant)||0;
        if (cantN<=0) return;
        mapa.get(grKey).items.push({
          sku:sku.toUpperCase(), descripcion:desc, cantidad:cantN,
          serie:(serie&&serie!=='-'&&serie!=='')?serie:null,
          pedido_pallet:pp||null
        });
      });

      if (!mapa.size){preview.innerHTML='<div class="alert alert-danger">No se pudieron leer GRs del archivo.</div>';return;}
      this._ordenes=Array.from(mapa.values());
      this._renderPreview();
    } catch(err){preview.innerHTML=`<div class="alert alert-danger">Error: ${escapeHtml(err.message)}</div>`;}
  },

  _renderPreview() {
    const preview=document.getElementById('preview-nd');
    const total=this._ordenes.reduce((s,o)=>s+o.items.length,0);
    preview.innerHTML=`
      <div class="alert alert-info">Se encontraron <strong>${this._ordenes.length} GRs</strong> con <strong>${total} ítems</strong>. Revisa y corrige antes de crear.</div>
      <div id="ordenes-list">${this._ordenes.map((o,i)=>this._renderOrdenCard(o,i)).join('')}</div>
      <div class="btn-row">
        <button class="btn-primary" id="btn-crear-todas">Crear ${this._ordenes.length} orden${this._ordenes.length!==1?'es':''} en borrador</button>
        <button class="btn-ghost" id="btn-cancelar-nd">Cancelar</button>
      </div>`;
    preview.querySelectorAll('[data-toggle-nd]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const i=Number(btn.dataset.toggleNd);
        const div=document.getElementById(`items-nd-${i}`);
        if(div){const open=div.classList.toggle('open');btn.textContent=open?'▲ Cerrar':'▼ Ver y editar ítems';}
      });
    });
    preview.querySelectorAll('[data-add-nd]').forEach(btn=>{
      btn.addEventListener('click',e=>{e.stopPropagation();const i=Number(btn.dataset.addNd);this._ordenes[i].items.push({sku:'',descripcion:'',cantidad:1,serie:null,pedido_pallet:''});this._renderPreview();});
    });
    preview.querySelectorAll('[data-del-nd]').forEach(btn=>{
      btn.addEventListener('click',e=>{e.stopPropagation();const [oi,ii]=btn.dataset.delNd.split('-').map(Number);this._ordenes[oi].items.splice(ii,1);this._renderPreview();});
    });
    document.getElementById('btn-crear-todas')?.addEventListener('click',()=>this._crearTodas());
    document.getElementById('btn-cancelar-nd')?.addEventListener('click',()=>{preview.innerHTML='';this._ordenes=[];});
  },

  _renderOrdenCard(o,i) {
    return `
      <div class="orden-borrador-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <div>
            <span class="ob-gr">${escapeHtml(o.gr)}</span>
            <span class="pill pill-neutral" style="margin-left:6px;">${o.items.length} ítems</span>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);">${escapeHtml(o.destino||'')} ${o.razon_social?'· '+escapeHtml(o.razon_social):''}</div>
          <button class="btn-ghost" data-toggle-nd="${i}">▼ Ver y editar ítems</button>
        </div>
        <div class="expandable-items" id="items-nd-${i}">
          <div class="table-wrap" style="margin-top:8px;">
            <table class="data-table">
              <thead><tr><th>SKU</th><th>Descripción</th><th style="width:70px;">Cant.</th><th>Serie</th><th>Pedido/Paleta</th><th></th></tr></thead>
              <tbody>
                ${o.items.map((it,ii)=>`<tr>
                  <td><input type="text" value="${escapeHtml(it.sku)}" style="font-family:monospace;font-size:11px;width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:3px;padding:3px 6px;"
                    onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].sku=this.value.toUpperCase()"></td>
                  <td><input type="text" value="${escapeHtml(it.descripcion||'')}" style="font-size:11px;width:100%;min-width:180px;background:var(--bg-input);border:1px solid var(--border);border-radius:3px;padding:3px 6px;"
                    onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].descripcion=this.value"></td>
                  <td><input type="number" value="${it.cantidad}" min="1" style="font-size:13px;font-weight:800;width:65px;text-align:center;color:var(--accent);background:var(--bg-input);border:1px solid var(--border);border-radius:3px;padding:3px 6px;"
                    onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].cantidad=Number(this.value)"></td>
                  <td><input type="text" value="${escapeHtml(it.serie&&!it.serie.startsWith('-')?it.serie:'')}" style="font-family:monospace;font-size:11px;width:100%;min-width:140px;background:var(--bg-input);border:1px solid var(--border);border-radius:3px;padding:3px 6px;"
                    onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].serie=this.value||null"></td>
                  <td><input type="text" value="${escapeHtml(it.pedido_pallet||'')}" style="font-size:11px;width:100%;min-width:100px;background:var(--bg-input);border:1px solid var(--border);border-radius:3px;padding:3px 6px;"
                    onchange="NuevoDespachoView._ordenes[${i}].items[${ii}].pedido_pallet=this.value"></td>
                  <td><button style="background:none;border:none;cursor:pointer;color:var(--danger-text);font-size:16px;padding:0 4px;" data-del-nd="${i}-${ii}">×</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <button class="btn-ghost" style="margin-top:6px;" data-add-nd="${i}">+ Agregar ítem</button>
        </div>
      </div>`;
  },

  async _crearTodas() {
    const btn=document.getElementById('btn-crear-todas');
    if(btn){btn.disabled=true;btn.textContent='Creando…';}
    let ok=0,err=0,msgs=[];
    for (const o of this._ordenes) {
      const items=o.items.filter(it=>it.sku&&it.cantidad>0);
      if (!items.length){err++;msgs.push(`⚠ ${o.gr}: sin ítems válidos`);continue;}
      const {error}=await crearDespacho({
        gr:o.gr, fecha:new Date().toISOString().slice(0,10),
        cliente:o.cliente, destino:o.destino, razonSocial:o.razon_social,
        contrata:o.agencia, consignatarios:o.consignatarios,
        observaciones:null, status:'BORRADOR',
        items:items.map(it=>({sku:it.sku,descripcion:it.descripcion||'',cantidad:it.cantidad,serie:it.serie||null,paleta_pedido:it.pedido_pallet||null,encontrado:false}))
      });
      if(error){err++;msgs.push(`❌ ${o.gr}: error`);}else{ok++;msgs.push(`✓ ${o.gr} → Borrador`);}
    }
    document.getElementById('preview-nd').innerHTML='';
    document.getElementById('resultado-nd').innerHTML=`
      <div class="alert ${err===0?'alert-success':'alert-warning'}">
        <strong>${ok} orden${ok!==1?'es':''} creada${ok!==1?'s':''} en borrador</strong>${err>0?` · ${err} con error`:''}
      </div>
      <div style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;">${msgs.map(m=>`<div>${escapeHtml(m)}</div>`).join('')}</div>
      <div class="alert alert-info">Ve a <strong>Validar órdenes</strong> para aprobarlas antes de pickear.</div>
      <div class="btn-row">
        <button class="btn-primary" id="btn-ir-validar-nd">Ir a validar →</button>
        <button class="btn-ghost" id="btn-otra-carga-nd">Cargar otro</button>
      </div>`;
    document.getElementById('btn-ir-validar-nd')?.addEventListener('click',()=>Router.navigate('validar-ordenes'));
    document.getElementById('btn-otra-carga-nd')?.addEventListener('click',()=>Router.navigate('nuevo-despacho'));
  },

  // MANUAL
  _itemsM: [],
  _setupManual() {
    this._itemsM=[];
    document.getElementById('btn-add-item-m')?.addEventListener('click',()=>this._addItemM());
    document.getElementById('btn-crear-manual')?.addEventListener('click',()=>this._crearManual());
  },
  _addItemM() {
    const i=this._itemsM.length; this._itemsM.push({});
    const list=document.getElementById('items-manual-list');
    if (i===0) list.innerHTML='';
    const div=document.createElement('div'); div.className='recep-item'; div.id=`im-${i}`;
    div.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:11px;font-weight:700;color:var(--text-secondary);">ÍTEM ${i+1}</span>
        <button class="btn-text" style="color:var(--danger-text);font-size:12px;" onclick="document.getElementById('im-${i}').remove()">Quitar</button>
      </div>
      <div class="field-grid">
        <div class="field"><label>SKU</label><input id="im-sku-${i}" type="text" style="font-family:monospace;"></div>
        <div class="field"><label>Cantidad</label><input id="im-cant-${i}" type="number" value="1" min="1"></div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Serie</label><input id="im-serie-${i}" type="text" style="font-family:monospace;"></div>
        <div class="field"><label>Pedido / Paleta</label><input id="im-pp-${i}" type="text"></div>
      </div>
      <div class="field"><label>Descripción</label><input id="im-desc-${i}" type="text"></div>`;
    list.appendChild(div);
  },
  async _crearManual() {
    const gr=document.getElementById('m-gr')?.value.trim();
    const cliente=document.getElementById('m-cliente')?.value;
    const destino=document.getElementById('m-destino')?.value.trim();
    const razonSocial=document.getElementById('m-razon')?.value.trim();
    const contrata=document.getElementById('m-contrata')?.value.trim();
    const consignatarios=document.getElementById('m-consig')?.value.trim();
    const msg=document.getElementById('msg-manual');
    if (!gr){msg.innerHTML='<p class="msg-error">Ingresa el N° de GR.</p>';return;}
    if (!cliente){msg.innerHTML='<p class="msg-error">Selecciona el cliente.</p>';return;}
    const divs=document.querySelectorAll('[id^="im-"][id$="0"],[id^="im-"][id$="1"],[id^="im-"][id$="2"],[id^="im-"][id$="3"],[id^="im-"][id$="4"],[id^="im-"][id$="5"],[id^="im-"][id$="6"],[id^="im-"][id$="7"],[id^="im-"][id$="8"],[id^="im-"][id$="9"]');
    const allDivs=document.querySelectorAll('.recep-item[id^="im-"]');
    const items=[];
    allDivs.forEach(d=>{
      const id=d.id.replace('im-','');
      const sku=document.getElementById(`im-sku-${id}`)?.value.trim().toUpperCase();
      const cant=Number(document.getElementById(`im-cant-${id}`)?.value)||0;
      const serie=document.getElementById(`im-serie-${id}`)?.value.trim()||null;
      const pp=document.getElementById(`im-pp-${id}`)?.value.trim()||null;
      const desc=document.getElementById(`im-desc-${id}`)?.value.trim()||'';
      if(sku&&cant>0) items.push({sku,descripcion:desc,cantidad:cant,serie,paleta_pedido:pp,encontrado:false});
    });
    if (!items.length){msg.innerHTML='<p class="msg-error">Agrega al menos un ítem.</p>';return;}
    const btn=document.getElementById('btn-crear-manual');
    btn.disabled=true;btn.textContent='Creando…';
    const {error}=await crearDespacho({gr,fecha:new Date().toISOString().slice(0,10),cliente,destino,razonSocial,contrata,consignatarios,observaciones:null,status:'BORRADOR',items});
    if(error){msg.innerHTML='<p class="msg-error">Error al crear.</p>';btn.disabled=false;btn.textContent='Generar orden';return;}
    msg.innerHTML='<p class="msg-ok">✓ Orden creada en borrador.</p>';
    setTimeout(()=>Router.navigate('validar-ordenes'),1000);
  }
};
Router.register('nuevo-despacho', NuevoDespachoView);
