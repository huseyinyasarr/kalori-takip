# Calorie Tracker / Kalori Takip

React + Vite + TypeScript ile yazılmış, Firebase Authentication ve Firestore kullanan kişisel kalori, makro ve kilo takip uygulaması. Arayüz Türkçedir ve GitHub Pages üzerinde yayınlanmaya hazırdır.

> Bu uygulama kişisel takip amaçlıdır, tıbbi tavsiye değildir.

## Özellikler

- Google Sign-In ile giriş
- Her kullanıcı için izole Firestore veri ağacı: `users/{uid}`
- İlk giriş onboarding akışı
- Günlük kalori, protein, minimum yağ ve minimum karbonhidrat hedefleri
- 05:00 sonrası günlük kilo hatırlatma modalı
- Kişisel yemek veritabanı ekleme, arama, düzenleme, silme
- Günlük yemek kaydı ekleme, düzenleme, silme
- Dashboard, özet grafikleri, geçmiş ve ayarlar sayfaları
- Recharts grafikleri, Tailwind CSS responsive tasarım
- GitHub Pages için HashRouter ve `VITE_BASE_PATH` desteği

## Firebase kurulumu

1. [Firebase Console](https://console.firebase.google.com/) üzerinden yeni bir proje oluştur.
2. Project Overview ekranından Web App ekle.
3. Firebase Authentication > Sign-in method bölümünde Google provider'ı aktif et.
4. Authentication > Settings > Authorized domains içinde şu domainleri kontrol et:
   - Lokal geliştirme için `localhost`
   - Canlı ortam için `<github-username>.github.io`
5. Firestore Database oluştur.
6. Firestore Rules sekmesine bu repodaki [firestore.rules](./firestore.rules) içeriğini ekle ve publish et.
7. Firebase Web App config değerlerini not al.

## Ortam değişkenleri

`.env.example` dosyasını temel alarak `.env` oluştur:

```bash
cp .env.example .env
```

Ardından değerleri doldur:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_BASE_PATH=/
```

Firebase client config değerleri tarayıcıda görünebilir; asıl güvenlik Firestore Security Rules ile sağlanır. Gerçek `.env` dosyası commitlenmemelidir.

## Lokal çalıştırma

```bash
npm install
npm run dev
```

Build kontrolü:

```bash
npm run build
```

## GitHub repository ve deploy

1. GitHub üzerinde yeni bir repository oluştur.
2. Kodu `main` branch'e push et.
3. Repository Settings > Secrets and variables > Actions bölümünde aşağıdaki secrets değerlerini ekle:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
4. Aynı bölümde Variables sekmesine `VITE_BASE_PATH` ekle.
   - Repository adı `kalori-takip` ise değer: `/kalori-takip/`
   - Kendi domaininde kökten yayınlıyorsan değer: `/`
5. Repository Settings > Pages ekranında Source olarak GitHub Actions seç.
6. Repository Settings > Environments bölümünde `github-pages` environment'ını kontrol et veya oluştur.
7. `main` branch'e push sonrası Actions sekmesinden deploy durumunu takip et.
8. Yayınlanan siteyi aç.
9. Firebase Authentication authorized domains içine GitHub Pages domainini eklediğinden emin ol.

## Routing notu

GitHub Pages üzerinde sayfa yenilemede route kırılmasını önlemek için `HashRouter` kullanıldı. Bu yüzden URL'ler `/#/foods` benzeri görünür. `VITE_BASE_PATH` yine asset path'leri için desteklenir.

## Hesaplama varsayımları

- Ortalama günlük yakılan kalori: `currentWeight * 33`
- Hedef kilo düşükse günlük kalori hedefi: `averageBurnKcal - 400`
- Hedef kilo yüksekse günlük kalori hedefi: `averageBurnKcal + 400`
- Hedef kilo aynıysa günlük kalori hedefi: `averageBurnKcal`
- Protein hedefi: `targetWeight * 2.2`
- Minimum yağ hedefi: `(dailyCalorieTarget * 0.2) / 9`
- Minimum karbonhidrat hedefi: `currentWeight * 1`
- Kalori tam sayıya, makrolar 1 ondalık basamağa yuvarlanır.
- Besin günü local timezone ile 00:00-23:59 aralığıdır.
- Kilo sorma tetikleyicisi local timezone ile 05:00 sonrasıdır.

## Veri modeli

```text
users/{uid}
users/{uid}/foods/{foodId}
users/{uid}/foodLogs/{logId}
users/{uid}/weightLogs/{dateKey}
```

İstemci kodu yalnızca giriş yapan kullanıcının UID'si altındaki dokümanları okur ve yazar. Firestore rules da aynı izolasyonu zorunlu kılar.

## Kontrol listesi

- `npm run build` TypeScript ve Vite build'i çalıştırır.
- Giriş yapmayan kullanıcı protected route'lara erişemez.
- Onboarding tamamlanmadan ana uygulama açılmaz.
- Günlük kilo modalı aynı local date key için tekrar gösterilmez.
- Yemek loglarında besin değerleri snapshot olarak saklanır.
- GitHub Pages yayınında HashRouter refresh sorunlarını engeller.
