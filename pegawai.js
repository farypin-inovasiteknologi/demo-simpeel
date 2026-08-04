// === PEGAWAI.JS - LOGIKA DATA PEGAWAI ===

function getLatestRiwayat(riwayatArray, dateIndex, isYear = false) {
    if (!riwayatArray || riwayatArray.length === 0) return null;
    return riwayatArray.reduce((latest, current) => {
        let dateLatest = latest[dateIndex];
        let dateCurrent = current[dateIndex];

        if (isYear) {
            return (parseInt(dateCurrent) || 0) >= (parseInt(dateLatest) || 0) ? current : latest;
        } else {
            let dLatest = new Date(dateLatest);
            let dCurrent = new Date(dateCurrent);
            if (isNaN(dLatest.getTime())) return current;
            if (isNaN(dCurrent.getTime())) return latest;
            return dCurrent >= dLatest ? current : latest;
        }
    });
}

function sortRiwayatArray(riwayatArray, dateIndex, isYear = false) {
    if (!riwayatArray || riwayatArray.length === 0) return riwayatArray;
    return riwayatArray.sort((a, b) => {
        let valA = a[dateIndex];
        let valB = b[dateIndex];

        if (isYear) {
            return (parseInt(valA) || 0) - (parseInt(valB) || 0);
        } else {
            let dA = new Date(valA);
            let dB = new Date(valB);
            let timeA = isNaN(dA.getTime()) ? 0 : dA.getTime();
            let timeB = isNaN(dB.getTime()) ? 0 : dB.getTime();
            return timeA - timeB;
        }
    });
}

async function getPrimaryDataLock(nip) {
    if (!nip) return null;

    const akunList = await dbManager.getAllAkun();
    const fromAkun = Array.isArray(akunList) ? akunList.find(a => a.nip === nip) : null;
    if (fromAkun) {
        return {
            nip: fromAkun.nip || nip,
            nama: fromAkun.nama || '',
            nik: fromAkun.nik || '',
            tglLahir: fromAkun.tglLahir || '',
            statusPegawai: fromAkun.statusPegawai || 'PNS'
        };
    }

    const pegList = await dbManager.getAllPegawai();
    const fromPegawai = Array.isArray(pegList) ? pegList.find(p => p.nip === nip) : null;
    if (!fromPegawai) return null;

    return {
        nip: fromPegawai.nip || nip,
        nama: fromPegawai.nama || '',
        nik: fromPegawai.nik || '',
        tglLahir: fromPegawai.tglLahir || '',
        statusPegawai: fromPegawai.statusPegawai || 'PNS'
    };
}

async function simpanPegawai() {
    const nipVal = (document.getElementById('peg_nip')?.value || '').trim();
    const namaVal = (document.getElementById('peg_nama')?.value || '').trim().toUpperCase();
    const tglLahir = (document.getElementById('peg_tgl_lahir')?.value || '').trim();
    const kelamin = (document.getElementById('peg_kelamin')?.value || '').trim();
    const statusPgw = (document.getElementById('statusPegawai')?.value || '').trim();

    // === PROTEKSI 5 DATA UTAMA ===
    // Nilai utama selalu diambil dari sumber data akun/pegawai yang konsisten.
    const isEditMode = !!window.currentEditUtamaNip;
    const lockedSource = isEditMode ? await getPrimaryDataLock(window.currentEditUtamaNip) : null;
    if (lockedSource && isEditMode) {
        window._p5nip = lockedSource.nip || window.currentEditUtamaNip;
        window._p5nama = lockedSource.nama || '';
        window._p5nik = lockedSource.nik || '';
        window._p5tgl = lockedSource.tglLahir || '';
        window._p5status = lockedSource.statusPegawai || '';
    }

    if (isEditMode) {
        if (document.getElementById('peg_nip')) document.getElementById('peg_nip').value = window._p5nip || window.currentEditUtamaNip;
        if (document.getElementById('peg_nama')) document.getElementById('peg_nama').value = window._p5nama || '';
        if (document.getElementById('peg_nik')) document.getElementById('peg_nik').value = window._p5nik || '';
        if (document.getElementById('peg_tgl_lahir')) document.getElementById('peg_tgl_lahir').value = window._p5tgl || '';
        if (document.getElementById('statusPegawai')) document.getElementById('statusPegawai').value = window._p5status || '';
    }

    // Validasi wajib: alert per field
    if (!nipVal) {
        Swal.fire('Peringatan', 'Kolom NIP (Baru) wajib diisi!', 'warning');
        document.getElementById('peg_nip')?.focus();
        return;
    }

    // CEK DUPLIKASI NIP / NIK
    const allPegawai = await dbManager.getAllPegawai();
    const currentNipLama = (document.getElementById('peg_nip_lama')?.value || '').trim();
    const nipValFinal = (isEditMode && window._p5nip !== undefined) ? window._p5nip : nipVal;
    const namaValFinal = (isEditMode && window._p5nama !== undefined) ? String(window._p5nama).toUpperCase() : namaVal;
    const nikVal = (isEditMode && window._p5nik !== undefined) ? window._p5nik : (document.getElementById('peg_nik')?.value || '').trim();
    const tglLahirFinal = (isEditMode && window._p5tgl !== undefined) ? window._p5tgl : tglLahir;
    const statusPgwFinal = (isEditMode && window._p5status !== undefined) ? window._p5status : statusPgw;

    if (nipValFinal) {
        const existNip = allPegawai.find(p => p.nip === nipValFinal && p.nip !== window.currentEditUtamaNip);
        if (existNip) {
            Swal.fire('Error', `NIP ${nipValFinal} sudah dipakai atas nama ${existNip.nama}. Data tidak bisa disimpan untuk mencegah tertimpa!`, 'error');
            return;
        }
    }

    if (nikVal) {
        const existNik = allPegawai.find(p => p.nik === nikVal && p.nip !== window.currentEditUtamaNip);
        if (existNik) {
            Swal.fire('Error', `NIK ${nikVal} sudah dipakai atas nama ${existNik.nama}. Data tidak bisa disimpan!`, 'error');
            return;
        }
    }

    if (!namaValFinal) {
        Swal.fire('Peringatan', 'Kolom Nama wajib diisi!', 'warning');
        document.getElementById('peg_nama')?.focus();
        return;
    }
    if (!tglLahirFinal) {
        Swal.fire('Peringatan', 'Kolom Tanggal Lahir wajib diisi!', 'warning');
        document.getElementById('peg_tgl_lahir')?.focus();
        return;
    }
    if (!kelamin) {
        Swal.fire('Peringatan', 'Kolom Jenis Kelamin wajib dipilih!', 'warning');
        document.getElementById('peg_kelamin')?.focus();
        return;
    }
    if (!statusPgwFinal) {
        Swal.fire('Peringatan', 'Kolom Status Pegawai wajib dipilih!', 'warning');
        document.getElementById('statusPegawai')?.focus();
        return;
    }

    // KONFIRMASI SEBELUM SIMPAN
    const confirmSave = await Swal.fire({
        title: 'Konfirmasi Simpan',
        text: 'Pastikan data NIP dan data lainnya sudah benar. Yakin ingin menyimpan?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Simpan',
        cancelButtonText: 'Tidak',
        reverseButtons: true
    });

    if (!confirmSave.isConfirmed) {
        return;
    }

    // Extract array data
    const extractTableData = (tableId) => {
        const rows = document.querySelectorAll(`#${tableId} tbody tr`);
        return Array.from(rows).map(row => {
            const inputs = row.querySelectorAll('input:not([type="file"]), select');
            return Array.from(inputs).map(i => i.value);
        });
    };

    let riwayatPangkat = extractTableData('tabelPangkat');
    let riwayatKontrak = extractTableData('tabelKontrak');
    let riwayatJabatan = extractTableData('tabelJabatan');
    let riwayatKGB = extractTableData('tabelKGB');
    let riwayatPendidikan = extractTableData('tabelPendidikan');
    let riwayatAnak = extractTableData('tabelAnak');
    let riwayatDiklat = extractTableData('tabelDiklat');

    riwayatPangkat = sortRiwayatArray(riwayatPangkat, 1);
    riwayatKontrak = sortRiwayatArray(riwayatKontrak, 2);
    riwayatJabatan = sortRiwayatArray(riwayatJabatan, 4);
    riwayatKGB = sortRiwayatArray(riwayatKGB, 2);
    riwayatPendidikan = sortRiwayatArray(riwayatPendidikan, 4, true);
    riwayatAnak = sortRiwayatArray(riwayatAnak, 2).map(r => {
        if (r[0]) r[0] = r[0].toUpperCase();
        return r;
    });
    riwayatDiklat = sortRiwayatArray(riwayatDiklat, 2, true);

    // Get latest data for main table
    let golongan = '';
    let jabatan = '';
    let tmtJabatan = '';
    let tmtKgbLalu = '';
    let gajiPokok = '';

    let unitKerja = '';
    const latestPendidikan = getLatestRiwayat(riwayatPendidikan, 4, true);
    if (latestPendidikan) {
        pendidikan = latestPendidikan[0];
    }

    const latestPangkat = getLatestRiwayat(riwayatPangkat, 1);
    const latestKontrak = getLatestRiwayat(riwayatKontrak, 2);

    if (latestPangkat) {
        golongan = latestPangkat[0]; // Golongan
    } else if (latestKontrak) {
        golongan = latestKontrak[1]; // Golongan Kontrak
    }

    const latestJabatan = getLatestRiwayat(riwayatJabatan, 4);
    if (latestJabatan) {
        jabatan = latestJabatan[2]; // Nama Jabatan
        unitKerja = latestJabatan[3]; // Unit Kerja
        tmtJabatan = latestJabatan[4]; // TMT Jabatan
    } else if (latestKontrak) {
        jabatan = latestKontrak[0]; // Nama Jabatan Kontrak
    }

    const latestKGB = getLatestRiwayat(riwayatKGB, 2);
    if (latestKGB) {
        tmtKgbLalu = latestKGB[2]; // TMT KGB
        gajiPokok = latestKGB[3]; // Jumlah Gaji Pokok
    }
    let kgbDate = tmtKgbLalu
        ? (parseInt(tmtKgbLalu.substring(0, 4)) + 2) + tmtKgbLalu.substring(4)
        : '';

    // --- FOTO PROCESSING ---
    const imgEl = document.getElementById('previewFotoPegawai');
    let fotoData = '';
    if (imgEl && !imgEl.src.includes('placeholder.com')) {
        if (imgEl.src.startsWith('data:image/')) {
            Swal.fire({ title: 'Memproses Foto...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                // Compress photo to ensure it stays < 50,000 chars for Google Sheets
                fotoData = await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        let width = img.width;
                        let height = img.height;
                        const MAX_SIZE = 250;
                        if (width > height) {
                            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                        } else {
                            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        // Convert to highly compressed JPEG
                        let compressed = canvas.toDataURL('image/jpeg', 0.7);
                        resolve(compressed);
                    };
                    img.onerror = () => resolve(imgEl.src);
                    img.src = imgEl.src;
                });
            } catch (e) {
                fotoData = imgEl.src;
            }
        } else {
            fotoData = imgEl.src; // if it's already a link/path
        }
    }

    const data = {
        foto: fotoData,
        nip: nipValFinal,
        nik: nikVal,
        nama: namaValFinal,
        tempatLahir: document.getElementById('peg_tempat_lahir')?.value || '',
        tglLahir: tglLahirFinal,
        kelamin: kelamin,
        agama: document.getElementById('peg_agama')?.value || '',
        statusKawin: document.getElementById('peg_status_kawin')?.value || '',
        alamat: document.getElementById('peg_alamat')?.value || '',
        alamatProvinsi: document.getElementById('peg_alamat_provinsi')?.value || '',
        alamatKabKota: document.getElementById('peg_alamat_kabkota')?.value || '',
        nipLama: document.getElementById('peg_nip_lama')?.value || '',
        noHp: document.getElementById('peg_no_hp')?.value || '',
        email: document.getElementById('peg_email')?.value || '',
        golDarah: document.getElementById('peg_gol_darah')?.value || '',
        tinggiBadan: document.getElementById('peg_tinggi_badan')?.value || '',
        beratBadan: document.getElementById('peg_berat_badan')?.value || '',
        hobby: document.getElementById('peg_hobby')?.value || '',
        isKebutuhanKhusus: document.getElementById('peg_is_kebutuhan_khusus')?.value || 'Tidak',
        uraianKebutuhanKhusus: document.getElementById('peg_uraian_kebutuhan_khusus')?.value || '',
        statusPegawai: statusPgwFinal,
        golongan: golongan,
        jabatan: jabatan,
        tmtJabatan: tmtJabatan,
        pendidikan: pendidikan,
        unitKerja: unitKerja || 'Dinas',
        statusKepegawaian: 'Aktif',
        gajiPokok: gajiPokok,
        tmtKgbLalu: tmtKgbLalu,
        tmtKgbBaru: kgbDate,
        tmtPensiun: '',
        pasanganNama: document.getElementById('peg_pasangan_nama')?.value || '',
        pasanganNik: document.getElementById('peg_pasangan_nik')?.value || '',
        pasanganTmptLahir: document.getElementById('peg_pasangan_tmpt_lahir')?.value || '',
        pasanganTglLahir: document.getElementById('peg_pasangan_tgl_lahir')?.value || '',
        pasanganPekerjaan: document.getElementById('peg_pasangan_pekerjaan')?.value || '',
        pasanganNip: document.getElementById('peg_pasangan_nip')?.value || '',
        pasanganBukuNikah: document.getElementById('file_buku_nikah')?.value || '',
        riwayatPangkat: riwayatPangkat,
        riwayatKontrak: riwayatKontrak,
        riwayatJabatan: riwayatJabatan,
        riwayatKGB: riwayatKGB,
        riwayatPendidikan: riwayatPendidikan,
        riwayatAnak: riwayatAnak,
        riwayatDiklat: riwayatDiklat,

        certNo: (document.getElementById('cert_no')?.value || ''),
        certTgl: (document.getElementById('cert_tgl')?.value || ''),
        certNrg: (document.getElementById('cert_nrg')?.value || ''),
        certNuptk: (document.getElementById('cert_nuptk')?.value || ''),
        certTahun: (document.getElementById('cert_tahun')?.value || ''),
        certMapel: (document.getElementById('cert_mapel')?.value || ''),
        certLptk: (document.getElementById('cert_lptk')?.value || ''),
        certPejabat: (document.getElementById('cert_pejabat')?.value || ''),
        certFileData: (document.getElementById('cert_file_data')?.value || '')
    };

    try {
        const res = await dbManager.savePegawai(data);
        if (res && res.success === false) {
            Swal.fire('Error', 'Gagal menyimpan data: ' + res.message, 'error');
            return;
        }
        Swal.fire('Berhasil!', 'Data Pegawai berhasil disimpan!', 'success');
        // Tutup modal jika ada
        const modal = bootstrap?.Modal?.getInstance(document.getElementById('modalTambahPegawai'))
            || bootstrap?.Modal?.getInstance(document.getElementById('modalPegawai'));
        if (modal) modal.hide();
        // Refresh semua tabel
        renderTabelPNS();
        renderTabelDUK();
        renderTabelKGB();
        renderTabelRekap();
        renderTabelRiwayat();
    } catch (e) {
        Swal.fire('Gagal!', 'Gagal menyimpan data: ' + e.message, 'error');
    }
}

async function hapusPegawaiData(nip) {
    const result = await Swal.fire({
        title: 'Hapus Pegawai?',
        text: 'Data akan dihapus permanen!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, hapus!'
    });
    if (result.isConfirmed) {
        await dbManager.deletePegawai(nip);
        Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
        renderTabelPNS();
        renderTabelDUK();
        renderTabelKGB();
        renderTabelRekap();
        renderTabelRiwayat();
    }
}

function toggleKebutuhanKhusus() {
    const isKhusus = document.getElementById('peg_is_kebutuhan_khusus')?.value;
    const div = document.getElementById('div_kebutuhan_khusus');
    if (div) {
        if (isKhusus === 'Ya') {
            div.classList.remove('d-none');
        } else {
            div.classList.add('d-none');
            const ur = document.getElementById('peg_uraian_kebutuhan_khusus');
            if (ur) ur.value = '';
        }
    }
}

async function renderTabelPNS() {
    const allPegawai = await dbManager.getAllPegawai();

    const renderTabelInduk = (id, statusPegawaiFilter) => {
        if ($.fn.DataTable.isDataTable(id)) { try { $(id).DataTable().clear().destroy(); $(id + " tbody").empty(); } catch (e) { } }
        const data = allPegawai.filter(p => p.statusPegawai === statusPegawaiFilter && p.statusKepegawaian === 'Aktif');

        const formatted = data.map(p => {
            const isLocked = p.isLocked === true;
            const lockBtnClass = isLocked ? 'btn-secondary text-white' : 'btn-success text-white';
            const lockIcon = isLocked ? 'fa-lock' : 'fa-lock-open';
            const lockTitle = isLocked ? 'Buka Kunci Data' : 'Kunci Data';
            return [
                p.nip, p.nama, p.golongan, p.jabatan, p.unitKerja,
                `<button class='btn btn-sm btn-warning text-dark me-1' title='Edit Data' onclick='editPegawai("${p.nip}")'><i class='fas fa-edit'></i></button>
                 <button class='btn btn-sm ${lockBtnClass} me-1' title='${lockTitle}' onclick='toggleKunciData("${p.nip}")'><i class='fas ${lockIcon}'></i></button>
                 <button class='btn btn-sm btn-info text-white' title='Cetak CV (Word)' onclick='cetakCV("${p.nip}")'><i class='fas fa-print'></i></button>`
            ];
        });

        const dt = $(id).DataTable({ destroy: true, data: formatted, pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
        return dt;
    };

    const dtPNS = renderTabelInduk('#tblPNS', 'PNS');
    $('#filterNamaPNS').off('keyup').on('keyup', function () { dtPNS.search(this.value).draw(); });
    $('#filterGolPNS').off('change').on('change', function () { dtPNS.column(2).search(this.value).draw(); });

    const dtPPPK = renderTabelInduk('#tblPPPK', 'PPPK');
    $('#filterNamaPPPK').off('keyup').on('keyup', function () { dtPPPK.search(this.value).draw(); });

    const dtPPPKPW = renderTabelInduk('#tblPPPKPW', 'PPPK Paruh Waktu');
    $('#filterNamaPPPKPW').off('keyup').on('keyup', function () { dtPPPKPW.search(this.value).draw(); });

    const dtHonorer = renderTabelInduk('#tblHonorer', 'Honorer');
    $('#filterNamaHonorer').off('keyup').on('keyup', function () { dtHonorer.search(this.value).draw(); });
}

async function renderTabelDUK() {
    if ($.fn.DataTable.isDataTable('#tblDUKPNS')) { try { $('#tblDUKPNS').DataTable().clear().destroy(); } catch (e) { } }
    if ($.fn.DataTable.isDataTable('#tblDUKPPPK')) { try { $('#tblDUKPPPK').DataTable().clear().destroy(); } catch (e) { } }
    const allPegawai = await dbManager.getAllPegawai();

    const hitungMK = (tmtStr, thnSK = 0, blnSK = 0) => {
        if (!tmtStr || tmtStr === '-') return { thn: thnSK, bln: blnSK, elThn: 0, elBln: 0 };
        const tmt = new Date(tmtStr);
        if (isNaN(tmt)) return { thn: thnSK, bln: blnSK, elThn: 0, elBln: 0 };
        const now = new Date();
        let years = now.getFullYear() - tmt.getFullYear();
        let months = now.getMonth() - tmt.getMonth();
        if (months < 0) { years--; months += 12; }
        years = years < 0 ? 0 : years;
        months = months < 0 ? 0 : months;
        let totalBln = parseInt(blnSK) + months;
        let addThn = Math.floor(totalBln / 12);
        let remBln = totalBln % 12;
        let totalThn = parseInt(thnSK) + years + addThn;
        return { thn: totalThn, bln: remBln, elThn: years, elBln: months };
    };

    const processData = (statusFilter) => {
        const dataFilter = allPegawai.filter(p => p.statusKepegawaian === 'Aktif' && p.statusPegawai === statusFilter);
        let no = 1;
        return dataFilter.map(p => {
            let mkKeseluruhan = "-";
            let mkGolRuang = "-";
            let tmtPangkat = "-";
            let golTmt = p.golongan || '-';

            if (p.riwayatPangkat && p.riwayatPangkat.length > 0) {
                const lastPangkat = getLatestRiwayat(p.riwayatPangkat, 1) || p.riwayatPangkat[p.riwayatPangkat.length - 1];
                tmtPangkat = lastPangkat[1] || '-';
                const res = hitungMK(tmtPangkat, lastPangkat[5] || '0', lastPangkat[6] || '0');
                mkKeseluruhan = `${res.thn} Thn ${res.bln} Bln`;
                mkGolRuang = `${res.elThn} Thn ${res.elBln} Bln`;
                golTmt = `${p.golongan || '-'}<br><small>${tmtPangkat}</small>`;
            } else if (p.riwayatKontrak && p.riwayatKontrak.length > 0) {
                const lastKontrak = getLatestRiwayat(p.riwayatKontrak, 2) || p.riwayatKontrak[p.riwayatKontrak.length - 1];
                tmtPangkat = lastKontrak[2] || '-'; // TMT Mulai
                const res = hitungMK(tmtPangkat, lastKontrak[7] || '0', lastKontrak[8] || '0');
                mkKeseluruhan = `${res.thn} Thn ${res.bln} Bln`;
                mkGolRuang = `${res.elThn} Thn ${res.elBln} Bln`;
                golTmt = `${p.golongan || '-'}<br><small>${tmtPangkat}</small>`;
            }

            let usia = "-";
            if (p.tglLahir) {
                const diff = new Date() - new Date(p.tglLahir);
                usia = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + " Thn";
            }

            return [
                no++, `${p.nama}<br><small>${p.nip}</small>`, p.jabatan || '-', golTmt, mkKeseluruhan, mkGolRuang, usia
            ];
        });
    };

    const dtPNS = $('#tblDUKPNS').DataTable({ destroy: true, data: processData('PNS'), pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaDUKPNS').off('keyup').on('keyup', function () { dtPNS.search(this.value).draw(); });
    $('#filterGolDUKPNS').off('keyup').on('keyup', function () { dtPNS.column(3).search(this.value).draw(); });

    const dtPPPK = $('#tblDUKPPPK').DataTable({ destroy: true, data: processData('PPPK'), pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaDUKPPPK').off('keyup').on('keyup', function () { dtPPPK.search(this.value).draw(); });
    $('#filterGolDUKPPPK').off('keyup').on('keyup', function () { dtPPPK.column(3).search(this.value).draw(); });
}

async function renderTabelKGB() {
    if ($.fn.DataTable.isDataTable('#tblKGB')) { try { $('#tblKGB').DataTable().clear().destroy(); } catch (e) { } }
    const allPegawai = await dbManager.getAllPegawai();
    const dataAktif = allPegawai.filter(p => p.statusKepegawaian === 'Aktif');

    const currDate = new Date();

    const formatted = dataAktif.map(p => {
        let statusBadge = `<span class='badge bg-warning text-dark'><i class='fas fa-clock'></i> Menunggu</span>`;
        if (p.tmtKgbBaru) {
            const kgbDate = new Date(p.tmtKgbBaru);
            const diffTime = kgbDate - currDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 90 && diffDays >= 0) {
                statusBadge = `<span class='badge bg-danger'><i class='fas fa-exclamation-triangle'></i> Segera Proses</span>`;
            } else if (diffDays < 0) {
                statusBadge = `<span class='badge bg-danger'><i class='fas fa-times-circle'></i> Terlewat</span>`;
            }
        }

        return [
            p.nama,
            `<span class='badge bg-primary'>${p.statusPegawai}</span>`,
            p.gajiPokok || '-',
            p.tmtKgbLalu || '-',
            `<b>${p.tmtKgbBaru || '-'}</b>`,
            statusBadge,
            `<button class='btn btn-sm btn-info text-white me-1' title='Lihat Profil' onclick='lihatPegawai("${p.nip}")'><i class='fas fa-eye'></i></button>`
        ];
    });

    const dt = $('#tblKGB').DataTable({ destroy: true, data: formatted, pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaKGB').off('keyup').on('keyup', function () { dt.search(this.value).draw(); });
    $('#filterStatusKGB').off('change').on('change', function () { dt.column(1).search(this.value).draw(); });
}

async function renderTabelRekap() {
    const allPegawai = await dbManager.getAllPegawai();

    const renderTabelAktif = (id, statusFilter) => {
        if ($.fn.DataTable.isDataTable(id)) { try { $(id).DataTable().clear().destroy(); $(id + " tbody").empty(); } catch (e) { } }
        const data = allPegawai.filter(p => p.statusPegawai === statusFilter && p.statusKepegawaian === 'Aktif');

        const getPendidikan = (p) => {
            if (p.pendidikan) return p.pendidikan;
            // Fallback: baca dari riwayatPendidikan untuk data lama
            if (Array.isArray(p.riwayatPendidikan) && p.riwayatPendidikan.length > 0) {
                const latest = getLatestRiwayat(p.riwayatPendidikan, 4, true);
                if (latest && latest[0]) return latest[0];
            }
            return '-';
        };

        const formatted = data.map(p => [
            p.nama, p.nip, p.golongan || '-', p.jabatan || '-', getPendidikan(p), `<span class='badge bg-success'>Aktif</span>`,
            `<button class='btn btn-sm btn-info text-white me-1' title='Lihat Profil' onclick='lihatPegawai("${p.nip}")'><i class='fas fa-eye'></i></button>
             <button class='btn btn-sm btn-secondary text-white me-1' title='Edit Status' onclick='editStatusPegawai("${p.nip}")'><i class='fas fa-user-edit'></i></button>`
        ]);

        const dt = $(id).DataTable({ destroy: true, data: formatted, pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
        return dt;
    };

    const dtPNS = renderTabelAktif('#tblRekapPNS', 'PNS');
    $('#filterNamaAktifPNS').off('keyup').on('keyup', function () { dtPNS.search(this.value).draw(); });
    $('#filterGolAktifPNS').off('change').on('change', function () { dtPNS.column(2).search(this.value).draw(); });

    const dtPPPK = renderTabelAktif('#tblRekapPPPK', 'PPPK');
    $('#filterNamaRekapPPPK').off('keyup').on('keyup', function () { dtPPPK.search(this.value).draw(); });

    const dtPPPKPW = renderTabelAktif('#tblRekapPPPKPW', 'PPPK Paruh Waktu');
    $('#filterNamaRekapPPPKPW').off('keyup').on('keyup', function () { dtPPPKPW.search(this.value).draw(); });

    const dtHonorer = renderTabelAktif('#tblRekapHonorer', 'Honorer');
    $('#filterNamaRekapHonorer').off('keyup').on('keyup', function () { dtHonorer.search(this.value).draw(); });
}

async function renderTabelRiwayat() {
    const allPegawai = await dbManager.getAllPegawai();

    const renderTabel = (id, statusFilter, mapFn) => {
        if ($.fn.DataTable.isDataTable(id)) { try { $(id).DataTable().clear().destroy(); $(id + " tbody").empty(); } catch (e) { } }
        const data = allPegawai.filter(p => p.statusKepegawaian === statusFilter);
        const formatted = data.map(mapFn);
        $(id).DataTable({ destroy: true, data: formatted, pageLength: 5 });
    };

    const badgeMap = { PNS: 'bg-primary', PPPK: 'bg-success', Honorer: 'bg-warning' };
    const getBadge = (s) => `<span class='badge ${badgeMap[s] || 'bg-secondary'}'>${s || '-'}</span>`;
    const getAksi = (nip) => `<button class='btn btn-sm btn-info text-white me-1' title='Lihat Profil' onclick='lihatPegawai("${nip}")'><i class='fas fa-eye'></i></button><button class='btn btn-sm btn-secondary text-white' title='Edit Status' onclick='editStatusPegawai("${nip}")'><i class='fas fa-user-edit'></i></button>`;

    renderTabel('#tblPensiun', 'Pensiun', p => [p.nip, p.nama, getBadge(p.statusPegawai), p.tmtPensiun || '-', p.jabatan || '-', getAksi(p.nip)]);
    renderTabel('#tblMutasi', 'Mutasi', p => [p.nip, p.nama, getBadge(p.statusPegawai), p.tmtMutasi || '-', p.mutasiKe || p.keteranganMutasi || '-', p.jabatan || '-', getAksi(p.nip)]);
    renderTabel('#tblMeninggal', 'Meninggal', p => [p.nip, p.nama, getBadge(p.statusPegawai), p.jabatan || '-', p.tglMeninggal || p.tanggalMeninggal || '-', getAksi(p.nip)]);
    renderTabel('#tblBerhenti', 'Berhenti', p => [p.nip, p.nama, getBadge(p.statusPegawai), p.tanggalBerhenti || '-', p.alasanBerhenti || p.keteranganBerhenti || '-', p.jabatan || '-', getAksi(p.nip)]);

    const oldTglMeninggalLabel = document.querySelector('#tblMeninggal thead th:nth-child(5)');
    if (oldTglMeninggalLabel) oldTglMeninggalLabel.textContent = 'Tanggal Meninggal';
}

function tambahBaris(tabelId) {
    let tr = document.createElement('tr');

    if (tabelId === 'tabelPangkat') {
        tr.innerHTML = `
            <td>
                <select class='form-select form-select-sm'>
                    <option>Juru Muda / I/a</option>
                    <option>Juru Muda Tk. I / I/b</option>
                    <option>Juru / I/c</option>
                    <option>Juru Tk. I / I/d</option>
                    <option>Pengatur Muda / II/a</option>
                    <option>Pengatur Muda Tk. I / II/b</option>
                    <option>Pengatur / II/c</option>
                    <option>Pengatur Tk. I / II/d</option>
                    <option>Penata Muda / III/a</option>
                    <option>Penata Muda Tk. I / III/b</option>
                    <option>Penata / III/c</option>
                    <option>Penata Tk. I / III/d</option>
                    <option>Pembina / IV/a</option>
                    <option>Pembina Tk. I / IV/b</option>
                    <option>Pembina Utama Muda / IV/c</option>
                    <option>Pembina Utama Madya / IV/d</option>
                    <option>Pembina Utama / IV/e</option>
                </select>
            </td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Contoh: Gubernur'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Thn'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Bln'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelJabatan') {
        tr.innerHTML = `
            <td>
                <select class='form-select form-select-sm' onchange='toggleEselon(this)'>
                    <option value="Struktural">Struktural</option>
                    <option value="Fungsional Tertentu">Fungsional Tertentu</option>
                    <option value="Fungsional Umum">Fungsional Umum</option>
                </select>
            </td>
            <td>
                <select class='form-select form-select-sm eselon-select'>
                    <option>Eselon I.a</option><option>Eselon I.b</option>
                    <option>Eselon II.a</option><option>Eselon II.b</option>
                    <option>Eselon III.a</option><option>Eselon III.b</option>
                    <option>Eselon IV.a</option><option>Eselon IV.b</option>
                    <option>Eselon V.a</option>
                    <option value="-">-</option>
                </select>
            </td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Contoh: Setda...'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelPendidikan') {
        tr.innerHTML = `
            <td><select class='form-select form-select-sm'><option>SD</option><option>SMP</option><option>SMA</option><option>D3</option><option>S1</option><option>S2</option><option>S3</option></select></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='2006'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='2010'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Gelar Depan'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Gelar Belakang'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelDiklat') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='2020'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Contoh: 40 Jam'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelAnak') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><select class='form-select form-select-sm'><option>Laki-laki</option><option>Perempuan</option></select></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><select class='form-select form-select-sm'><option>Kandung</option><option>Tiri</option><option>Angkat</option></select></td>
            <td><select class='form-select form-select-sm'><option value=''>Pilih</option><option value='1'>1</option><option value='2'>2</option><option value='3'>3</option><option value='4'>4</option><option value='5'>5</option><option value='6'>6</option></select></td>
            <td><select class='form-select form-select-sm'><option>Tidak</option><option>Ya</option></select></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><select class='form-select form-select-sm'><option>Belum</option><option>Sudah</option></select></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelKontrak') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td>
                <select class='form-select form-select-sm'>
                    <option>Golongan I</option><option>Golongan II</option><option>Golongan III</option>
                    <option>Golongan IV</option><option>Golongan V</option><option>Golongan VI</option>
                    <option>Golongan VII</option><option>Golongan VIII</option><option>Golongan IX</option>
                    <option>Golongan X</option><option>Golongan XI</option><option>Golongan XII</option>
                    <option>Golongan XIII</option><option>Golongan XIV</option><option>Golongan XV</option>
                    <option>Golongan XVI</option><option>Golongan XVII</option>
                </select>
            </td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Thn'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Bln'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelKGB') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm format-rupiah'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Thn'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Bln'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    }

    document.querySelector(`#${tabelId} tbody`).appendChild(tr);
}

function toggleEselon(selectElement) {
    const eselonSelect = selectElement.closest('tr').querySelector('.eselon-select');
    if (selectElement.value.includes('Fungsional')) {
        eselonSelect.value = '-';
        eselonSelect.disabled = true;
    } else {
        eselonSelect.disabled = false;
        if (eselonSelect.value === '-') eselonSelect.selectedIndex = 0;
    }
}

function toggleSKFields(status) {
    document.getElementById('sk-pns-fields').classList.add('d-none');
    document.getElementById('sk-pppk-fields').classList.add('d-none');
    document.getElementById('sk-honorer-fields').classList.add('d-none');

    if (status === 'PNS') {
        document.getElementById('sk-pns-fields').classList.remove('d-none');
    } else if (status === 'PPPK' || status === 'PPPK Paruh Waktu') {
        document.getElementById('sk-pppk-fields').classList.remove('d-none');
    } else if (status === 'Honorer') {
        document.getElementById('sk-honorer-fields').classList.remove('d-none');
    }
}

function hitungKGBBerikutnya() {
    const tmtTerakhir = document.getElementById('kgbTmtTerakhir').value;
    if (tmtTerakhir) {
        let date = new Date(tmtTerakhir);
        date.setFullYear(date.getFullYear() + 2); // Umumnya 2 tahun
        document.getElementById('kgbTmtBerikutnya').value = date.toISOString().split('T')[0];
    }
}

function simpanKGB() {
    Swal.fire('Berhasil!', 'Data Gaji Berkala berhasil diperbarui!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalEditKGB')).hide();
}

function lihatKGB(btn) {
    const row = btn.closest('tr');
    document.getElementById('lihatKgbNama').innerText = row.cells[0].innerText;
    document.getElementById('lihatKgbStatus').innerHTML = row.cells[1].innerHTML;
    document.getElementById('lihatKgbGapok').innerText = row.cells[2].innerText;
    document.getElementById('lihatKgbTmtLama').innerText = row.cells[3].innerText;
    document.getElementById('lihatKgbTmtBaru').innerHTML = row.cells[4].innerHTML;
    document.getElementById('lihatKgbStatusKGB').innerHTML = row.cells[5].innerHTML;
    var myModal = new bootstrap.Modal(document.getElementById('modalLihatKGB'));
    myModal.show();
}

function toggleFormStatus(status) {
    const formPensiun = document.getElementById('form-pensiun-meninggal');
    const formResign = document.getElementById('form-resign');
    const formMutasi = document.getElementById('form-mutasi');
    if (formPensiun) formPensiun.classList.add('d-none');
    if (formResign) formResign.classList.add('d-none');
    if (formMutasi) formMutasi.classList.add('d-none');

    if (status === 'Pensiun' || status === 'Meninggal') {
        if (formPensiun) formPensiun.classList.remove('d-none');
        const label = document.getElementById('labelTglPensiunMeninggal');
        if (label) label.innerText = status === 'Pensiun' ? 'Tanggal Pensiun' : 'Tanggal Meninggal';
    } else if (status === 'Berhenti') {
        if (formResign) formResign.classList.remove('d-none');
    } else if (status === 'Mutasi') {
        if (formMutasi) formMutasi.classList.remove('d-none');
    }
}

async function validasiNIK(el) {
    const val = el.value.trim();
    if (val === '') {
        el.classList.remove('is-invalid');
        return;
    }
    if (!/^\d+$/.test(val)) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'NIK harus berupa angka!', showConfirmButton: false, timer: 3000 });
        el.value = '';
        el.classList.add('is-invalid');
        return;
    } else if (val.length !== 16) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'NIK harus pas 16 digit!', showConfirmButton: false, timer: 3000 });
        el.classList.add('is-invalid');
        return;
    }

    if (typeof dbManager !== 'undefined') {
        const allPegawai = await dbManager.getAllPegawai();
        const existing = allPegawai.find(p => p.nik === val && p.nip !== window.currentEditUtamaNip);
        if (existing) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `NIK ini sudah ada atas nama ${existing.nama}`, showConfirmButton: false, timer: 4000 });
            el.classList.add('is-invalid');
        } else {
            el.classList.remove('is-invalid');
        }
    }
}

async function validasiNIP(el) {
    const val = el.value.trim();
    if (val === '') {
        el.classList.remove('is-invalid');
        return;
    }

    if (!/^\d+$/.test(val)) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'NIP harus berupa angka!', showConfirmButton: false, timer: 3000 });
        el.value = '';
        el.classList.add('is-invalid');
        return;
    } else if (val.length !== 18) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'NIP harus pas 18 digit!', showConfirmButton: false, timer: 3000 });
        el.classList.add('is-invalid');
        return;
    }

    if (typeof dbManager !== 'undefined') {
        const allPegawai = await dbManager.getAllPegawai();
        const existing = allPegawai.find(p => p.nip === val && p.nip !== window.currentEditUtamaNip);
        if (existing) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `NIP ini sudah ada atas nama ${existing.nama}`, showConfirmButton: false, timer: 4000 });
            el.classList.add('is-invalid');
        } else {
            el.classList.remove('is-invalid');
        }
    }
}

function bukaModalTambah() {
    window.currentEditUtamaNip = null;
    // Kosongkan form secara manual karena tidak ada tag <form>
    const modalEl = document.getElementById('modalPegawai');
    if (modalEl) {
        modalEl.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else {
                el.value = '';
            }
            if (el.id === 'statusPegawai') {
                el.disabled = false;
                el.removeAttribute('disabled');
            }
        });
    }

    document.getElementById('peg_nik')?.classList.remove('is-invalid');
    document.getElementById('peg_nip')?.classList.remove('is-invalid');

    const preview = document.getElementById('previewFotoPegawai');
    if (preview) preview.src = 'logo-simpeel.png';

    ['tabelPangkat', 'tabelKontrak', 'tabelJabatan', 'tabelKGB', 'tabelPendidikan', 'tabelAnak', 'tabelDiklat'].forEach(id => {
        const tbody = document.querySelector(`#${id} tbody`);
        if (tbody) tbody.innerHTML = '';
    });

    // Reset combo alamat (karena wilayah.js mengubah struktur DOM saat kosong)
    const selKab = document.getElementById('peg_alamat_kabkota');
    if (selKab) selKab.innerHTML = '<option value="">-- Pilih Kab/Kota --</option>';

    // Enable NIP input
    const nipInput = document.getElementById('peg_nip');
    if (nipInput) nipInput.readOnly = false;

    const modal = new bootstrap.Modal(document.getElementById('modalPegawai'));
    modal.show();
}

async function editPegawai(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) {
        Swal.fire('Error', 'Data pegawai tidak ditemukan!', 'error');
        return;
    }

    window.currentEditUtamaNip = p.nip;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    // Populate Data
    setVal('peg_nip', p.nip || '');
    setVal('peg_nip_lama', p.nipLama || ''); // Opsional, bisa diisi NIP lama jika ada
    const nipInput = document.getElementById('peg_nip');
    if (nipInput) nipInput.readOnly = true; // NIP baru tidak bisa diedit

    setVal('peg_no_hp', p.noHp || '');
    setVal('peg_email', p.email || '');
    setVal('peg_gol_darah', p.golDarah || '-');
    setVal('peg_tinggi_badan', p.tinggiBadan || '');
    setVal('peg_berat_badan', p.beratBadan || '');
    setVal('peg_hobby', p.hobby || '');
    setVal('peg_is_kebutuhan_khusus', p.isKebutuhanKhusus || 'Tidak');
    setVal('peg_uraian_kebutuhan_khusus', p.uraianKebutuhanKhusus || '');
    if (typeof toggleKebutuhanKhusus === 'function') toggleKebutuhanKhusus();
    setVal('peg_nik', p.nik || '');
    setVal('peg_nama', p.nama || '');
    setVal('peg_tempat_lahir', p.tempatLahir || '');
    setVal('peg_tgl_lahir', p.tglLahir || '');
    setVal('peg_kelamin', p.kelamin || 'Laki-Laki');
    setVal('peg_agama', p.agama || 'Islam');
    setVal('peg_status_kawin', p.statusKawin || 'Kawin');

    setVal('peg_pasangan_nama', p.pasanganNama || '');
    setVal('peg_pasangan_nik', p.pasanganNik || '');
    setVal('peg_pasangan_tmpt_lahir', p.pasanganTmptLahir || '');
    setVal('peg_pasangan_tgl_lahir', p.pasanganTglLahir || '');
    setVal('peg_pasangan_pekerjaan', p.pasanganPekerjaan || '');
    setVal('peg_pasangan_nip', p.pasanganNip || '');
    if (typeof toggleNipPasangan === 'function') toggleNipPasangan();

    setVal('peg_alamat', p.alamat || '');
    setVal('peg_alamat_provinsi', p.alamatProvinsi || '');
    const selProv = document.getElementById('peg_alamat_provinsi');
    const selKab = document.getElementById('peg_alamat_kabkota');
    if (selProv && p.alamatProvinsi) {
        selProv.value = p.alamatProvinsi;
        // Populate kab/kota sesuai provinsi
        if (selKab && typeof dataWilayah !== 'undefined' && dataWilayah[p.alamatProvinsi]) {
            selKab.innerHTML = '<option value="">-- Pilih Kab/Kota --</option>';
            dataWilayah[p.alamatProvinsi].forEach(kab => {
                if (!kab.endsWith('(PROV)')) {
                    const opt = document.createElement('option');
                    opt.value = kab;
                    opt.textContent = kab;
                    selKab.appendChild(opt);
                }
            });
            selKab.value = p.alamatKabKota || '';
        }
    }

    setVal('statusPegawai', p.statusPegawai || 'PNS');
    if (typeof toggleSKFields === 'function') toggleSKFields(p.statusPegawai || 'PNS');

    // === KUNCI UI: 5 Data Utama read-only saat Edit Data Lengkap ===
    try {
        var _ro = ['peg_nama', 'peg_nik', 'peg_tgl_lahir'];
        _ro.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { el.readOnly = true; el.style.backgroundColor = '#e9ecef'; el.title = 'Ubah via Manajemen Akun - Edit Akun'; }
        });
        var _sSt = document.getElementById('statusPegawai');
        if (_sSt) {
            _sSt.disabled = true;
            _sSt.setAttribute('disabled', 'disabled');
            _sSt.style.backgroundColor = '#e9ecef';
            _sSt.title = 'Ubah via Manajemen Akun - Edit Akun';
        }
        if (!document.getElementById('_alert5data')) {
            var _mb = document.querySelector('#modalPegawai .modal-body');
            if (_mb) {
                var ssoToken = localStorage.getItem('SIMPEEL_TOKEN_ONLINE') || localStorage.getItem('SIMPEEL_TOKEN_OFFLINE'); var role = 'admin'; if (ssoToken) { try { role = JSON.parse(ssoToken).role; } catch (e) {} } if (role === 'pegawai') return; var _a = document.createElement('div');
                _a.id = '_alert5data';
                _a.className = 'alert alert-info py-2 px-3 mb-2';
                _a.style.fontSize = '0.82rem';
                _a.innerHTML = '<strong>5 Data Utama terkunci:</strong> NIP, Nama, NIK, Tgl Lahir & Status Pegawai hanya bisa diubah melalui <strong>Manajemen Akun - Edit Akun</strong>.';
                _mb.insertBefore(_a, _mb.firstChild);
            }
        }
    } catch (e) { console.warn('Kunci UI error:', e); }
    setVal('peg_gelar_depan', p.gelarDepan || '');
    setVal('peg_gelar_belakang', p.gelarBelakang || '');
    setVal('peg_pendidikan', p.pendidikan || 'S1');

    // Populate Tables from Arrays
    const populateTable = (tableId, dataArray) => {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';
        if (dataArray && Array.isArray(dataArray)) {
            dataArray.forEach(rowData => {
                tambahBaris(tableId);
                const tr = tbody.lastElementChild;
                const inputs = tr.querySelectorAll('input:not([type="file"]), select');
                rowData.forEach((val, index) => {
                    if (inputs[index]) {
                        inputs[index].value = val;
                        if (inputs[index].classList.contains('format-rupiah') && val) {
                            let cleanVal = String(val).replace(/\D/g, '');
                            if (cleanVal) inputs[index].value = new Intl.NumberFormat('id-ID').format(cleanVal);
                        }
                        // Show view button if it's the hidden file input and has value
                        if (inputs[index].type === 'hidden' && val) {
                            const btn = inputs[index].nextElementSibling;
                            if (btn && btn.classList.contains('btn-view-file')) {
                                btn.classList.remove('d-none');
                            }
                        }
                        // trigger onchange event for toggleEselon etc
                        if (inputs[index].tagName === 'SELECT') {
                            inputs[index].dispatchEvent(new Event('change'));
                        }
                    }
                });
            });
        }
    };

    // Shim for tabelPendidikan (added Gelar Belakang at index 6, old length 7)
    if (p.riwayatPendidikan) {
        p.riwayatPendidikan = p.riwayatPendidikan.map(r => {
            if (r.length === 7) return [r[0], r[1], r[2], r[3], r[4], r[5], '', r[6]];
            return r;
        });
    }

    // Shim for tabelAnak (added NIK at 1, JK at 2, old length 5) (added IstriKe, Tunjangan, Kerja, Sekolah, old length 7)
    if (p.riwayatAnak) {
        p.riwayatAnak = p.riwayatAnak.map(r => {
            if (r.length === 5) return [r[0], '', 'Laki-laki', r[1], r[2], r[3], '', 'Tidak', '', 'Belum', r[4]];
            if (r.length === 7) return [r[0], r[1], r[2], r[3], r[4], r[5], '', 'Tidak', '', 'Belum', r[6]];
            return r;
        });
    }

    populateTable('tabelPangkat', p.riwayatPangkat);
    populateTable('tabelKontrak', p.riwayatKontrak);
    populateTable('tabelJabatan', p.riwayatJabatan);
    populateTable('tabelKGB', p.riwayatKGB);
    populateTable('tabelPendidikan', p.riwayatPendidikan);
    populateTable('tabelAnak', p.riwayatAnak);
    populateTable('tabelDiklat', p.riwayatDiklat);

    setVal('cert_no', p.certNo || '');
    setVal('cert_tgl', p.certTgl || '');
    setVal('cert_nrg', p.certNrg || '');
    setVal('cert_nuptk', p.certNuptk || '');
    setVal('cert_tahun', p.certTahun || '');
    setVal('cert_mapel', p.certMapel || '');
    setVal('cert_lptk', p.certLptk || '');
    setVal('cert_pejabat', p.certPejabat || '');
    setVal('cert_file_data', p.certFileData || '');

    if (p.certFileData) {
        const btnFile = document.querySelector('#cert_file_data').nextElementSibling;
        if (btnFile && btnFile.classList.contains('btn-view-file')) btnFile.classList.remove('d-none');
    }

    // Foto
    const imgEl = document.getElementById('previewFotoPegawai');
    if (imgEl) {
        if (p.foto && p.foto.startsWith('data:')) {
            imgEl.src = p.foto;
        } else {
            imgEl.src = 'logo-simpeel.png';
        }
    }

    // Show Modal
    const modalEl = document.getElementById('modalPegawai');
    if (modalEl) {
        // Lock logic
        const isLocked = p.isLocked === true;
        const allInputs = modalEl.querySelectorAll('input, select, textarea, button');
        allInputs.forEach(el => {
            if (el.dataset.bsDismiss === 'modal') return; // Jangan disable tombol close

            if (el.tagName === 'BUTTON') {
                if (el.onclick && (el.onclick.toString().includes('tambahBaris') || el.onclick.toString().includes('hapusBaris') || el.onclick.toString().includes('remove()'))) {
                    el.disabled = isLocked;
                }
                if (el.onclick && el.onclick.toString().includes('simpanPegawai')) {
                    el.disabled = isLocked;
                    el.style.display = isLocked ? 'none' : 'inline-block';
                }
                if (el.id === 'btnUploadFoto' || el.id === 'btnCaptureFoto') el.disabled = isLocked;
            } else {
                if (el.id === 'peg_nip') el.readOnly = true;
                else el.disabled = isLocked;
            }
        });

        const ssoToken = localStorage.getItem('SIMPEEL_TOKEN_ONLINE') || localStorage.getItem('SIMPEEL_TOKEN_OFFLINE');
        let session = null;
        if (ssoToken) {
            try { session = JSON.parse(ssoToken); } catch (e) { }
        }
        const isPegawai = session && session.role === 'pegawai';

        const titleEl = modalEl.querySelector('.modal-title');
        if (titleEl) {
            titleEl.innerHTML = isLocked
                ? '<i class="fas fa-lock text-danger"></i> Edit Data Pegawai <span class="badge bg-danger ms-2">TERKUNCI</span>'
                : '<i class="fas fa-user-edit"></i> Edit Data Pegawai';
        }

        if (!isPegawai) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
    } else {
        Swal.fire('Error', 'Modal edit tidak ditemukan di HTML.', 'error');
    }
}

// ==========================================
// IMPORT AKUN EXCEL (6 KOLOM)
// ==========================================
async function downloadTemplateImportAkun() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Akun Pegawai');

    const headers = ['NIP', 'Nama', 'NIK', 'Tgl Lahir (YYYY-MM-DD)', 'Status Pegawai (PNS/PPPK/Honorer)', 'Password (opsional, default=NIP)'];
    const headerRow = sheet.getRow(1);
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4e73df' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.columns = headers.map(() => ({ width: 30 }));

    // Contoh data
    sheet.addRow(['197001011990011001', 'Nama Pegawai', '1234567890123456', '1970-01-01', 'PNS', '']);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Template_Import_Akun.xlsx');
}

async function prosesImportAkunExcel() {
    const fileInput = document.getElementById('fileImportAkunExcel');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        Swal.fire('Peringatan', 'Pilih file Excel terlebih dahulu!', 'warning');
        return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(e.target.result);
            const sheet = workbook.worksheets[0];
            const rows = [];
            sheet.eachRow((row, rowIndex) => {
                if (rowIndex === 1) return; // skip header
                const nip = String(row.getCell(1).value || '').trim();
                const nama = String(row.getCell(2).value || '').trim();
                const nik = String(row.getCell(3).value || '').trim();
                const tglLahir = String(row.getCell(4).value || '').trim();
                const statusPegawai = String(row.getCell(5).value || '').trim();
                const password = String(row.getCell(6).value || '').trim() || nip; // default password = NIP
                if (!nip || !nama) return;
                rows.push({ nip, nama, nik, tglLahir, statusPegawai, password });
            });

            if (rows.length === 0) {
                Swal.fire('Peringatan', 'Tidak ada data yang valid ditemukan di file Excel!', 'warning');
                return;
            }

            let berhasil = 0, gagal = 0;
            for (const row of rows) {
                try {
                    const payload = {
                        nip: row.nip, nama: row.nama, nik: row.nik,
                        tglLahir: row.tglLahir, statusPegawai: row.statusPegawai || 'PNS',
                        password: row.password, aktif: 1
                    };
                    await dbManager.saveAkun(payload);
                    // Buat juga data pegawai minimal jika belum ada
                    const allPeg = await dbManager.getAllPegawai();
                    const existing = allPeg ? allPeg.find(p => p.nip === row.nip) : null;
                    if (!existing) {
                        await dbManager.savePegawai({
                            nip: row.nip, nama: row.nama, nik: row.nik,
                            tglLahir: row.tglLahir, statusPegawai: row.statusPegawai || 'PNS',
                            statusKepegawaian: 'Aktif'
                        });
                    }
                    berhasil++;
                } catch (err) {
                    gagal++;
                }
            }

            Swal.fire('Selesai', `Import akun selesai.\nBerhasil: ${berhasil}, Gagal: ${gagal}`, 'success');
            const m = bootstrap.Modal.getInstance(document.getElementById('modalImportAkun'));
            if (m) m.hide();
            fileInput.value = '';
            renderTabelAkun();
            // Setelah menambah/ubah akun dan pegawai minimal, pastikan tabel pegawai ikut ter-refresh
            if (typeof renderTabelPNS === 'function') renderTabelPNS();
            // Pastikan tabel pegawai juga ter-refresh setelah import akun
            if (typeof renderTabelPNS === 'function') renderTabelPNS();
        } catch (err) {
            Swal.fire('Error', 'Gagal membaca file Excel: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

async function downloadTemplateImport() {
    const workbook = new ExcelJS.Workbook();

    const addSheet = (name, headers, colorArgb) => {
        const sheet = workbook.addWorksheet(name);
        const headerRow = sheet.getRow(1);
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorArgb } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        sheet.columns = headers.map(() => ({ width: 25 }));
        return sheet;
    };

    addSheet('Data Pribadi', ['NIP', 'NIK', 'Nama Lengkap', 'Tempat Lahir', 'Tgl Lahir (YYYY-MM-DD)', 'Kelamin', 'Agama', 'Status Kawin', 'Alamat', 'NIP Lama', 'No HP', 'Email', 'Gol Darah', 'Tinggi Badan', 'Berat Badan', 'Hobby', 'Kebutuhan Khusus', 'Uraian Kebutuhan Khusus', 'No SK CPNS', 'TMT CPNS (YYYY-MM-DD)', 'No SK PNS', 'TMT PNS (YYYY-MM-DD)', 'No SK PPPK', 'TMT PPPK Mulai', 'TMT PPPK Selesai', 'No SK Honor', 'TMT Honor', 'No Karpeg', 'NPWP', 'BPJS', 'Rekening', 'Status Pegawai (PNS/PPPK/Honorer)', 'Status Aktif (Aktif/Mutasi/Pensiun/dll)'], 'FF28a745');
    addSheet('Riwayat Pangkat', ['NIP', 'Golongan / Ruang', 'TMT Pangkat (YYYY-MM-DD)', 'Nomor SK', 'Tanggal SK (YYYY-MM-DD)', 'Pejabat Penandatangan', 'MK Tahun', 'MK Bulan'], 'FF007bff');
    addSheet('Riwayat Jabatan', ['NIP', 'Jenis Jabatan (Struktural/Fungsional Umum/dll)', 'Eselon', 'Nama Jabatan', 'Unit Kerja', 'TMT Jabatan (YYYY-MM-DD)', 'No SK Jabatan'], 'FFfd7e14');
    addSheet('Riwayat KGB', ['NIP', 'No SK KGB', 'Tanggal SK (YYYY-MM-DD)', 'TMT KGB (YYYY-MM-DD)', 'Jumlah Gaji Pokok', 'MK Tahun', 'MK Bulan'], 'FFe83e8c');
    addSheet('Riwayat Pendidikan', ['NIP', 'Tingkat (SD/SMP/SMA/S1/dll)', 'Nama Sekolah/Kampus', 'Jurusan', 'Tahun Masuk', 'Tahun Lulus', 'Nama Kepala/Rektor'], 'FF6f42c1');
    addSheet('Riwayat Keluarga', ['NIP', 'Nama Keluarga', 'Tempat Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'Status (Anak Kandung/Suami/Istri/dll)'], 'FFffc107');
    addSheet('Riwayat Diklat', ['NIP', 'Nama Diklat/Kursus', 'Penyelenggara', 'Tahun', 'Jumlah Jam', 'Nomor Sertifikat'], 'FF17a2b8');
    addSheet('Riwayat Kontrak', ['NIP', 'Jabatan Kontrak', 'Golongan/Kelas', 'TMT Mulai (YYYY-MM-DD)', 'TMT Selesai (YYYY-MM-DD)', 'Nomor SK', 'Tanggal SK (YYYY-MM-DD)', 'Instansi/Penempatan', 'Gaji/Honor', 'Keterangan'], 'FF6c757d');

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Template_Import_Pegawai_Online.xlsx');
}

async function prosesImportExcel() {
    const fileInput = document.getElementById('fileImportExcel');
    if (fileInput.files.length === 0) {
        Swal.fire('Peringatan', 'Harap pilih file Excel terlebih dahulu!', 'warning');
        return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });

            const sheetPribadi = workbook.Sheets['Data Pribadi'];
            if (!sheetPribadi) throw new Error("Sheet 'Data Pribadi' tidak ditemukan! Pastikan menggunakan template yang baru.");
            const jsonPribadi = XLSX.utils.sheet_to_json(sheetPribadi, { defval: '' });

            let successCount = 0;
            let errorRows = [];

            const getDataSheet = (name) => {
                const sheet = workbook.Sheets[name];
                return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : [];
            };

            const listPangkat = getDataSheet('Riwayat Pangkat');
            const listJabatan = getDataSheet('Riwayat Jabatan');
            const listKGB = getDataSheet('Riwayat KGB');
            const listPendidikan = getDataSheet('Riwayat Pendidikan');
            const listKeluarga = getDataSheet('Riwayat Keluarga');
            const listDiklat = getDataSheet('Riwayat Diklat');
            const listKontrak = getDataSheet('Riwayat Kontrak');

            const formatDate = (val) => {
                if (!val) return '';
                if (val instanceof Date) {
                    val.setMinutes(val.getMinutes() - val.getTimezoneOffset());
                    return val.toISOString().split('T')[0];
                }
                return String(val).trim();
            };

            for (let i = 0; i < jsonPribadi.length; i++) {
                const row = jsonPribadi[i];
                const rNum = i + 2;
                let nip = String(row['NIP'] || '').trim();
                let nik = String(row['NIK'] || '').trim();
                let nama = String(row['Nama Lengkap'] || '').trim().toUpperCase();

                if (!nip && !nama) continue;
                if (!/^\d{18}$/.test(nip)) {
                    errorRows.push(`Baris ${rNum} (${nama || 'Tanpa Nama'}): NIP harus 18 digit angka.`);
                    continue;
                }

                let rPangkat = listPangkat.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Golongan / Ruang'], formatDate(r['TMT Pangkat (YYYY-MM-DD)']), r['Nomor SK'], formatDate(r['Tanggal SK (YYYY-MM-DD)']), r['Pejabat Penandatangan'], r['MK Tahun'], r['MK Bulan']
                ]);
                let rJabatan = listJabatan.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Jenis Jabatan (Struktural/Fungsional Umum/dll)'], r['Eselon'], r['Nama Jabatan'], r['Unit Kerja'], formatDate(r['TMT Jabatan (YYYY-MM-DD)']), r['No SK Jabatan']
                ]);
                let rKGB = listKGB.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['No SK KGB'], formatDate(r['Tanggal SK (YYYY-MM-DD)']), formatDate(r['TMT KGB (YYYY-MM-DD)']), r['Jumlah Gaji Pokok'], r['MK Tahun'], r['MK Bulan']
                ]);
                let rPendidikan = listPendidikan.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Tingkat (SD/SMP/SMA/S1/dll)'], r['Nama Sekolah/Kampus'], r['Jurusan'], r['Tahun Masuk'], r['Tahun Lulus'], r['Nama Kepala/Rektor']
                ]);
                let rKeluarga = listKeluarga.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Nama Keluarga'], r['Tempat Lahir'], formatDate(r['Tanggal Lahir (YYYY-MM-DD)']), r['Status (Anak Kandung/Suami/Istri/dll)']
                ]);
                let rDiklat = listDiklat.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Nama Diklat/Kursus'], r['Penyelenggara'], r['Tahun'], r['Jumlah Jam'], r['Nomor Sertifikat']
                ]);
                let rKontrak = listKontrak.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Jabatan Kontrak'], r['Golongan/Kelas'], formatDate(r['TMT Mulai (YYYY-MM-DD)']), formatDate(r['TMT Selesai (YYYY-MM-DD)']), r['Nomor SK'], formatDate(r['Tanggal SK (YYYY-MM-DD)']), r['Instansi/Penempatan'], r['Gaji/Honor'], r['Keterangan']
                ]);

                rPangkat = sortRiwayatArray(rPangkat, 1);
                rJabatan = sortRiwayatArray(rJabatan, 4);
                rKGB = sortRiwayatArray(rKGB, 2);
                rPendidikan = sortRiwayatArray(rPendidikan, 4, true);
                rKeluarga = sortRiwayatArray(rKeluarga, 2);
                rDiklat = sortRiwayatArray(rDiklat, 2, true);
                rKontrak = sortRiwayatArray(rKontrak, 2);

                let golongan = ''; let jabatan = ''; let unitKerja = ''; let tmtJabatan = ''; let pendidikan = ''; let tmtKgbLalu = ''; let gajiPokok = '';

                const lPangkat = getLatestRiwayat(rPangkat, 1);
                const lKontrak = getLatestRiwayat(rKontrak, 2);
                if (lPangkat) golongan = lPangkat[0];
                else if (lKontrak) golongan = lKontrak[1];

                const lJabatan = getLatestRiwayat(rJabatan, 4);
                if (lJabatan) { jabatan = lJabatan[2]; unitKerja = lJabatan[3]; tmtJabatan = lJabatan[4]; }
                else if (lKontrak) { jabatan = lKontrak[0]; }

                const lPend = getLatestRiwayat(rPendidikan, 4, true);
                if (lPend) pendidikan = lPend[0];

                const lKGB = getLatestRiwayat(rKGB, 2);
                if (lKGB) { tmtKgbLalu = lKGB[2]; gajiPokok = lKGB[3]; }

                let kgbDate = tmtKgbLalu ? (parseInt(tmtKgbLalu.substring(0, 4)) + 2) + tmtKgbLalu.substring(4) : '';

                const p = {
                    nip: nip, nik: nik, nama: nama,
                    tempatLahir: row['Tempat Lahir'] || '', tglLahir: formatDate(row['Tgl Lahir (YYYY-MM-DD)']),
                    kelamin: row['Kelamin'] || 'Laki-Laki', agama: row['Agama'] || '', statusKawin: row['Status Kawin'] || '',
                    alamat: row['Alamat'] || '', nipLama: row['NIP Lama'] || '', noHp: row['No HP'] || '',
                    email: row['Email'] || '', golDarah: row['Gol Darah'] || '-', tinggiBadan: row['Tinggi Badan'] || '',
                    beratBadan: row['Berat Badan'] || '', hobby: row['Hobby'] || '', isKebutuhanKhusus: row['Kebutuhan Khusus'] || 'Tidak',
                    uraianKebutuhanKhusus: row['Uraian Kebutuhan Khusus'] || '', noSkCpns: row['No SK CPNS'] || '',
                    tmtCpns: formatDate(row['TMT CPNS (YYYY-MM-DD)']), noSkPns: row['No SK PNS'] || '',
                    tmtPns: formatDate(row['TMT PNS (YYYY-MM-DD)']), noSkPppk: row['No SK PPPK'] || '',
                    tmtPppkMulai: formatDate(row['TMT PPPK Mulai']), tmtPppkSelesai: formatDate(row['TMT PPPK Selesai']),
                    noSkHonor: row['No SK Honor'] || '', tmtHonor: formatDate(row['TMT Honor']),
                    karpeg: row['No Karpeg'] || '', npwp: row['NPWP'] || '', bpjs: row['BPJS'] || '',
                    rekening: row['Rekening'] || '', foto: '',
                    statusPegawai: row['Status Pegawai (PNS/PPPK/Honorer)'] || 'PNS',
                    statusKepegawaian: row['Status Aktif (Aktif/Mutasi/Pensiun/dll)'] || 'Aktif',
                    golongan: golongan, jabatan: jabatan, tmtJabatan: tmtJabatan, pendidikan: pendidikan, unitKerja: unitKerja || 'Dinas',
                    gajiPokok: gajiPokok, tmtKgbLalu: tmtKgbLalu, tmtKgbBaru: kgbDate, tmtPensiun: '',
                    riwayatPangkat: rPangkat, riwayatKontrak: rKontrak, riwayatJabatan: rJabatan,
                    riwayatKGB: rKGB, riwayatPendidikan: rPendidikan, riwayatAnak: rKeluarga, riwayatDiklat: rDiklat
                };

                const res = await dbManager.savePegawai(p);
                if (res && res.success === false) {
                    errorRows.push(`Baris ${rNum} (${nama}): ${res.message}`);
                } else {
                    successCount++;
                }
            }

            if (errorRows.length > 0) {
                const errorHtml = errorRows.map(e => `<li>${e}</li>`).join('');
                Swal.fire({
                    title: 'Import Selesai dengan Catatan',
                    html: `<p>Berhasil menyimpan: <b>${successCount} data</b>.</p>
                           <p class='text-danger mb-1'><b>Gagal menyimpan (${errorRows.length} data):</b></p>
                           <ul class='text-start text-danger' style='max-height: 200px; overflow-y: auto; font-size: 0.85rem;'>${errorHtml}</ul>`,
                    icon: 'warning',
                    width: '600px'
                }).then(() => location.reload());
            } else {
                Swal.fire('Berhasil!', 'Semua data (' + successCount + ' pegawai) berhasil diimport!', 'success')
                    .then(() => location.reload());
            }

        } catch (err) {
            Swal.fire('Error', 'Terjadi kesalahan saat memproses Excel: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

async function lihatPegawai(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (p) {
        document.getElementById('lihat_nama').innerText = p.nama || '-';
        document.getElementById('lihat_nip').innerText = p.nip || '-';
        document.getElementById('lihat_statusPegawai').innerText = p.statusPegawai || '-';
        document.getElementById('lihat_agama').innerText = p.agama || '-';
        document.getElementById('lihat_jabatan').innerText = p.jabatan || '-';
        document.getElementById('lihat_unitKerja').innerText = p.unitKerja || '-';
        document.getElementById('lihat_golongan').innerText = p.golongan || '-';
        document.getElementById('lihat_pendidikan').innerText = p.pendidikan || '-';
        document.getElementById('lihat_tmtJabatan').innerText = p.tmtJabatan || '-';
        document.getElementById('lihat_gajiPokok').innerText = p.gajiPokok || '-';
        document.getElementById('lihat_statusKepegawaian').innerText = p.statusKepegawaian || 'Aktif';

        const modal = new bootstrap.Modal(document.getElementById('modalLihatPegawai'));
        modal.show();
    }
}

async function hapusPegawaiData(nip) {
    const result = await Swal.fire({
        title: 'Hapus Data?',
        text: 'Data pegawai ini akan dihapus permanen!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
        try {
            await dbManager.deletePegawai(nip);
            Swal.fire({
                title: 'Terhapus!',
                text: 'Data pegawai berhasil dihapus.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            // Reload tables
            renderTabelPNS();
        } catch (error) {
            Swal.fire('Gagal!', 'Gagal menghapus data pegawai.', 'error');
        }
    }
}

async function editStatusPegawai(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) {
        Swal.fire('Error', 'Data pegawai tidak ditemukan!', 'error');
        return;
    }

    window.currentEditStatusNip = nip;
    const modalEl = document.getElementById('modalEditStatusAktif');
    if (modalEl) {
        const dropdown = document.getElementById('statusPegawaiDropdown');
        const currentStatus = p.statusKepegawaian || 'Aktif';
        if (dropdown) dropdown.value = currentStatus;

        const tanggalKhusus = document.getElementById('statusTanggalKhusus');
        const tanggalBerhenti = document.getElementById('statusTanggalBerhenti');
        const alasanBerhenti = document.getElementById('statusAlasanBerhenti');
        const tmtMutasi = document.getElementById('statusTmtMutasi');
        const tujuanMutasi = document.getElementById('statusMutasiTujuan');

        if (tanggalKhusus) {
            if (currentStatus === 'Pensiun') tanggalKhusus.value = p.tmtPensiun || '';
            else if (currentStatus === 'Meninggal') tanggalKhusus.value = p.tglMeninggal || p.tanggalMeninggal || '';
            else tanggalKhusus.value = '';
        }
        if (tanggalBerhenti) tanggalBerhenti.value = currentStatus === 'Berhenti' ? (p.tanggalBerhenti || '') : '';
        if (alasanBerhenti) alasanBerhenti.value = currentStatus === 'Berhenti' ? (p.alasanBerhenti || p.keteranganBerhenti || '') : '';
        if (tmtMutasi) tmtMutasi.value = currentStatus === 'Mutasi' ? (p.tmtMutasi || '') : '';
        if (tujuanMutasi) tujuanMutasi.value = currentStatus === 'Mutasi' ? (p.mutasiKe || p.keteranganMutasi || '') : '';

        if (typeof toggleFormStatus === 'function') toggleFormStatus(dropdown ? dropdown.value : currentStatus);

        let modalInst = bootstrap.Modal.getInstance(modalEl); if(!modalInst) modalInst = new bootstrap.Modal(modalEl); modalInst.show();
    }
}

async function simpanStatusPegawai() {
    const nip = window.currentEditStatusNip;
    const dropdown = document.getElementById('statusPegawaiDropdown');
    const statusBaru = dropdown ? dropdown.value : 'Aktif';

    if (!nip) return;

    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) return;

    p.statusKepegawaian = statusBaru;
    const tanggalKhusus = document.getElementById('statusTanggalKhusus')?.value || '';
    const tanggalBerhenti = document.getElementById('statusTanggalBerhenti')?.value || '';
    const alasanBerhenti = document.getElementById('statusAlasanBerhenti')?.value || '';
    const tmtMutasi = document.getElementById('statusTmtMutasi')?.value || '';
    const mutasiTujuan = document.getElementById('statusMutasiTujuan')?.value || '';

    p.tmtPensiun = '';
    p.tglMeninggal = '';
    p.tanggalMeninggal = '';
    p.tmtMutasi = '';
    p.tanggalBerhenti = '';
    p.alasanBerhenti = '';
    p.keteranganBerhenti = '';
    p.keteranganMutasi = '';
    p.mutasiKe = '';
    p.keteranganNonAktif = '';

    if (statusBaru === 'Pensiun') {
        p.tmtPensiun = tanggalKhusus;
        p.keteranganNonAktif = 'Pensiun';
    } else if (statusBaru === 'Meninggal') {
        p.tglMeninggal = tanggalKhusus;
        p.tanggalMeninggal = tanggalKhusus;
        p.keteranganNonAktif = 'Meninggal';
    } else if (statusBaru === 'Mutasi') {
        p.tmtMutasi = tmtMutasi;
        p.mutasiKe = mutasiTujuan;
        p.keteranganMutasi = mutasiTujuan;
        p.keteranganNonAktif = 'Mutasi';
    } else if (statusBaru === 'Berhenti' || statusBaru === 'Resign') {
        p.tanggalBerhenti = tanggalBerhenti;
        p.alasanBerhenti = alasanBerhenti;
        p.keteranganBerhenti = alasanBerhenti;
        p.keteranganNonAktif = 'Berhenti';
    } else if (statusBaru === 'Aktif') {
        p.statusKepegawaian = 'Aktif';
        p.keteranganNonAktif = '';
    }

    try {
        await dbManager.savePegawai(p);
    } catch (error) {
        Swal.fire('Gagal!', error.message || 'Status pegawai gagal disimpan.', 'error');
        return;
    }

    const modalEl = document.getElementById('modalEditStatusAktif');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    Swal.fire({
        title: 'Berhasil!',
        text: 'Status pegawai berhasil diperbarui.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });

    if (typeof renderTabelRekap === 'function') renderTabelRekap();
    if (typeof renderTabelRiwayat === 'function') renderTabelRiwayat();
}

async function editKGB(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) return;

    window.currentKgbNip = nip;
    const modalEl = document.getElementById('modalEditKGB');
    if (modalEl) {
        document.getElementById('kgb_gajiPokok').value = p.gajiPokok || '';
        document.getElementById('kgbNama').value = p.nama || '';
        document.getElementById('kgbTmtTerakhir').value = p.tmtKgb || '';
        document.getElementById('kgbTmtBerikutnya').value = p.tmtKgbBaru || '';
        let modalInst = bootstrap.Modal.getInstance(modalEl); if(!modalInst) modalInst = new bootstrap.Modal(modalEl); modalInst.show();
    }
}

async function simpanKGB() {
    const nip = window.currentKgbNip;
    if (!nip) return;

    const gajiPokok = document.getElementById('kgb_gajiPokok').value;
    const tmtBaru = document.getElementById('kgbTmtBerikutnya').value;
    const tmtLama = document.getElementById('kgbTmtTerakhir').value;

    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (p) {
        p.gajiPokok = gajiPokok;
        p.tmtKgbBaru = tmtBaru;
        p.tmtKgb = tmtLama;
        await dbManager.savePegawai(p);

        const modalEl = document.getElementById('modalEditKGB');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        Swal.fire({ title: 'Berhasil!', text: 'Data KGB diperbarui.', icon: 'success', timer: 1500, showConfirmButton: false });
        if (typeof renderTabelKGB === 'function') renderTabelKGB();
    }
}


function generateNamaBergelar(nama, riwayatPendidikan) {
    if (!riwayatPendidikan || !Array.isArray(riwayatPendidikan) || riwayatPendidikan.length === 0) return nama;

    const levelMap = { 'SD': 1, 'SMP': 2, 'SMA': 3, 'D1': 4, 'D2': 5, 'D3': 6, 'S1': 7, 'S2': 8, 'S3': 9 };
    let parsedRiwayat = riwayatPendidikan.map(r => {
        return {
            tingkat: r[0],
            level: levelMap[r[0]] || 0,
            gelarDepan: r.length > 6 ? (r[5] || '').trim() : '',
            gelarBelakang: r.length > 6 ? (r[6] || '').trim() : (r.length === 6 ? (r[5] || '').trim() : '')
        };
    }).filter(r => r.level > 0);

    if (parsedRiwayat.length === 0) return nama;

    let maxLevel = Math.max(...parsedRiwayat.map(r => r.level));

    let gelarDepanArr = [];
    let gelarBelakangArr = [];

    if (maxLevel >= 7) {
        // Collect S1, S2, S3
        let sarjana = parsedRiwayat.filter(r => r.level >= 7).sort((a, b) => a.level - b.level);
        sarjana.forEach(r => {
            if (r.gelarDepan) {
                // split by comma to avoid duplicate titles like "Dr." if typed multiple times
                r.gelarDepan.split(',').forEach(g => {
                    let tg = g.trim();
                    if (tg && !gelarDepanArr.includes(tg)) gelarDepanArr.push(tg);
                });
            }
            if (r.gelarBelakang) {
                r.gelarBelakang.split(',').forEach(g => {
                    let tg = g.trim();
                    if (tg && !gelarBelakangArr.includes(tg)) gelarBelakangArr.push(tg);
                });
            }
        });
    } else {
        // Highest is below S1
        let highest = parsedRiwayat.filter(r => r.level === maxLevel);
        highest.forEach(r => {
            if (r.gelarDepan) {
                r.gelarDepan.split(',').forEach(g => {
                    let tg = g.trim();
                    if (tg && !gelarDepanArr.includes(tg)) gelarDepanArr.push(tg);
                });
            }
            if (r.gelarBelakang) {
                r.gelarBelakang.split(',').forEach(g => {
                    let tg = g.trim();
                    if (tg && !gelarBelakangArr.includes(tg)) gelarBelakangArr.push(tg);
                });
            }
        });
    }

    let combinedName = nama;
    if (gelarDepanArr.length > 0) {
        combinedName = gelarDepanArr.join(', ') + ' ' + combinedName;
    }
    if (gelarBelakangArr.length > 0) {
        combinedName = combinedName + ', ' + gelarBelakangArr.join(', ');
    }

    return combinedName;
}

async function cetakCV(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) return;

    let settings = await dbManager.getPengaturan() || {};

    // Construct HTML
    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="utf-8">
        <meta name="ProgId" content="Word.Document">
        <meta name="Generator" content="Microsoft Word 15">
        <meta name="Originator" content="Microsoft Word 15">
        <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
        <style>
            @page Section1 { size: 21.0cm 29.7cm; margin: 1cm 1.5cm 1.5cm 2.0cm; }
              div.Section1 { page: Section1; }
            body { font-family: 'Arial', sans-serif; font-size: 11pt; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 5px; }
            .kop { text-align: center; margin-bottom: 20px; border-bottom: 3px solid black; padding-bottom: 10px; }
            .kop-kiri { font-size: 14pt; font-weight: bold; }
            .kop-kanan { font-size: 14pt; font-weight: bold; }
            .kop-tengah1 { font-size: 16pt; font-weight: bold; }
            .kop-tengah2 { font-size: 12pt; }
            .kop-tengah3 { font-size: 10pt; font-style: italic; }
            .title { text-align: center; font-size: 14pt; font-weight: bold; margin: 20px 0; text-decoration: underline; }
            .section-title { font-weight: bold; margin-top: 15px; background: #eee; padding: 5px; border: 1px solid black; }
            .signature-box { width: 300px; float: right; text-align: center; margin-top: 40px; }
            .signature-box p { margin: 5px 0; }
            .signature-name { font-weight: bold; text-decoration: underline; margin-top: 100px; }
        </style>
    </head>
    <body>
<div class="Section1">
        <table style="width: 100%; border: none; margin-bottom: 5px;">
            <tr>
                <td style="width: 15%; border: none; text-align: center; vertical-align: middle;">
                    ${settings.logoInstansi && settings.logoInstansi.includes('base64,') ? '<img src="cid:logoInstansi" width="80" height="80" />' : ''}
                </td>
                <td style="width: 70%; border: none; text-align: center; vertical-align: middle; line-height: 1.2;">
                    <div style="font-size: 14pt; font-weight: bold;">${(settings.instansi || '').toUpperCase()}</div>
                    ${settings.opd ? '<div style="font-size: 14pt; font-weight: bold;">' + settings.opd.toUpperCase() + '</div>' : ''}
                    <div style="font-size: 16pt; font-weight: bold;">${(settings.sekolah || '').toUpperCase()}</div>
                    <div style="font-size: 11pt; margin-top: 5px;">Alamat: ${settings.alamat || ''}</div>
                    <div style="font-size: 11pt;">
                        ${settings.email ? 'Email: ' + settings.email + ' &nbsp;' : ''}
                        ${settings.web ? 'Web: ' + settings.web + ' &nbsp;' : ''}
                        ${settings.hp ? 'Telp: ' + settings.hp : ''}
                    </div>
                </td>
                <td style="width: 15%; border: none; text-align: center; vertical-align: middle;">
                    ${settings.logoSekolah && settings.logoSekolah.includes(',') ? '<img src="cid:logoSekolah" width="80" height="80" />' : ''}
                </td>
            </tr>
        </table>
        <hr style="border: 0; border-top: 3px solid black; margin: 0 0 15px 0; padding: 0;">
        
        <div class="title">DATA INDUK PEGAWAI</div>
        
        <div class="section-title">I. DATA PRIBADI</div>
        <table style="border: none;">
            <tr style="border: none;"><td style="border: none; width: 30%; padding-left: 20px;">1. Nama Lengkap</td><td style="border: none;">: ${p.nama}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">2. NIK</td><td style="border: none;">: ${p.nik || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">3. Tempat, Tanggal Lahir</td><td style="border: none;">: ${p.tempatLahir || ''}, ${p.tglLahir || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">4. Jenis Kelamin</td><td style="border: none;">: ${p.kelamin || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">5. Agama</td><td style="border: none;">: ${p.agama || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">6. Status Perkawinan</td><td style="border: none;">: ${p.statusKawin || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">7. Golongan Darah</td><td style="border: none;">: ${p.golDarah || '-'}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">8. Tinggi / Berat Badan</td><td style="border: none;">: ${p.tinggiBadan || '-'} cm / ${p.beratBadan || '-'} kg</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">9. Alamat Rumah</td><td style="border: none;">: ${[p.alamat, p.alamatKabKota, (p.alamatProvinsi ? 'Prov. ' + p.alamatProvinsi : '')].filter(Boolean).join(', ')}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">10. No. HP / WA</td><td style="border: none;">: ${p.noHp || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">11. Email</td><td style="border: none;">: ${p.email || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">12. Hobby</td><td style="border: none;">: ${p.hobby || ''}</td></tr>
        </table>
        <br>
        
        <div class="section-title">II. DATA PEGAWAI</div>
        <table style="border: none;">
            <tr style="border: none;"><td style="border: none; width: 30%; padding-left: 20px;">1. Status Pegawai</td><td style="border: none;">: ${p.statusPegawai || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">2. NIP / NI PPPK</td><td style="border: none;">: ${p.nip || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">3. Pangkat / Gol. Terakhir</td><td style="border: none;">: ${p.golongan || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">4. Jabatan Terakhir</td><td style="border: none;">: ${p.jabatan || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">5. Unit Kerja / Instansi</td><td style="border: none;">: ${p.unitKerja || ''}</td></tr>
        </table>
        <br>
        
        <div class="section-title">III. RIWAYAT PANGKAT / GOLONGAN</div>
        <table>
            <tr><th>Pangkat/Golongan</th><th>TMT</th><th>Nomor SK</th><th>Tanggal SK</th><th>Masa Kerja</th></tr>
            ${(p.riwayatPangkat && p.riwayatPangkat.length > 0) ? p.riwayatPangkat.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[5]} Thn ${r[6]} Bln</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>
        
        <div class="section-title">IV. RIWAYAT JABATAN</div>
        <table>
            <tr><th>Jenis Jabatan</th><th>Eselon</th><th>Nama Jabatan</th><th>Unit Kerja</th><th>TMT</th></tr>
            ${(p.riwayatJabatan && p.riwayatJabatan.length > 0) ? p.riwayatJabatan.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>
        <div class="section-title">V. RIWAYAT PENDIDIKAN</div>
        <table>
            <tr><th>Tingkat</th><th>Nama Sekolah/Univ</th><th>Jurusan</th><th>Tahun Masuk</th><th>Tahun Lulus</th></tr>
            ${(p.riwayatPendidikan && p.riwayatPendidikan.length > 0) ? p.riwayatPendidikan.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>
        
        <div class="section-title">VI. RIWAYAT GAJI BERKALA (KGB)</div>
        <table>
            <tr><th>No SK</th><th>Tanggal SK</th><th>TMT KGB</th><th>Gaji Pokok</th><th>Masa Kerja</th></tr>
            ${(p.riwayatKGB && p.riwayatKGB.length > 0) ? p.riwayatKGB.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]} Thn ${r[5]} Bln</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>

        <div class="section-title">VII. RIWAYAT KONTRAK (PPPK/HONORER)</div>
        <table>
            <tr><th>Jabatan</th><th>TMT Mulai</th><th>TMT Selesai</th><th>No SK</th><th>Gaji/Honor</th></tr>
            ${(p.riwayatKontrak && p.riwayatKontrak.length > 0) ? p.riwayatKontrak.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]}</td><td style="text-align: center;">${r[7]}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>

        <div class="section-title">VIII. DATA KELUARGA</div>
        <table>
            <tr><th>Nama Anggota Keluarga</th><th>Tempat, Tanggal Lahir</th><th>Status Hubungan</th></tr>
            ${(p.riwayatAnak && p.riwayatAnak.length > 0) ? p.riwayatAnak.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}, ${r[2]}</td><td style="text-align: center;">${r[3]}</td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>

        <div class="section-title">IX. RIWAYAT KURSUS / DIKLAT</div>
        <table>
            <tr><th>Nama Diklat</th><th>Penyelenggara</th><th>Tahun</th><th>Jumlah Jam</th><th>No Sertifikat</th></tr>
            ${(p.riwayatDiklat && p.riwayatDiklat.length > 0) ? p.riwayatDiklat.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br><br>

        <table style="width: 100%; border: none; margin-top: 40px;">
            <tr>
                <td style="width: 60%; border: none;"></td>
                <td style="width: 40%; border: none; text-align: center;">
                    <p style="margin: 0;">Pegawai Yang Bersangkutan,</p>
                    <br><br><br>
                    <p class="signature-name" style="font-weight: bold; text-decoration: underline; margin: 0;">${generateNamaBergelar(p.nama.toUpperCase(), p.riwayatPendidikan)}</p>
                    <p style="margin: 0;">NIP. ${p.nip}</p>
                </td>
            </tr>
        </table>
        
    </div>
</body>
    </html>
    `;

    // Convert to MHTML to support embedded base64 images
    let mhtml = `MIME-Version: 1.0\nContent-Type: multipart/related; boundary="----=_NextPart_000_0000"\n\n------=_NextPart_000_0000\nContent-Type: text/html; charset="utf-8"\nContent-Transfer-Encoding: 8bit\n\n${html}\n\n`;
    if (settings.logoInstansi && settings.logoInstansi.includes('base64,')) {
        const parts = settings.logoInstansi.split(',');
        const meta = parts[0];
        const base64Data = parts[1];
        const mimeType = meta.split(':')[1].split(';')[0];
        mhtml += `------=_NextPart_000_0000\nContent-Type: ${mimeType}\nContent-Transfer-Encoding: base64\nContent-ID: <logoInstansi>\n\n${base64Data}\n`;
    }
    if (settings.logoSekolah && settings.logoSekolah.includes('base64,')) {
        const parts = settings.logoSekolah.split(',');
        const meta = parts[0];
        const base64Data = parts[1];
        const mimeType = meta.split(':')[1].split(';')[0];
        mhtml += `------=_NextPart_000_0000\nContent-Type: ${mimeType}\nContent-Transfer-Encoding: base64\nContent-ID: <logoSekolah>\n\n${base64Data}\n`;
    }
    mhtml += `------=_NextPart_000_0000--\n`;

    // Download as .doc
    const blob = new Blob([mhtml], {
        type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Data_Induk_${p.nama}_${p.nip}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Swal.fire('Berhasil', 'Data Induk (Word) sedang diunduh.', 'success');
}

async function renderTabelPensiun() {
    if ($.fn.DataTable.isDataTable('#tblEstPensiun')) { try { $('#tblEstPensiun').DataTable().clear().destroy(); } catch (e) { } }
    const allPegawai = await dbManager.getAllPegawai();
    const dataAktif = allPegawai.filter(p => p.statusKepegawaian === 'Aktif');

    const formatted = dataAktif.map((p, index) => {
        let bup = 58; // default
        let jnsJabatan = "-";

        // Cek Jenis Jabatan terakhir
        if (p.riwayatJabatan && p.riwayatJabatan.length > 0) {
            const lastJab = p.riwayatJabatan[p.riwayatJabatan.length - 1];
            jnsJabatan = lastJab[0] || "-";
            if (jnsJabatan.toLowerCase() === "fungsional umum") jnsJabatan = "Pelaksana";

            // Logika BUP
            if (jnsJabatan.toLowerCase().includes("fungsional tertentu")) {
                bup = 60;
            }
        }

        let estPensiunStr = "-";
        if (p.tglLahir) {
            const tglLahir = new Date(p.tglLahir);
            if (!isNaN(tglLahir)) {
                // Tambahkan BUP ke tahun lahir
                const thnPensiun = tglLahir.getFullYear() + bup;
                // Pensiun biasanya TMT awal bulan berikutnya, tapi kita buat Tgl/Bln/Thn sesuai lahir
                const estDate = new Date(thnPensiun, tglLahir.getMonth(), tglLahir.getDate());
                const mm = String(estDate.getMonth() + 1).padStart(2, '0');
                const dd = String(estDate.getDate()).padStart(2, '0');
                const yyyy = estDate.getFullYear();
                estPensiunStr = `${dd}-${mm}-${yyyy}`;
            }
        }

        return [
            index + 1,
            p.nip,
            p.nama,
            p.jabatan || '-',
            p.unitKerja || '-',
            bup + " Tahun",
            p.tglLahir || '-',
            `<b>${estPensiunStr}</b>`
        ];
    });

    const dtPensiun = $('#tblEstPensiun').DataTable({
        destroy: true,
        data: formatted,
        pageLength: 10,
        dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>"
    });

    $('#filterNamaPensiun').off('keyup').on('keyup', function () {
        dtPensiun.search(this.value).draw();
    });
}


async function handleFileUpload(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    if (file.size > 250 * 1024) {
        Swal.fire('Error', 'Ukuran file maksimal 250 KB!', 'error');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const base64Data = e.target.result;
        const targetId = inputElement.getAttribute('data-target');

        let fileIdOrUrl = base64Data; // Default local base64 before upload

        // Upload logic
        Swal.showLoading();
        try {
            if (typeof window.require !== 'undefined') { // Local Electron version
                const { ipcRenderer } = window.require('electron');
                const res = await ipcRenderer.invoke('simpeel-save-file', file.name, base64Data);
                if (res && res.success) {
                    fileIdOrUrl = res.filePath;
                    Swal.fire('Sukses', 'File berhasil disimpan lokal', 'success');
                } else {
                    Swal.fire('Error', 'Gagal simpan lokal: ' + (res ? res.message : 'Unknown error'), 'error');
                }
            } else if (typeof apiCall === 'function') { // Online version
                const res = await apiCall('uploadFile', {
                    filename: file.name,
                    mimeType: file.type,
                    base64Data: base64Data.split(',')[1]
                });
                if (res && res.success) {
                    fileIdOrUrl = res.data.url;
                    Swal.fire('Sukses', 'File berhasil diunggah ke Drive', 'success');
                } else {
                    Swal.fire('Error', 'Gagal upload ke Drive: ' + (res ? res.message : 'Unknown error'), 'error');
                }
            }

            // Set target value
            let targetElement;
            if (targetId) {
                targetElement = document.getElementById(targetId);
            } else {
                // Find sibling hidden input if data-target not specified
                targetElement = inputElement.nextElementSibling;
            }

            if (targetElement) {
                targetElement.value = fileIdOrUrl;
            }

            // Show view button
            const viewBtn = inputElement.parentElement.querySelector('.btn-view-file');
            if (viewBtn) viewBtn.classList.remove('d-none');
        } catch (err) {
            Swal.fire('Error', 'Terjadi kesalahan saat upload', 'error');
        }
    };
    reader.readAsDataURL(file);
}

function viewFileApp(fileUrlOrPath) {
    if (!fileUrlOrPath) return;
    if (fileUrlOrPath.startsWith('http')) {
        window.open(fileUrlOrPath, '_blank');
    } else if (typeof window.require !== 'undefined') {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('simpeel-open-file', fileUrlOrPath);
    }
}

function toggleSertifikasiTab(riwayatJabatan = null) {
    let showTab = false;

    if (!riwayatJabatan) {
        try {
            riwayatJabatan = extractTableData('tabelJabatan');
            if (typeof sortRiwayatArray === 'function') {
                riwayatJabatan = sortRiwayatArray(riwayatJabatan, 4);
            }
        } catch (e) { }
    }

    if (riwayatJabatan && Array.isArray(riwayatJabatan) && riwayatJabatan.length > 0) {
        for (let i = 0; i < riwayatJabatan.length; i++) {
            const row = riwayatJabatan[i];
            if (row && row[0] === 'Fungsional Tertentu' && row[2]) {
                const namaJabatan = row[2].toLowerCase();
                if (namaJabatan.includes('guru')) {
                    showTab = true;
                    break;
                }
            }
        }
    }

    const tabNav = document.getElementById('nav-sertifikasi');
    if (tabNav) {
        if (showTab) {
            tabNav.classList.remove('d-none');
            // Auto fill NUPTK
            const pegNuptk = document.getElementById('peg_nuptk');
            const certNuptk = document.getElementById('cert_nuptk');
            if (pegNuptk && certNuptk && !certNuptk.value) {
                certNuptk.value = pegNuptk.value;
            }
        } else {
            // tabNav.classList.add('d-none'); // Always show for now
            const link = tabNav.querySelector('.nav-link');
            if (link && link.classList.contains('active')) {
                const btnPribadi = document.querySelector('[data-bs-target="#f-pribadi"]');
                if (btnPribadi) btnPribadi.click();
            }
        }
    }
}

// Event Listeners for Dynamic UI
document.addEventListener('DOMContentLoaded', () => {
    // Sync NUPTK
    const pegNuptk = document.getElementById('peg_nuptk');
    if (pegNuptk) {
        pegNuptk.addEventListener('input', function () {
            const certNuptk = document.getElementById('cert_nuptk');
            if (certNuptk) certNuptk.value = this.value;
        });
    }

    // Monitor tabelJabatan changes
    const tabelJabatan = document.getElementById('tabelJabatan');
    if (tabelJabatan) {
        tabelJabatan.addEventListener('change', () => toggleSertifikasiTab());
        tabelJabatan.addEventListener('keyup', () => toggleSertifikasiTab());
    }

    // Observer to detect row deletions
    if (tabelJabatan) {
        const observer = new MutationObserver(() => toggleSertifikasiTab());
        observer.observe(tabelJabatan.querySelector('tbody'), { childList: true });
    }
});

async function renderTabelGuruSertif() {
    if ($.fn.DataTable.isDataTable('#tblGuruSertif')) { try { $('#tblGuruSertif').DataTable().clear().destroy(); } catch (e) { } }

    let allPegawai = [];
    try {
        const res = await apiCall('getAllPegawai');
        if (res && res.success) allPegawai = res.data;
    } catch (e) {
        console.error('Gagal mengambil data pegawai untuk Guru Sertif:', e);
    }

    const formatted = [];
    let no = 1;

    // Filter: hanya pegawai aktif yg punya data sertifikasi
    const guruSertif = allPegawai.filter(p => {
        if (p.statusKepegawaian !== 'Aktif') return false;
        return p.sertifikasi && (p.sertifikasi.noSertifikat || p.sertifikasi.tahunLulus);
    });

    // Urutkan: tahun sertifikasi paling lama (terkecil) di atas
    guruSertif.sort((a, b) => {
        const tA = parseInt(a.sertifikasi.tahunLulus) || 9999;
        const tB = parseInt(b.sertifikasi.tahunLulus) || 9999;
        return tA - tB;
    });

    guruSertif.forEach(p => {
        let jabatanTerakhir = '-';
        if (p.riwayatJabatan && Array.isArray(p.riwayatJabatan) && p.riwayatJabatan.length > 0) {
            const sorted = typeof sortRiwayatArray === 'function'
                ? sortRiwayatArray([...p.riwayatJabatan], 4)
                : p.riwayatJabatan;
            if (sorted[0] && sorted[0][2]) jabatanTerakhir = sorted[0][2];
        }

        formatted.push([
            no++,
            p.nama || '-',
            p.nip || '-',
            p.statusPegawai || '-',
            jabatanTerakhir,
            p.sertifikasi.noSertifikat || '-',
            p.sertifikasi.mapel || '-',
            p.sertifikasi.tahunLulus || '-'
        ]);
    });

    const dt = $('#tblGuruSertif').DataTable({
        destroy: true,
        data: formatted,
        pageLength: 10,
        dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>"
    });

    $('#filterNamaGuruSertif').off('keyup').on('keyup', function () {
        dt.search(this.value).draw();
    });
}


// ==========================================
// MANAJEMEN AKUN PEGAWAI
// ==========================================
function bukaModalTambahAkun() {
    try {
        const m = document.getElementById('modalTambahAkun');
        if (m) {
            const form = document.getElementById('formTambahAkun');
            if (form) form.reset();

            // Clear edit mode metadata
            delete m.dataset.mode;
            delete m.dataset.originalNip;
            const nipFeedback = document.getElementById('akun_nip_feedback');
            if (nipFeedback) {
                nipFeedback.textContent = '';
                nipFeedback.className = '';
            }
            const nikFeedback = document.getElementById('akun_nik_feedback');
            if (nikFeedback) {
                nikFeedback.textContent = '';
                nikFeedback.className = '';
            }

            const title = m.querySelector('.modal-title');
            if (title) title.innerHTML = '<i class="fas fa-user-plus"></i> Tambah Akun Baru';
            const header = m.querySelector('.modal-header');
            if (header) {
                header.classList.remove('bg-warning', 'text-dark');
                header.classList.add('bg-primary', 'text-white');
            }
            const btn = m.querySelector('button[onclick="simpanAkunPegawai()"]');
            if (btn) {
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-primary');
                btn.innerHTML = '<i class="fas fa-save"></i> Simpan Akun';
            }

            const pwField = document.getElementById('akun_password');
            if (pwField) {
                pwField.readOnly = false;
                pwField.placeholder = 'Masukkan Password';
            }

            const modal = bootstrap.Modal.getInstance(m) || new bootstrap.Modal(m);
            modal.show();
        } else {
            console.error('modalTambahAkun not found');
            alert('Error: Modal Tambah Akun tidak ditemukan di halaman.');
        }
    } catch (e) {
        console.error('Error bukaModalTambahAkun:', e);
        alert('Gagal membuka modal: ' + e.message);
    }
}

window.editAkun = async function (nip) {
    try {
        const res = await dbManager.getAllAkun();
        const akunList = Array.isArray(res) ? res : [];
        if (!Array.isArray(res) && res && res.success === false) {
            return Swal.fire('Error', 'Gagal memuat data akun', 'error');
        }

        let akun = akunList.find(a => a.nip === nip);
        if (!akun) {
            const allPeg = await dbManager.getAllPegawai();
            const pegList = Array.isArray(allPeg) ? allPeg : [];
            akun = pegList.find(a => a.nip === nip);
            if (!akun) return Swal.fire('Error', 'Akun tidak ditemukan', 'error');
        }

        document.getElementById('akun_nip').value = akun.nip || '';
        document.getElementById('akun_nama').value = (akun.nama || '').toUpperCase();
        document.getElementById('akun_nik').value = akun.nik || '';
        document.getElementById('akun_tglLahir').value = akun.tglLahir || '';
        if (akun.statusPegawai) document.getElementById('akun_statusPegawai').value = akun.statusPegawai;

        const pwField = document.getElementById('akun_password');
        if (pwField) {
            pwField.value = '';
            pwField.placeholder = '(Gunakan tombol Reset Password)';
            pwField.readOnly = true;
        }

        const m = document.getElementById('modalTambahAkun');
        // Simpan NIP asli untuk deteksi mode edit dan cascade update
        m.dataset.originalNip = nip;
        m.dataset.mode = 'edit';

        const title = m.querySelector('.modal-title');
        if (title) title.innerHTML = '<i class="fas fa-user-edit"></i> Edit Akun';
        const header = m.querySelector('.modal-header');
        if (header) {
            header.classList.remove('bg-primary', 'text-white');
            header.classList.add('bg-warning', 'text-dark');
        }
        const btn = m.querySelector('button[onclick="simpanAkunPegawai()"]');
        if (btn) {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-warning');
            btn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
        }

        const modal = bootstrap.Modal.getInstance(m) || new bootstrap.Modal(m);
        modal.show();
    } catch (e) {
        console.error('Error editAkun:', e);
    }
}

async function simpanAkunPegawai() {
    const m = document.getElementById('modalTambahAkun');
    const isEditMode = m && m.dataset.mode === 'edit';
    const originalNip = m ? m.dataset.originalNip : null;

    const statusPegawai = document.getElementById('akun_statusPegawai').value;
    const nip = document.getElementById('akun_nip').value.trim();
    const password = document.getElementById('akun_password').value;
    const nama = document.getElementById('akun_nama').value.trim().toUpperCase();
    const nik = document.getElementById('akun_nik').value.trim();
    const tglLahir = document.getElementById('akun_tglLahir').value;

    if (!statusPegawai || !nip || !nama || !nik || !tglLahir) {
        Swal.fire('Peringatan', 'Harap isi semua kolom wajib (*) kecuali password jika tidak ingin mengubah', 'warning');
        return;
    }
    if (!isEditMode && !password) {
        Swal.fire('Peringatan', 'Password wajib diisi untuk akun baru', 'warning');
        return;
    }

    // Ambil data akun lama jika edit mode (untuk preservasi createdAt dan role)
    let existingAkun = null;
    if (isEditMode && originalNip) {
        const allAkun = await dbManager.getAllAkun();
        const akunList = Array.isArray(allAkun) ? allAkun : [];
        existingAkun = akunList.find(a => a.nip === originalNip || a.nip === nip) || null;
    }

    const now = new Date().toISOString();
    const payload = {
        nip: nip,
        nama: nama,
        namaLengkap: nama,
        nik: nik,
        tglLahir: tglLahir,
        statusPegawai: statusPegawai,
        aktif: 1,
        role: existingAkun?.role || 'pegawai',
        createdAt: existingAkun?.createdAt || now,
        updatedAt: now
    };
    if (password) payload.password = password;

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

    try {
        // Jika edit mode dan NIP berubah, perlu cascade update
        if (isEditMode && originalNip && originalNip !== nip) {
            // 1. Hapus akun lama dengan NIP lama
            await dbManager.deleteAkun(originalNip).catch(e => console.warn('deleteAkun lama:', e));
            // 2. Ambil data pegawai lama dan update NIP-nya
            const allPeg = await dbManager.getAllPegawai();
            if (allPeg) {
                const pegLama = allPeg.find(p => p.nip === originalNip);
                if (pegLama) {
                    pegLama.nip = nip;
                    pegLama.nama = nama;
                    pegLama.nik = nik;
                    pegLama.tglLahir = tglLahir;
                    pegLama.statusPegawai = statusPegawai;
                    pegLama.updatedAt = now;
                    // Hapus data pegawai lama, simpan dengan NIP baru
                    await dbManager.deletePegawai(originalNip).catch(e => console.warn('deletePegawai lama:', e));
                    await dbManager.savePegawai(pegLama).catch(e => console.warn('savePegawai cascade:', e));
                }
            }
        }

        // Simpan akun (REPLACE akan update jika NIP sudah ada)
        const result = await dbManager.saveAkun(payload);
        const success = result && (result === true || result.success === true);

        if (success) {
            if (!isEditMode) {
                // Mode tambah: buat juga entri data pegawai minimal
                // Dibungkus try/catch sendiri agar kegagalan ini tidak menghalangi refresh tabel akun
                try {
                    const pegPayload = {
                        nip: nip, nama: nama, nik: nik,
                        statusPegawai: statusPegawai, tglLahir: tglLahir,
                        statusKepegawaian: 'Aktif',
                        updatedAt: now
                    };
                    await dbManager.savePegawai(pegPayload);
                } catch (pegErr) {
                    console.warn('savePegawai saat tambah akun gagal (akun tetap tersimpan):', pegErr);
                }
            } else {
                // Mode edit: update data pegawai juga jika NIP tidak berubah
                if (originalNip === nip) {
                    try {
                        const allPeg = await dbManager.getAllPegawai();
                        if (allPeg) {
                            const peg = allPeg.find(p => p.nip === nip);
                            if (peg) {
                                peg.nama = nama; peg.nik = nik;
                                peg.tglLahir = tglLahir; peg.statusPegawai = statusPegawai;
                                peg.updatedAt = now;
                                await dbManager.savePegawai(peg);
                            }
                        }
                    } catch (pegErr) {
                        console.warn('savePegawai saat edit akun gagal (akun tetap diperbarui):', pegErr);
                    }
                }
            }

            Swal.fire('Berhasil', isEditMode ? 'Akun berhasil diperbarui' : 'Akun berhasil ditambahkan', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalTambahAkun'));
            if (modal) modal.hide();
            if (m) { delete m.dataset.originalNip; delete m.dataset.mode; }
            renderTabelAkun();
        } else {
            Swal.fire('Gagal', (result && result.message) || 'Gagal menyimpan akun', 'error');
        }
    } catch (e) {
        console.error('simpanAkunPegawai error:', e);
        Swal.fire('Gagal', e.message || 'Terjadi kesalahan', 'error');
    }
}

async function renderTabelAkun() {
    if (!document.getElementById('tblAkun')) return;

    if ($.fn.DataTable.isDataTable('#tblAkun')) {
        try { $('#tblAkun').DataTable().clear().destroy(); } catch (e) { }
    }

    let dataAkun = [];
    try {
        const res = await dbManager.getAllAkun();
        dataAkun = Array.isArray(res) ? res : [];
        if (!Array.isArray(res)) {
            console.warn('renderTabelAkun received non-array data:', res);
        }
    } catch (e) {
        console.error("Gagal mengambil data akun:", e);
    }

    const formatted = [];
    dataAkun.forEach(a => {
        const aksi = `
            <button class="btn btn-sm btn-info me-1" title="Reset Password" onclick="resetPasswordAkun('${a.nip}')"><i class="fas fa-key text-white"></i></button>
            <button class="btn btn-sm btn-warning me-1" title="Edit Akun" onclick="editAkun('${a.nip}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" title="Hapus Akun" onclick="hapusAkun('${a.nip}')"><i class="fas fa-trash"></i></button>
        `;
        const roleBadge = a.role === 'admin'
            ? '<span class="badge bg-danger">Admin</span>'
            : '<span class="badge bg-secondary">Pegawai</span>';

        formatted.push([
            a.nip || '-',
            a.nama || '-',
            a.statusPegawai || '-',
            a.createdAt ? new Date(a.createdAt).toLocaleDateString('id-ID') : '-',
            roleBadge,
            aksi
        ]);
    });

    $('#tblAkun').DataTable({
        destroy: true,
        data: formatted,
        pageLength: 10,
        columns: [
            { title: 'NIP / Username' },
            { title: 'Nama' },
            { title: 'Status Pegawai' },
            { title: 'Tanggal Daftar' },
            { title: 'Role' },
            { title: 'Aksi', orderable: false }
        ]
    });
}

async function hapusAkun(nip) {
    const { value: text } = await Swal.fire({
        title: 'Hapus Akun & Data Pegawai?',
        html: 'Aksi ini akan menghapus akun dan <b>SELURUH DATA</b> pegawai terkait.<br><br>Ketik <b>HAPUS</b> untuk melanjutkan:',
        input: 'text',
        inputPlaceholder: 'Ketik HAPUS disini',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });

    if (text === 'HAPUS') {
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        try {
            // Hapus akun dan data pegawai - abaikan error individual
            await dbManager.deleteAkun(nip).catch(() => { });
            await dbManager.deletePegawai(nip).catch(() => { });
            Swal.fire('Terhapus!', 'Akun dan seluruh data pegawai terkait telah dihapus.', 'success');
            renderTabelAkun();
            renderTabelPNS();
            renderTabelPPPK();
            renderTabelPPPKPW();
            renderTabelHonorer();
        } catch (e) {
            console.error(e);
            // Refresh tabel dulu, karena data mungkin sudah terhapus
            renderTabelAkun();
            renderTabelPNS();
            renderTabelPPPK();
            renderTabelPPPKPW();
            renderTabelHonorer();
            Swal.fire('Peringatan', 'Data mungkin sudah terhapus. Silakan periksa tabel.', 'warning');
        }
    } else if (text !== undefined) {
        Swal.fire('Dibatalkan', 'Konfirmasi tidak sesuai. Data aman.', 'info');
    }
}

async function resetPasswordAkun(nip) {
    const { value: text } = await Swal.fire({
        title: 'Reset Password?',
        html: 'Password akun ini akan dikembalikan ke standar yaitu <b>sama dengan NIP/Username</b>.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#17a2b8',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Reset',
        cancelButtonText: 'Batal'
    });

    if (text) {
        Swal.fire({ title: 'Meriset...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        try {
            const allAkun = await dbManager.getAllAkun();
            const akun = allAkun.find(a => a.nip === nip);
            if (!akun) throw new Error('Akun tidak ditemukan');

            akun.password = nip;
            await dbManager.saveAkun(akun);

            Swal.fire('Berhasil!', 'Password telah direset menjadi NIP/Username.', 'success');
        } catch (e) {
            Swal.fire('Gagal', e.message || 'Terjadi kesalahan', 'error');
        }
    }
}


async function toggleKunciData(nip) {
    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    try {
        const allPeg = await dbManager.getAllPegawai();
        const peg = allPeg.find(p => p.nip === nip);
        if (!peg) {
            Swal.fire('Error', 'Data pegawai tidak ditemukan', 'error');
            return;
        }

        peg.isLocked = !peg.isLocked;
        await dbManager.savePegawai(peg);

        Swal.fire({
            icon: 'success',
            title: peg.isLocked ? 'Data Terkunci' : 'Kunci Terbuka',
            text: peg.isLocked ? 'Data pegawai telah dikunci dan tidak dapat diedit.' : 'Data pegawai kini dapat diedit kembali.',
            timer: 1500,
            showConfirmButton: false
        });
        renderTabelPNS(); // Memuat ulang semua tabel PNS, PPPK, dll.
    } catch (e) {
        Swal.fire('Error', 'Gagal mengubah status kunci', 'error');
    }
}
// ==========================================
// VALIDASI NIP DAN NIK PADA FORM TAMBAH AKUN
// ==========================================
async function validasiNipAkun(nip, inputEl) {
    if (!inputEl) inputEl = document.getElementById('akun_nip');
    const feedbackEl = document.getElementById('akun_nip_feedback');
    const m = document.getElementById('modalTambahAkun');
    const isEditMode = m && m.dataset.mode === 'edit';
    const originalNip = m ? m.dataset.originalNip : null;

    // Reset
    inputEl.classList.remove('is-invalid', 'is-valid');
    if (feedbackEl) feedbackEl.textContent = '';

    if (!nip || nip.trim() === '') return;

    const nipBersih = nip.trim();

    // Cek panjang
    if (nipBersih.length !== 18) {
        inputEl.classList.add('is-invalid');
        if (feedbackEl) feedbackEl.textContent = 'NIP harus 18 digit. Saat ini: ' + nipBersih.length + ' digit.';
        return false;
    }

    // Cek duplikat HANYA jika mode tambah baru, atau jika NIP berubah dari NIP asli saat edit
    const nipBerubah = !isEditMode || (originalNip && originalNip !== nipBersih);
    if (nipBerubah) {
        try {
            const allAkun = await dbManager.getAllAkun();
            if (Array.isArray(allAkun)) {
                const existing = allAkun.find(a => a.nip === nipBersih);
                if (existing) {
                    inputEl.classList.add('is-invalid');
                    if (feedbackEl) feedbackEl.textContent = 'NIP ini sudah terdaftar atas nama: ' + (existing.nama || existing.nip) + '. Harap cek kembali.';
                    return false;
                }
            }
        } catch (e) {
            // Jika gagal cek DB, cukup lolos validasi panjang
        }
    }

    inputEl.classList.add('is-valid');
    if (isEditMode && originalNip !== nipBersih) {
        if (feedbackEl) feedbackEl.textContent = 'NIP akan diubah dari ' + originalNip + ' → ' + nipBersih + ' (semua data terkait akan ikut berubah)';
        feedbackEl.className = 'valid-feedback d-block text-info small';
    }
    return true;
}

async function validasiNikAkun(nik, inputEl) {
    if (!inputEl) inputEl = document.getElementById('akun_nik');
    const feedbackEl = document.getElementById('akun_nik_feedback');

    // Reset
    inputEl.classList.remove('is-invalid', 'is-valid');
    if (feedbackEl) feedbackEl.textContent = '';

    if (!nik || nik.trim() === '') return;

    const nikBersih = nik.trim();

    // Cek panjang
    if (nikBersih.length !== 16) {
        inputEl.classList.add('is-invalid');
        if (feedbackEl) feedbackEl.textContent = 'NIK harus 16 digit. Saat ini: ' + nikBersih.length + ' digit.';
        return false;
    }

    // Cek duplikat
    try {
        const allPegawai = await dbManager.getAllPegawai();
        const existing = allPegawai.find(p => p.nik === nikBersih);
        if (existing) {
            inputEl.classList.add('is-invalid');
            if (feedbackEl) feedbackEl.textContent = 'NIK ini sudah terdaftar atas nama: ' + (existing.nama || existing.nip) + '. Harap cek kembali.';
            return false;
        }
    } catch (e) {
        // Jika gagal cek DB, cukup lolos validasi panjang
    }

    inputEl.classList.add('is-valid');
    return true;
}

function toggleNipPasangan() {
    const pekerjaan = document.getElementById('peg_pasangan_pekerjaan').value;
    const divNip = document.getElementById('div_pasangan_nip');
    if (pekerjaan === 'ASN PNS' || pekerjaan === 'ASN PPPK' || pekerjaan === 'TNI/POLRI') {
        divNip.classList.remove('d-none');
    } else {
        divNip.classList.add('d-none');
        document.getElementById('peg_pasangan_nip').value = '';
    }
}


async function renderTabelSKUMPTK() {
    if ($.fn.DataTable.isDataTable('#tblSkumptkPns')) { try { $('#tblSkumptkPns').DataTable().clear().destroy(); } catch (e) { } }
    if ($.fn.DataTable.isDataTable('#tblSkumptkPppk')) { try { $('#tblSkumptkPppk').DataTable().clear().destroy(); } catch (e) { } }
    const allPegawai = await dbManager.getAllPegawai();

    const processData = (statusFilter) => {
        const dataFilter = allPegawai.filter(p => p.statusKepegawaian === 'Aktif' && p.statusPegawai === statusFilter);
        let no = 1;
        return dataFilter.map(p => {
            return [
                no++,
                p.nama,
                p.nip,
                p.jabatan || '-',
                p.golongan || '-',
                "<button class='btn btn-sm btn-info text-white' title='Cetak SKUMPTK' onclick='cetakSkumptk(\"" + p.nip + "\")'><i class='fas fa-print'></i> Cetak</button>"
            ];
        });
    };

    const dataPNS = processData('PNS');
    const dataPPPK = processData('PPPK');

    $('#tblSkumptkPns').DataTable({ data: dataPNS, pageLength: 20 });
    $('#tblSkumptkPppk').DataTable({ data: dataPPPK, pageLength: 20 });
}

async function cetakSkumptk(nip) {
    Swal.fire({ title: 'Memuat data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    const allPegawai = await dbManager.getAllPegawai();
    const data = allPegawai.find(x => x.nip === nip);
    const pengaturan = await dbManager.getPengaturan() || {};

    if (!data) return Swal.fire('Error', 'Data Pegawai tidak ditemukan.', 'error');
    Swal.close();
    await new Promise(r => setTimeout(r, 200));

    // Helper hitung masa kerja dari riwayat pangkat
    const hitungMasaKerja = () => {
        if (!data.riwayatPangkat || data.riwayatPangkat.length === 0) return { thnGol: '-', blnGol: '-', thnTotal: '-', blnTotal: '-', tmt: '' };
        const lastPangkat = getLatestRiwayat(data.riwayatPangkat, 1) || data.riwayatPangkat[data.riwayatPangkat.length - 1];
        const tmtGol = lastPangkat[1] || '';
        const mkThnSK = parseInt(lastPangkat[5] || 0);
        const mkBlnSK = parseInt(lastPangkat[6] || 0);
        if (!tmtGol) return { thnGol: '-', blnGol: '-', thnTotal: '-', blnTotal: '-', tmt: '' };
        const now = new Date();
        const tmt = new Date(tmtGol);
        let elThn = now.getFullYear() - tmt.getFullYear();
        let elBln = now.getMonth() - tmt.getMonth();
        if (elBln < 0) { elThn--; elBln += 12; }
        // MK Golongan
        let totalBlnGol = mkBlnSK + elBln;
        let addThnGol = Math.floor(totalBlnGol / 12);
        let remBlnGol = totalBlnGol % 12;
        let thnGol = mkThnSK + elThn + addThnGol;
        // MK Keseluruhan (perkiraan dari tmtCpns jika ada)
        let thnTotal = '-', blnTotal = '-';
        if (data.tmtCpns) {
            const cpns = new Date(data.tmtCpns);
            let yT = now.getFullYear() - cpns.getFullYear();
            let mT = now.getMonth() - cpns.getMonth();
            if (mT < 0) { yT--; mT += 12; }
            thnTotal = yT < 0 ? 0 : yT;
            blnTotal = mT < 0 ? 0 : mT;
        }
        return {
            thnGol: String(thnGol).padStart(2, '0'),
            blnGol: String(remBlnGol).padStart(2, '0'),
            thnTotal: thnTotal === '-' ? '-' : String(thnTotal).padStart(2, '0'),
            blnTotal: blnTotal === '-' ? '-' : String(blnTotal).padStart(2, '0'),
            tmt: tmtGol
        };
    };

    const mk = hitungMasaKerja();

    // Helper format tanggal Indonesia
    const fmtTgl = (tgl) => {
        if (!tgl) return '-';
        try {
            return new Date(tgl).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) { return tgl; }
    };

    // Helper format tanggal singkat (DD - MM - YYYY)
    const fmtTglSingkat = (tgl) => {
        if (!tgl) return '-';
        try {
            const d = new Date(tgl);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd} - ${mm} - ${yyyy}`;
        } catch (e) { return tgl; }
    };

    // Default gaji dari data pegawai
    const defaultGaji = data.gajiPokok || '';
    const defaultTmtGol = mk.tmt ? fmtTgl(mk.tmt) : '';

    // Hitung jumlah keluarga tertanggung
    const jumlahAnak = Array.isArray(data.riwayatAnak) ? data.riwayatAnak.filter(a => a && a[0]).length : 0;
    const jumlahKeluarga = (data.pasanganNama ? 1 : 0) + jumlahAnak;

    // Nama bergelar
    const namaLengkap = generateNamaBergelar(data.nama || '', data.riwayatPendidikan);

    const { value: formValues } = await Swal.fire({
        title: '📄 Lengkapi Data SKUMPTK',
        width: '750px',
        html: `
        <div class="text-start" style="font-size:12px;">
            <p class="text-muted small mb-2"><i class="fas fa-info-circle"></i> Data di bawah ini mengambil data terbaru. Kolom abu-abu terisi otomatis dari database. Kolom kuning perlu Anda lengkapi secara manual jika kosong.</p>
            <div class="row g-2">
                <div class="col-12 mt-2"><div class="fw-bold text-primary border-bottom pb-1 mb-1">🏢 Instansi & Bendahara</div></div>
                <div class="col-md-6">
                    <label class="form-label small mb-0 fw-semibold">Nama Instansi</label>
                    <input id="sk_instansi_nama" class="form-control form-control-sm ${pengaturan.sekolah ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.sekolah || ''}">
                </div>
                <div class="col-md-6">
                    <label class="form-label small mb-0 fw-semibold">Instansi Induk</label>
                    <input id="sk_instansi_induk" class="form-control form-control-sm ${pengaturan.instansi ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.instansi || ''}">
                </div>
                <div class="col-md-6">
                    <label class="form-label small mb-0 fw-semibold">Alamat Instansi</label>
                    <input id="sk_instansi_alamat" class="form-control form-control-sm ${pengaturan.alamat ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.alamat || ''}">
                </div>
                <div class="col-md-6">
                    <label class="form-label small mb-0 fw-semibold">Bendahara Pengeluaran</label>
                    <input id="sk_bendahara" class="form-control form-control-sm ${pengaturan.bendaharaNama ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.bendaharaNama || ''}">
                </div>

                <div class="col-12 mt-2"><div class="fw-bold text-primary border-bottom pb-1 mb-1">👤 Kepegawaian & Gaji</div></div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">TMT Golongan</label>
                    <input id="sk_tmt_gol" class="form-control form-control-sm ${defaultTmtGol ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${defaultTmtGol}" placeholder="01 April 2019">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">TMT CPNS</label>
                    <input id="sk_tmt_cpns" class="form-control form-control-sm ${data.tmtCpns ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${data.tmtCpns ? fmtTgl(data.tmtCpns) : ''}" placeholder="01 Maret 2015">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Eselon</label>
                    <input id="sk_eselon" class="form-control form-control-sm bg-warning bg-opacity-10 border-warning" value="" placeholder="Cth: IV.b">
                </div>
                
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">PP/SK Penggajian</label>
                    <input id="sk_pp_sk" class="form-control form-control-sm bg-warning bg-opacity-10 border-warning" value="" placeholder="Cth: PP No 5/2024">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Gaji Pokok</label>
                    <input id="sk_gaji_pokok" class="form-control form-control-sm format-rupiah ${defaultGaji ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${defaultGaji}" placeholder="Rp. 3.390.500,-">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Gaji Bersih</label>
                    <input id="sk_gaji_bersih" class="form-control form-control-sm format-rupiah bg-warning bg-opacity-10 border-warning" value="" placeholder="Cth: Rp. 4.292.100,-">
                </div>
                
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Jenis Kepeg</label>
                    <input id="sk_jenis_kepeg" class="form-control form-control-sm bg-light text-secondary" value="Pegawai Negeri Sipil Daerah">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Status Kepeg</label>
                    <input id="sk_status_kepeg" class="form-control form-control-sm bg-light text-secondary" value="Pegawai Negeri Sipil Provinsi">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">SK Terakhir</label>
                    <input id="sk_terakhir" class="form-control form-control-sm bg-warning bg-opacity-10 border-warning" value="SK Berkala" placeholder="SK Berkala">
                </div>
                
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Jml Keluarga</label>
                    <input id="sk_jml_keluarga" class="form-control form-control-sm bg-light text-secondary" value="${jumlahKeluarga}">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">MK Golongan</label>
                    <input id="sk_mk_gol" class="form-control form-control-sm ${mk.thnGol !== '-' ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${mk.thnGol !== '-' ? mk.thnGol + ' Tahun ' + mk.blnGol + ' Bulan' : ''}">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">MK Total</label>
                    <input id="sk_mk_total" class="form-control form-control-sm ${mk.thnTotal !== '-' ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${mk.thnTotal !== '-' ? mk.thnTotal + ' Tahun ' + mk.blnTotal + ' Bulan' : ''}">
                </div>

                <div class="col-12 mt-2"><div class="fw-bold text-primary border-bottom pb-1 mb-1">✍️ Penandatangan</div></div>
                <div class="col-md-3">
                    <label class="form-label small mb-0 fw-semibold">Tempat TTD</label>
                    <input id="sk_tempat" class="form-control form-control-sm ${data.tempatLahir ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${data.tempatLahir || ''}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small mb-0 fw-semibold">Tgl TTD</label>
                    <input type="date" id="sk_tanggal" class="form-control form-control-sm bg-warning bg-opacity-10 border-warning" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small mb-0 fw-semibold">Atasan Nama</label>
                    <input id="sk_atasan_nama" class="form-control form-control-sm ${pengaturan.kepsekNama ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.kepsekNama || ''}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small mb-0 fw-semibold">Atasan NIP</label>
                    <input id="sk_atasan_nip" class="form-control form-control-sm ${pengaturan.kepsekNip ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.kepsekNip || ''}">
                </div>
            </div>
        </div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-file-word"></i> Cetak Dokumen Word',
        cancelButtonText: 'Batal',
        preConfirm: () => ({
            instansiNama: document.getElementById('sk_instansi_nama').value || '...',
            instansiAlamat: document.getElementById('sk_instansi_alamat').value || '...',
            instansiInduk: document.getElementById('sk_instansi_induk').value || '...',
            bendahara: document.getElementById('sk_bendahara').value || '...',
            tmtGol: document.getElementById('sk_tmt_gol').value || '...',
            tmtCpns: document.getElementById('sk_tmt_cpns').value || '...',
            jenisKepeg: document.getElementById('sk_jenis_kepeg').value || 'Pegawai Negeri Sipil Daerah',
            statusKepeg: document.getElementById('sk_status_kepeg').value || 'Pegawai Negeri Sipil Provinsi',
            ppSk: document.getElementById('sk_pp_sk').value || '...',
            eselon: document.getElementById('sk_eselon').value || '...',
            gajiPokok: document.getElementById('sk_gaji_pokok').value || '...',
            gajiBersih: document.getElementById('sk_gaji_bersih').value || '...',
            skTerakhir: document.getElementById('sk_terakhir').value || 'SK Berkala',
            jmlKeluarga: document.getElementById('sk_jml_keluarga').value || '...',
            mkGol: document.getElementById('sk_mk_gol').value || '...',
            mkTotal: document.getElementById('sk_mk_total').value || '...',
            atasanNama: document.getElementById('sk_atasan_nama').value || '...',
            atasanNip: document.getElementById('sk_atasan_nip').value || '...',
            tempat: document.getElementById('sk_tempat').value || '...',
            tanggal: document.getElementById('sk_tanggal').value || '',
        })
    });

    if (!formValues) return;

    const tglCetak = formValues.tanggal ? fmtTgl(formValues.tanggal) : '...';

    // ============================================================
    // HALAMAN 1 — PORTRAIT (Surat Keterangan)
    // ============================================================
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>SKUMPTK</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  body { font-family: "Times New Roman", serif; font-size: 12pt; color: #000; margin: 0; }
  table { border-collapse: collapse; }
  td, th { padding: 3px 5px; }
  .border-table, .border-table td, .border-table th { border: 1px solid black; }
  @page Section1 { size: 21.59cm 33.02cm; margin: 1.5cm 1.5cm 1cm 2cm; }
  div.Section1 { page: Section1; }
  @page Section2 { size: 33.02cm 21.59cm; margin: 1.5cm 1cm 1.5cm 1cm; mso-page-orientation: landscape; }
  div.Section2 { page: Section2; }
</style>
</head><body>
<div class="Section1">

<div style="text-align:center; font-size:13pt; font-weight:bold; text-decoration:underline; margin-bottom:24px; letter-spacing:1px;">
  SURAT KETERANGAN UNTUK MENDAPATKAN<br>PEMBAYARAN TUNJANGAN KELUARGA <b>(SKUMPTK)</b>
</div>

<table style="width:100%; font-size:11pt; margin-bottom: 16px;">
  <tr>
    <td style="width:220px; font-weight:bold; padding:2px 5px; vertical-align:top;">NAMA INSTANSI&nbsp;/&nbsp;UNIT KERJA</td>
    <td style="padding:2px 5px; vertical-align:top;">:&nbsp;${formValues.instansiNama}</td>
  </tr>
  <tr>
    <td style="font-weight:bold; padding:2px 5px; vertical-align:top;">ALAMAT LENGKAP INSTANSI</td>
    <td style="padding:2px 5px; vertical-align:top;">:&nbsp;${formValues.instansiAlamat}</td>
  </tr>
  <tr>
    <td style="font-weight:bold; padding:2px 5px; vertical-align:top;">INSTANSI INDUK</td>
    <td style="padding:2px 5px; vertical-align:top;">:&nbsp;${formValues.instansiInduk}</td>
  </tr>
  <tr>
    <td style="font-weight:bold; padding:2px 5px; vertical-align:top;">BENDAHARA&nbsp;PENGELUARAN</td>
    <td style="padding:2px 5px; vertical-align:top;">:&nbsp;${formValues.bendahara}</td>
  </tr>
</table>



<div style="font-size:11pt; margin-bottom:14px;">
  <b>DATA PEGAWAI&nbsp;:</b>
</div>

<table style="width:100%; font-size:11pt; margin-bottom:14px;">
  <tr><td style="width:220px; padding:2px 5px;">Nama Lengkap</td><td style="padding:2px 5px;">:&nbsp;<b>${namaLengkap || data.nama || '-'}</b></td></tr>
  <tr><td style="padding:2px 5px;">NIP</td><td style="padding:2px 5px;">:&nbsp;${data.nip || '-'}</td></tr>
  <tr><td style="padding:2px 5px;">Pangkat / Golongan Ruang</td><td style="padding:2px 5px;">:&nbsp;${data.golongan || '-'}</td></tr>
  <tr><td style="padding:2px 5px;">TMT Golongan</td><td style="padding:2px 5px;">:&nbsp;${formValues.tmtGol}</td></tr>
  <tr><td style="padding:2px 5px;">Tempat/Tanggal Lahir</td><td style="padding:2px 5px;">:&nbsp;${data.tempatLahir || '-'},&nbsp;${fmtTgl(data.tglLahir)}</td></tr>
  <tr><td style="padding:2px 5px;">Jenis Kelamin</td><td style="padding:2px 5px;">:&nbsp;${data.kelamin || '-'}</td></tr>
  <tr><td style="padding:2px 5px;">Agama&nbsp;/&nbsp;Kebangsaan</td><td style="padding:2px 5px;">:&nbsp;${data.agama || '-'}&nbsp;&nbsp;/&nbsp;&nbsp;Indonesia</td></tr>
  <tr><td style="padding:2px 5px;">Alamat Lengkap</td><td style="padding:2px 5px;">:&nbsp;${data.alamat || '-'}</td></tr>
  <tr><td style="padding:2px 5px;">TMT Calon Pegawai</td><td style="padding:2px 5px;">:&nbsp;${formValues.tmtCpns}</td></tr>
  <tr><td style="padding:2px 5px;">Jenis Kepegawaian</td><td style="padding:2px 5px;">:&nbsp;${formValues.jenisKepeg}</td></tr>
  <tr><td style="padding:2px 5px;">Status Kepegawaian</td><td style="padding:2px 5px;">:&nbsp;${formValues.statusKepeg}</td></tr>
  <tr><td style="padding:2px 5px;">Digaji menurut PP/SK</td><td style="padding:2px 5px;">:&nbsp;${formValues.ppSk}&nbsp;,&nbsp;Gaji Pokok&nbsp;:&nbsp;Rp.&nbsp;${formValues.gajiPokok},-</td></tr>
  <tr><td style="padding:2px 5px;">Besarnya Penghasilan sebulan</td><td style="padding:2px 5px;">:&nbsp;Rp.&nbsp;${formValues.gajiBersih},-&nbsp;/&nbsp;bulan</td></tr>
  <tr><td style="padding:2px 5px;">Jabatan Struktural</td><td style="padding:2px 5px;">:&nbsp;Eselon&nbsp;${formValues.eselon}</td></tr>
  <tr><td style="padding:2px 5px;">Jumlah Keluarga tertanggung</td><td style="padding:2px 5px;">:&nbsp;${formValues.jmlKeluarga}&nbsp;orang</td></tr>
  <tr><td style="padding:2px 5px;">SK Terakhir yang dimiliki</td><td style="padding:2px 5px;">:&nbsp;${formValues.skTerakhir}</td></tr>
  <tr><td style="padding:2px 5px;">Masa Kerja Golongan</td><td style="padding:2px 5px;">:&nbsp;${formValues.mkGol}</td></tr>
  <tr><td style="padding:2px 5px;">Masa Kerja Keseluruhan</td><td style="padding:2px 5px;">:&nbsp;${formValues.mkTotal}</td></tr>
</table>

<p style="text-align:justify; font-size:11pt; line-height:1.5; margin-bottom:30px;">
  Keterangan ini saya buat dengan sesungguhnya dan apabila keterangan ini tidak benar (palsu), saya bersedia dituntut dimuka pengadilan berdasarkan Undang &ndash; undang yang berlaku, dan bersedia mengembalikan semua uang tunjangan yang telah saya terima yang seharusnya bukan menjadi hak saya.
</p>

<table style="width:100%; font-size:11pt;">
  <tr>
    <td style="width:50%; text-align:center; vertical-align:top;">
      &nbsp;<br>
      Mengetahui&nbsp;/&nbsp;Mengesahkan<br>
      Atasan Langsung<br><br><br><br><br>
      <b><u>${formValues.atasanNama}</u></b><br>
      NIP.&nbsp;${formValues.atasanNip}
    </td>
    <td style="width:50%; text-align:center; vertical-align:top;">
      ${formValues.tempat},&nbsp;${tglCetak}<br>
      &nbsp;<br>
      Pegawai yang bersangkutan<br><br><br><br><br>
      <b><u>${namaLengkap || data.nama || '...'}</u></b><br>
      NIP.&nbsp;${data.nip || '...'}
    </td>
  </tr>
</table>

</div>

<!-- PAGE BREAK KE LANDSCAPE -->
<br clear="all" style="page-break-before:always; mso-break-type:section-break">

<div class="Section2">

<div style="font-size:11pt; font-weight:bold; text-align:center; text-decoration:underline; margin-bottom:10px;">
  DATA KELUARGA YANG MENJADI TANGGUNGAN PEGAWAI
</div>
<div style="font-size:10pt; font-weight:bold; margin-bottom:6px;">KAWIN SYAH DENGAN</div>`;

    // ============================================================
    // TABEL ISTRI / SUAMI (sesuai dokumen resmi — 9 kolom)
    // ============================================================
    html += `
<table class="border-table" style="width:100%; font-size:9pt; margin-bottom:16px;">
  <thead>
    <tr style="background:#f0f0f0; text-align:center; font-weight:bold;">
      <th style="width:25px;">NO</th>
      <th>NAMA ISTRI/SUAMI</th>
      <th>TEMPAT LAHIR</th>
      <th>TANGGAL LAHIR</th>
      <th>N.I.P&nbsp;/&nbsp;N.I.K</th>
      <th>PEKERJAAN</th>
      <th>TANGGAL PERKAWINAN</th>
      <th>ISTRI&nbsp;/&nbsp;SUAMI KE-</th>
      <th>PENGHASILAN&nbsp;/&nbsp;BULAN</th>
    </tr>
  </thead>
  <tbody>`;

    if (data.pasanganNama) {
        html += `
    <tr style="text-align:center;">
      <td>1</td>
      <td style="text-align:left;">${data.pasanganNama || '-'}</td>
      <td>${data.pasanganTmptLahir || '-'}</td>
      <td>${fmtTglSingkat(data.pasanganTglLahir)}</td>
      <td>${data.pasanganNik || data.pasanganNip || '-'}</td>
      <td>${data.pasanganPekerjaan || '-'}</td>
      <td>${data.pasanganTglNikah ? fmtTglSingkat(data.pasanganTglNikah) : '-'}</td>
      <td>1</td>
      <td>${data.pasanganPenghasilan || '-'}</td>
    </tr>`;
    } else {
        html += `<tr><td colspan="9" style="text-align:center; font-style:italic;">- Tidak ada data pasangan -</td></tr>`;
    }

    html += `</tbody></table>`;

    // ============================================================
    // TABEL ANAK (sesuai dokumen resmi — 11 kolom)
    // ============================================================
    html += `
<div style="font-size:10pt; font-weight:bold; margin-bottom:4px; margin-top:30px;">ANAK-ANAK YANG MENJADI TANGGUNGAN</div>
<div style="font-size:9pt; margin-bottom:4px;">
  Menjadi Anak-anak seperti dalam daftar dibawah ini.<br>
  Anak Kandung (AK) Anak Tiri (AT) Anak Angkat (AA) yang masih menjadi tanggungan belum mempunyai pekerjaan sendiri dan masuk dalam Daftar Gaji.<br>
  Anak Kandung (AK) Anak Tiri (AT) Anak Angkat (AA) yang masih menjadi tanggungan tapi tidak&nbsp;masuk dalam Daftar Gaji.
</div>
<table class="border-table" style="width:100%; font-size:9pt;">
  <thead>
    <tr style="background:#f0f0f0; text-align:center; font-weight:bold;">
      <th style="width:25px;">NO</th>
      <th>NAMA ANAK</th>
      <th>TEMPAT LAHIR</th>
      <th>TANGGAL LAHIR</th>
      <th>STATUS ANAK</th>
      <th>DARI ISTRI/SUAMI KE-</th>
      <th>JENIS KELAMIN</th>
      <th>DAPAT/TIDAK TUNJANGAN</th>
      <th>SUDAH/BELUM KAWIN</th>
      <th>MASIH/TIDAK SEKOLAH/KULIAH</th>
      <th>PUTUSAN PENGADILAN (KHUSUS AL)</th>
    </tr>
  </thead>
  <tbody>`;

    const riwayatAnak = Array.isArray(data.riwayatAnak) ? data.riwayatAnak.filter(a => a && a[0]) : [];
    if (riwayatAnak.length > 0) {
        riwayatAnak.forEach((a, idx) => {
            // riwayatAnak kolom: [0]Nama, [1]kotaLahir, [2]tglLahir, [3]statusAnak, [4]kelamin, [5]dapatTunjangan, [6]statusKawin, [7]statusSekolah, [8]dariIstri
            html += `
    <tr style="text-align:center;">
      <td>${idx + 1}</td>
      <td style="text-align:left;">${a[0] || '-'}</td>
      <td>${a[1] || '-'}</td>
      <td>${fmtTglSingkat(a[2]) || '-'}</td>
      <td>${a[3] || 'AK'}</td>
      <td>${a[8] || '1'}</td>
      <td>${a[4] || '-'}</td>
      <td>${a[5] || '-'}</td>
      <td>${a[6] || 'BELUM'}</td>
      <td>${a[7] || 'MASIH'}</td>
      <td>-</td>
    </tr>`;
        });
    } else {
        html += `<tr><td colspan="11" style="text-align:center; font-style:italic;">- Tidak ada data anak -</td></tr>`;
    }

    html += `</tbody></table>
</div>
</body></html>`;

    // Download sebagai .doc
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SKUMPTK_' + (data.nama || data.nip).replace(/[^a-zA-Z0-9]/g, '_') + '.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};



