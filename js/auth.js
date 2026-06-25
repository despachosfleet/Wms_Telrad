// ============================================================
// AUTH — Supabase Auth + gestión de sesión y roles
// ============================================================

const Auth = {
  _usuario: null,
  _perfil:  null,

  async init() {
    // Verificar sesión activa
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      await this._cargarPerfil(session.user);
      return true;
    }
    return false;
  },

  async login(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    await this._cargarPerfil(data.user);
    return { ok: true };
  },

  async logout() {
    await sb.auth.signOut();
    this._usuario = null;
    this._perfil  = null;
    document.body.classList.remove('is-mobile-menu');
    // Resetear el login completamente
    const root = document.getElementById('login-root');
    if (root) {
      root.innerHTML = LoginView.render();
      LoginView.afterRender();
    }
    document.getElementById('app-login').style.display = '';
    document.getElementById('app').style.display = 'none';
  },

  async _cargarPerfil(user) {
    this._usuario = user;
    // Reintentar hasta 3 veces por si hay delay en RLS
    for (let i = 0; i < 3; i++) {
      const { data, error } = await sb.from('perfiles').select('*').eq('id', user.id).single();
      if (data) { this._perfil = data; return; }
      if (i < 2) await new Promise(r => setTimeout(r, 500));
    }
    // Si no hay perfil, crear uno básico desde los metadatos del usuario
    console.warn('No se encontró perfil, usando metadatos del usuario');
    this._perfil = {
      id:    user.id,
      email: user.email,
      nombre: user.user_metadata?.nombre || user.email,
      rol:   user.user_metadata?.rol || 'admin', // default admin si no hay perfil
      activo: true
    };
  },

  esAdmin()    { return !this._perfil || this._perfil?.rol === 'admin'; },
  esOperario() { return this._perfil?.rol === 'operario'; },
  nombre()     { return this._perfil?.nombre || this._usuario?.email || 'Usuario'; },
  email()      { return this._usuario?.email || ''; },

  // Módulos permitidos por rol
  modulosPermitidos() {
    if (this.esAdmin()) return null; // null = todos
    return ['picking-lista', 'picking', 'picking-detalle', 'recepcion',
            'consulta', 'movimientos', 'despachos-salidas', 'menu'];
  },

  puedeAcceder(modulo) {
    const permitidos = this.modulosPermitidos();
    if (!permitidos) return true;
    return permitidos.includes(modulo);
  },

  // Crear usuario nuevo (solo admin)
  async crearUsuario(email, password, nombre, rol) {
    const { data, error } = await sb.auth.admin.createUser({
      email, password,
      user_metadata: { nombre, rol },
      email_confirm: true,
    });
    if (error) return { error: error.message };
    return { ok: true, id: data.user.id };
  },

  async obtenerUsuarios() {
    const { data, error } = await sb.from('perfiles').select('*').order('creado_en');
    return data || [];
  },

  async actualizarRol(userId, rol) {
    const { error } = await sb.from('perfiles').update({ rol }).eq('id', userId);
    return { error };
  },

  async toggleActivo(userId, activo) {
    const { error } = await sb.from('perfiles').update({ activo }).eq('id', userId);
    return { error };
  },

  _mostrarLogin() {
    document.getElementById('app-login').style.display = '';
    document.getElementById('app').style.display       = 'none';
  },

  _ocultarLogin() {
    document.getElementById('app-login').style.display = 'none';
    document.getElementById('app').style.display       = '';
  },
};
