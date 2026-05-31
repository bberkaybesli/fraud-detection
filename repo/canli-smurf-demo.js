const http = require('http');

// Sunum sirasinda anlik smurfing gostermek icin hazirlanmis betik
const SENDER_ACCOUNT = 'ACC-DEMO-SMURF';
const AMOUNT = 9900; // 10.000 TL (Eşik) altinda
const TRANSACTION_COUNT = 15; // En az 10 olmasi gerekiyor

function sendTransaction(i) {
    return new Promise((resolve, reject) => {
        const recipient = `ACC-ALICI-${String(i).padStart(3, '0')}`;
        const postData = JSON.stringify({
            tx_id: `DEMO-SMURF-TX-${i}`,
            sender: SENDER_ACCOUNT,
            recipient: recipient,
            amount: AMOUNT,
            currency: 'TRY',
            channel: 'FAST'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/transactions/check',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'x-api-key': 'bank-api-key-12345'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData.success) {
                        console.log(`[Islem ${i}/${TRANSACTION_COUNT}] ${AMOUNT} TL gonderildi -> Skor: ${parsedData.data.fraud_score} (${parsedData.data.decision})`);
                    } else {
                        console.log(`[Islem ${i}/${TRANSACTION_COUNT}] HATA -> ${JSON.stringify(parsedData.error)}`);
                    }
                    resolve();
                } catch (e) {
                    console.error(`Cevap islenirken hata (${i}). Raw Response: ${data}`);
                    resolve();
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Istek hatasi (${i}):`, e.message);
            resolve(); // Hata da olsa digerlerine gecsin
        });

        req.write(postData);
        req.end();
    });
}

async function runLiveSmurfingDemo() {
    console.log(`🚀 Hoca icin canli Smurfing demosu basliyor...`);
    console.log(`Hedef Hesap: ${SENDER_ACCOUNT}`);
    console.log(`Islem Tutari: ${AMOUNT} TL (Eşik alti)`);
    console.log(`Toplam Islem: ${TRANSACTION_COUNT} adet\n`);

    for (let i = 1; i <= TRANSACTION_COUNT; i++) {
        await sendTransaction(i);
        // İslemler arasinda 100ms bekleyelim ki gercekci bir bot gibi gorunsun
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Canli Smurfing saldirisi tamamlandi!`);
    console.log(`Sisteme toplam ${TRANSACTION_COUNT * AMOUNT} TL para sokuldu.`);
    console.log(`Lutfen simdi Dashboard'a gidip "Smurfing Yukle" butonuna basin.`);
    console.log(`Listede ${SENDER_ACCOUNT} hesabini goreceksiniz.`);
}

runLiveSmurfingDemo();
