"use client";

import { useState } from "react";

const CROPS = [
  { key: "wheat", label: "Пшеница" },
  { key: "potato", label: "Картофель" },
  { key: "sunflower", label: "Подсолнечник" },
];

export default function CreatePage() {
  const [form, setForm] = useState({
    user_name: "",
    crop: "wheat",
    region: "",
    volume_tons: "",
    price_per_kg: "",
    delivery_days: "",
    quality: "ГОСТ",
  });
  const [done, setDone] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const cropName = CROPS.find((c) => c.key === form.crop)?.label ?? "";
  const valid =
    form.user_name.trim() !== "" &&
    form.region.trim() !== "" &&
    Number(form.volume_tons) > 0 &&
    Number(form.price_per_kg) > 0 &&
    Number(form.delivery_days) > 0;

  function submit() {
    const payload = {
      user_name: form.user_name,
      crop: form.crop,
      crop_name: cropName,
      region: form.region,
      volume_tons: Number(form.volume_tons),
      price_per_kg: Number(form.price_per_kg),
      delivery_days: Number(form.delivery_days),
      quality: form.quality,
    };
    console.log("Новый оффер:", payload);
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Создать предложение</h1>
        <p className="text-slate-500 mb-6">Разместите форвардный контракт на продажу</p>

        {done ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <p className="text-emerald-700 font-semibold mb-2">Оффер создан</p>
            <p className="text-sm text-slate-500 mb-4">Предложение отправлено (см. консоль).</p>
            <a href="/" className="inline-block px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">
              К списку предложений
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <Field label="Название хозяйства">
              <input className="inp" value={form.user_name}
                onChange={(e) => set("user_name", e.target.value)}
                placeholder="КФХ Иванов А.И." />
            </Field>

            <Field label="Культура">
              <select className="inp" value={form.crop} onChange={(e) => set("crop", e.target.value)}>
                {CROPS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Регион">
              <input className="inp" value={form.region}
                onChange={(e) => set("region", e.target.value)}
                placeholder="Краснодарский край" />
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Объём, т">
                <input className="inp" type="number" value={form.volume_tons}
                  onChange={(e) => set("volume_tons", e.target.value)} placeholder="50" />
              </Field>
              <Field label="Цена, ₽/кг">
                <input className="inp" type="number" value={form.price_per_kg}
                  onChange={(e) => set("price_per_kg", e.target.value)} placeholder="18.5" />
              </Field>
              <Field label="Срок, дн.">
                <input className="inp" type="number" value={form.delivery_days}
                  onChange={(e) => set("delivery_days", e.target.value)} placeholder="60" />
              </Field>
            </div>

            <Field label="Качество">
              <input className="inp" value={form.quality}
                onChange={(e) => set("quality", e.target.value)}
                placeholder="ГОСT, 3 класс" />
            </Field>

            <button onClick={submit} disabled={!valid}
              className={"w-full py-2.5 rounded-lg text-sm font-medium transition " +
                (valid ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-200 text-slate-400 cursor-not-allowed")}>
              Создать предложение
            </button>
          </div>
        )}
      </div>

      <style>{".inp{width:100%;border:1px solid rgb(226 232 240);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.inp:focus{border-color:rgb(5 150 105)}"}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
