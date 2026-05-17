import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { updateProfileTargets } from "../features/profile/profileService";

const schema = z.object({
  fullName: z.string().trim().min(1, "İsim boş olamaz."),
  currentWeight: z.coerce.number().positive("Güncel kilo pozitif sayı olmalı."),
  targetWeight: z.coerce.number().positive("Hedef kilo pozitif sayı olmalı."),
});

type FormValues = z.infer<typeof schema>;

export function SettingsPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        currentWeight: profile.currentWeight,
        targetWeight: profile.targetWeight,
      });
    }
  }, [profile, reset]);

  if (!user || !profile) return null;

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-ink">Ayarlar</h2>
        <p className="text-sm text-ink/60">Profil ve hedef hesaplamalarını güncelle.</p>
      </div>
      <Card className="max-w-2xl">
        <form
          className="grid gap-4"
          onSubmit={handleSubmit(async (values) => {
            await updateProfileTargets(user.uid, values, values.currentWeight !== profile.currentWeight);
          })}
        >
          <Input label="İsim Soyisim" error={errors.fullName?.message} {...register("fullName")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Güncel kilo" type="number" step="0.1" error={errors.currentWeight?.message} {...register("currentWeight")} />
            <Input label="Hedef kilo" type="number" step="0.1" error={errors.targetWeight?.message} {...register("targetWeight")} />
          </div>
          <Button loading={isSubmitting}>Kaydet</Button>
          {isSubmitSuccessful ? <p className="text-sm font-medium text-leaf">Ayarlar kaydedildi.</p> : null}
        </form>
      </Card>
      <p className="text-xs text-ink/50">Bu uygulama kişisel takip amaçlıdır, tıbbi tavsiye değildir.</p>
    </div>
  );
}
