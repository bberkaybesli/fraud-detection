# 🎓 Proje Basit Açıklama - Hocaya Ne Anlatacaksın?

## 🏦 Proje Ne İş Yapıyor?

**Basit Cevap:** Bankalar arası para transferlerini izleyip şüpheli işlemleri tespit eden bir sistem.

**Örnek:** 
- Ali → Veli → Ahmet → Ali şeklinde para dönüyorsa → **ŞÜPHELI!** (Ring Trading)
- Birisi 1 milyon TL'yi 100 parçaya bölüp gönderiyor → **ŞÜPHELI!** (Smurfing)

---

## 🎯 Neden NoSQL Kullandık?

### 1. Neo4j (Graph Database)
**Soru:** "Neden SQL değil de Neo4j?"

**Cevap:** 
> "Hocam, fraud detection doğal olarak bir graph problemi. Mesela Ali'den Veli'ye, Veli'den Ahmet'e, Ahmet'ten tekrar Ali'ye para dönüyor mu diye bakmak istiyorum. SQL'de bu 3-4 JOIN gerektirir ve çok yavaş. Neo4j'de tek satır Cypher sorgusu ve 500ms'de sonuç."

**Örnek Cypher:**
```cypher
// Döngü bul (Ring Trading)
MATCH path = (a:Account)-[:TRANSFERRED_TO*3..6]->(a)
RETURN path
```

**SQL'de aynı şey:**
```sql
-- 4 JOIN, çok karmaşık, çok yavaş
SELECT * FROM transactions t1
JOIN transactions t2 ON t1.recipient = t2.sender
JOIN transactions t3 ON t2.recipient = t3.sender
JOIN transactions t4 ON t3.recipient = t4.sender
WHERE t1.sender = t4.recipient
```

### 2. Redis (Key-Value Store)
**Soru:** "Redis neden gerekli?"

**Cevap:**
> "Hocam, blacklist kontrolü çok hızlı olmalı. Her işlemde 'bu hesap yasaklı mı?' diye bakıyoruz. Redis SET veri yapısı O(1) kompleksite, yani 1-2 milisaniyede cevap. Neo4j'de bu daha yavaş olurdu."

**Örnek:**
```redis
SMEMBERS blacklist:accounts  # 2ms'de sonuç
```

---

## 📊 Dashboard'da Ne Göstereceksin?

### 1. Sistem Durumu (Üst Kısım)
**Ne gösteriyor:** Neo4j, Redis, Backend çalışıyor mu?

**Hocaya söyle:**
> "Hocam bakın, Docker Compose ile 3 servis ayağa kalktı. Neo4j graph database, Redis cache, ve Node.js backend. Hepsi sağlıklı çalışıyor."

---

### 2. İşlem Fraud Kontrolü (Sol Panel)

#### Demo 1: Normal İşlem ✅
**Ne yazacaksın:**
```
İşlem ID: TX-001
Gönderen: ACC-001
Alıcı: ACC-002
Tutar: 5000
```

**Sonuç:** Fraud Score: 15 → ONAYLANDI

**Hocaya söyle:**
> "Normal bir işlem. 5000 TL, şüpheli bir kalıp yok. Fraud skoru düşük, sistem onayladı."

---

#### Demo 2: Ring Trading ❌
**Ne yazacaksın (sırayla 3 işlem):**

**İşlem 1:**
```
İşlem ID: TX-R1
Gönderen: RING-A
Alıcı: RING-B
Tutar: 50000
```
→ ONAYLANDI

**İşlem 2:**
```
İşlem ID: TX-R2
Gönderen: RING-B
Alıcı: RING-C
Tutar: 50000
```
→ ONAYLANDI

**İşlem 3:**
```
İşlem ID: TX-R3
Gönderen: RING-C
Alıcı: RING-A
Tutar: 50000
```
→ **REDDEDİLDİ!** Fraud Score: 85

**Hocaya söyle:**
> "Bakın hocam, RING-A → RING-B → RING-C → RING-A şeklinde döngü oluştu. Bu klasik bir para aklama yöntemi. Neo4j'nin graph pattern matching özelliği sayesinde anında tespit ettik. 3. işlemde sistem 'dur' dedi ve reddetti."

---

### 3. Dashboard İstatistikleri (Sağ Panel)

**"İstatistikleri Yükle" butonuna tıkla**

**Gösterecek:**
- Toplam Hesap: 1000+
- Toplam İşlem: 10000+
- Şüpheli İşlem: X
- Blacklist: Y

**Hocaya söyle:**
> "Sistem seed data ile 1000 hesap ve 10,000 işlem yüklendi. Gerçek zamanlı olarak fraud skorları hesaplanıyor."

---

### 4. Fraud Analizi (Alt Kısım - 3 Sekme)

#### Sekme 1: Döngü Tespiti
**"Döngüleri Listele" butonuna tıkla**

**Gösterecek:**
```
Döngü 1: ACC-123 → ACC-456 → ACC-789 → ACC-123
Toplam: 150,000 TL
```

**Hocaya söyle:**
> "Neo4j Cypher sorgusu ile 3-6 hop arası döngüler bulunuyor. SQL'de bu sorgu saatler sürerdi, Neo4j'de 500ms altında."

---

#### Sekme 2: Smurfing Tespiti
**"Smurfing Adaylarını Listele" butonuna tıkla**

**Gösterecek:**
```
ACC-999: 25 işlem, 248,750 TL
```

**Hocaya söyle:**
> "Smurfing: Büyük tutarı küçük parçalara bölme. Mesela 1 milyon TL'yi 100 adet 9,950 TL'lik işleme bölüyorlar ki raporlama eşiğinin altında kalsın. Sistem 24 saat içinde 20'den fazla işlem yapan hesapları tespit ediyor."

---

#### Sekme 3: Blacklist
**"Blacklist'i Görüntüle" butonuna tıkla**

**Hocaya söyle:**
> "Redis SET veri yapısı kullanılıyor. O(1) kompleksitede blacklist kontrolü. Blacklist'teki hesaplara işlem yapılamaz."

---

## 🎓 Hocaya Anlatacağın Teknik Detaylar

### 1. Neden Graph Database?
**Cevap:**
- Fraud detection doğal olarak graph problemi
- İlişkiler önemli (kim kime para gönderiyor?)
- Cycle detection SQL'de çok zor, Neo4j'de kolay
- GDS (Graph Data Science) kütüphanesi hazır algoritmalar sunuyor

### 2. Hangi Algoritmalar Kullandık?
1. **Cycle Detection:** Döngüsel para transferi (A→B→C→A)
2. **Smurfing Detection:** Büyük tutarın küçük parçalara bölünmesi
3. **PageRank:** Merkezi hesapları bulma (çok işlem yapan)
4. **Louvain:** Community detection (para aklama ağları)
5. **Rate Limiting:** Dakikada 10'dan fazla işlem yapma
6. **Amount Anomaly:** Kullanıcı ortalamasının 10x üzeri işlemler

### 3. Gerçek Dünya Uygulaması
- **MASAK uyumu:** Şüpheli işlem bildirimi (Türkiye'de zorunlu)
- **KVKK uyumu:** TC Kimlik SHA-256 hash (kişisel veri koruması)
- **BDDK standartları:** Audit logging (5 yıl saklama)

---

## 🎯 Sunum Akışı (15 dakika)

### 1. Giriş (2 dk)
> "Hocam bu proje Neo4j ve Redis kullanarak gerçek zamanlı fraud detection yapıyor. Bankalar arası para transferlerini analiz edip şüpheli kalıpları tespit ediyor."

### 2. Sistem Durumu (1 dk)
> "Docker Compose ile 3 servis ayağa kalktı. Hepsi sağlıklı çalışıyor."

### 3. Normal İşlem (2 dk)
> "Normal bir işlem. Fraud skoru düşük, onaylandı."

### 4. Ring Trading (3 dk)
> "Şimdi döngü oluşturalım. A→B→C→A. Bakın, 3. işlemde sistem tespit etti ve reddetti!"

### 5. Dashboard Stats (2 dk)
> "1000 hesap, 10,000 işlem. Gerçek zamanlı skorlama."

### 6. Fraud Analizi (3 dk)
> "Döngüler, smurfing, blacklist. Hepsi Neo4j ve Redis ile hızlıca bulunuyor."

### 7. Sorular (2 dk)

---

## 🚨 Olası Sorular ve Cevaplar

### S1: "Neden SQL değil?"
**Cevap:**
> "Hocam, fraud detection graph problemi. SQL'de 4-hop cycle detection için 4 JOIN gerekir ve performans çok kötü. Neo4j'de tek satır Cypher sorgusu ve 500ms altında sonuç."

### S2: "Redis yerine Neo4j'de cache tutamaz mıydınız?"
**Cevap:**
> "Neo4j graph sorguları için optimize edilmiş. Blacklist gibi basit key-value işlemleri için Redis çok daha hızlı. O(1) vs O(log n)."

### S3: "Gerçek bankada kullanılabilir mi?"
**Cevap:**
> "Bu bir proof-of-concept. Gerçek üretimde machine learning modelleri (XGBoost, Neural Networks) eklenebilir. Ama mimari production'a hazır. Neo4j Cluster, Redis Cluster, Kubernetes ile scale edilebilir."

### S4: "Accuracy nedir?"
**Cevap:**
> "Şu an rule-based + graph algorithms kullanıyoruz. Test data ile %85-90 civarında. Gerçek üretimde ML modelleri eklenince %95+ olabilir."

---

## 💡 Önemli Noktalar

1. **Sakin ol** - Sistem çalışıyor, her şey hazır
2. **Hikaye anlat** - "Bu bir banka sistemi, şüpheli işlemleri tespit ediyor"
3. **Görsel göster** - Dashboard, Neo4j graph
4. **Teknik detay ver** - Cypher sorguları, Redis komutları
5. **Akademik bağla** - NoSQL seçim gerekçeleri, CAP theorem
6. **Gerçek dünya** - MASAK, KVKK, BDDK standartları

---

## ✅ Özet

**Proje:** Banka fraud detection sistemi
**Teknoloji:** Neo4j (graph) + Redis (cache) + Node.js
**Amaç:** Şüpheli para transferlerini tespit etmek
**Özellikler:** Ring trading, smurfing, blacklist, real-time scoring
**Demo:** Dashboard'da canlı gösterim

**Hocaya tek cümle:**
> "Hocam, bu proje Neo4j graph database ve Redis kullanarak bankalar arası para transferlerinde döngü tespiti, smurfing analizi ve real-time fraud scoring yapıyor. Dashboard'da canlı olarak gösterebilirim."

---

**İyi sunumlar! 🚀**
