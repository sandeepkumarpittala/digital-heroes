import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function AdminReports() {
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [draws, setDraws] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [winners, setWinners] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [charities, setCharities] = useState([]);
  const [userCharities, setUserCharities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const [
        usersResult,
        subscriptionsResult,
        drawsResult,
        prizesResult,
        winnersResult,
        payoutsResult,
        charitiesResult,
        userCharitiesResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("subscriptions")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("draws")
          .select("*")
          .order("draw_date", { ascending: false }),

        supabase
          .from("prizes")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("winners")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("winner_payouts")
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

      if (usersResult.error) throw usersResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (drawsResult.error) throw drawsResult.error;
      if (prizesResult.error) throw prizesResult.error;
      if (winnersResult.error) throw winnersResult.error;
      if (payoutsResult.error) throw payoutsResult.error;
      if (charitiesResult.error) throw charitiesResult.error;
      if (userCharitiesResult.error) throw userCharitiesResult.error;

      setUsers(usersResult.data || []);
      setSubscriptions(subscriptionsResult.data || []);
      setDraws(drawsResult.data || []);
      setPrizes(prizesResult.data || []);
      setWinners(winnersResult.data || []);
      setPayouts(payoutsResult.data || []);
      setCharities(charitiesResult.data || []);
      setUserCharities(userCharitiesResult.data || []);
    } catch (err) {
      console.error("Admin reports error:", err);
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getCharityName(charityId) {
    const charity = charities.find(
      (item) => item.id === charityId
    );

    return charity?.name || "Not selected";
  }

  function getLatestActiveUserCharity(userId) {
    return (
      userCharities.find(
        (item) =>
          item.user_id === userId &&
          item.is_active === true
      ) || null
    );
  }

  /*
    ==============================
    BASIC REPORT METRICS
    ==============================
  */

  const totalUsers = users.length;

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active"
  );

  const activeSubscriberCount = activeSubscriptions.length;

  const totalPrizePool = draws.reduce(
    (sum, draw) =>
      sum + Number(draw.total_prize_pool || 0),
    0
  );

  const totalPrizeAmounts = prizes.reduce(
  (sum, prize) => sum + Number(prize.prize_pool_amount || 0),
  0
);

  const totalWinners = winners.length;

  const paidPayouts = payouts.filter(
    (payout) => payout.status === "paid"
  );

  const pendingPayouts = payouts.filter(
    (payout) =>
      payout.status === "pending" ||
      payout.status === "processing"
  );

  const totalPayoutAmount = payouts.reduce(
    (sum, payout) =>
      sum + Number(payout.amount || 0),
    0
  );

  const paidPayoutAmount = paidPayouts.reduce(
    (sum, payout) =>
      sum + Number(payout.amount || 0),
    0
  );

  const pendingPayoutAmount = pendingPayouts.reduce(
    (sum, payout) =>
      sum + Number(payout.amount || 0),
    0
  );

  /*
    ==============================
    DRAW STATISTICS
    ==============================
  */

  const draftDraws = draws.filter(
    (draw) => draw.status === "draft"
  ).length;

  const publishedDraws = draws.filter(
    (draw) => draw.status === "published"
  ).length;

  const completedDraws = draws.filter(
    (draw) => draw.status === "completed"
  ).length;

  const cancelledDraws = draws.filter(
    (draw) => draw.status === "cancelled"
  ).length;

  /*
    ==============================
    CHARITY CONTRIBUTIONS
    ==============================
    
    The amount below is calculated from:
    
    active subscription amount
    ×
    current user charity contribution %
    
    This gives an estimated subscription
    charity contribution for reporting.
  */

  const charityReports = useMemo(() => {
    const reportMap = {};

    charities.forEach((charity) => {
      reportMap[charity.id] = {
        charityId: charity.id,
        charityName: charity.name,
        users: 0,
        contributionPercentTotal: 0,
        contributionAmount: 0,
      };
    });

    activeSubscriptions.forEach((subscription) => {
      const userCharity = getLatestActiveUserCharity(
        subscription.user_id
      );

      if (!userCharity) return;

      const charityId = userCharity.charity_id;

      if (!reportMap[charityId]) {
        reportMap[charityId] = {
          charityId,
          charityName: getCharityName(charityId),
          users: 0,
          contributionPercentTotal: 0,
          contributionAmount: 0,
        };
      }

      const contributionPercent = Number(
        userCharity.contribution_percent || 0
      );

      const subscriptionAmount = Number(
        subscription.amount || 0
      );

      const contributionAmount =
        (subscriptionAmount * contributionPercent) / 100;

      reportMap[charityId].users += 1;

      reportMap[charityId].contributionPercentTotal +=
        contributionPercent;

      reportMap[charityId].contributionAmount +=
        contributionAmount;
    });

    return Object.values(reportMap)
      .filter((item) => item.users > 0)
      .sort(
        (a, b) =>
          b.contributionAmount -
          a.contributionAmount
      );
  }, [
    charities,
    activeSubscriptions,
    userCharities,
  ]);

  const totalCharityContribution =
    charityReports.reduce(
      (sum, charity) =>
        sum + Number(charity.contributionAmount || 0),
      0
    );

  /*
    ==============================
    RECENT DRAWS
    ==============================
  */

  const recentDraws = draws.slice(0, 8);

  /*
    ==============================
    RECENT WINNERS
    ==============================
  */

  const recentWinners = winners.slice(0, 8);

  /*
    ==============================
    LOADING
    ==============================
  */

  if (loading) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>Loading Reports...</h2>
          <p>
            Preparing your admin analytics dashboard.
          </p>
        </div>
      </div>
    );
  }

  /*
    ==============================
    PAGE
    ==============================
  */

  return (
    <div className="page-container">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <p className="eyebrow">ADMIN PANEL</p>

          <h1>Reports & Analytics</h1>

          <p>
            Monitor users, subscriptions, prize pools,
            charity contributions, draws and payouts.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadReports}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* MAIN STATS */}

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
            <span>Active Subscribers</span>

            <strong>
              {activeSubscriberCount}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎰</div>

          <div>
            <span>Total Prize Pool</span>

            <strong>
              {formatCurrency(totalPrizePool)}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">❤️</div>

          <div>
            <span>Charity Contributions</span>

            <strong>
              {formatCurrency(
                totalCharityContribution
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* SECONDARY STATS */}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎯</div>

          <div>
            <span>Total Draws</span>

            <strong>{draws.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>

          <div>
            <span>Total Winners</span>

            <strong>{totalWinners}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>

          <div>
            <span>Paid Payouts</span>

            <strong>
              {formatCurrency(paidPayoutAmount)}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>

          <div>
            <span>Pending Payouts</span>

            <strong>
              {formatCurrency(pendingPayoutAmount)}
            </strong>
          </div>
        </div>
      </div>

      {/* DRAW STATISTICS */}

      <div className="card">
        <div className="section-header">
          <div>
            <h2>Draw Statistics</h2>

            <p>
              Current draw status across the platform.
            </p>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <span>Draft Draws</span>

            <strong>{draftDraws}</strong>
          </div>

          <div className="detail-card">
            <span>Published Draws</span>

            <strong>{publishedDraws}</strong>
          </div>

          <div className="detail-card">
            <span>Completed Draws</span>

            <strong>{completedDraws}</strong>
          </div>

          <div className="detail-card">
            <span>Cancelled Draws</span>

            <strong>{cancelledDraws}</strong>
          </div>

          <div className="detail-card">
            <span>Total Prize Records</span>

            <strong>{prizes.length}</strong>
          </div>

          <div className="detail-card">
            <span>Prize Amount Records</span>

            <strong>
              {formatCurrency(totalPrizeAmounts)}
            </strong>
          </div>

          <div className="detail-card">
            <span>Total Payout Records</span>

            <strong>{payouts.length}</strong>
          </div>

          <div className="detail-card">
            <span>Total Payout Amount</span>

            <strong>
              {formatCurrency(totalPayoutAmount)}
            </strong>
          </div>
        </div>
      </div>

      {/* CHARITY CONTRIBUTIONS */}

      <div className="card">
        <div className="section-header">
          <div>
            <h2>Charity Contributions</h2>

            <p>
              Contribution estimates from active
              subscriptions and current charity selections.
            </p>
          </div>
        </div>

        {charityReports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❤️</div>

            <h3>No charity contributions yet</h3>

            <p>
              Active subscriber charity selections
              will appear here.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Charity</th>
                  <th>Users</th>
                  <th>Contribution %</th>
                  <th>Estimated Amount</th>
                </tr>
              </thead>

              <tbody>
                {charityReports.map((charity) => (
                  <tr key={charity.charityId}>
                    <td>
                      <strong>
                        {charity.charityName}
                      </strong>
                    </td>

                    <td>{charity.users}</td>

                    <td>
                      {charity.contributionPercentTotal}%
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          charity.contributionAmount
                        )}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECENT DRAWS */}

      <div className="card">
        <div className="section-header">
          <div>
            <h2>Recent Draws</h2>

            <p>
              Latest draw activity.
            </p>
          </div>
        </div>

        {recentDraws.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>

            <h3>No draws found</h3>

            <p>
              Draws will appear here when created.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Draw</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Prize Pool</th>
                </tr>
              </thead>

              <tbody>
                {recentDraws.map((draw) => (
                  <tr key={draw.id}>
                    <td>
                      <strong>
                        {draw.draw_name || "Unnamed Draw"}
                      </strong>
                    </td>

                    <td>
                      {formatDate(draw.draw_date)}
                    </td>

                    <td>
                      <span
                        className={
                          draw.status === "completed"
                            ? "status-badge success"
                            : "status-badge"
                        }
                      >
                        {draw.status}
                      </span>
                    </td>

                    <td>
                      {formatCurrency(
                        draw.total_prize_pool
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECENT WINNERS */}

      <div className="card">
        <div className="section-header">
          <div>
            <h2>Recent Winners</h2>

            <p>
              Latest winner records and prize amounts.
            </p>
          </div>
        </div>

        {recentWinners.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>

            <h3>No winners yet</h3>

            <p>
              Winner records will appear here.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Winner</th>
                  <th>Match Count</th>
                  <th>Prize</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentWinners.map((winner) => (
                  <tr key={winner.id}>
                    <td>
                      <strong>
                        {users.find(
                          (user) =>
                            user.id === winner.user_id
                        )?.full_name ||
                          "Unknown User"}
                      </strong>
                    </td>

                    <td>
                      {winner.match_count}
                    </td>

                    <td>
                      {formatCurrency(
                        winner.prize_amount
                      )}
                    </td>

                    <td>
                      <span
                        className={
                          winner.status === "verified"
                            ? "status-badge success"
                            : "status-badge"
                        }
                      >
                        {winner.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminReports;