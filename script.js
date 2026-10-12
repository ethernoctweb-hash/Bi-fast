(() => {
  "use strict";
  const STORAGE_KEY = "biFastTableEditorData_v1";
  const defaults = [
    { username: "user_01", nominal: 50000, fee: 2500, total: 47500, status: "Success" },
    { username: "user_02", nominal: 100000, fee: 2500, total: 97500, status: "Menunggu" },
    { username: "user_03", nominal: 200000, fee: 2500, total: 197500, status: "Success" },
    { username: "user_04", nominal: 500000, fee: 2500, total: 497500, status: "Menunggu" },
    { username: "user_05", nominal: 1000000, fee: 2500, total: 997500, status: "Success" }
  ];
  const $ = id => document.getElementById(id);
  const tableBody = $("tableBody"), editor = $("editor"), rowSelect = $("rowSelect");
  const usernameInput = $("usernameInput"), nominalInput = $("nominalInput");
  const feeInput = $("feeInput"), totalInput = $("totalInput"), statusInput = $("statusInput");
  const autoTotal = $("autoTotal"), toast = $("toast");
  let data = loadData();
  let selectedIndex = 0;
  let editOpen = false;
  let editorSnapshot = null;

  function cloneDefaults() { return defaults.map(row => ({...row})); }
  function validRow(row) {
    const statuses = ["Success", "Menunggu"];
    return {
      username: String(row.username ?? "").slice(0, 40),
      nominal: safeNumber(row.nominal),
      fee: safeNumber(row.fee),
      total: safeNumber(row.total),
      status: statuses.includes(row.status) ? row.status : "Menunggu"
    };
  }
  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }
  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed.map(validRow);
    } catch (e) { /* Gunakan data awal jika penyimpanan tidak valid. */ }
    return cloneDefaults();
  }
  function rupiah(value) {
    return "Rp " + safeNumber(value).toLocaleString("id-ID");
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[char]));
  }
  function renderTable() {
    tableBody.innerHTML = data.map((row, index) => {
      const success = row.status === "Success";
      return `<tr data-row="${index}">
        <td>${escapeHTML(row.username || "—")}</td>
        <td>${rupiah(row.nominal)}</td>
        <td class="money">${rupiah(row.fee)}</td>
        <td class="money">${rupiah(row.total)}</td>
        <td><span class="status-badge ${success ? "success" : "waiting"}"><span class="status-icon">${success ? "✓" : "◷"}</span><span>${success ? "Success" : "Menunggu"}</span></span></td>
      </tr>`;
    }).join("");
  }
  function renderRowOptions() {
    const old = selectedIndex;
    rowSelect.innerHTML = data.map((row, i) =>
      `<option value="${i}">Baris ${i + 1} — ${escapeHTML(row.username || "Tanpa username")}</option>`
    ).join("");
    selectedIndex = Math.max(0, Math.min(old, data.length - 1));
    rowSelect.value = String(selectedIndex);
  }
  function calculateTotal() {
    if (autoTotal.checked) {
      const total = Math.max(0, safeNumber(nominalInput.value) - safeNumber(feeInput.value));
      totalInput.value = String(total);
      totalInput.disabled = true;
    } else {
      totalInput.disabled = false;
    }
  }
  function fillForm(index) {
    selectedIndex = Math.max(0, Math.min(index, data.length - 1));
    const row = data[selectedIndex];
    rowSelect.value = String(selectedIndex);
    usernameInput.value = row.username;
    nominalInput.value = row.nominal;
    feeInput.value = row.fee;
    totalInput.value = row.total;
    statusInput.value = row.status;
    calculateTotal();
  }
  function updateCurrentFromForm() {
    if (!data.length) return;
    const username = usernameInput.value.trim();
    if (!username) {
      showToast("Username tidak boleh kosong.", true);
      usernameInput.focus();
      return false;
    }
    const nominal = safeNumber(nominalInput.value);
    const fee = safeNumber(feeInput.value);
    const total = autoTotal.checked ? Math.max(0, nominal - fee) : safeNumber(totalInput.value);
    data[selectedIndex] = {
      username, nominal, fee, total,
      status: statusInput.value === "Success" ? "Success" : "Menunggu"
    };
    renderTable();
    renderRowOptions();
    rowSelect.value = String(selectedIndex);
    return true;
  }
  function syncFormToData() {
    if (!updateCurrentFromForm()) return false;
    return true;
  }
  function showToast(message, error = false) {
    toast.textContent = message;
    toast.style.color = error ? "#ff9aa9" : "#78f2c4";
  }
  function saveData() {
    if (editOpen && !syncFormToData()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (editOpen) editorSnapshot = data.map(row => ({...row}));
      renderTable();
      renderRowOptions();
      showToast("Perubahan tersimpan di perangkat ini.");
    } catch (e) {
      showToast("Penyimpanan lokal gagal. Periksa ruang penyimpanan browser.", true);
    }
  }
  function openEditor() {
    editorSnapshot = data.map(row => ({...row}));
    editOpen = true;
    editor.hidden = false;
    renderRowOptions();
    fillForm(selectedIndex);
    $("toggleEditor").textContent = "⚙️ Tutup Editor Data";
    editor.scrollIntoView({behavior:"smooth", block:"nearest"});
  }
  function closeEditor() {
    editOpen = false;
    editorSnapshot = null;
    editor.hidden = true;
    $("toggleEditor").textContent = "⚙️ Pengaturan / Edit Data";
  }
  function addRow() {
    if (editOpen && !syncFormToData()) return;
    data.push({username:`user_${String(data.length + 1).padStart(2,"0")}`, nominal:0, fee:2500, total:0, status:"Menunggu"});
    selectedIndex = data.length - 1;
    renderTable(); renderRowOptions();
    if (editOpen) fillForm(selectedIndex);
    else openEditor();
    showToast("Baris baru ditambahkan. Edit datanya lalu simpan.");
  }
  function deleteRow() {
    if (data.length <= 1) { showToast("Minimal harus ada satu baris.", true); return; }
    if (!confirm(`Hapus baris ${selectedIndex + 1}?`)) return;
    data.splice(selectedIndex, 1);
    selectedIndex = Math.max(0, selectedIndex - 1);
    renderTable(); renderRowOptions(); fillForm(selectedIndex);
    showToast("Baris terpilih dihapus. Tekan Simpan Perubahan untuk menyimpan.");
  }
  function resetData() {
    if (!confirm("Kembalikan tabel ke lima data contoh awal? Data tersimpan akan diganti.")) return;
    data = cloneDefaults(); selectedIndex = 0;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    renderTable(); renderRowOptions();
    if (editOpen) fillForm(0);
    showToast("Data contoh awal berhasil dipulihkan.");
  }
  async function downloadPNG(target, filename) {
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise(resolve => {
        const images = Array.from(target.querySelectorAll("img"));
        if (!images.length || images.every(img => img.complete)) return resolve();
        let remaining = images.filter(img => !img.complete).length;
        images.filter(img => !img.complete).forEach(img => {
          const done = () => { remaining--; if (remaining <= 0) resolve(); };
          img.addEventListener("load", done, {once:true});
          img.addEventListener("error", done, {once:true});
        });
        setTimeout(resolve, 1800);
      });
      if (typeof window.html2canvas !== "function") {
        showToast("Ekspor PNG membutuhkan koneksi internet untuk memuat html2canvas.", true);
        return;
      }
      const canvas = await window.html2canvas(target, {
        scale: Math.max(2, window.devicePixelRatio || 1),
        backgroundColor: "#03132e",
        useCORS: true,
        logging: false,
        scrollX: 0, scrollY: 0
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link); link.click(); link.remove();
      showToast(`Berhasil menyiapkan ${filename}.`);
    } catch (error) {
      console.error(error);
      showToast("Ekspor gagal. Coba buka ulang halaman dan pastikan CDN dapat diakses.", true);
    }
  }

  $("toggleEditor").addEventListener("click", () => editOpen ? closeEditor() : openEditor());
  $("closeEditor").addEventListener("click", closeEditor);
  $("cancelEdit").addEventListener("click", () => {
    if (editorSnapshot) data = editorSnapshot.map(row => ({...row}));
    selectedIndex = Math.max(0, Math.min(selectedIndex, data.length - 1));
    renderTable(); renderRowOptions(); fillForm(selectedIndex);
    closeEditor();
    showToast("Perubahan editor dibatalkan.");
  });
  $("addRow").addEventListener("click", addRow);
  $("deleteRow").addEventListener("click", deleteRow);
  $("saveBtn").addEventListener("click", saveData);
  $("resetBtn").addEventListener("click", resetData);
  $("downloadTable").addEventListener("click", () => downloadPNG($("dataTable"), "bi-fast-table.png"));
$("downloadTable").addEventListener("click", () => {
  downloadPNG($("exportArea"), "bi-fast-header-dan-tabel.png");
});
  rowSelect.addEventListener("change", () => {
    const nextIndex = Number(rowSelect.value);
    if (editOpen && !syncFormToData()) return;
    fillForm(nextIndex);
  });
  [usernameInput, nominalInput, feeInput, totalInput, statusInput, autoTotal].forEach(input => {
    input.addEventListener("input", () => {
      if (input === nominalInput || input === feeInput || input === autoTotal) calculateTotal();
      if (editOpen) updateCurrentFromForm();
    });
    input.addEventListener("change", () => {
      if (editOpen) updateCurrentFromForm();
    });
  });

  renderTable();
  renderRowOptions();
  fillForm(0);
})();