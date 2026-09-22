import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const emptyUser = {
  id: "",
  full_name: "",
  phone: "",
  role: "user",
  avatar_url: "",
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [scores, setScores] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [charities, setCharities] = useState([]);
  const [userCharities, setUserCharities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAdminUsers();
  }, []);

  async function loadAdminUsers() {
    try {
      setLoading(true);
      setError("");

      const [
        profilesResult,
        scoresResult,
        subscriptionsResult,
        paymentsResult,
        charitiesResult,
        userCharitiesResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("scores")
          .select("*")
          .order("score_date", { ascending: false }),

        supabase
          .from("subscriptions")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("payments")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("charities")
          .select("*")
          .order("name"),

        supabase
          .from("user_charities")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (scoresResult.error) throw scoresResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (charitiesResult.error) throw charitiesResult.error;
      if (userCharitiesResult.error) throw userCharitiesResult.error;

      setUsers(profilesResult.data || []);
      setScores(scoresResult.data || []);
      setSubscriptions(subscriptionsResult.data || []);
      setPayments(paymentsResult.data || []);
      setCharities(charitiesResult.data || []);
      setUserCharities(userCharitiesResult.data || []);
    } catch (err) {
      console.error("Admin users error:", err);
      setError(err.message || "Failed to load admin user data.");
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return users;

    return users.filter((user) => {
      return (
        (user.full_name || "").toLowerCase().includes(term) ||
        (user.phone || "").toLowerCase().includes(term) ||
        (user.role || "").toLowerCase().includes(term) ||
        (user.id || "").toLowerCase().includes(term)
      );
    });
  }, [users, search]);

  function getUserScores(userId) {
    return scores.filter((score) => score.user_id === userId);
  }

  function getUserSubscription(userId) {
    return subscriptions.find((sub) => sub.user_id === userId) || null;
  }

  function getUserPayments(userId) {
    return payments.filter((payment) => payment.user_id === userId);
  }

  function getUserCharity(userId) {
    return (
      userCharities.find(
        (item) =>
          item.user_id === userId &&
          item.is_active === true
      ) || null
    );
  }

  function getCharityName(charityId) {
    const charity = charities.find((item) => item.id === charityId);
    return charity?.name || "Not selected";
  }

  function getUserCharityName(userId) {
    const userCharity = getUserCharity(userId);

    if (!userCharity) {
      return "Not selected";
    }

    return getCharityName(userCharity.charity_id);
  }

  function getUserCharityContribution(userId) {
    const userCharity = getUserCharity(userId);

    return userCharity?.contribution_percent ?? 0;
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatCurrency(amount, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }

  function openUser(user) {
    setSelectedUser(user);
    setEditingUser(null);
  }

  function closeUser() {
    setSelectedUser(null);
    setEditingUser(null);
  }

  function startEditing(user) {
    setEditingUser({
      id: user.id,
      full_name: user.full_name || "",
      phone: user.phone || "",
      role: user.role || "user",
      avatar_url: user.avatar_url || "",
    });
  }

  function cancelEditing() {
    setEditingUser(null);
  }

  async function saveUserProfile() {
    if (!editingUser?.id) return;

    if (!editingUser.full_name.trim()) {
      alert("Full name is required.");
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: editingUser.full_name.trim(),
          phone: editingUser.phone.trim() || null,
          role: editingUser.role,
          avatar_url: editingUser.avatar_url.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingUser.id)
        .select()
        .single();

      if (error) throw error;

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === data.id ? { ...user, ...data } : user
        )
      );

      setSelectedUser(data);
      setEditingUser(null);

      alert("User profile updated successfully.");
    } catch (err) {
      console.error("Save user error:", err);
      alert(err.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  }

  async function updateScore(scoreId, newScore) {
    const numericScore = Number(newScore);

    if (
      !Number.isInteger(numericScore) ||
      numericScore < 1 ||
      numericScore > 45
    ) {
      alert("Stableford score must be an integer between 1 and 45.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("scores")
        .update({
          stableford_score: numericScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scoreId)
        .select()
        .single();

      if (error) throw error;

      setScores((currentScores) =>
        currentScores.map((score) =>
          score.id === data.id ? { ...score, ...data } : score
        )
      );

      alert("Score updated successfully.");
    } catch (err) {
      console.error("Update score error:", err);
      alert(err.message || "Failed to update score.");
    }
  }

  async function updateSubscription(subscriptionId, status) {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId)
        .select()
        .single();

      if (error) throw error;

      setSubscriptions((currentSubscriptions) =>
        currentSubscriptions.map((subscription) =>
          subscription.id === data.id
            ? { ...subscription, ...data }
            : subscription
        )
      );

      alert("Subscription status updated successfully.");
    } catch (err) {
      console.error("Update subscription error:", err);
      alert(err.message || "Failed to update subscription.");
    }
  }

  const totalUsers = users.length;

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active"
  ).length;

  const totalPayments = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  if (loading) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>Loading Admin Users...</h2>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <p className="eyebrow">ADMIN PANEL</p>

          <h1>User Management</h1>

          <p>
            Manage user profiles, scores, subscriptions and payment history.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadAdminUsers}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>

          <div>
            <span>Total Users</span>
            <strong>{totalUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💳</div>

          <div>
            <span>Active Subscriptions</span>
            <strong>{activeSubscriptions}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⛳</div>

          <div>
            <span>Total Scores</span>
            <strong>{scores.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>

          <div>
            <span>Paid Payments</span>
            <strong>{formatCurrency(totalPayments)}</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h2>All Users</h2>

            <p>
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        </div>

        <div className="search-row">
          <input
            type="text"
            placeholder="Search by name, phone, role or user ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="search-input"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>

            <h3>No users found</h3>

            <p>Try another search.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Scores</th>
                  <th>Subscription</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => {
                  const userScores = getUserScores(user.id);
                  const subscription = getUserSubscription(user.id);

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.full_name
                              ? user.full_name.charAt(0).toUpperCase()
                              : "U"}
                          </div>

                          <div>
                            <strong>
                              {user.full_name || "Unnamed User"}
                            </strong>

                            <small>
                              {user.phone || "No phone"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="status-badge">
                          {user.role || "user"}
                        </span>
                      </td>

                      <td>{userScores.length}</td>

                      <td>
                        <span
                          className={
                            subscription?.status === "active"
                              ? "status-badge success"
                              : "status-badge"
                          }
                        >
                          {subscription?.status || "No subscription"}
                        </span>
                      </td>

                      <td>{formatDate(user.created_at)}</td>

                      <td>
                        <button
                          className="primary-button small"
                          onClick={() => openUser(user)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div
          className="modal-overlay"
          onClick={closeUser}
        >
          <div
            className="modal-card large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">USER DETAILS</p>

                <h2>
                  {selectedUser.full_name || "Unnamed User"}
                </h2>
              </div>

              <button
                className="close-button"
                onClick={closeUser}
              >
                ×
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-card">
                <span>Full Name</span>

                <strong>
                  {selectedUser.full_name || "—"}
                </strong>
              </div>

              <div className="detail-card">
                <span>Phone</span>

                <strong>
                  {selectedUser.phone || "—"}
                </strong>
              </div>

              <div className="detail-card">
                <span>Role</span>

                <strong>
                  {selectedUser.role || "user"}
                </strong>
              </div>

              <div className="detail-card">
                <span>User ID</span>

                <strong className="break-text">
                  {selectedUser.id}
                </strong>
              </div>
            </div>

            <div className="modal-section">
              <div className="section-header">
                <div>
                  <h3>Profile</h3>

                  <p>
                    Administrator can edit the user's profile.
                  </p>
                </div>

                {!editingUser && (
                  <button
                    className="secondary-button"
                    onClick={() => startEditing(selectedUser)}
                  >
                    ✏️ Edit Profile
                  </button>
                )}
              </div>

              {editingUser ? (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>

                    <input
                      value={editingUser.full_name}
                      onChange={(event) =>
                        setEditingUser({
                          ...editingUser,
                          full_name: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone</label>

                    <input
                      value={editingUser.phone}
                      onChange={(event) =>
                        setEditingUser({
                          ...editingUser,
                          phone: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Role</label>

                    <select
                      value={editingUser.role}
                      onChange={(event) =>
                        setEditingUser({
                          ...editingUser,
                          role: event.target.value,
                        })
                      }
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Avatar URL</label>

                    <input
                      value={editingUser.avatar_url}
                      onChange={(event) =>
                        setEditingUser({
                          ...editingUser,
                          avatar_url: event.target.value,
                        })
                      }
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      className="secondary-button"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      Cancel
                    </button>

                    <button
                      className="primary-button"
                      onClick={saveUserProfile}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="modal-section">
              <div className="section-header">
                <div>
                  <h3>Golf Scores</h3>

                  <p>
                    Admin can correct a user's Stableford score.
                  </p>
                </div>
              </div>

              {getUserScores(selectedUser.id).length === 0 ? (
                <div className="mini-empty">
                  No scores entered.
                </div>
              ) : (
                <div className="score-list">
                  {getUserScores(selectedUser.id).map((score) => (
                    <div
                      className="score-row"
                      key={score.id}
                    >
                      <div>
                        <strong>
                          {formatDate(score.score_date)}
                        </strong>

                        <small>
                          {score.notes || "No notes"}
                        </small>
                      </div>

                      <div className="score-edit">
                        <input
                          type="number"
                          min="1"
                          max="45"
                          defaultValue={score.stableford_score}
                          id={`score-${score.id}`}
                        />

                        <button
                          className="secondary-button small"
                          onClick={() => {
                            const input =
                              document.getElementById(
                                `score-${score.id}`
                              );

                            updateScore(
                              score.id,
                              input.value
                            );
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-section">
              <div className="section-header">
                <div>
                  <h3>Subscription</h3>

                  <p>
                    Current subscription information.
                  </p>
                </div>
              </div>

              {(() => {
                const subscription =
                  getUserSubscription(selectedUser.id);

                if (!subscription) {
                  return (
                    <div className="mini-empty">
                      No subscription record found.
                    </div>
                  );
                }

                return (
                  <div className="subscription-admin-card">
                    <div className="detail-grid">
                      <div className="detail-card">
                        <span>Plan</span>

                        <strong>
                          {subscription.plan || "—"}
                        </strong>
                      </div>

                      <div className="detail-card">
                        <span>Amount</span>

                        <strong>
                          {formatCurrency(
                            subscription.amount,
                            subscription.currency
                          )}
                        </strong>
                      </div>

                      <div className="detail-card">
                        <span>
                          Charity Contribution
                        </span>

                        <strong>
                          {getUserCharityContribution(
                            selectedUser.id
                          )}
                          %
                        </strong>
                      </div>

                      <div className="detail-card">
                        <span>Charity</span>

                        <strong>
                          {getUserCharityName(
                            selectedUser.id
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Subscription Status</label>

                      <select
                        value={subscription.status}
                        onChange={(event) =>
                          updateSubscription(
                            subscription.id,
                            event.target.value
                          )
                        }
                      >
                        <option value="active">
                          Active
                        </option>

                        <option value="inactive">
                          Inactive
                        </option>

                        <option value="cancelled">
                          Cancelled
                        </option>

                        <option value="past_due">
                          Past Due
                        </option>

                        <option value="trialing">
                          Trialing
                        </option>
                      </select>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="modal-section">
              <div className="section-header">
                <div>
                  <h3>Payment History</h3>

                  <p>
                    Payments recorded for this user.
                  </p>
                </div>
              </div>

              {getUserPayments(selectedUser.id).length === 0 ? (
                <div className="mini-empty">
                  No payments found.
                </div>
              ) : (
                <div className="payment-list">
                  {getUserPayments(selectedUser.id).map(
                    (payment) => (
                      <div
                        className="payment-row"
                        key={payment.id}
                      >
                        <div>
                          <strong>
                            {formatCurrency(
                              payment.amount,
                              payment.currency
                            )}
                          </strong>

                          <small>
                            {payment.payment_provider ||
                              "Unknown provider"}
                          </small>
                        </div>

                        <div>
                          <span
                            className={
                              payment.status === "paid"
                                ? "status-badge success"
                                : "status-badge"
                            }
                          >
                            {payment.status}
                          </span>

                          <small>
                            {formatDate(payment.paid_at)}
                          </small>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={closeUser}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;