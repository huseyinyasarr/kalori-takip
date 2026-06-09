import { zodResolver } from "@hookform/resolvers/zod";
import { Scale } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../features/auth/AuthContext";
import { markWeightPromptSkipped, submitDailyWeight } from "../../features/profile/profileService";
import type { UserProfile } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const schema = z.object({
  weight: z
    .string()
    .trim()
    .refine((value) => /^\d+([.,]\d{1,2})?$/.test(value), "Kilo virgülden sonra en fazla iki basamak olmalı.")
    .refine((value) => Number(value.replace(",", ".")) > 0, "Kilo pozitif sayı olmalı."),
});

function formatWeightInput(value: string) {
  const normalized = value.replace(",", ".");
  if (!/^\d*\.?\d{0,2}$/.test(normalized)) return null;

  return value;
}

function parseWeight(value: string) {
  return Number(value.replace(",", "."));
}

export function WeightPromptModal({ profile }: { profile: UserProfile }) {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<{ weight: string }>({
    resolver: zodResolver(schema),
    defaultValues: { weight: profile.currentWeight ? String(profile.currentWeight).replace(".", ",") : "" },
  });

  if (!user) return null;

  const weightRegister = register("weight");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-mint text-leaf">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">Bugünkü kilon</h2>
            <p className="text-sm text-ink/60">05:00 sonrası ilk girişinde bir kez sorulur.</p>
          </div>
        </div>
        <form
          className="grid gap-3"
          onSubmit={handleSubmit(async ({ weight }) => {
            await submitDailyWeight(user.uid, parseWeight(weight), profile.targetWeight);
          })}
        >
          <Input
            label="Güncel kilo"
            type="text"
            inputMode="decimal"
            error={errors.weight?.message}
            {...weightRegister}
            onChange={(event) => {
              const value = formatWeightInput(event.target.value);
              if (value === null) {
                setValue("weight", event.target.value.slice(0, -1));
                return;
              }

              weightRegister.onChange(event);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button loading={isSubmitting}>Kaydet</Button>
            <Button type="button" variant="secondary" onClick={() => markWeightPromptSkipped(user.uid)}>
              Tartılmadım
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
