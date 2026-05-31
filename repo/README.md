# Finansal Fraud Detection Sistemi
**Öğrenci:** [Ad Soyad]
**Okul No:** [2021XXXXX]
**Ders:** NoSQL Veritabanı Sistemleri — Bahar 2025-2026

## 📋 Proje Özeti

Para transferleri ve alışveriş işlemleri üzerinde **grafik tabanlı dolandırıcılık tespiti** yapan sistem. Neo4j ile döngü tespiti (ring trading), PageRank ile şüpheli hesap skorlama ve community detection ile para aklama ağları bulunur.

## 🏗️ Teknoloji Stack

- **Graph Database:** Neo4j 5.18 + Graph Data Science (GDS) + APOC
- **Cache/Blacklist:** Redis 7
- **Backend:** Node.js + TypeScript + Express
- **Auth:** JWT
- **Container:** Docker Compose

## 🚀 Hızlı Başlangıç

```bash
# 1. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# 2. Servisleri başlat
docker compose up -d

# 3. Sağlık kontrolü
curl http://localhost:3000/health

# 4. Dashboard'u aç (Tarayıcıda)
# Dosyayı çift tıklayın: frontend/index.html
# veya: start frontend/index.html (Windows)

# 5. Seed data yükle
docker compose exec backend npm run seed

# 6. Test senaryolarını çalıştır
npm test
```

## 🎨 Web Dashboard

Projenin **interaktif web dashboard**'u var! Backend API'lerini görsel olarak test edebilirsiniz.

**Nasıl kullanılır:**
1. Servisleri başlatın: `docker compose up -d`
2. Dashboard'u açın: `frontend/index.html` (çift tıklayın)
3. Otomatik olarak backend'e bağlanır

**Özellikler:**
- ✅ Sistem durumu (Neo4j, Redis, Backend)
- ✅ İşlem fraud kontrolü (real-time)
- ✅ Dashboard istatistikleri
- ✅ Döngü tespiti görselleştirme
- ✅ Smurfing analizi
- ✅ Blacklist yönetimi

**Demo için ideal!** Hocaya sunarken tarayıcıdan gösterebilirsiniz.

📖 Detaylı sunum rehberi: [`SUNUM_REHBERI.md`](SUNUM_REHBERI.md)

## 📊 Özellikler

### ✅ Zorunlu Görevler
- [x] Docker Compose ile Neo4j GDS + Redis + Backend
- [x] Hesap ve işlem kaydetme API
- [x] Real-time fraud scoring (<200ms)
- [x] Cycle detection (ring trading)
- [x] Smurfing detection
- [x] PageRank batch processing
- [x] Louvain community detection
- [x] Redis blacklist yönetimi
- [x] MASAK bildirimi mock entegrasyonu
- [x] Admin dashboard

### 🎯 Fraud Detection Algoritmaları

1. **Cycle Detection:** A→B→C→A döngüsel para transferi tespiti
2. **Smurfing:** Büyük tutarın küçük parçalara bölünmesi
3. **PageRank:** Şüpheli hesap merkezlerini bulma
4. **Community Detection:** Para aklama ağlarını tespit
5. **Rate Limiting:** Anormal işlem sıklığı kontrolü
6. **Amount Anomaly:** Kullanıcı ortalamasının 10x üzeri işlemler

## 🔌 API Endpoints

### Public Endpoints
- `GET /health` - Sistem sağlık kontrolü

### Service Endpoints (API Key)
- `POST /transactions` - Yeni işlem kaydet
- `POST /transactions/check` - Fraud kontrolü + kayıt

### Admin Endpoints (JWT Auth)
- `POST /auth/login` - Admin girişi
- `POST /accounts` - Hesap oluştur
- `GET /accounts/:id` - Hesap detayı
- `GET /accounts/:id/community` - Community üyeleri
- `GET /fraud/cycles` - Tüm döngüler
- `GET /fraud/cycles/:account_id` - Hesap döngüleri
- `GET /fraud/smurfing` - Smurfing adayları
- `POST /admin/batch/pagerank` - PageRank çalıştır
- `POST /admin/batch/louvain` - Louvain çalıştır
- `GET /admin/blacklist` - Blacklist listesi
- `POST /admin/blacklist/account` - Blacklist'e ekle
- `DELETE /admin/blacklist/account/:id` - Blacklist'ten çıkar
- `POST /admin/whitelist/account` - Whitelist'e ekle
- `GET /admin/dashboard` - Fraud istatistikleri
- `GET /admin/masak/reports` - MASAK raporları

## 📖 Kullanım Senaryoları

### Senaryo 1: Ring Trading Tespiti

```bash
# 3 hesap arası döngü oluştur
curl -X POST http://localhost:3000/transactions/check \
  -H "Content-Type: application/json" \
  -d '{"sender":"A","recipient":"B","amount":50000,"tx_id":"T1"}'

curl -X POST http://localhost:3000/transactions/check \
  -d '{"sender":"B","recipient":"C","amount":50000,"tx_id":"T2"}'

# Döngü tamamlanınca reject
curl -X POST http://localhost:3000/transactions/check \
  -d '{"sender":"C","recipient":"A","amount":50000,"tx_id":"T3"}'
# → {"decision":"reject","fraud_score":85}
```

### Senaryo 2: Smurfing Tespiti

```bash
# 25 küçük işlem (her biri 9,950 TL - raporlama eşiği altı)
for i in {1..25}; do
  curl -X POST http://localhost:3000/transactions/check \
    -d "{\"sender\":\"A\",\"recipient\":\"M$i\",\"amount\":9950}"
done
# → 20. işlemde alarm
```

### Senaryo 3: Blacklist Kontrolü

```bash
# Hesabı blacklist'e ekle
curl -X POST http://localhost:3000/admin/blacklist/account \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"account_id":"MULE-42","reason":"cashout_mule"}'

# Blacklist'teki hesaba işlem
curl -X POST http://localhost:3000/transactions/check \
  -d '{"sender":"X","recipient":"MULE-42","amount":5000}'
# → 403 Forbidden
```

## 🏛️ Mimari

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Banka API  │───▶│  Fraud Engine   │───▶│    Neo4j     │
│   Gateway    │◀───│   (Express)     │◀───│  Graph DB    │
└──────────────┘    └────────┬────────┘    └──────────────┘
                             │                     ▲
                             ▼                     │
                      ┌──────────────┐   ┌────────┴────────┐
                      │    Redis     │   │  Batch Worker   │
                      │  Blacklist   │   │  (PageRank,     │
                      │  Rate Limit  │   │   Louvain)      │
                      └──────┬───────┘   └─────────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ MASAK Mock   │
                      │  Reporter    │
                      └──────────────┘
```

## 📁 Proje Yapısı

```
fraud-detection/
├── README.md
├── docker-compose.yml
├── .env.example
├── init-neo.cypher
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── config/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── engine/
│       ├── models/
│       ├── utils/
│       └── seed.ts
├── masak-mock/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── docs/
│   ├── production-readiness.md
│   ├── fraud-patterns.md
│   └── api-documentation.md
├── tests/
│   └── integration/
└── requests.http
```

## 🔒 Güvenlik

- TC Kimlik numaraları SHA-256 hash'li saklanır (KVKK uyumu)
- JWT token ile admin endpoint koruması
- Parametreli Cypher sorguları (injection koruması)
- Rate limiting ile DDoS koruması
- Audit log tüm fraud kararları için

## 📊 Performans Hedefleri

- Real-time fraud scoring: **<200ms** (p95)
- Cycle detection (4-hop): **<500ms**
- PageRank (100k hesap): **<30 saniye**
- Blacklist kontrolü: **<5ms**
- Redis rate limit: **<2ms**

## 🧪 Test

```bash
# Unit testler
npm test

# Integration testler
npm run test:integration

# Fraud senaryoları
npm run test:fraud-scenarios

# Load test
npm run test:load
```

## 📚 Dokümantasyon

- [Production Readiness](docs/production-readiness.md) - Üretim hazırlığı
- [Fraud Patterns](docs/fraud-patterns.md) - Tespit edilen fraud kalıpları
- [API Documentation](docs/api-documentation.md) - Detaylı API dökümanı

## 🎓 Akademik Referanslar

- Neo4j Graph Data Science Library
- MASAK Şüpheli İşlem Bildirim Rehberi
- BDDK Bankacılık Güvenlik Standartları
- PageRank Algorithm (Page & Brin, 1998)
- Louvain Community Detection (Blondel et al., 2008)

## 📝 Lisans

Bu proje NoSQL Veritabanı Sistemleri dersi kapsamında akademik amaçlı geliştirilmiştir.

## 👤 İletişim

**Öğrenci:** [Ad Soyad]  
**E-posta:** [email@example.com]  
**GitHub:** [github.com/username]

---

**Not:** Bu sistem eğitim amaçlıdır. Gerçek üretim ortamında kullanılmadan önce kapsamlı güvenlik denetimi ve yasal uyumluluk kontrolü yapılmalıdır.
