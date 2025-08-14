import { type FC, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Actions, AddRow, CheckboxLabel, CompanyRow, Content, Error, Field, InlineWrap, Input, Label, List, Muted, Name, PrimaryButton, RadioItem, RadioRow, Section, SectionTitle, Select, Sidebar, Small, SmallButton, Spacer, TabButton, Tag, Wrap } from "./Styles/style";

// ---------- Types ----------
type ThemeChoice = "system" | "light" | "dark";

type DeliveryCompany = {
  id: number;
  name: string;
  active: boolean;
};

// ---------- Helpers ----------
async function getSetting(key: string) {
  try {
    // Rust returns Option<String> -> null or string here
    return (await invoke<string | null>("get_setting", { key })) ?? null;
  } catch {
    return null;
  }
}

async function setSetting(key: string, value: string) {
  await invoke("set_setting", { key, value });
}

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", choice);
  }
}

// ---------- Component ----------
const Settings: FC = () => {
  const [activeTab, setActiveTab] = useState<"general" | "theme" | "companies">("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // General
  const [defaultCity, setDefaultCity] = useState("");
  const [confettiOnDone, setConfettiOnDone] = useState(true);
  const [defaultCompanyName, setDefaultCompanyName] = useState("");

  // Theme
  const [theme, setTheme] = useState<ThemeChoice>("system");

  // Companies
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [newCompany, setNewCompany] = useState("");

  const sortedCompanies = useMemo(
    () =>
      [...companies].sort((a, b) =>
        a.active === b.active ? a.name.localeCompare(b.name) : Number(b.active) - Number(a.active)
      ),
    [companies]
  );

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [themeVal, cityVal, confettiVal, defCompanyVal, list] = await Promise.all([
          getSetting("theme"),
          getSetting("defaultCity"),
          getSetting("confettiOnDone"),
          getSetting("defaultDeliveryCompany"),
          invoke<DeliveryCompany[]>("list_delivery_companies"),
        ]);

        if (!mounted) return;

        const t = (themeVal as ThemeChoice) || "system";
        setTheme(t);
        applyTheme(t);

        setDefaultCity(cityVal || "");
        setConfettiOnDone((confettiVal ?? "true") !== "false");
        setDefaultCompanyName(defCompanyVal || "");
        setCompanies(list);
      } catch (e: any) {
        setError(e?.message || "Failed to load settings.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Handlers — General
  const saveGeneral = async () => {
    try {
      await Promise.all([
        setSetting("defaultCity", defaultCity.trim()),
        setSetting("confettiOnDone", confettiOnDone ? "true" : "false"),
        setSetting("defaultDeliveryCompany", defaultCompanyName.trim()),
      ]);
    } catch (e: any) {
      setError(e?.message || "Failed to save general settings.");
    }
  };

  // Handlers — Theme
  const saveTheme = async () => {
    try {
      await setSetting("theme", theme);
      applyTheme(theme);
    } catch (e: any) {
      setError(e?.message || "Failed to save theme.");
    }
  };

  // Handlers — Companies
  const refreshCompanies = async () => {
    const list = await invoke<DeliveryCompany[]>("list_delivery_companies");
    setCompanies(list);
  };

  const addCompany = async () => {
    const name = newCompany.trim();
    if (!name) return;
    try {
      await invoke<number>("add_delivery_company", { name });
      setNewCompany("");
      await refreshCompanies();
      if (!defaultCompanyName) setDefaultCompanyName(name);
    } catch (e: any) {
      setError(e?.message || "Failed to add company.");
    }
  };

  const toggleActive = async (id: number, next: boolean) => {
    try {
      await invoke("set_delivery_company_active", { id, active: next });
      await refreshCompanies();
    } catch (e: any) {
      setError(e?.message || "Failed to update company status.");
    }
  };

  const renameCompany = async (id: number, newName: string) => {
    const name = newName.trim();
    if (!name) return;
    try {
      await invoke("rename_delivery_company", { id, newName: name });
      await refreshCompanies();
      if (defaultCompanyName && defaultCompanyName.toLowerCase() === name.toLowerCase()) {
        setDefaultCompanyName(name); // ensure canonical casing
      }
    } catch (e: any) {
      setError(e?.message || "Failed to rename company.");
    }
  };

  // UI
  return (
    <Wrap>
      <Sidebar role="tablist" aria-orientation="vertical">
        <TabButton
          role="tab"
          aria-selected={activeTab === "general"}
          onClick={() => setActiveTab("general")}
        >
          General
        </TabButton>
        <TabButton
          role="tab"
          aria-selected={activeTab === "theme"}
          onClick={() => setActiveTab("theme")}
        >
          Theme
        </TabButton>
        <TabButton
          role="tab"
          aria-selected={activeTab === "companies"}
          onClick={() => setActiveTab("companies")}
        >
          Delivery companies
        </TabButton>
      </Sidebar>

      <Content>
        {loading && <Muted>Loading settings…</Muted>}
        {error && <Error role="alert">{error}</Error>}

        {!loading && activeTab === "general" && (
          <Section aria-labelledby="general-title">
            <SectionTitle id="general-title">General</SectionTitle>

            <Field>
              <Label htmlFor="defaultCity">Default city</Label>
              <Input
                id="defaultCity"
                value={defaultCity}
                onChange={(e) => setDefaultCity(e.target.value)}
                placeholder="e.g., Paris"
              />
            </Field>

            <Field>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={confettiOnDone}
                  onChange={(e) => setConfettiOnDone(e.target.checked)}
                />
                <span>Celebrate with confetti when marking orders as done</span>
              </CheckboxLabel>
            </Field>

            <Field>
              <Label htmlFor="defaultCompany">Default delivery company</Label>
              <Select
                id="defaultCompany"
                value={defaultCompanyName}
                onChange={(e) => setDefaultCompanyName(e.target.value)}
              >
                <option value="">— None —</option>
                {sortedCompanies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.active ? "" : "(inactive)"}
                  </option>
                ))}
              </Select>
              <Small>Used to prefill new orders.</Small>
            </Field>

            <Actions>
              <PrimaryButton onClick={saveGeneral}>Save general</PrimaryButton>
            </Actions>
          </Section>
        )}

        {!loading && activeTab === "theme" && (
          <Section aria-labelledby="theme-title">
            <SectionTitle id="theme-title">Theme</SectionTitle>

            <RadioRow>
              <RadioItem>
                <input
                  id="theme-system"
                  type="radio"
                  name="theme"
                  checked={theme === "system"}
                  onChange={() => setTheme("system")}
                />
                <label htmlFor="theme-system">System</label>
              </RadioItem>
              <RadioItem>
                <input
                  id="theme-light"
                  type="radio"
                  name="theme"
                  checked={theme === "light"}
                  onChange={() => setTheme("light")}
                />
                <label htmlFor="theme-light">Light</label>
              </RadioItem>
              <RadioItem>
                <input
                  id="theme-dark"
                  type="radio"
                  name="theme"
                  checked={theme === "dark"}
                  onChange={() => setTheme("dark")}
                />
                <label htmlFor="theme-dark">Dark</label>
              </RadioItem>
            </RadioRow>

            <Actions>
              <PrimaryButton onClick={saveTheme}>Save theme</PrimaryButton>
            </Actions>
          </Section>
        )}

        {!loading && activeTab === "companies" && (
          <Section aria-labelledby="companies-title">
            <SectionTitle id="companies-title">Delivery companies</SectionTitle>

            <AddRow onSubmit={(e) => { e.preventDefault(); addCompany(); }}>
              <Input
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Add a company…"
                aria-label="New company name"
              />
              <PrimaryButton type="submit">Add</PrimaryButton>
            </AddRow>

            <List>
              {sortedCompanies.map((c) => (
                <CompanyRow key={c.id}>
                  <InlineEditName
                    defaultValue={c.name}
                    onSubmit={(val) => renameCompany(c.id, val)}
                  />
                  <Spacer />
                  <Tag data-variant={c.active ? "ok" : "muted"}>
                    {c.active ? "Active" : "Inactive"}
                  </Tag>
                  <SmallButton onClick={() => toggleActive(c.id, !c.active)}>
                    {c.active ? "Deactivate" : "Activate"}
                  </SmallButton>
                </CompanyRow>
              ))}
              {sortedCompanies.length === 0 && <Muted>No companies yet.</Muted>}
            </List>
          </Section>
        )}
      </Content>
    </Wrap>
  );
};

export default Settings;

// ---------- Small inline editable input ----------
const InlineEditName: FC<{ defaultValue: string; onSubmit: (v: string) => void }> = ({
  defaultValue,
  onSubmit,
}) => {
  const [val, setVal] = useState(defaultValue);
  const [editing, setEditing] = useState(false);

  useEffect(() => setVal(defaultValue), [defaultValue]);

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== defaultValue) onSubmit(trimmed);
    setEditing(false);
  };

  return (
    <InlineWrap>
      {editing ? (
        <>
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") { e.preventDefault(); setVal(defaultValue); setEditing(false); }
            }}
            autoFocus
            aria-label="Company name"
          />
          <SmallButton onClick={commit}>Save</SmallButton>
          <SmallButton data-variant="ghost" onClick={() => { setVal(defaultValue); setEditing(false); }}>
            Cancel
          </SmallButton>
        </>
      ) : (
        <>
          <Name>{defaultValue}</Name>
          <SmallButton onClick={() => setEditing(true)}>Rename</SmallButton>
        </>
      )}
    </InlineWrap>
  );
};

