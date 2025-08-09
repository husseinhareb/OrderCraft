// /src/components/RightPanel/OrderForm.tsx
import { useEffect, useState, type FC, type FormEvent } from "react";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, Field, Label, Input, Textarea, Select, Button } from "./Styles/style";
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

const OrderForm: FC = () => {
  const isOpen = useStore((s) => s.isOrderFormOpen);
  const editingId = useStore((s) => s.editingOrderId);
  const close = useStore((s) => s.closeOrderForm);
  const fetchOrders = useStore((s) => s.fetchOrders);

  const [form, setForm] = useState<OrderInput>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err?.toString() ?? "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer $open={isOpen} aria-hidden={!isOpen} aria-label={editingId ? "Edit order" : "Create order"}>
      <form onSubmit={handleSubmit}>
        <DrawerHeader>
          <h3>{editingId ? "Edit Order" : "Create Order"}</h3>
          <Button type="button" onClick={close} variant="ghost" aria-label="Close">✕</Button>
        </DrawerHeader>

        <DrawerBody>
          {error && <div role="alert" style={{ color: "red" }}>{error}</div>}

          <Field><Label htmlFor="clientName">Client name</Label>
            <Input id="clientName" value={form.clientName} onChange={set("clientName")} required />
          </Field>

          <Field><Label htmlFor="articleName">Article name</Label>
            <Input id="articleName" value={form.articleName} onChange={set("articleName")} required />
          </Field>

          <Field><Label htmlFor="phone">Phone number</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} required />
          </Field>

          <Field><Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={set("city")} required />
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
  );
};

export default OrderForm;
