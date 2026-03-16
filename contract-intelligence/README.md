# Contract Intelligence Platform

Sözleşme yaşam döngüsü yönetimi için sıfırdan kurulmuş web platformu.

## Kapsanan ihtiyaçlar
- Sözleşme başlangıç ve bitiş takibi
- 30/60/90 gün yenileme bildirimleri
- Otomatik alarm mekanizması
- Sözleşme tutarı, para birimi, faturalama modeli
- Hizmet türü sınıflandırması (DaaS, Support, Outsource, Man-Day, AWS Resell)
- Müşteri bazlı toplam gelir görünürlüğü
- Renewal oranı hesaplama
- Fiyat artış geçmişi ve oranları
- Zam yapılmamış sözleşmelerin tespiti
- Riskli/iptal potansiyeli işaretleme
- Doküman saklama
- Rol bazlı yetkilendirme
- Süre, karlılık, trend analizi

## Mimari
- `apps/api`: Node.js + Express + PostgreSQL API
- `apps/web`: React tabanlı frontend iskeleti
- `docs`: tasarım notları

## Hızlı başlangıç
```bash
cd contract-intelligence
docker compose up -d --build
```

Servisler:
- API: `http://localhost:3100`
- PostgreSQL: `localhost:5433`

Varsayılan kullanıcılar:
- `admin@contract.local / Admin123!` (ADMIN)
- `finance@contract.local / Finance123!` (FINANCE)
- `sales@contract.local / Sales123!` (SALES)

## Örnek akış
1. `POST /api/auth/login` ile token al.
2. `POST /api/contracts` ile sözleşme oluştur.
3. `POST /api/contracts/:id/price-revisions` ile zam geçmişi ekle.
4. `POST /api/contracts/:id/documents` ile dosya yükle.
5. `GET /api/analytics/dashboard` ile KPI'ları çek.

## Roadmap
- E-posta/Slack entegrasyonu
- Gelişmiş risk skorlama (ML)
- Approval workflow
- Çoklu şirket (multi-tenant) desteği
