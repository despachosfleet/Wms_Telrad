// ============================================================
// EXTRACTOR DE GUIAS PDF - LOGISTICA TELRAD
// Logica validada contra 7 guias reales (36 items, 0 fallos)
// ============================================================

let _pdfjsLoaded = false;
async function cargarPdfJs() {
  if (_pdfjsLoaded) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  _pdfjsLoaded = true;
}

async function extraerTextoPDF(file) {
  await cargarPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let textoCompleto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lineas = {};
    content.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!lineas[y]) lineas[y] = [];
      lineas[y].push({ x: item.transform[4], text: item.str });
    });

    const ysOrdenados = Object.keys(lineas).map(Number).sort((a, b) => b - a);
    ysOrdenados.forEach(y => {
      const lineaTexto = lineas[y]
        .sort((a, b) => a.x - b.x)
        .map(t => t.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (lineaTexto) textoCompleto += lineaTexto + '\n';
    });
  }

  return textoCompleto;
}

function parsearGuiaTelrad(texto) {
  const resultado = {
    guia: null,
    fecha: null,
    site: null,
    solicitud: null,
    items: [],
    errores: []
  };

  const mGuia = texto.match(/(T0\d\d-\d{10})/);
  if (mGuia) resultado.guia = mGuia[1];

  const mFecha = texto.match(/FECHA DE EMISION\s+(\d{2}\/\d{2}\/\d{4})/);
  if (mFecha) resultado.fecha = mFecha[1];

  const mSite = texto.match(/Site\s*:\s*([^\n]+?)\s+Usuario/);
  if (mSite) resultado.site = mSite[1].trim();

  const mSolicitud = texto.match(/SOLICITUD:\s*(\S+)/);
  if (mSolicitud) resultado.solicitud = mSolicitud[1];

  const lineas = texto.split('\n');
  let capturando = false;

  const patronLinea = /^(\d+)\s+([\d,.]+)\s+(UND|MT|MTS|M)\s+(\S+)\s+(.+)$/;
  const patronSerie = /\s([A-Z0-9]{10,})$/;

  for (const lineaRaw of lineas) {
    const linea = lineaRaw.trim();

    if (/^SEC\.\s+CANT/.test(linea)) {
      capturando = true;
      continue;
    }
    if (linea.startsWith('Observación') || linea.startsWith('Observacion')) {
      capturando = false;
      continue;
    }
    if (!capturando || !linea) continue;

    const m = linea.match(patronLinea);
    if (!m) continue;

    const [, sec, cantStr, um, codigo, restoOriginal] = m;
    let resto = restoOriginal;

    let serie = '';
    const mSerie = resto.match(patronSerie);
    if (mSerie) {
      serie = mSerie[1];
      resto = resto.slice(0, mSerie.index).trim();
    }

    resultado.items.push({
      sec: Number(sec),
      cantidad: Number(cantStr.replace(/,/g, '')),
      um,
      codigo: codigo.trim(),
      descripcion: resto.trim(),
      serie: serie || null
    });
  }

  if (resultado.items.length === 0) {
    resultado.errores.push('No se detectaron items. Verifica que el PDF tenga el formato estándar de guía Telrad.');
  }

  resultado.textoCrudo = texto;

  return resultado;
}

async function procesarGuiaPDF(file) {
  try {
    const texto = await extraerTextoPDF(file);
    const datos = parsearGuiaTelrad(texto);
    return { data: datos, error: null };
  } catch (e) {
    return { data: null, error: e.message || 'Error al leer el PDF' };
  }
}
