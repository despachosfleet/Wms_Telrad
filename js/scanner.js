// ============================================================
// ESCANER DE CODIGO DE BARRAS / QR (camara del celular)
// Usa html5-qrcode (CDN), soporta tanto QR como codigos de
// barras 1D (CODE128, etc), comunes en etiquetas de series.
// Todo el procesamiento es local, no sube nada a ningun servidor.
// ============================================================

let _html5QrcodeLoaded = false;
async function cargarHtml5Qrcode() {
  if (_html5QrcodeLoaded || typeof Html5Qrcode !== 'undefined') { _html5QrcodeLoaded = true; return; }
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  _html5QrcodeLoaded = true;
}

let _scannerActivo = null;

// Abre un escaner en pantalla completa (modal simple) dentro del
// elemento con id `containerId`. Llama a onResultado(texto) apenas
// detecta un codigo, y cierra el escaner automaticamente.
async function abrirEscaner(containerId, onResultado, onError) {
  await cargarHtml5Qrcode();

  const contenedor = document.getElementById(containerId);
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div id="scanner-overlay" style="position:fixed; inset:0; background:#000; z-index:9999; display:flex; flex-direction:column;">
      <div style="padding:14px; display:flex; justify-content:space-between; align-items:center; background:#111;">
        <span style="color:#fff; font-size:13px;">Apunta al código de barras o QR</span>
        <button id="btn-cerrar-scanner" style="background:none; border:none; color:#fff; font-size:20px; padding:4px 10px;">✕</button>
      </div>
      <div id="scanner-reader" style="flex:1;"></div>
    </div>
  `;

  document.getElementById('btn-cerrar-scanner').addEventListener('click', () => cerrarEscaner());

  try {
    _scannerActivo = new Html5Qrcode('scanner-reader');
    await _scannerActivo.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        cerrarEscaner();
        onResultado(decodedText);
      },
      () => { /* errores de frame individual, se ignoran (normal mientras enfoca) */ }
    );
  } catch (e) {
    cerrarEscaner();
    if (onError) onError(e.message || 'No se pudo acceder a la cámara.');
  }
}

async function cerrarEscaner() {
  const overlay = document.getElementById('scanner-overlay');
  if (_scannerActivo) {
    try { await _scannerActivo.stop(); } catch (e) { /* ya estaba detenido */ }
    _scannerActivo = null;
  }
  if (overlay) overlay.remove();
}
