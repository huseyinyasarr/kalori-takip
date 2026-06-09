import { Droplets, GlassWater, Globe2, Lock, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FoodForm } from "../components/forms/FoodForm";
import { WaterGlassForm } from "../components/forms/WaterGlassForm";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
import { createFood, deleteFood, updateFood } from "../features/foods/foodService";
import { createWaterGlass, deleteWaterGlass, updateWaterGlass } from "../features/water/waterService";
import { useAllGlobalFoods, useFoods, useMyGlobalFoods } from "../hooks/useFoods";
import { useWaterGlasses } from "../hooks/useWater";
import type { Food, WaterGlass, WaterGlassSize } from "../types";
import { getFoodNutritionUnit } from "../utils/calculations";
import { getFoodCatalogKey, getWaterGlassCatalogKey } from "../utils/catalog";

const waterGlassLabels: Record<WaterGlassSize, string> = {
  small: "Küçük",
  medium: "Orta",
  large: "Büyük",
};

const waterGlassIconSize: Record<WaterGlassSize, string> = {
  small: "h-5 w-5",
  medium: "h-6 w-6",
  large: "h-7 w-7",
};

type FoodModalState = {
  mode: "private" | "global";
  food: Food | null;
};

type FoodSourceFilter = "all" | "global" | "mine";
type FoodKindFilter = "all" | "solid" | "liquid";

export function FoodsPage() {
  const { user, role, isAdmin } = useAuth();
  const { foods, loading, error } = useFoods();
  const { foods: allGlobalFoods, loading: allGlobalFoodsLoading, error: allGlobalFoodsError } = useAllGlobalFoods();
  const { foods: myGlobalFoods, loading: myGlobalFoodsLoading, error: myGlobalFoodsError } = useMyGlobalFoods();
  const { glasses, loading: glassesLoading, error: glassesError } = useWaterGlasses();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<FoodSourceFilter>("all");
  const [kindFilter, setKindFilter] = useState<FoodKindFilter>("all");
  const [foodModal, setFoodModal] = useState<FoodModalState | null>(null);
  const [hasFoodModalChanges, setHasFoodModalChanges] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [editingGlass, setEditingGlass] = useState<WaterGlass | null>(null);
  const [isFoodSelectionMode, setIsFoodSelectionMode] = useState(false);
  const [selectedFoodKeys, setSelectedFoodKeys] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const listedFoods = useMemo(() => {
    if (!isAdmin) return foods;

    const privateFoods = foods.filter((food) => food.source !== "global");
    return [...allGlobalFoods, ...privateFoods].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [allGlobalFoods, foods, isAdmin]);

  const filteredFoods = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return listedFoods.filter((food) => {
      const matchesSearch = !normalizedSearch || food.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch);
      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "global" && food.source === "global") ||
        (sourceFilter === "mine" && food.ownerUid === user?.uid);
      const matchesKind = kindFilter === "all" || food.kind === kindFilter;

      return matchesSearch && matchesSource && matchesKind;
    });
  }, [kindFilter, listedFoods, search, sourceFilter, user?.uid]);

  const manageableFilteredFoodKeys = useMemo(
    () => filteredFoods.filter((food) => canManageFood(food, isAdmin)).map(getFoodCatalogKey),
    [filteredFoods, isAdmin],
  );

  const selectedFoods = useMemo(() => {
    const selectedKeys = new Set(selectedFoodKeys);
    return listedFoods.filter((food) => selectedKeys.has(getFoodCatalogKey(food)) && canManageFood(food, isAdmin));
  }, [isAdmin, listedFoods, selectedFoodKeys]);

  const listLoading = loading || (isAdmin && allGlobalFoodsLoading);
  const listError = error || (isAdmin ? allGlobalFoodsError : null);
  const isGlobalModal = foodModal?.mode === "global" || foodModal?.food?.source === "global";

  if (!user) return null;

  async function deleteSelectedFoods() {
    if (!user || !selectedFoods.length) return;

    setBulkDeleting(true);
    try {
      await Promise.all(selectedFoods.map((food) => deleteFood(user.uid, food)));
      setSelectedFoodKeys([]);
    } finally {
      setBulkDeleting(false);
    }
  }

  function openFoodModal(nextFoodModal: FoodModalState) {
    setHasFoodModalChanges(false);
    setIsDiscardConfirmOpen(false);
    setFoodModal(nextFoodModal);
  }

  function closeFoodModal(force = false) {
    if (!force && hasFoodModalChanges) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    setHasFoodModalChanges(false);
    setIsDiscardConfirmOpen(false);
    setFoodModal(null);
  }

  function toggleFoodSelection(food: Food) {
    const key = getFoodCatalogKey(food);
    setSelectedFoodKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function toggleAllFilteredFoods() {
    const allSelected = manageableFilteredFoodKeys.every((key) => selectedFoodKeys.includes(key));
    if (allSelected) {
      setSelectedFoodKeys((current) => current.filter((key) => !manageableFilteredFoodKeys.includes(key)));
      return;
    }

    setSelectedFoodKeys((current) => Array.from(new Set([...current, ...manageableFilteredFoodKeys])));
  }

  function toggleFoodSelectionMode() {
    setIsFoodSelectionMode((current) => {
      if (current) setSelectedFoodKeys([]);
      return !current;
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <h2 className="text-2xl font-black text-ink">Besinler</h2>
          <p className="text-sm text-ink/60">Özel veya global besinleri, porsiyonları, sıvı oranlarını ve su bardaklarını yönet.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openFoodModal({ mode: "private", food: null })}>
            Besin Ekle
          </Button>
          {isAdmin ? (
            <Button variant="secondary" icon={<Globe2 className="h-4 w-4" />} onClick={() => openFoodModal({ mode: "global", food: null })}>
              Global Besin Ekle
            </Button>
          ) : role === "editor" ? (
            <Button variant="secondary" icon={<Globe2 className="h-4 w-4" />} onClick={() => openFoodModal({ mode: "global", food: null })}>
              Global Öneri Gönder
            </Button>
          ) : null}
        </div>
      </div>

      {foodModal ? (
        <div className="mobile-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4 py-6" onClick={() => closeFoodModal()}>
          <div className="mobile-modal-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-ink">
                  {foodModal.food ? "Besini düzenle" : isGlobalModal ? (isAdmin ? "Global besin ekle" : "Global öneri gönder") : "Besin ekle"}
                </h3>
                <p className="text-sm text-ink/55">
                  {isGlobalModal
                    ? isAdmin
                      ? "Bu kayıt herkesin görebileceği global katalogda yayınlanır."
                      : "Bu kayıt admin onayından sonra global katalogda görünür."
                    : "Bu kayıt yalnızca senin hesabında görünür."}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-ink/50 transition hover:bg-cloud hover:text-ink"
                aria-label="Pencereyi kapat"
                onClick={() => closeFoodModal()}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FoodForm
              editingFood={foodModal.food}
              role={role}
              visibilityMode={isGlobalModal ? "publicOnly" : "privateOnly"}
              validateBeforeSubmit={(payload, editingFood) => {
                if (isGlobalModal) return null;

                return hasPrivateFoodNameConflict(foods, payload.name, editingFood)
                  ? "Bu isimde bir besin özel listende zaten var."
                  : null;
              }}
              onDirtyChange={setHasFoodModalChanges}
              onCancel={() => closeFoodModal()}
              onSubmit={async (payload) => {
                const normalizedPayload = isGlobalModal ? { ...payload, visibility: "public" as const } : { ...payload, visibility: "private" as const };

                if (foodModal.food) {
                  await updateFood(user.uid, foodModal.food, normalizedPayload, role);
                } else {
                  await createFood(user.uid, normalizedPayload, role);
                }
                closeFoodModal(true);
              }}
            />
            {isDiscardConfirmOpen ? (
              <div className="mobile-modal-backdrop fixed inset-0 z-[60] grid place-items-center bg-ink/40 px-4" onClick={() => setIsDiscardConfirmOpen(false)}>
                <div className="mobile-modal-panel w-full max-w-sm rounded-lg bg-white p-5 shadow-soft" onClick={(event) => event.stopPropagation()}>
                  <h4 className="text-base font-bold text-ink">Kaydedilmemiş değişiklikler var</h4>
                  <p className="mt-2 text-sm text-ink/60">Formu kapatırsan yazdıkların silinecek.</p>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsDiscardConfirmOpen(false)}>
                      Düzenlemeye Devam Et
                    </Button>
                    <Button type="button" variant="danger" onClick={() => closeFoodModal(true)}>
                      Vazgeç ve Kapat
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_160px_auto] md:items-end">
            <Input label="Ara" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Yulaf, tavuk..." />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink/80">Kaynak</span>
              <select
                className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as FoodSourceFilter)}
              >
                <option value="all">Tümü</option>
                <option value="global">Global</option>
                <option value="mine">Benim eklediklerim</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink/80">Tür</span>
              <select
                className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value as FoodKindFilter)}
              >
                <option value="all">Tümü</option>
                <option value="solid">Yemek</option>
                <option value="liquid">İçecek</option>
              </select>
            </label>
            <Button variant="secondary" icon={<Search className="h-4 w-4" />}>
              Ara
            </Button>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={toggleFoodSelectionMode}>
              {isFoodSelectionMode ? "Bitti" : "Düzenle"}
            </Button>
            {isFoodSelectionMode ? (
              <>
            <Button
              type="button"
              variant="secondary"
              className="border border-leaf/20 bg-white"
              disabled={!manageableFilteredFoodKeys.length}
              onClick={toggleAllFilteredFoods}
            >
              {manageableFilteredFoodKeys.length && manageableFilteredFoodKeys.every((key) => selectedFoodKeys.includes(key)) ? "Seçimi Kaldır" : "Görünenleri Seç"}
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              loading={bulkDeleting}
              disabled={!selectedFoods.length}
              onClick={deleteSelectedFoods}
            >
              Seçilenleri Sil ({selectedFoods.length})
            </Button>
              </>
            ) : null}
          </div>
          {listError ? <p className="text-sm font-medium text-coral">{listError}</p> : null}
          {listLoading ? <p className="text-sm text-ink/60">Besinler yükleniyor...</p> : null}
          {!listLoading && !filteredFoods.length ? <EmptyState title="Besin bulunamadı" description="Arama, kaynak veya tür filtresini değiştir ya da ilk besinini ekle." /> : null}
          <div className="mobile-list grid gap-2">
            {filteredFoods.map((food) => {
              const key = getFoodCatalogKey(food);
              const isSelected = selectedFoodKeys.includes(key);
              const manageable = canManageFood(food, isAdmin);
              const nutritionUnit = getFoodNutritionUnit(food);

              return (
                <div
                  key={key}
                  className={`grid gap-3 rounded-md border border-ink/10 p-3 md:items-center ${
                    isFoodSelectionMode ? "md:grid-cols-[auto_1fr_auto]" : "md:grid-cols-[1fr_auto]"
                  }`}
                >
                  {isFoodSelectionMode ? (
                    <label className="flex items-center md:self-start md:pt-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-ink/20 text-leaf focus:ring-leaf"
                        checked={isSelected}
                        disabled={!manageable}
                        onChange={() => toggleFoodSelection(food)}
                        aria-label={`${food.name} seç`}
                      />
                    </label>
                  ) : null}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{food.name}</p>
                      <FoodBadge food={food} />
                      {food.source === "global" ? <StatusBadge status={food.status ?? "approved"} /> : null}
                      {food.ownerUid === user.uid ? <span className="rounded-full bg-cloud px-2 py-0.5 text-xs font-bold text-ink/60">Benim eklediğim</span> : null}
                    </div>
                    <p className="text-sm text-ink/60">
                      100 {nutritionUnit}: {food.caloriesPer100g} kcal · P {food.proteinPer100g} g · Y {food.fatPer100g} g · K {food.carbPer100g} g
                      {food.fluidRatio ? ` · Sıvı %${Math.round(food.fluidRatio * 100)}` : ""}
                    </p>
                    {food.description ? <p className="mt-1 text-xs text-ink/50">{food.description}</p> : null}
                    {!manageable ? <p className="mt-1 text-xs text-ink/45">Global besinleri kullanabilirsin; düzenleme ve silme yetkisi adminde.</p> : null}
                  </div>
                  {manageable ? (
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Button variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => openFoodModal({ mode: food.source === "global" ? "global" : "private", food })}>
                        Düzenle
                      </Button>
                      <Button
                        variant="danger"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={async () => {
                          await deleteFood(user.uid, food);
                          setSelectedFoodKeys((current) => current.filter((item) => item !== key));
                        }}
                      >
                        Sil
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-leaf" />
            <h3 className="text-lg font-bold text-ink">{editingGlass ? "Bardağı düzenle" : "Yeni bardak"}</h3>
          </div>
          <WaterGlassForm
            editingGlass={editingGlass}
            onCancel={() => setEditingGlass(null)}
            onSubmit={async (payload) => {
              if (editingGlass) {
                await updateWaterGlass(user.uid, editingGlass, payload, editingGlass.source === "global" && isAdmin ? "global" : "personal");
                setEditingGlass(null);
              } else {
                await createWaterGlass(user.uid, payload);
              }
            }}
          />

          <div className="mt-6">
            <h3 className="mb-4 text-lg font-bold text-ink">Bardaklar</h3>
            {glassesError ? <p className="text-sm font-medium text-coral">{glassesError}</p> : null}
            {glassesLoading ? <p className="text-sm text-ink/60">Bardaklar yükleniyor...</p> : null}
            {!glassesLoading && !glasses.length ? <EmptyState title="Bardak bulunamadı" description="Su takibi için kullandığın bardak veya şişe ölçüsünü ekle." /> : null}
            <div className="mobile-list grid gap-2">
              {glasses.map((glass) => {
                const isGlobalGlass = glass.source === "global";
                return (
                  <div key={getWaterGlassCatalogKey(glass)} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <GlassWater className={`${waterGlassIconSize[glass.size ?? "medium"]} text-leaf`} />
                        <p className="font-semibold text-ink">{glass.name}</p>
                        <span className="rounded-full bg-cloud px-2 py-0.5 text-xs font-bold text-ink/60">
                          {glass.source === "global" ? "Global" : "Benim"}
                        </span>
                      </div>
                      <p className="text-sm text-ink/60">
                        {glass.milliliters} ml · {waterGlassLabels[glass.size ?? "medium"]}
                      </p>
                      {isGlobalGlass && !isAdmin ? (
                        <p className="mt-1 text-xs text-ink/50">Düzenlersen kişisel kopyan oluşur; silersen yalnız sende gizlenir.</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditingGlass(glass)}>
                        {isGlobalGlass && !isAdmin ? "Kendim İçin Düzenle" : "Düzenle"}
                      </Button>
                      <Button
                        variant="danger"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => deleteWaterGlass(user.uid, glass, isGlobalGlass && isAdmin ? "global" : "personal")}
                      >
                        {isGlobalGlass && !isAdmin ? "Bende Gizle" : "Sil"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {role === "editor" ? (
        <Card>
          <h3 className="mb-4 text-lg font-bold text-ink">Global besin önerilerim</h3>
          {myGlobalFoodsError ? <p className="text-sm font-medium text-coral">{myGlobalFoodsError}</p> : null}
          {myGlobalFoodsLoading ? <p className="text-sm text-ink/60">Öneriler yükleniyor...</p> : null}
          {!myGlobalFoodsLoading && !myGlobalFoods.length ? (
            <EmptyState title="Global öneri yok" description="Global öneri gönderdiğinde onay durumunu burada görebilirsin." />
          ) : null}
          <div className="mobile-list grid gap-2">
            {myGlobalFoods.map((food) => {
              const canManageSubmission = food.status === "pending" || food.status === "rejected";
              const nutritionUnit = getFoodNutritionUnit(food);
              return (
                <div key={`mine-${food.id}`} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{food.name}</p>
                      <FoodBadge food={food} />
                      <StatusBadge status={food.status ?? "approved"} />
                    </div>
                    <p className="text-sm text-ink/60">
                      100 {nutritionUnit}: {food.caloriesPer100g} kcal · P {food.proteinPer100g} g · Y {food.fatPer100g} g · K {food.carbPer100g} g
                    </p>
                  </div>
                  {canManageSubmission ? (
                    <div className="flex gap-2">
                      <Button variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => openFoodModal({ mode: "global", food })}>
                        Düzenle
                      </Button>
                      <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => deleteFood(user.uid, food)}>
                        Sil
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function canManageFood(food: Food, isAdmin: boolean) {
  return food.source !== "global" || isAdmin;
}

function hasPrivateFoodNameConflict(foods: Food[], name: string, editingFood: Food | null) {
  const normalizedName = normalizeFoodName(name);
  if (!normalizedName) return false;

  return foods.some((food) => {
    if (food.source === "global") return false;
    if (editingFood?.source !== "global" && editingFood?.id === food.id) return false;

    return normalizeFoodName(food.name) === normalizedName;
  });
}

function normalizeFoodName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

function FoodBadge({ food }: { food: Food }) {
  const isGlobal = food.source === "global";
  const Icon = isGlobal ? Globe2 : Lock;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cloud px-2 py-0.5 text-xs font-bold text-ink/60">
      <Icon className="h-3 w-3" />
      {isGlobal ? "Global" : "Benim"}
    </span>
  );
}

function StatusBadge({ status }: { status: NonNullable<Food["status"]> }) {
  const label = status === "approved" ? "Onaylandı" : status === "pending" ? "Onay bekliyor" : "Reddedildi";
  const className =
    status === "approved"
      ? "bg-mint text-leaf"
      : status === "pending"
        ? "bg-amberSoft/40 text-ink"
        : "bg-coral/10 text-coral";

  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${className}`}>{label}</span>;
}
