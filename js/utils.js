// ============================================================
// UTILIDADES GLOBALES — cargadas PRIMERO, disponibles en todos
// los módulos. NUNCA duplicar estas funciones en otras vistas.
// ============================================================

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
  if (isNaN(num)) return '0';
  return num % 1 === 0
    ? num.toLocaleString('es-PE')
    : num.toLocaleString('es-PE', { maximumFractionDigits: 2 });
}

function formatFecha(str) {
  if (!str) return '-';
  try {
    // Si es solo fecha (YYYY-MM-DD), parsear directamente sin timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return `${d}/${m}/${y}`;
    }
    // Si tiene hora, usar fecha local
    const d = new Date(str);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return str; }
}

function formatFechaHora(str) {
  if (!str) return '-';
  try {
    const d = new Date(str);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return str; }
}

// Pill de estado de despacho
function pillEstado(estado) {
  const map = {
    'PICKEADO':  ['pill-success',  'Pickeado'],
    'DESPACHADO':['pill-neutral',  'Despachado'],
    'EN_PROCESO':['pill-warning',  'En proceso'],
    'PENDIENTE': ['pill-pendiente','Pendiente'],
  };
  const [cls, label] = map[estado] || ['pill-neutral', estado || '-'];
  return `<span class="pill ${cls}">${label}</span>`;
}

// Pill de tipo de stock
function pillTipo(tipo) {
  if (!tipo) return '';
  if (tipo === 'SERIADO')   return `<span class="pill pill-info">Seriado</span>`;
  if (tipo === 'CABLE')     return `<span class="pill pill-warning">Cable</span>`;
  if (tipo === 'LOTIZADO')  return `<span class="pill pill-neutral">Lotizado</span>`;
  return `<span class="pill pill-neutral">${escapeHtml(tipo)}</span>`;
}
