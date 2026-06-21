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

// Carga el PDF UNA SOLA VEZ y devuelve tanto el texto agrupado por
// linea como las palabras con su posicion X/Y (primera pagina), para
// no abrir el archivo dos veces (evita fallos silenciosos al volver
// a leer el mismo File).
async function cargarYExtraerTodo(file) {
  await cargarPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let textoCompleto = '';
  let palabrasPrimeraPagina = [];
  let anchoPrimeraPagina = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    if (i === 1) {
      const viewport = page.getViewport({ scale: 1 });
      anchoPrimeraPagina = viewport.width;
      palabrasPrimeraPagina = content.items.map(item => ({
        texto: item.str,
        x: item.transform[4],
        y: item.transform[5]
      })).filter(p => p.texto.trim());
    }

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

  return { texto: textoCompleto, palabras: palabrasPrimeraPagina, anchoPagina: anchoPrimeraPagina };
}

// Extrae el DOMICILIO DE LLEGADA real (destino geografico), separandolo
// del DOMICILIO DE PARTIDA que esta en la columna izquierda de la misma
// fila. Validado contra 6+ guias reales con formatos de direccion distintos.
function extraerDestinoPorPosicion(palabras, anchoPagina) {
  const mitad = anchoPagina / 2;

  const wLlegada = palabras.find(p => p.texto === 'LLEGADA');
  const wDestinatario = palabras.find(p => p.texto === 'DESTINATARIO');

  if (!wLlegada || !wDestinatario) return null;

  // En PDF.js, Y mayor = mas arriba. LLEGADA esta arriba del bloque de
  // direccion, DESTINATARIO esta debajo. El rango valido es entre ambos.
  const yTop = wLlegada.y;
  const yBottom = wDestinatario.y;

  const palabrasColumnaDerecha = palabras
    .filter(p => p.x >= mitad && p.y < yTop && p.y > yBottom)
    .sort((a, b) => (b.y - a.y) || (a.x - b.x));

  if (palabrasColumnaDerecha.length === 0) return null;

  return palabrasColumnaDerecha.map(p => p.texto).join(' ').replace(/\s+/g, ' ').trim();
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

  // Razon social del destinatario (validado en multiples guias reales)
  const mRazonSocial = texto.match(/RAZON SOCIAL:\s*(.+?)\s+Nombre\/Raz/);
  if (mRazonSocial) resultado.razonSocial = mRazonSocial[1].replace(/\s+/g, ' ').trim();

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
  const patronSecCantUm = /^(\d{1,3})\s+([\d,.]+)\s+(UND|MT|MTS|M)\s+(.+)$/;
  // Primer token del "resto": puede ser el CODIGO real (ENT96007867,
  // o numerico puro como 1004177 para SKU propios de Telrad)
  const patronPrimerToken = /^(\S+)\s+(.*)$/;
  // Serie: token largo alfanumerico al final de la linea
  const patronSerieFinal = /\b(\d{6,}[A-Z0-9]{4,}|\d{15,})\b\s*$/;
  // Identificador de pedido/paleta al inicio de lo que queda despues
  // del codigo (ej: "MR-304", "Q&S-TELRAD", o numero de pedido largo)
  const patronIdentificador = /^([A-Z][A-Z&]*-[A-Z0-9]+|\d{7,})\s+/;

  let codigoPendiente = null;

  for (let i = 0; i < bloque.length; i++) {
    const linea = bloque[i];

    if (patronCodigoSuelto.test(linea)) {
      codigoPendiente = linea;
      continue;
    }

    const m = linea.match(patronSecCantUm);
    if (!m) continue;

    const [, sec, cantStr, um, restoCompleto] = m;
    let codigo = codigoPendiente;
    let serie = null;
    let resto = restoCompleto;

    // Si no hay codigo pendiente de la linea anterior, el primer token
    // de "resto" es el codigo real (sea ENT... o numerico puro)
    if (!codigo) {
      const mTok = resto.match(patronPrimerToken);
      if (mTok) {
        codigo = mTok[1];
        resto = mTok[2];
      }
    }

    let descripcion = resto;

    if (!serie) {
      const mSerie = descripcion.match(patronSerieFinal);
      if (mSerie) {
        serie = mSerie[1];
        descripcion = descripcion.slice(0, mSerie.index).trim();
      }
    }

    // Identificador de pedido al inicio de lo que queda (despues del
    // codigo, antes de la descripcion en si)
    let identificadorPedido = null;
    const mIdent = descripcion.match(patronIdentificador);
    if (mIdent) {
      identificadorPedido = mIdent[1];
      descripcion = descripcion.slice(mIdent[0].length).trim();
    }

    resultado.items.push({
      sec: Number(sec),
      cantidad: Number(cantStr.replace(/,/g, '')),
      um: um,
      codigo: codigo || null,
      serie: serie || null,
      identificadorPedido: identificadorPedido,
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
    const { texto, palabras, anchoPagina } = await cargarYExtraerTodo(file);
    const datos = parsearGuiaTelrad(texto);

    const destino = extraerDestinoPorPosicion(palabras, anchoPagina);
    if (destino) datos.destino = destino;

    return { data: datos, error: null };
  } catch (e) {
    return { data: null, error: e.message || 'Error al leer el PDF' };
  }
}
