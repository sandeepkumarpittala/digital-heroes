import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function MyPayouts() {
  const [user, setUser] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [winners, setWinners] = useState([]);
  const [draws, setDraws] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadMyPayouts();
  }, []);

  const loadMyPayouts = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // Get logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setErrorMessage("Please sign in to view your winnings.");
        return;
      }

      setUser(user);

      // Get only this user's payouts
      const {
        data: payoutData,
        error: payoutError,
      } = await supabase
        .from("winner_payouts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (payoutError) {
        throw payoutError;
      }

      setPayouts(payoutData || []);

      // No payouts
      if (!payoutData || payoutData.length === 0) {
        setWinners([]);
        setDraws([]);
        return;
      }

      // Get winner IDs and draw IDs
      const winnerIds = [
        ...new Set(
          payoutData
            .map((item) => item.winner_id)
            .filter(Boolean)
        ),
      ];

      const drawIds = [
        ...new Set(
          payoutData
            .map((item) => item.draw_id)
            .filter(Boolean)
        ),
      ];

      // Get winner information
      if (winnerIds.length > 0) {
        const {
          data: winnerData,
          error: winnerError,
        } = await supabase
          .from("winners")
          .select("*")
          .in("id", winnerIds);

        if (winnerError) {
          throw winnerError;
        }

        setWinners(winnerData || []);
      }

      // Get draw information
      if (drawIds.length > 0) {
        const {
          data: drawData,
          error: drawError,
        } = await supabase
          .from("draws")
          .select("*")
          .in("id", drawIds);

        if (drawError) {
          throw drawError;
        }

        setDraws(drawData || []);
      }
    } catch (error) {
      console.error("My payouts error:", error);
      setErrorMessage(
        error?.message || "Unable to load your winnings."
      );
    } finally {
      setLoading(false);
    }
  };

  const getWinner = (winnerId) => {
    return winners.find((winner) => winner.id === winnerId);
  };

  const getDraw = (drawId) => {
    return draws.find((draw) => draw.id === drawId);
  };

  const getDrawName = (draw) => {
    if (!draw) return "Draw";

    return (
      draw.name ||
      draw.title ||
      draw.draw_name ||
      "Monthly Draw"
    );
  };

  const getDrawDate = (draw) => {
    if (!draw?.draw_date) return "—";

    return new Date(draw.draw_date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount, currency = "INR") => {
    const numericAmount = Number(amount || 0);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "—";

    return new Date(dateValue).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "paid":
        return "payout-status paid";

      case "processing":
        return "payout-status processing";

      case "failed":
        return "payout-status failed";

      case "cancelled":
        return "payout-status cancelled";

      default:
        return "payout-status pending";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "paid":
        return "PAID";

      case "processing":
        return "PROCESSING";

      case "failed":
        return "FAILED";

      case "cancelled":
        return "CANCELLED";

      default:
        return "PENDING";
    }
  };

  const totalWon = payouts.reduce((total, payout) => {
    return total + Number(payout.amount || 0);
  }, 0);

  const paidAmount = payouts
    .filter((payout) => payout.status === "paid")
    .reduce((total, payout) => {
      return total + Number(payout.amount || 0);
    }, 0);

  const pendingAmount = payouts
    .filter(
      (payout) =>
        payout.status === "pending" ||
        payout.status === "processing"
    )
    .reduce((total, payout) => {
      return total + Number(payout.amount || 0);
    }, 0);

  if (loading) {
    return (
      <div className="my-payouts-page">
        <div className="my-payouts-container">
          <div className="payout-loading">
            Loading your winnings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-payouts-page">
      <div className="my-payouts-container">

        {/* Header */}
        <div className="my-payouts-header">
          <div>
            <p className="page-eyebrow">WINNINGS</p>

            <h1>My Winnings</h1>

            <p className="page-description">
              View your prizes, verified winnings and payout status.
            </p>
          </div>

          <button
            className="refresh-payouts-button"
            onClick={loadMyPayouts}
          >
            Refresh
          </button>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="payout-error">
            {errorMessage}
          </div>
        )}

        {/* Summary */}
        <div className="payout-summary-grid">

          <div className="payout-summary-card">
            <span>Total Winnings</span>
            <strong>
              {formatCurrency(totalWon)}
            </strong>
          </div>

          <div className="payout-summary-card">
            <span>Paid</span>
            <strong>
              {formatCurrency(paidAmount)}
            </strong>
          </div>

          <div className="payout-summary-card">
            <span>Pending</span>
            <strong>
              {formatCurrency(pendingAmount)}
            </strong>
          </div>

          <div className="payout-summary-card">
            <span>Winning Records</span>
            <strong>
              {payouts.length}
            </strong>
          </div>

        </div>

        {/* No winnings */}
        {!errorMessage && payouts.length === 0 && (
          <div className="empty-payouts">
            <div className="empty-icon">🏆</div>

            <h2>No winnings yet</h2>

            <p>
              Your verified prizes and payout information will
              appear here when you win a draw.
            </p>
          </div>
        )}

        {/* Payout records */}
        {payouts.length > 0 && (
          <div className="payout-records-section">

            <div className="section-heading">
              <div>
                <p className="page-eyebrow">PAYOUT HISTORY</p>
                <h2>Your Payouts</h2>
              </div>
            </div>

            <div className="payout-records">

              {payouts.map((payout) => {
                const winner = getWinner(payout.winner_id);
                const draw = getDraw(payout.draw_id);

                return (
                  <div
                    className="payout-card"
                    key={payout.id}
                  >

                    {/* Top */}
                    <div className="payout-card-top">

                      <div>
                        <p className="payout-draw-name">
                          {getDrawName(draw)}
                        </p>

                        <p className="payout-draw-date">
                          Draw Date: {getDrawDate(draw)}
                        </p>
                      </div>

                      <span
                        className={getStatusClass(
                          payout.status
                        )}
                      >
                        {getStatusText(payout.status)}
                      </span>

                    </div>

                    {/* Main amount */}
                    <div className="payout-main">

                      <div>
                        <span className="detail-label">
                          Prize Amount
                        </span>

                        <strong className="payout-amount">
                          {formatCurrency(
                            payout.amount,
                            payout.currency
                          )}
                        </strong>
                      </div>

                      <div>
                        <span className="detail-label">
                          Claim Status
                        </span>

                        <strong className="verified-text">
  {payout.status === "paid" ||
  payout.status === "processing" ||
  payout.status === "pending"
    ? "✓ VERIFIED"
    : "UNDER REVIEW"}
</strong>
                      </div>

                      <div>
                        <span className="detail-label">
                          Match Count
                        </span>

                        <strong>
                          {winner?.match_count ?? "—"}
                        </strong>
                      </div>

                    </div>

                    {/* Payment details */}
                    <div className="payment-details">

                      <div className="payment-detail">
                        <span>Payment Method</span>
                        <strong>
                          {payout.payout_method || "—"}
                        </strong>
                      </div>

                      <div className="payment-detail">
                        <span>Transaction Reference</span>
                        <strong>
                          {payout.transaction_reference ||
                            "—"}
                        </strong>
                      </div>

                      <div className="payment-detail">
                        <span>Paid At</span>
                        <strong>
                          {formatDateTime(
                            payout.paid_at
                          )}
                        </strong>
                      </div>

                    </div>

                    {/* Notes */}
                    {payout.notes && (
                      <div className="payout-notes">
                        <span>Notes</span>
                        <p>{payout.notes}</p>
                      </div>
                    )}

                    {/* Status message */}
                    <div
                      className={`payout-message ${payout.status}`}
                    >
                      {payout.status === "paid" && (
                        <>
                          ✓ Your prize payout has been
                          completed successfully.
                        </>
                      )}

                      {payout.status === "processing" && (
                        <>
                          Your payout is currently being
                          processed.
                        </>
                      )}

                      {payout.status === "pending" && (
                        <>
                          Your winnings have been verified
                          and the payout is pending.
                        </>
                      )}

                      {payout.status === "failed" && (
                        <>
                          There was an issue processing this
                          payout. Please contact support.
                        </>
                      )}

                      {payout.status === "cancelled" && (
                        <>
                          This payout has been cancelled.
                        </>
                      )}
                    </div>

                  </div>
                );
              })}

            </div>
          </div>
        )}

      </div>

      <style>{`
        .my-payouts-page {
          min-height: 100vh;
          padding: 40px 20px 80px;
          background: #f7f7f2;
        }

        .my-payouts-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .my-payouts-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 30px;
        }

        .page-eyebrow {
          margin: 0 0 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.8px;
          color: #777;
        }

        .my-payouts-header h1 {
          margin: 0;
          font-size: 42px;
          line-height: 1.1;
          color: #1c241f;
        }

        .page-description {
          margin: 12px 0 0;
          color: #69716b;
          font-size: 16px;
        }

        .refresh-payouts-button {
          border: none;
          padding: 12px 18px;
          border-radius: 10px;
          background: #1d2a23;
          color: white;
          font-weight: 600;
          cursor: pointer;
        }

        .refresh-payouts-button:hover {
          opacity: 0.9;
        }

        .payout-error {
          margin-bottom: 20px;
          padding: 14px 16px;
          border-radius: 10px;
          background: #ffe9e9;
          color: #a00000;
          border: 1px solid #ffcaca;
        }

        .payout-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 35px;
        }

        .payout-summary-card {
          padding: 22px;
          border-radius: 16px;
          background: white;
          border: 1px solid #e3e5df;
          box-shadow: 0 5px 18px rgba(0, 0, 0, 0.04);
        }

        .payout-summary-card span {
          display: block;
          color: #727872;
          font-size: 13px;
          margin-bottom: 10px;
        }

        .payout-summary-card strong {
          font-size: 24px;
          color: #1d2a23;
        }

        .section-heading {
          margin-bottom: 18px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 28px;
          color: #1d2a23;
        }

        .payout-records {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .payout-card {
          background: white;
          border: 1px solid #e3e5df;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 7px 25px rgba(0, 0, 0, 0.04);
        }

        .payout-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          padding-bottom: 18px;
          border-bottom: 1px solid #eceee9;
        }

        .payout-draw-name {
          margin: 0;
          font-size: 21px;
          font-weight: 700;
          color: #1d2a23;
        }

        .payout-draw-date {
          margin: 6px 0 0;
          color: #777;
          font-size: 14px;
        }

        .payout-status {
          display: inline-flex;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.7px;
        }

        .payout-status.paid {
          background: #e5f7eb;
          color: #17733a;
        }

        .payout-status.processing {
          background: #fff3d8;
          color: #8b6200;
        }

        .payout-status.pending {
          background: #eef0f2;
          color: #596169;
        }

        .payout-status.failed {
          background: #ffe6e6;
          color: #a00000;
        }

        .payout-status.cancelled {
          background: #eeeeee;
          color: #666;
        }

        .payout-main {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 20px;
          padding: 22px 0;
        }

        .detail-label {
          display: block;
          margin-bottom: 7px;
          color: #7a817c;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .payout-amount {
          display: block;
          font-size: 30px;
          color: #1d2a23;
        }

        .verified-text {
          color: #17733a;
        }

        .payment-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          padding: 18px 0;
          border-top: 1px solid #eceee9;
        }

        .payment-detail {
          padding: 13px;
          border-radius: 10px;
          background: #f8f9f5;
        }

        .payment-detail span {
          display: block;
          margin-bottom: 6px;
          color: #7a817c;
          font-size: 12px;
        }

        .payment-detail strong {
          display: block;
          color: #303832;
          font-size: 14px;
          word-break: break-word;
        }

        .payout-notes {
          margin-top: 5px;
          padding: 14px;
          border-radius: 10px;
          background: #f8f9f5;
        }

        .payout-notes span {
          font-size: 12px;
          font-weight: 700;
          color: #737a75;
        }

        .payout-notes p {
          margin: 6px 0 0;
          color: #424943;
        }

        .payout-message {
          margin-top: 18px;
          padding: 13px 15px;
          border-radius: 10px;
          font-size: 14px;
        }

        .payout-message.paid {
          background: #e9f8ed;
          color: #176b36;
        }

        .payout-message.processing {
          background: #fff5df;
          color: #805d00;
        }

        .payout-message.pending {
          background: #f0f2f3;
          color: #596169;
        }

        .payout-message.failed {
          background: #ffeaea;
          color: #a00000;
        }

        .payout-message.cancelled {
          background: #eeeeee;
          color: #666;
        }

        .empty-payouts {
          text-align: center;
          background: white;
          border: 1px solid #e3e5df;
          border-radius: 18px;
          padding: 60px 25px;
        }

        .empty-icon {
          font-size: 45px;
          margin-bottom: 15px;
        }

        .empty-payouts h2 {
          margin: 0 0 10px;
          color: #1d2a23;
        }

        .empty-payouts p {
          max-width: 500px;
          margin: 0 auto;
          color: #737a75;
          line-height: 1.6;
        }

        .payout-loading {
          min-height: 300px;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #69716b;
          font-size: 17px;
        }

        @media (max-width: 850px) {
          .payout-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .payout-main {
            grid-template-columns: 1fr;
          }

          .payment-details {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .my-payouts-page {
            padding: 25px 14px 50px;
          }

          .my-payouts-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .my-payouts-header h1 {
            font-size: 32px;
          }

          .payout-summary-grid {
            grid-template-columns: 1fr;
          }

          .payout-card {
            padding: 18px;
          }

          .payout-card-top {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}