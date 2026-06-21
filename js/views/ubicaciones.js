// ============================================================
// VISTA: GESTION DE UBICACIONES
// Ver usadas/vacias, filtrar por zona, crear nuevas ubicaciones
// o sub-ubicaciones sin depender de Claude.
// ============================================================

const UbicacionesView = {
  title: 'Ubicaciones',
  _todas: [],
  _filtroZona: 'TODAS',
  _filtroEstado: 'TODAS',

  render() {
    return `
      <div class="card">
        <p class="card-title">Crear nueva ubicación</p>
        <div class="field-grid">
          <div class="field">
            <label>Zona</label>
            <input type="text" id="nu-zona" maxlength="2" style="text-transform:uppercase;" />
          </div>
          <div class="field"><label>Pasillo</label><input type="text" id="nu-pasillo" value="01" /></div>
          <div class="field"><label>Posición</label><input type="text" id="nu-posicion" /></div>
          <div class="field"><label>Sub-posición (solo zona A)</label><input type="text" id="nu-sub" /></div>
        </div>
        <button class="btn-primary" id="btn-crear-ubicacion" style="width:auto; padding:8px 16px; margin-top:10px;">Crear ubicación</button>
        <div id="msg-crear-ubic"></div>
      </div>

      <div class="card">
        <div class="chips" id="chips-zona-ubic"></div>
        <div class="chips" id="chips-estado-ubic" style="margin-top:8px;"></div>
      </div>

      <div id="resumen-ubic"></div>
      <div id="lista-ubic-cont"></div>
    `;
  },

  afterRender() {
    document.getElementById('btn-crear-ubicacion').addEventListener('click', () => this.crearUbicacionNueva());
    this.cargarYRender();
  },

  renderChips() {
    const zonasExistentes = [...new Set(this._todas.map(u => u.zona))].sort();
    const zonas = ['TODAS', ...zonasExistentes];
    document.getElementById('chips-zona-ubic').innerHTML = zonas.map(z => `
      <button class="chip ${this._filtroZona === z ? 'active' : ''}" data-zona="${z}">${z === 'TODAS' ? 'Todas las zonas' : 'Zona ' + z}</button>
    `).join('');

    const estados = [
      { v: 'TODAS', l: 'Todas' },
      { v: 'USADAS', l: 'Usadas' },
      { v: 'VACIAS', l: 'Vacías' }
    ];
    document.getElementById('chips-estado-ubic').innerHTML = estados.map(e => `
      <button class="chip ${this._filtroEstado === e.v ? 'active' : ''}" data-estado-ubic="${e.v}">${e.l}</button>
    `).join('');

    document.querySelectorAll('[data-zona]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._filtroZona = btn.dataset.zona;
        this.renderChips();
        this.renderLista();
      });
    });
    document.querySelectorAll('[data-estado-ubic]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._filtroEstado = btn.dataset.estadoUbic;
        this.renderChips();
        this.renderLista();
      });
    });
  },

  async cargarYRender() {
    const cont = document.getElementById('lista-ubic-cont');
    cont.innerHTML = `<div class="empty-state">Cargando ubicaciones...</div>`;
    this._todas = await obtenerTodasLasUbicaciones();
    this.renderChips();
    this.renderLista();
  },

  renderLista() {
    const resumenEl = document.getElementById('resumen-ubic');
    const cont = document.getElementById('lista-ubic-cont');

    let lista = this._todas;
    if (this._filtroZona !== 'TODAS') lista = lista.filter(u => u.zona === this._filtroZona);

    const usadas = lista.filter(u => (u.paletas_ubicacion || []).length > 0).length;
    const vacias = lista.length - usadas;
    resumenEl.innerHTML = `
      <div class="card" style="display:flex; gap:20px;">
        <div><div class="item-label">Total</div><div class="item-value" style="font-size:18px;">${lista.length}</div></div>
        <div><div class="item-label">Usadas</div><div class="item-value" style="font-size:18px; color:var(--success-text);">${usadas}</div></div>
        <div><div class="item-label">Vacías</div><div class="item-value" style="font-size:18px; color:var(--text-tertiary);">${vacias}</div></div>
      </div>
    `;

    if (this._filtroEstado === 'USADAS') lista = lista.filter(u => (u.paletas_ubicacion || []).length > 0);
    if (this._filtroEstado === 'VACIAS') lista = lista.filter(u => (u.paletas_ubicacion || []).length === 0);

    if (lista.length === 0) {
      cont.innerHTML = `<div class="empty-state">No hay ubicaciones con estos filtros.</div>`;
      return;
    }

    cont.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Código</th><th>Zona</th><th>Paletas asignadas</th><th></th></tr></thead>
          <tbody>
            ${lista.map(u => {
              const paletas = (u.paletas_ubicacion || []).map(p => p.paleta);
              return `
                <tr>
                  <td class="sku-cell">${escapeHtml(u.codigo)}</td>
                  <td>${escapeHtml(u.zona)}</td>
                  <td class="wrap">${paletas.length > 0 ? escapeHtml(paletas.join(', ')) : '<span style="color:var(--text-tertiary);">Vacía</span>'}</td>
                  <td>${paletas.length === 0 ? `<button class="btn-text" data-eliminar-ubic="${u.id}">Eliminar</button>` : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    cont.querySelectorAll('[data-eliminar-ubic]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta ubicación vacía?')) return;
        await eliminarUbicacion(Number(btn.dataset.eliminarUbic));
        await this.cargarYRender();
      });
    });
  },

  async crearUbicacionNueva() {
    const zona = document.getElementById('nu-zona').value.trim().toUpperCase();
    const pasillo = document.getElementById('nu-pasillo').value.trim() || '01';
    const posicion = document.getElementById('nu-posicion').value.trim();
    const sub = document.getElementById('nu-sub').value.trim();
    const msg = document.getElementById('msg-crear-ubic');

    if (!posicion) {
      msg.innerHTML = `<p style="font-size:11px; color:var(--danger-text); margin:6px 0 0;">Ingresa la posición.</p>`;
      return;
    }

    const { data, error } = await crearUbicacion({ zona, pasillo, posicion, subPosicion: sub || null });

    if (error) {
      msg.innerHTML = `<p style="font-size:11px; color:var(--danger-text); margin:6px 0 0;">Error: ¿ya existe esa ubicación?</p>`;
      return;
    }

    msg.innerHTML = `<p style="font-size:11px; color:var(--success-text); margin:6px 0 0;">Ubicación ${escapeHtml(data.codigo)} creada.</p>`;
    document.getElementById('nu-posicion').value = '';
    document.getElementById('nu-sub').value = '';
    await this.cargarYRender();
  }
};

Router.register('ubicaciones', UbicacionesView);
