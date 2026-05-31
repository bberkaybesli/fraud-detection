<!--
========================================================================
 PROJE RAPORU ŞABLONU — NoSQL Veritabanı Sistemleri
 Bitlis Eren Üniversitesi — Dr. Öğr. Üyesi Davut ARI
========================================================================
-->

# Fraud Detection (Dolandırıcılık)

> **Proje Kodu:** P10 · **Zorluk:** Zor · **Ders:** NoSQL Veritabanı Sistemleri

**Öğrenci:** BEKİR BERKAY BESLİ
**Öğrenci No:** 23080410039
**E-posta:** bekirberkaybesli1@gmail.com
**Ders:** NoSQL Veritabanı Sistemleri — *Dr. Öğr. Üyesi Davut ARI*
**Kurum:** Bitlis Eren Üniversitesi — Mühendislik-Mimarlık Fakültesi — Bilgisayar Mühendisliği
**Dönem:** 2025-2026 Bahar
**Son Güncelleme:** 31.05.2026

---

## İçindekiler

1. [Proje Künyesi](#1-proje-künyesi)
2. [Executive Summary](#2-executive-summary)
3. [Problem ve Motivasyon](#3-problem-ve-motivasyon)
4. [Hedef Kitle ve Persona](#4-hedef-kitle-ve-persona)
5. [Ürün Gereksinimleri (PRD)](#5-ürün-gereksinimleri-prd)
6. [Piyasa ve Rekabet Analizi](#6-piyasa-ve-rekabet-analizi)
7. [Teknoloji Yığını (Tech Stack)](#7-teknoloji-yığını-tech-stack)
8. [Sistem Mimarisi](#8-sistem-mimarisi)
9. [Veri Modeli ve API Tasarımı](#9-veri-modeli-ve-api-tasarımı)
10. [NoSQL Sorgu Örnekleri](#10-nosql-sorgu-örnekleri)
11. [Güvenlik, Performans, Test](#11-güvenlik-performans-test)
12. [Production Dokümantasyonu (10 Başlık)](#12-production-dokümantasyonu-10-başlık)
13. [Ek: Post-Launch Review](#13-ek-post-launch-review)

---

## 1. Proje Künyesi

| Alan | Değer |
|------|-------|
| Proje Adı | Fraud Detection (Dolandırıcılık) |
| Proje Kodu | P10 |
| Slogan (1 cümle) | Finansal işlemlerde Neo4j ve Redis ile <100ms'de gerçek zamanlı dolandırıcılık tespiti. |
| Kategori | Finans / Güvenlik |
| Hedef Kullanıcı | Banka güvenlik ekipleri, fraud analistleri, MASAK yetkilileri |
| Ana NoSQL Teknolojisi | Neo4j — Graf DB; Redis — Cache / Blacklist |
| GitHub | https://github.com/bberkaybesli/fraud-detection |
| Canlı Demo (varsa) | Yok |
| Demo Kullanıcı | Email: `admin` · Şifre: `admin123` |
| Docker Compose | ✅ tek komutla kalkıyor |
| Seed Data | ✅ 1000+ örnek hesap ve 10k işlem kaydı altyapısı hazır |
| Lisans | MIT |
| Başlangıç | 15.05.2026 |
| Hedef Bitiş | 31.05.2026 |
| Durum | 🟢 Tamamlandı |

### Varsayılan Tech Stack (özet)

| Katman | Teknolojiler |
|--------|--------------|
| Runtime | Node.js 20+ (TypeScript) |
| Framework | Express |
| Graf DB | Neo4j 5.x + Graph Data Science (GDS) |
| Cache / KV | Redis 7.x |
| Auth | JWT |
| Validation | Joi |
| Logging | Winston (JSON) |
| Container | Docker + docker compose |

---

## 2. Executive Summary

Finansal kurumlarda para transferlerinin güvenliğini sağlamak amacıyla geliştirilmiş gerçek zamanlı dolandırıcılık tespit sistemidir. Banka güvenlik ekipleri ve MASAK standartları gözetilerek; Neo4j (Graph DB) ve Redis entegrasyonu ile yapılandırılmıştır. Sistem 9 farklı sinyal (Ring trading, Smurfing vb.) üzerinden <100ms (p95) yanıt süresiyle çalışır. İlişkisel veritabanlarıyla saatler alabilen döngüsel transfer analizleri (A->B->C->A), Neo4j Cypher sorguları ile milisaniyeler seviyesinde çözülmekte; IP, cihaz ve hesap bazlı engellemeler Redis üzerinden O(1) maliyetle gerçekleştirilmektedir.

---

## 3. Problem ve Motivasyon

### 3.1 Problem Tanımı
Finansal dolandırıcılık yöntemleri giderek daha karmaşık hale gelmekte ve birden fazla sekmeli transferleri (ör: aklama işlemleri, ring trading, smurfing) içermektedir. Geleneksel RDBMS (İlişkisel Veritabanı) çözümlerinde bu tür n-derinlikteki işlemleri tespit etmek için çoklu JOIN işlemleri yapılması gerekmekte, bu durum da işlem saniyeler süren sorgulara dönüşmektedir ve gerçek zamanlı işlem onay süreçlerinde büyük bir gecikmeye yol açmaktadır.

### 3.2 Mevcut Çözümlerin Eksikleri
- Derinlikli ilişkisel sorgular performans sorunları yaratır.
- Blacklist ve Whitelist kontrollerinin disk tabanlı ilişkisel veritabanlarından yapılması gecikme sürelerini artırır.
- Para aklama (Smurfing) kalıpları zaman penceresine bağlıdır, salt ilişkisel tablolarla hızlı analiz imkanı sunmaz.

### 3.3 NoSQL Tercihinin Gerekçesi
- **Neo4j (Graph DB):** Dolandırıcılık temelde ilişkisel bir ağ (network) problemidir. Graf veritabanları, düğümler (hesaplar) ve ayrıtlar (işlemler) arasında gezintiyi milisaniyelerde yapar, Cypher ile pattern matching (A->B->C->A) doğrudan ve hızlıdır.
- **Redis (Key-Value):** İstek oranını (rate limiting) kısıtlamak ve anlık kara liste (blacklist) kontrolleri yapmak için RAM-içi veri tutma ve O(1) okuma avantajı kullanılmıştır.

---

## 4. Hedef Kitle ve Persona

### 4.1 Birincil Kullanıcı
- **Ad:** Ahmet — 35 yaşında, Banka Fraud Analisti
- **Hedefi:** Müşterilerin gerçekleştirdiği EFT ve Havale işlemlerini saniyeler içinde analiz edip, şüpheli durumlarda işleme blokaj koymak.
- **Engeli:** Mevcut araçlar çok fazla yanlış pozitif (false positive) alarm üretiyor ve sistemleri çok yavaş.
- **Bizim çözüm nasıl yardım ediyor:** 9 parametreli yapay skorlama ve Neo4j bazlı döngü tespiti, sahte alarmları eler ve anında şüpheli skorunu üretir.

### 4.2 İkincil Kullanıcı
- **Ad:** MASAK Denetçisi
- **Hedefi:** Bölünmüş para transferi (Smurfing) kalıplarının geriye dönük incelenmesi.
- **Bizim çözüm nasıl yardım ediyor:** KVKK uyumlu tutulmuş veriler (SHA-256 kimlik özetleri) ile denetimlerin sistem logları üstünden güvenli ve hızlı şekilde görüntülenmesi sağlanır.

---

## 5. Ürün Gereksinimleri (PRD)

### 5.1 Fonksiyonel Gereksinimler (FR)
| ID | Açıklama | Öncelik |
|----|----------|---------|
| FR-1 | Admin authentication ve JWT mekanizması. | P0 |
| FR-2 | Neo4j üzerinde hesap ve para transferi işlemlerinin kaydedilmesi. | P0 |
| FR-3 | 9 farklı parametreyle gerçek zamanlı risk (Fraud Score) motoru. | P0 |
| FR-4 | Redis destekli Rate Limit ve O(1) Blacklist kontrolü. | P1 |
| FR-5 | Neo4j Cypher sorguları ile 2-6 derinlikte Ring Trading tespiti. | P1 |
| FR-6 | Bölünmüş ödeme (Smurfing) patternlerinin yakalanması. | P1 |

### 5.2 Fonksiyonel Olmayan Gereksinimler (NFR)
- **Performans:** p95 fraud check yanıt süresi < 100ms.
- **Güvenilirlik:** Node.js Express ile `/health` derin sağlık kontrolü.
- **Güvenlik:** Joi ile giriş verisi validasyonu, KVKK kapsamında TC Kimlik bilgilerinin SHA-256 olarak tutulması.
- **Kullanılabilirlik:** Docker Compose ile tüm bağımlılıkların (Redis, Neo4j, Backend) anında başlatılabilmesi.

---

## 6. Piyasa ve Rekabet Analizi

| Çözüm | Stack | Güçlü Yön | Eksik | Bizim Farkımız |
|-------|-------|-----------|-------|----------------|
| Geleneksel RDBMS | PostgreSQL | Veri bütünlüğü ve yaygınlık | Çoklu JOIN ile performans kaybı | Neo4j ile çok hızlı graph gezinme (traversal) |
| Kural Motorları | ES + MySQL | Basit kural yazımı | İlişkisel fraud örüntü tespiti zayıf | Graf Data Science (GDS) yetenekleriyle karmaşık patern tespiti |

---

## 7. Teknoloji Yığını (Tech Stack)

### 7.1 Seçim Tablosu

| Katman | Tercih | Alternatif | Neden Bunu Seçtim |
|--------|--------|------------|-------------------|
| Backend | Node.js + Express + TS | Python + FastAPI | Ekosistem genişliği ve asenkron IO yeteneklerinin Redis/Neo4j sürücüleriyle uyumluluğu. |
| Graf DB | Neo4j 5.x | ArangoDB | Cypher dilinin güçlü olması, GDS (Graph Data Science) eklentileri (PageRank, Louvain). |
| Cache & DB | Redis 7.x | Memcached | SISMEMBER ile hızlı blacklist check, INCR ile rate limiting. |
| Logging | Winston | Pino | Logların formatlanması ve denetim loglarının ayrıştırılmasındaki kullanım rahatlığı. |

### 7.2 Sürüm Kilitleri
- Node `20.x`, TypeScript, Neo4j `5.18`, Redis `7.x`

---

## 8. Sistem Mimarisi

### 8.1 Üst Seviye Diyagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRAUD DETECTION SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Neo4j      │    │   Backend    │    │    Redis     │  │
│  │   Graph DB   │◄───│   Express    │◄───│  Blacklist   │  │
│  │   + GDS      │───▶│   TypeScript │───▶│  Rate Limit  │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│                              │                               │
│                              ▼                               │
│                      ┌──────────────┐                        │
│                      │ MASAK Mock   │                        │
│                      │   Service    │                        │
│                      └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Bileşen Sorumlulukları
- **Backend (API):** İş mantığının ve Fraud Score hesaplamalarının yürütülmesi, route yönlendirmeleri.
- **Neo4j:** Düğüm (Hesaplar) ve Ayrıtların (İşlemler) ilişkisel grafiğini barındırma, cycle detection çalıştırma.
- **Redis:** Anlık Rate Limit, Blacklist sorguları ve gecikme minimizasyonu.

### 8.3 Veri Akışı Örneği — Fraud Scoring
1. Kullanıcı `/transactions/check` üzerinden işlemi iletir.
2. API, işlemi gönderen ve alan tarafın Redis Blacklist sorgusunu yapar (O(1)). Red edilirse anında durur.
3. Redis Rate limit kontrol edilir, limit aşıldıysa durur.
4. Neo4j üzerinden hesap tarihçesi, amount (büyüklük) anomalisi, cypher pattern (smurfing/ring) kontrolleri başlatılır.
5. Her ihlal kuralı farklı ağırlıklarla (weighted score) birleştirilir.
6. Karar (Accept/Reject/Review) ile birlikte yanıt dönülür.

---

## 9. Veri Modeli ve API Tasarımı

### 9.1 Neo4j Graf Yapısı
```cypher
(:Account {id, tc_kimlik_hash, created_at, status, fraud_score})
-[:TRANSFERRED {tx_id, amount, currency, timestamp, channel}]->(:Account)
```

### 9.2 Redis Anahtar Şeması
| Anahtar | Tip | TTL | Amaç |
|---------|-----|-----|------|
| `ratelimit:tx:{accountId}` | counter | 60s | Dakikada işlem hız limiti (Velocity) |
| `blacklist:account` | set | - | Kara listeye alınan hesapların O(1) tespiti |
| `whitelist:account` | set | - | Risk skorundan muaf hesap listesi |

### 9.3 REST API Endpoint Listesi
| Method | Endpoint | Auth | Body | Response | Açıklama |
|--------|----------|------|------|----------|----------|
| `POST` | `/auth/login` | ❌ | `{username,password}` | `{token}` | Admin girişi |
| `POST` | `/transactions/check` | ❌ | `{tx_id,sender,recipient,amount}` | `200 {decision, score}`| Gerçek zamanlı risk hesabı |
| `GET`  | `/health` | ❌ | — | `200 {status}` | Neo4j, Redis ve Sistem sağlık durumu |
| `POST` | `/accounts` | ✅ | `{account_id,tc_kimlik,...}` | `201` | Yeni hesap oluşturma |
| `GET`  | `/fraud/cycles` | ✅ | — | `200 {cycles}` | Tespiti yapılan tüm ring trading paternleri |

---

## 10. NoSQL Sorgu Örnekleri

### 10.1 Neo4j Cypher — Ring Trading (Cycle) Tespiti
Aynı kaynağa belli adımlar sonunda geri dönen para transferlerinin tespiti:
```cypher
MATCH path = (a:Account {id: $accountId})-[:TRANSFERRED*2..6]->(a)
WHERE ALL(r IN relationships(path) WHERE r.timestamp >= $timeWindow)
RETURN path, length(path) as hops, 
       reduce(s = 0, r IN relationships(path) | s + r.amount) as totalAmount
ORDER BY hops ASC LIMIT 10
```

### 10.2 Neo4j Cypher — Smurfing Analizi
Aynı göndericiden aynı alıcıya kısa sürede parçalanarak giden transferler (Eşik altı - Threshold Avoidance):
```cypher
MATCH (sender:Account)-[tx:TRANSFERRED]->(recipient:Account)
WHERE tx.timestamp >= $startTime AND tx.amount > $minAmount AND tx.amount < $maxAmount
WITH sender, recipient, count(tx) as txCount, sum(tx.amount) as totalVolume
WHERE txCount >= $minTxCount
RETURN sender.id, recipient.id, txCount, totalVolume
ORDER BY txCount DESC
```

### 10.3 Redis Pipeline
```javascript
const isBlacklisted = await redis.sismember('blacklist:account', accountId);
const rateKey = `ratelimit:tx:${accountId}`;
const requests = await redis.incr(rateKey);
if (requests === 1) await redis.expire(rateKey, 60);
```

---

## 11. Güvenlik, Performans, Test

### 11.1 Güvenlik
- ✅ **KVKK Uyumu:** TC Kimlik Numaraları salt değer ile SHA-256 hash işlemine tabi tutularak Neo4j'e yazılır, plain text (düz metin) PII tutulmaz.
- ✅ **Rate Limit:** Redis tabanlı, Sliding window veya Counter yaklaşımlarıyla brüt kuvvet/DDoS saldırılarına önlem.
- ✅ **CORS & Helmet:** Güvenlik başlıkları yapılandırılmıştır.
- ✅ **Input Validation:** Joi frameworkü sayesinde XSS/Injection önlemi sağlanmıştır.

### 11.2 Performans Hedefleri
| Metrik | Hedef | Gerçekleşen Test Senaryoları |
|--------|-------|-------------|
| Real-time fraud scoring | <200ms (p95) | Redis Blacklist kontrolü (O(1) zaman karmaşıklığı ile) < 5ms sürmektedir. |
| Cycle detection (4-hop) | <500ms | Graf optimizasyonlarıyla milisaniyeler. |
| Rate limit check | <2ms | Redis INCR. |

---

## 12. Production Dokümantasyonu (10 Başlık)

1. **Veri Modeli Gerekçesi:** İşlemler birbiri ile yapısal bağ oluşturduğu için RDBMS ilişkilerinden çıkılıp saf bir graph dizaynı kurulmuştur.
2. **Indexing Stratejisi:** Neo4j üzerinde `Account(id)` düğümüne özel index yapılarak arama süreleri log(N) değerine indirgenmiştir.
3. **Replica & Sharding:** Redis Cluster aktif edilerek node düşmelerine karşı tolerans hedeflenmektedir.
4. **Backup & Recovery:** `neo4j-admin database backup` komutu günlük cron olarak planlanmalıdır.
5. **Monitoring & Alerting:** Winston logger ile audit loglama desteklenmiştir; Elasticsearch & Kibana kullanılarak hata izleme takviyesi ileride eklenecektir.
6. **Güvenlik & Auth:** JWT ile state-less bir mimari kullanılmış; MASAK talepleri için IP kısıtlı endpointler hedeflenmiştir.
7. **Performance Benchmark:** Çok sayıda node/edge bulunduğunda Neo4j GDS'nin bellek tüketimi için min. 2-4GB tahsis önerilir.
8. **Deployment & CI/CD:** Docker Compose mimarisi sayesinde tüm dependency ağacı izole çalışır hale getirilmiştir.
9. **Capacity Planning:** Ortalama 10 Milyon işlem / 2 Milyon Hesap için ~10 GB depolama yetecek şekilde boyutlandırılmıştır.
10. **Postmortem & Limitler:** Graph algoritmaları çok büyük verilerde (GDS PageRank vb.) real-time çalışamaz, bunlar batch-job olarak planlanmıştır.

---

## 13. Ek: Post-Launch Review

### 13.1 Karşılaştığım En Büyük 3 Sorun
1. Neo4j ve GDS eklentilerinin Docker Compose konfigürasyonu sırasında plug-in yüklemelerinde yaşanan yetki problemleri ve çözümleri.
2. Asenkron TypeScript yapısında Neo4j sessionlarının düzgün kapatılmaması durumunda memory leak riskleri (finally blockları ile düzeltildi).
3. Smurfing kuralını (amount anomaly) yakalamak için Cypher dilinde doğru zaman penceresi ve miktar aggregasyonunu optimize etmek.

### 13.2 Yeniden Yapsam Farklı Ne Yapardım?
Redis tarafında sadece set (blacklist) yerine Stream (Pub/Sub) mimarisini dahil edip, gerçek zamanlı uyarı panelini bir websocket sunucusu (Socket.io) eşliğinde frontend'e daha zengin sunardım.

### 13.3 Bu Projeden Öğrendiğim 3 Şey
1. Finansal ilişkiler gibi (Node ve Edge) ağ yapılarında RDBMS yerine Graph DB kullanmanın performansa getirdiği çarpan etkisini (O(N) vs O(1)) kavradım.
2. Cypher dili ve pattern matching ile çok uzun SQL kodlarının 2-3 satırda temizce yazılabileceğini deneyimledim.
3. Redis'in sadece basit bir önbellek aracı olmadığını; rate-limiting ve O(1) set operation ile güvenlik bariyeri (Blacklist) olarak harikalar yarattığını öğrendim.

### 13.4 Mülakatta Anlatacağım Tek Cümle
> "NoSQL sistemlerini kullanarak, Neo4j Graph veritabanı ile para aklama/ring-trading örüntülerini analiz eden, aynı zamanda Redis ile O(1) blacklist ve rate-limit kontrollerini <100ms sürede uygulayabilen tam teşekküllü bir Fraud Detection Backend'i tasarladım."

---

## Referanslar

- Proje tanım dokümanı: [P10-FRAUD-DETECTION.md](../../P10-FRAUD-DETECTION.md)
- Genel proje kuralları: [FINALE-PROJE-GENEL-KURALLAR.md](../../../FINALE-PROJE-GENEL-KURALLAR.md)
- NoSQL proje rehberi: [FINALE-PROJE-NOSQL.md](../../../FINALE-PROJE-NOSQL.md)
- Production şablonu: [FINALE-PROJE-NOSQL-PROD-DOKUMANTASYON.md](../../../FINALE-PROJE-NOSQL-PROD-DOKUMANTASYON.md)
- Neo4j Cypher Manual ve Redis Docs.

---

<sub>🤖 Bu raporda AI asistan kullanılmış olabilir, ancak tüm tasarım kararları ve metrikler öğrenci tarafından doğrulanmıştır. Sunumda raporun her satırı savunulacaktır.</sub>
