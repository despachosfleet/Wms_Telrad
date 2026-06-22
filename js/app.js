// ============================================================
// APP ENTRY POINT + CONFIGURACIÓN DE TEMA
// ============================================================

// Aplicar configuración guardada antes de renderizar
(function initTheme() {
  const cfg = JSON.parse(localStorage.getItem('wms_config') || '{}');
  const el = document.documentElement;
  if (cfg.theme)   el.setAttribute('data-theme', cfg.theme);
  if (cfg.accent)  el.setAttribute('data-accent', cfg.accent);
  if (cfg.font)    el.setAttribute('data-font', cfg.font);
  if (cfg.density) el.setAttribute('data-density', cfg.density);
})();

function getConfig() {
  return JSON.parse(localStorage.getItem('wms_config') || '{}');
}

function setConfig(key, value) {
  const cfg = getConfig();
  cfg[key] = value;
  localStorage.setItem('wms_config', JSON.stringify(cfg));
  const el = document.documentElement;
  if (key === 'theme')   el.setAttribute('data-theme',   value);
  if (key === 'accent')  el.setAttribute('data-accent',  value);
  if (key === 'font')    el.setAttribute('data-font',    value);
  if (key === 'density') el.setAttribute('data-density', value);
  renderConfigPanel();
}

function toggleConfigPanel() {
  const p = document.getElementById('config-panel');
  if (p) p.classList.toggle('open');
}

function renderConfigPanel() {
  const panel = document.getElementById('config-panel');
  if (!panel) return;
  const cfg = getConfig();

  panel.innerHTML = `
    <div class="config-title">⚙ Apariencia</div>

    <div class="config-group">
      <label>Modo</label>
      <div class="config-chips">
        <button class="config-chip ${!cfg.theme || cfg.theme === 'light' ? 'active' : ''}" onclick="setConfig('theme','light')">☀ Claro</button>
        <button class="config-chip ${cfg.theme === 'dark' ? 'active' : ''}" onclick="setConfig('theme','dark')">🌙 Oscuro</button>
      </div>
    </div>

    <div class="config-group">
      <label>Color de acento</label>
      <div class="config-chips">
        <button class="config-chip ${!cfg.accent || cfg.accent === 'blue' ? 'active' : ''}" onclick="setConfig('accent','blue')">
          <span class="color-dot" style="background:#2563eb;"></span>Azul
        </button>
        <button class="config-chip ${cfg.accent === 'green' ? 'active' : ''}" onclick="setConfig('accent','green')">
          <span class="color-dot" style="background:#16a34a;"></span>Verde
        </button>
        <button class="config-chip ${cfg.accent === 'orange' ? 'active' : ''}" onclick="setConfig('accent','orange')">
          <span class="color-dot" style="background:#ea580c;"></span>Naranja
        </button>
      </div>
    </div>

    <div class="config-group">
      <label>Tamaño de texto</label>
      <div class="config-chips">
        <button class="config-chip ${cfg.font === 'sm' ? 'active' : ''}" onclick="setConfig('font','sm')">Pequeño</button>
        <button class="config-chip ${!cfg.font || cfg.font === 'md' ? 'active' : ''}" onclick="setConfig('font','md')">Normal</button>
        <button class="config-chip ${cfg.font === 'lg' ? 'active' : ''}" onclick="setConfig('font','lg')">Grande</button>
      </div>
    </div>

    <div class="config-group">
      <label>Densidad de tablas</label>
      <div class="config-chips">
        <button class="config-chip ${cfg.density === 'compact' ? 'active' : ''}" onclick="setConfig('density','compact')">Compacta</button>
        <button class="config-chip ${!cfg.density || cfg.density === 'normal' ? 'active' : ''}" onclick="setConfig('density','normal')">Normal</button>
        <button class="config-chip ${cfg.density === 'comfortable' ? 'active' : ''}" onclick="setConfig('density','comfortable')">Cómoda</button>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  renderConfigPanel();
  // Cerrar config al hacer click fuera
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('config-panel');
    const btn = document.getElementById('btn-config');
    if (panel && !panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
      panel.classList.remove('open');
    }
  });
  Router.navigate('menu');
});
