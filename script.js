// ==========================================
// 🏢 MULTI-TENANT CONFIGURATION (?id=) & SECURITY
// VERSI ONLINE (REAL-TIME DIRECT TO DATABASE)
// ==========================================

// 1. Daftar Instansi (ID) dan Link Exec masing-masing
const TENANT_CONFIG = {
    "demo": "https://script.google.com/macros/s/AKfycbxex0FHG_eUf8F0dxWbxhsk7ro6pOo5zXtL38EDbMBulp2hKRQRHEb1hdWUzRaAwA1n/exec", // Ganti dengan link Exec
    "sekolah2": "https://script.google.com/macros/s/AKfycb..._link_sekolah2/exec",
    "dinas": "https://script.google.com/macros/s/AKfycb..._link_dinas/exec"
};

// 2. Deteksi ID dari URL (Contoh: namaweb.com/?id=sekolah1)
const urlParams = new URLSearchParams(window.location.search);
let currentTenantId = urlParams.get('id');

if (!currentTenantId) {
    currentTenantId = localStorage.getItem('SIMPEEL_ACTIVE_ID');
}

if (!currentTenantId || !TENANT_CONFIG[currentTenantId]) {
    currentTenantId = "sekolah1"; // Default
}

localStorage.setItem('SIMPEEL_ACTIVE_ID', currentTenantId);

// 3. Set API URL & Konstanta Keamanan
const API_URL = TENANT_CONFIG[currentTenantId];
const API_KEY = "SIMPEEL_SECURE_2026_XYZ_999";

// Isolasi Penyimpanan Memory
const TOKEN_KEY = "SIMPEEL_TOKEN_" + currentTenantId.toUpperCase();
const CACHE_KEY = "SIMPEEL_CACHE_" + currentTenantId.toUpperCase();

console.log(`[SiMPeEL Online] Berjalan untuk ID: ${currentTenantId}`);


// ==========================================
// 🛡️ API CALL ENGINE (Direct Server Access)
// ==========================================
async function apiCall(action, data = null) {
    if (!API_URL) return { success: false, message: "Aplikasi tidak terhubung ke API" };
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

        // Membedakan perintah GET (tarik data) dan perintah POST (simpan/hapus)
        if (action.startsWith('get')) {
            return (result && result.success) ? result.data : null;
        }
        return result;

    } catch (e) {
        console.error("API Call Error:", e);
        return { success: false, message: e.message };
    }
}


// ==========================================
// 🗄️ DATABASE MANAGER (Real-Time Database)
// ==========================================
const dbManager = {
    // Cache Lokal HANYA untuk kecepatan BACA data di layar
    localData: JSON.parse(localStorage.getItem(CACHE_KEY)) || [],

    init: async function () {
        if (API_URL) this.forceFetchFromServer();
        return true;
    },

    // Tarik data terbaru dari Server secara Background
    forceFetchFromServer: async function () {
        if (!API_URL) return;
        const res = await apiCall('getAllPegawai');
        if (Array.isArray(res)) {
            this.localData = res;
            localStorage.setItem(CACHE_KEY, JSON.stringify(res));
            // Otomatis refresh UI 
            if (document.getElementById('wrapper').classList.contains('d-none') === false) {
                initApp();
            }
        }
    },

    getAllPegawai: async function () {
        return this.localData; // Baca dari memori agar pindah menu tidak ada loading
    },

    // LANGSUNG SIMPAN KE SERVER GOOGLE SHEETS
    savePegawai: async function (data) {
        if (!API_URL) throw new Error("Aplikasi offline / tidak terhubung ke API");

        // Menampilkan loading UI saat menembak ke server
        Swal.fire({ title: 'Menyimpan ke Server...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

        const res = await apiCall('savePegawai', data);

        if (res && res.success) {
            // Jika sukses di server, baru kita update memori lokal agar UI ikut terupdate
            let index = this.localData.findIndex(p => p.nip === data.nip);
            if (index !== -1) this.localData[index] = data;
            else this.localData.push(data);
            localStorage.setItem(CACHE_KEY, JSON.stringify(this.localData));
            return res;
        } else {
            throw new Error((res && res.message) ? res.message : "Gagal menyimpan ke database");
        }
    },

    // LANGSUNG HAPUS DARI SERVER GOOGLE SHEETS
    deletePegawai: async function (nip) {
        if (!API_URL) throw new Error("Aplikasi offline / tidak terhubung ke API");

        Swal.fire({ title: 'Menghapus dari Server...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

        const res = await apiCall('deletePegawai', nip);

        if (res && res.success) {
            // Hapus dari memori lokal
            this.localData = this.localData.filter(p => p.nip !== nip);
            localStorage.setItem(CACHE_KEY, JSON.stringify(this.localData));
            return res;
        } else {
            throw new Error((res && res.message) ? res.message : "Gagal menghapus dari database");
        }
    },

    // Pengaturan & Keamanan (Langsung ke Server)
    getPengaturan: async function () {
        if (!API_URL) return { success: false };
        return await apiCall('getPengaturan');
    },

    getAllAkun: async function () {
        if (!API_URL) return { success: false };
        return await apiCall('getAllAkun');
    },
    saveAkun: async function (data) {
        if (!API_URL) return { success: false };
        Swal.fire({ title: 'Menyimpan Akun...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        return await apiCall('saveAkun', data);
    },
    deleteAkun: async function (nip) {
        if (!API_URL) return { success: false };
        Swal.fire({ title: 'Menghapus Akun...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        return await apiCall('deleteAkun', nip);
    },

    savePengaturan: async function (data) {
        if (!API_URL) return { success: false };
        return await apiCall('savePengaturan', data);
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
        email: document.getElementById('set_email')?.value || '',
        web: document.getElementById('set_web')?.value || '',
        kepsekNama: document.getElementById('set_kepsek_nama')?.value || '',
        kepsekNip: document.getElementById('set_kepsek_nip')?.value || '',
        bendaharaNama: document.getElementById('set_bendahara_nama')?.value || '',
        bendaharaNip: document.getElementById('set_bendahara_nip')?.value || '',
        logoInstansi: document.getElementById('previewLogoInstansi').src,
        logoSekolah: document.getElementById('previewLogoSekolah').src,
        updatedAt: new Date().toISOString()
    };

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    await dbManager.savePengaturan(data);
    loadPengaturan();
    Swal.fire('Berhasil!', 'Pengaturan berhasil disimpan ke Server!', 'success');
}

async function simpanTemaBackground() {
    const existingData = await dbManager.getPengaturan();
    const bgImg = document.getElementById('previewBgLanding').src;
    const bgToSave = bgImg.includes('logo-simpeel.png') ? '' : bgImg;

    const data = {
        ...existingData,
        warnaTema: document.getElementById('set_warna_tema').value,
        bgLanding: bgToSave,
        updatedAt: new Date().toISOString()
    };

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    await dbManager.savePengaturan(data);
    applyTheme(data.warnaTema, data.bgLanding);
    Swal.fire('Berhasil!', 'Tema dan Background berhasil disimpan ke Server!', 'success');
}

function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
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
        const sideNama = document.getElementById('sidebar-sekolah-nama');
        if (sideNama) sideNama.innerText = data.sekolah;
        const mobTopNama = document.getElementById('mobile-top-sekolah-nama');
        if (mobTopNama) mobTopNama.innerText = data.sekolah;
    }
    if (data.hp) document.getElementById('set_hp').value = data.hp;
    if (data.alamat) {
        const el = document.getElementById('set_alamat_text') || document.getElementById('set_alamat');
        if (el) el.value = data.alamat;
    }
    if (data.email && document.getElementById('set_email')) document.getElementById('set_email').value = data.email;
    if (data.web && document.getElementById('set_web')) document.getElementById('set_web').value = data.web;
    if (data.kepsekNama && document.getElementById('set_kepsek_nama')) document.getElementById('set_kepsek_nama').value = data.kepsekNama;
    if (data.kepsekNip && document.getElementById('set_kepsek_nip')) document.getElementById('set_kepsek_nip').value = data.kepsekNip;
    if (data.bendaharaNama && document.getElementById('set_bendahara_nama')) document.getElementById('set_bendahara_nama').value = data.bendaharaNama;
    if (data.bendaharaNip && document.getElementById('set_bendahara_nip')) document.getElementById('set_bendahara_nip').value = data.bendaharaNip;
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
        const sideLogo = document.getElementById('sidebar-sekolah-logo');
        if (sideLogo) sideLogo.src = data.logoSekolah;
        const mobTopLogo = document.getElementById('mobile-top-sekolah-logo');
        if (mobTopLogo) mobTopLogo.src = data.logoSekolah;
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

    // === AUTOCOMPLETE TEMPAT LAHIR ===
    const inputLahir = document.getElementById('peg_tempat_lahir');
    const listLahir = document.getElementById('tempat_lahir_list');

    if (inputLahir && listLahir && typeof dataWilayah !== 'undefined') {
        let allKabKota = [];
        for (let prov in dataWilayah) {
            dataWilayah[prov].forEach(item => {
                allKabKota.push({ label: `${item} - Prov ${prov}`, value: item });
            });
        }
        if (typeof dataWilayahLama !== 'undefined') {
            for (let prov in dataWilayahLama) {
                dataWilayahLama[prov].forEach(item => {
                    allKabKota.push({ label: `${item} - Prov ${prov}`, value: item });
                });
            }
        }

        inputLahir.addEventListener('input', function () {
            const val = this.value.toLowerCase();
            listLahir.innerHTML = '';
            if (!val) {
                listLahir.style.display = 'none';
                return;
            }

            const matches = allKabKota.filter(k => k.label.toLowerCase().includes(val)).slice(0, 5);

            if (matches.length > 0) {
                listLahir.style.display = 'block';
                matches.forEach(m => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item list-group-item-action py-1 px-2';
                    li.style.cursor = 'pointer';
                    li.textContent = m.label;
                    li.onclick = () => {
                        inputLahir.value = m.value;
                        listLahir.style.display = 'none';
                    };
                    listLahir.appendChild(li);
                });
            } else {
                listLahir.style.display = 'none';
            }
        });

        document.addEventListener('click', function (e) {
            if (e.target !== inputLahir) {
                listLahir.style.display = 'none';
            }
        });
    }

    // === DROPDOWN ALAMAT PROVINSI & KABKOTA ===
    const selProv = document.getElementById('peg_alamat_provinsi');
    const selKab = document.getElementById('peg_alamat_kabkota');
    if (selProv && selKab && typeof dataWilayah !== 'undefined') {
        Object.keys(dataWilayah).sort().forEach(prov => {
            const opt = document.createElement('option');
            opt.value = prov;
            opt.textContent = prov;
            selProv.appendChild(opt);
        });

        selProv.addEventListener('change', function () {
            const provName = this.value;
            selKab.innerHTML = '<option value="">-- Pilih Kab/Kota --</option>';
            if (provName && dataWilayah[provName]) {
                dataWilayah[provName].forEach(kab => {
                    if (!kab.endsWith('(PROV)')) {
                        const opt = document.createElement('option');
                        opt.value = kab;
                        opt.textContent = kab;
                        selKab.appendChild(opt);
                    }
                });
            }
        });
    }
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

        modalPegawai.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });
    }
    // === FIX DATE INPUT YEAR 6 DIGIT ISSUE ===
    document.addEventListener('focusin', function (e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'date') {
            if (!e.target.getAttribute('max')) {
                e.target.setAttribute('max', '9999-12-31');
            }
        }
    });

    document.addEventListener('keydown', function (e) {
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
            const user = document.getElementById('inputUsername').value.trim();
            const pass = document.getElementById('inputPassword').value.trim();

            if (!user || !pass) return;

            if (API_URL) {
                Swal.fire({ title: 'Authenticating...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
                const result = await apiCall('login', { username: user, password: pass });

                if (result && result.success) {
                    // Simpan sesi termasuk role dan nip jika login sebagai pegawai
                    const sessionData = {
                        displayName: result.nama || user,
                        role: result.role || 'admin',
                        nip: result.nip || null
                    };
                    localStorage.setItem(TOKEN_KEY, JSON.stringify(sessionData));
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

        const sidebarAdmin = document.getElementById('sidebar-admin');
        const sidebarPegawai = document.getElementById('sidebar-pegawai');
        
        if (data.role === 'pegawai') {
            // Tampilkan sidebar & bottom nav pegawai, sembunyikan admin
            if (sidebarAdmin) sidebarAdmin.classList.add('d-none');
            if (sidebarPegawai) sidebarPegawai.classList.remove('d-none');
            const mobAdmin = document.getElementById('mobile-bottom-nav-admin');
            const mobPegawai = document.getElementById('mobile-bottom-nav-pegawai');
            if (mobAdmin) mobAdmin.classList.add('d-none');
            if (mobPegawai) mobPegawai.classList.remove('d-none');

            document.querySelectorAll('[data-admin-only]').forEach(el => el.classList.add('d-none'));
            // Navigate ke dashboard pegawaiboard pegawai
            setTimeout(() => {
                nav('dashboard');
                if (typeof renderProfilPegawai === 'function') renderProfilPegawai();
            }, 200);
        } else {
            // Admin: Tampilkan sidebar & bottom nav admin, sembunyikan pegawai
            if (sidebarAdmin) sidebarAdmin.classList.remove('d-none');
            if (sidebarPegawai) sidebarPegawai.classList.add('d-none');
            const mobAdmin = document.getElementById('mobile-bottom-nav-admin');
            const mobPegawai = document.getElementById('mobile-bottom-nav-pegawai');
            if (mobAdmin) mobAdmin.classList.remove('d-none');
            if (mobPegawai) mobPegawai.classList.add('d-none');

            document.querySelectorAll('[data-admin-only]').forEach(el => el.classList.remove('d-none'));
            setTimeout(() => nav('dashboard'), 200);
        }

        // Update badge koneksi setelah login
        setTimeout(updateConnectionStatus, 100);
    } catch (e) { console.error('checkSSOSession error', e); }
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
    document.querySelectorAll('.page-view').forEach(el => {
        el.classList.add('d-none');
    });
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.nav-item-bottom').forEach(el => {
        el.classList.remove('active');
    });

    const targetPage = document.getElementById('view-' + page);
    if (targetPage) {
        targetPage.classList.remove('d-none');
    }

    const targetNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    // Update bottom nav active state
    const targetBottomNav = document.querySelector(`.nav-item-bottom[onclick*="'${page}'"]`);
    if (targetBottomNav) {
        targetBottomNav.classList.add('active');
    }

    // NEW MERGED PAGES
    if (page === 'data-induk') {
        renderTabelAkun();
        renderTabelPNS();
        const tabPegawai = document.getElementById('tab-di-pegawai');
        if (tabPegawai && !tabPegawai._navBound) {
            tabPegawai.addEventListener('shown.bs.tab', () => renderTabelPNS());
            tabPegawai._navBound = true;
        }
    }
    if (page === 'status-pegawai') {
        renderTabelRekap();
        renderTabelRiwayat();
        renderTabelPensiun();
    }
    if (page === 'monitor') {
        renderTabelDUK();
        const tabGaji = document.getElementById('tab-mon-gaji');
        if (tabGaji && !tabGaji._navBound) {
            tabGaji.addEventListener('shown.bs.tab', () => renderTabelKGB());
            tabGaji._navBound = true;
        }
        const tabSkumptk = document.getElementById('tab-mon-skumptk');
        if (tabSkumptk && !tabSkumptk._navBound) {
            tabSkumptk.addEventListener('shown.bs.tab', () => renderTabelSKUMPTK());
            tabSkumptk._navBound = true;
        }
        const tabPensiun = document.getElementById('tab-mon-pensiun');
        if (tabPensiun && !tabPensiun._navBound) {
            tabPensiun.addEventListener('shown.bs.tab', () => renderTabelPensiun());
            tabPensiun._navBound = true;
        }
        const tabSertif = document.getElementById('tab-mon-sertif');
        if (tabSertif && !tabSertif._navBound) {
            tabSertif.addEventListener('shown.bs.tab', () => renderTabelGuruSertif());
            tabSertif._navBound = true;
        }
    }

    // OLD (backward compat)
    if (page === 'pegawai') renderTabelPNS();
    if (page === 'duk') renderTabelDUK();
    if (page === 'gaji') renderTabelKGB();
    if (page === 'rekap') renderTabelRekap();
    if (page === 'riwayat') renderTabelRiwayat();
    if (page === 'pensiun') renderTabelPensiun();
    if (page === 'guru-sertif') renderTabelGuruSertif();
    if (page === 'akun') renderTabelAkun();
    if (page === 'profil-pegawai') { if(typeof renderProfilPegawai === 'function') renderProfilPegawai(); }
    if (page === 'input-data-pegawai') { if(typeof loadInputDataPegawai === 'function') loadInputDataPegawai(); }
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
    if (result.isConfirmed) {
        localStorage.removeItem(TOKEN_KEY);
        checkSSOSession();
    }
}

async function initApp() {
    const allPegawai = await dbManager.getAllPegawai();
    let pns = 0, pppk = 0, pppkpw = 0, honorer = 0;

    allPegawai.forEach(p => {
        if (p.statusKepegawaian !== 'Aktif') return;
        if (p.statusPegawai === 'PNS') pns++;
        else if (p.statusPegawai === 'PPPK') pppk++;
        else if (p.statusPegawai === 'PPPK Paruh Waktu') pppkpw++;
        else if (p.statusPegawai === 'Honorer') honorer++;
    });

    const elPns = document.getElementById('count-pns');
    const elPppk = document.getElementById('count-pppk');
    const elPppkpw = document.getElementById('count-pppkpw');
    const elHonorer = document.getElementById('count-honorer');

    if (elPns) elPns.innerText = pns;
    if (elPppk) elPppk.innerText = pppk;
    if (elPppkpw) elPppkpw.innerText = pppkpw;
    if (elHonorer) elHonorer.innerText = honorer;

    const ctx = document.getElementById('pegawaiChart');
    if (ctx) {
        if (window.myPieChart) window.myPieChart.destroy();
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
    if (sidebarToggle && !sidebarToggle.dataset.bound) {
        sidebarToggle.dataset.bound = "true";
        sidebarToggle.addEventListener('click', function () {
            document.querySelector('.sidebar').classList.toggle('toggled');
        });
    }

    const kgbContainer = document.getElementById('kgb-notifications');
    if (kgbContainer) {
        kgbContainer.innerHTML = '';
        let countNotif = 0;
        const currDate = new Date();
        allPegawai.forEach(p => {
            if (p.statusKepegawaian === 'Aktif' && p.tmtKgbBaru) {
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

        if (countNotif === 0) {
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
    const originalData = table.rows({ search: 'applied' }).data().toArray(); 

    if (originalData.length === 0) {
        Swal.fire('Peringatan', 'Tidak ada data untuk di-export!', 'warning');
        return;
    }

    const headers = [];
    $('#' + tableId + ' thead th').each(function () {
        headers.push($(this).text().trim());
    });

    let hasAksi = false;
    if (headers[headers.length - 1].toLowerCase() === 'aksi') {
        headers.pop();
        hasAksi = true;
    }

    let allPegawaiMap = {};
    if (typeof dbManager !== 'undefined') {
        try {
            const allPegawai = await dbManager.getAllPegawai();
            allPegawai.forEach(p => allPegawaiMap[p.nip] = p);
        } catch (e) { }
    }

    const isDUK = tableId.startsWith('tblDUK');

    if (!isDUK) {
        headers.unshift('No.');
        headers.push('Status Pegawai', 'Tempat Tanggal Lahir', 'Jenis Kelamin', 'Masa Kerja', 'Pendidikan Terakhir');
    }

    const data = [];
    let urut = 1;
    originalData.forEach(row => {
        const rawRow = [...row];

        let nipMatch = '';
        for (let j = rawRow.length - 1; j >= 0; j--) {
            const match = String(rawRow[j]).match(/lihatPegawai\(['"](\d+)['"]\)/);
            if (match) { nipMatch = match[1]; break; }
        }

        if (hasAksi) {
            rawRow.pop();
        }

        const cleanRow = rawRow.map(html => {
            if (typeof html === 'string') {
                html = html.replace(/<br\s*\/?>/gi, ' \n');
            }
            const temp = document.createElement('div');
            temp.innerHTML = html;
            return (temp.textContent || temp.innerText || '').trim();
        });

        if (!isDUK) {
            cleanRow.unshift(urut++);
            const p = allPegawaiMap[nipMatch];
            if (p) {
                cleanRow.push(p.statusPegawai || '-');
                cleanRow.push((p.tempatLahir || '') + (p.tempatLahir && p.tglLahir ? ', ' : '') + (p.tglLahir || '-'));
                cleanRow.push(p.kelamin || '-');

                let mk = '-';
                if (p.riwayatPangkat && p.riwayatPangkat.length > 0) {
                    const lp = p.riwayatPangkat[0]; 
                    if (lp && lp.length >= 7) mk = `${lp[5]} Thn ${lp[6]} Bln`;
                }
                if (mk === '-' && p.riwayatKGB && p.riwayatKGB.length > 0) {
                    const lk = p.riwayatKGB[0];
                    if (lk && lk.length >= 6) mk = `${lk[4]} Thn ${lk[5]} Bln`;
                }
                cleanRow.push(mk);
                cleanRow.push(p.pendidikan || '-');
            } else {
                cleanRow.push('-', '-', '-', '-', '-');
            }
        }

        data.push(cleanRow);
    });

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
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let currentRow = 6;
    data.forEach(cleanRow => {
        const r = worksheet.getRow(currentRow);
        cleanRow.forEach((val, i) => {
            const cell = r.getCell(i + 1);
            cell.value = val;
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (typeof val === 'string' && val.includes('\n')) {
                cell.alignment = { wrapText: true, vertical: 'middle' };
            }
        });
        currentRow++;
    });

    for (let i = 1; i <= totalCols; i++) {
        const column = worksheet.getColumn(i);
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            let valStr = cell.value ? cell.value.toString() : '';
            let lines = valStr.split('\n');
            let maxLineLength = Math.max(...lines.map(l => l.length));
            if (maxLineLength > maxLength) maxLength = maxLineLength;
        });

        if (i === 1) {
            column.width = 6;
        } else {
            column.width = maxLength < 10 ? 10 : (maxLength > 35 ? 35 : maxLength + 2);
        }
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
    Swal.fire({ title: 'Memproses Backup...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    try {
        const semuaPegawai = await dbManager.getAllPegawai();
        const pengaturan = await dbManager.getPengaturan();
        const semuaAkun = await dbManager.getAllAkun();
        
        const backupData = {
            pegawai: semuaPegawai || [],
            pengaturan: pengaturan || {},
            akun: semuaAkun || [],
            tanggalBackup: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const tgl = new Date().toISOString().split('T')[0];
        a.download = `Backup_SiMPeEL_${tgl}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Swal.fire('Berhasil', 'Backup data berhasil diunduh!', 'success');
    } catch(e) {
        console.error(e);
        Swal.fire('Gagal', 'Terjadi kesalahan saat membackup data.', 'error');
    }
}

async function restoreDataJSON() {
    if (window.require) {
        const { ipcRenderer } = require('electron');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const text = ev.target.result;
                try {
                    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
                    const res = await ipcRenderer.invoke('simpeel-restore', text);
                    if (res && res.success) {
                        Swal.fire('Berhasil', 'Data berhasil direstore. Halaman akan dimuat ulang.', 'success').then(() => {
                            window.location.reload();
                        });
                    } else {
                        Swal.fire('Gagal', res.message || 'Gagal restore data.', 'error');
                    }
                } catch(err) {
                    Swal.fire('Gagal', 'File JSON tidak valid.', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    } else {
        Swal.fire('Informasi', 'Fitur restore hanya tersedia di aplikasi desktop.', 'info');
    }
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

// ==========================================
// MODAL SYNC
// ==========================================
window.bukaModalSync = function() {
    try {
        const m = document.getElementById('modalSync');
        if (m) {
            const modal = bootstrap.Modal.getInstance(m) || new bootstrap.Modal(m);
            modal.show();
        }
    } catch(e) {
        console.error('Error bukaModalSync:', e);
    }
}

// Suppress DataTable warning popups
if ($.fn && $.fn.dataTable) {
    $.fn.dataTable.ext.errMode = 'none';
}

window.mulaiSinkronisasi = async function() {
    Swal.fire('Info', 'Fitur sinkronisasi hanya tersedia melalui Aplikasi Desktop (Offline).', 'info');
}

// Badge Online/Offline
function updateConnectionStatus() {
    const badge = document.getElementById('connectionStatus');
    if (badge) {
        if (navigator.onLine) {
            badge.className = 'badge bg-success me-2';
            badge.innerHTML = '<i class="fas fa-wifi"></i> Online';
        } else {
            badge.className = 'badge bg-danger me-2';
            badge.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
        }
    }
}
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
document.addEventListener('DOMContentLoaded', updateConnectionStatus);

// ==========================================
// 👤 PROFIL & INPUT DATA PEGAWAI SELF
// ==========================================

window.togglePassVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    } else {
        input.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
    }
};

window.renderProfilPegawai = function() {
    try {
        const ssoToken = localStorage.getItem(TOKEN_KEY);
        if (!ssoToken) return;
        const session = JSON.parse(ssoToken);
        const nama = session.displayName || '-';
        const nip = session.nip || '-';

        const elNama = document.getElementById('profil-nama');
        const elNip = document.getElementById('profil-nip');
        const elDisplay = document.getElementById('profil-nama-display');

        if (elNama) elNama.value = nama;
        if (elNip) elNip.value = nip;
        if (elDisplay) elDisplay.textContent = nama;

        const elPass = document.getElementById('profil-password-baru');
        const elKonfirm = document.getElementById('profil-password-konfirm');
        if (elPass) elPass.value = '';
        if (elKonfirm) elKonfirm.value = '';
    } catch(e) { console.error('renderProfilPegawai error', e); }
};

window.simpanUbahPassword = async function() {
    const passBaru = document.getElementById('profil-password-baru').value.trim();
    const passKonfirm = document.getElementById('profil-password-konfirm').value.trim();

    if (!passBaru) return Swal.fire('Peringatan', 'Password baru tidak boleh kosong!', 'warning');
    if (passBaru !== passKonfirm) return Swal.fire('Peringatan', 'Password baru dan konfirmasi tidak cocok!', 'warning');
    if (passBaru.length < 6) return Swal.fire('Peringatan', 'Password minimal 6 karakter!', 'warning');

    try {
        const ssoToken = localStorage.getItem(TOKEN_KEY);
        if (!ssoToken) return;
        const session = JSON.parse(ssoToken);
        const nip = session.nip;
        if (!nip) return Swal.fire('Error', 'Sesi tidak valid, silakan login ulang.', 'error');

        const allAkun = await apiCall('getAllAkun');
        const akun = allAkun ? allAkun.find(a => String(a.nip) === String(nip)) : null;
        if (!akun) return Swal.fire('Error', 'Data akun tidak ditemukan!', 'error');

        const dataUpdate = { ...akun, password: passBaru, updatedAt: new Date().toISOString() };
        const res = await apiCall('saveAkun', dataUpdate);

        if (res && res.success) {
            Swal.fire('Berhasil!', 'Password berhasil diubah.', 'success');
            document.getElementById('profil-password-baru').value = '';
            document.getElementById('profil-password-konfirm').value = '';
        } else {
            Swal.fire('Gagal', (res && res.message) ? res.message : 'Gagal mengubah password.', 'error');
        }
    } catch(e) {
        Swal.fire('Error', e.message, 'error');
    }
};

window.loadInputDataPegawai = async function() {
    const container = document.getElementById('input-data-pegawai-container');
    if (!container) return;

    try {
        const ssoToken = localStorage.getItem(TOKEN_KEY);
        if (!ssoToken) return;
        const session = JSON.parse(ssoToken);
        const nip = session.nip;
        if (!nip) { container.innerHTML = '<div class="alert alert-warning">Sesi tidak valid.</div>'; return; }

        container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Memuat data pegawai...</p></div>';

        const allPegawai = await apiCall('getAllPegawai');
        const pegawai = Array.isArray(allPegawai) ? allPegawai.find(p => String(p.nip) === String(nip)) : null;

        if (!pegawai) {
            container.innerHTML = `<div class="alert alert-info text-center">
                <i class="fas fa-info-circle fa-2x mb-2 d-block"></i>
                <strong>Data belum ada.</strong><br>
                Data pegawai Anda belum terdaftar di sistem. Hubungi admin untuk mendaftarkan data Anda.
            </div>`;
            return;
        }

        const isKunci = pegawai.kunciData === true || pegawai.kunciData === 1 || String(pegawai.kunciData) === '1';
        const readonlyAttr = isKunci ? 'readonly' : '';
        const disabledAttr = isKunci ? 'disabled' : '';
        const kunciInfo = isKunci ? '<div class="alert alert-warning mb-3"><i class="fas fa-lock me-2"></i><strong>Data dikunci oleh Admin.</strong> Anda tidak dapat mengubah data saat ini. Hubungi admin untuk membuka kunci.</div>' : '';

        container.innerHTML = `
            ${kunciInfo}
            <ul class="nav nav-tabs mb-3" id="inputDataTabs" role="tablist">
                <li class="nav-item" role="presentation"><button class="nav-link active fw-bold" data-bs-toggle="tab" data-bs-target="#idt-identitas" type="button">📋 Identitas</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#idt-kepegawaian" type="button">🏢 Kepegawaian</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#idt-pendidikan" type="button">🎓 Pendidikan</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#idt-lainnya" type="button">📁 Lainnya</button></li>
            </ul>
            <div class="tab-content">
                <div class="tab-pane fade show active" id="idt-identitas">
                    <div class="row g-3">
                        <div class="col-md-6"><label class="form-label fw-bold">NIP</label><input class="form-control" id="self-nip" value="${pegawai.nip||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Nama Lengkap</label><input class="form-control" id="self-nama" value="${pegawai.nama||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">NIK</label><input class="form-control" id="self-nik" value="${pegawai.nik||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Tempat Lahir</label><input class="form-control" id="self-tempatLahir" value="${pegawai.tempatLahir||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Tanggal Lahir</label><input type="date" class="form-control" id="self-tglLahir" value="${pegawai.tglLahir||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Jenis Kelamin</label>
                            <select class="form-select" id="self-jenisKelamin" ${disabledAttr}>
                                <option value="">-- Pilih --</option>
                                <option value="Laki-laki" ${pegawai.jenisKelamin==='Laki-laki'?'selected':''}>Laki-laki</option>
                                <option value="Perempuan" ${pegawai.jenisKelamin==='Perempuan'?'selected':''}>Perempuan</option>
                            </select>
                        </div>
                        <div class="col-md-6"><label class="form-label fw-bold">Agama</label><input class="form-control" id="self-agama" value="${pegawai.agama||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">No HP</label><input class="form-control" id="self-noHp" value="${pegawai.noHp||''}" ${readonlyAttr}></div>
                        <div class="col-12"><label class="form-label fw-bold">Alamat</label><textarea class="form-control" id="self-alamat" rows="2" ${readonlyAttr}>${pegawai.alamat||''}</textarea></div>
                    </div>
                </div>
                <div class="tab-pane fade" id="idt-kepegawaian">
                    <div class="row g-3">
                        <div class="col-md-6"><label class="form-label fw-bold">Status Pegawai</label><input class="form-control" value="${pegawai.statusPegawai||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Status Kepegawaian</label><input class="form-control" value="${pegawai.statusKepegawaian||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Golongan</label><input class="form-control" value="${pegawai.golongan||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Jabatan</label><input class="form-control" value="${pegawai.jabatan||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Unit Kerja</label><input class="form-control" value="${pegawai.unitKerja||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">TMT CPNS/PPPK</label><input type="date" class="form-control" value="${pegawai.tmtCpns||''}" readonly></div>
                    </div>
                    <p class="text-muted mt-3 small"><i class="fas fa-info-circle"></i> Data kepegawaian hanya dapat diubah oleh Admin.</p>
                </div>
                <div class="tab-pane fade" id="idt-pendidikan">
                    <div class="row g-3">
                        <div class="col-md-6"><label class="form-label fw-bold">Pendidikan Terakhir</label><input class="form-control" id="self-pendidikan" value="${pegawai.pendidikan||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Jurusan/Prodi</label><input class="form-control" id="self-jurusan" value="${pegawai.jurusan||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Nama Sekolah/Universitas</label><input class="form-control" id="self-namaSekolah" value="${pegawai.namaSekolah||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Tahun Lulus</label><input class="form-control" id="self-tahunLulus" value="${pegawai.tahunLulus||''}" ${readonlyAttr}></div>
                    </div>
                </div>
                <div class="tab-pane fade" id="idt-lainnya">
                    <div class="row g-3">
                        <div class="col-md-6"><label class="form-label fw-bold">Nama Ibu Kandung</label><input class="form-control" id="self-namaIbu" value="${pegawai.namaIbu||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Status Pernikahan</label>
                            <select class="form-select" id="self-statusNikah" ${disabledAttr}>
                                <option value="">-- Pilih --</option>
                                <option value="Belum Menikah" ${pegawai.statusNikah==='Belum Menikah'?'selected':''}>Belum Menikah</option>
                                <option value="Menikah" ${pegawai.statusNikah==='Menikah'?'selected':''}>Menikah</option>
                                <option value="Cerai" ${pegawai.statusNikah==='Cerai'?'selected':''}>Cerai</option>
                            </select>
                        </div>
                        <div class="col-md-6"><label class="form-label fw-bold">Nama Pasangan</label><input class="form-control" id="self-namaPasangan" value="${pegawai.namaPasangan||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">No NPWP</label><input class="form-control" id="self-npwp" value="${pegawai.npwp||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">No BPJS Kesehatan</label><input class="form-control" id="self-bpjsKes" value="${pegawai.bpjsKes||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">No BPJS Ketenagakerjaan</label><input class="form-control" id="self-bpjsTK" value="${pegawai.bpjsTK||''}" ${readonlyAttr}></div>
                    </div>
                </div>
            </div>`;

        container.dataset.nip = nip;
    } catch(e) {
        console.error('loadInputDataPegawai error', e);
        if (container) container.innerHTML = '<div class="alert alert-danger">Gagal memuat data: ' + e.message + '</div>';
    }
};

window.simpanDataPegawaiSelf = async function() {
    const container = document.getElementById('input-data-pegawai-container');
    const nip = container ? container.dataset.nip : null;
    if (!nip) return Swal.fire('Error', 'Data NIP tidak ditemukan. Refresh halaman.', 'error');

    const allPegawai = await apiCall('getAllPegawai');
    const pegawaiAsli = Array.isArray(allPegawai) ? allPegawai.find(p => String(p.nip) === String(nip)) : null;
    if (!pegawaiAsli) return Swal.fire('Error', 'Data pegawai tidak ditemukan!', 'error');

    if (pegawaiAsli.kunciData === true || pegawaiAsli.kunciData === 1 || String(pegawaiAsli.kunciData) === '1') {
        return Swal.fire('Terkunci', 'Data Anda dikunci oleh Admin. Tidak dapat menyimpan.', 'warning');
    }

    const getValue = (id) => { const el = document.getElementById(id); return el ? el.value : (pegawaiAsli[id.replace('self-','')] || ''); };

    const dataUpdate = {
        ...pegawaiAsli,
        nama: getValue('self-nama'),
        nik: getValue('self-nik'),
        tempatLahir: getValue('self-tempatLahir'),
        tglLahir: getValue('self-tglLahir'),
        jenisKelamin: getValue('self-jenisKelamin'),
        agama: getValue('self-agama'),
        noHp: getValue('self-noHp'),
        alamat: getValue('self-alamat'),
        pendidikan: getValue('self-pendidikan'),
        jurusan: getValue('self-jurusan'),
        namaSekolah: getValue('self-namaSekolah'),
        tahunLulus: getValue('self-tahunLulus'),
        namaIbu: getValue('self-namaIbu'),
        statusNikah: getValue('self-statusNikah'),
        namaPasangan: getValue('self-namaPasangan'),
        npwp: getValue('self-npwp'),
        bpjsKes: getValue('self-bpjsKes'),
        bpjsTK: getValue('self-bpjsTK'),
        updatedAt: new Date().toISOString()
    };

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const res = await apiCall('savePegawai', dataUpdate);
    if (res && res.success) {
        await dbManager.forceFetchFromServer();
        Swal.fire('Berhasil!', 'Data Anda berhasil disimpan.', 'success');
    } else {
        Swal.fire('Gagal', (res && res.message) || 'Gagal menyimpan data.', 'error');
    }
};
window.bukaInputDataSendiri = async function() {
    const ssoToken = localStorage.getItem(TOKEN_KEY);
    if (!ssoToken) return Swal.fire('Error', 'Sesi tidak valid.', 'error');
    const session = JSON.parse(ssoToken);
    const nip = session.nip;
    if (!nip) return;

    if (typeof dbManager !== 'undefined') {
        const allPegawai = await dbManager.getAllPegawai();
        const pegawai = Array.isArray(allPegawai) ? allPegawai.find(p => String(p.nip) === String(nip)) : null;

        if (!pegawai) {
            Swal.fire('Info', 'Data pegawai belum terdaftar di sistem. Hubungi admin.', 'info');
            return;
        }

        if (pegawai.kunciData === true || pegawai.kunciData === 1 || String(pegawai.kunciData) === '1') {
            Swal.fire('Terkunci', 'Data Anda dikunci oleh Admin. Tidak dapat diedit.', 'warning');
            return;
        }
    }

    if (typeof editPegawai === 'function') {
        const modalEl = document.getElementById('modalPegawai');
        if (modalEl) {
            const content = modalEl.querySelector('.modal-content');
            if (content) {
                const container = document.getElementById('pegawai-input-container');
                if (container && !container.contains(content)) {
                    container.innerHTML = '';
                    container.appendChild(content);
                    content.classList.remove('modal-content');
                    content.classList.add('card', 'shadow-sm', 'border-0', 'w-100');
                    const header = content.querySelector('.modal-header');
                    if(header) header.style.display = 'none';
                    const footer = content.querySelector('.modal-footer');
                    if(footer) footer.classList.replace('modal-footer', 'card-footer');
                    const closeBtn = content.querySelector('button[data-bs-dismiss="modal"]');
                    if(closeBtn) closeBtn.style.display = 'none';
                }
            }
        }
        editPegawai(nip);
        if (typeof nav === 'function') nav('pegawai-input');
    }
};


