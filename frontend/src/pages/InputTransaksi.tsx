import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Upload, X, Camera, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import api from '../lib/api';
import { Kategori } from '../types';

export default function InputTransaksi() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tipe, setTipe] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');
  const [nominal, setNominal] = useState('');
  const [kategoriId, setKategoriId] = useState('');
  const [metode, setMetode] = useState('cash');
  const [deskripsi, setDeskripsi] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: kategoriData } = useQuery<{ data: Kategori[] }>({
    queryKey: ['kategori'],
    queryFn: () => api.get('/api/kategori').then((r) => r.data),
  });

  const kategoriList = kategoriData?.data || [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Format file harus JPG, PNG, atau PDF');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    try {
      let processedFile = selectedFile;
      if (selectedFile.type.startsWith('image/')) {
        processedFile = await imageCompression(selectedFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          initialQuality: 0.7,
          fileType: 'image/jpeg',
        });
      }

      setFile(processedFile);
      if (processedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setFilePreview(ev.target?.result as string);
        reader.readAsDataURL(processedFile);
      } else {
        setFilePreview(null);
      }
    } catch {
      toast.error('Gagal memproses file');
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatNominal = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('Bukti transaksi wajib diunggah');
      return;
    }

    if (!kategoriId) {
      toast.error('Pilih kategori dana');
      return;
    }

    const nominalNum = parseInt(nominal.replace(/\./g, ''));
    if (isNaN(nominalNum) || nominalNum <= 0) {
      toast.error('Nominal harus lebih besar dari 0');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('tanggal', tanggal);
      formData.append('tipe', tipe);
      formData.append('nominal', String(nominalNum));
      formData.append('kategori_id', kategoriId);
      formData.append('metode', metode);
      if (deskripsi) formData.append('deskripsi', deskripsi);
      formData.append('bukti', file);

      await api.post('/api/transaksi', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Transaksi berhasil disimpan');
      navigate('/riwayat');
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="font-poppins font-semibold text-xl text-primary mb-6">Input Transaksi Baru</h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card space-y-5">
            <h3 className="font-poppins font-semibold text-primary">Detail Transaksi</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="input-field"
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Transaksi</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipe('pemasukan')}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    tipe === 'pemasukan'
                      ? 'bg-success text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setTipe('pengeluaran')}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    tipe === 'pengeluaran'
                      ? 'bg-danger text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Pengeluaran
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Nominal (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium">Rp</span>
                <input
                  type="text"
                  value={nominal}
                  onChange={(e) => setNominal(formatNominal(e.target.value))}
                  className="input-field pl-10 font-jetbrains"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori/Post Dana</label>
              <select
                value={kategoriId}
                onChange={(e) => setKategoriId(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Pilih kategori...</option>
                {kategoriList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
              <select
                value={metode}
                onChange={(e) => setMetode(e.target.value)}
                className="input-field"
              >
                <option value="cash">Tunai (Cash)</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keterangan/Deskripsi
                {tipe === 'pengeluaran' && <span className="text-muted"> (disarankan)</span>}
              </label>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="input-field min-h-[80px]"
                maxLength={500}
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-poppins font-semibold text-primary mb-4">Upload Bukti</h3>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Camera size={40} className="mx-auto text-muted mb-3" />
                <p className="text-sm text-muted">Drag & drop atau klik untuk pilih file</p>
                <p className="text-xs text-muted mt-1">JPG, PNG, atau PDF (max 5MB)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {file && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-3">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-medium">
                      PDF
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button type="button" onClick={removeFile} className="p-1 hover:bg-red-50 rounded">
                    <X size={18} className="text-danger" />
                  </button>
                </div>
              )}
            </div>

            <div className="card bg-green-50 border border-green-200">
              <h4 className="font-medium text-primary text-sm mb-2">Panduan Amanah</h4>
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>Pastikan nominal sesuai dengan kuitansi/bukti fisik.</li>
                <li>Pilih kategori dana yang tepat untuk laporan berkala.</li>
                <li>Unggah bukti transaksi sebagai transparansi digital.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            type="button"
            onClick={() => {
              if (nominal || deskripsi || file) {
                if (confirm('Ada input yang sudah diisi. Batalkan?')) navigate('/dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
            className="btn-outline"
          >
            Batalkan
          </button>
          <button
            type="submit"
            disabled={loading || !file}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <Save size={18} />
            )}
            Simpan Transaksi
          </button>
        </div>
      </form>
    </div>
  );
}
