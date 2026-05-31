# Fraud Detection (Dolandırıcılık)

> **Neo4j ve Redis ile geliştirilmiş, 9 farklı tespitle gerçek zamanlı finansal dolandırıcılık tespit sistemi.**

![Stack](https://img.shields.io/badge/Stack-NoSQL%20%2B%20Docker%20Compose-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0%2B-47A248?logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-7.2%2B-DC382D?logo=redis)
![Neo4j](https://img.shields.io/badge/Neo4j-5.x-008CC1?logo=neo4j)
![Zorluk](https://img.shields.io/badge/Zorluk-Zor-orange)
![Proje](https://img.shields.io/badge/Proje-P10-gray)
![Lisans](https://img.shields.io/badge/License-MIT-green)
![Durum](https://img.shields.io/badge/Durum-Development-yellow)

<!-- Repository hazır olduktan sonra ekleyin:
![CI](https://github.com/{{KULLANICI_ADI}}/{{REPO_ADI}}/actions/workflows/ci.yml/badge.svg)
![Codecov](https://codecov.io/gh/{{KULLANICI_ADI}}/{{REPO_ADI}}/branch/main/graph/badge.svg)
-->

---

## Kimlik Bilgisi

- **Öğrenci:** BEKİR BERKAY BESLİ
- **Öğrenci No:** 23080410039
- **Ders:** NoSQL Veritabanı Sistemleri — *Dr. Öğr. Üyesi Davut ARI*
- **Kurum:** Bitlis Eren Üniversitesi — Mühendislik-Mimarlık Fakültesi — Bilgisayar Mühendisliği
- **Dönem:** 2025-2026 Bahar
- **Proje Kodu:** P10
- **Proje Adı:** Fraud Detection (Dolandırıcılık)
- **Zorluk:** Zor
- **Repo:** https://github.com/bberkaybesli/fraud-detection

> Bu 10 satırlık kimlik bloğu zorunludur. Teslim kontrolünde ilk bakılan kısım burasıdır.

---

## 🎯 Özet

Finansal işlemlerdeki dolandırıcılık kalıplarını (kara para aklama, parçalı transferler vb.) anında tespit etmek amacıyla tasarlanmış bir güvenlik sistemidir. İlişkisel veritabanlarının, işlemleri derinlemesine tararken oluşturduğu gecikme ve performans problemlerini çözmek için geliştirilmiştir. 

Sistem, Neo4j (Graf Veritabanı) kullanarak karmaşık ilişkileri ve döngüleri çok hızlı yakalarken, Redis kullanarak IP ve hesap kontrollerini, rate limiting işlemlerini saniyenin çok ufak bir diliminde çözmektedir. Bu sayede MASAK ve KVKK standartlarında güvenilir bir gerçek zamanlı değerlendirme yapılabilmektedir.

## 🎥 Demo

🔗 **Canlı Demo (opsiyonel):** [https://...](https://...)
🐳 **Tek Komutla Kalkış:**

```bash
docker compose up -d
# servisler hazır olduğunda:
open http://localhost:3000        # API + (varsa) frontend
open http://localhost:8081        # Mongo Express  (opsiyonel)
open http://localhost:7474        # Neo4j Browser  (opsiyonel)
```

👤 **Demo Hesap (seed):** `demo@example.com` · `demo123`

![Demo GIF](repo/docs/demo.gif)

> Ekran görüntülerini, mimari diyagramları, log örneklerini `repo/docs/` altında istediğiniz şekilde organize edebilirsiniz.

### Ekran Görüntüleri (Örnek)

| Login | Dashboard | Detay | Admin |
|-------|-----------|-------|-------|
| ![login](repo/docs/screenshots/01-login.png) | ![dashboard](repo/docs/screenshots/02-dashboard.png) | ![detail](repo/docs/screenshots/03-detail.png) | ![admin](repo/docs/screenshots/04-admin.png) |

## ✨ Ana Özellikler

- ✅ 9 Farklı Sinyalle Gerçek Zamanlı Risk Skoru Hesaplama (Sub-100ms)
- ✅ Neo4j ile Cypher Tabanlı Ring Trading (Döngü) ve Smurfing (Parçalama) Tespiti
- ✅ Redis üzerinden O(1) maliyetli Blacklist/Whitelist kontrolleri ve Rate Limiting
- ✅ JWT tabanlı kimlik doğrulama
- ✅ Winston ile Structured (JSON) audit loglama ve /health derin sağlık endpoint'i
- ✅ KVKK uyumu için TC Kimlik verilerinin SHA-256 algoritmasıyla maskelenmesi
- ✅ Docker Compose ile tek komut kalkış
- ✅ Seed script (50-100+ örnek kayıt)

## 🧰 Tech Stack

**Runtime:** `Node.js 20+ (TypeScript)`
**Framework:** `Express 4.x`
**NoSQL Veritabanları:**
- `Redis 7.x` — Cache, rate-limit ve blacklist
- `Neo4j 5.x + GDS` — İşlem grafı analizi, döngü tespiti, gerçek zamanlı değerlendirme

**Auth:** `JWT` + `bcrypt` (refresh token rotation)
**Validation:** `zod` / `joi` / `pydantic`
**Logging:** `pino` / `winston` / `loguru` (JSON structured)
**Testing:** `vitest` / `jest` / `pytest` + `supertest` / `httpx`
**Container:** `Docker` + `docker compose`
**CI/CD (opsiyonel):** `GitHub Actions`

> Teknoloji seçimlerinin detaylı gerekçesi: [PROJE-RAPORU.md · Bölüm 7](PROJE-RAPORU.md#7-teknoloji-yığını-tech-stack)

## 🏗 Mimari

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client/UI   │────▶│   API (REST) │────▶│   MongoDB    │
└──────────────┘     │  Node/Python │     └──────────────┘
                     │    + Auth    │     ┌──────────────┐
                     │   + Logger   │────▶│    Redis     │
                     └──────┬───────┘     └──────────────┘
                            │             ┌──────────────┐
                            └────────────▶│    Neo4j     │
                                          └──────────────┘
```

[*Detaylı mimari diyagramı `repo/docs/diagrams/architecture.png` altında*]

[Mimari, ADR'lar ve veri akışı →](PROJE-RAPORU.md#8-sistem-mimarisi)

## 🚀 Kurulum

### Gereksinimler

- Docker ≥ 24 + Docker Compose v2
- (Lokal dev için) Node.js ≥ 20 _(veya Python 3.11+ / Go 1.22+)_
- 4 GB+ RAM (Mongo + Redis + Neo4j birlikte)
- Port: `3000`, `27017`, `6379`, `7474`, `7687` (gerektiğinde değiştirin)

### Adım Adım

```bash
# 1) Repo'yu klonla
git clone https://github.com/bberkaybesli/fraud-detection.git
cd fraud-detection

# 2) Environment dosyası
cp .env.example .env
# .env içindekileri doldurun (MONGO_URI, REDIS_URL, NEO4J_URI, JWT_SECRET, ...)

# 3) Tek komutla tüm servisleri kaldır
cd repo
docker compose up -d

# 4) Health kontrolü
curl -s http://localhost:3000/health | jq
# {"status":"ok","mongo":"up","redis":"up","neo4j":"up"}

# 5) Seed script çalıştır
docker compose exec backend npm run seed

# 6) Loglara bak
docker compose logs -f api
```

### Lokal Dev (Docker dışında)

```bash
cd repo
npm install                  # veya pip install -r requirements.txt
npm run dev                  # Hot reload
```

## 🧪 Test

```bash
# Unit + Integration testleri
docker compose exec api npm test
# veya
docker compose exec api pytest -v

# Coverage
docker compose exec api npm run test:coverage

# HTTP istek koleksiyonu (alternatif)
# REST Client (VS Code) ile repo/requests.http çalıştırılabilir
```

## 📡 API Özet

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/accounts` | Yeni hesap oluştur |
| `POST` | `/auth/login` | Admin paneli için JWT al |
| `GET`  | `/health` | DB'ler dahil derin sağlık kontrolü |
| `POST` | `/transactions/check` | Gerçek zamanlı para transferi risk analizi (Fraud Check) |

> Tam liste, payload örnekleri ve curl komutları: [PROJE-RAPORU.md · Bölüm 9](PROJE-RAPORU.md#9-veri-modeli-ve-api-tasarımı)

## 📁 Klasör Yapısı (bu teslimde)

```
.
├── README.md                   (bu dosya — özet, kurulum, demo)
├── PROJE-RAPORU.md             (uzun form final raporu — markdown)
├── LICENSE
├── .env.example
├── .gitignore
└── repo/                       (kaynak kodu)
    ├── docker-compose.yml      (Mongo + Redis + Neo4j + API)
    ├── Dockerfile
    ├── src/                    (Node.js veya app/ Python ...)
    │   ├── routes/             (REST endpoint'leri)
    │   ├── models/             (Mongo şemaları)
    │   ├── graph/              (Neo4j Cypher sorguları)
    │   ├── cache/              (Redis yardımcıları)
    │   └── middleware/         (auth, validation, logging)
    ├── tests/                  (unit + integration)
    ├── docs/                   (diyagramlar, screenshot'lar)
    ├── seeds/                  (örnek veri scriptleri)
    ├── requests.http           (manuel test koleksiyonu)
    ├── package.json            (veya requirements.txt)
    └── README.md
```

## 🛣 Roadmap

- [x] V1 — Gerçek Zamanlı Fraud Scoring (MVP)
- [ ] V2 — Batch Job Graf Analitikleri (PageRank, Louvain)
- [ ] V3 — Gerçek zamanlı gösterge paneli (Websocket/Socket.io destekli)

## 📚 Production Hazırlığı

Bu proje **NoSQL Production Dokümantasyonu**'nun **10 başlığını** kapsar:

1. Veri Modeli Gerekçesi
2. Indexing Stratejisi
3. Replica / Sharding Planı
4. Backup & Recovery
5. Monitoring & Alerting
6. Güvenlik & Auth
7. Performance Benchmark
8. Deployment & CI/CD
9. Capacity Planning
10. Postmortem / Bilinen Limitler

[Detaylar →](PROJE-RAPORU.md#11-güvenlik-performans-test) ve [genel rehber](../../../FINALE-PROJE-NOSQL-PROD-DOKUMANTASYON.md)

## 🤝 Akademik Bağlam

Bu proje **NoSQL Veritabanı Sistemleri** dersi kapsamında **Bitlis Eren Üniversitesi** — **Bilgisayar Mühendisliği** bölümünde bir final ödevi olarak geliştirilmiştir.

Ders yürütücüsü: **Dr. Öğr. Üyesi Davut ARI**

## 📜 Lisans

MIT © 2026 **BEKİR BERKAY BESLİ** — Tam metin için [LICENSE](LICENSE).

## 🙋‍♂️ İletişim

- **Öğrenci:** BEKİR BERKAY BESLİ
- **Öğrenci No:** 23080410039
- **E-posta:** bekirberkay@example.com
- **Ders:** NoSQL Veritabanı Sistemleri
- **Kurum:** Bitlis Eren Üniversitesi — Mühendislik-Mimarlık Fakültesi

---

<sub>🤖 Bu projede [Claude Code](https://claude.com/claude-code), [Cursor](https://cursor.sh) gibi AI asistanları kullanılmış olabilir. Tüm mimari kararlar, şema seçimleri ve kullanım tercihleri öğrenci tarafından yapılmıştır ve sunumda savunulacaktır.</sub>
