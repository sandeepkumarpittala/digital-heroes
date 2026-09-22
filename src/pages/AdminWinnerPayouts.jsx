import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function AdminWinnerPayouts() {
  const [user, setUser] = useState(null);
  const [winners, setWinners] = useState([]);
  const [payouts, setPayouts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedWinner, setSelectedWinner] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!currentUser) {
        window.location.href = "/signin";
        return;
      }

      setUser(currentUser);

      // Check admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (profile?.role !== "admin") {
        setError("Access denied. Admin account required.");
        return;
      }

      // Load winners
      const { data: winnerData, error: winnerError } = await supabase
        .from("winners")
        .select(
          `
          id,
          user_id,
          draw_id,
          draw_entry_id,
          prize_id,
          match_count,
          prize_amount,
          status,
          created_at
        `
        )
        .eq("status", "verified")
        .order("created_at", { ascending: false });

      if (winnerError) {
        throw winnerError;
      }

      // Load draws
      const drawIds = [
        ...new Set((winnerData || []).map((winner) => winner.draw_id)),
      ];

      let drawMap = {};

      if (drawIds.length > 0) {
        const { data: drawData, error: drawError } = await supabase
          .from("draws")
          .select("id, draw_name, draw_date")
          .in("id", drawIds);

        if (drawError) {
          throw drawError;
        }

        drawMap = Object.fromEntries(
          (drawData || []).map((draw) => [draw.id, draw])
        );
      }

      // Load profiles
      const userIds = [
        ...new Set((winnerData || []).map((winner) => winner.user_id)),
      ];

      let profileMap = {};

      if (userIds.length > 0) {
        const { data: profileData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", userIds);

        if (profilesError) {
          throw profilesError;
        }

        profileMap = Object.fromEntries(
          (profileData || []).map((profile) => [profile.id, profile])
        );
      }

      // Load claims
      const winnerIds = [
        ...new Set((winnerData || []).map((winner) => winner.id)),
      ];

      let claimMap = {};

      if (winnerIds.length > 0) {
        const { data: claimData, error: claimError } = await supabase
          .from("winner_claims")
          .select("id, winner_id, verified_at, verified_by")
          .in("winner_id", winnerIds);

        if (claimError) {
          throw claimError;
        }

        claimMap = Object.fromEntries(
          (claimData || []).map((claim) => [claim.winner_id, claim])
        );
      }

      const formattedWinners = (winnerData || []).map((winner) => ({
        ...winner,
        draw: drawMap[winner.draw_id] || null,
        profile: profileMap[winner.user_id] || null,
        claim: claimMap[winner.id] || null,
      }));

      setWinners(formattedWinners);

      // Load payouts
      const { data: payoutData, error: payoutError } = await supabase
        .from("winner_payouts")
        .select("*")
        .order("created_at", { ascending: false });

      if (payoutError) {
        throw payoutError;
      }

      setPayouts(payoutData || []);
    } catch (err) {
      console.error("Load payout data error:", err);
      setError(err.message || "Failed to load payout data.");
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // OPEN CREATE PAYOUT FORM
  // --------------------------------------------------

  function openCreatePayout(winner) {
    setSelectedWinner(winner);

    setPaymentMethod("");
    setTransactionReference("");
    setNotes("");

    setError("");
    setSuccess("");
  }

  // --------------------------------------------------
  // CLOSE FORM
  // --------------------------------------------------

  function closeForm() {
    setSelectedWinner(null);
    setPaymentMethod("");
    setTransactionReference("");
    setNotes("");
  }

  // --------------------------------------------------
  // CREATE PAYOUT
  // --------------------------------------------------

  async function createPayout() {
    if (!selectedWinner) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Check again for duplicate payout
      const { data: existingPayout, error: existingError } = await supabase
        .from("winner_payouts")
        .select("id, status")
        .eq("winner_id", selectedWinner.id)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingPayout) {
        throw new Error(
          `A payout already exists for this winner. Current status: ${existingPayout.status}.`
        );
      }

      const { error: insertError } = await supabase
        .from("winner_payouts")
        .insert({
          winner_id: selectedWinner.id,
          winner_claim_id: selectedWinner.claim?.id || null,
          user_id: selectedWinner.user_id,
          draw_id: selectedWinner.draw_id,
          amount: selectedWinner.prize_amount,
          currency: "INR",
          status: "pending",
          payout_method: paymentMethod.trim() || null,
          transaction_reference:
            transactionReference.trim() || null,
          notes: notes.trim() || null,
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess("Winner payout created successfully.");

      closeForm();

      await loadData();
    } catch (err) {
      console.error("Create payout error:", err);
      setError(err.message || "Failed to create payout.");
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // UPDATE PAYOUT STATUS
  // --------------------------------------------------

  async function updatePayoutStatus(payout, newStatus) {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "paid") {
        updateData.paid_at = new Date().toISOString();
      }

      if (newStatus !== "paid") {
        updateData.paid_at = null;
      }

      const { error: updateError } = await supabase
        .from("winner_payouts")
        .update(updateData)
        .eq("id", payout.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(`Payout status changed to ${newStatus}.`);

      await loadData();
    } catch (err) {
      console.error("Update payout error:", err);
      setError(err.message || "Failed to update payout.");
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // UPDATE PAYMENT DETAILS
  // --------------------------------------------------

  async function updatePaymentDetails(payout) {
    const method = window.prompt(
      "Enter payout method:",
      payout.payout_method || ""
    );

    if (method === null) {
      return;
    }

    const reference = window.prompt(
      "Enter transaction/reference number:",
      payout.transaction_reference || ""
    );

    if (reference === null) {
      return;
    }

    const note = window.prompt("Enter notes:", payout.notes || "");

    if (note === null) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const { error: updateError } = await supabase
        .from("winner_payouts")
        .update({
          payout_method: method.trim() || null,
          transaction_reference: reference.trim() || null,
          notes: note.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payout.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess("Payment details updated successfully.");

      await loadData();
    } catch (err) {
      console.error("Update payment details error:", err);
      setError(err.message || "Failed to update payment details.");
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function formatCurrency(amount, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }

  function formatDate(date) {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString("en-IN");
  }

  function getStatusClass(status) {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";

      case "processing":
        return "bg-blue-100 text-blue-800";

      case "paid":
        return "bg-green-100 text-green-800";

      case "failed":
        return "bg-red-100 text-red-800";

      case "cancelled":
        return "bg-gray-200 text-gray-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">
          Loading winner payouts...
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-1">
            Administration
          </p>

          <h1 className="text-3xl font-bold text-gray-900">
            Winner Payouts
          </h1>

          <p className="text-gray-600 mt-2">
            Create and manage payouts for verified winners.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-6 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </div>
        )}

        {/* VERIFIED WINNERS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Verified Winners
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Winners whose claims have been verified.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
              {winners.length} verified
            </span>
          </div>

          {winners.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No verified winners available for payout.
            </div>
          ) : (
            <div className="space-y-4">
              {winners.map((winner) => {
                const existingPayout = payouts.find(
                  (payout) => payout.winner_id === winner.id
                );

                return (
                  <div
                    key={winner.id}
                    className="border border-gray-200 rounded-xl p-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                      {/* WINNER INFORMATION */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">
                            {winner.draw?.draw_name || "Unknown Draw"}
                          </h3>

                          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold uppercase">
                            Verified
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">

                          <div>
                            <span className="text-gray-500">
                              Winner
                            </span>

                            <p className="font-medium text-gray-900">
                              {winner.profile?.full_name || "User"}
                            </p>
                          </div>

                          <div>
                            <span className="text-gray-500">
                              Match Count
                            </span>

                            <p className="font-medium text-gray-900">
                              {winner.match_count}
                            </p>
                          </div>

                          <div>
                            <span className="text-gray-500">
                              Prize Amount
                            </span>

                            <p className="font-bold text-gray-900">
                              {formatCurrency(winner.prize_amount)}
                            </p>
                          </div>

                          <div>
                            <span className="text-gray-500">
                              Draw Date
                            </span>

                            <p className="font-medium text-gray-900">
                              {winner.draw?.draw_date || "-"}
                            </p>
                          </div>

                        </div>
                      </div>

                      {/* PAYOUT ACTION */}
                      <div className="lg:w-72">

                        {existingPayout ? (
                          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">

                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-gray-500">
                                Payout
                              </span>

                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${getStatusClass(
                                  existingPayout.status
                                )}`}
                              >
                                {existingPayout.status}
                              </span>
                            </div>

                            <p className="font-bold text-gray-900 mb-3">
                              {formatCurrency(existingPayout.amount)}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                updatePaymentDetails(existingPayout)
                              }
                              disabled={saving}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                              Edit Payment Details
                            </button>

                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCreatePayout(winner)}
                            className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                          >
                            Create Payout
                          </button>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* EXISTING PAYOUTS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">
              Payout Records
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Track payout processing and payment status.
            </p>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No payout records yet.
            </div>
          ) : (
            <div className="space-y-4">

              {payouts.map((payout) => {
                const winner = winners.find(
                  (item) => item.id === payout.winner_id
                );

                return (
                  <div
                    key={payout.id}
                    className="border border-gray-200 rounded-xl p-5"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

                      <div className="flex-1">

                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-gray-900">
                            {winner?.draw?.draw_name ||
                              "Winner Payout"}
                          </h3>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${getStatusClass(
                              payout.status
                            )}`}
                          >
                            {payout.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">

                          <div>
                            <span className="text-gray-500">
                              Amount
                            </span>

                            <p className="font-bold text-gray-900">
                              {formatCurrency(
                                payout.amount,
                                payout.currency
                              )}
                            </p>
                          </div>

                          <div>
                            <span className="text-gray-500">
                              Payment Method
                            </span>

                            <p className="font-medium text-gray-900">
                              {payout.payout_method || "-"}
                            </p>
                          </div>

                          <div>
                            <span className="text-gray-500">
                              Transaction Reference
                            </span>

                            <p className="font-medium text-gray-900 break-all">
                              {payout.transaction_reference || "-"}
                            </p>
                          </div>

                        </div>

                        {payout.paid_at && (
                          <div className="mt-3 text-sm">
                            <span className="text-gray-500">
                              Paid At:{" "}
                            </span>

                            <span className="font-medium text-gray-900">
                              {formatDate(payout.paid_at)}
                            </span>
                          </div>
                        )}

                      </div>

                      {/* STATUS ACTIONS */}
                      <div className="flex flex-wrap gap-2">

                        {payout.status === "pending" && (
                          <button
                            type="button"
                            onClick={() =>
                              updatePayoutStatus(
                                payout,
                                "processing"
                              )
                            }
                            disabled={saving}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Start Processing
                          </button>
                        )}

                        {payout.status === "processing" && (
                          <button
                            type="button"
                            onClick={() =>
                              updatePayoutStatus(
                                payout,
                                "paid"
                              )
                            }
                            disabled={saving}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Mark Paid
                          </button>
                        )}

                        {(payout.status === "pending" ||
                          payout.status === "processing") && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                updatePayoutStatus(
                                  payout,
                                  "failed"
                                )
                              }
                              disabled={saving}
                              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Failed
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updatePayoutStatus(
                                  payout,
                                  "cancelled"
                                )
                              }
                              disabled={saving}
                              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </div>
      </div>

      {/* CREATE PAYOUT MODAL */}
      {selectedWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">

            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900">
                Create Winner Payout
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {selectedWinner.draw?.draw_name}
              </p>
            </div>

            <div className="px-6 py-6 space-y-5">

              {/* WINNER */}
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Winner
                  </span>

                  <span className="font-semibold text-gray-900">
                    {selectedWinner.profile?.full_name || "User"}
                  </span>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-500">
                    Prize Amount
                  </span>

                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(selectedWinner.prize_amount)}
                  </span>
                </div>
              </div>

              {/* PAYMENT METHOD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>

                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value)
                  }
                  placeholder="UPI / Bank Transfer / Other"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* REFERENCE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference
                </label>

                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) =>
                    setTransactionReference(e.target.value)
                  }
                  placeholder="Transaction ID / UTR"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows="3"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

            </div>

            {/* MODAL ACTIONS */}
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createPayout}
                disabled={saving}
                className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Payout"}
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default AdminWinnerPayouts;