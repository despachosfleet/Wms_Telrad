// ============================================================
// VISTA: CONSULTAR STOCK (tabla densa, ordenable)
// ============================================================

const ConsultaView = {
  title: 'Consultar stock',
  _filtro: 'TODOS',
  _campo: 'todo',
  _orden: 'id',
  _dir: 'asc',
  _searchTimeout: null,
  _filaAbierta: null,

  render() {
    return `
      <div class="toolbar">
        <select class="field-select" id="sel-campo">
          <option value="todo">Buscar en: Todo</option>
          <option value="sku">SKU</option>
          <option value="serie">Serie</option>
          <option value="paleta">Paleta/Pedido</option>
          <option value="ubicacion">Ubicación</option>
          <option value="descripcion">Descripción</option>
        </select>
        <div class="suggestions-wrap">
          <input class="search-input" id="buscador" type="text" placeholder="Escribe para buscar..." autocomplete="off" />
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
      </div>

      <p class="result-count" id="contador">Cargando...</p>
      <div id="resultados"></div>
    `;
  },

  afterRender() {
    this._filtro = 'TODOS';
    this._campo = 'todo';
    this._orden = 'id';
    this._dir = 'asc';
    this._filaAbierta = null;

    const buscador = document.getElementById('buscador');
    const selCampo = document.getElementById('sel-campo');

    buscador.addEventListener('input', () => {
      clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(() => {
        this.cargarResultados();
        this.cargarSugerencias();
      }, 300);
    });

    buscador.addEventListener('focus', () => this.cargarSugerencias());

    selCampo.addEventListener('change', () => {
      this._campo = selCampo.value;
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

    const { data, error } = await buscarStock({
      texto, campo: this._campo, filtro: this._filtro,
      orden: this._orden, dir: this._dir, limit: 100
    });

    if (error) {
      cont.innerHTML = '<div class="empty-state">Error al conectar con la base de datos.</div>';
      contador.textContent = '';
      return;
    }

    if (!texto && this._filtro === 'TODOS') {
      const total = await contarStock();
      contador.textContent = `${total.toLocaleString('es-PE')} ítems en stock — mostrando primeros ${data.length}`;
    } else {
      contador.textContent = `${data.length} resultado${data.length === 1 ? '' : 's'}`;
    }

    this._datos = data;

    if (data.length === 0) {
      cont.innerHTML = '<div class="empty-state">Sin resultados</div>';
      return;
    }

    this.renderTabla();
  },

  renderTabla() {
    const cont = document.getElementById('resultados');
    const data = this._datos;

    const cols = [
      { key: 'sku', label: 'SKU' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'cantidad', label: 'Cant.' },
      { key: 'ubicacion_fisica', label: 'Ubicación' },
      { key: 'paleta_pedido', label: 'Paleta/Ped' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'estado', label: 'Estado' }
    ];

    const arrow = (key) => {
      if (this._orden !== key) return '';
      return `<span class="sort-arrow">${this._dir === 'asc' ? '▲' : '▼'}</span>`;
    };

    let html = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              ${cols.map(c => `<th data-col="${c.key}">${c.label}${arrow(c.key)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach((item, i) => {
      const pill = item.estado === 'DISPONIBLE'
        ? '<span class="pill pill-success">Disponible</span>'
        : item.estado === 'DESPACHADO'
          ? '<span class="pill pill-neutral">Despachado</span>'
          : `<span class="pill pill-warning">${escapeHtml(item.estado || '')}</span>`;

      html += `
        <tr data-idx="${i}">
          <td class="sku-cell">${escapeHtml(item.sku || '')}</td>
          <td class="wrap">${escapeHtml((item.descripcion || '').slice(0, 70))}</td>
          <td class="num-cell">${formatNum(item.cantidad)} ${escapeHtml(item.unidad_medida || '')}</td>
          <td>${escapeHtml(item.ubicacion_fisica || '-')}</td>
          <td>${escapeHtml(item.paleta_pedido || '-')}</td>
          <td>${escapeHtml(item.cliente || '-')}</td>
          <td>${pill}</td>
        </tr>
        <tr class="detail-row-tr" data-detail-for="${i}" style="display:none;">
          <td colspan="7" style="padding:0;">
            <div class="row-detail-panel">
              <div class="row-detail-grid">
                <div><div class="item-label">Serie</div><div class="item-value">${escapeHtml(item.serie || 'Sin serie')}</div></div>
                <div><div class="item-label">Tipo</div><div class="item-value">${escapeHtml(item.tipo || '-')}</div></div>
                <div><div class="item-label">Fecha ingreso</div><div class="item-value">${escapeHtml(item.fecha_ingreso || '-')}</div></div>
                <div><div class="item-label">GR ingreso</div><div class="item-value">${escapeHtml(item.gr_ingreso || '-')}</div></div>
              </div>
              <div style="margin-top:8px;"><div class="item-label">Descripción completa</div><div class="item-value">${escapeHtml(item.descripcion || '')}</div></div>
            </div>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    cont.innerHTML = html;

    cont.querySelectorAll('thead th').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (this._orden === col) {
          this._dir = this._dir === 'asc' ? 'desc' : 'asc';
        } else {
          this._orden = col;
          this._dir = 'asc';
        }
        this.cargarResultados();
      });
    });

    cont.querySelectorAll('tbody tr[data-idx]').forEach(tr => {
      tr.addEventListener('click', () => {
        const idx = tr.dataset.idx;
        const detailTr = cont.querySelector(`tr[data-detail-for="${idx}"]`);
        const isOpen = detailTr.style.display !== 'none';
        cont.querySelectorAll('.detail-row-tr').forEach(d => d.style.display = 'none');
        detailTr.style.display = isOpen ? 'none' : '';
      });
    });
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
