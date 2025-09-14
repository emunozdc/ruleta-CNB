/* script.js - ruleta estática, mobile-friendly, permite editar opciones y guardarlas en localStorage */

(() => {
  // --- Defaults
  const defaultOptions = [
    "Opcion 1",
    "Opcion 2",
    "Opcion 3",
    "Opcion 4",
    "Sorpresa"
  ];

  // --- DOM
  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d", { alpha: true });
  const spinBtn = document.getElementById("spinBtn");
  const applyBtn = document.getElementById("applyBtn");
  const optionsInput = document.getElementById("optionsInput");
  const resultEl = document.getElementById("result");
  const speedRange = document.getElementById("speedRange");
  const saveDefaultBtn = document.getElementById("saveDefaultBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");

  // --- State
  let options = [];
  let colors = [
    "#C8E6F0","#004D80"  ];
  let rotation = 0; // radians, current wheel rotation
  let spinning = false;
  let spinSpeed = 10; // valores mayores = más vueltas


  // --- Canvas sizing
  function resize() {
    const maxSize = Math.min(window.innerWidth - 40, 640);
    const cssSize = Math.max(260, maxSize);
    const dpi = window.devicePixelRatio || 1;

    canvas.style.width = cssSize + "px";
    canvas.style.height = cssSize + "px";
    canvas.width = Math.round(cssSize * dpi);
    canvas.height = Math.round(cssSize * dpi);
    ctx.setTransform(dpi, 0, 0, dpi, 0, 0);

    draw();
  }
  window.addEventListener("resize", resize);

  // --- Utilities
  function saveToLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  function loadFromLocal(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }

  // --- Load initial options
  function loadInitialOptions() {
    const saved = loadFromLocal("ruleta.options");
    if (saved && Array.isArray(saved) && saved.length) {
      options = saved;
    } else {
      options = defaultOptions.slice();
    }
    optionsInput.value = options.join("\n");
  }

  // --- Draw wheel
  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const size = Math.min(w, h);
    const cx = w / 2;
    const cy = h / 2;
    const radius = size / 2 - 4;

    ctx.clearRect(0, 0, w, h);
    if (!options.length) return;

    const slice = (2 * Math.PI) / options.length;

    // draw slices
    for (let i = 0; i < options.length; i++) {
      const start = -Math.PI / 2 + rotation + i * slice;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // label
      ctx.save();
      // move to center, rotate to slice center
      ctx.translate(cx, cy);
      ctx.rotate(start + slice / 2);
      // text position
      const textX = radius * 0.66;
      ctx.fillStyle = "white";
      ctx.font = `${Math.max(12, Math.round(size * 0.045))}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // wrap long labels
      const label = options[i];
      wrapText(ctx, label, textX, 0, radius * 0.55, Math.round(size * 0.045) + 2);
      ctx.restore();
    }
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    // center lines vertically
    const totalHeight = lines.length * lineHeight;
    const startY = y - totalHeight / 2 + lineHeight / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
  }

  // --- Spin logic
  function spin() {
    if (spinning || options.length === 0) return;
    spinning = true;
    resultEl.textContent = "";
    const n = options.length;
    const slice = (2 * Math.PI) / n;

    // pick a random target index
    const targetIndex = Math.floor(Math.random() * n);

    // spins controlled by speed slider
    const spins = spinSpeed + Math.floor(Math.random() * 3);

    // desiredAngleAtTop is the angle (measured from start of wheel) that should be at the top
    const desiredAngleAtTop = (targetIndex + 0.5) * slice; // center of target slice

    // compute final absolute rotation R_final such that (-R_final mod 2pi) == desiredAngleAtTop
    // choose k so that R_final >= rotation + minDelta
    const minDelta = spins * 2 * Math.PI;
    const twoPi = 2 * Math.PI;

    // find smallest integer k satisfying: -desired + k*2pi >= rotation + minDelta
    const k = Math.ceil((rotation + minDelta + desiredAngleAtTop) / twoPi);
    const Rfinal = -desiredAngleAtTop + k * twoPi;
    const delta = Rfinal - rotation;

    const duration = 2500 + Math.floor(Math.random() * 900); // ms

    const start = performance.now();
    const startRot = rotation;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 5); }

    function animate(now) {
      const elapsed = now - start;
      let t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      rotation = startRot + delta * eased;
      draw();
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        spinning = false;
        // compute selected index
        const angleAtTop = ((-rotation % twoPi) + twoPi) % twoPi;
        const selected = Math.floor(angleAtTop / slice) % n;
        // mostrar modal
        const modal = document.getElementById("resultModal");
        const modalText = document.getElementById("modalText");
        modalText.textContent = options[selected];
        modal.style.display = "block";

        // cerrar modal al pulsar la X
        document.getElementById("closeModal").onclick = () => {
          modal.style.display = "none";
        };

        // cerrar modal al pulsar fuera del contenido
        window.onclick = (event) => {
          if (event.target === modal) {
            modal.style.display = "none";
          }
        };


      }
    }
    requestAnimationFrame(animate);
  }

  // --- Apply options from textarea
  function applyOptionsFromInput(saveToStorage=false) {
    const raw = optionsInput.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (raw.length === 0) {
      options = [];
    } else {
      options = raw;
    }
    saveToLocal("ruleta.options", options);
    draw();
  }

  // --- Export / Import
  function exportOptions() {
    const data = JSON.stringify(options, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ruleta-opciones.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (Array.isArray(arr) && arr.length) {
          options = arr.map(String);
          optionsInput.value = options.join("\n");
          saveToLocal("ruleta.options", options);
          draw();
          alert("Importado correctamente.");
        } else {
          alert("JSON no válido: debe ser un array de strings.");
        }
      } catch (e) {
        alert("Error leyendo JSON: " + e.message);
      }
    };
    reader.readAsText(file);
  }
  


  // --- Events
  spinBtn.addEventListener("click", spin);
  applyBtn.addEventListener("click", () => applyOptionsFromInput(true));

  // keyboard: Enter+Ctrl aplica
  optionsInput.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey && ev.key === "Enter") { applyOptionsFromInput(true); }
  });

  // initialize
  loadInitialOptions();
  resize();
  // initial draw after fonts settle
  setTimeout(draw, 40);
})();
