// ============================================================
// APP ENTRY POINT
// ============================================================

(function initTheme() {
  const cfg = JSON.parse(localStorage.getItem('wms_config') || '{}');
  const el = document.documentElement;
  if (cfg.theme)   el.setAttribute('data-theme',   cfg.theme);
  if (cfg.accent)  el.setAttribute('data-accent',  cfg.accent);
  if (cfg.font)    el.setAttribute('data-font',     cfg.font);
  if (cfg.density) el.setAttribute('data-density',  cfg.density);
})();

function getConfig() { return JSON.parse(localStorage.getItem('wms_config') || '{}'); }
function setConfig(key, value) {
  const cfg = getConfig(); cfg[key] = value;
  localStorage.setItem('wms_config', JSON.stringify(cfg));
  const el = document.documentElement;
  if (key === 'theme')   el.setAttribute('data-theme',   value);
  if (key === 'accent')  el.setAttribute('data-accent',  value);
  if (key === 'font')    el.setAttribute('data-font',     value);
  if (key === 'density') el.setAttribute('data-density',  value);
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
        <button class="config-chip ${!cfg.theme||cfg.theme==='light'?'active':''}" onclick="setConfig('theme','light')">☀ Claro</button>
        <button class="config-chip ${cfg.theme==='dark'?'active':''}" onclick="setConfig('theme','dark')">🌙 Oscuro</button>
      </div>
    </div>
    <div class="config-group">
      <label>Color de acento</label>
      <div class="config-chips">
        <button class="config-chip ${!cfg.accent||cfg.accent==='blue'?'active':''}" onclick="setConfig('accent','blue')"><span class="color-dot" style="background:#2563eb;"></span>Azul</button>
        <button class="config-chip ${cfg.accent==='green'?'active':''}" onclick="setConfig('accent','green')"><span class="color-dot" style="background:#16a34a;"></span>Verde</button>
        <button class="config-chip ${cfg.accent==='orange'?'active':''}" onclick="setConfig('accent','orange')"><span class="color-dot" style="background:#ea580c;"></span>Naranja</button>
      </div>
    </div>
    <div class="config-group">
      <label>Tamaño de texto</label>
      <div class="config-chips">
        <button class="config-chip ${cfg.font==='sm'?'active':''}" onclick="setConfig('font','sm')">Pequeño</button>
        <button class="config-chip ${!cfg.font||cfg.font==='md'?'active':''}" onclick="setConfig('font','md')">Normal</button>
        <button class="config-chip ${cfg.font==='lg'?'active':''}" onclick="setConfig('font','lg')">Grande</button>
      </div>
    </div>
    <div class="config-group">
      <label>Densidad</label>
      <div class="config-chips">
        <button class="config-chip ${cfg.density==='compact'?'active':''}" onclick="setConfig('density','compact')">Compacta</button>
        <button class="config-chip ${!cfg.density||cfg.density==='normal'?'active':''}" onclick="setConfig('density','normal')">Normal</button>
        <button class="config-chip ${cfg.density==='comfortable'?'active':''}" onclick="setConfig('density','comfortable')">Cómoda</button>
      </div>
    </div>
    <div class="config-group" style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px;">
      <button class="btn-ghost" style="width:100%;font-size:12px;" onclick="Auth.logout()">
        Cerrar sesión (${escapeHtml(Auth.email())})
      </button>
    </div>
  `;
}

// Detectar móvil
function esMobil() { return window.innerWidth < 640; }

// Iniciar app tras login exitoso
function iniciarApp() {
  document.getElementById('app-login').style.display = 'none';
  document.getElementById('app').style.display = '';
  renderConfigPanel();
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('config-panel');
    const btn   = document.getElementById('btn-config');
    if (panel && !panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  // Sobrescribir navigate con permisos + control de UI móvil
  const _navBase = Router.navigate.bind(Router);
  Router.navigate = function(name, params = {}) {
    if (!Auth.puedeAcceder(name)) { console.warn('Acceso denegado:', name); return; }
    const header  = document.querySelector('.header');
    const nav     = document.getElementById('module-nav');
    const tabBar  = document.getElementById('tab-bar');
    if (esMobil() && name === 'menu-mobile') {
      // En menú móvil: ocultar TODO el header del sistema
      if (header)  header.style.display  = 'none';
      if (nav)     nav.style.display     = 'none';
      if (tabBar)  tabBar.style.display  = 'none';
      document.body.classList.add('is-mobile-menu');
      // Quitar padding-top que deja el header fijo
      document.getElementById('main-content').style.paddingTop = '0';
    } else {
      // En cualquier otro módulo: mostrar header normal
      if (header)  header.style.display  = '';
      if (nav)     nav.style.display     = '';
      document.body.classList.remove('is-mobile-menu');
      document.getElementById('main-content').style.paddingTop = '';
    }
    _navBase(name, params);
  };

  // En móvil ir al menú móvil, en PC al menú normal
  if (esMobil()) {
    Router.navigate('menu-mobile');
    // Interceptar botón atrás del navegador en móvil
    window.addEventListener('popstate', () => {
      if (esMobil()) Router.navigate('menu-mobile');
    });
  } else {
    Router.navigate('menu');
  }
}

// Mostrar login
function mostrarLogin() {
  document.getElementById('app-login').style.display = '';
  document.getElementById('app').style.display = 'none';
  const root = document.getElementById('login-root');
  root.innerHTML = LoginView.render();
  LoginView.afterRender();
}

document.addEventListener('DOMContentLoaded', async () => {
  renderConfigPanel();
  const haySession = await Auth.init();
  if (haySession) {
    iniciarApp();
  } else {
    mostrarLogin();
  }
});
