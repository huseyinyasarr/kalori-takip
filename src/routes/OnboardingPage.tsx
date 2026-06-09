import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
import { completeOnboarding } from "../features/profile/profileService";

const schema = z.object({
  fullName: z.string().trim().min(1, "İsim boş olamaz."),
  currentWeight: z.coerce.number().positive("Güncel kilo pozitif sayı olmalı."),
  targetWeight: z.coerce.number().positive("Hedef kilo pozitif sayı olmalı."),
});

type FormValues = z.infer<typeof schema>;

export function OnboardingPage() {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user?.displayName ?? "",
      currentWeight: undefined,
      targetWeight: undefined,
    },
  });

  return (
    <div className="grid min-h-screen place-items-center bg-cloud px-4 py-8">
      <Card className="mobile-screen w-full max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-leaf">İlk kurulum</p>
        <h1 className="mt-1 text-2xl font-black text-ink">Hedeflerini oluşturalım</h1>
        <p className="mt-2 text-sm text-ink/65">Bu bilgiler günlük kalori ve minimum makro hedeflerini hesaplamak için kullanılır.</p>
        <form
          className="mt-5 grid gap-4"
          onSubmit={handleSubmit(async (values) => {
            if (!user) return;
            await completeOnboarding(user, values);
          })}
        >
          <Input label="İsim Soyisim" error={errors.fullName?.message} {...register("fullName")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Güncel kilo" type="number" step="0.1" error={errors.currentWeight?.message} {...register("currentWeight")} />
            <Input label="Hedef kilo" type="number" step="0.1" error={errors.targetWeight?.message} {...register("targetWeight")} />
          </div>
          <Button loading={isSubmitting}>Başla</Button>
        </form>
      </Card>
    </div>
  );
}
