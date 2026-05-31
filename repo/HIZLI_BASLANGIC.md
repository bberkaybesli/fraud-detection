# 🎓 Hocaya Sunum - Hızlı Başlangıç

## 🚀 3 Adımda Demo Hazır!

### Adım 1: Sistemi Başlat

**Windows:**
```bash
demo-basla.bat
```

**Mac/Linux:**
```bash
chmod +x demo-basla.sh
./demo-basla.sh
```

Script otomatik olarak:
- ✅ Docker servislerini başlatır
- ✅ 60 saniye bekler (Neo4j hazır olana kadar)
- ✅ Sağlık kontrolü yapar
- ✅ Dashboard HTTP server'ını başlatır (port 8080)
- ✅ Dashboard'u tarayıcıda açar (http://localhost:8080)

**Manuel başlatma:**
```bash
# 1. Docker servisleri
docker compose up -d

# 2. 60 saniye bekle

# 3. Dashboard server
cd frontend
node server.js

# 4. Tarayıcıda aç: http://localhost:8080
```

### Adım 2: Dashboard'u Kullan

Tarayıcıda otomatik açılan dashboard'da:

1. **Sistem Durumu** - Üstteki 3 kart (Neo4j, Redis, Backend)
2. **İşlem Fraud Kontrolü** - Sol üst form
3. **Dashboard İstatistikleri** - Sağ üst buton
4. **Fraud Analizi** - Alt kısım (3 sekme)

### Adım 3: Hocaya Göster

**Demo Senaryoları:**

#### 1️⃣ Normal İşlem (✅ ONAY)
```
İşlem ID: TX-001
Gönderen: ACC-001
Alıcı: ACC-002
Tutar: 5000
```
→ Fraud Score: 15 (Düşük) → ONAYLANDI

#### 2️⃣ Ring Trading (❌ RED)
```
İşlem 1: RING-A → RING-B (50000 TL)
İşlem 2: RING-B → RING-C (50000 TL)
İşlem 3: RING-C → RING-A (50000 TL) ← DÖNGÜ!
```
→ Fraud Score: 85 (Yüksek) → REDDEDİLDİ

#### 3️⃣ Dashboard İstatistikleri
"İstatistikleri Yükle" butonuna tıkla
→ Toplam hesap, işlem, şüpheli işlem sayıları

#### 4️⃣ Fraud Analizi
- **Döngü Tespiti:** Tespit edilen ring trading kalıpları
- **Smurfing Tespiti:** Küçük parçalara bölünmüş işlemler
- **Blacklist:** Yasaklı hesaplar

---

## 📊 Ek Gösterimler

### Neo4j Browser (Görsel Graph)

1. Tarayıcıda aç: http://localhost:7474
2. Login:
   - URL: `bolt://localhost:7687`
   - Username: `neo4j`
   - Password: `password123`

3. Sorgu çalıştır:
```cypher
// İşlem grafiğini göster
MATCH (a:Account)-[r:TRANSFERRED_TO]->(b:Account)
RETURN a, r, b
LIMIT 50
```

### Redis CLI (Cache & Blacklist)

```bash
docker compose exec redis redis-cli

# Blacklist kontrolü
SMEMBERS blacklist:accounts

# Rate limit kontrolü
KEYS rate:*
```

---

## 🎯 Sunum Akışı (15 dakika)

| Süre | Konu | Gösterim |
|------|------|----------|
| 2 dk | Proje Tanıtımı | Dashboard ana sayfa |
| 1 dk | Sistem Durumu | Status kartları |
| 3 dk | Normal İşlem | Form + Sonuç |
| 3 dk | Ring Trading | 3 işlem + Red |
| 2 dk | Dashboard | İstatistikler |
| 2 dk | Fraud Analizi | 3 sekme |
| 2 dk | Neo4j Browser | Graph görsel |

---

## 💡 Önemli Noktalar

### NoSQL Kullanım Gerekçeleri

**Neo4j (Graph Database):**
- Fraud detection doğal olarak graph problemi
- Cycle detection: SQL'de saatler, Neo4j'de <500ms
- GDS algoritmaları hazır (PageRank, Louvain)

**Redis (Key-Value Store):**
- O(1) blacklist kontrolü
- INCR + EXPIRE ile rate limiting
- <5ms yanıt süresi

### Gerçek Dünya Uygulaması

- 🏛️ MASAK uyumu (Şüpheli işlem bildirimi)
- 🔒 KVKK uyumu (TC Kimlik SHA-256 hash)
- 📊 BDDK standartları (Audit logging)

---

## 🆘 Sorun Giderme

### Dashboard açılmıyor
```bash
# Backend çalışıyor mu?
curl http://localhost:3000/health

# Yeniden başlat
docker compose restart backend
```

### Neo4j bağlantı hatası
```bash
# Logları kontrol et
docker compose logs neo4j

# Yeniden başlat
docker compose restart neo4j
```

### Tüm servisleri yeniden başlat
```bash
docker compose down
docker compose up -d
```

---

## 📚 Dökümanlar

- [`README.md`](README.md) - Genel bakış
- [`SUNUM_REHBERI.md`](SUNUM_REHBERI.md) - Detaylı sunum rehberi
- [`PROJECT_SUMMARY.md`](PROJECT_SUMMARY.md) - Proje özeti
- [`QUICKSTART.md`](QUICKSTART.md) - Kurulum rehberi

---

## ✅ Sunum Checklist

**Sunum Öncesi (5 dakika):**
- [ ] `demo-basla.bat` çalıştırdım
- [ ] Dashboard açıldı
- [ ] Sistem durumu "Çalışıyor"
- [ ] Neo4j Browser login yaptım

**Sunum Sırası:**
- [ ] Dashboard tanıtımı
- [ ] Normal işlem demo
- [ ] Ring trading demo
- [ ] Dashboard istatistikleri
- [ ] Fraud analizi (3 sekme)
- [ ] Neo4j Browser (opsiyonel)
- [ ] Sorular

---

## 🎉 Başarı İpuçları

1. ✅ **Sakin ol** - Her şey hazır, sistem çalışıyor
2. ✅ **Hikaye anlat** - "Bu bir banka sistemi..."
3. ✅ **Görsel göster** - Dashboard, graph, Redis
4. ✅ **Teknik detay ver** - Cypher, Redis komutları
5. ✅ **Akademik bağla** - NoSQL seçim gerekçeleri

---

**İyi sunumlar! 🚀**

Detaylı rehber için: [`SUNUM_REHBERI.md`](SUNUM_REHBERI.md)
