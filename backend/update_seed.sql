-- Add notes column to existing contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Insert contract history data
INSERT INTO contract_history (customer_id, contract_name, start_date, end_date, amount, currency, notes) VALUES
(1, 'Viennalife DevOps 2023', '2023-01-01', '2024-01-01', 500000, 'TL', 'İlk yıl sözleşmesi'),
(1, 'Viennalife DevOps 2024', '2024-01-01', '2025-01-01', 650000, 'TL', 'Yenileme - %30 artış'),
(2, 'Teknosa CI/CD 2023', '2023-06-01', '2023-12-01', 300000, 'TL', '6 aylık pilot proje'),
(2, 'Teknosa CI/CD 2024', '2024-01-01', '2024-07-01', 350000, 'TL', 'Genişletilmiş kapsam'),
(3, 'CarrefourSA Platform 2023', '2023-12-01', '2024-12-01', 450000, 'TL', 'E-ticaret altyapısı'),
(4, 'Şişecam Cloud 2023', '2023-02-01', '2024-02-01', 380000, 'TL', 'AWS migration projesi'),
(5, 'Aegon Infrastructure 2024', '2024-04-01', '2024-10-01', 280000, 'TL', 'Altyapı modernizasyonu'),
(6, 'Akbank Security 2023', '2023-01-15', '2024-01-15', 600000, 'TL', 'Güvenlik ve compliance'),
(7, 'Garanti BBVA DevOps 2023', '2023-03-15', '2024-03-15', 550000, 'TL', 'DevOps dönüşümü'),
(8, 'Turkcell Cloud 2024', '2024-05-01', '2024-11-01', 480000, 'TL', 'Bulut geçiş projesi'),
(9, 'Vodafone Platform 2023', '2023-02-15', '2024-02-15', 420000, 'TL', 'Platform modernizasyonu'),
(10, 'Türk Telekom Support 2024', '2024-06-01', '2024-12-01', 390000, 'TL', '7/24 destek hizmeti');

-- Update existing contracts with notes
UPDATE contracts SET notes = 'Aktif sözleşme - 2025 yılı' WHERE name LIKE '%2025%' OR end_date >= '2025-01-01';
UPDATE contracts SET notes = 'AWS Resell dahil' WHERE scope::text LIKE '%AWS Resell%';
UPDATE contracts SET notes = '7/24 destek dahil' WHERE scope::text LIKE '%7/24 Support%' AND notes IS NULL;
