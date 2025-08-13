// /src/components/OrderForm/OrderForm.tsx
import { useEffect, useRef, useState, useMemo, type FC, type FormEvent } from "react";
import {
  Drawer, DrawerBody, DrawerFooter, DrawerHeader,
  Field, Label, Input, Textarea, Select, Button, Overlay
} from "./Styles/style";
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

type DeliveryCompany = { id: number; name: string; active: boolean };

const blank: OrderInput = {
  clientName: "", articleName: "", phone: "", city: "", address: "",
  deliveryCompany: "", deliveryDate: "", description: "",
};

const OrderForm: FC = () => {
  const isOpen = useStore((s) => s.isOrderFormOpen);
  const editingId = useStore((s) => s.editingOrderId);
  const close = useStore((s) => s.closeOrderForm);
  const fetchOrders = useStore((s) => s.fetchOrders);

  const [form, setForm] = useState<OrderInput>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delivery companies
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const sortedCompanies = useMemo(
    () =>
      [...companies].sort((a, b) =>
        a.active === b.active ? a.name.localeCompare(b.name) : Number(b.active) - Number(a.active)
      ),
    [companies]
  );

  // Article suggestions (from DB) + debounce
  const [articleOptions, setArticleOptions] = useState<string[]>([]);
  const articleDebounceId = useRef<number | null>(null);

  const errorId = "order-error";

  const todayISO = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Prefill when editing
  useEffect(() => {
    let cancelled = false;

    const load = async (id: number) => {
      try {
        const data = await invoke<OrderDetail>("get_order", { id });
        if (cancelled) return;
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
        if (!cancelled) setError(e?.toString?.() ?? "Failed to load order");
      }
    };

    if (isOpen && editingId != null) load(editingId);
    if (isOpen && editingId == null) setForm(blank);

    return () => { cancelled = true; };
  }, [isOpen, editingId]);

  // Load delivery companies (and default selection) when opening
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      try {
        setCompaniesLoading(true);
        setCompaniesError(null);

        const [list, defName] = await Promise.all([
          invoke<DeliveryCompany[]>("list_delivery_companies"),
          invoke<string | null>("get_setting", { key: "defaultDeliveryCompany" }),
        ]);

        if (cancelled) return;

        setCompanies(list);

        // Prefill default only on "create new" and only if no value chosen yet
        if (editingId == null && !form.deliveryCompany && defName) {
          setForm((f) => ({ ...f, deliveryCompany: defName }));
        }
      } catch (e: any) {
        if (!cancelled) setCompaniesError(e?.toString?.() ?? "Failed to load delivery companies");
      } finally {
        if (!cancelled) setCompaniesLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingId]);

  const set = (k: keyof OrderInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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

  // ESC to close + body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && !saving) close();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, saving, close]);

  // Focus first field when opening
  useEffect(() => {
    if (isOpen) document.getElementById("clientName")?.focus();
  }, [isOpen]);

  // ------- Article suggestions (unchanged) -------
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
    }, 250);

    return () => {
      if (articleDebounceId.current) window.clearTimeout(articleDebounceId.current);
    };
  }, [form.articleName, isOpen]);

  // Autofill latest description if article name matches a suggestion
  useEffect(() => {
    if (!isOpen) return;
    const name = form.articleName.trim();
    if (!name) return;
    if (!articleOptions.includes(name)) return;
    if (form.description && form.description.trim().length > 0) return;

    let cancelled = false;
    (async () => {
      try {
        const desc = await invoke<string | null>("get_latest_description_for_article", { name });
        if (!cancelled && desc && (!form.description || form.description.trim() === "")) {
          setForm((f) => ({ ...f, description: desc }));
        }
      } catch {
        // ignore autofill errors
      }
    })();

    return () => { cancelled = true; };
  }, [form.articleName, articleOptions, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Drawer
        $open={isOpen}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-drawer-title"
        aria-hidden={!isOpen}
      >
        <form onSubmit={handleSubmit} aria-busy={saving} aria-describedby={error ? errorId : undefined}>
          <DrawerHeader>
            <h3 id="order-drawer-title">{editingId ? "Edit Order" : "Create Order"}</h3>
            <Button type="button" onClick={close} variant="ghost" aria-label="Close" disabled={saving}>✕</Button>
          </DrawerHeader>

          <DrawerBody>
            {error && (
              <div id={errorId} role="alert" style={{ color: "red" }}>
                {error}
              </div>
            )}

            <Field>
              <Label htmlFor="clientName">Client name</Label>
              <Input
                id="clientName"
                value={form.clientName}
                onChange={set("clientName")}
                required
                autoComplete="name"
              />
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

            <Field>
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                pattern="^\\+?[0-9\\s().-]{6,20}$"
                title="Use digits, spaces, or .()-; min 6 digits."
                value={form.phone}
                onChange={set("phone")}
                required
              />
              {/* For France, you could use:
                  pattern="^(\\+33|0)[1-9](\\s?\\d{2}){4}$"
                  title="French phone number, e.g. 01 23 45 67 89 or +33 1 23 45 67 89"
              */}
            </Field>

            <Field>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={set("city")}
                required
                autoComplete="address-level2"
              />
            </Field>

            <Field>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={set("address")}
                required
                autoComplete="address-line1"
              />
            </Field>

            <Field>
              <Label htmlFor="deliveryCompany">Delivery company</Label>
              <Select
                id="deliveryCompany"
                value={form.deliveryCompany}
                onChange={set("deliveryCompany")}
                required
                autoComplete="off"
              >
                <option value="" disabled>{companiesLoading ? "Loading…" : "Select…"}</option>

                {sortedCompanies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}{c.active ? "" : " (inactive)"}
                  </option>
                ))}

                {/* If editing and the current company isn't in the list anymore, keep it selectable */}
                {form.deliveryCompany &&
                  !companies.some(
                    (c) => c.name.toLowerCase() === form.deliveryCompany.toLowerCase()
                  ) && (
                    <option value={form.deliveryCompany}>{form.deliveryCompany}</option>
                  )}
              </Select>
              {companiesError && <small style={{ color: "red" }}>{companiesError}</small>}
            </Field>

            <Field>
              <Label htmlFor="deliveryDate">Delivery date</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={form.deliveryDate}
                onChange={set("deliveryDate")}
                required
                min={todayISO}
              />
            </Field>

            <Field>
              <Label htmlFor="description">Order description</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description ?? ""}
                onChange={set("description")}
                autoComplete="off"
              />
            </Field>
          </DrawerBody>

          <DrawerFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : (editingId ? "Update order" : "Save order")}
            </Button>
          </DrawerFooter>
        </form>
      </Drawer>
      <Overlay
        $open={isOpen}
        onClick={() => { if (!saving) close(); }}
        aria-hidden={!isOpen}
      />
    </>
  );
};

export default OrderForm;
