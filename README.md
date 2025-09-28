# 📱 WhatsApp API - Node.js & PHP Entegrasyonu

Modern WhatsApp mesajlaşma sistemi - Node.js API ile PHP modülü entegrasyonu. tüm ülke kodları desteği ve güvenli API key sistemi ile.

## Özellikler

**Node.js WhatsApp API** - `whatsapp-web.js` tabanlı
**Tüm Ülke Kodları** - `+90`, `+1`, `+55` vs. desteklenir
**API Key Güvenliği** - Güvenli endpoint koruması
**PHP Modülü** - Hazır entegrasyon
**Admin Bildirimleri** - Yönetici numaralarına otomatik bildirim
**Otomatik Yeniden Bağlantı** - WhatsApp bağlantı yönetimi
**UTF-8 Desteği** - Türkçe karakterler dahil

Sistem Gereksinimleri

### Node.js Sunucu
- **Node.js**: 18.0.0 veya üzeri
- **RAM**: Minimum 4GB
- **Disk**: 40GB boş alan
- **Port**: 443 (HTTPS)
- **SSL**: OpenSSL desteği (önerilen)

### PHP Sunucu
- **PHP**: 7.4 veya üzeri
- **cURL**: Aktif
- **JSON**: Aktif
- **OpenSSL**: Aktif

Kurulum

### 1. Node.js API Kurulumu

```bash
# NodeJS indirin
https://nodejs.org/dist/v22.20.0/node-v22.20.0-x64.msi
kurulumu yapın
cmd yönetici olarak çalıştırıp
proje dosyasına girin

npm install

npm start
```

### 2. SSL Sertifikası

Sunucu ilk çalıştırıldığında:
1. Domain adınızı girin (örn: `api.example.com`)
2. E-posta adresinizi girin
3. OpenSSL sertifikası alınacak

### 3. WhatsApp Bağlantısı

1. Terminal'de görünen QR kodu tarayın
2. WhatsApp Web ile bağlantı kurulacak
3. "WhatsApp bağlantısı kuruluyor..." mesajını bekleyin

### 4. PHP Modülü Entegrasyonu

```php
// WhatsAppBildirim.php örneği
<?php
class WhatsAppBildirim {
    private $config;
    
    public function __construct() {
        $this->config = [
            "settings" => [
                "api_key" => "oluşturdugunuzkey",
                "phone_number" => "5354177323"
            ]
        ];
    }
    
    public function sendMessage($phone, $message) {
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        
        $api_url = "https://api.domainadi.com/send-message";
        
        $body = [
            "phoneNumber" => $cleanPhone,
            "message" => strip_tags($message),
            "apiKey" => $this->config["settings"]["api_key"]
        ];

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $api_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "UTF-8",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => [
                "Content-Type: application/json; charset=UTF-8"
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);

        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $err = curl_error($curl);
        curl_close($curl);

        if ($err || $http_code != 200) {
            return false;
        }

        $response_data = json_decode($response, true);
        return isset($response_data['success']) && $response_data['success'];
    }
}
?>
```

##  Konfigürasyon

### Node.js Konfigürasyonu

```javascript
// server.js
const PORT = 443;
const API_KEY = "key";

const client = new Client({
    authStrategy: new LocalAuth(),
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0
});
```

## API Endpoints

### POST /send-message

WhatsApp mesajı gönderir.

**Request:**
```json
{
    "phoneNumber": "numara",
    "message": "Merhaba! Bu bir test mesajıdır.",
    "apiKey": "key"
}
```

**Response:**
```json
{
    "success": true,
    "messageId": "true_numara@c.us_3EB097B1B4738221E3BF9A",
    "message": "Mesaj başarıyla gönderildi"
}
```

### GET /status

API durumunu kontrol eder.

**Request:**
```
GET /status?apiKey=key
```

**Response:**
```json
{
    "connected": true,
    "status": "WhatsApp bağlantısı aktif"
}
```

## 🌍 Desteklenen Numara Formatları

Sistem otomatik olarak tüm formatları destekler:

| Giriş Formatı | Çıkış Formatı |
|---------------|---------------|
| `+90 555 123 4567` | `905551234567@c.us` |
| `+1 555 123 4567` | `15551234567@c.us` |
| `+55 11 99999 9999` | `5511999999999@c.us` |
| `905551234567` | `905551234567@c.us` |
| `5551234567` | `5551234567@c.us` |

## Güvenlik

- **API Key**: Tüm endpoint'ler API key ile korunur
- **SSL**: OpenSSL SSL sertifikası
- **Input Validation**: Numara ve mesaj doğrulaması
- **Rate Limiting**: Spam koruması (önerilen)

## 🚀 Kullanım Örnekleri

### Basit Mesaj Gönderme

```php
$whatsapp = new WhatsAppBildirim();
$success = $whatsapp->sendMessage("905079808857", "Merhaba! Test mesajı.");

if ($success) {
    echo "Mesaj gönderildi!";
} else {
    echo "Mesaj gönderilemedi!";
}
```

### Admin Bildirimleri

```php
// Admin panelden bildirim gönderme
public function notifyAdmin($message) {
    $numbers = $this->config["settings"]["phone_number"];
    $numbers = explode("\n", $numbers);
    
    foreach ($numbers as $number) {
        $this->sendMessage($number, $message);
    }
}
```

### Hook Entegrasyonu

```php
// Sistem hook'ları
public function notifyHook($params) {
    $hookName = $params["name"];
    $hook = str_replace("-", "_", $hookName);
    
    // Müşteri bildirimi
    if (isset($this->config["settings"][$hook]) && $this->config["settings"][$hook]) {
        $this->sendMessage($params["user_data"]["phone"], $message);
    }
    
    // Admin bildirimi
    if (isset($this->config["settings"][$hook . "_foradmin"]) && $this->config["settings"][$hook . "_foradmin"]) {
        $this->notifyAdmin($message);
    }
}
```

## Sorun Giderme

### WhatsApp Bağlantı Sorunları

```bash
# Session dosyalarını temizle
rmdir /s /q .wwebjs_auth
rmdir /s /q .wwebjs_cache

Sunucuyu yeniden başlat
npm start
```

### API Bağlantı Sorunları

```bash
# API durumunu kontrol et
curl -X GET "https://api.domainadi.com/status?apiKey=YOUR_API_KEY"

# Test mesajı gönder
curl -X POST "https://your-domain.com/send-message" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"905354177323","message":"Test","apiKey":"YOUR_API_KEY"}'
```


## 🔄 Changelog

### v1.0.0
- İlk sürüm
- Node.js WhatsApp API
- PHP modülü entegrasyonu
- Let's Encrypt SSL desteği
- Tüm ülke kodları desteği

---

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!**
