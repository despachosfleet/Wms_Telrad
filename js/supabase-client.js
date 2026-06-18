// ============================================================
// CONEXION A SUPABASE - WMS TELRAD
// ============================================================

const SUPABASE_URL = "https://nrciozyymgbmjdmocytv.supabase.co";
const SUPABASE_KEY = "sb_publishable_5cyMRd3a69GfRc0whR2-8Q_D58YatQX";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// FUNCIONES DE ACCESO A DATOS - STOCK
// ============================================================

async function buscarStockAvanzado({ sku = '', serie = '', ubic = '', paleta = '', cliente = '', estado = '', orden = 'id', dir = 'asc', limit = 200 } = {}) {
  let query = sb.from('stock').select('*');

  if (sku) query = query.ilike('sku', `%${sku.trim()}%`);
  if (serie) query = query.ilike('serie', `%${serie.trim()}%`);
  if (ubic) query = query.ilike('ubicacion_fisica', `%${ubic.trim()}%`);
  if (paleta) query = query.ilike('paleta_pedido', `%${paleta.trim()}%`);
  if (cliente) query = query.eq('cliente', cliente);
  if (estado) query = query.eq('estado', estado);

  query = query.order(orden, { ascending: dir === 'asc' }).limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error('Error buscarStockAvanzado:', error);
    return { data: [], error };
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

async function crearDespacho({ gr, fecha, cliente, destino, contrata, consignatarios, observaciones, items }) {
  // 1. Crear cabecera del despacho
  const { data: despacho, error: errDespacho } = await sb
    .from('despachos')
    .insert([{
      gr: gr || null,
      fecha: fecha || null,
      cliente: cliente || null,
      destino: destino || null,
      contrata: contrata || null,
      consignatarios: consignatarios || null,
      observaciones: observaciones || null,
      status: 'PENDIENTE'
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

async function obtenerDespachosPendientes() {
  const { data, error } = await sb
    .from('despachos')
    .select('*')
    .eq('status', 'PENDIENTE')
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error obtenerDespachosPendientes:', error);
    return [];
  }
  return data || [];
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
async function confirmarPicking(itemDespachoId, stockId, cantidadPickeada, usuario = '') {
  // 1. Obtener stock actual
  const { data: stockRow, error: errGet } = await sb
    .from('stock')
    .select('*')
    .eq('id', stockId)
    .single();

  if (errGet || !stockRow) {
    return { error: errGet || new Error('Stock no encontrado') };
  }

  const nuevaCantidad = Math.max(0, Number(stockRow.cantidad) - Number(cantidadPickeada));
  const nuevoEstado = nuevaCantidad <= 0 ? 'DESPACHADO' : stockRow.estado;

  // 2. Actualizar stock
  const { error: errUpdate } = await sb
    .from('stock')
    .update({ cantidad: nuevaCantidad, estado: nuevoEstado, actualizado_en: new Date().toISOString() })
    .eq('id', stockId);

  if (errUpdate) return { error: errUpdate };

  // 3. Registrar en kardex
  const { error: errKardex } = await sb
    .from('kardex')
    .insert([{
      stock_id: stockId,
      sku: stockRow.sku,
      tipo_movimiento: 'SALIDA',
      cantidad: cantidadPickeada,
      referencia: 'Picking',
      usuario: usuario || null
    }]);

  if (errKardex) console.error('Error kardex:', errKardex);

  // 4. Marcar item de despacho como pickeado
  const { error: errItem } = await sb
    .from('despachos_items')
    .update({ observaciones: 'PICKEADO: ' + cantidadPickeada })
    .eq('id', itemDespachoId);

  if (errItem) console.error('Error item despacho:', errItem);

  return { error: null, nuevaCantidad, nuevoEstado };
}

async function finalizarDespacho(despachoId) {
  const { error } = await sb
    .from('despachos')
    .update({ status: 'DESPACHADO' })
    .eq('id', despachoId);
  return { error };
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

async function obtenerKardex({ sku = '', limit = 50 } = {}) {
  let query = sb.from('kardex').select('*').order('fecha', { ascending: false }).limit(limit);
  if (sku) query = query.ilike('sku', `%${sku}%`);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

// ============================================================
// FUNCIONES - GUIAS PENDIENTES (carga masiva desde Excel)
// ============================================================

async function guardarGuiasPendientes(guias) {
  // Solo inserta GRs que no esten ya pendientes (evita duplicar
  // si se vuelve a subir el mismo Excel). El indice unico en
  // Supabase tambien protege esto a nivel de base de datos.
  const filas = guias.map(g => ({
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
    .upsert(filas, { onConflict: 'gr', ignoreDuplicates: true })
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
