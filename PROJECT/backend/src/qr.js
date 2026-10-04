const QRCode = require('./vendor/QRCode');
const QRErrorCorrectLevel = require('./vendor/QRCode/QRErrorCorrectLevel');
function escapeXml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}
function toSvg(text, { size = 320, margin = 4, dark = '#171512', light = '#fffdf8' } = {}) {
    const qr = new QRCode(-1, QRErrorCorrectLevel.M);
    qr.addData(String(text));
    qr.make();
    const n = qr.getModuleCount(), total = n + margin * 2;
    let d = '';
    for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
            if (qr.isDark(r, c)) {
                const x = c + margin, y = r + margin;
                d += `M${x} ${y}h1v1h-1z`;
            }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR code for ${escapeXml(text)}"><rect width="${total}" height="${total}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}
module.exports = { toSvg };
