# NoSQL Final Projesi — Öğrenci Teslim Dizinleri

> **Ders:** NoSQL Veritabanı Sistemleri — Bahar 2025-2026
> **Bitlis Eren Üniversitesi — Bilgisayar Mühendisliği**
> **Dr. Öğr. Üyesi Davut ARI**

Bu dizin, **15 atanmış öğrencinin** her biri için ayrı bir teslim klasörü içerir. Mobile ve Web Tabanlı Programlama derslerinde uygulanan teslim yapısı NoSQL dersine uyarlanmıştır.

---

## Klasör Yapısı

```
teslimler/
├── _SABLON/                                          (ham şablon — kopyalanır)
│   ├── README.md
│   ├── PROJE-RAPORU.md
│   ├── .env.example
│   ├── .gitignore
│   ├── LICENSE
│   └── repo/
│       ├── .gitkeep
│       └── README.md
├── {ÖğrenciNo}-{ProjeKodu}-{slug}/                   (her öğrenci için)
│   └── ... (şablonun aynısı, placeholder'lar doldurulmuş)
└── README.md                                          (bu dosya)
```

Her öğrenci klasörünün içinde:
- **README.md** — Proje tanıtımı, demo, kurulum komutları (placeholder'lar dolu)
- **PROJE-RAPORU.md** — 13 bölümlük uzun form rapor (placeholder'lar dolu)
- **.env.example** — Mongo/Redis/Neo4j/JWT environment örneği
- **.gitignore** — Node.js + Python + Docker + NoSQL volume'leri kapsayan ignore
- **LICENSE** — MIT, öğrenci adıyla doldurulmuş
- **repo/** — Asıl kaynak kodun yerleşeceği boş dizin (önerilen klasör yapısı README'de)

---

## 15 Atanmış Öğrenci

| # | Öğrenci No | Ad Soyad | Kod | Proje | Zorluk | Klasör |
|---|---|---|---|---|---|---|
| 1 | 22010714307 | ALİ SEYYİD ALİ | P18 | Siber Güvenlik Tehdit İstihbaratı | 🟠 Zor | [→](22010714307-P18-siber-guvenlik-tehdit-istihbarati/) |
| 2 | 22080410015 | MURAT SİLİ | P14 | Sosyal Medya Analitik Dashboard | 🔴 Çok Zor | [→](22080410015-P14-sosyal-medya-analitik-dashboard/) |
| 3 | 22080410209 | HÜSEYİN EL MUHAMMED | P21 | Lojistik Filo & Rota Optimizasyonu | 🟠 Zor | [→](22080410209-P21-lojistik-filo-rota-optimizasyonu/) |
| 4 | 22080410215 | BEYAN HACABDULLAH | P06 | Hastane Randevu & Hasta Takip | 🟡 Orta-Zor | [→](22080410215-P06-hastane-randevu-hasta-takip/) |
| 5 | 23080410005 | BEDİRHAN YILDIZ | P15 | Multi-Tenant SaaS Platform | 🔴 Çok Zor | [→](23080410005-P15-multi-tenant-saas-platform/) |
| 6 | 23080410008 | HÜSEYİN AYATA | P17 | GraphRAG: Akıllı Doküman Arama | 🟠 Zor | [→](23080410008-P17-graphrag-akilli-dokuman-arama/) |
| 7 | 23080410013 | MUHAMMET SAĞDIÇ | P12 | Üniversite Ders & Kariyer Yönlendirme | 🟠 Zor | [→](23080410013-P12-universite-ders-kariyer-yonlendirme/) |
| 8 | 23080410020 | ŞERAFETTİN BAYAT | P11 | Akademik Makale Öneri | 🟠 Zor | [→](23080410020-P11-akademik-makale-oneri/) |
| 9 | 23080410025 | MEHMET TAHA AYHAN | P11 | Akademik Makale Öneri | 🟠 Zor | [→](23080410025-P11-akademik-makale-oneri/) |
| 10 | 23080410026 | HASAN BİNGÖL | P11 | Akademik Makale Öneri | 🟠 Zor | [→](23080410026-P11-akademik-makale-oneri/) |
| 11 | 23080410029 | AHMET KARAMAN | P16 | Tedarik Zinciri İzlenebilirlik | 🔴 Çok Zor | [→](23080410029-P16-tedarik-zinciri-izlenebilirlik/) |
| 12 | 23080410036 | ÖMER ERDEM | P24 | Multiplayer Oyun Backend (Matchmaking) | 🟡 Orta-Zor | [→](23080410036-P24-multiplayer-oyun-matchmaking/) |
| 13 | 23080410037 | HAMZA ÇAKMAKÇİ | P23 | E-Devlet Şikayet Yönetimi (CRM) | 🟡 Orta-Zor | [→](23080410037-P23-edevlet-sikayet-yonetimi/) |
| 14 | 23080410039 | BEKİR BERKAY BESLİ | P10 | Fraud Detection (Dolandırıcılık) | 🟠 Zor | [→](23080410039-P10-fraud-detection/) |
| 15 | 23080410303 | FIRAT BALİ | P13 | Kurumsal Bilgi Grafiği | 🟠 Zor | [→](23080410303-P13-kurumsal-bilgi-grafigi/) |

---

## Klasör Adı Konvansiyonu

```
{Öğrenci No 11 hane}-{Proje Kodu Pxx}-{kısa-türkçe-slug}
```

Örnek: `23080410303-P13-kurumsal-bilgi-grafigi`

Slug kuralları:
- Tamamen küçük harf
- Türkçe karakterler ASCII-leştirildi (ç→c, ş→s, ğ→g, ı→i, ö→o, ü→u)
- Boşluk → tire (`-`), özel karakter (`&`, `()`, `:`) atıldı
- Mümkün olduğunca kısa (3-5 kelime)

---

## Öğrenci için Akış

1. Kendine ait klasörü aç → `README.md` ve `PROJE-RAPORU.md` zaten kimlik bilgilerinle doldurulmuş.
2. `repo/` içine **GitHub repo'nu klonla** veya kodu doğrudan yaz.
3. `cp .env.example .env` ile env dosyanı oluştur, gerçek değerleri yaz (commit etme).
4. `docker compose up -d` ile servisleri kaldır, `/health` endpoint'iyle doğrula.
5. `README.md` ve `PROJE-RAPORU.md` içindeki `[*...*]` placeholder'larını doldur.
6. Teslim: GitHub public repo linki + bu klasördeki `PROJE-RAPORU.md`.

---

## P11 — 3 Öğrenci Ortak Seçim Notu

Şerafettin Bayat, Mehmet Taha Ayhan ve Hasan Bingöl aynı projeyi (P11 — Akademik Makale Öneri) seçmiştir. Aynı projenin birden fazla öğrenciye verilmesi kabul edilmiştir; ancak değerlendirmede **mimari yaklaşım**, **şema tasarımı**, **dataset seçimi** ve **sunum farklılığına** dikkat edilecektir. Kopyalama tespiti için kod ve mimari karşılaştırması yapılacaktır.

---

## Referanslar

- **Atama tablosu:** [PROJE-ATAMA-TABLOSU.md](../PROJE-ATAMA-TABLOSU.md)
- **Proje tanımları:** [README.md](../README.md) → P01-P25 markdown dosyaları
- **Genel kurallar:** [FINALE-PROJE-GENEL-KURALLAR.md](../../FINALE-PROJE-GENEL-KURALLAR.md)
- **NoSQL proje rehberi:** [FINALE-PROJE-NOSQL.md](../../FINALE-PROJE-NOSQL.md)
- **Production dokümantasyonu:** [FINALE-PROJE-NOSQL-PROD-DOKUMANTASYON.md](../../FINALE-PROJE-NOSQL-PROD-DOKUMANTASYON.md)

---

*Klasörler oluşturma tarihi: 2026-05-14*
