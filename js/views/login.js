// ============================================================
// LOGIN VIEW
// ============================================================
const LoginView = {
  render() {
    return `
      <div class="login-wrap">
        <div class="login-card">
          <div class="login-logo">▸ Fleet WMS</div>
          <p class="login-sub">Telrad — Control de almacén</p>
          <div class="field">
            <label>Correo electrónico</label>
            <input type="email" id="login-email" autocomplete="email" placeholder="tu@correo.com">
          </div>
          <div class="field">
            <label>Contraseña</label>
            <div style="position:relative;">
              <input type="password" id="login-pass" autocomplete="current-password" placeholder="••••••••">
              <button class="btn-icon" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;"
                onclick="const i=document.getElementById('login-pass');i.type=i.type==='password'?'text':'password';">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <div id="login-error" style="color:var(--danger-text);font-size:12px;margin-bottom:8px;display:none;"></div>
          <button class="btn-primary" id="btn-login" style="width:100%;padding:12px;font-size:15px;margin-top:4px;">
            Ingresar
          </button>
        </div>
      </div>
    `;
  },

  afterRender() {
    const btnLogin  = document.getElementById('btn-login');
    const emailInp  = document.getElementById('login-email');
    const passInp   = document.getElementById('login-pass');
    const errorDiv  = document.getElementById('login-error');

    const doLogin = async () => {
      const email = emailInp.value.trim();
      const pass  = passInp.value;
      if (!email || !pass) { errorDiv.textContent='Completa todos los campos.'; errorDiv.style.display=''; return; }
      btnLogin.disabled=true; btnLogin.textContent='Ingresando…';
      errorDiv.style.display='none';
      const { error } = await Auth.login(email, pass);
      if (error) {
        errorDiv.textContent = error.includes('Invalid') ? 'Correo o contraseña incorrectos.' : error;
        errorDiv.style.display='';
        btnLogin.disabled=false; btnLogin.textContent='Ingresar';
        return;
      }
      iniciarApp();
    };

    btnLogin.addEventListener('click', doLogin);
    [emailInp, passInp].forEach(el => el.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); }));
    emailInp.focus();
  }
};
