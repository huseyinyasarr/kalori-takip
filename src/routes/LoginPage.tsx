import { Chrome } from "lucide-react";
import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../features/auth/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";

function getAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/unauthorized-domain") {
      return "Bu domain Firebase Authentication için yetkili değil. Firebase Console > Authentication > Settings > Authorized domains içine localhost ve kullandığın domaini ekle.";
    }

    if (error.code === "auth/operation-not-allowed") {
      return "Google giriş sağlayıcısı aktif değil. Firebase Console > Authentication > Sign-in method bölümünden Google provider'ı aktif et.";
    }

    if (error.code === "auth/popup-closed-by-user") {
      return "Google giriş penceresi tamamlanmadan kapandı. Tekrar deneyebilirsin.";
    }

    if (error.code === "unavailable") {
      return "Google girişi tamamlandı ama Firestore'a ulaşılamadı. Firebase Console'da Firestore Database oluşturulduğunu, rules'un yayınlandığını ve internet bağlantını kontrol et.";
    }

    return `Google ile giriş başarısız oldu. Firebase hata kodu: ${error.code}`;
  }

  return "Google ile giriş başarısız oldu.";
}

export function LoginPage() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-cloud px-4 py-8">
      <div className="mobile-screen w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-14 w-14 shrink-0 rounded-2xl shadow-soft" />
          <div>
            <h1 className="text-2xl font-black text-ink">Kalori Takip</h1>
            <p className="text-sm text-ink/60">Kalori, makro ve kilo takibi.</p>
          </div>
        </div>
        <Card>
          <h2 className="text-xl font-bold text-ink">Giriş yap</h2>
          <p className="mt-2 text-sm text-ink/65">Verilerin Google hesabına bağlı özel Firestore alanında tutulur.</p>
          {!isFirebaseConfigured ? (
            <p className="mt-4 rounded-md bg-amberSoft/20 p-3 text-sm font-medium text-ink">
              Firebase ortam değişkenleri eksik. Giriş için `.env` dosyasını README'deki değerlerle doldur.
            </p>
          ) : null}
          {error ? <p className="mt-4 rounded-md bg-coral/10 p-3 text-sm font-medium text-coral">{error}</p> : null}
          <Button
            className="mt-5 w-full"
            icon={<Chrome className="h-4 w-4" />}
            loading={loading}
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                await signIn();
              } catch (error) {
                setError(getAuthErrorMessage(error));
              } finally {
                setLoading(false);
              }
            }}
          >
            Google ile devam et
          </Button>
        </Card>
        <p className="mt-4 text-center text-xs text-ink/50">Bu uygulama kişisel takip amaçlıdır, tıbbi tavsiye değildir.</p>
      </div>
    </div>
  );
}
