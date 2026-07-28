// ==========================================
// 🏢 MULTI-TENANT CONFIGURATION (?id=) & SECURITY
// ==========================================

// 1. Daftar Instansi (ID) dan Link Exec masing-masing
const TENANT_CONFIG = {
    "demo": "https://script.google.com/macros/s/AKfycbyVmRT-AnOYKZ4PBjvU9fX0H5VpO3WbE_YMR4fRLS_18fQ8BDcWBizHBqouotSJnKPh/exec", // Ganti dengan link Exec Sekolah 1
    "sekolah2": "https://script.google.com/macros/s/AKfycb..._link_sekolah2/exec", // Ganti dengan link Exec Sekolah 2
    "dinas": "https://script.google.com/macros/s/AKfycb..._link_dinas/exec"         // Ganti dengan link Exec Dinas
    // Tambahkan ID lainnya di sini...
};

// 2. Deteksi ID dari URL (Contoh: namaweb.com/?id=sekolah1)
const urlParams = new URLSearchParams(window.location.search);
let currentTenantId = urlParams.get('id');

// Jika tidak ada di URL, cek memori browser (siapa tahu sebelumnya sudah pernah buka)
if (!currentTenantId) {
    currentTenantId = localStorage.getItem('SIMPEEL_ACTIVE_ID');
}

// Jika masih kosong atau ID tidak terdaftar, arahkan ke default
if (!currentTenantId || !TENANT_CONFIG[currentTenantId]) {
    currentTenantId = "sekolah1"; // Default ID jika tidak mengetikkan ?id=
}

// Simpan ID aktif ke memori
localStorage.setItem('SIMPEEL_ACTIVE_ID', currentTenantId);

// 3. Set API URL & Konstanta Keamanan
const API_URL = TENANT_CONFIG[currentTenantId];
const API_KEY = "SIMPEEL_SECURE_2026_XYZ_999"; // Harus sama dengan di Code.gs

// Isolasi Penyimpanan (Agar data sekolah 1 dan 2 tidak bercampur di laptop yang sama)
const TOKEN_KEY = "SIMPEEL_TOKEN_" + currentTenantId.toUpperCase();
const QUEUE_KEY = "SIMPEEL_QUEUE_" + currentTenantId.toUpperCase();
const CACHE_KEY = "SIMPEEL_CACHE_" + currentTenantId.toUpperCase();

console.log(`[SiMPeEL] Berjalan untuk ID: ${currentTenantId}`);



// ==========================================
// 🛡️ API CALL ENGINE (Aman & Fix Bug Login)
// ==========================================
async function apiCall(action, data = null) {
    if (!API_URL) return { success: false, message: "Aplikasi sedang offline / tidak terhubung ke API" };
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                apiKey: API_KEY, 
                action: action, 
                data: data 
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        
        // --- PERBAIKAN BUG DI SINI ---
        // Jika perintahnya untuk mengambil data (berawalan 'get'), kembalikan isi datanya (Array/Object)
        if (action.startsWith('get')) {
            return (result && result.success) ? result.data : null;
        }
        // Jika perintahnya aksi (login, save, delete, batchSync), kembalikan seluruh statusnya (Sukses/Gagal)
        return result;

    } catch (e) {
        console.error("API Call Error:", e);
        return { success: false, message: e.message };
    }
}


// ==========================================
// 📥 SISTEM ANTREAN LOKAL (Batch Sync)
// ==========================================
window.queueManager = {
    getQueue: function() {
        return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    },
    addQueue: function(actionType, dataPayload) {
        let queue = this.getQueue();
        queue.push({ action: actionType, data: dataPayload, timestamp: new Date().getTime() });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        this.updateBadge();
    },
    clearQueue: function() {
        localStorage.removeItem(QUEUE_KEY);
        this.updateBadge();
    },
    updateBadge: function() {
        const q = this.getQueue();
        console.log(`[Antrean] Tersisa: ${q.length} data menunggu sinkronisasi.`);
        // Jika Anda ingin membuat notifikasi di tombol Sync, bisa ditambahkan logikanya di sini
    },
    syncToServer: async function() {
        const queue = this.getQueue();
        if (queue.length === 0) {
            Swal.fire('Info', 'Tidak ada data antrean yang perlu disinkronkan.', 'info');
            return;
        }

        Swal.fire({
            title: 'Sinkronisasi...',
            text: `Mengirim ${queue.length} antrean ke server. Jangan tutup halaman ini.`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const res = await apiCall('batchSync', queue);
        
        if (res && res.success) {
            this.clearQueue();
            Swal.fire('✅ Sukses!', res.message || 'Sinkronisasi berhasil', 'success');
            await dbManager.forceFetchFromServer(); // Refresh data utama
        } else {
            Swal.fire('❌ Gagal', 'Sinkronisasi gagal. Coba lagi saat koneksi internet stabil.', 'error');
        }
    }
};


// ==========================================
// 🗄️ DATABASE MANAGER (Cache & Queue)
// ==========================================
const dbManager = {
    // Variabel penyimpan data sementara (Cache) agar super cepat
    localData: JSON.parse(localStorage.getItem(CACHE_KEY)) || [],

    init: async function() { 
        if (API_URL) this.forceFetchFromServer();
        window.queueManager.updateBadge();
        return true; 
    },

    forceFetchFromServer: async function() {
        if (!API_URL) return;
        const res = await apiCall('getAllPegawai');
        if (Array.isArray(res)) {
            this.localData = res;
            localStorage.setItem(CACHE_KEY, JSON.stringify(res));
            // Otomatis refresh UI di background (opsional)
            if (document.getElementById('wrapper').classList.contains('d-none') === false) {
                initApp(); 
            }
        }
    },

    getAllPegawai: async function() {
        return this.localData; // Selalu panggil lokal agar 0 detik loading
    },

    savePegawai: async function(data) {
        // Update Cache Lokal
        let index = this.localData.findIndex(p => p.nip === data.nip);
        if (index !== -1) this.localData[index] = data;
        else this.localData.push(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(this.localData));

        // Tambah ke Antrean (Untuk dikirim ke Server saat Sinkronisasi)
        window.queueManager.addQueue('SAVE', data);
        return { success: true };
    },

    deletePegawai: async function(nip) {
        // Hapus dari Cache Lokal
        this.localData = this.localData.filter(p => p.nip !== nip);
        localStorage.setItem(CACHE_KEY, JSON.stringify(this.localData));

        // Tambah ke Antrean
        window.queueManager.addQueue('DELETE', nip);
        return { success: true };
    },

    // Pengaturan & Keamanan (Langsung ke API, tanpa antrean)
    savePengaturan: async function(data) {
        if (!API_URL) return { success: false };
        return await apiCall('savePengaturan', data);
    },
    getPengaturan: async function() {
        if (!API_URL) return {};
        return await apiCall('getPengaturan') || {};
    }
};


// ==========================================
// PENGATURAN & TEMA LOGIC
// ==========================================
async function simpanPengaturan() {
    const existingData = await dbManager.getPengaturan();
    const data = {
        ...existingData,
        instansi: document.getElementById('set_instansi').value,
        opd: document.getElementById('set_opd').value,
        sekolah: document.getElementById('set_sekolah').value,
        hp: document.getElementById('set_hp').value,
        alamat: (document.getElementById('set_alamat_text') || document.getElementById('set_alamat'))?.value || '',
        email: document.getElementById('set_email').value,
        web: document.getElementById('set_web').value,
        logoInstansi: document.getElementById('previewLogoInstansi').src,
        logoSekolah: document.getElementById('previewLogoSekolah').src
    };
    
    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    await dbManager.savePengaturan(data);
    loadPengaturan();
    Swal.fire('Berhasil!', 'Pengaturan berhasil disimpan ke Server!', 'success');
}

async function simpanTemaBackground() {
    const existingData = await dbManager.getPengaturan();
    const bgImg = document.getElementById('previewBgLanding').src;
    // Don't save default placeholder as background
    const bgToSave = bgImg.includes('logo-simpeel.png') ? '' : bgImg;
    
    const data = {
        ...existingData,
        warnaTema: document.getElementById('set_warna_tema').value,
        bgLanding: bgToSave
    };
    
    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    await dbManager.savePengaturan(data);
    applyTheme(data.warnaTema, data.bgLanding);
    Swal.fire('Berhasil!', 'Tema dan Background berhasil disimpan ke Server!', 'success');
}

function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function applyTheme(warnaTema, bgLanding) {
    if (warnaTema) {
        const darker = adjustColor(warnaTema, -40);
        document.documentElement.style.setProperty('--primary', warnaTema);
        document.documentElement.style.setProperty('--primary-dark', darker);
    }
    
    const landingView = document.getElementById('spa-landing-view');
    if (landingView) {
        if (bgLanding && bgLanding.startsWith('data:')) {
            landingView.style.backgroundImage = `url(${bgLanding})`;
        } else {
            landingView.style.backgroundImage = 'var(--gradient-primary)';
        }
    }
}

async function simpanKeamanan() {
    const data = {
        username: document.getElementById('set_username').value,
        password: document.getElementById('set_password').value
    };
    if (API_URL) {
        Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const res = await apiCall('saveConfig', data);
        if (res && res.success) {
            Swal.fire('Berhasil!', 'Data keamanan tersimpan di Server!', 'success');
        } else {
            Swal.fire('Gagal!', 'Gagal menyimpan keamanan', 'error');
        }
    } else {
        Swal.fire('Offline', 'Anda tidak terhubung ke API', 'warning');
    }
}

function togglePasswordVisibility() {
    const p = document.getElementById('set_password');
    p.type = (p.type === 'password') ? 'text' : 'password';
}

async function loadPengaturan() {
    const data = await dbManager.getPengaturan();
    if (data.instansi) {
        document.getElementById('set_instansi').value = data.instansi;
        const txtInstansi = document.getElementById('textInstansi');
        if (txtInstansi) txtInstansi.innerText = data.instansi;
    }
    if (data.opd) document.getElementById('set_opd').value = data.opd;
    if (data.sekolah) {
        document.getElementById('set_sekolah').value = data.sekolah;
        const txtSekolah = document.getElementById('textSekolah');
        if (txtSekolah) txtSekolah.innerText = data.sekolah;
    }
    if (data.hp) document.getElementById('set_hp').value = data.hp;
    if (data.alamat) {
        const el = document.getElementById('set_alamat_text') || document.getElementById('set_alamat');
        if (el) el.value = data.alamat;
    }
    if (data.email) document.getElementById('set_email').value = data.email;
    if (data.web) document.getElementById('set_web').value = data.web;
    if (data.logoInstansi && data.logoInstansi.startsWith('data:')) {
        document.getElementById('previewLogoInstansi').src = data.logoInstansi;
        const imgInst = document.getElementById('imgInstansi');
        if (imgInst) imgInst.src = data.logoInstansi;
    }
    if (data.logoSekolah && data.logoSekolah.startsWith('data:')) {
        document.getElementById('previewLogoSekolah').src = data.logoSekolah;
        const imgSek = document.getElementById('imgSekolah');
        if (imgSek) imgSek.src = data.logoSekolah;
    }

    if (data.warnaTema) document.getElementById('set_warna_tema').value = data.warnaTema;
    if (data.bgLanding && data.bgLanding.startsWith('data:')) document.getElementById('previewBgLanding').src = data.bgLanding;
    
    applyTheme(data.warnaTema, data.bgLanding);

    if (API_URL) {
        const config = await apiCall('getConfig');
        if (config && config.username) {
            document.getElementById('set_username').value = config.username;
            document.getElementById('set_password').value = config.password;
        }
    }
}


// ==========================================
// INIT APP & DOM EVENTS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await dbManager.init();
    loadPengaturan();
    checkSSOSession();
    initApp();

    const modalPegawai = document.getElementById('modalPegawai');
    if (modalPegawai) {
        modalPegawai.addEventListener('show.bs.modal', function () {
            this.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            const firstTab = this.querySelector('#formPegawaiTabs .nav-link[data-bs-target="#f-pribadi"]');
            if (firstTab && window.bootstrap) {
                new bootstrap.Tab(firstTab).show();
            }
        });

        modalPegawai.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey) {
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                const current = parseFloat(document.body.style.zoom || 1);
                document.body.style.zoom = Math.min(current + 0.1, 2.5).toFixed(1);
            } else if (e.key === '-') {
                e.preventDefault();
                const current = parseFloat(document.body.style.zoom || 1);
                document.body.style.zoom = Math.max(current - 0.1, 0.5).toFixed(1);
            } else if (e.key === '0') {
                e.preventDefault();
                document.body.style.zoom = '1';
            }
        }
    });

    const toggleSetPwd = document.getElementById('toggleSetPassword');
    if (toggleSetPwd) toggleSetPwd.addEventListener('click', togglePasswordVisibility);

    const toggleLoginPwd = document.getElementById('toggleLoginPassword');
    const loginPwd = document.getElementById('inputPassword');
    if (toggleLoginPwd && loginPwd) {
        toggleLoginPwd.addEventListener('click', function (e) {
            const type = loginPwd.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPwd.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('inputUsername').value;
            const pass = document.getElementById('inputPassword').value;

            if(!user || !pass) return;

            if (API_URL) {
                Swal.fire({ title: 'Authenticating...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
                const result = await apiCall('login', { username: user, password: pass });
                
                if (result && result.success) {
                    localStorage.setItem(TOKEN_KEY, JSON.stringify({ displayName: user }));
                    document.getElementById('inputUsername').value = '';
                    document.getElementById('inputPassword').value = '';
                    Swal.close();
                    checkSSOSession();
                } else {
                    Swal.fire('Gagal!', result ? (result.message || 'Username atau Password salah!') : 'Gagal terhubung ke API Server', 'error');
                }
            } else {
                Swal.fire('Offline', 'Tidak terhubung ke API', 'error');
            }
        });
    }
});


// ==========================================
// SPA & NAVIGATION
// ==========================================
function checkSSOSession() {
    const ssoToken = localStorage.getItem(TOKEN_KEY);
    const wrapper = document.getElementById('wrapper');
    const landingView = document.getElementById('spa-landing-view');
    const loginView = document.getElementById('spa-login-view');
    
    if (!ssoToken) {
        if (wrapper) wrapper.classList.add('d-none');
        if (loginView) loginView.classList.add('d-none');
        if (landingView) landingView.classList.remove('d-none');
        return;
    }

    try {
        const data = JSON.parse(ssoToken);
        if (data.displayName) document.getElementById('topName').textContent = data.displayName;
        if (landingView) landingView.classList.add('d-none');
        if (loginView) loginView.classList.add('d-none');
        if (wrapper) wrapper.classList.remove('d-none');
    } catch(e) {}
}

function showLoginView() {
    const landingView = document.getElementById('spa-landing-view');
    const loginView = document.getElementById('spa-login-view');
    if (landingView) landingView.classList.add('d-none');
    if (loginView) loginView.classList.remove('d-none');
}

function showLandingView() {
    const landingView = document.getElementById('spa-landing-view');
    const loginView = document.getElementById('spa-login-view');
    if (loginView) loginView.classList.add('d-none');
    if (landingView) landingView.classList.remove('d-none');
}

function nav(page) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const targetPage = document.getElementById('view-' + page);
    if (targetPage) targetPage.classList.remove('d-none');

    const targetNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (targetNav) targetNav.classList.add('active');

    // Memicu render tabel dari pegawai.js
    if (page === 'pegawai') renderTabelPNS();
    if (page === 'duk') renderTabelDUK();
    if (page === 'gaji') renderTabelKGB();
    if (page === 'rekap') renderTabelRekap();
    if (page === 'riwayat') renderTabelRiwayat();
    if (page === 'pensiun') renderTabelPensiun();
}

async function logoutSSO() {
    const result = await Swal.fire({
        title: 'Keluar?',
        text: 'Anda akan keluar dari SiMPeEL',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Keluar'
    });
    if(result.isConfirmed) {
        localStorage.removeItem(TOKEN_KEY);
        checkSSOSession();
    }
}

async function initApp() {
    const allPegawai = await dbManager.getAllPegawai();
    let pns = 0, pppk = 0, pppkpw = 0, honorer = 0;
    
    allPegawai.forEach(p => {
        if(p.statusKepegawaian !== 'Aktif') return;
        if (p.statusPegawai === 'PNS') pns++;
        else if (p.statusPegawai === 'PPPK') pppk++;
        else if (p.statusPegawai === 'PPPK Paruh Waktu') pppkpw++;
        else if (p.statusPegawai === 'Honorer') honorer++;
    });

    const elPns = document.getElementById('count-pns');
    const elPppk = document.getElementById('count-pppk');
    const elPppkpw = document.getElementById('count-pppkpw');
    const elHonorer = document.getElementById('count-honorer');
    
    if(elPns) elPns.innerText = pns;
    if(elPppk) elPppk.innerText = pppk;
    if(elPppkpw) elPppkpw.innerText = pppkpw;
    if(elHonorer) elHonorer.innerText = honorer;

    const ctx = document.getElementById('pegawaiChart');
    if (ctx) {
        if(window.myPieChart) window.myPieChart.destroy();
        window.myPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['PNS', 'PPPK', 'PPPK PW', 'Honorer'],
                datasets: [{
                    data: [pns, pppk, pppkpw, honorer],
                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'],
                    hoverBackgroundColor: ['#2e59d9', '#17a673', '#2c9faf', '#dda20a'],
                    hoverBorderColor: "rgba(234, 236, 244, 1)",
                }],
            },
            options: {
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'bottom' } }
            },
        });
    }

    const sidebarToggle = document.getElementById('sidebarToggleTop');
    if(sidebarToggle && !sidebarToggle.dataset.bound) {
        sidebarToggle.dataset.bound = "true";
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('toggled');
        });
    }
    
    const kgbContainer = document.getElementById('kgb-notifications');
    if(kgbContainer) {
        kgbContainer.innerHTML = '';
        let countNotif = 0;
        const currDate = new Date();
        allPegawai.forEach(p => {
            if(p.statusKepegawaian === 'Aktif' && p.tmtKgbBaru) {
                const kgbDate = new Date(p.tmtKgbBaru);
                const diffTime = Math.abs(kgbDate - currDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 90 && kgbDate > currDate) {
                    countNotif++;
                    const typeClass = diffDays <= 30 ? 'alert-danger' : 'alert-warning';
                    kgbContainer.innerHTML += `
                        <div class="alert ${typeClass}">
                            <i class="fas fa-bell"></i> <b>${p.nama}</b> (${p.statusPegawai}) - Gaji Berkala dalam ${diffDays} hari.
                        </div>
                    `;
                }
            }
        });
        
        if(countNotif === 0) {
            kgbContainer.innerHTML = `<div class="alert alert-success">Tidak ada pengingat KGB dalam waktu dekat.</div>`;
        }
        kgbContainer.innerHTML += `<button class="btn btn-outline-primary btn-sm w-100 mt-2" onclick="nav('gaji')">Lihat Semua Data</button>`;
    }
}


// ==========================================
// CROPPER.JS LOGIC
// ==========================================
let cropper = null;
let currentPreviewId = '';

function openCropper(input, previewId, ratio) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentPreviewId = previewId;
            const image = document.getElementById('imageToCrop');
            image.src = e.target.result;
            
            const modal = new bootstrap.Modal(document.getElementById('modalCropper'));
            modal.show();
            
            document.getElementById('modalCropper').addEventListener('shown.bs.modal', function () {
                if (cropper) cropper.destroy();
                cropper = new Cropper(image, {
                    aspectRatio: ratio,
                    viewMode: 1,
                    autoCropArea: 1
                });
            }, { once: true });
        }
        reader.readAsDataURL(input.files[0]);
    }
    input.value = ''; 
}

function doCrop() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas();
    const base64Image = canvas.toDataURL('image/png');
    document.getElementById(currentPreviewId).src = base64Image;
    
    bootstrap.Modal.getInstance(document.getElementById('modalCropper')).hide();
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}


// ==========================================
// EXCELJS LOGIC (Export Data)
// ==========================================
async function exportToExcel(tableId, fileName) {
    const table = $('#' + tableId).DataTable();
    const data = table.rows({ search: 'applied' }).data().toArray(); 
    const headers = [];
    $('#' + tableId + ' thead th').each(function() {
        headers.push($(this).text().trim());
    });
    
    if (headers[headers.length-1].toLowerCase() === 'aksi') {
        headers.pop();
        data.forEach(row => row.pop());
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');
    const totalCols = headers.length;
    const lastColLetter = String.fromCharCode(64 + totalCols);

    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = fileName.toUpperCase().replace(/_/g, ' ');
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(`A2:${lastColLetter}2`);
    const schoolCell = worksheet.getCell('A2');
    schoolCell.value = document.getElementById('textSekolah')?.innerText || "INSTANSI / SEKOLAH"; 
    schoolCell.font = { name: 'Arial', size: 12, bold: true };
    schoolCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(`A3:${lastColLetter}3`);
    const yearCell = worksheet.getCell('A3');
    yearCell.value = "TAHUN " + new Date().getFullYear();
    yearCell.font = { name: 'Arial', size: 12, bold: true };
    yearCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const headerRow = worksheet.getRow(5);
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let currentRow = 6;
    data.forEach(rowData => {
        const cleanRow = rowData.map(html => {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            return temp.textContent || temp.innerText || '';
        });
        const r = worksheet.getRow(currentRow);
        cleanRow.forEach((val, i) => {
            const cell = r.getCell(i + 1);
            cell.value = val;
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        currentRow++;
    });

    for (let i = 1; i <= totalCols; i++) {
        const column = worksheet.getColumn(i);
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) maxLength = columnLength;
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
    }

    const sigStartRow = currentRow + 2;
    const sigColStart = Math.max(1, totalCols - 1); 
    const sigColEnd = totalCols;
    const sigColLetterStart = String.fromCharCode(64 + sigColStart);
    const sigColLetterEnd = String.fromCharCode(64 + sigColEnd);

    if (totalCols > 1) {
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow}:${sigColLetterEnd}${sigStartRow}`);
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow + 1}:${sigColLetterEnd}${sigStartRow + 1}`);
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow + 5}:${sigColLetterEnd}${sigStartRow + 5}`);
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow + 6}:${sigColLetterEnd}${sigStartRow + 6}`);
        worksheet.mergeCells(`${sigColLetterStart}${sigStartRow + 7}:${sigColLetterEnd}${sigStartRow + 7}`);
    }

    worksheet.getCell(`${sigColLetterStart}${sigStartRow}`).value = "Mengetahui,";
    worksheet.getCell(`${sigColLetterStart}${sigStartRow}`).alignment = { horizontal: 'center' };

    worksheet.getCell(`${sigColLetterStart}${sigStartRow + 1}`).value = "Pimpinan / Kepala";
    worksheet.getCell(`${sigColLetterStart}${sigStartRow + 1}`).alignment = { horizontal: 'center' };

    const nameCell = worksheet.getCell(`${sigColLetterStart}${sigStartRow + 5}`);
    nameCell.value = "______________________";
    nameCell.font = { bold: true, underline: true };
    nameCell.alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName + '.xlsx');
}


// ==========================================
// BACKUP & RESTORE JSON STUBS
// ==========================================
async function backupDataJSON() {
    Swal.fire('Informasi', 'Pada versi Online, seluruh data otomatis tercadangkan dan tersimpan dengan aman di Google Spreadsheet (Google Drive) Anda. Anda bisa mengunduhnya langsung dari sana.', 'info');
}

async function restoreDataJSON() {
    Swal.fire('Informasi', 'Pada versi Online, proses restore dilakukan dengan cara mengatur langsung file Google Spreadsheet yang ada di Google Drive Anda.', 'info');
}

function showPrivacyPolicy(e) {
    e.preventDefault();
    if (window.bootstrap) {
        const modal = new bootstrap.Modal(document.getElementById('modalPrivacy'));
        modal.show();
    }
}

window.currentEditStatusNip = null;
window.currentKgbNip = null;
