// ============================================================
// EXCEL MATCHER — Cadena de suministro
// Lee el Excel de programación y extrae TODAS las órdenes
// agrupadas por GR. Soporta formato tabla plana (hoja Despacho)
// y formato de hoja por destino (formato antiguo).
// ============================================================

let _xlsxLoaded = false;
async function cargarXlsx() {
  if (_xlsxLoaded) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => { _xlsxLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const COL_MAP = {
  'CLIENTE': 'cliente',
  'PEDIDO/PALLET': 'pedido_pallet',
  'GR DE INGRESO': 'gr',
  'SKU': 'sku',
  'DESCRIPCION': 'descripcion',
  'CANTIDAD': 'cantidad',
  'SERIE': 'serie',
  'RAZON SOCIAL': 'razon_social',
  'AGENCIA': 'agencia',
  'PROVINCIA DE ENVIO': 'destino',
  'CONSIGANDO 1': 'consignatario_1',
  'CONSIGANDO 2': 'consignatario_2',
};

function norm(v) { return String(v ?? '').trim().toUpperCase().replace(/\s+/g, ' '); }

function detectarCols(fila) {
  const m = {};
  fila.forEach((c, i) => {
    const campo = COL_MAP[norm(c)];
    if (campo) m[campo] = i;
  });
  return m;
}

// Extrae TODAS las órdenes del Excel agrupadas por GR.
// Devuelve: Map<gr, { gr, cliente, destino, razon_social, consignatarios, items[] }>
async function extraerTodasLasOrdenes(file) {
  await cargarXlsx();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  // Preferir hoja "Despacho", si no recorrer todas
  const hojas = wb.SheetNames.includes('Despacho')
    ? ['Despacho', ...wb.SheetNames.filter(n => n !== 'Despacho' && n !== 'Resumen')]
    : wb.SheetNames.filter(n => n !== 'Resumen');

  const ordenes = new Map(); // gr -> orden

  for (const nombre of hojas) {
    const ws = wb.Sheets[nombre];
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!filas || filas.length < 2) continue;

    // Detectar fila de encabezados
    let colMap = null;
    let filaInicio = 0;
    for (let f = 0; f < Math.min(filas.length, 5); f++) {
      const m = detectarCols(filas[f]);
      if (m.gr && m.sku) { colMap = m; filaInicio = f + 1; break; }
    }
    if (!colMap) continue;

    // Leer filas de datos
    for (let f = filaInicio; f < filas.length; f++) {
      const row = filas[f];
      const gr = norm(row[colMap.gr]);
      const sku = norm(row[colMap.sku]);
      if (!gr || !sku) continue;

      if (!ordenes.has(gr)) {
        ordenes.set(gr, {
          gr,
          cliente: String(row[colMap.cliente] ?? '').trim(),
          destino: String(row[colMap.destino] ?? '').trim(),
          razon_social: String(row[colMap.razon_social] ?? '').trim(),
          agencia: String(row[colMap.agencia] ?? '').trim(),
          consignatarios: [
            String(row[colMap.consignatario_1] ?? '').trim(),
            String(row[colMap.consignatario_2] ?? '').trim(),
          ].filter(Boolean).join(' | '),
          items: []
        });
      }

      const cant = Number(row[colMap.cantidad]) || 0;
      if (cant <= 0) continue;

      ordenes.get(gr).items.push({
        sku,
        descripcion: String(row[colMap.descripcion] ?? '').trim(),
        cantidad: cant,
        serie: String(row[colMap.serie] ?? '').trim() || null,
        pedido_pallet: String(row[colMap.pedido_pallet] ?? '').trim() || null,
      });
    }
  }

  return ordenes;
}

// Extrae datos de cabecera para un GR específico (usado para complementar PDF)
async function extraerDespachoDeExcel(file, gr) {
  if (!gr) return { data: null, error: 'Sin GR' };
  const ordenes = await extraerTodasLasOrdenes(file);
  const orden = ordenes.get(gr.trim().toUpperCase());
  if (!orden) return { data: null, error: `GR ${gr} no encontrado en el Excel` };
  return { data: orden, error: null };
}
