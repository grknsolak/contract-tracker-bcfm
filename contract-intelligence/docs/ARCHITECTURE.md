# Architecture Notes

## Domain ana varlıkları
- User, Role, UserRole
- Customer
- Contract
- ContractPriceRevision
- ContractDocument
- RenewalAlert

## Temel hesaplamalar
- Renewal Rate = Yenilenen sözleşme / Yenilenmesi gereken sözleşme
- Zam yapılmamış sözleşme = fiyat revizyonu olmayan veya son revizyonu 12+ ay eski sözleşme
- Risk Skoru = gün kalan süre + son aktivite + renewal durumu + fiyat baskısı

## Yetki modeli
- `ADMIN`: tüm erişim
- `FINANCE`: finansal alanlar + raporlar
- `SALES`: sözleşme ve müşteri yönetimi
- `VIEWER`: sadece görüntüleme
