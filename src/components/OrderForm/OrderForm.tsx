// /src/components/RightPanel/OrderForm.tsx
import { useState, type FC, type FormEvent } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  Field,
  Label,
  Input,
  Textarea,
  Select,
  Button,
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

const OrderForm: FC = () => {
  const isOpen = useStore((s) => s.isOrderFormOpen);
  const close = useStore((s) => s.closeOrderForm);

  const [clientName, setClientName] = useState("");
  const [articleName, setArticleName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryCompany, setDeliveryCompany] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const order: OrderInput = {
      clientName,
      articleName,
      phone,
      city,
      address,
      deliveryCompany,
      deliveryDate,
      description: description || undefined,
    };

    try {
      // Calls the Rust command `save_order` with the payload { order: {...} }
      const id = await invoke<number>("save_order", { order });
      console.log("Order saved with id:", id);

      // Reset + close
      setClientName("");
      setArticleName("");
      setPhone("");
      setCity("");
      setAddress("");
      setDeliveryCompany("");
      setDeliveryDate("");
      setDescription("");
      close();
    } catch (err: any) {
      setError(err?.toString() ?? "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer $open={isOpen} aria-hidden={!isOpen} aria-label="Create order">
      <form onSubmit={handleSubmit}>
        <DrawerHeader>
          <h3>Create Order</h3>
          <Button type="button" onClick={close} variant="ghost" aria-label="Close">
            ✕
          </Button>
        </DrawerHeader>

        <DrawerBody>
          {error && (
            <div role="alert" style={{ color: "red" }}>
              {error}
            </div>
          )}

          <Field>
            <Label htmlFor="clientName">Client name</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </Field>

          <Field>
            <Label htmlFor="articleName">Article name</Label>
            <Input
              id="articleName"
              value={articleName}
              onChange={(e) => setArticleName(e.target.value)}
              required
            />
          </Field>

          <Field>
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>

          <Field>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </Field>

          <Field>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </Field>

          <Field>
            <Label htmlFor="deliveryCompany">Delivery company</Label>
            <Select
              id="deliveryCompany"
              value={deliveryCompany}
              onChange={(e) => setDeliveryCompany(e.target.value)}
              required
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="DHL">DHL</option>
              <option value="FedEx">FedEx</option>
              <option value="UPS">UPS</option>
              <option value="Local Post">Local Post</option>
            </Select>
          </Field>

          <Field>
            <Label htmlFor="deliveryDate">Delivery date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
            />
          </Field>

          <Field>
            <Label htmlFor="description">Order description</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </DrawerBody>

        <DrawerFooter>
          <Button type="button" variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save order"}
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
};

export default OrderForm;
