// ============================================================
// COMPLETAR DATOS DE ORDEN DESDE EXCEL DEL CLIENTE
// Busca el GR de la guia dentro del Excel del cliente (que tiene
// varias hojas, una por destino/agencia) y extrae SOLO los datos
// de cabecera (destino, consignatarios, razon social) - NUNCA
// los items/SKU/cantidad, que siempre vienen del PDF de la guia.
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

// Etiquetas de cabecera que buscamos dentro de cada hoja (columna B
// trae la etiqueta, columna C trae el valor - formato validado
// contra el Excel real del cliente)
const ETIQUETAS_CABECERA = {
  'RAZON SOCIAL': 'razon_social',
  'PROVINCIA DE ENVIO': 'destino',
  'AGENCIA': 'agencia',
  'CONSIGANDO 1': 'consignatario_1',
  'CONSIGANDO 2': 'consignatario_2',
  'RUC': 'ruc'
};

async function buscarDatosPorGR(file, gr) {
  if (!gr) {
    return { data: null, error: 'No hay número de GR para buscar.' };
  }

  await cargarXlsx();

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    let contieneGR = false;
    const cabecera = {};

    for (const fila of filas) {
      if (!fila || fila.length === 0) continue;

      // Buscar el GR en cualquier celda de la fila
      if (fila.some(celda => String(celda).trim() === gr.trim())) {
        contieneGR = true;
      }

      // Capturar pares etiqueta/valor de cabecera (columna B = etiqueta, columna C = valor)
      const etiquetaCelda = fila[1];
      if (etiquetaCelda && typeof etiquetaCelda === 'string') {
        const etiqueta = etiquetaCelda.trim().toUpperCase();
        if (ETIQUETAS_CABECERA[etiqueta] && fila[2] != null) {
          cabecera[ETIQUETAS_CABECERA[etiqueta]] = String(fila[2]).trim();
        }
      }
    }

    if (contieneGR) {
      if (Object.keys(cabecera).length === 0) {
        return { data: null, error: `Se encontró el GR en la hoja "${sheetName}" pero no se detectaron datos de cabecera (destino/consignatarios).` };
      }
      return { data: { ...cabecera, hoja: sheetName }, error: null };
    }
  }

  return { data: null, error: `No se encontró el GR "${gr}" en ninguna hoja de este Excel.` };
}
