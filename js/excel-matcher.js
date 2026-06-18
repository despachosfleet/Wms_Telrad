// ============================================================
// LECTURA DE EXCEL CONSOLIDADO (Cadena de Suministro)
// Formato de tabla relacional plana: una fila por item, con
// todas las columnas de cabecera + detalle ya separadas.
// Esta funcion extrae TODO (cabecera + items) desde el Excel
// por GR. El cruce/validacion contra el PDF es responsabilidad
// de otra funcion (validarContraPDF), que decide que prevalece.
// ============================================================

let _xlsxLoaded = false;
async function cargarXlsx() {
  if (_xlsxLoaded) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  _xlsxLoaded = true;
}

// Mapeo de columnas esperadas en la hoja "Despacho" del Excel
// consolidado de cadena de suministro.
const COLUMNAS_DESPACHO = {
  'CLIENTE': 'cliente',
  'PEDIDO/PALLET': 'pedido_pallet',
  'GR DE INGRESO': 'gr',
  'SKU': 'sku',
  'DESCRIPCION': 'descripcion',
  'CANTIDAD': 'cantidad',
  'SERIE': 'serie',
  'Tipo Material': 'tipo_material',
  'RAZON SOCIAL': 'razon_social',
  'AGENCIA': 'agencia',
  'PROVINCIA DE ENVIO': 'destino',
  'CONSIGANDO 1': 'consignatario_1',
  'CONSIGANDO 2': 'consignatario_2'
};

function normalizar(txt) {
  return String(txt || '').trim().toUpperCase();
}

// Busca la fila de encabezados (debe contener "GR DE INGRESO" y "SKU")
// dentro de las primeras filas de la hoja, y devuelve el mapeo columna->campo
function detectarEncabezados(filas) {
  for (let f = 0; f < Math.min(filas.length, 5); f++) {
    const fila = filas[f];
    if (!fila) continue;
    const tieneGR = fila.some(c => normalizar(c) === 'GR DE INGRESO');
    const tieneSKU = fila.some(c => normalizar(c) === 'SKU');
    if (tieneGR && tieneSKU) {
      const colMap = {};
      fila.forEach((celda, i) => {
        const campo = COLUMNAS_DESPACHO[normalizar(celda)];
        if (campo) colMap[campo] = i;
      });
      return { filaEncabezado: f, colMap };
    }
  }
  return null;
}

// Extrae todas las filas de items + cabecera para un GR especifico,
// desde el Excel consolidado de cadena de suministro.
async function extraerDespachoDeExcel(file, gr) {
  if (!gr) return { data: null, error: 'No hay número de GR para buscar.' };

  await cargarXlsx();

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Preferimos la hoja "Despacho" si existe; si no, recorremos todas
  const nombresHoja = workbook.SheetNames.includes('Despacho')
    ? ['Despacho', ...workbook.SheetNames.filter(n => n !== 'Despacho')]
    : workbook.SheetNames;

  for (const sheetName of nombresHoja) {
    const sheet = workbook.Sheets[sheetName];
    const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const encabezado = detectarEncabezados(filas);
    if (!encabezado) continue;

    const { filaEncabezado, colMap } = encabezado;
    if (colMap.gr === undefined || colMap.sku === undefined) continue;

    const itemsEncontrados = [];
    let cabecera = null;

    for (let f = filaEncabezado + 1; f < filas.length; f++) {
      const fila = filas[f];
      if (!fila) continue;
      if (normalizar(fila[colMap.gr]) !== normalizar(gr)) continue;

      const item = {};
      Object.entries(colMap).forEach(([campo, i]) => {
        if (fila[i] != null) item[campo] = String(fila[i]).trim();
      });

      // La serie "LOTIZADO" no es una serie real, es una marca de tipo
      if (item.serie && item.serie.toUpperCase() === 'LOTIZADO') {
        item.serie = null;
      }

      itemsEncontrados.push({
        sku: item.sku || null,
        descripcion: item.descripcion || null,
        cantidad: item.cantidad ? Number(item.cantidad) : null,
        serie: item.serie || null,
        tipo_material: item.tipo_material || null,
        pedido_pallet: item.pedido_pallet || null
      });

      if (!cabecera) {
        cabecera = {
          cliente: item.cliente || null,
          destino: item.destino || null,
          razon_social: item.razon_social || null,
          agencia: item.agencia || null,
          consignatario_1: (item.consignatario_1 && item.consignatario_1 !== '-') ? item.consignatario_1 : null,
          consignatario_2: (item.consignatario_2 && item.consignatario_2 !== '-') ? item.consignatario_2 : null
        };
      }
    }

    if (itemsEncontrados.length > 0) {
      return { data: { cabecera, items: itemsEncontrados, hoja: sheetName }, error: null };
    }
  }

  return { data: null, error: `No se encontró el GR "${gr}" en ninguna hoja de este Excel.` };
}

// ============================================================
// AGRUPAR TODAS LAS GUIAS DEL EXCEL (para carga masiva)
// A diferencia de extraerDespachoDeExcel (que busca 1 GR
// especifico), esta funcion recorre todo el archivo y devuelve
// TODAS las guias distintas que contiene, cada una con su
// cabecera + items, listas para guardarse como pendientes.
// ============================================================
async function agruparTodasLasGuiasDeExcel(file) {
  await cargarXlsx();

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const nombresHoja = workbook.SheetNames.includes('Despacho')
    ? ['Despacho', ...workbook.SheetNames.filter(n => n !== 'Despacho')]
    : workbook.SheetNames;

  for (const sheetName of nombresHoja) {
    const sheet = workbook.Sheets[sheetName];
    const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const encabezado = detectarEncabezados(filas);
    if (!encabezado) continue;

    const { filaEncabezado, colMap } = encabezado;
    if (colMap.gr === undefined || colMap.sku === undefined) continue;

    const guias = {};

    for (let f = filaEncabezado + 1; f < filas.length; f++) {
      const fila = filas[f];
      if (!fila) continue;
      const gr = fila[colMap.gr];
      if (!gr) continue;

      if (!guias[gr]) guias[gr] = { gr: String(gr).trim(), cabecera: null, items: [] };

      const item = {};
      Object.entries(colMap).forEach(([campo, i]) => {
        if (fila[i] != null) item[campo] = String(fila[i]).trim();
      });
      if (item.serie && item.serie.toUpperCase() === 'LOTIZADO') item.serie = null;

      guias[gr].items.push({
        sku: item.sku || null,
        descripcion: item.descripcion || null,
        cantidad: item.cantidad ? Number(item.cantidad) : null,
        serie: item.serie || null,
        tipo_material: item.tipo_material || null,
        pedido_pallet: item.pedido_pallet || null
      });

      if (!guias[gr].cabecera) {
        guias[gr].cabecera = {
          cliente: item.cliente || null,
          destino: item.destino || null,
          razon_social: item.razon_social || null,
          agencia: item.agencia || null,
          consignatario_1: (item.consignatario_1 && item.consignatario_1 !== '-') ? item.consignatario_1 : null,
          consignatario_2: (item.consignatario_2 && item.consignatario_2 !== '-') ? item.consignatario_2 : null
        };
      }
    }

    const listaGuias = Object.values(guias);
    if (listaGuias.length > 0) {
      return { data: listaGuias, error: null };
    }
  }

  return { data: null, error: 'No se detectaron guías (GR) en este Excel. Verifica que tenga columnas "GR DE INGRESO" y "SKU".' };
}

// ============================================================
// VALIDACION CRUZADA: Excel (rapido) vs PDF (fuente de verdad)
// Regla acordada: el PDF manda en SKU y cantidad. Si difieren,
// se corrige automaticamente y se marca el cambio. Las filas del
// PDF que no aparecen en el Excel se agregan igual, marcadas.
// ============================================================
function validarContraPDF(itemsExcel, itemsPDF) {
  const resultado = [];
  const usados = new Set();

  for (const itPdf of itemsPDF) {
    // Buscar la fila del Excel que coincida por serie (mas confiable que SKU)
    let match = null;
    if (itPdf.serie) {
      const idx = itemsExcel.findIndex((e, i) => !usados.has(i) && e.serie === itPdf.serie);
      if (idx !== -1) { match = itemsExcel[idx]; usados.add(idx); }
    }
    // Si no hay serie (lotizado), intentar por SKU + cantidad exacta
    if (!match) {
      const idx = itemsExcel.findIndex((e, i) => !usados.has(i) && e.sku === itPdf.codigo);
      if (idx !== -1) { match = itemsExcel[idx]; usados.add(idx); }
    }

    if (!match) {
      resultado.push({
        sku: itPdf.codigo,
        cantidad: itPdf.cantidad,
        serie: itPdf.serie,
        descripcion: itPdf.descripcion,
        estado_validacion: 'SOLO_EN_PDF',
        nota: 'No se encontró en el Excel. Se agregó solo con datos de la guía.'
      });
      continue;
    }

    const cambios = [];
    if (match.sku !== itPdf.codigo) cambios.push(`SKU corregido: Excel decía "${match.sku}", la guía dice "${itPdf.codigo}"`);
    if (Number(match.cantidad) !== Number(itPdf.cantidad)) cambios.push(`Cantidad corregida: Excel decía ${match.cantidad}, la guía dice ${itPdf.cantidad}`);

    resultado.push({
      sku: itPdf.codigo,
      cantidad: itPdf.cantidad,
      serie: itPdf.serie,
      descripcion: match.descripcion || itPdf.descripcion,
      tipo_material: match.tipo_material,
      pedido_pallet: match.pedido_pallet,
      estado_validacion: cambios.length > 0 ? 'CORREGIDO' : 'OK',
      nota: cambios.length > 0 ? cambios.join(' | ') : null
    });
  }

  return resultado;
}
