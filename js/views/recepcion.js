// ============================================================
// VISTA: RECEPCION / INGRESO NUEVO
// ============================================================

const RecepcionView = {
  title: 'Recepción',

  render() {
    return `
      <div class="card">
        <p class="card-title">Registrar ingreso</p>
        <div class="field-grid">
          <div class="field" style="grid-column: span 2;">
            <label>SKU *</label>
            <input type="text" id="r-sku" placeholder="Código del material" />
          </div>
          <div class="field" style="grid-column: span 2;">
            <label>Descripción</label>
            <input type="text" id="r-descripcion" placeholder="Descripción del producto" />
          </div>
          <div class="field">
            <label>Cantidad *</label>
            <input type="number" id="r-cantidad" placeholder="0" min="0" step="any" />
          </div>
          <div class="field">
            <label>Unidad</label>
            <select id="r-unidad">
              <option value="UND">UND</option>
              <option value="METROS">METROS</option>
              <option value="CORTE">CORTE</option>
            </select>
          </div>
          <div class="field" style="grid-column: span 2;">
            <label>Serie</label>
            <input type="text" id="r-serie" placeholder="Opcional" />
          </div>
          <div class="field">
            <label>Cliente</label>
            <select id="r-cliente">
              <option value="">Seleccionar</option>
              <option value="ENTEL">ENTEL</option>
              <option value="CLARO">CLARO</option>
              <option value="TELRAD">TELRAD</option>
              <option value="AMERICATEL">AMERICATEL</option>
            </select>
          </div>
          <div class="field">
            <label>N° Pedido</label>
            <input type="text" id="r-pedido" placeholder="Ej: 13527842" />
          </div>
          <div class="field">
            <label>GR de ingreso</label>
            <input type="text" id="r-gr" placeholder="Opcional" />
          </div>
          <div class="field">
            <label>Fecha</label>
            <input type="date" id="r-fecha" />
          </div>
        </div>
      </div>

      <div class="hint-box">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>Este ítem se registra como ingreso nuevo, sin ubicación física asignada. Podrás asignarla luego desde Movimientos.</p>
      </div>

      <button class="btn-primary" id="btn-guardar-ingreso">Registrar ingreso</button>
      <div id="msg-ingreso"></div>
    `;
  },

  afterRender() {
    document.getElementById('r-fecha').value = new Date().toISOString().slice(0, 10);
    document.getElementById('btn-guardar-ingreso').addEventListener('click', () => this.guardar());
  },

  async guardar() {
    const btn = document.getElementById('btn-guardar-ingreso');
    const msg = document.getElementById('msg-ingreso');

    const sku = document.getElementById('r-sku').value.trim();
    const cantidad = Number(document.getElementById('r-cantidad').value);
    const descripcion = document.getElementById('r-descripcion').value.trim();
    const serie = document.getElementById('r-serie').value.trim();
    const unidad_medida = document.getElementById('r-unidad').value;
    const cliente = document.getElementById('r-cliente').value;
    const paleta_pedido = document.getElementById('r-pedido').value.trim();
    const gr_ingreso = document.getElementById('r-gr').value.trim();
    const fecha_ingreso = document.getElementById('r-fecha').value;

    if (!sku || !cantidad || cantidad <= 0) {
      msg.innerHTML = '<p style="color:var(--danger-text); font-size:12px; margin:8px 0 0;">Completa al menos SKU y cantidad.</p>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Registrando...';

    const { error } = await registrarIngreso({
      sku, descripcion, serie, cantidad, unidad_medida,
      paleta_pedido, cliente, gr_ingreso, fecha_ingreso
    });

    btn.disabled = false;
    btn.textContent = 'Registrar ingreso';

    if (error) {
      msg.innerHTML = '<p style="color:var(--danger-text); font-size:12px; margin:8px 0 0;">Error al registrar. Intenta de nuevo.</p>';
      return;
    }

    msg.innerHTML = '<p style="color:var(--success-text); font-size:12px; margin:8px 0 0;">Ingreso registrado correctamente.</p>';

    // Limpiar formulario
    ['r-sku','r-descripcion','r-cantidad','r-serie','r-pedido','r-gr'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('r-cliente').value = '';
    document.getElementById('r-unidad').value = 'UND';
  }
};

Router.register('recepcion', RecepcionView);
