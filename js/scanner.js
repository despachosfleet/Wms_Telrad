// ============================================================
// ESCÁNER — Html5Qrcode montado en body, no destruye la vista
// ============================================================

let _scannerActivo = null;

async function cargarHtml5Qrcode() {
  if (window.Html5Qrcode) return;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function abrirEscaner(containerId, onResultado, onError) {
  // Si ya hay un escáner activo, cerrarlo primero
  if (_scannerActivo) await cerrarEscaner();

  await cargarHtml5Qrcode();

  // Calcular tamaño del qrbox según pantalla
  const ancho  = Math.min(window.innerWidth,  window.innerHeight) * 0.72;
  const alto   = ancho * 0.55;

  // Crear overlay en body — nunca toca el contenido del módulo
  const overlay = document.createElement('div');
  overlay.id = 'scanner-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:9999;
    background:#000; display:flex; flex-direction:column;
  `;
  overlay.innerHTML = `
    <div style="padding:12px 16px; display:flex; justify-content:space-between;
      align-items:center; background:rgba(0,0,0,.7); flex-shrink:0;">
      <div>
        <div style="color:#fff; font-size:13px; font-weight:600;">Escanear código</div>
        <div style="color:#aaa; font-size:11px;">Centra el código dentro del recuadro</div>
      </div>
      <button id="btn-cerrar-scanner" style="background:rgba(255,255,255,.15);
        border:1px solid rgba(255,255,255,.3); border-radius:8px;
        color:#fff; font-size:13px; padding:6px 14px; cursor:pointer;">✕ Cerrar</button>
    </div>
    <div id="scanner-reader" style="flex:1; display:flex; align-items:center; justify-content:center;"></div>
    <div style="padding:12px; text-align:center; color:#888; font-size:11px; flex-shrink:0;">
      Si no escanea, escribe el código manualmente y presiona Enter
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btn-cerrar-scanner')
    ?.addEventListener('click', () => cerrarEscaner());

  try {
    _scannerActivo = new Html5Qrcode('scanner-reader');
    await _scannerActivo.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: { width: Math.floor(ancho), height: Math.floor(alto) },
        aspectRatio: window.innerWidth / window.innerHeight,
      },
      (decodedText) => {
        cerrarEscaner();
        onResultado(decodedText.trim());
      },
      () => { /* errores de frame — normal mientras enfoca */ }
    );
  } catch (e) {
    cerrarEscaner();
    if (onError) onError(e.message || 'No se pudo acceder a la cámara.');
  }
}

async function cerrarEscaner() {
  if (_scannerActivo) {
    try { await _scannerActivo.stop(); } catch(e) { /* ya detenido */ }
    _scannerActivo = null;
  }
  document.getElementById('scanner-overlay')?.remove();
}
