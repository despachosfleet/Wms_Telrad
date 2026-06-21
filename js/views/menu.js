}
 
document.addEventListener('click', () => cerrarDropdownModulos());
 
// Llamar esto desde cualquier vista al navegar, para que la barra
// resalte el modulo correcto aunque no se haya pasado por "menu"
function sincronizarModuloActivo(vistaActual) {
  if (VISTA_A_MODULO[vistaActual]) {
    _moduloActivo = VISTA_A_MODULO[vistaActual];
  }
  cerrarDropdownModulos();
  renderBarraModulos();
}
 
const MenuView = {
  title: 'Almacén Fleet — WMS',
 
  render() {
    return `
      <div class="welcome-screen">
        <p class="welcome-text">Selecciona un módulo arriba para empezar.</p>
      </div>
    `;
  },
 
  afterRender() {
    renderBarraModulos();
  }
};
 
Router.register('menu', MenuView);
