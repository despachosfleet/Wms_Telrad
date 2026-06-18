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

  const mFecha = texto.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (mFecha) resultado.fecha = mFecha[1];

  const mSite = texto.match(/Site\s*:\s*([^\n]+?)\s+Usuario/);
  if (mSite) resultado.site = mSite[1].trim();

  const mSolicitud = texto.match(/SOLICITUD\s*:\s*(\S+)/i);
  if (mSolicitud) resultado.solicitud = mSolicitud[1];

  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);

  let inicio = lineas.findIndex(l => /SEC\s*\.?\s*CANT/i.test(l));
  let fin = lineas.findIndex(l => /^Observaci/i.test(l));
  if (inicio === -1) {
    resultado.errores.push('No se detectaron items. Verifica que el PDF tenga el formato estándar de guía Telrad.');
    resultado.textoCrudo = texto;
    return resultado;
  }
  if (fin === -1) fin = lineas.length;

  const bloque = lineas.slice(inicio + 1, fin);

  // Codigo de producto suelto en su propia linea (ej: ENT96007867)
  const patronCodigoSuelto = /^([A-Z]{2,5}\d{6,})$/;
  // Linea de item: SEC CANT UM seguido del resto (codigo y/o serie y/o descripcion)
  const patronSecCantUm = /^(\d{1,3})\s+([\d,.]+)\s+UND\s+(.+)$/;
  // Codigo embebido en el resto de la linea
  const patronCodigoEmbebido = /\b([A-Z]{2,5}\d{6,})\b/;
  // Serie: token largo alfanumerico al final de la linea
  const patronSerieFinal = /\b(\d{6,}[A-Z0-9]{4,}|\d{15,})\b\s*$/;

  let codigoPendiente = null;

  for (let i = 0; i < bloque.length; i++) {
    const linea = bloque[i];

    if (patronCodigoSuelto.test(linea)) {
      codigoPendiente = linea;
      continue;
    }

    const m = linea.match(patronSecCantUm);
    if (!m) continue;

    const [, sec, cantStr, resto] = m;
    let codigo = codigoPendiente;
    let serie = null;
    let descripcion = resto;

    const mCod = resto.match(patronCodigoEmbebido);
    if (mCod) {
      if (!codigo) {
        codigo = mCod[1];
        descripcion = resto.replace(mCod[0], '').trim();
      } else {
        serie = mCod[1];
        descripcion = resto.replace(mCod[0], '').trim();
      }
    }

    if (!serie) {
      const mSerie = descripcion.match(patronSerieFinal);
      if (mSerie) {
        serie = mSerie[1];
        descripcion = descripcion.slice(0, mSerie.index).trim();
      }
    }

    resultado.items.push({
      sec: Number(sec),
      cantidad: Number(cantStr.replace(/,/g, '')),
      codigo: codigo || null,
      serie: serie || null,
      descripcion: descripcion.trim()
    });

    codigoPendiente = null;
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
