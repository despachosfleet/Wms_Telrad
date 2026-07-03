// ============================================================
// CONEXION A SUPABASE - WMS TELRAD
// ============================================================

const SUPABASE_URL = "https://nrciozyymgbmjdmocytv.supabase.co";
const SUPABASE_KEY = "sb_publishable_5cyMRd3a69GfRc0whR2-8Q_D58YatQX";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// FUNCIONES DE ACCESO A DATOS - STOCK
// ============================================================

async function buscarStockAvanzado({ sku = '', serie = '', ubic = '', paleta = '', cliente = '', estado = '', tipo = '', descripcion = '', textoLibre = '', orden = 'id', dir = 'asc', limit = 200 } = {}) {
  let query = sb.from('stock').select('*');
  if (sku)         query = query.ilike('sku',             '%' + sku.trim() + '%');
  if (serie)       query = query.ilike('serie',           '%' + serie.trim() + '%');
  if (ubic)        query = query.ilike('ubicacion_fisica','%' + ubic.trim() + '%');
  if (paleta) {
    // Normalizar: buscar tanto "018" como "18" — PALETA 18 = PALETA 018
    const paletaTrim = paleta.trim();
    const paletaNum  = paletaTrim.replace(/^(\D+)0+(\d+)$/, '$1$2'); // PALETA 018 → PALETA 18
    const paletaPad  = paletaTrim.replace(/^(\D+)(\d+)$/, (_, p, n) => p + n.padStart(3,'0')); // PALETA 18 → PALETA 018
    if (paletaNum !== paletaTrim || paletaPad !== paletaTrim) {
      query = query.or(`paleta_pedido.ilike.%${paletaTrim}%,paleta_pedido.ilike.%${paletaNum}%,paleta_pedido.ilike.%${paletaPad}%`);
    } else {
      query = query.ilike('paleta_pedido', '%' + paletaTrim + '%');
    }
  }
  if (descripcion) query = query.ilike('descripcion',     '%' + descripcion.trim() + '%');
  if (cliente)     query = query.eq('cliente', cliente);
  if (estado)      query = query.eq('estado',  estado);
  if (tipo)        query = query.eq('tipo',    tipo);
  if (textoLibre) {
    const t = textoLibre.trim();
    query = query.or('sku.ilike.%' + t + '%,serie.ilike.%' + t + '%,descripcion.ilike.%' + t + '%,paleta_pedido.ilike.%' + t + '%,ubicacion_fisica.ilike.%' + t + '%');
  }
  query = query.order(orden, { ascending: dir === 'asc' }).limit(limit);
  const { data, error } = await query;
  if (error) { console.error('buscarStockAvanzado:', error); return { data: [], error }; }

  // Enriquecer con ubicación desde paletas_ubicacion para ítems sin ubicacion_fisica
  const sinUbic = (data || []).filter(r => !r.ubicacion_fisica && r.paleta_pedido);
  if (sinUbic.length) {
    const paletas = [...new Set(sinUbic.map(r => r.paleta_pedido))];
    const { data: ubicData } = await sb
      .from('paletas_ubicacion')
      .select('paleta, ubicacion_id, ubicaciones(codigo)')
      .in('paleta', paletas);
    if (ubicData) {
      const mapaUbic = {};
      ubicData.forEach(u => {
        const codigo = u.ubicaciones?.codigo || '';
        if (codigo) {
          if (!mapaUbic[u.paleta]) mapaUbic[u.paleta] = [];
          if (!mapaUbic[u.paleta].includes(codigo)) mapaUbic[u.paleta].push(codigo);
        }
      });
      data.forEach(r => {
        if (!r.ubicacion_fisica && r.paleta_pedido && mapaUbic[r.paleta_pedido]) {
          r.ubicacion_fisica = mapaUbic[r.paleta_pedido].join(', ');
        }
      });
    }
  }

  return { data, error: null };
}

async function buscarStock({ texto = '', campo = 'todo', filtro = 'TODOS', orden = 'id', dir = 'asc', limit = 100 } = {}) {
  let query = sb.from('stock').select('*');

  if (texto) {
    const t = texto.trim();
    if (campo === 'sku') {
      query = query.ilike('sku', `%${t}%`);
    } else if (campo === 'serie') {
      query = query.ilike('serie', `%${t}%`);
    } else if (campo === 'paleta') {
      query = query.ilike('paleta_pedido', `%${t}%`);
    } else if (campo === 'ubicacion') {
      query = query.ilike('ubicacion_fisica', `%${t}%`);
    } else if (campo === 'descripcion') {
      query = query.ilike('descripcion', `%${t}%`);
    } else {
      // todo: solo buscar en sku y paleta (los mas usados) para no sobrecargar
      query = query.or(`sku.ilike.%${t}%,paleta_pedido.ilike.%${t}%`);
    }
  }

  if (filtro === 'DISPONIBLE' || filtro === 'DESPACHADO') {
    query = query.eq('estado', filtro);
  } else if (['ENTEL', 'CLARO', 'TELRAD', 'AMERICATEL'].includes(filtro)) {
    query = query.eq('cliente', filtro);
  }

  query = query.order(orden, { ascending: dir === 'asc' }).limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error('Error buscarStock:', error);
    return { data: [], error, total: 0 };
  }
  return { data, error: null, total: data.length };
}

async function contarStock() {
  const { count, error } = await sb
    .from('stock')
    .select('*', { count: 'exact', head: true });
  if (error) return 0;
  return count;
}

async function obtenerResumenStock() {
  // Usa count agrupado en lugar de traer todas las filas (evita límite de 1000)
  const res = {
    mudanza:      { total: 0, entel: 0, claro: 0, telrad: 0 },
    ingresoNuevo: { total: 0, entel: 0, claro: 0, telrad: 0 },
    totalDisponible: 0,
    totalReservado:  0,
  };

  // Hacemos 4 consultas de count por combinación tipo+estado
  const combos = [
    { tipo: 'MUDANZA',       estado: 'DISPONIBLE' },
    { tipo: 'MUDANZA',       estado: 'RESERVADO'  },
    { tipo: 'INGRESO NUEVO', estado: 'DISPONIBLE' },
    { tipo: 'INGRESO NUEVO', estado: 'RESERVADO'  },
  ];

  for (const combo of combos) {
    // Count total para este combo
    const { count: total } = await sb.from('stock')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', combo.tipo).eq('estado', combo.estado);

    const bucket = combo.tipo === 'MUDANZA' ? res.mudanza : res.ingresoNuevo;
    bucket.total += (total || 0);
    if (combo.estado === 'DISPONIBLE') res.totalDisponible += (total || 0);
    if (combo.estado === 'RESERVADO')  res.totalReservado  += (total || 0);

    // Count por cliente
    for (const cliente of ['ENTEL', 'CLARO', 'TELRAD']) {
      const { count } = await sb.from('stock')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', combo.tipo).eq('estado', combo.estado).eq('cliente', cliente);
      const key = cliente.toLowerCase();
      bucket[key] = (bucket[key] || 0) + (count || 0);
    }
  }

  return res;
}

async function obtenerSugerencias(texto) {
  if (!texto || texto.length < 2) return [];
  const t = texto.trim();

  const { data, error } = await sb
    .from('stock')
    .select('sku, paleta_pedido, ubicacion_fisica')
    .or(`sku.ilike.%${t}%,paleta_pedido.ilike.%${t}%,ubicacion_fisica.ilike.%${t}%`)
    .limit(30);

  if (error || !data) return [];

  const sugerencias = new Map();
  const tUpper = t.toUpperCase();

  data.forEach(row => {
    if (row.sku && row.sku.toUpperCase().includes(tUpper)) {
      const key = 'SKU:' + row.sku;
      if (!sugerencias.has(key)) sugerencias.set(key, { texto: row.sku, tag: 'SKU' });
    }
    if (row.paleta_pedido && row.paleta_pedido.toUpperCase().includes(tUpper)) {
      const key = 'PAL:' + row.paleta_pedido;
      if (!sugerencias.has(key)) sugerencias.set(key, { texto: row.paleta_pedido, tag: 'Paleta/Pedido' });
    }
    if (row.ubicacion_fisica && row.ubicacion_fisica.toUpperCase().includes(tUpper)) {
      const key = 'UBI:' + row.ubicacion_fisica;
      if (!sugerencias.has(key)) sugerencias.set(key, { texto: row.ubicacion_fisica, tag: 'Ubicación' });
    }
  });

  return Array.from(sugerencias.values()).slice(0, 6);
}

// Busca un SKU exacto y devuelve filas disponibles (para picking y nuevo despacho)
async function buscarStockPorSKU(sku, soloDisponible = true) {
  let query = sb.from('stock').select('*').ilike('sku', sku.trim());
  if (soloDisponible) query = query.eq('estado', 'DISPONIBLE').gt('cantidad', 0);
  query = query.order('cantidad', { ascending: false });
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

// ============================================================
// FUNCIONES DE ACCESO A DATOS - DESPACHOS
// ============================================================

async function crearDespacho({ gr, fecha, cliente, destino, razonSocial, contrata, consignatarios, observaciones, items, status }) {
  // Nota: aqui NO se busca ni reserva stock todavia (stock_id viene
  // null). El cruce contra stock (mudanza/ingreso nuevo) y la reserva
  // ocurren en la pantalla de Picking, al abrir cada item -asi se evita
  // duplicar la revision que el usuario ya hace al pickear-.

  // 1. Crear cabecera del despacho
  const { data: despacho, error: errDespacho } = await sb
    .from('despachos')
    .insert([{
      gr: gr || null,
      fecha: fecha || null,
      cliente: cliente || null,
      destino: destino || null,
      razon_social: razonSocial || null,
      contrata: contrata || null,
      consignatarios: consignatarios || null,
      observaciones: observaciones || null,
      status: status || 'PENDIENTE'
    }])
    .select()
    .single();

  if (errDespacho) {
    console.error('Error crearDespacho:', errDespacho);
    return { data: null, error: errDespacho };
  }

  // 2. Crear items del despacho
  const itemsToInsert = items.map(it => ({
    despacho_id: despacho.id,
    stock_id: it.stock_id || null,
    sku: it.sku,
    descripcion: it.descripcion || null,
    serie: it.serie || null,
    cantidad: it.cantidad,
    paleta_pedido: it.paleta_pedido || null,
    ubicacion_fisica: it.ubicacion_fisica || null,
    encontrado: it.encontrado !== false,
    observaciones: it.observaciones || null
  }));

  const { error: errItems } = await sb
    .from('despachos_items')
    .insert(itemsToInsert);

  if (errItems) {
    console.error('Error crearDespachoItems:', errItems);
    return { data: despacho, error: errItems };
  }

  return { data: despacho, error: null };
}

// Trae todos los despachos (todos los estados), opcionalmente
// filtrados por rango de fechas. El calculo de "EN PROCESO" (visual,
// no se guarda en BD) se hace aparte con calcularEstadoVisual.
async function obtenerTodosLosDespachos({ fechaDesde = null, fechaHasta = null } = {}) {
  let query = sb.from('despachos').select('*, despachos_items(*)').order('creado_en', { ascending: false });

  if (fechaDesde) query = query.gte('creado_en', fechaDesde);
  if (fechaHasta) query = query.lte('creado_en', fechaHasta);

  const { data, error } = await query;

  if (error) {
    console.error('Error obtenerTodosLosDespachos:', error);
    return [];
  }
  return data || [];
}

// Mantenido por compatibilidad: trae solo PENDIENTE y PICKEADO
// (los que aun se pueden pickear o estan esperando despacho)
async function obtenerDespachosPendientes() {
  const { data, error } = await sb
    .from('despachos')
    .select('*')
    .in('status', ['PENDIENTE', 'PICKEADO'])
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error obtenerDespachosPendientes:', error);
    return [];
  }
  return data || [];
}

// Calcula el estado visual de una orden, incluyendo "EN_PROCESO"
// (no es un valor guardado en BD; se deriva de cuantos items ya
// tienen observaciones que empiecen con "PICKEADO")
function calcularEstadoVisual(despacho) {
  if (despacho.status === 'DESPACHADO') return 'DESPACHADO';
  if (despacho.status === 'PICKEADO') return 'PICKEADO';

  const items = despacho.despachos_items || [];
  const algunoPickeado = items.some(it => it.observaciones && it.observaciones.startsWith('PICKEADO'));
  return algunoPickeado ? 'EN_PROCESO' : 'PENDIENTE';
}

async function obtenerDespachoConItems(despachoId) {
  const { data: despacho, error: errD } = await sb
    .from('despachos')
    .select('*')
    .eq('id', despachoId)
    .single();

  const { data: items, error: errI } = await sb
    .from('despachos_items')
    .select('*')
    .eq('despacho_id', despachoId)
    .order('id', { ascending: true });

  if (errD || errI) {
    console.error('Error obtenerDespachoConItems:', errD || errI);
    return { despacho: null, items: [] };
  }
  return { despacho, items: items || [] };
}

// Marca un item del despacho como pickeado y descuenta del stock
// Busca stock para un item de picking, replicando el criterio manual
// del usuario: primero por identificador de pedido/paleta (si el item
// trae uno guardado en paleta_pedido al crear la orden, coincide con
// stock.paleta_pedido -> es ingreso nuevo); si no hay coincidencia por
// pedido, busca por SKU en stock disponible (mudanza). Si no encuentra
// nada, devuelve lista vacia para que la vista muestre la alerta.
// Busca stock para un item de picking. Si el item requiere serie,
// esa serie EXACTA manda sobre todo lo demas: no se sugiere otra
// paleta/pedido con el mismo SKU pero serie distinta. Si la serie
// no se encuentra, se marca POR_REVISAR (no se inventa una opcion).
async function buscarStockParaItem(sku, identificadorPedido, serie) {
  // 1. Si el item requiere serie, esa serie exacta manda sobre todo
  if (serie) {
    const { data: porSerie } = await sb
      .from('stock')
      .select('*')
      .eq('sku', sku)
      .eq('serie', serie)
      .in('estado', ['DISPONIBLE', 'RESERVADO']);

    if (porSerie && porSerie.length > 0) {
      const origenSerie = identificadorPedido && porSerie[0].paleta_pedido === identificadorPedido
        ? 'INGRESO_NUEVO' : 'MUDANZA';
      return { data: porSerie, origen: origenSerie };
    }

    // No se encontro esa serie exacta: no se sugiere ninguna otra
    // opcion con el mismo SKU, se marca para revision manual.
    return { data: [], origen: 'POR_REVISAR' };
  }

  // 2. Item sin serie (lotizado): buscar primero por numero de
  // pedido (ingreso nuevo)
  if (identificadorPedido) {
    const { data: porPedido } = await sb
      .from('stock')
      .select('*')
      .eq('paleta_pedido', identificadorPedido)
      .eq('sku', sku)
      .in('estado', ['DISPONIBLE', 'RESERVADO'])
      .order('cantidad', { ascending: false });

    if (porPedido && porPedido.length > 0) {
      return { data: porPedido, origen: 'INGRESO_NUEVO' };
    }
  }

  // 3. Buscar por SKU general (mudanza u otro stock disponible)
  const { data: porSku } = await sb
    .from('stock')
    .select('*')
    .eq('sku', sku)
    .in('estado', ['DISPONIBLE', 'RESERVADO'])
    .order('cantidad', { ascending: false });

  if (porSku && porSku.length > 0) {
    return { data: porSku, origen: 'MUDANZA' };
  }

  return { data: [], origen: null };
}

// Asigna (reserva) una fila de stock especifica a un item de despacho.
// Marca el stock como RESERVADO (no descuenta cantidad aun, eso pasa
// al confirmar el picking de esa linea).
async function asignarStockAItem(itemDespachoId, stockId) {
  const { error: errReserva } = await sb
    .from('stock')
    .update({ estado: 'RESERVADO', actualizado_en: new Date().toISOString() })
    .eq('id', stockId)
    .eq('estado', 'DISPONIBLE');

  if (errReserva) console.error('Error al reservar stock:', errReserva);

  const { data: stockRow } = await sb.from('stock').select('*').eq('id', stockId).single();

  const { error: errItem } = await sb
    .from('despachos_items')
    .update({
      stock_id: stockId,
      paleta_pedido: stockRow ? stockRow.paleta_pedido : null,
      ubicacion_fisica: stockRow ? stockRow.ubicacion_fisica : null,
      encontrado: true
    })
    .eq('id', itemDespachoId);

  if (errItem) console.error('Error al asignar stock al item:', errItem);

  return { error: errItem || null, stock: stockRow };
}

// Confirma el picking de un item: descuenta la cantidad pickeada del
// stock (que sigue RESERVADO hasta que se confirme el despacho final).
async function confirmarPicking(itemDespachoId, stockId, cantidadPickeada, observacion = '', usuario = '') {
  const { data: stockRow, error: errGet } = await sb
    .from('stock')
    .select('*')
    .eq('id', stockId)
    .single();

  if (errGet || !stockRow) {
    return { error: errGet || new Error('Stock no encontrado') };
  }

  // Modelo: cantidad = lo fisico que sigue en el almacen (no baja aqui).
  // cantidad_reservada = cuanto de esa cantidad ya esta comprometido con
  // un pedido pickeado pero que aun no sale fisicamente ("el bulto puede
  // salir otro dia"). stock real = cantidad - cantidad_reservada, se
  // calcula, no se guarda. Todo vive en LA MISMA fila — sin filas nuevas.
  const reservadaActual = Number(stockRow.cantidad_reservada) || 0;
  const nuevaReservada = reservadaActual + Number(cantidadPickeada);

  const { error: errUpdate } = await sb
    .from('stock')
    .update({
      cantidad_reservada: nuevaReservada,
      estado: 'RESERVADO',
      actualizado_en: new Date().toISOString()
    })
    .eq('id', stockId);

  if (errUpdate) return { error: errUpdate };

  const { error: errKardex } = await sb
    .from('kardex')
    .insert([{
      stock_id: stockId,
      sku: stockRow.sku,
      descripcion: stockRow.descripcion,
      serie: stockRow.serie,
      tipo_movimiento: 'SALIDA',
      cantidad: cantidadPickeada,
      referencia: 'Picking',
      usuario: usuario || null
    }]);

  if (errKardex) console.error('Error kardex:', errKardex);

  const obsTexto = 'PICKEADO: ' + cantidadPickeada + (observacion ? ' | ' + observacion : '');
  const { error: errItem } = await sb
    .from('despachos_items')
    .update({ observaciones: obsTexto, stock_id: stockId, cantidad_despachada: cantidadPickeada })
    .eq('id', itemDespachoId);

  if (errItem) console.error('Error item despacho:', errItem);

  return { error: null, cantidadReservada: nuevaReservada };
}

// Paso 1 del cierre: todos los items ya se pickearon. La orden pasa
// a PICKEADO; el stock sigue RESERVADO (el bulto puede salir otro dia).
async function terminarPicking(despachoId) {
  const { error } = await sb
    .from('despachos')
    .update({ status: 'PICKEADO' })
    .eq('id', despachoId);
  return { error };
}

// Paso 2 del cierre: se confirma que el bulto salio del almacen
// realmente (mismo dia o despues). Aqui se libera el stock reservado.
async function finalizarDespacho(despachoId) {
  const { error: errStatus } = await sb
    .from('despachos')
    .update({ status: 'DESPACHADO' })
    .eq('id', despachoId);

  if (errStatus) return { error: errStatus };

  const { data: items, error: errItems } = await sb
    .from('despachos_items')
    .select('stock_id, cantidad, cantidad_despachada')
    .eq('despacho_id', despachoId);

  if (!errItems && items && items.length > 0) {
    for (const it of items) {
      if (!it.stock_id) continue;
      const cantSalio = Number(it.cantidad_despachada ?? it.cantidad ?? 0);
      if (!cantSalio) continue;

      const { data: row } = await sb
        .from('stock')
        .select('cantidad, cantidad_reservada')
        .eq('id', it.stock_id)
        .maybeSingle();
      if (!row) continue;

      // Aqui SI baja la cantidad fisica (el bulto ya salio de verdad) y
      // se libera la reserva que se habia apartado en el picking.
      const nuevaCant = Math.max(0, Number(row.cantidad) - cantSalio);
      const nuevaReservada = Math.max(0, Number(row.cantidad_reservada) - cantSalio);

      const { error: errStock } = await sb
        .from('stock')
        .update({
          cantidad: nuevaCant,
          cantidad_reservada: nuevaReservada,
          estado: nuevaCant <= 0 ? 'DESPACHADO' : (nuevaReservada > 0 ? 'RESERVADO' : 'DISPONIBLE'),
          actualizado_en: new Date().toISOString()
        })
        .eq('id', it.stock_id);
      if (errStock) console.error('Error al liberar stock en finalizarDespacho:', errStock);
    }
  }

  return { error: null };
}

// ============================================================
// FUNCIONES DE ACCESO A DATOS - MOVIMIENTOS / UBICACIONES
// ============================================================

async function moverUbicacion(stockId, nuevaUbicacion, usuario = '', observaciones = '') {
  const { data: stockRow, error: errGet } = await sb
    .from('stock')
    .select('*')
    .eq('id', stockId)
    .single();

  if (errGet || !stockRow) return { error: errGet || new Error('No encontrado') };

  const ubicacionOrigen = stockRow.ubicacion_fisica;

  const { error: errUpdate } = await sb
    .from('stock')
    .update({ ubicacion_fisica: nuevaUbicacion, actualizado_en: new Date().toISOString() })
    .eq('id', stockId);

  if (errUpdate) return { error: errUpdate };

  const { error: errKardex } = await sb
    .from('kardex')
    .insert([{
      stock_id: stockId,
      sku: stockRow.sku,
      tipo_movimiento: 'MOVIMIENTO_UBICACION',
      cantidad: stockRow.cantidad,
      ubicacion_origen: ubicacionOrigen,
      ubicacion_destino: nuevaUbicacion,
      usuario: usuario || null,
      observaciones: observaciones || null
    }]);

  if (errKardex) console.error('Error kardex movimiento:', errKardex);

  return { error: null };
}

// Mueve TODOS los items de una paleta/pedido a una nueva ubicacion fisica
async function moverPaletaCompleta(paletaPedido, nuevaUbicacion, usuario = '') {
  const { data: items, error: errGet } = await sb
    .from('stock')
    .select('id, ubicacion_fisica, sku, cantidad')
    .eq('paleta_pedido', paletaPedido);

  if (errGet) return { error: errGet, actualizados: 0 };
  if (!items || items.length === 0) return { error: null, actualizados: 0 };

  const { error: errUpdate } = await sb
    .from('stock')
    .update({ ubicacion_fisica: nuevaUbicacion, actualizado_en: new Date().toISOString() })
    .eq('paleta_pedido', paletaPedido);

  if (errUpdate) return { error: errUpdate, actualizados: 0 };

  const kardexRows = items.map(it => ({
    stock_id: it.id,
    sku: it.sku,
    tipo_movimiento: 'MOVIMIENTO_UBICACION',
    cantidad: it.cantidad,
    ubicacion_origen: it.ubicacion_fisica,
    ubicacion_destino: nuevaUbicacion,
    usuario: usuario || null,
    observaciones: `Movimiento masivo: paleta/pedido ${paletaPedido}`
  }));

  await sb.from('kardex').insert(kardexRows);

  return { error: null, actualizados: items.length };
}

// ============================================================
// FUNCIONES - RECEPCION / INGRESOS NUEVOS
// ============================================================

async function registrarIngreso({ sku, descripcion, serie, cantidad, unidad_medida, paleta_pedido, cliente, gr_ingreso, fecha_ingreso, usuario }) {
  const { data, error } = await sb
    .from('stock')
    .insert([{
      sku, descripcion, serie,
      cantidad: cantidad || 0,
      unidad_medida: unidad_medida || 'UND',
      paleta_pedido,
      ubicacion_fisica: null,
      cliente,
      tipo: 'INGRESO NUEVO',
      estado: 'DISPONIBLE',
      fecha_ingreso: fecha_ingreso || new Date().toISOString().slice(0,10),
      gr_ingreso
    }])
    .select()
    .single();

  if (error) return { error };

  await sb.from('kardex').insert([{
    stock_id: data.id,
    sku: data.sku,
    tipo_movimiento: 'INGRESO',
    cantidad: data.cantidad,
    referencia: gr_ingreso || null,
    usuario: usuario || null
  }]);

  return { data, error: null };
}

// ============================================================
// FUNCIONES - KARDEX
// ============================================================

async function obtenerKardex({ sku = '', serie = '', descripcion = '', pedido = '', limite = 100 } = {}) {
  let query = sb.from('kardex').select('*').order('fecha', { ascending: false }).limit(limite);
  if (sku)         query = query.ilike('sku', `%${sku}%`);
  if (serie)       query = query.ilike('serie', `%${serie}%`);
  if (descripcion) query = query.ilike('descripcion', `%${descripcion}%`);
  if (pedido)      query = query.ilike('referencia', `%${pedido}%`);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

async function editarMovimientoKardex(id, campos) {
  const { error } = await sb.from('kardex').update(campos).eq('id', id);
  return { error };
}

async function eliminarMovimientoKardex(id) {
  const { error } = await sb.from('kardex').delete().eq('id', id);
  return { error };
}

async function desactivarUbicacion(codigo, motivo) {
  const { error } = await sb.from('ubicaciones')
    .update({ activa: false, observaciones: motivo || null, actualizado_en: new Date().toISOString() })
    .eq('codigo', codigo);
  return { error };
}


// ============================================================
// FUNCIONES - GUIAS PENDIENTES (carga masiva desde Excel)
// ============================================================

async function guardarGuiasPendientes(guias) {
  // Verificamos manualmente cuales GR ya estan pendientes, en vez de
  // depender de upsert/onConflict (el indice unico en Supabase es
  // parcial -solo aplica a estado=PENDIENTE- y eso no es compatible
  // con onConflict de la API de Supabase, causa error al guardar).
  const grsNuevos = guias.map(g => g.gr);

  const { data: existentes, error: errBuscar } = await sb
    .from('guias_pendientes')
    .select('gr')
    .eq('estado', 'PENDIENTE')
    .in('gr', grsNuevos);

  if (errBuscar) {
    console.error('Error al verificar guias existentes:', errBuscar);
    return { data: null, error: errBuscar };
  }

  const grsExistentes = new Set((existentes || []).map(e => e.gr));
  const guiasAInsertar = guias.filter(g => !grsExistentes.has(g.gr));

  if (guiasAInsertar.length === 0) {
    return { data: [], error: null };
  }

  const filas = guiasAInsertar.map(g => ({
    gr: g.gr,
    cliente: g.cabecera ? g.cabecera.cliente : null,
    destino: g.cabecera ? g.cabecera.destino : null,
    razon_social: g.cabecera ? g.cabecera.razon_social : null,
    agencia: g.cabecera ? g.cabecera.agencia : null,
    consignatario_1: g.cabecera ? g.cabecera.consignatario_1 : null,
    consignatario_2: g.cabecera ? g.cabecera.consignatario_2 : null,
    items: g.items,
    origen: 'EXCEL',
    estado: 'PENDIENTE'
  }));

  const { data, error } = await sb
    .from('guias_pendientes')
    .insert(filas)
    .select();

  if (error) {
    console.error('Error guardarGuiasPendientes:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

async function guardarGuiaPendienteManual(gr) {
  const { data, error } = await sb
    .from('guias_pendientes')
    .insert([{ gr: gr.trim(), items: [], origen: 'MANUAL', estado: 'PENDIENTE' }])
    .select()
    .single();

  if (error) {
    console.error('Error guardarGuiaPendienteManual:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

async function obtenerGuiasPendientes({ estado = 'PENDIENTE' } = {}) {
  const { data, error } = await sb
    .from('guias_pendientes')
    .select('*')
    .eq('estado', estado)
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error obtenerGuiasPendientes:', error);
    return [];
  }

  return data || [];
}

async function marcarGuiaPendienteProcesada(id, despachoId) {
  const { error } = await sb
    .from('guias_pendientes')
    .update({ estado: 'PROCESADA', despacho_id: despachoId, procesado_en: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error marcarGuiaPendienteProcesada:', error);
    return { error };
  }

  return { error: null };
}

// ============================================================
// FUNCIONES - RECEPCIONES PENDIENTES (Excel del cliente como
// expectativa, antes de confirmar lo recibido fisicamente)
// ============================================================

async function guardarRecepcionesPendientes(pedidos) {
  const numerosPedido = pedidos.map(p => p.pedido);

  const { data: existentes, error: errBuscar } = await sb
    .from('recepciones_pendientes')
    .select('pedido')
    .eq('estado', 'PENDIENTE')
    .in('pedido', numerosPedido);

  if (errBuscar) {
    console.error('Error al verificar pedidos existentes:', errBuscar);
    return { data: null, error: errBuscar };
  }

  const pedidosExistentes = new Set((existentes || []).map(e => e.pedido));
  const pedidosAInsertar = pedidos.filter(p => !pedidosExistentes.has(p.pedido));

  if (pedidosAInsertar.length === 0) return { data: [], error: null };

  const filas = pedidosAInsertar.map(p => ({
    pedido: p.pedido,
    cliente: p.cliente || null,
    fecha_esperada: p.fecha || null,
    items: p.items,
    estado: 'PENDIENTE'
  }));

  const { data, error } = await sb
    .from('recepciones_pendientes')
    .insert(filas)
    .select();

  if (error) {
    console.error('Error guardarRecepcionesPendientes:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

async function obtenerRecepcionesPendientes() {
  const { data, error } = await sb
    .from('recepciones_pendientes')
    .select('*')
    .eq('estado', 'PENDIENTE')
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error obtenerRecepcionesPendientes:', error);
    return [];
  }

  return data || [];
}

// Confirma una recepcion: ingresa a stock SOLO lo que realmente
// llego (itemsRecibidos), usando el numero de pedido como
// ubicacion fisica logica por defecto (igual que una paleta).
async function confirmarRecepcion(recepcionId, pedido, cliente, itemsRecibidos) {
  const filasStock = itemsRecibidos
    .filter(it => it.sku && Number(it.cantidad_recibida) > 0)
    .map(it => ({
      sku: it.sku,
      descripcion: it.descripcion || null,
      serie: it.serie || null,
      cantidad: Number(it.cantidad_recibida),
      unidad_medida: it.unidad_medida || 'UND',
      paleta_pedido: pedido,
      ubicacion_fisica: pedido,
      cliente: cliente || null,
      tipo: it.serie ? 'SERIADO' : 'LOTIZADO',
      estado: 'DISPONIBLE',
      condicion: 'NUEVO'
    }));

  if (filasStock.length === 0) {
    return { error: new Error('No hay ítems recibidos para registrar.') };
  }

  const { error: errStock } = await sb.from('stock').insert(filasStock);
  if (errStock) {
    console.error('Error al insertar stock de recepcion:', errStock);
    return { error: errStock };
  }

  // Registrar en kardex cada ingreso
  const filasKardex = filasStock.map(f => ({
    sku: f.sku,
    tipo_movimiento: 'INGRESO',
    cantidad: f.cantidad,
    referencia: pedido,
    usuario: null
  }));
  const { error: errKardex } = await sb.from('kardex').insert(filasKardex);
  if (errKardex) console.error('Error kardex recepcion:', errKardex);

  // Marcar la recepcion pendiente como RECIBIDA (si vino de Excel)
  if (recepcionId) {
    const { error: errUpdate } = await sb
      .from('recepciones_pendientes')
      .update({ estado: 'RECIBIDA', items_recibidos: itemsRecibidos, procesado_en: new Date().toISOString() })
      .eq('id', recepcionId);
    if (errUpdate) console.error('Error al marcar recepcion como recibida:', errUpdate);
  }

  return { error: null };
}

// ============================================================
// MAESTRO DE ARTICULOS (catalogo oficial Entel/Claro)
// ============================================================

async function buscarEnMaestro(sku) {
  if (!sku) return null;
  const { data, error } = await sb
    .from('maestro_articulos')
    .select('*')
    .eq('sku', sku.trim())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error buscarEnMaestro:', error);
    return null;
  }
  return data;
}

// Valida una lista de items contra el maestro: marca cuales SKU
// no existen en el catalogo oficial (posible error de extraccion),
// y completa descripcion si esta vacia y el maestro la tiene.
async function validarItemsContraMaestro(items) {
  const skus = [...new Set(items.map(it => it.sku).filter(Boolean))];
  if (skus.length === 0) return items;

  const { data: encontrados, error } = await sb
    .from('maestro_articulos')
    .select('sku, descripcion, cliente')
    .in('sku', skus);

  if (error || !encontrados) return items.map(it => ({ ...it, enMaestro: null }));

  const mapa = new Map(encontrados.map(e => [e.sku, e]));

  return items.map(it => {
    const match = mapa.get(it.sku);
    return {
      ...it,
      enMaestro: !!match,
      descripcion: it.descripcion || (match ? match.descripcion : it.descripcion)
    };
  });
}

// Busca paletas/pedidos distintos que coincidan con el texto, para
// usar en sugerencias de busqueda (movimientos de paleta completa).
async function buscarPaletasOPedidos(texto) {
  if (!texto || texto.length < 2) return [];

  const { data, error } = await sb
    .from('stock')
    .select('paleta_pedido, ubicacion_fisica, sku')
    .ilike('paleta_pedido', `%${texto.trim()}%`)
    .not('paleta_pedido', 'is', null)
    .limit(100);

  if (error || !data) return [];

  const agrupado = new Map();
  data.forEach(row => {
    if (!agrupado.has(row.paleta_pedido)) {
      agrupado.set(row.paleta_pedido, { paleta_pedido: row.paleta_pedido, ubicacion_fisica: row.ubicacion_fisica, cantidadItems: 0 });
    }
    agrupado.get(row.paleta_pedido).cantidadItems++;
  });

  return Array.from(agrupado.values()).slice(0, 10);
}

// Busca ubicaciones reales del catalogo que coincidan con el texto.
async function buscarUbicacionesReales(texto) {
  if (!texto || texto.length < 1) return [];

  const { data, error } = await sb
    .from('ubicaciones')
    .select('codigo, zona, pasillo, posicion')
    .ilike('codigo', `%${texto.trim()}%`)
    .limit(10);

  if (error || !data) return [];
  return data;
}

// ============================================================
// GESTION DE UBICACIONES (modulo de administracion)
// ============================================================

async function obtenerTodasLasUbicaciones() {
  const { data, error } = await sb
    .from('ubicaciones')
    .select('*, paletas_ubicacion(paleta)')
    .order('zona', { ascending: true })
    .order('posicion', { ascending: true })
    .order('sub_posicion', { ascending: true });

  if (error) {
    console.error('Error obtenerTodasLasUbicaciones:', error);
    return [];
  }
  return data || [];
}

async function crearUbicacion({ zona, pasillo, posicion, subPosicion, tipo }) {
  const codigo = subPosicion
    ? `${zona}-${pasillo}-${posicion}-${subPosicion}`
    : `${zona}-${pasillo}-${posicion}`;

  const { data, error } = await sb
    .from('ubicaciones')
    .insert([{ codigo, zona, pasillo, posicion, sub_posicion: subPosicion || null, tipo: tipo || 'PALETA' }])
    .select()
    .single();

  return { data, error };
}

async function eliminarUbicacion(id) {
  // No permite borrar si tiene paletas asignadas
  const { data: paletas } = await sb.from('paletas_ubicacion').select('id').eq('ubicacion_id', id);
  if (paletas && paletas.length > 0) {
    return { error: new Error('Esta ubicación tiene paletas asignadas. Muévelas primero.') };
  }
  const { error } = await sb.from('ubicaciones').delete().eq('id', id);
  return { error };
}

// Obtiene un item de stock por su ID (usado en picking cuando ya tiene stock asignado)
async function obtenerStockPorId(stockId) {
  const { data, error } = await sb.from('stock').select('*').eq('id', stockId).maybeSingle();
  if (error) { console.error('Error obtenerStockPorId:', error); return null; }
  return data;
}

// Actualiza solo la observación de un item de despacho (usado en picking)
async function actualizarObservacionItem(itemId, observacion) {
  const { error } = await sb
    .from('despachos_items')
    .update({ observaciones: observacion })
    .eq('id', itemId);
  return { error };
}

// ============================================================
// FUNCIONES ADICIONALES — Admin, Validación, Recepción Excel
// ============================================================

// Obtener órdenes en estado BORRADOR
async function obtenerOrdenesBorrador() {
  const { data, error } = await sb
    .from('despachos')
    .select('*, despachos_items(*)')
    .eq('status', 'BORRADOR')
    .order('creado_en', { ascending: false });
  if (error) { console.error('obtenerOrdenesBorrador:', error); return []; }
  return data || [];
}

// Aprobar orden borrador → PENDIENTE (ya puede pickearse)
async function aprobarOrdenBorrador(despachoId) {
  const { error } = await sb.from('despachos')
    .update({ status: 'PENDIENTE' })
    .eq('id', despachoId);
  return { error };
}

// Anular orden borrador (eliminar)
async function anularOrdenBorrador(despachoId) {
  await sb.from('despachos_items').delete().eq('despacho_id', despachoId);
  const { error } = await sb.from('despachos').delete().eq('id', despachoId);
  return { error };
}

// Anular orden completa (cualquier estado sin DESPACHADO)
async function anularOrdenCompleta(despachoId) {
  await sb.from('despachos_items').delete().eq('despacho_id', despachoId);
  const { error } = await sb.from('despachos').delete().eq('id', despachoId);
  return { error };
}

// Revertir despacho — restaura stock y elimina el despacho
async function revertirDespacho(despachoId) {
  // Necesitamos saber si el despacho ya llego a DESPACHADO (la cantidad
  // fisica ya se descarto en finalizarDespacho) o si solo llego a
  // PICKEADO/PENDIENTE (la cantidad fisica nunca bajo, solo se aparto en
  // cantidad_reservada) — cada caso se revierte distinto.
  const { data: despacho } = await sb.from('despachos').select('status').eq('id', despachoId).maybeSingle();
  const yaDespachado = despacho?.status === 'DESPACHADO';

  const { data: items } = await sb.from('despachos_items')
    .select('*').eq('despacho_id', despachoId);
  if (!items?.length) {
    await sb.from('despachos').delete().eq('id', despachoId);
    return { error: null };
  }

  for (const it of items) {
    if (!it.stock_id) continue;
    const cantRestaurar = Number(it.cantidad_despachada || it.cantidad || 1);

    const { data: stockRow } = await sb.from('stock')
      .select('id, cantidad, cantidad_reservada, serie, sku').eq('id', it.stock_id).maybeSingle();

    if (stockRow) {
      const nuevaReservada = Math.max(0, Number(stockRow.cantidad_reservada||0) - cantRestaurar);
      // Si ya habia salido fisicamente, se la devolvemos a cantidad.
      // Si solo estaba reservada (nunca bajo de cantidad), no hay nada
      // fisico que devolver — solo liberar la reserva.
      const nuevaCant = yaDespachado ? Number(stockRow.cantidad||0) + cantRestaurar : Number(stockRow.cantidad||0);

      await sb.from('stock').update({
        cantidad: nuevaCant,
        cantidad_reservada: nuevaReservada,
        estado: nuevaReservada > 0 ? 'RESERVADO' : 'DISPONIBLE',
        actualizado_en: new Date().toISOString()
      }).eq('id', it.stock_id);

      // Solo dejamos rastro de "ingreso por reversion" si de verdad habia
      // salido fisicamente — si solo era una reserva, no hubo salida real.
      if (yaDespachado) {
        await sb.from('kardex').insert([{
          stock_id: it.stock_id,
          sku: it.sku || stockRow.sku,
          descripcion: it.descripcion,
          serie: stockRow.serie,
          tipo_movimiento: 'INGRESO',
          cantidad: cantRestaurar,
          referencia: `Reversión despacho #${despachoId}`,
          observaciones: `Stock revertido. Serie: ${stockRow.serie||'—'}`,
          fecha: new Date().toISOString(),
        }]);
      }
    }
  }

  // Eliminar ítems y despacho
  await sb.from('despachos_items').delete().eq('despacho_id', despachoId);
  const { error } = await sb.from('despachos').delete().eq('id', despachoId);
  return { error };
}

// Editar un ítem de stock
async function editarStock(stockId, campos) {
  const { error } = await sb.from('stock')
    .update({ ...campos, actualizado_en: new Date().toISOString() })
    .eq('id', stockId);
  return { error };
}

// Renombrar paleta/pedido masivamente en todos los ítems que lo tengan
async function renombrarPaletaPedido(nombreActual, nombreNuevo) {
  const { error } = await sb.from('stock')
    .update({ paleta_pedido: nombreNuevo, actualizado_en: new Date().toISOString() })
    .eq('paleta_pedido', nombreActual);
  return { error };
}

// Ajustar inventario con kardex
async function ajustarInventario(stockId, nuevaCantidad, motivo, observacion) {
  const { data: row } = await sb.from('stock').select('*').eq('id', stockId).single();
  if (!row) return { error: 'No encontrado' };
  const diff = nuevaCantidad - Number(row.cantidad);
  const { error } = await sb.from('stock').update({
    cantidad: nuevaCantidad,
    actualizado_en: new Date().toISOString()
  }).eq('id', stockId);
  if (!error) {
    await sb.from('kardex').insert([{
      stock_id: stockId, sku: row.sku,
      tipo_movimiento: diff >= 0 ? 'ENTRADA' : 'SALIDA',
      cantidad: Math.abs(diff),
      referencia: `Ajuste: ${motivo}`,
      usuario: observacion || null
    }]);
  }
  return { error };
}

// Fusionar paletas: mover todos los ítems de origen a destino
async function fusionarPaletas(origen, destino, motivo) {
  const { data, error } = await sb.from('stock')
    .update({ paleta_pedido: destino, actualizado_en: new Date().toISOString() })
    .eq('paleta_pedido', origen)
    .select();
  return { error, count: data?.length || 0 };
}

// Revertir recepción por paleta/pedido (eliminar ítems)
async function revertirRecepcionPorPaleta(paletaPedido) {
  const { error } = await sb.from('stock')
    .delete().eq('paleta_pedido', paletaPedido);
  return { error };
}

// Cambiar estado de una orden
async function cambiarEstadoOrden(despachoId, nuevoEstado) {
  const { error } = await sb.from('despachos')
    .update({ status: nuevoEstado })
    .eq('id', despachoId);
  return { error };
}

// Actualizar cantidad de ítem de despacho
async function actualizarCantidadItem(itemId, cantidad) {
  const { error } = await sb.from('despachos_items')
    .update({ cantidad }).eq('id', itemId);
  return { error };
}

// Actualizar serie de ítem de despacho
async function actualizarSerieItem(itemId, serie) {
  const { error } = await sb.from('despachos_items')
    .update({ serie }).eq('id', itemId);
  return { error };
}

// Actualizar paleta_pedido de ítem de despacho
async function actualizarPaletaPedidoItem(itemId, paletaPedido) {
  const { error } = await sb.from('despachos_items')
    .update({ paleta_pedido: paletaPedido }).eq('id', itemId);
  return { error };
}

// Limpiar TODOS los despachos y restaurar stock (solo para datos de prueba)
async function limpiarDatosPrueba() {
  // Restaurar stock a DISPONIBLE donde estaba RESERVADO
  await sb.from('stock')
    .update({ estado: 'DISPONIBLE', actualizado_en: new Date().toISOString() })
    .eq('estado', 'RESERVADO');

  // Eliminar todos los ítems y despachos
  await sb.from('despachos_items').delete().neq('id', 0);
  const { data, error } = await sb.from('despachos').delete().neq('id', 0).select();
  return { error, count: data?.length || 0 };
}

// Registrar ingreso desde Excel de ingresos (formato fijo de 10 columnas)
async function registrarIngresosDesdeExcel(filas) {
  const inserts = filas.map(f => ({
    sku: String(f.MATERIAL || '').trim().toUpperCase(),
    descripcion: String(f.DESCRIPCION || '').trim(),
    serie: f.SERIE && !String(f.SERIE).startsWith('-') ? String(f.SERIE).trim() : null,
    cantidad: Number(f.CANTIDAD_RECIBIDA) || 0,
    unidad_medida: 'UND',
    paleta_pedido: String(f.N_PEDIDO || '').trim(),
    cliente: String(f.CLIENTE || '').trim().toUpperCase(),
    gr_ingreso: String(f.N_GUIA || '').trim() || null,
    fecha_ingreso: f.FECHA ? new Date(f.FECHA).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    estado: 'DISPONIBLE',
    tipo: String(f.TIPO_INGRESO || f.tipo || 'INGRESO NUEVO').trim().toUpperCase(),
    condicion: String(f.TIPO_INGRESO || 'NUEVO').trim().toUpperCase(),
    observaciones: String(f.OBSERVACIONES || '').trim() || null,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString()
  })).filter(r => r.sku && r.cantidad > 0);

  if (!inserts.length) return { error: 'Sin filas válidas', count: 0 };

  const { data, error } = await sb.from('stock').insert(inserts).select();
  return { error, count: data?.length || 0 };
}

// ============================================================
// FUNCIONES — LPNs (Contenedores físicos de recepción)
// ============================================================

// Genera el siguiente código de LPN correlativo global
// Formato: LPN00001, LPN00002, LPN00003...
async function generarCodigoLPN() {
  const { data, error } = await sb
    .from('lpns')
    .select('codigo')
    .ilike('codigo', 'LPN%')
    .order('codigo', { ascending: false })
    .limit(1);

  let siguiente = 1;
  if (!error && data && data.length > 0) {
    const ultimo = data[0].codigo;
    const num = parseInt(ultimo.replace('LPN', ''), 10);
    if (!isNaN(num)) siguiente = num + 1;
  }
  return `LPN${String(siguiente).padStart(5, '0')}`;
}

// Crea un LPN nuevo
async function crearLPN({ codigo, cliente, n_guia, observaciones }) {
  const { data, error } = await sb
    .from('lpns')
    .insert([{
      codigo,
      cliente: cliente || null,
      n_guia: n_guia || null,
      observaciones: observaciones || null,
      estado: 'RECEPCION',
      ubicacion: 'RECEPCION'
    }])
    .select()
    .single();
  if (error) { console.error('crearLPN:', error); return { data: null, error }; }
  return { data, error: null };
}

// Asigna un LPN a un ítem de stock ya creado
async function asignarLPNAStock(stockId, lpnId, lpnCodigo) {
  const { error } = await sb
    .from('stock')
    .update({ lpn_id: lpnId, lpn_codigo: lpnCodigo, actualizado_en: new Date().toISOString() })
    .eq('id', stockId);
  return { error };
}

// Registra ítems en stock y los vincula a un LPN en una sola operación
async function registrarItemsEnLPN(lpnId, lpnCodigo, items) {
  const inserts = items.map(it => ({
    sku:              String(it.MATERIAL || it.sku || '').trim().toUpperCase(),
    descripcion:      String(it.DESCRIPCION || it.descripcion || '').trim(),
    serie:            (it.SERIE && !String(it.SERIE).startsWith('-')) ? String(it.SERIE).trim() : null,
    cantidad:         Number(it.CANTIDAD_RECIBIDA || it.cantidad) || 0,
    unidad_medida:    'UND',
    paleta_pedido:    String(it.N_PEDIDO || it.n_pedido || '').trim() || null,
    ubicacion_fisica: 'RECEPCION',
    cliente:          String(it.CLIENTE || it.cliente || '').trim().toUpperCase() || null,
    gr_ingreso:       String(it.N_GUIA || it.n_guia || '').trim() || null,
    fecha_ingreso:    new Date().toISOString().slice(0, 10),
    condicion:        String(it.TIPO_INGRESO || it.tipo_ingreso || 'NUEVO').trim().toUpperCase(),
    observaciones:    String(it.OBSERVACIONES || it.observaciones || '').trim() || null,
    estado:           'DISPONIBLE',
    tipo:             null,
    lpn_id:           lpnId,
    lpn_codigo:       lpnCodigo,
    creado_en:        new Date().toISOString(),
    actualizado_en:   new Date().toISOString()
  })).filter(r => r.sku && r.cantidad > 0);

  if (!inserts.length) return { error: 'Sin ítems válidos', count: 0 };

  const { data, error } = await sb.from('stock').insert(inserts).select('id, sku');
  if (error) { console.error('registrarItemsEnLPN:', error); return { error, count: 0 }; }

  // Kardex
  const kardexRows = (data || []).map(row => ({
    stock_id: row.id, sku: row.sku,
    tipo_movimiento: 'INGRESO',
    cantidad: inserts.find(i => i.sku === row.sku)?.cantidad || 0,
    referencia: lpnCodigo,
    usuario: null
  }));
  if (kardexRows.length) await sb.from('kardex').insert(kardexRows);

  return { error: null, count: data?.length || 0 };
}

// Obtener todos los LPNs con conteo de ítems
async function obtenerLPNs({ estado = null, cliente = null } = {}) {
  let query = sb
    .from('lpns')
    .select('*, stock(count)')
    .order('creado_en', { ascending: false });
  if (estado)  query = query.eq('estado', estado);
  if (cliente) query = query.eq('cliente', cliente);
  const { data, error } = await query;
  if (error) { console.error('obtenerLPNs:', error); return []; }
  return data || [];
}

// Obtener un LPN con todos sus ítems
async function obtenerLPNConItems(lpnId) {
  const { data: lpn, error: errL } = await sb
    .from('lpns').select('*').eq('id', lpnId).single();
  const { data: items, error: errI } = await sb
    .from('stock').select('*').eq('lpn_id', lpnId).order('sku');
  if (errL || errI) { console.error('obtenerLPNConItems:', errL || errI); return { lpn: null, items: [] }; }
  return { lpn, items: items || [] };
}

// Ubica un LPN en una ubicación física real
async function ubicarLPN(lpnId, ubicacion) {
  const { error: errLPN } = await sb
    .from('lpns')
    .update({ estado: 'UBICADO', ubicacion, actualizado_en: new Date().toISOString() })
    .eq('id', lpnId);
  if (errLPN) return { error: errLPN };

  const { error: errStock } = await sb
    .from('stock')
    .update({ ubicacion_fisica: ubicacion, actualizado_en: new Date().toISOString() })
    .eq('lpn_id', lpnId)
    .eq('estado', 'DISPONIBLE');

  return { error: errStock || null };
}

// Exportar ítems de recepción al formato de 10 columnas para Sharepoint
function exportarRecepcionAExcel(items, nombreArchivo) {
  const filas = items.map(it => ({
    FECHA:             it.FECHA || new Date().toLocaleDateString('es-PE'),
    CLIENTE:           it.CLIENTE || it.cliente || '',
    N_PEDIDO:          it.N_PEDIDO || it.paleta_pedido || '',
    MATERIAL:          it.MATERIAL || it.sku || '',
    DESCRIPCION:       it.DESCRIPCION || it.descripcion || '',
    SERIE:             it.SERIE || it.serie || '-',
    CANTIDAD_RECIBIDA: it.CANTIDAD_RECIBIDA || it.cantidad || 0,
    N_GUIA:            it.N_GUIA || it.gr_ingreso || '',
    TIPO_INGRESO:      it.TIPO_INGRESO || it.condicion || 'NUEVO',
    OBSERVACIONES:     it.OBSERVACIONES || it.observaciones || ''
  }));

  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');
  XLSX.writeFile(wb, nombreArchivo || 'recepcion_sharepoint.xlsx');
}

// Buscar ítem en stock por serie — identifica SKU y pedido automáticamente
async function buscarPorSerie(serie) {
  if (!serie) return null;
  const { data, error } = await sb
    .from('stock')
    .select('id, sku, descripcion, serie, paleta_pedido, cantidad, estado, cliente, tipo')
    .ilike('serie', serie.trim())
    .in('estado', ['DISPONIBLE', 'RESERVADO'])
    .limit(1)
    .single();
  if (error || !data) return null;
  return data;
}

// Generar lote de LPNs para impresión masiva
async function generarLoteLPN(cantidad) {
  const { data: ultimo } = await sb
    .from('lpns')
    .select('codigo')
    .ilike('codigo', 'LPN%')
    .order('codigo', { ascending: false })
    .limit(1);
  
  let inicio = 1;
  if (ultimo && ultimo.length > 0) {
    const num = parseInt(ultimo[0].codigo.replace('LPN', ''), 10);
    if (!isNaN(num)) inicio = num + 1;
  }
  
  const codigos = [];
  for (let i = 0; i < cantidad; i++) {
    codigos.push(`LPN${String(inicio + i).padStart(5, '0')}`);
  }
  return codigos;
}
