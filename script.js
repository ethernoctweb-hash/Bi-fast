(() => {
  "use strict";
  const STORAGE_KEY = "biFastTableEditorData_v2";
  const defaults = [
    {username:"user_01", nominal:50000, fee:2500, total:47500, status:"Success"},
    {username:"user_02", nominal:100000, fee:2500, total:97500, status:"Menunggu"},
    {username:"user_03", nominal:200000, fee:2500, total:197500, status:"Success"},
    {username:"user_04", nominal:500000, fee:2500, total:497500, status:"Menunggu"},
    {username:"user_05", nominal:1000000, fee:2500, total:997500, status:"Success"}
  ];
  const $ = id => document.getElementById(id);
  const tableBody=$("tableBody"), editor=$("editor"), rowSelect=$("rowSelect");
  const usernameInput=$("usernameInput"), nominalInput=$("nominalInput");
  const feeInput=$("feeInput"), totalInput=$("totalInput"), statusInput=$("statusInput");
  const autoTotal=$("autoTotal"), toast=$("toast");
  let data=loadData(), selectedIndex=0, editOpen=false;

  const number = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const cloneDefaults = () => defaults.map(row=>({...row}));
  function sanitize(row){
    return {
      username:String(row.username ?? "").slice(0,40),
      nominal:number(row.nominal), fee:number(row.fee), total:number(row.total),
      status:row.status==="Success" ? "Success" : "Menunggu"
    };
  }
  function loadData(){
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      const parsed=saved ? JSON.parse(saved) : null;
      if(Array.isArray(parsed) && parsed.length) return parsed.map(sanitize);
    }catch(e){}
    return cloneDefaults();
  }
  function rupiah(value){return "Rp "+number(value).toLocaleString("id-ID");}
  function esc(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function renderTable(){
    tableBody.innerHTML=data.map(row=>{
      const ok=row.status==="Success";
      return `<tr>
        <td>${esc(row.username||"—")}</td>
        <td>${rupiah(row.nominal)}</td>
        <td class="money">${rupiah(row.fee)}</td>
        <td class="money">${rupiah(row.total)}</td>
        <td><span class="status-badge ${ok?"success":"waiting"}"><span class="status-icon">${ok?"✓":"◷"}</span><span>${ok?"Success":"Menunggu"}</span></span></td>
      </tr>`;
    }).join("");
  }
  function renderOptions(){
    rowSelect.innerHTML=data.map((r,i)=>`<option value="${i}">Baris ${i+1} — ${esc(r.username||"Tanpa username")}</option>`).join("");
    if(data.length) rowSelect.value=String(Math.min(selectedIndex,data.length-1));
  }
  function toastMsg(message,error=false){
    toast.textContent=message;
    toast.style.color=error?"#ff9aa9":"#78f2c4";
  }
  function calc(){
    totalInput.disabled=autoTotal.checked;
    if(autoTotal.checked) totalInput.value=String(Math.max(0,number(nominalInput.value)-number(feeInput.value)));
  }
  function fillForm(index){
    if(!data.length)return;
    selectedIndex=Math.max(0,Math.min(index,data.length-1));
    renderOptions();
    const r=data[selectedIndex];
    usernameInput.value=r.username; nominalInput.value=r.nominal;
    feeInput.value=r.fee; totalInput.value=r.total; statusInput.value=r.status;
    calc();
  }
  function readForm(){
    if(!usernameInput.value.trim()){
      toastMsg("Username tidak boleh kosong.",true);
      usernameInput.focus();return false;
    }
    const nominal=number(nominalInput.value), fee=number(feeInput.value);
    data[selectedIndex]={
      username:usernameInput.value.trim().slice(0,40),
      nominal,fee,
      total:autoTotal.checked?Math.max(0,nominal-fee):number(totalInput.value),
      status:statusInput.value==="Success"?"Success":"Menunggu"
    };
    renderTable();renderOptions();
    return true;
  }
  function openEditor(){
    editOpen=true;editor.hidden=false;
    $("toggleEditor").textContent="⚙️ Tutup Editor Data";
    fillForm(selectedIndex);
  }
  function closeEditor(){
    editOpen=false;editor.hidden=true;
    $("toggleEditor").textContent="⚙️ Pengaturan / Edit Data";
  }
  function save(){
    if(editOpen&&!readForm())return;
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
      renderTable();renderOptions();
      toastMsg("Perubahan berhasil disimpan di perangkat ini.");
    }catch(e){toastMsg("Gagal menyimpan. Periksa ruang penyimpanan browser.",true);}
  }
  function addRow(){
    if(editOpen&&!readForm())return;
    data.push({username:`user_${String(data.length+1).padStart(2,"0")}`,nominal:0,fee:2500,total:0,status:"Menunggu"});
    selectedIndex=data.length-1;renderTable();renderOptions();
    if(!editOpen)openEditor();else fillForm(selectedIndex);
    toastMsg("Baris baru ditambahkan. Edit lalu simpan perubahan.");
  }
  function deleteRow(){
    if(data.length<=1){toastMsg("Minimal harus ada satu baris.",true);return;}
    if(!confirm(`Hapus baris ${selectedIndex+1}?`))return;
    data.splice(selectedIndex,1);selectedIndex=Math.max(0,selectedIndex-1);
    renderTable();fillForm(selectedIndex);
    toastMsg("Baris dihapus. Tekan Simpan Perubahan untuk menyimpan.");
  }
  function reset(){
    if(!confirm("Kembalikan lima baris ke data contoh awal?"))return;
    data=cloneDefaults();selectedIndex=0;
    try{localStorage.removeItem(STORAGE_KEY);}catch(e){}
    renderTable();fillForm(0);
    toastMsg("Data contoh awal berhasil dipulihkan.");
  }
  async function download(target,filename){
    try{
      if(document.fonts?.ready) await document.fonts.ready;
      await new Promise(resolve=>setTimeout(resolve,150));
      if(typeof window.html2canvas!=="function"){
        toastMsg("html2canvas belum termuat. Periksa koneksi internet lalu coba lagi.",true);return;
      }
      const canvas=await window.html2canvas(target,{
        scale:Math.max(2,window.devicePixelRatio||1),
        backgroundColor:"#03132e",useCORS:true,logging:false,
        scrollX:0,scrollY:0
      });
      const link=document.createElement("a");
      link.download=filename;link.href=canvas.toDataURL("image/png");
      document.body.appendChild(link);link.click();link.remove();
      toastMsg(`PNG berhasil dibuat: ${filename}`);
    }catch(error){
      console.error(error);toastMsg("Ekspor PNG gagal. Coba muat ulang halaman.",true);
    }
  }

  $("toggleEditor").addEventListener("click",()=>editOpen?closeEditor():openEditor());
  $("closeEditor").addEventListener("click",closeEditor);
  $("cancelEdit").addEventListener("click",closeEditor);
  $("addRow").addEventListener("click",addRow);
  $("deleteRow").addEventListener("click",deleteRow);
  $("saveBtn").addEventListener("click",save);
  $("resetBtn").addEventListener("click",reset);
  $("downloadTable").addEventListener("click",()=>download($("dataTable"),"bi-fast-table.png"));
  $("downloadFull").addEventListener("click",()=>download($("exportArea"),"bi-fast-full.png"));
  rowSelect.addEventListener("change",()=>{
    if(editOpen&&!readForm())return;
    fillForm(Number(rowSelect.value));
  });
  [usernameInput,nominalInput,feeInput,totalInput,statusInput].forEach(el=>{
    el.addEventListener("input",()=>{
      if(el===nominalInput||el===feeInput)calc();
      if(editOpen)readForm();
    });
    el.addEventListener("change",()=>{if(editOpen)readForm();});
  });
  autoTotal.addEventListener("change",()=>{calc();if(editOpen)readForm();});

  renderTable();fillForm(0);
})();