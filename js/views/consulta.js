// ============================================================
// VISTA: CONSULTAR STOCK
// ============================================================

const ConsultaView = {
  title: 'Consultar stock',
  _filtro: 'TODOS',
  _searchTimeout: null,

  render() {
    return `
      <div class="suggestions-wrap">
        <div class="search-bar">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="buscador" type="text" placeholder="SKU, serie, paleta o ubicación" autocomplete="off" />
          <svg id="btn-clear" class="clear-btn" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <div id="sugerencias" class="suggestions"></div>
      </div>

      <div class="chips">
        <button class="chip active" data-filtro="TODOS">Todos</button>
        <button class="chip" data-filtro="DISPONIBLE">Disponible</button>
        <button class="chip" data-filtro="DESPACHADO">Despachado</button>
        <button class="chip" data-filtro="ENTEL">Entel</button>
        <button class="chip" data-filtro="CLARO">Claro</button>
        <button class="chip" data-filtro="TELRAD">Telrad</button>
      </div>

      <p class="result-count" id="contador">Cargando...</p>
      <div id="resultados"></div>
    `;
  },

  afterRender() {
    this._filtro = 'TODOS';
    const buscador = document.getElementById('buscador');
    const btnClear = document.getElementById('btn-clear');

    buscador.addEventListener('input', () => {
      btnClear.style.display = buscador.value ? 'block' : 'none';
      clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(() => {
        this.cargarResultados();
        this.cargarSugerencias();
      }, 300);
    });

    buscador.addEventListener('focus', () => this.cargarSugerencias());

    btnClear.addEventListener('click', () => {
      buscador.value = '';
      btnClear.style.display = 'none';
      document.getElementById('sugerencias').style.display = 'none';
      this.cargarResultados();
    });

    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this._filtro = chip.dataset.filtro;
        this.cargarResultados();
      });
    });

    document.addEventListener('click', (e) => {
      const sug = document.getElementById('sugerencias');
      if (sug && !e.target.closest('.suggestions-wrap')) {
        sug.style.display = 'none';
      }
    });

    this.cargarResultados();
  },

  async cargarSugerencias() {
    const texto = document.getElementById('buscador').value.trim();
    const sugDiv = document.getElementById('sugerencias');

    if (!texto || texto.length < 2) {
      sugDiv.style.display = 'none';
      return;
    }

    const sugerencias = await obtenerSugerencias(texto);

    if (sugerencias.length === 0) {
      sugDiv.style.display = 'none';
      return;
    }

    sugDiv.innerHTML = sugerencias.map(s =>
      `<div class="suggestion-item" data-val="${escapeHtml(s.texto)}">${escapeHtml(s.texto)}<span class="suggestion-tag">${s.tag}</span></div>`
    ).join('');
    sugDiv.style.display = 'block';

    sugDiv.querySelectorAll('.suggestion-item').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('buscador').value = el.dataset.val;
        document.getElementById('btn-clear').style.display = 'block';
        sugDiv.style.display = 'none';
        this.cargarResultados();
      });
    });
  },

  async cargarResultados() {
    const texto = document.getElementById('buscador').value.trim();
    const cont = document.getElementById('resultados');
    const contador = document.getElementById('contador');

    cont.innerHTML = '<div class="loading">Buscando...</div>';

    const { data, error } = await buscarStock({ texto, filtro: this._filtro, limit: 50 });

    if (error) {
      cont.innerHTML = '<div class="empty-state">Error al conectar con la base de datos.</div>';
      contador.textContent = '';
      return;
    }

    if (!texto && this._filtro === 'TODOS') {
      const total = await contarStock();
      contador.textContent = `${total.toLocaleString('es-PE')} ítems en stock (mostrando primeros ${data.length})`;
    } else {
      contador.textContent = `${data.length} resultado${data.length === 1 ? '' : 's'}`;
    }

    if (data.length === 0) {
      cont.innerHTML = '<div class="empty-state">Sin resultados</div>';
      return;
    }

    cont.innerHTML = '<div style="display:flex; flex-direction:column; gap:8px;">' +
      data.map(item => this.renderCard(item)).join('') +
      '</div>';

    cont.querySelectorAll('.stock-card').forEach(card => {
      card.addEventListener('click', () => {
        const det = card.querySelector('.stock-detail');
        det.style.display = det.style.display === 'none' ? 'block' : 'none';
      });
    });
  },

  renderCard(item) {
    const pill = item.estado === 'DISPONIBLE'
      ? '<span class="pill pill-success">Disponible</span>'
      : item.estado === 'DESPACHADO'
        ? '<span class="pill pill-neutral">Despachado</span>'
        : `<span class="pill pill-warning">${escapeHtml(item.estado || '')}</span>`;

    return `
      <div class="stock-card" data-id="${item.id}">
        <div class="stock-card-top">
          <p class="stock-sku">${escapeHtml(item.sku || '')}</p>
          ${pill}
        </div>
        <p class="stock-desc">${escapeHtml(item.descripcion || '')}</p>
        <div class="stock-meta">
          <span><span class="meta-label">Cant:</span> <b>${formatNum(item.cantidad)} ${escapeHtml(item.unidad_medida || '')}</b></span>
          <span><span class="meta-label">Ubic:</span> <b>${escapeHtml(item.ubicacion_fisica || '-')}</b></span>
          <span><span class="meta-label">Paleta/Ped:</span> <b>${escapeHtml(item.paleta_pedido || '-')}</b></span>
        </div>
        <div class="stock-detail">
          <div class="detail-row"><span class="label">Descripción</span></div>
          <p style="font-size:12px; margin:4px 0 8px;">${escapeHtml(item.descripcion || '')}</p>
          <div class="detail-row"><span class="label">Serie</span><span class="value">${escapeHtml(item.serie || 'Sin serie')}</span></div>
          <div class="detail-row"><span class="label">Cliente</span><span class="value">${escapeHtml(item.cliente || '-')}</span></div>
          <div class="detail-row"><span class="label">Tipo</span><span class="value">${escapeHtml(item.tipo || '-')}</span></div>
          <div class="detail-row"><span class="label">Fecha ingreso</span><span class="value">${escapeHtml(item.fecha_ingreso || '-')}</span></div>
          <div class="detail-row"><span class="label">GR ingreso</span><span class="value">${escapeHtml(item.gr_ingreso || '-')}</span></div>
        </div>
      </div>
    `;
  }
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatNum(n) {
  if (n === null || n === undefined) return '0';
  const num = Number(n);
  return num % 1 === 0 ? num.toLocaleString('es-PE') : num.toLocaleString('es-PE', { maximumFractionDigits: 2 });
}

Router.register('consulta', ConsultaView);
