// /src/components/Settings/Settings.tsx
import { type FC, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Actions,
  AddRow,
  CheckboxLabel,
  CompanyRow,
  Content,
  Error,
  Field,
  InlineWrap,
  Input,
  Label,
  List,
  Muted,
  Name,
  PrimaryButton,
  RadioItem,
  RadioRow,
  Section,
  SectionTitle,
  Select,
  Sidebar,
  Small,
  SmallButton,
  Spacer,
  TabButton,
  Tag,
  Wrap,
} from "./Styles/style";
import { useStore } from "../../store/store";
import { THEME_KEYS, type ThemeName } from "../../theme/theme";

// ---------- Types ----------
type DeliveryCompany = {
  id: number;
  name: string;
  active: boolean;
};

// Backend DTO (matches the updated Rust ThemeDTO)
type ThemeDTO = {
  base: "light" | "dark" | "custom";
  colors: Record<string, string>;
  confettiColors?: string[] | null;
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

function normalizeConfettiColors(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 5) : [];
  // pad to exactly 5 entries (empty slots allowed)
  while (arr.length < 5) arr.push("");
  return arr.map((c) => c ?? "");
}

function sanitizeColorString(v: string): string {
  return (v || "").trim();
}

function isHexColor(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

// ---------- Component ----------
const Settings: FC = () => {
  const [activeTab, setActiveTab] =
    useState<"general" | "theme" | "companies">("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // General
  const [defaultCity, setDefaultCity] = useState("");
  const [confettiOnDone, setConfettiOnDone] = useState(true);
  const [defaultCompanyName, setDefaultCompanyName] = useState("");

  // Theme (hook into Zustand theme)
  const storeTheme = useStore((s) => s.theme); // "light" | "dark" | "custom"
  const setStoreTheme = useStore((s) => s.setTheme);
  const [themeChoice, setThemeChoice] = useState<ThemeName>(storeTheme);

  const customTheme = useStore((s) => s.customTheme);
  const loadCustomTheme = useStore((s) => s.loadCustomTheme);
  const setCustomThemeLocal = useStore((s) => s.setCustomThemeLocal);

  // NEW: Confetti palette editor (only used when themeChoice === "custom")
  const [confettiColors, setConfettiColors] = useState<string[]>(
    normalizeConfettiColors()
  );

  // Companies
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [newCompany, setNewCompany] = useState("");

  const sortedCompanies = useMemo(
    () =>
      [...companies].sort((a, b) =>
        a.active === b.active
          ? a.name.localeCompare(b.name)
          : Number(b.active) - Number(a.active)
      ),
    [companies]
  );

  // Keep local theme radio in sync if store changes elsewhere
  useEffect(() => setThemeChoice(storeTheme), [storeTheme]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [savedTheme, cityVal, confettiVal, defCompanyVal, list] =
          await Promise.all([
            getSetting("theme"),
            getSetting("defaultCity"),
            getSetting("confettiOnDone"),
            getSetting("defaultDeliveryCompany"),
            invoke<DeliveryCompany[]>("list_delivery_companies"),
          ]);

        if (!mounted) return;

        // Persisted theme can be "light" | "dark" | "custom"
        if (
          savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "custom"
        ) {
          setThemeChoice(savedTheme);
          setStoreTheme(savedTheme);
        }

        // ensure we have latest custom tokens in memory (kept for the UI token editor)
        await loadCustomTheme();

        // fetch the confetti palette from the backend (works for any base)
        try {
          const themeDto = await invoke<ThemeDTO | null>("get_theme_colors");
          if (mounted && themeDto) {
            setConfettiColors(normalizeConfettiColors(themeDto.confettiColors));
          }
        } catch {
          // ignore; we'll keep defaults
        }

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
  }, [setStoreTheme, loadCustomTheme]);

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
      setStoreTheme(themeChoice); // updates ThemeProvider immediately
      await setSetting("theme", themeChoice); // persist selection

      // Persist custom theme tokens + confetti palette to the backend
      // We call the backend directly to ensure the confetti JSON is stored under "confetti".
      const payload: ThemeDTO = {
        // For custom we keep the "base" that the custom colors override ("light" | "dark").
        // For light/dark themes, we still save current tokens/palette (preconfig), but app will ignore palette unless themeChoice === "custom".
        base:
          themeChoice === "custom"
            ? (customTheme?.base ?? "light")
            : (themeChoice as "light" | "dark"),
        colors: (customTheme?.colors ?? {}) as Record<string, string>,
        confettiColors: normalizeConfettiColors(confettiColors)
          .filter((c) => sanitizeColorString(c) !== "")
          .slice(0, 5),
      };

      await invoke("save_theme_colors", { payload });
    } catch (e: any) {
      setError(e?.message || "Failed to save theme.");
    }
  };

  const updateCustomColor = (
    key: (typeof THEME_KEYS)[number],
    value: string
  ) => {
    setCustomThemeLocal({ colors: { [key]: value } as any });
  };

  const updateConfettiAt = (idx: number, value: string) => {
    setConfettiColors((prev) => {
      const next = prev.slice();
      next[idx] = sanitizeColorString(value);
      return next;
    });
  };

  const clearConfetti = () => {
    setConfettiColors(normalizeConfettiColors());
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
      if (
        defaultCompanyName &&
        defaultCompanyName.toLowerCase() === name.toLowerCase()
      ) {
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
                  id="theme-light"
                  type="radio"
                  name="theme"
                  checked={themeChoice === "light"}
                  onChange={() => setThemeChoice("light")}
                />
                <label htmlFor="theme-light">Light</label>
              </RadioItem>
              <RadioItem>
                <input
                  id="theme-dark"
                  type="radio"
                  name="theme"
                  checked={themeChoice === "dark"}
                  onChange={() => setThemeChoice("dark")}
                />
                <label htmlFor="theme-dark">Dark</label>
              </RadioItem>
              <RadioItem>
                <input
                  id="theme-custom"
                  type="radio"
                  name="theme"
                  checked={themeChoice === "custom"}
                  onChange={() => setThemeChoice("custom")}
                />
                <label htmlFor="theme-custom">Custom</label>
              </RadioItem>
            </RadioRow>

            {themeChoice === "custom" && (
              <>
                <SectionTitle>Custom palette</SectionTitle>

                {/* Base selection for the custom theme (light/dark scaffold) */}
                <RadioRow>
                  <RadioItem>
                    <input
                      id="custom-base-light"
                      type="radio"
                      name="custom-base"
                      checked={(customTheme?.base ?? "light") === "light"}
                      onChange={() => setCustomThemeLocal({ base: "light" })}
                    />
                    <label htmlFor="custom-base-light">Base: Light</label>
                  </RadioItem>
                  <RadioItem>
                    <input
                      id="custom-base-dark"
                      type="radio"
                      name="custom-base"
                      checked={(customTheme?.base ?? "light") === "dark"}
                      onChange={() => setCustomThemeLocal({ base: "dark" })}
                    />
                    <label htmlFor="custom-base-dark">Base: Dark</label>
                  </RadioItem>
                </RadioRow>

                {/* Editable tokens laid out in a responsive grid to avoid scrolling on wide screens */}
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    alignItems: "start",
                  }}
                >
                  {THEME_KEYS.map((k) => {
                    const val = customTheme?.colors?.[k] ?? "";
                    const isAlpha =
                      k === "overlay" || k === "hover" || k === "softShadow";
                    return (
                      <Field key={k} style={{ maxWidth: "none" }}>
                        <Label htmlFor={`color-${k}`}>{k}</Label>
                        {!isAlpha ? (
                          <InlineWrap>
                            <Input
                              id={`color-${k}`}
                              type="color"
                              value={isHexColor(val) ? val : "#000000"}
                              onChange={(e) => updateCustomColor(k, e.target.value)}
                              aria-label={`${k} (color picker)`}
                              style={{ width: 48, padding: 0, height: 36 }}
                            />
                            <Input
                              value={val}
                              onChange={(e) => updateCustomColor(k, e.target.value)}
                              placeholder="#000000"
                              aria-label={`${k} hex value`}
                            />
                          </InlineWrap>
                        ) : (
                          <Input
                            id={`color-${k}`}
                            value={val}
                            onChange={(e) => updateCustomColor(k, e.target.value)}
                            placeholder={
                              k === "softShadow"
                                ? "rgba(0,0,0,0.06)"
                                : "rgba(0,0,0,0.40)"
                            }
                            aria-label={`${k} (rgba or hex)`}
                          />
                        )}
                      </Field>
                    );
                  })}
                </div>

                <Muted>
                  Tip: For <code>overlay</code>, <code>hover</code>, and{" "}
                  <code>softShadow</code> you can use <code>rgba()</code> for
                  transparency.
                </Muted>

                {/* NEW — Confetti palette editor (up to 5 colors) */}
                <SectionTitle style={{ marginTop: 18 }}>
                  Confetti palette (up to 5)
                </SectionTitle>
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    alignItems: "start",
                  }}
                >
                  {confettiColors.map((c, i) => {
                    const hex = isHexColor(c) ? c : "#000000";
                    return (
                      <Field key={`confetti-${i}`} style={{ maxWidth: "none" }}>
                        <Label htmlFor={`confetti-${i}`}>Color {i + 1}</Label>
                        <InlineWrap>
                          <Input
                            id={`confetti-${i}`}
                            type="color"
                            value={hex}
                            onChange={(e) => updateConfettiAt(i, e.target.value)}
                            aria-label={`Confetti color ${i + 1} (picker)`}
                            style={{ width: 48, padding: 0, height: 36 }}
                          />
                          <Input
                            value={c}
                            onChange={(e) => updateConfettiAt(i, e.target.value)}
                            placeholder="#000000"
                            aria-label={`Confetti color ${i + 1} (hex)`}
                          />
                        </InlineWrap>
                      </Field>
                    );
                  })}
                </div>
                <Small>
                  When theme is <b>Custom</b>, confetti uses these colors. In{" "}
                  <b>Light</b> it’s black; in <b>Dark</b> it’s white.
                </Small>

                <div style={{ marginTop: 8 }}>
                  <SmallButton data-variant="ghost" onClick={clearConfetti}>
                    Clear confetti palette
                  </SmallButton>
                </div>
              </>
            )}

            <Actions>
              <PrimaryButton onClick={saveTheme}>Save theme</PrimaryButton>
            </Actions>
          </Section>
        )}

        {!loading && activeTab === "companies" && (
          <Section aria-labelledby="companies-title">
            <SectionTitle id="companies-title">Delivery companies</SectionTitle>

            <AddRow
              onSubmit={(e) => {
                e.preventDefault();
                addCompany();
              }}
            >
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
const InlineEditName: FC<{
  defaultValue: string;
  onSubmit: (v: string) => void;
}> = ({ defaultValue, onSubmit }) => {
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
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setVal(defaultValue);
                setEditing(false);
              }
            }}
            autoFocus
            aria-label="Company name"
          />
          <SmallButton onClick={commit}>Save</SmallButton>
          <SmallButton
            data-variant="ghost"
            onClick={() => {
              setVal(defaultValue);
              setEditing(false);
            }}
          >
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
