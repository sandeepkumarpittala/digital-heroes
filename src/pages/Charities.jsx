import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const MIN_CONTRIBUTION = 10;
const MAX_CONTRIBUTION = 100;

const contributionOptions = [10, 15, 20, 25, 50, 75, 100];

function Charities() {
  const [user, setUser] = useState(null);

  const [charities, setCharities] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);

  const [selectedCharityId, setSelectedCharityId] = useState("");
  const [contributionPercent, setContributionPercent] =
    useState(MIN_CONTRIBUTION);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCharities();
  }, []);

  async function loadCharities() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!currentUser) {
        setError("Please sign in to manage your charity selection.");
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const { data: charityData, error: charityError } = await supabase
        .from("charities")
        .select(
          `
          id,
          name,
          slug,
          description,
          long_description,
          image_url,
          website_url,
          category,
          is_featured,
          is_active
        `
        )
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("name", { ascending: true });

      if (charityError) {
        throw charityError;
      }

      setCharities(charityData || []);

      const { data: selectionData, error: selectionError } = await supabase
        .from("user_charities")
        .select(
          `
          id,
          user_id,
          charity_id,
          contribution_percent,
          is_active,
          created_at,
          updated_at
        `
        )
        .eq("user_id", currentUser.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (selectionError) {
        throw selectionError;
      }

      if (selectionData) {
        setCurrentSelection(selectionData);
        setSelectedCharityId(selectionData.charity_id);
        setContributionPercent(
          Number(selectionData.contribution_percent) || MIN_CONTRIBUTION
        );
      } else if (charityData && charityData.length > 0) {
        setSelectedCharityId(charityData[0].id);
        setContributionPercent(MIN_CONTRIBUTION);
      }
    } catch (err) {
      console.error("Charity loading error:", err);
      setError(err.message || "Unable to load charities.");
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const values = charities
      .map((charity) => charity.category)
      .filter(Boolean);

    return ["All", ...Array.from(new Set(values)).sort()];
  }, [charities]);

  const filteredCharities = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return charities.filter((charity) => {
      const matchesSearch =
        !searchText ||
        charity.name?.toLowerCase().includes(searchText) ||
        charity.description?.toLowerCase().includes(searchText) ||
        charity.category?.toLowerCase().includes(searchText);

      const matchesCategory =
        category === "All" || charity.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [charities, search, category]);

  function handleSelectCharity(charityId) {
    setSelectedCharityId(charityId);
    setMessage("");
    setError("");
  }

  function handleContributionChange(value) {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return;
    }

    const safeValue = Math.min(
      MAX_CONTRIBUTION,
      Math.max(MIN_CONTRIBUTION, numericValue)
    );

    setContributionPercent(safeValue);
    setMessage("");
    setError("");
  }

  async function saveSelection() {
    setMessage("");
    setError("");

    if (!user) {
      setError("Please sign in first.");
      return;
    }

    if (!selectedCharityId) {
      setError("Please select a charity.");
      return;
    }

    if (
      contributionPercent < MIN_CONTRIBUTION ||
      contributionPercent > MAX_CONTRIBUTION
    ) {
      setError(
        `Contribution must be between ${MIN_CONTRIBUTION}% and ${MAX_CONTRIBUTION}%.`
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * If the user already has an active selection,
       * update that row instead of creating another active row.
       */
      if (currentSelection?.id) {
        const { data, error: updateError } = await supabase
          .from("user_charities")
          .update({
            charity_id: selectedCharityId,
            contribution_percent: contributionPercent,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentSelection.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setCurrentSelection(data);
      } else {
        const { data, error: insertError } = await supabase
          .from("user_charities")
          .insert({
            user_id: user.id,
            charity_id: selectedCharityId,
            contribution_percent: contributionPercent,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setCurrentSelection(data);
      }

      setMessage("Your charity selection has been saved successfully. ❤️");
    } catch (err) {
      console.error("Save charity error:", err);

      setError(
        err.message ||
          "Unable to save your charity selection. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCharity = charities.find(
    (charity) => charity.id === selectedCharityId
  );

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>❤️</div>
          <h2 style={styles.loadingTitle}>Loading charities...</h2>
          <p style={styles.loadingText}>
            We're preparing the charities available to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HERO */}
        <section style={styles.hero}>
          <div style={styles.heroBadge}>❤️ MAKE AN IMPACT</div>

          <h1 style={styles.heroTitle}>
            Choose a Charity
            <span style={styles.heroTitleAccent}> That Matters to You</span>
          </h1>

          <p style={styles.heroText}>
            Your subscription can support causes that create meaningful change.
            Select a charity and choose how much of your contribution goes
            toward it.
          </p>
        </section>

        {/* CURRENT SELECTION */}
        {currentSelection && selectedCharity && (
          <section style={styles.currentCard}>
            <div style={styles.currentIcon}>✓</div>

            <div style={styles.currentContent}>
              <div style={styles.currentLabel}>CURRENT CHARITY</div>

              <h2 style={styles.currentTitle}>{selectedCharity.name}</h2>

              <p style={styles.currentText}>
                You are currently contributing{" "}
                <strong>{Number(currentSelection.contribution_percent)}%</strong>{" "}
                to this charity.
              </p>
            </div>

            <div style={styles.currentPercent}>
              {Number(currentSelection.contribution_percent)}%
            </div>
          </section>
        )}

        {/* SEARCH + FILTER */}
        <section style={styles.controls}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔎</span>

            <input
              type="text"
              placeholder="Search charities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={styles.categorySelect}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Categories" : item}
              </option>
            ))}
          </select>
        </section>

        {/* ERROR */}
        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        {/* SUCCESS */}
        {message && <div style={styles.successBox}>✓ {message}</div>}

        {/* CHARITY GRID */}
        <section>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Available Charities</h2>
              <p style={styles.sectionSubtitle}>
                {filteredCharities.length}{" "}
                {filteredCharities.length === 1 ? "charity" : "charities"}{" "}
                available
              </p>
            </div>
          </div>

          {filteredCharities.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>🔍</div>
              <h3 style={styles.emptyTitle}>No charities found</h3>
              <p style={styles.emptyText}>
                Try changing your search or category filter.
              </p>
            </div>
          ) : (
            <div style={styles.grid}>
              {filteredCharities.map((charity) => {
                const isSelected = selectedCharityId === charity.id;

                return (
                  <article
                    key={charity.id}
                    style={{
                      ...styles.charityCard,
                      ...(isSelected ? styles.selectedCard : {}),
                    }}
                  >
                    {/* IMAGE / ICON */}
                    <div style={styles.imageWrapper}>
                      {charity.image_url ? (
                        <img
                          src={charity.image_url}
                          alt={charity.name}
                          style={styles.charityImage}
                        />
                      ) : (
                        <div style={styles.imageFallback}>
                          ❤️
                        </div>
                      )}

                      {charity.is_featured && (
                        <div style={styles.featuredBadge}>⭐ Featured</div>
                      )}
                    </div>

                    {/* CONTENT */}
                    <div style={styles.cardContent}>
                      <div style={styles.categoryBadge}>
                        {charity.category || "Community"}
                      </div>

                      <h3 style={styles.charityName}>{charity.name}</h3>

                      <p style={styles.charityDescription}>
                        {charity.description ||
                          "Supporting meaningful causes and helping communities create a better future."}
                      </p>

                      {charity.long_description && (
                        <p style={styles.longDescription}>
                          {charity.long_description}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectCharity(charity.id)}
                        style={{
                          ...styles.selectButton,
                          ...(isSelected ? styles.selectedButton : {}),
                        }}
                      >
                        {isSelected ? "✓ Selected" : "Select Charity"}
                      </button>

                      {charity.website_url && (
                        <a
                          href={charity.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.websiteLink}
                        >
                          Visit charity website ↗
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* CONTRIBUTION PANEL */}
        {selectedCharity && (
          <section style={styles.contributionCard}>
            <div style={styles.contributionHeader}>
              <div>
                <div style={styles.contributionLabel}>
                  YOUR CONTRIBUTION
                </div>

                <h2 style={styles.contributionTitle}>
                  Support {selectedCharity.name}
                </h2>

                <p style={styles.contributionText}>
                  Choose the percentage you want to contribute to this charity.
                </p>
              </div>

              <div style={styles.bigPercent}>
                {contributionPercent}%
              </div>
            </div>

            <div style={styles.sliderRow}>
              <span style={styles.sliderLabel}>{MIN_CONTRIBUTION}%</span>

              <input
                type="range"
                min={MIN_CONTRIBUTION}
                max={MAX_CONTRIBUTION}
                step="1"
                value={contributionPercent}
                onChange={(e) =>
                  handleContributionChange(e.target.value)
                }
                style={styles.slider}
              />

              <span style={styles.sliderLabel}>{MAX_CONTRIBUTION}%</span>
            </div>

            <div style={styles.optionGrid}>
              {contributionOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleContributionChange(option)}
                  style={{
                    ...styles.optionButton,
                    ...(contributionPercent === option
                      ? styles.activeOptionButton
                      : {}),
                  }}
                >
                  {option}%
                </button>
              ))}
            </div>

            <div style={styles.minimumNotice}>
              🔒 Your contribution must be between{" "}
              <strong>{MIN_CONTRIBUTION}%</strong> and{" "}
              <strong>{MAX_CONTRIBUTION}%</strong>.
            </div>

            <button
              type="button"
              onClick={saveSelection}
              disabled={saving}
              style={{
                ...styles.saveButton,
                ...(saving ? styles.disabledButton : {}),
              }}
            >
              {saving ? "Saving..." : "💾 Save Charity Selection"}
            </button>
          </section>
        )}

        {/* EVENTS */}
        <section style={styles.eventsCard}>
          <div style={styles.eventsIcon}>📅</div>

          <div>
            <h2 style={styles.eventsTitle}>Charity Events</h2>
            <p style={styles.eventsText}>
              Upcoming charity events will appear here as they are added by
              administrators.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
    padding: "40px 20px 80px",
    boxSizing: "border-box",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  hero: {
    textAlign: "center",
    marginBottom: "40px",
  },

  heroBadge: {
    display: "inline-block",
    padding: "8px 16px",
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "1px",
    marginBottom: "18px",
  },

  heroTitle: {
    margin: 0,
    fontSize: "clamp(32px, 5vw, 58px)",
    lineHeight: 1.05,
    fontWeight: "900",
    color: "#111827",
  },

  heroTitleAccent: {
    color: "#7c3aed",
  },

  heroText: {
    maxWidth: "720px",
    margin: "20px auto 0",
    fontSize: "17px",
    lineHeight: 1.7,
    color: "#6b7280",
  },

  currentCard: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "22px",
    marginBottom: "28px",
    background: "#ffffff",
    border: "1px solid #ddd6fe",
    borderRadius: "20px",
    boxShadow: "0 12px 35px rgba(124, 58, 237, 0.08)",
  },

  currentIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dcfce7",
    color: "#15803d",
    fontSize: "22px",
    fontWeight: "900",
    flexShrink: 0,
  },

  currentContent: {
    flex: 1,
  },

  currentLabel: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#7c3aed",
    letterSpacing: "1px",
  },

  currentTitle: {
    margin: "4px 0",
    color: "#111827",
    fontSize: "20px",
    fontWeight: "800",
  },

  currentText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "14px",
  },

  currentPercent: {
    fontSize: "24px",
    fontWeight: "900",
    color: "#7c3aed",
    padding: "10px 18px",
    background: "#f5f3ff",
    borderRadius: "14px",
  },

  controls: {
    display: "flex",
    gap: "14px",
    marginBottom: "28px",
  },

  searchWrapper: {
    position: "relative",
    flex: 1,
  },

  searchIcon: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "18px",
  },

  searchInput: {
    width: "100%",
    height: "52px",
    padding: "0 18px 0 48px",
    border: "1px solid #d1d5db",
    borderRadius: "14px",
    background: "#ffffff",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },

  categorySelect: {
    width: "220px",
    height: "52px",
    padding: "0 16px",
    border: "1px solid #d1d5db",
    borderRadius: "14px",
    background: "#ffffff",
    fontSize: "15px",
    color: "#374151",
    cursor: "pointer",
  },

  errorBox: {
    padding: "14px 18px",
    marginBottom: "20px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "12px",
    fontSize: "14px",
  },

  successBox: {
    padding: "14px 18px",
    marginBottom: "20px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "26px",
    fontWeight: "850",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "22px",
  },

  charityCard: {
    overflow: "hidden",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "22px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    transition: "all 0.2s ease",
  },

  selectedCard: {
    border: "2px solid #7c3aed",
    boxShadow: "0 15px 40px rgba(124, 58, 237, 0.15)",
  },

  imageWrapper: {
    height: "170px",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
  },

  charityImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  imageFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "60px",
  },

  featuredBadge: {
    position: "absolute",
    top: "14px",
    left: "14px",
    padding: "7px 11px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.94)",
    color: "#92400e",
    fontSize: "12px",
    fontWeight: "800",
  },

  cardContent: {
    padding: "22px",
  },

  categoryBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#f3f4f6",
    color: "#4b5563",
    fontSize: "11px",
    fontWeight: "800",
    marginBottom: "12px",
  },

  charityName: {
    margin: "0 0 10px",
    fontSize: "21px",
    fontWeight: "850",
    color: "#111827",
  },

  charityDescription: {
    margin: "0 0 10px",
    color: "#6b7280",
    lineHeight: 1.6,
    fontSize: "14px",
    minHeight: "66px",
  },

  longDescription: {
    margin: "0 0 15px",
    color: "#6b7280",
    lineHeight: 1.6,
    fontSize: "13px",
  },

  selectButton: {
    width: "100%",
    border: "none",
    padding: "13px 16px",
    borderRadius: "12px",
    background: "#111827",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "800",
    cursor: "pointer",
  },

  selectedButton: {
    background: "#7c3aed",
  },

  websiteLink: {
    display: "block",
    marginTop: "12px",
    textAlign: "center",
    color: "#7c3aed",
    fontSize: "13px",
    fontWeight: "700",
    textDecoration: "none",
  },

  contributionCard: {
    marginTop: "42px",
    padding: "30px",
    background: "#111827",
    borderRadius: "24px",
    color: "#ffffff",
    boxShadow: "0 20px 50px rgba(17, 24, 39, 0.18)",
  },

  contributionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  contributionLabel: {
    color: "#c4b5fd",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "1px",
  },

  contributionTitle: {
    margin: "6px 0",
    fontSize: "26px",
    fontWeight: "850",
  },

  contributionText: {
    margin: 0,
    color: "#d1d5db",
    fontSize: "14px",
  },

  bigPercent: {
    minWidth: "100px",
    textAlign: "center",
    padding: "16px",
    borderRadius: "18px",
    background: "#7c3aed",
    fontSize: "30px",
    fontWeight: "900",
  },

  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginTop: "30px",
  },

  sliderLabel: {
    color: "#d1d5db",
    fontSize: "13px",
    fontWeight: "700",
    minWidth: "35px",
  },

  slider: {
    flex: 1,
    accentColor: "#a78bfa",
    cursor: "pointer",
  },

  optionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "8px",
    marginTop: "20px",
  },

  optionButton: {
    padding: "11px 5px",
    border: "1px solid #374151",
    borderRadius: "10px",
    background: "#1f2937",
    color: "#d1d5db",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },

  activeOptionButton: {
    background: "#a78bfa",
    color: "#111827",
    borderColor: "#a78bfa",
  },

  minimumNotice: {
    marginTop: "20px",
    padding: "12px 15px",
    borderRadius: "10px",
    background: "#1f2937",
    color: "#d1d5db",
    fontSize: "13px",
  },

  saveButton: {
    width: "100%",
    marginTop: "20px",
    padding: "15px",
    border: "none",
    borderRadius: "13px",
    background: "#ffffff",
    color: "#111827",
    fontSize: "15px",
    fontWeight: "850",
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  eventsCard: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginTop: "28px",
    padding: "24px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
  },

  eventsIcon: {
    fontSize: "34px",
  },

  eventsTitle: {
    margin: "0 0 5px",
    fontSize: "19px",
    fontWeight: "800",
    color: "#111827",
  },

  eventsText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  emptyCard: {
    textAlign: "center",
    padding: "60px 20px",
    background: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #e5e7eb",
  },

  emptyIcon: {
    fontSize: "40px",
  },

  emptyTitle: {
    margin: "12px 0 6px",
    color: "#111827",
  },

  emptyText: {
    margin: 0,
    color: "#6b7280",
  },

  loadingCard: {
    maxWidth: "500px",
    margin: "100px auto",
    textAlign: "center",
    padding: "50px 25px",
    background: "#ffffff",
    borderRadius: "22px",
    boxShadow: "0 15px 40px rgba(15, 23, 42, 0.08)",
  },

  loadingIcon: {
    fontSize: "50px",
  },

  loadingTitle: {
    color: "#111827",
    marginBottom: "8px",
  },

  loadingText: {
    color: "#6b7280",
    margin: 0,
  },
};

export default Charities;