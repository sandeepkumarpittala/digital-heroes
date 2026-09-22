import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  long_description: "",
  image_url: "",
  website_url: "",
  category: "",
  is_featured: false,
  is_active: true,
};

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function AdminCharities() {
  const [charities, setCharities] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadCharities();
  }, []);

  async function loadCharities() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Please sign in.");
      }

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
          is_active,
          created_at,
          updated_at
        `
        )
        .order("created_at", { ascending: false });

      if (charityError) {
        throw charityError;
      }

      setCharities(charityData || []);
    } catch (err) {
      console.error("Load charities error:", err);
      setError(err.message || "Unable to load charities.");
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function openEditForm(charity) {
    setEditingId(charity.id);

    setForm({
      name: charity.name || "",
      slug: charity.slug || "",
      description: charity.description || "",
      long_description: charity.long_description || "",
      image_url: charity.image_url || "",
      website_url: charity.website_url || "",
      category: charity.category || "",
      is_featured: Boolean(charity.is_featured),
      is_active: Boolean(charity.is_active),
    });

    setMessage("");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleNameChange(value) {
    setForm((previous) => ({
      ...previous,
      name: value,
      slug: editingId ? previous.slug : createSlug(value),
    }));
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveCharity(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const name = form.name.trim();
    const slug = form.slug.trim() || createSlug(name);

    if (!name) {
      setError("Charity name is required.");
      return;
    }

    if (!slug) {
      setError("Charity slug is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        slug,
        description: form.description.trim() || null,
        long_description: form.long_description.trim() || null,
        image_url: form.image_url.trim() || null,
        website_url: form.website_url.trim() || null,
        category: form.category.trim() || null,
        is_featured: form.is_featured,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("charities")
          .update(payload)
          .eq("id", editingId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setCharities((previous) =>
          previous.map((charity) =>
            charity.id === editingId ? data : charity
          )
        );

        setMessage("Charity updated successfully.");
      } else {
        const { data, error: insertError } = await supabase
          .from("charities")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setCharities((previous) => [data, ...previous]);

        setMessage("Charity created successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      console.error("Save charity error:", err);

      if (err.code === "23505") {
        setError(
          "A charity with this slug already exists. Please use a different slug."
        );
      } else {
        setError(err.message || "Unable to save charity.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(charity) {
    setMessage("");
    setError("");

    try {
      const newStatus = !charity.is_active;

      const { data, error: updateError } = await supabase
        .from("charities")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", charity.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setCharities((previous) =>
        previous.map((item) => (item.id === charity.id ? data : item))
      );

      setMessage(
        `${charity.name} is now ${
          newStatus ? "active" : "inactive"
        }.`
      );
    } catch (err) {
      console.error("Toggle active error:", err);
      setError(err.message || "Unable to update charity status.");
    }
  }

  async function toggleFeatured(charity) {
    setMessage("");
    setError("");

    try {
      const newFeaturedStatus = !charity.is_featured;

      const { data, error: updateError } = await supabase
        .from("charities")
        .update({
          is_featured: newFeaturedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", charity.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setCharities((previous) =>
        previous.map((item) => (item.id === charity.id ? data : item))
      );

      setMessage(
        `${charity.name} ${
          newFeaturedStatus
            ? "is now featured."
            : "has been removed from featured."
        }`
      );
    } catch (err) {
      console.error("Toggle featured error:", err);
      setError(err.message || "Unable to update featured status.");
    }
  }

  const filteredCharities = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return charities.filter((charity) => {
      const matchesSearch =
        !searchText ||
        charity.name?.toLowerCase().includes(searchText) ||
        charity.slug?.toLowerCase().includes(searchText) ||
        charity.category?.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && charity.is_active) ||
        (statusFilter === "inactive" && !charity.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [charities, search, statusFilter]);

  const activeCount = charities.filter(
    (charity) => charity.is_active
  ).length;

  const featuredCount = charities.filter(
    (charity) => charity.is_featured
  ).length;

  const inactiveCount = charities.filter(
    (charity) => !charity.is_active
  ).length;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>❤️</div>
          <h2 style={styles.loadingTitle}>Loading charity management...</h2>
          <p style={styles.loadingText}>
            Fetching charities from Supabase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>ADMIN PANEL</div>

            <h1 style={styles.title}>Charity Management</h1>

            <p style={styles.subtitle}>
              Create, edit and manage the charities available to Digital
              Heroes members.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            style={styles.addButton}
          >
            + Add Charity
          </button>
        </div>

        {/* STATS */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>❤️</div>

            <div>
              <div style={styles.statValue}>{charities.length}</div>
              <div style={styles.statLabel}>Total Charities</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>🟢</div>

            <div>
              <div style={styles.statValue}>{activeCount}</div>
              <div style={styles.statLabel}>Active</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>⭐</div>

            <div>
              <div style={styles.statValue}>{featuredCount}</div>
              <div style={styles.statLabel}>Featured</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>⚪</div>

            <div>
              <div style={styles.statValue}>{inactiveCount}</div>
              <div style={styles.statLabel}>Inactive</div>
            </div>
          </div>
        </div>

        {/* MESSAGES */}
        {message && <div style={styles.successBox}>✓ {message}</div>}

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        {/* FILTERS */}
        <div style={styles.filters}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔎</span>

            <input
              type="text"
              placeholder="Search charities..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={styles.searchInput}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={styles.statusSelect}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* CHARITIES */}
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>All Charities</h2>

            <p style={styles.sectionSubtitle}>
              Showing {filteredCharities.length} of {charities.length}
            </p>
          </div>
        </div>

        {filteredCharities.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>🔍</div>

            <h3 style={styles.emptyTitle}>No charities found</h3>

            <p style={styles.emptyText}>
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredCharities.map((charity) => (
              <article key={charity.id} style={styles.charityCard}>
                {/* IMAGE */}
                <div style={styles.imageWrapper}>
                  {charity.image_url ? (
                    <img
                      src={charity.image_url}
                      alt={charity.name}
                      style={styles.image}
                    />
                  ) : (
                    <div style={styles.imageFallback}>❤️</div>
                  )}

                  <div
                    style={{
                      ...styles.statusBadge,
                      ...(charity.is_active
                        ? styles.activeBadge
                        : styles.inactiveBadge),
                    }}
                  >
                    {charity.is_active ? "● ACTIVE" : "● INACTIVE"}
                  </div>
                </div>

                {/* CARD CONTENT */}
                <div style={styles.cardContent}>
                  <div style={styles.cardTopRow}>
                    <span style={styles.categoryBadge}>
                      {charity.category || "Community"}
                    </span>

                    {charity.is_featured && (
                      <span style={styles.featuredBadge}>⭐ Featured</span>
                    )}
                  </div>

                  <h3 style={styles.charityName}>{charity.name}</h3>

                  <p style={styles.slug}>/{charity.slug}</p>

                  <p style={styles.description}>
                    {charity.description ||
                      "No short description provided."}
                  </p>

                  <div style={styles.actions}>
                    <button
                      type="button"
                      onClick={() => openEditForm(charity)}
                      style={styles.editButton}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFeatured(charity)}
                      style={styles.secondaryButton}
                    >
                      {charity.is_featured
                        ? "★ Unfeature"
                        : "☆ Feature"}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleActive(charity)}
                      style={styles.secondaryButton}
                    >
                      {charity.is_active
                        ? "⏸ Deactivate"
                        : "▶ Activate"}
                    </button>
                  </div>

                  {charity.website_url && (
                    <a
                      href={charity.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.websiteLink}
                    >
                      Visit website ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* FORM MODAL */}
        {showForm && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <div>
                  <div style={styles.modalBadge}>
                    {editingId ? "EDIT CHARITY" : "NEW CHARITY"}
                  </div>

                  <h2 style={styles.modalTitle}>
                    {editingId ? "Edit Charity" : "Add Charity"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  style={styles.closeButton}
                >
                  ×
                </button>
              </div>

              <form onSubmit={saveCharity}>
                <div style={styles.formGrid}>
                  <div style={styles.field}>
                    <label style={styles.label}>Charity Name *</label>

                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={(event) =>
                        handleNameChange(event.target.value)
                      }
                      placeholder="Example: Hope Foundation"
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Slug *</label>

                    <input
                      type="text"
                      name="slug"
                      value={form.slug}
                      onChange={handleChange}
                      placeholder="hope-foundation"
                      style={styles.input}
                      required
                    />

                    <span style={styles.helpText}>
                      Used in the charity URL/identifier.
                    </span>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Category</label>

                    <input
                      type="text"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      placeholder="Education"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Website URL</label>

                    <input
                      type="url"
                      name="website_url"
                      value={form.website_url}
                      onChange={handleChange}
                      placeholder="https://example.org"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.fieldFull}>
                    <label style={styles.label}>Image URL</label>

                    <input
                      type="url"
                      name="image_url"
                      value={form.image_url}
                      onChange={handleChange}
                      placeholder="https://example.org/image.jpg"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.fieldFull}>
                    <label style={styles.label}>Short Description</label>

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Briefly explain what this charity does..."
                      rows="3"
                      style={styles.textarea}
                    />
                  </div>

                  <div style={styles.fieldFull}>
                    <label style={styles.label}>Long Description</label>

                    <textarea
                      name="long_description"
                      value={form.long_description}
                      onChange={handleChange}
                      placeholder="Provide more detailed information about the charity..."
                      rows="5"
                      style={styles.textarea}
                    />
                  </div>
                </div>

                {/* TOGGLES */}
                <div style={styles.toggleRow}>
                  <label style={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      name="is_featured"
                      checked={form.is_featured}
                      onChange={handleChange}
                    />

                    <span>⭐ Featured charity</span>
                  </label>

                  <label style={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                    />

                    <span>🟢 Active charity</span>
                  </label>
                </div>

                <div style={styles.formActions}>
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    style={styles.saveButton}
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Save Changes"
                      : "Create Charity"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
    maxWidth: "1250px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "30px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "#ede9fe",
    color: "#6d28d9",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: "clamp(30px, 4vw, 44px)",
    fontWeight: "900",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "15px",
    lineHeight: 1.6,
  },

  addButton: {
    border: "none",
    borderRadius: "13px",
    padding: "14px 20px",
    background: "#7c3aed",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "800",
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 10px 25px rgba(124, 58, 237, 0.22)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "25px",
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    boxShadow: "0 8px 25px rgba(15, 23, 42, 0.05)",
  },

  statIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f3ff",
    fontSize: "21px",
  },

  statValue: {
    color: "#111827",
    fontSize: "24px",
    fontWeight: "900",
  },

  statLabel: {
    color: "#6b7280",
    fontSize: "12px",
    marginTop: "2px",
  },

  successBox: {
    padding: "14px 18px",
    marginBottom: "20px",
    borderRadius: "12px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontWeight: "700",
    fontSize: "14px",
  },

  errorBox: {
    padding: "14px 18px",
    marginBottom: "20px",
    borderRadius: "12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontWeight: "600",
    fontSize: "14px",
  },

  filters: {
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
  },

  searchInput: {
    width: "100%",
    height: "50px",
    padding: "0 18px 0 45px",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: "13px",
    background: "#ffffff",
    outline: "none",
    fontSize: "14px",
  },

  statusSelect: {
    width: "190px",
    height: "50px",
    padding: "0 14px",
    border: "1px solid #d1d5db",
    borderRadius: "13px",
    background: "#ffffff",
    fontSize: "14px",
    color: "#374151",
  },

  sectionHeader: {
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "25px",
    fontWeight: "850",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "13px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "22px",
  },

  charityCard: {
    overflow: "hidden",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  },

  imageWrapper: {
    height: "165px",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
  },

  image: {
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
    fontSize: "55px",
  },

  statusBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    background: "#ffffff",
  },

  activeBadge: {
    color: "#15803d",
  },

  inactiveBadge: {
    color: "#b91c1c",
  },

  cardContent: {
    padding: "20px",
  },

  cardTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },

  categoryBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#f3f4f6",
    color: "#4b5563",
    fontSize: "10px",
    fontWeight: "800",
  },

  featuredBadge: {
    color: "#92400e",
    fontSize: "11px",
    fontWeight: "800",
  },

  charityName: {
    margin: "14px 0 3px",
    color: "#111827",
    fontSize: "21px",
    fontWeight: "850",
  },

  slug: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "11px",
  },

  description: {
    margin: "14px 0 18px",
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: 1.6,
    minHeight: "42px",
  },

  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },

  editButton: {
    gridColumn: "1 / -1",
    padding: "11px",
    border: "none",
    borderRadius: "10px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "10px 7px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#374151",
    fontWeight: "700",
    fontSize: "11px",
    cursor: "pointer",
  },

  websiteLink: {
    display: "block",
    marginTop: "13px",
    textAlign: "center",
    color: "#7c3aed",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "700",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "rgba(15, 23, 42, 0.65)",
    boxSizing: "border-box",
  },

  modal: {
    width: "100%",
    maxWidth: "760px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "28px",
    boxSizing: "border-box",
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.25)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "25px",
  },

  modalBadge: {
    color: "#7c3aed",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  modalTitle: {
    margin: "5px 0 0",
    color: "#111827",
    fontSize: "27px",
    fontWeight: "900",
  },

  closeButton: {
    width: "38px",
    height: "38px",
    border: "none",
    borderRadius: "50%",
    background: "#f3f4f6",
    color: "#374151",
    fontSize: "25px",
    cursor: "pointer",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  fieldFull: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    color: "#374151",
    fontSize: "12px",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    height: "46px",
    padding: "0 13px",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    outline: "none",
    fontSize: "14px",
  },

  textarea: {
    width: "100%",
    padding: "12px 13px",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    outline: "none",
    resize: "vertical",
    fontSize: "14px",
    fontFamily: "inherit",
    lineHeight: 1.5,
  },

  helpText: {
    color: "#9ca3af",
    fontSize: "10px",
  },

  toggleRow: {
    display: "flex",
    gap: "25px",
    flexWrap: "wrap",
    marginTop: "22px",
    padding: "15px",
    borderRadius: "12px",
    background: "#f9fafb",
  },

  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#374151",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "25px",
  },

  cancelButton: {
    padding: "12px 20px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#374151",
    fontWeight: "700",
    cursor: "pointer",
  },

  saveButton: {
    padding: "12px 22px",
    border: "none",
    borderRadius: "10px",
    background: "#7c3aed",
    color: "#ffffff",
    fontWeight: "800",
    cursor: "pointer",
  },

  emptyCard: {
    textAlign: "center",
    padding: "60px 20px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
  },

  emptyIcon: {
    fontSize: "40px",
  },

  emptyTitle: {
    color: "#111827",
    margin: "12px 0 6px",
  },

  emptyText: {
    color: "#6b7280",
    margin: 0,
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
  },

  loadingText: {
    color: "#6b7280",
  },
};

export default AdminCharities;