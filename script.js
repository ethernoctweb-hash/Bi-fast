
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

  const tableBody = $("tableBody");
  const editor = $("editor");
  const rowSelect = $("rowSelect");
  const usernameInput = $("usernameInput");
  const nominalInput = $("nominalInput");
  const feeInput = $("feeInput");
  const totalInput = $("totalInput");
  const statusInput = $("statusInput");
  const autoTotal = $("autoTotal");
  const toast = $("toast");

  let data = loadData();
  let selectedIndex = 0;
  let editOpen = false;
  let editorSnapshot = null;
  let exportBusy = false;

  function cloneRows(rows) {
    return rows.map(row => ({ ...row }));
  }

  function cloneDefaults() {
    return cloneRows(defaults);
  }

  function safeNumber(value) {
    if (value === "" || value === null || value === undefined) return 0;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0
      ? Math.floor(number)
      : 0;
  }

  function validRow(row) {
    const statuses = ["Success", "Menunggu"];

    return {
      username: String(row?.username ?? "").trim().slice(0, 40),
      nominal: safeNumber(row?.nominal),
      fee: safeNumber(row?.fee),
      total: safeNumber(row?.total),
      status: statuses.includes(row?.status)
        ? row.status
        : "Menunggu"
    };
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(validRow);
      }
    } catch (error) {
      console.warn("Data lokal tidak dapat dibaca.", error);
    }

    return cloneDefaults();
  }

  function rupiah(value) {
    return "Rp " + safeNumber(value).toLocaleString("id-ID");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function renderTable() {
    tableBody.innerHTML = data.map((row, index) => {
      const success = row.status === "Success";

      return `
        <tr data-row="${index}">
          <td>${escapeHTML(row.username || "—")}</td>
          <td>${rupiah(row.nominal)}</td>
          <td class="money">${rupiah(row.fee)}</td>
          <td class="money">${rupiah(row.total)}</td>
          <td>
            <span class="status-badge ${success ? "success" : "waiting"}">
              <span class="status-icon" aria-hidden="true">${success ? "✓" : "◷"}</span>
              <span class="status-text">${success ? "Success" : "Menunggu"}</span>
            </span>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderRowOptions() {
    if (!data.length) data = cloneDefaults();

    selectedIndex = Math.max(
      0,
      Math.min(selectedIndex, data.length - 1)
    );

    rowSelect.innerHTML = data.map((row, index) => `
      <option value="${index}">
        Baris ${index + 1} — ${escapeHTML(row.username || "Tanpa username")}
      </option>
    `).join("");

    rowSelect.value = String(selectedIndex);
  }

  function calculateTotal() {
    const automatic = autoTotal.checked;

    totalInput.disabled = automatic;

    if (automatic) {
      const nominal = safeNumber(nominalInput.value);
      const fee = safeNumber(feeInput.value);

      totalInput.value = String(Math.max(0, nominal - fee));
    }
  }

  function fillForm(index) {
    if (!data.length) data = cloneDefaults();

    selectedIndex = Math.max(
      0,
      Math.min(Number(index) || 0, data.length - 1)
    );

    const row = data[selectedIndex];

    rowSelect.value = String(selectedIndex);
    usernameInput.value = row.username;
    nominalInput.value = String(row.nominal);
    feeInput.value = String(row.fee);
    totalInput.value = String(row.total);
    statusInput.value = row.status;

    calculateTotal();
  }

  function showToast(message, error = false) {
    toast.textContent = message;
    toast.style.color = error ? "#ff9aa9" : "#78f2c4";
  }

  function updateCurrentFromForm(options = {}) {
    if (!data.length) return false;

    const username = usernameInput.value.trim();

    if (!username) {
      if (!options.silent) {
        showToast("Username tidak boleh kosong.", true);
        usernameInput.focus();
      }
      return false;
    }

    const nominal = safeNumber(nominalInput.value);
    const fee = safeNumber(feeInput.value);

    const total = autoTotal.checked
      ? Math.max(0, nominal - fee)
      : safeNumber(totalInput.value);

    data[selectedIndex] = {
      username: username.slice(0, 40),
      nominal,
      fee,
      total,
      status: statusInput.value === "Success"
        ? "Success"
        : "Menunggu"
    };

    renderTable();
    renderRowOptions();
    rowSelect.value = String(selectedIndex);

    return true;
  }

  function syncFormToData(options = {}) {
    return updateCurrentFromForm(options);
  }

  function saveData() {
    if (editOpen && !syncFormToData()) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      if (editOpen) {
        editorSnapshot = cloneRows(data);
      }

      showToast("Perubahan berhasil disimpan di perangkat ini.");
    } catch (error) {
      console.error("Penyimpanan gagal:", error);
      showToast("Penyimpanan gagal. Periksa ruang browser.", true);
    }
  }

  function openEditor() {
    editorSnapshot = cloneRows(data);
    editOpen = true;
    editor.hidden = false;

    renderRowOptions();
    fillForm(selectedIndex);

    $("toggleEditor").textContent = "⚙️ Tutup Editor Data";

    editor.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  function closeEditor() {
    editOpen = false;
    editorSnapshot = null;
    editor.hidden = true;

    $("toggleEditor").textContent = "⚙️ Pengaturan / Edit Data";
  }

  function addRow() {
    if (editOpen && !syncFormToData()) return;

    data.push({
      username: `user_${String(data.length + 1).padStart(2, "0")}`,
      nominal: 0,
      fee: 2500,
      total: 0,
      status: "Menunggu"
    });

    selectedIndex = data.length - 1;

    renderTable();
    renderRowOptions();

    if (editOpen) {
      fillForm(selectedIndex);
    } else {
      openEditor();
    }

    showToast("Baris baru ditambahkan. Edit data lalu simpan.");
  }

  function deleteRow() {
    if (data.length <= 1) {
      showToast("Minimal harus ada satu baris.", true);
      return;
    }

    if (!confirm(`Hapus baris ${selectedIndex + 1}?`)) return;

    data.splice(selectedIndex, 1);
    selectedIndex = Math.max(0, selectedIndex - 1);

    renderTable();
    renderRowOptions();

    if (editOpen) fillForm(selectedIndex);

    showToast("Baris dihapus. Tekan Simpan Perubahan untuk menyimpan.");
  }

  function resetData() {
    if (!confirm("Kembalikan tabel ke lima data contoh awal? Data tersimpan akan diganti.")) {
      return;
    }

    data = cloneDefaults();
    selectedIndex = 0;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Penyimpanan lokal tidak dapat dihapus.", error);
    }

    renderTable();
    renderRowOptions();

    if (editOpen) {
      fillForm(0);
      editorSnapshot = cloneRows(data);
    }

    showToast("Data contoh awal berhasil dipulihkan.");
  }

  function waitForImage(img, timeoutMs = 10000) {
    if (img.complete) {
      return Promise.resolve(img.naturalWidth > 0);
    }

    return new Promise(resolve => {
      let finished = false;

      const done = result => {
        if (finished) return;
        finished = true;

        clearTimeout(timer);
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onError);

        resolve(result);
      };

      const onLoad = () => done(img.naturalWidth > 0);
      const onError = () => done(false);
      const timer = setTimeout(() => done(false), timeoutMs);

      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", onError, { once: true });
    });
  }

  async function downloadPNG(target, filename) {
    if (exportBusy) {
      showToast("Ekspor sedang berjalan. Tunggu sampai selesai.", true);
      return;
    }

    exportBusy = true;

    const downloadButtons = [
      $("downloadTable"),
      $("downloadFull")
    ];

    downloadButtons.forEach(button => {
      if (button) button.disabled = true;
    });

    try {
      if (!target) {
        throw new Error("Area yang akan diekspor tidak ditemukan.");
      }

      if (typeof window.html2canvas !== "function") {
        throw new Error("html2canvas belum dimuat. Periksa koneksi internet.");
      }

      const images = Array.from(target.querySelectorAll("img"));
      const imageResults = await Promise.all(
        images.map(img => waitForImage(img))
      );

      if (imageResults.some(result => !result)) {
        throw new Error(
          "Gambar header gagal dimuat. Periksa lokasi file gambar."
        );
      }

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await window.html2canvas(target, {
        scale: 2,
        backgroundColor: "#03132e",
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 10000,
        scrollX: 0,
        scrollY: 0,

        onclone: clonedDocument => {
          clonedDocument.querySelectorAll(".status-badge").forEach(badge => {
            badge.style.color = "#ffffff";
            badge.style.fontFamily = "Arial, Helvetica, sans-serif";
            badge.style.fontWeight = "700";
            badge.style.textShadow = "none";
            badge.style.filter = "none";
            badge.style.webkitTextFillColor = "#ffffff";
          });

          clonedDocument.querySelectorAll(".status-badge span").forEach(span => {
            span.style.color = "#ffffff";
            span.style.opacity = "1";
            span.style.visibility = "visible";
            span.style.textShadow = "none";
            span.style.webkitTextFillColor = "#ffffff";
          });

          clonedDocument.querySelectorAll(".status-text").forEach(label => {
            label.style.display = "inline";
            label.style.fontSize = "12px";
            label.style.lineHeight = "1.3";
            label.style.whiteSpace = "nowrap";
          });
        }
      });

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!blob) {
        throw new Error("Browser gagal membuat file PNG.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 5000);

      showToast(`Berhasil mengunduh ${filename}.`);
    } catch (error) {
      console.error("Ekspor PNG gagal:", error);
      showToast(
        error.message || "Ekspor gagal. Coba muat ulang halaman.",
        true
      );
    } finally {
      exportBusy = false;

      downloadButtons.forEach(button => {
        if (button) button.disabled = false;
      });
    }
  }

  // Event editor
  $("toggleEditor").addEventListener("click", () => {
    if (editOpen) {
      closeEditor();
    } else {
      openEditor();
    }
  });

  $("closeEditor").addEventListener("click", closeEditor);

  $("cancelEdit").addEventListener("click", () => {
    if (editorSnapshot) {
      data = cloneRows(editorSnapshot);
    }

    selectedIndex = Math.max(
      0,
      Math.min(selectedIndex, data.length - 1)
    );

    renderTable();
    renderRowOptions();
    fillForm(selectedIndex);
    closeEditor();

    showToast("Perubahan editor dibatalkan.");
  });

  $("addRow").addEventListener("click", addRow);
  $("deleteRow").addEventListener("click", deleteRow);
  $("saveBtn").addEventListener("click", saveData);
  $("resetBtn").addEventListener("click", resetData);

  // PENTING: masing-masing tombol hanya memiliki satu listener.
  // Download tabel = header + tabel + footer.
  $("downloadTable").addEventListener("click", () => {
    downloadPNG(
      $("exportArea"),
      "bi-fast-header-dan-tabel.png"
    );
  });

  // Download seluruh tampilan = seluruh aplikasi.
  $("downloadFull").addEventListener("click", () => {
    downloadPNG(
      document.querySelector(".app"),
      "bi-fast-seluruh-tampilan.png"
    );
  });

  rowSelect.addEventListener("change", () => {
    const nextIndex = Number(rowSelect.value);

    if (editOpen && !syncFormToData()) {
      rowSelect.value = String(selectedIndex);
      return;
    }

    fillForm(nextIndex);
  });

  [
    usernameInput,
    nominalInput,
    feeInput,
    totalInput,
    statusInput,
    autoTotal
  ].forEach(input => {
    input.addEventListener("input", () => {
      if (
        input === nominalInput ||
        input === feeInput ||
        input === autoTotal
      ) {
        calculateTotal();
      }

      if (editOpen) {
        updateCurrentFromForm({ silent: true });
      }
    });

    input.addEventListener("change", () => {
      if (editOpen) {
        updateCurrentFromForm({ silent: true });
      }
    });
  });

  renderTable();
  renderRowOptions();
  fillForm(0);
})();
