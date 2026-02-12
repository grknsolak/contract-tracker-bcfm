# 📋 Contract Tracker

Modern ve kullanıcı dostu sözleşme takip sistemi. React ve Node.js ile geliştirilmiş full-stack web uygulaması.

## 🚀 Özellikler

- ✅ Kullanıcı kimlik doğrulama (JWT)
- 📝 Sözleşme ekleme, düzenleme ve silme
- 🔍 Sözleşme arama ve filtreleme
- 📊 Dashboard görünümü
- 🗺️ İnteraktif topoloji haritası
- 🔒 Güvenli API endpoints
- 📱 Responsive tasarım
- 🐳 Docker desteği

## 🛠️ Teknolojiler

### Backend
- Node.js + Express.js
- SQLite veritabanı
- JWT kimlik doğrulama
- bcrypt şifreleme

### Frontend
- React 18
- Vite build tool
- Axios HTTP client
- Vis.js Network (Topoloji görselleştirme)
- Modern CSS

### DevOps
- Docker & Docker Compose
- Multi-stage builds

## 📦 Kurulum

### Docker ile (Önerilen)

```bash
# Projeyi klonla
git clone https://github.com/gurkansolak/contract-tracker.git
cd contract-tracker

# Uygulamayı başlat
docker-compose up -d

# Tarayıcıda aç
open http://localhost:8080
```

### Manuel Kurulum

```bash
# Backend
cd backend
npm install
npm start

# Frontend (yeni terminal)
cd frontend
npm install
npm run dev
```

## 🌐 Erişim

- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:3000

## 📁 Proje Yapısı

```
contract-tracker/
├── backend/           # Node.js API
│   ├── data/         # SQLite veritabanı
│   ├── server.js     # Ana server dosyası
│   └── package.json
├── frontend/         # React uygulaması
│   ├── src/
│   │   ├── App.jsx
│   │   ├── ContractApp.jsx
│   │   ├── TopologyApp.jsx    # Topoloji uygulaması
│   │   ├── TopologyEditor.jsx # Node editörü
│   │   └── Login.jsx
│   └── package.json
├── sample-topology.json  # Örnek topoloji
└── docker-compose.yml
```

## 🔧 Geliştirme

```bash
# Logları görüntüle
docker-compose logs -f

# Uygulamayı durdur
docker-compose down

# Veritabanını sıfırla
rm backend/data/data.sqlite
```

## 🗺️ Topoloji Özellikleri

- 🔄 Drag & drop ile node konumlandırma
- ✏️ Çift tık ile hızlı düzenleme
- 📥 JSON formatında dışa aktarma
- 📤 Hazır topoloji şablonlarını içe aktarma
- 🎨 7 farklı node tipi (Server, Database, Cache, vb.)
- 🔗 Otomatik bağlantı çizimi
- 📱 Mobil uyumlu arayüz

### Örnek Topoloji Kullanımı

1. Topoloji sekmesine git
2. "+ Servis Ekle" ile yeni node'lar ekle
3. Node'lara çift tıklayarak düzenle
4. "Dışa Aktar" ile topolojiyi kaydet
5. `sample-topology.json` dosyasını "İçe Aktar" ile yükle

## 📝 API Endpoints

- `POST /api/login` - Kullanıcı girişi
- `GET /api/contracts` - Sözleşmeleri listele
- `POST /api/contracts` - Yeni sözleşme ekle
- `PUT /api/contracts/:id` - Sözleşme güncelle
- `DELETE /api/contracts/:id` - Sözleşme sil

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 👨‍💻 Geliştirici

**Gürkan Solak** - [GitHub](https://github.com/gurkansolak)

---

⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!