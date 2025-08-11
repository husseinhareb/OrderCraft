// /src/components/OrderForm/OrderForm.tsx
import { useEffect, useRef, useState, type FC, type FormEvent } from "react";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, Field, Label, Input, Textarea, Select, Button, Overlay } from "./Styles/style";
import { useStore } from "../../store/store";
import { invoke } from "@tauri-apps/api/core";

type OrderInput = {
  clientName: string;
  articleName: string;
  phone: string;
  city: string;
  address: string;
  deliveryCompany: string;
  deliveryDate: string; // yyyy-mm-dd
  description?: string;
};

type OrderDetail = OrderInput & { id: number };

const blank: OrderInput = {
  clientName: "", articleName: "", phone: "", city: "", address: "",
  deliveryCompany: "", deliveryDate: "", description: "",
};

// ---- City autocomplete config ----
const COUNTRY = "fr"; // ISO-3166 alpha-2 (change as needed)
const PLACE_TYPES = new Set(["city", "town", "village", "hamlet", "locality", "municipality", "suburb"]);

const OrderForm: FC = () => {
  const isOpen = useStore((s) => s.isOrderFormOpen);
  const editingId = useStore((s) => s.editingOrderId);
  const close = useStore((s) => s.closeOrderForm);
  const fetchOrders = useStore((s) => s.fetchOrders);

  const [form, setForm] = useState<OrderInput>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // suggestions state + debounce timer (articles)
  const [articleOptions, setArticleOptions] = useState<string[]>([]);
  const articleDebounceId = useRef<number | null>(null);

  // NEW: city suggestions + debounce timer
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const cityDebounceId = useRef<number | null>(null);
  const cityAbort = useRef<AbortController | null>(null);

  // Prefill when editing
  useEffect(() => {
    const load = async (id: number) => {
      try {
        const data = await invoke<OrderDetail>("get_order", { id });
        setForm({
          clientName: data.clientName,
          articleName: data.articleName,
          phone: data.phone,
          city: data.city,
          address: data.address,
          deliveryCompany: data.deliveryCompany,
          deliveryDate: data.deliveryDate,
          description: data.description ?? "",
        });
      } catch (e: any) {
        setError(e?.toString?.() ?? "Failed to load order");
      }
    };

    if (isOpen && editingId != null) load(editingId);
    if (isOpen && editingId == null) setForm(blank);
  }, [isOpen, editingId]);

  const set = (k: keyof OrderInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);

    try {
      if (editingId != null) {
        await invoke("update_order", { id: editingId, order: { ...form, description: form.description || undefined } });
      } else {
        await invoke<number>("save_order", { order: { ...form, description: form.description || undefined } });
      }
      await fetchOrders();
      close();
      setForm(blank);
      setArticleOptions([]);
      setCityOptions([]);
    } catch (err: any) {
      setError(err?.toString() ?? "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  // Drawer sizing + scroll lock
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--right-drawer-width", isOpen ? "min(420px, 95vw)" : "0px");
    return () => root.style.setProperty("--right-drawer-width", "0px");
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Focus first field when opening
  useEffect(() => {
    if (isOpen) document.getElementById("clientName")?.focus();
  }, [isOpen]);

  // Fetch article suggestions as the user types (debounced)
  useEffect(() => {
    if (!isOpen) return;
    const q = form.articleName.trim();
    if (articleDebounceId.current) window.clearTimeout(articleDebounceId.current);

    articleDebounceId.current = window.setTimeout(async () => {
      if (!q) { setArticleOptions([]); return; }
      try {
        const list = await invoke<string[]>("search_article_names", { query: q, limit: 8 });
        setArticleOptions(list);
      } catch {
        // ignore suggestion errors silently
      }
    }, 150);

    return () => {
      if (articleDebounceId.current) window.clearTimeout(articleDebounceId.current);
    };
  }, [form.articleName, isOpen]);

  // If articleName matches a suggestion and description is empty, autofill latest description
  useEffect(() => {
    if (!isOpen) return;
    const name = form.articleName.trim();
    if (!name) return;
    if (!articleOptions.includes(name)) return;
    if (form.description && form.description.trim().length > 0) return;

    (async () => {
      try {
        const desc = await invoke<string | null>("get_latest_description_for_article", { name });
        if (desc && (!form.description || form.description.trim() === "")) {
          setForm((f) => ({ ...f, description: desc }));
        }
      } catch {
        // ignore autofill errors
      }
    })();
  }, [form.articleName, articleOptions, isOpen]);

  // NEW: Fetch city suggestions (debounced, country-restricted)
  useEffect(() => {
    if (!isOpen) return;
    const q = form.city.trim();
    if (cityDebounceId.current) window.clearTimeout(cityDebounceId.current);
    cityAbort.current?.abort();

    cityDebounceId.current = window.setTimeout(async () => {
      if (!q || q.length < 2) { setCityOptions([]); return; }

      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.search = new URLSearchParams({
        q,
        format: "jsonv2",
        addressdetails: "1",
        countrycodes: COUNTRY,
        limit: "8",
      }).toString();

      const controller = new AbortController();
      cityAbort.current = controller;

      try {
        const res = await fetch(url.toString(), {
          // Can't set User-Agent from browser; Referer is sent automatically.
          headers: { "Accept-Language": "en" }, // change to your UI language if desired
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows: any[] = await res.json();

        // Map to "name" and de-dupe
        const names: string[] = [];
        const seen = new Set<string>();

        for (const r of rows) {
          if (!PLACE_TYPES.has(r.type)) continue;

          const name =
            r.name ??
            r.address?.city ??
            r.address?.town ??
            r.address?.village ??
            r.address?.hamlet ??
            r.address?.locality;

          if (!name) continue;
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          names.push(name);
        }

        setCityOptions(names);
      } catch {
        // swallow errors; this is best-effort
      }
    }, 180);

    return () => {
      if (cityDebounceId.current) window.clearTimeout(cityDebounceId.current);
      cityAbort.current?.abort();
    };
  }, [form.city, isOpen]);

  return (
    <>
      <Drawer
        $open={isOpen}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-drawer-title" aria-hidden={!isOpen}>
        <form onSubmit={handleSubmit}>
          <DrawerHeader>
            <h3 id="order-drawer-title">{editingId ? "Edit Order" : "Create Order"}</h3>
            <Button type="button" onClick={close} variant="ghost" aria-label="Close">✕</Button>
          </DrawerHeader>

          <DrawerBody>
            {error && <div role="alert" style={{ color: "red" }}>{error}</div>}

            <Field><Label htmlFor="clientName">Client name</Label>
              <Input id="clientName" value={form.clientName} onChange={set("clientName")} required />
            </Field>

            <Field>
              <Label htmlFor="articleName">Article name</Label>
              <Input
                id="articleName"
                list="articleName-suggestions"
                value={form.articleName}
                onChange={set("articleName")}
                required
                aria-autocomplete="list"
                autoComplete="off"
              />
              <datalist id="articleName-suggestions">
                {articleOptions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>

            <Field><Label htmlFor="phone">Phone number</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} required />
            </Field>

            <Field>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                list="city-suggestions"
                value={form.city}
                onChange={set("city")}
                required
                aria-autocomplete="list"
                autoComplete="off"
              />
              <datalist id="city-suggestions">
                {cityOptions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>

            <Field><Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={set("address")} required />
            </Field>

            <Field><Label htmlFor="deliveryCompany">Delivery company</Label>
              <Select id="deliveryCompany" value={form.deliveryCompany} onChange={set("deliveryCompany")} required>
                <option value="" disabled>Select…</option>
                <option value="DHL">DHL</option>
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="Local Post">Local Post</option>
              </Select>
            </Field>

            <Field><Label htmlFor="deliveryDate">Delivery date</Label>
              <Input id="deliveryDate" type="date" value={form.deliveryDate} onChange={set("deliveryDate")} required />
            </Field>

            <Field><Label htmlFor="description">Order description</Label>
              <Textarea id="description" rows={4} value={form.description ?? ""} onChange={set("description")} />
            </Field>
          </DrawerBody>

          <DrawerFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : (editingId ? "Update order" : "Save order")}</Button>
          </DrawerFooter>
        </form>
      </Drawer>
      <Overlay $open={isOpen} onClick={close} aria-hidden={!isOpen} />
    </>
  );
};

export default OrderForm;
