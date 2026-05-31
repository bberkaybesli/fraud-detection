# 🚀 Hızlı Başlangıç Kılavuzu

## Ön Gereksinimler

- Docker Desktop (Windows/Mac) veya Docker + Docker Compose (Linux)
- Git
- 8GB+ RAM (Neo4j GDS için)
- 10GB+ disk alanı

## 1. Projeyi İndirin

```bash
# GitHub'dan klonlayın (repo oluşturulduktan sonra)
git clone https://github.com/[username]/fraud-detection.git
cd fraud-detection
```

## 2. Environment Ayarları

```bash
# .env dosyasını oluşturun
cp .env.example .env

# Windows için:
copy .env.example .env
```

**ÖNEMLİ:** Production'da mutlaka değiştirin:
- `JWT_SECRET` - En az 32 karakter
- `ADMIN_PASSWORD` - Güçlü şifre

## 3. Servisleri Başlatın

```bash
# Tüm servisleri arka planda başlat
docker compose up -d

# Logları izleyin
docker compose logs -f

# Sadece backend logları
docker compose logs -f backend
```

**İlk başlatma 60-90 saniye sürebilir** (Neo4j GDS plugin yükleme)

## 4. Sağlık Kontrolü

```bash
# Health endpoint
curl http://localhost:3000/health

# Beklenen yanıt:
{
  "success": true,
  "data": {
    "status": "healthy",
    "neo4j": "up",
    "redis": "up",
    "timestamp": "2026-05-20T17:35:00.000Z"
  }
}
```

## 5. Admin Girişi

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Token alın ve kaydedin
export TOKEN="eyJhbGc..."
```

## 6. Seed Data Yükleyin

```bash
# 1000 hesap + 10k işlem + test kalıpları
docker compose exec backend npm run seed

# Veya container içinde:
docker compose exec backend sh
npm run seed
exit
```

## 7. Test Senaryoları

### Senaryo 1: Normal İşlem (Kabul Edilir)

```bash
curl -X POST http://localhost:3000/transactions/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tx_id": "TX-001",
    "sender": "ACC-001",
    "recipient": "ACC-002",
    "amount": 5000
  }'
```

### Senaryo 2: Ring Trading (Reddedilir)

```bash
# A → B
curl -X POST http://localhost:3000/transactions/check \
  -H "Content-Type: application/json" \
  -d '{"tx_id":"TX-R1","sender":"A","recipient":"B","amount":50000}'

# B → C
curl -X POST http://localhost:3000/transactions/check \
  -H "Content-Type: application/json" \
  -d '{"tx_id":"TX-R2","sender":"B","recipient":"C","amount":50000}'

# C → A (DÖNGÜ! Reddedilir)
curl -X POST http://localhost:3000/transactions/check \
  -H "Content-Type: application/json" \
  -d '{"tx_id":"TX-R3","sender":"C","recipient":"A","amount":50000}'
```

### Senaryo 3: Smurfing (Reddedilir)

```bash
# 25 küçük işlem (her biri 9,950 TL)
for i in {1..25}; do
  curl -X POST http://localhost:3000/transactions/check \
    -H "Content-Type: application/json" \
    -d "{\"tx_id\":\"TX-S$i\",\"sender\":\"SMURF-1\",\"recipient\":\"M$i\",\"amount\":9950}"
done
```

## 8. Fraud Analizi

```bash
# Tüm döngüleri listele
curl http://localhost:3000/fraud/cycles \
  -H "Authorization: Bearer $TOKEN"

# Smurfing adayları
curl http://localhost:3000/fraud/smurfing \
  -H "Authorization: Bearer $TOKEN"

# Dashboard istatistikleri
curl http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

## 9. Batch İşlemler

```bash
# PageRank çalıştır
curl -X POST http://localhost:3000/admin/batch/pagerank \
  -H "Authorization: Bearer $TOKEN"

# Louvain community detection
curl -X POST http://localhost:3000/admin/batch/louvain \
  -H "Authorization: Bearer $TOKEN"
```

## 10. Neo4j Browser

Neo4j'yi görsel olarak keşfedin:

1. Tarayıcıda açın: http://localhost:7474
2. Giriş yapın:
   - URL: `bolt://localhost:7687`
   - Username: `neo4j`
   - Password: `password123`

### Örnek Cypher Sorguları

```cypher
// Tüm hesapları göster
MATCH (a:Account)
RETURN a
LIMIT 25

// İşlem grafiğini göster
MATCH (a:Account)-[r:TRANSFERRED_TO]->(b:Account)
RETURN a, r, b
LIMIT 50

// Döngüleri bul
MATCH path = (a:Account)-[:TRANSFERRED_TO*3..4]->(a)
RETURN path
LIMIT 10

// En yüksek fraud score
MATCH (a:Account)
WHERE a.fraud_score > 50
RETURN a.account_id, a.fraud_score, a.risk_category
ORDER BY a.fraud_score DESC
LIMIT 10
```

## 11. Redis CLI

Redis'i kontrol edin:

```bash
# Redis container'a bağlan
docker compose exec redis redis-cli

# Blacklist kontrolü
SMEMBERS blacklist:accounts

# Rate limit kontrolü
GET rate:tx:ACC-001

# Fraud score cache
GET fraud:score:ACC-001

# MASAK kuyruğu
LLEN masak:queue
LRANGE masak:queue 0 -1
```

## 12. Logları İzleyin

```bash
# Tüm loglar
docker compose logs -f

# Sadece backend
docker compose logs -f backend

# Sadece Neo4j
docker compose logs -f neo4j

# Son 100 satır
docker compose logs --tail=100 backend
```

## 13. Servisleri Durdurun

```bash
# Servisleri durdur (data kalır)
docker compose stop

# Servisleri durdur ve sil (data kalır)
docker compose down

# Servisleri durdur, sil ve data'yı temizle
docker compose down -v
```

## 🐛 Sorun Giderme

### Neo4j başlamıyor

```bash
# Logları kontrol et
docker compose logs neo4j

# Heap memory artır (docker-compose.yml)
NEO4J_dbms_memory_heap_max__size=4G
```

### Redis bağlantı hatası

```bash
# Redis çalışıyor mu?
docker compose ps redis

# Yeniden başlat
docker compose restart redis
```

### Backend başlamıyor

```bash
# Dependencies yüklü mü?
docker compose exec backend npm install

# TypeScript build
docker compose exec backend npm run build

# Yeniden başlat
docker compose restart backend
```

### Port çakışması

```bash
# Kullanılan portları kontrol et
netstat -ano | findstr :3000
netstat -ano | findstr :7474
netstat -ano | findstr :6379

# docker-compose.yml'de portları değiştir
ports:
  - "3001:3000"  # 3000 yerine 3001
```

## 📊 Performans İpuçları

1. **Neo4j Heap:** Minimum 2GB, önerilen 4GB
2. **Redis Memory:** 512MB yeterli, 1GB optimal
3. **Docker Resources:** Minimum 4GB RAM, önerilen 8GB
4. **SSD:** Neo4j için SSD kullanın

## 🔒 Güvenlik Notları

1. **Production'da değiştirin:**
   - JWT_SECRET
   - ADMIN_PASSWORD
   - Neo4j password
   - Redis password ekleyin

2. **HTTPS kullanın** (production)
3. **Firewall kuralları** ayarlayın
4. **Rate limiting** aktif tutun
5. **Audit logları** düzenli yedekleyin

## 📚 Daha Fazla Bilgi

- [README.md](README.md) - Genel bakış
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Detaylı proje özeti
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - İlerleme durumu
- `docs/` - Detaylı dokümantasyon (oluşturulacak)

## 🆘 Yardım

Sorun yaşıyorsanız:

1. Logları kontrol edin: `docker compose logs`
2. Health endpoint'i test edin: `curl http://localhost:3000/health`
3. Neo4j browser'ı açın: http://localhost:7474
4. Redis CLI'yi kullanın: `docker compose exec redis redis-cli`

---

**İyi çalışmalar! 🚀**
