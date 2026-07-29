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

async function simpanPegawai() {
    const nipVal = (document.getElementById('peg_nip')?.value || '').trim();
    const namaVal = (document.getElementById('peg_nama')?.value || '').trim().toUpperCase();
    const tglLahir = (document.getElementById('peg_tgl_lahir')?.value || '').trim();
    const kelamin = (document.getElementById('peg_kelamin')?.value || '').trim();
    const statusPgw = (document.getElementById('statusPegawai')?.value || '').trim();

    // Validasi wajib: alert per field
    if (!nipVal) {
        Swal.fire('Peringatan', 'Kolom NIP (Baru) wajib diisi!', 'warning');
        document.getElementById('peg_nip')?.focus();
        return;
    }

    // CEK DUPLIKASI NIP / NIK
    const allPegawai = await dbManager.getAllPegawai();
    const currentNipLama = (document.getElementById('peg_nip_lama')?.value || '').trim();
    const nikVal = (document.getElementById('peg_nik')?.value || '').trim();

    if (nipVal) {
        const existNip = allPegawai.find(p => p.nip === nipVal && p.nip !== currentNipLama);
        if (existNip) {
            Swal.fire('Error', `NIP ${nipVal} sudah dipakai atas nama ${existNip.nama}. Data tidak bisa disimpan untuk mencegah tertimpa!`, 'error');
            return;
        }
    }

    if (nikVal) {
        const existNik = allPegawai.find(p => p.nik === nikVal && p.nip !== currentNipLama);
        if (existNik) {
            Swal.fire('Error', `NIK ${nikVal} sudah dipakai atas nama ${existNik.nama}. Data tidak bisa disimpan!`, 'error');
            return;
        }
    }

    if (!namaVal) {
        Swal.fire('Peringatan', 'Kolom Nama wajib diisi!', 'warning');
        document.getElementById('peg_nama')?.focus();
        return;
    }
    if (!tglLahir) {
        Swal.fire('Peringatan', 'Kolom Tanggal Lahir wajib diisi!', 'warning');
        document.getElementById('peg_tgl_lahir')?.focus();
        return;
    }
    if (!kelamin) {
        Swal.fire('Peringatan', 'Kolom Jenis Kelamin wajib dipilih!', 'warning');
        document.getElementById('peg_kelamin')?.focus();
        return;
    }
    if (!statusPgw) {
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
    const extractTableData = (tableId, columnCount) => {
        const rows = document.querySelectorAll(`#${tableId} tbody tr`);
        return Array.from(rows).map(row => {
            const inputs = row.querySelectorAll('input, select');
            return Array.from(inputs).slice(0, columnCount).map(i => i.value);
        });
    };

    let riwayatPangkat = extractTableData('tabelPangkat', 7);
    let riwayatKontrak = extractTableData('tabelKontrak', 9);
    let riwayatJabatan = extractTableData('tabelJabatan', 7);
    let riwayatKGB = extractTableData('tabelKGB', 6);
    let riwayatPendidikan = extractTableData('tabelPendidikan', 6);
    let riwayatAnak = extractTableData('tabelAnak', 4);
    let riwayatDiklat = extractTableData('tabelDiklat', 5);

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

    const data = {
        nip: nipVal,
        nik: document.getElementById('peg_nik')?.value || '',
        nama: namaVal,
        tempatLahir: document.getElementById('peg_tempat_lahir')?.value || '',
        tglLahir: tglLahir,
        kelamin: kelamin,
        agama: document.getElementById('peg_agama')?.value || '',
        statusKawin: document.getElementById('peg_status_kawin')?.value || '',
        alamat: document.getElementById('peg_alamat')?.value || '',
        nipLama: document.getElementById('peg_nip_lama')?.value || '',
        noHp: document.getElementById('peg_no_hp')?.value || '',
        email: document.getElementById('peg_email')?.value || '',
        golDarah: document.getElementById('peg_gol_darah')?.value || '',
        tinggiBadan: document.getElementById('peg_tinggi_badan')?.value || '',
        beratBadan: document.getElementById('peg_berat_badan')?.value || '',
        hobby: document.getElementById('peg_hobby')?.value || '',
        isKebutuhanKhusus: document.getElementById('peg_is_kebutuhan_khusus')?.value || 'Tidak',
        uraianKebutuhanKhusus: document.getElementById('peg_uraian_kebutuhan_khusus')?.value || '',
        statusPegawai: statusPgw,
        golongan: golongan,
        jabatan: jabatan,
        tmtJabatan: tmtJabatan,
        pendidikan: '',
        unitKerja: unitKerja || 'Dinas',
        statusKepegawaian: 'Aktif',
        gajiPokok: gajiPokok,
        tmtKgbLalu: tmtKgbLalu,
        tmtKgbBaru: kgbDate,
        tmtPensiun: '',
        riwayatPangkat: riwayatPangkat,
        riwayatKontrak: riwayatKontrak,
        riwayatJabatan: riwayatJabatan,
        riwayatKGB: riwayatKGB,
        riwayatPendidikan: riwayatPendidikan,
        riwayatAnak: riwayatAnak,
        riwayatDiklat: riwayatDiklat
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
        if ($.fn.DataTable.isDataTable(id)) $(id).DataTable().destroy();
        const data = allPegawai.filter(p => p.statusPegawai === statusPegawaiFilter && p.statusKepegawaian === 'Aktif');

        const formatted = data.map(p => [
            p.nip, p.nama, p.golongan, p.jabatan, p.unitKerja,
            `<button class='btn btn-sm btn-info text-white me-1' title='Lihat Profil' onclick='lihatPegawai("${p.nip}")'><i class='fas fa-eye'></i></button>
             <button class='btn btn-sm btn-warning text-dark me-1' title='Edit Data' onclick='editPegawai("${p.nip}")'><i class='fas fa-edit'></i></button>
             <button class='btn btn-sm btn-success text-white me-1' title='Cetak CV (Word)' onclick='cetakCV("${p.nip}")'><i class='fas fa-print'></i></button>
             <button class='btn btn-sm btn-danger text-white' title='Hapus' onclick='hapusPegawaiData("${p.nip}")'><i class='fas fa-trash'></i></button>`
        ]);

        const dt = $(id).DataTable({ data: formatted, pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
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
    if ($.fn.DataTable.isDataTable('#tblDUKPNS')) $('#tblDUKPNS').DataTable().destroy();
    if ($.fn.DataTable.isDataTable('#tblDUKPPPK')) $('#tblDUKPPPK').DataTable().destroy();
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

    const dtPNS = $('#tblDUKPNS').DataTable({ data: processData('PNS'), pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaDUKPNS').off('keyup').on('keyup', function () { dtPNS.search(this.value).draw(); });
    $('#filterGolDUKPNS').off('keyup').on('keyup', function () { dtPNS.column(3).search(this.value).draw(); });

    const dtPPPK = $('#tblDUKPPPK').DataTable({ data: processData('PPPK'), pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaDUKPPPK').off('keyup').on('keyup', function () { dtPPPK.search(this.value).draw(); });
    $('#filterGolDUKPPPK').off('keyup').on('keyup', function () { dtPPPK.column(3).search(this.value).draw(); });
}

async function renderTabelKGB() {
    if ($.fn.DataTable.isDataTable('#tblKGB')) $('#tblKGB').DataTable().destroy();
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

    const dt = $('#tblKGB').DataTable({ data: formatted, pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaKGB').off('keyup').on('keyup', function () { dt.search(this.value).draw(); });
    $('#filterStatusKGB').off('change').on('change', function () { dt.column(1).search(this.value).draw(); });
}

async function renderTabelRekap() {
    const allPegawai = await dbManager.getAllPegawai();

    const renderTabelAktif = (id, statusFilter) => {
        if ($.fn.DataTable.isDataTable(id)) $(id).DataTable().destroy();
        const data = allPegawai.filter(p => p.statusPegawai === statusFilter && p.statusKepegawaian === 'Aktif');

        const formatted = data.map(p => [
            p.nama, p.nip, p.golongan || '-', p.jabatan || '-', p.pendidikan || '-', `<span class='badge bg-success'>Aktif</span>`,
            `<button class='btn btn-sm btn-info text-white me-1' title='Lihat Profil' onclick='lihatPegawai("${p.nip}")'><i class='fas fa-eye'></i></button>
             <button class='btn btn-sm btn-secondary text-white me-1' title='Edit Status' onclick='editStatusPegawai("${p.nip}")'><i class='fas fa-user-edit'></i></button>`
        ]);

        const dt = $(id).DataTable({ data: formatted, pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
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
        if ($.fn.DataTable.isDataTable(id)) $(id).DataTable().destroy();
        const data = allPegawai.filter(p => p.statusKepegawaian === statusFilter);
        const formatted = data.map(mapFn);
        $(id).DataTable({ data: formatted, pageLength: 5 });
    };

    const badgeMap = { PNS: 'bg-primary', PPPK: 'bg-success', Honorer: 'bg-warning' };
    const getBadge = (s) => `<span class='badge ${badgeMap[s] || 'bg-secondary'}'>${s || '-'}</span>`;
    const getAksi = (nip) => `<button class='btn btn-sm btn-info text-white me-1' title='Lihat Profil' onclick='lihatPegawai("${nip}")'><i class='fas fa-eye'></i></button><button class='btn btn-sm btn-secondary text-white' title='Edit Status' onclick='editStatusPegawai("${nip}")'><i class='fas fa-user-edit'></i></button>`;

    renderTabel('#tblPensiun', 'Pensiun', p => [p.nip, p.nama, getBadge(p.statusPegawai), p.tmtPensiun || '-', p.jabatan, getAksi(p.nip)]);
    renderTabel('#tblMutasi', 'Mutasi', p => [p.nip, p.nama, getBadge(p.statusPegawai), '-', '-', getAksi(p.nip)]);
    renderTabel('#tblMeninggal', 'Meninggal', p => [p.nip, p.nama, getBadge(p.statusPegawai), '-', p.jabatan, getAksi(p.nip)]);
    renderTabel('#tblBerhenti', 'Berhenti', p => [p.nip, p.nama, getBadge(p.statusPegawai), '-', '-', getAksi(p.nip)]);
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
            <td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
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
            <td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelPendidikan') {
        tr.innerHTML = `
            <td><select class='form-select form-select-sm'><option>SD</option><option>SMP</option><option>SMA</option><option>D3</option><option>S1</option><option>S2</option><option>S3</option></select></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='2006'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='2010'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelDiklat') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='2020'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Contoh: 40 Jam'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelAnak') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><select class='form-select form-select-sm'><option>Kandung</option><option>Tiri</option><option>Angkat</option></select></td>
            <td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
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
            <td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelKGB') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Thn'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Bln'></td>
            <td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
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
    document.getElementById('form-pensiun-meninggal').classList.add('d-none');
    document.getElementById('form-resign').classList.add('d-none');
    document.getElementById('form-mutasi').classList.add('d-none');

    if (status === 'Pensiun' || status === 'Meninggal') {
        document.getElementById('form-pensiun-meninggal').classList.remove('d-none');
        document.getElementById('labelTglPensiunMeninggal').innerText = status === 'Pensiun' ? 'Tanggal Pensiun' : 'Tanggal Meninggal';
    } else if (status === 'Resign') {
        document.getElementById('form-resign').classList.remove('d-none');
    } else if (status === 'Mutasi') {
        document.getElementById('form-mutasi').classList.remove('d-none');
    }
}

function simpanStatusPegawai() {
    const status = document.getElementById('statusPegawaiDropdown').value;
    if (status !== 'Aktif') {
        Swal.fire('Status Diubah!', 'Status diubah ke ' + status + '. Pegawai telah dipindahkan ke menu Pegawai Non Aktif.', 'info');
    } else {
        Swal.fire('Berhasil!', 'Status berhasil diupdate!', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('modalEditStatusAktif')).hide();
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
        const currentNipLama = document.getElementById('peg_nip_lama')?.value || '';
        const existing = allPegawai.find(p => p.nik === val && p.nipLama !== currentNipLama && p.nip !== currentNipLama);
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
        const currentNipLama = document.getElementById('peg_nip_lama')?.value || '';
        const existing = allPegawai.find(p => p.nip === val && p.nipLama !== currentNipLama && p.nip !== currentNipLama);
        if (existing) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `NIP ini sudah ada atas nama ${existing.nama}`, showConfirmButton: false, timer: 4000 });
            el.classList.add('is-invalid');
        } else {
            el.classList.remove('is-invalid');
        }
    }
}

function bukaModalTambah() {
    // Kosongkan form secara manual karena tidak ada tag <form>
    const modalEl = document.getElementById('modalPegawai');
    if (modalEl) {
        modalEl.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else {
                el.value = '';
            }
        });
    }

    document.getElementById('peg_nik')?.classList.remove('is-invalid');
    document.getElementById('peg_nip')?.classList.remove('is-invalid');

    const preview = document.getElementById('previewFotoPegawai');
    if (preview) preview.src = 'https://via.placeholder.com/150';

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

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    // Populate Data
    setVal('peg_nip', p.nip || '');
    setVal('peg_nip_lama', p.nip || ''); // Kunci NIP asli
    const nipInput = document.getElementById('peg_nip');
    if (nipInput) nipInput.readOnly = true; // Tidak bisa diedit

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
    setVal('peg_alamat', p.alamat || '');

    setVal('statusPegawai', p.statusPegawai || 'PNS');
    if (typeof toggleSKFields === 'function') toggleSKFields(p.statusPegawai || 'PNS');

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
                const inputs = tr.querySelectorAll('input, select');
                rowData.forEach((val, index) => {
                    if (inputs[index]) {
                        inputs[index].value = val;
                        // trigger onchange event for toggleEselon etc
                        if (inputs[index].tagName === 'SELECT') {
                            inputs[index].dispatchEvent(new Event('change'));
                        }
                    }
                });
            });
        }
    };

    populateTable('tabelPangkat', p.riwayatPangkat);
    populateTable('tabelKontrak', p.riwayatKontrak);
    populateTable('tabelJabatan', p.riwayatJabatan);
    populateTable('tabelKGB', p.riwayatKGB);
    populateTable('tabelPendidikan', p.riwayatPendidikan);
    populateTable('tabelAnak', p.riwayatAnak);
    populateTable('tabelDiklat', p.riwayatDiklat);

    // Foto
    const imgEl = document.getElementById('previewFotoPegawai');
    if (imgEl) {
        if (p.foto && p.foto.startsWith('data:')) {
            imgEl.src = p.foto;
        } else {
            imgEl.src = 'https://via.placeholder.com/150';
        }
    }

    // Show Modal
    const modalEl = document.getElementById('modalPegawai');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        Swal.fire('Error', 'Modal edit tidak ditemukan di HTML.', 'error');
    }
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
                let nama = String(row['Nama Lengkap'] || '').trim();

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
        if (dropdown) dropdown.value = p.statusKepegawaian || 'Aktif';

        // Trigger toggle if exists
        if (typeof toggleFormStatus === 'function') toggleFormStatus(dropdown.value);

        new bootstrap.Modal(modalEl).show();
    }
}

async function simpanStatusPegawai() {
    const nip = window.currentEditStatusNip;
    const dropdown = document.getElementById('statusPegawaiDropdown');
    const statusBaru = dropdown ? dropdown.value : 'Aktif';

    if (!nip) return;

    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (p) {
        p.statusKepegawaian = statusBaru;

        // Simpan ke DB
        await dbManager.savePegawai(p);

        // Tutup modal
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

        // Refresh tabel
        if (typeof renderTabelRekap === 'function') renderTabelRekap();
        if (typeof renderTabelRiwayat === 'function') renderTabelRiwayat();
    }
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
        new bootstrap.Modal(modalEl).show();
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

async function cetakCV(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) return;

    let settings = JSON.parse(localStorage.getItem('pengaturanSiMPeEL')) || {};

    // Construct HTML
    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
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
        </style>
    </head>
    <body>
        <div class="kop">
            <div class="kop-kiri">${settings.kopKiri || ''}</div>
            <div class="kop-tengah1">${settings.kopTengah1 || 'PEMERINTAH DAERAH'}</div>
            <div class="kop-kanan">${settings.kopKanan || ''}</div>
            <div class="kop-tengah2">${settings.kopTengah2 || 'INSTANSI / DINAS'}</div>
            <div class="kop-tengah3">${settings.kopTengah3 || 'Alamat: ...'}</div>
        </div>
        
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
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">9. Alamat Rumah</td><td style="border: none;">: ${p.alamat || ''}</td></tr>
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
        
    </body>
    </html>
    `;

    // Download as .doc
    const blob = new Blob(['\ufeff', html], {
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
    if ($.fn.DataTable.isDataTable('#tblEstPensiun')) $('#tblEstPensiun').DataTable().destroy();
    const allPegawai = await dbManager.getAllPegawai();
    const dataAktif = allPegawai.filter(p => p.statusKepegawaian === 'Aktif');

    const formatted = dataAktif.map(p => {
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
            `${p.nama}<br><small>${p.nip}</small>`,
            p.tglLahir || '-',
            jnsJabatan,
            p.jabatan || '-',
            bup + " Tahun",
            `<b>${estPensiunStr}</b>`
        ];
    });

    const dtPensiun = $('#tblEstPensiun').DataTable({
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

