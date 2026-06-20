// ============================================================
// LECTURA DE EXCEL DE RECEPCION (lo que manda el cliente)
// Columnas esperadas (nombres deben coincidir en la fila de
// encabezados, mayusc/minusc no importa):
//   NUMERO DE PEDIDO / N PEDIDO / PEDIDO
//   SKU / CODIGO
//   DESCRIPCION
//   CANTIDAD
//   FECHA (opcional)
// Cualquier otra columna que traiga el archivo se ignora.
// ============================================================

let _xlsxLoadedRecepcion = false;
async function cargarXlsxRecepcion() {
  if (_xlsxLoadedRecepcion || typeof XLSX !== 'undefined') { _xlsxLoadedRecepcion = true; return; }
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  _xlsxLoadedRecepcion = true;
}

const COLUMNAS_RECEPCION = {
  'NUMERO DE PEDIDO': 'pedido', 'N PEDIDO': 'pedido', 'NRO PEDIDO': 'pedido', 'PEDIDO': 'pedido',
  'SKU': 'sku', 'CODIGO': 'sku', 'CÓDIGO': 'sku',
  'DESCRIPCION': 'descripcion', 'DESCRIPCIÓN': 'descripcion',
  'CANTIDAD': 'cantidad',
  'FECHA': 'fecha',
  'CLIENTE': 'cliente'
};

function normalizarRecepcion(txt) {
  return String(txt || '').trim().toUpperCase();
}

function detectarEncabezadosRecepcion(filas) {
  for (let f = 0; f < Math.min(filas.length, 5); f++) {
    const fila = filas[f];
    if (!fila) continue;
    const tienePedido = fila.some(c => COLUMNAS_RECEPCION[normalizarRecepcion(c)] === 'pedido');
    const tieneSku = fila.some(c => COLUMNAS_RECEPCION[normalizarRecepcion(c)] === 'sku');
    if (tienePedido && tieneSku) {
      const colMap = {};
      fila.forEach((celda, i) => {
        const campo = COLUMNAS_RECEPCION[normalizarRecepcion(celda)];
        if (campo) colMap[campo] = i;
      });
      return { filaEncabezado: f, colMap };
    }
  }
  return null;
}

// Agrupa todas las filas del Excel por numero de pedido, igual
// que se hace con guias de despacho, para crear varias recepciones
// pendientes de una sola subida.
async function agruparPedidosDeExcel(file) {
  await cargarXlsxRecepcion();

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const encabezado = detectarEncabezadosRecepcion(filas);
    if (!encabezado) continue;

    const { filaEncabezado, colMap } = encabezado;
    if (colMap.pedido === undefined || colMap.sku === undefined) continue;

    const pedidos = {};

    for (let f = filaEncabezado + 1; f < filas.length; f++) {
      const fila = filas[f];
      if (!fila) continue;
      const pedido = fila[colMap.pedido];
      if (!pedido) continue;

      const pedidoStr = String(pedido).trim();
      if (!pedidos[pedidoStr]) {
        pedidos[pedidoStr] = {
          pedido: pedidoStr,
          cliente: colMap.cliente !== undefined && fila[colMap.cliente] ? String(fila[colMap.cliente]).trim() : null,
          fecha: colMap.fecha !== undefined && fila[colMap.fecha] ? String(fila[colMap.fecha]).trim() : null,
          items: []
        };
      }

      pedidos[pedidoStr].items.push({
        sku: colMap.sku !== undefined && fila[colMap.sku] ? String(fila[colMap.sku]).trim() : null,
        descripcion: colMap.descripcion !== undefined && fila[colMap.descripcion] ? String(fila[colMap.descripcion]).trim() : null,
        cantidad_esperada: colMap.cantidad !== undefined && fila[colMap.cantidad] ? Number(fila[colMap.cantidad]) : null
      });
    }

    const lista = Object.values(pedidos);
    if (lista.length > 0) return { data: lista, error: null };
  }

  return { data: null, error: 'No se detectaron pedidos en este Excel. Verifica que tenga columnas de N° de pedido y SKU.' };
}
