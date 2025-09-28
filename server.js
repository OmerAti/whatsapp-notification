/*
|--------------------------------------------------------------------------
| WhatsApp Bildirim Modülü / WhatsApp Notification Module
|--------------------------------------------------------------------------
| TR:
| Bu modül, PHP projelerine kolayca entegre edilebilen Node.js tabanlı 
| bir WhatsApp bildirim sistemidir. Kullanıcılarınıza otomatik olarak 
| bilgilendirme, uyarı veya onay mesajları gönderebilirsiniz.
|
| EN:
| This module is a Node.js-based WhatsApp notification system 
| that can be easily integrated into PHP projects. 
| It allows you to automatically send notifications, alerts, 
| or confirmation messages to your users.
|
| Geliştirici / Developer: Ömer Ataber
| Amaç / Purpose: PHP tabanlı sistemlerde WhatsApp üzerinden hızlı ve güvenilir
|                 bildirim gönderebilmek.
|
| Not / Note: Bu modül yalnızca bildirim amaçlıdır. WhatsApp API’si 
|             veya resmi servisler üzerinden çalışacak şekilde tasarlanmıştır.
|             This module is intended for notification purposes only. 
|             It is designed to work via the WhatsApp API or official services.
|--------------------------------------------------------------------------
*/

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const bodyParser = require('body-parser');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 443;


let domainName = '';
let emailAddress = '';
let sslEnabled = false;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    },
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0
});

client.on('qr', (qr) => {
    console.log('QR Code oluşturuldu! WhatsApp uygulamanızda QR kodu tarayın:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp bağlantısı başarılı!');
    console.log('Mesaj göndermeye hazır');
});

client.on('auth_failure', msg => {
    console.error('WhatsApp bağlantı hatası:', msg);
});

async function sendMessage(phoneNumber, message) {
    try {
       
        let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        
       
        if (cleanNumber.includes('@c.us')) {
            cleanNumber = cleanNumber.replace('@c.us', '');
        }
        
        const formattedNumber = `${cleanNumber}@c.us`;
        
        console.log(`Mesaj gönderiliyor: ${formattedNumber}`);
        
        const result = await client.sendMessage(formattedNumber, message);
        console.log(`Mesaj gönderildi: ${formattedNumber}`);
        return {
            success: true,
            messageId: result.id._serialized,
            message: 'Mesaj başarıyla gönderildi'
        };
    } catch (error) {
        console.log(`Mesaj gönderilemedi: ${phoneNumber} - ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Mesaj Gönderme API',
        endpoints: {
            'POST /send-message': 'Mesaj gönder',
            'GET /status': 'Bağlantı durumu'
        }
    });
});

app.post('/send-message', async (req, res) => {
    const { phoneNumber, message, apiKey } = req.body;
    
    console.log('Gelen mesaj:', message);
    console.log('Mesaj uzunluğu:', message.length);
    
    if (!apiKey || apiKey !== '7yUgkaTpDCit4gN0C7xua3FRjSOnGeJp') {
        return res.status(401).json({
            success: false,
            error: 'Geçersiz API key'
        });
    }
    
    if (!phoneNumber || !message) {
        return res.status(400).json({
            success: false,
            error: 'Telefon numarası ve mesaj gerekli'
        });
    }
    
    const result = await sendMessage(phoneNumber, message);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

app.get('/status', (req, res) => {
    const apiKey = req.query.apiKey || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== '7yUgkaTpDCit4gN0C7xua3FRjSOnGeJp') {
        return res.status(401).json({
            success: false,
            error: 'Geçersiz API key'
        });
    }
    
    const isReady = client.info ? true : false;
    res.json({
        connected: isReady,
        status: isReady ? 'Bağlı' : 'Bağlantı bekleniyor'
    });
});


function askDomainName() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Domain adınızı girin (örn: api.example.com): ', (answer) => {
            domainName = answer.trim();
            rl.close();
            resolve(domainName);
        });
    });
}


function askEmailAddress() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('E-posta adresinizi girin (Let\'s Encrypt için): ', (answer) => {
            emailAddress = answer.trim();
            rl.close();
            resolve(emailAddress);
        });
    });
}


function checkSSLCertificate(domain) {
    const sslDir = path.join(__dirname, 'ssl');
    const certPath = path.join(sslDir, 'certificate.crt');
    const keyPath = path.join(sslDir, 'private.key');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {

        try {
            const certContent = fs.readFileSync(certPath, 'utf8');
            const forge = require('node-forge');
            const cert = forge.pki.certificateFromPem(certContent);
            const now = new Date();
            
            if (cert.validity.notAfter > now) {
                console.log('Mevcut SSL sertifikası bulundu ve geçerli');
                return true;
            } else {
                console.log('SSL sertifikası süresi dolmuş, yeniden oluşturulacak');
                return false;
            }
        } catch (error) {
            console.log('SSL sertifikası okunamadı, yeniden oluşturulacak');
            return false;
        }
    }
    return false;
}

async function createSSLCertificate(domain, email) {
    try {
        if (checkSSLCertificate(domain)) {
            console.log('Mevcut SSL sertifikası ile HTTPS sunucu başlatılıyor...');
            startServerWithExistingSSL(domain);
            return;
        }
        
        console.log(`${domain} için self-signed SSL sertifikası oluşturuluyor...`);
        
 
        const sslDir = path.join(__dirname, 'ssl');
        if (!fs.existsSync(sslDir)) {
            fs.mkdirSync(sslDir, { recursive: true });
        }
        

        const { exec } = require('child_process');
        const keyPath = path.join(sslDir, 'private.key');
        const certPath = path.join(sslDir, 'certificate.crt');
        
        const certCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=TR/ST=Istanbul/L=Istanbul/O=WhatsApp API/OU=IT/CN=${domain}"`;
        
        exec(certCommand, (error, stdout, stderr) => {
            if (error) {
                console.log('OpenSSL bulunamadı, Node.js ile sertifika oluşturuluyor...');
                createSelfSignedCert(domain, keyPath, certPath);
                return;
            }
            
            console.log('Self-signed SSL sertifikası oluşturuldu');
            startServerWithSelfSigned(domain, keyPath, certPath);
        });
        
    } catch (error) {
        console.log('SSL sertifikası oluşturulamadı:', error.message);
        console.log('SSL sertifikası gerekli! WhatsApp bağlantısı kurulmayacak');
        process.exit(1);
    }
}


function startServerWithExistingSSL(domain) {
    const https = require('https');
    const sslDir = path.join(__dirname, 'ssl');
    const certPath = path.join(sslDir, 'certificate.crt');
    const keyPath = path.join(sslDir, 'private.key');
    
    const sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    
    https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
        console.log(`HTTPS sunucu https://${domain}:${PORT} adresinde çalışıyor`);
        console.log('WhatsApp bağlantısı kuruluyor...');
        
  
        client.initialize();
    });
}


function createSelfSignedCert(domain, keyPath, certPath) {
    try {
        const forge = require('node-forge');
        
  
        const keys = forge.pki.rsa.generateKeyPair(2048);
        

        const cert = forge.pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
        
        const attrs = [{
            name: 'commonName',
            value: domain
        }, {
            name: 'countryName',
            value: 'TR'
        }, {
            shortName: 'ST',
            value: 'Istanbul'
        }, {
            name: 'localityName',
            value: 'Istanbul'
        }, {
            name: 'organizationName',
            value: 'WhatsApp API'
        }];
        
        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        cert.sign(keys.privateKey);
        

        const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
        const certPem = forge.pki.certificateToPem(cert);
        
        fs.writeFileSync(keyPath, privateKeyPem);
        fs.writeFileSync(certPath, certPem);
        
        console.log('Node.js ile self-signed SSL sertifikası oluşturuldu');
        startServerWithSelfSigned(domain, keyPath, certPath);
        
    } catch (error) {
        console.log(' Node.js ile sertifika oluşturulamadı:', error.message);
        console.log('SSL sertifikası gerekli! WhatsApp bağlantısı kurulmayacak');
        process.exit(1);
    }
}


function startServerWithSelfSigned(domain, keyPath, certPath) {
    const https = require('https');
    
    const sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    
    https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
        console.log(`HTTPS sunucu https://${domain}:${PORT} adresinde çalışıyor`);
        console.log('WhatsApp bağlantısı kuruluyor...');
        
        // WhatsApp bağlantısını başlat
        setTimeout(() => {
            client.initialize();
        }, 1000);
    });
}



function startServer(useSSL) {
    if (useSSL && fs.existsSync('./ssl/private.key') && fs.existsSync('./ssl/certificate.crt')) {
        const https = require('https');
        const sslOptions = {
            key: fs.readFileSync('./ssl/private.key'),
            cert: fs.readFileSync('./ssl/certificate.crt')
        };
        
        https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
            console.log(`HTTPS sunucu https://${domainName}:${PORT} adresinde çalışıyor`);
            console.log('WhatsApp bağlantısı kuruluyor...');
            

            client.initialize();
        });
    } else {
        console.log('SSL sertifikası bulunamadı, WhatsApp bağlantısı kurulmayacak');
        console.log('SSL sertifikası gerekli!');
        process.exit(1);
    }
}


async function initializeServer() {
    console.log('WhatsApp API Sunucusu Başlatılıyor...\n');
    

    const sslDir = path.join(__dirname, 'ssl');
    const certPath = path.join(sslDir, 'certificate.crt');
    const keyPath = path.join(sslDir, 'private.key');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        try {
            const certContent = fs.readFileSync(certPath, 'utf8');
            const forge = require('node-forge');
            const cert = forge.pki.certificateFromPem(certContent);
            const now = new Date();
            
            if (cert.validity.notAfter > now) {
                console.log('Mevcut SSL sertifikası bulundu ve geçerli');
                console.log('Mevcut SSL sertifikası ile HTTPS sunucu başlatılıyor...');
                startServerWithExistingSSL('localhost');
                return;
            }
        } catch (error) {
            console.log('SSL sertifikası okunamadı, yeniden oluşturulacak');
        }
    }
    

    console.log('SSL sertifikası bulunamadı, yeni sertifika oluşturulacak...\n');
    

    await askDomainName();
    
    if (domainName) {
        console.log(`Domain: ${domainName}`);
        

        await askEmailAddress();
        
        if (emailAddress) {
            console.log(`E-posta: ${emailAddress}`);
            await createSSLCertificate(domainName, emailAddress);
        } else {
            console.log('E-posta adresi girilmedi');
            console.log('SSL sertifikası gerekli! WhatsApp bağlantısı kurulmayacak');
            process.exit(1);
        }
    } else {
        console.log('Domain adı girilmedi');
        console.log('SSL sertifikası gerekli! WhatsApp bağlantısı kurulmayacak');
        process.exit(1);
    }
}


initializeServer();
