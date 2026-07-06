export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'viewer';
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface Kategori {
  id: string;
  nama: string;
  saldo: number;
  is_active: boolean;
  urutan_tampil: number;
}

export interface Transaksi {
  id: string;
  tanggal: string;
  tipe: 'pemasukan' | 'pengeluaran';
  nominal: number;
  kategori: { id: string; nama: string };
  metode: string;
  deskripsi?: string;
  bukti_url?: string;
  created_by: { id: string; full_name: string };
  created_at: string;
  status: string;
}

export interface DashboardData {
  total_saldo: number;
  perubahan_persen_bulan_ini: number | null;
  kategori: Array<{ id: string; nama: string; saldo: number }>;
  transaksi_terakhir: Array<{
    id: string;
    tanggal: string;
    deskripsi?: string;
    kategori: string;
    tipe: string;
    nominal: number;
    status: string;
  }>;
}

export interface TransaksiListData {
  items: Transaksi[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total_kas: number;
    total_pemasukan: number;
    total_pengeluaran: number;
  };
}

export interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  aktif: boolean;
  created_at: string;
}

export interface ProfilMasjid {
  nama_masjid: string;
  alamat?: string;
  logo_url?: string;
  status_audit_terverifikasi: boolean;
}

export interface LaporanArsip {
  id: string;
  bulan: number;
  tahun: number;
  generated_at: string;
  download_url: string;
}

export interface TvData {
  total_saldo: number;
  saldo_zakat: number;
  saldo_infaq_shadaqah: number;
  saldo_wakaf_anak_yatim: number;
  status_audit_terverifikasi: boolean;
  update_terakhir: string;
  transaksi_terakhir: Array<{
    id: string;
    tanggal: string;
    deskripsi?: string;
    kategori: string;
    tipe: string;
    nominal: number;
    status: string;
  }>;
  pengumuman: Array<{ judul: string; isi: string; created_at: string }>;
  profil_masjid: { nama_masjid: string; logo_url?: string };
}
