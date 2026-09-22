import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function AdminWinnerClaims() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  const [rejectingClaimId, setRejectingClaimId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate("/signin");
      return;
    }

    setUser(user);

    // Check admin role
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (profile?.role !== "admin") {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    // Get winner claims
    const {
      data,
      error: claimsError,
    } = await supabase
      .from("winner_claims")
      .select(`
        id,
        winner_id,
        proof_url,
        proof_description,
        submitted_at,
        verified_at,
        verified_by,
        rejection_reason,
        winners (
          id,
          draw_id,
          user_id,
          draw_entry_id,
          prize_id,
          match_count,
          prize_amount,
          status,
          draws (
            draw_name,
            draw_date
          )
        )
      `)
      .order("submitted_at", { ascending: false });

    if (claimsError) {
      setError(claimsError.message);
      setLoading(false);
      return;
    }

    setClaims(data || []);
    setLoading(false);
  };

  const approveClaim = async (claim) => {
    const confirmed = window.confirm(
      "Approve this winner claim?\n\nThis will mark the winner as VERIFIED."
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    // Update winner status
    const {
      error: winnerError,
    } = await supabase
      .from("winners")
      .update({
        status: "verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", claim.winner_id);

    if (winnerError) {
      setError(winnerError.message);
      setSaving(false);
      return;
    }

    // Update claim
    const {
      error: claimError,
    } = await supabase
      .from("winner_claims")
      .update({
        verified_at: new Date().toISOString(),
        verified_by: user.id,
        rejection_reason: null,
      })
      .eq("id", claim.id);

    if (claimError) {
      setError(
        `Winner status was updated, but claim verification failed: ${claimError.message}`
      );
      setSaving(false);
      return;
    }

    setSuccess(
      "Winner claim approved successfully. Winner status is now VERIFIED."
    );

    await loadClaims();

    setSaving(false);
  };

  const startRejecting = (claim) => {
    setRejectingClaimId(claim.id);
    setRejectionReason("");
    setError("");
    setSuccess("");
  };

  const cancelRejecting = () => {
    setRejectingClaimId(null);
    setRejectionReason("");
  };

  const rejectClaim = async (claim) => {
    if (!rejectionReason.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }

    const confirmed = window.confirm(
      "Reject this winner claim?\n\nThe winner status will become REJECTED."
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    // Update winner status
    const {
      error: winnerError,
    } = await supabase
      .from("winners")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", claim.winner_id);

    if (winnerError) {
      setError(winnerError.message);
      setSaving(false);
      return;
    }

    // Update claim
    const {
      error: claimError,
    } = await supabase
      .from("winner_claims")
      .update({
        verified_at: new Date().toISOString(),
        verified_by: user.id,
        rejection_reason: rejectionReason.trim(),
      })
      .eq("id", claim.id);

    if (claimError) {
      setError(
        `Winner status was updated, but claim rejection failed: ${claimError.message}`
      );
      setSaving(false);
      return;
    }

    setSuccess(
      "Winner claim rejected successfully. Winner status is now REJECTED."
    );

    setRejectingClaimId(null);
    setRejectionReason("");

    await loadClaims();

    setSaving(false);
  };

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleString("en-IN");
  };

  const formatAmount = (value) => {
    return Number(value || 0).toLocaleString("en-IN");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f2]">
        <p className="text-gray-600">
          Loading winner claims...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl shadow-lg p-10 text-center max-w-md">
          <div className="text-5xl mb-5">
            🔒
          </div>

          <h2 className="text-2xl font-bold">
            Access denied
          </h2>

          <p className="text-gray-500 mt-2">
            Only administrators can access winner claims.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f2]">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">

        <h1 className="text-xl font-bold">
          DIGITAL HEROES
        </h1>

        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate("/admin/draws")}
            className="border border-gray-300 px-5 py-2 rounded-xl font-semibold hover:bg-gray-50"
          >
            Draw Management
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm font-semibold hover:underline"
          >
            Dashboard
          </button>

        </div>

      </nav>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">

          <p className="text-sm text-gray-500 mb-2">
            Administration
          </p>

          <h2 className="text-4xl font-bold">
            Winner Claims
          </h2>

          <p className="text-gray-500 mt-2">
            Review winner proof submissions and verify or reject claims.
          </p>

        </div>

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 mb-6">
            {success}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* Empty */}
        {claims.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">

            <div className="text-5xl mb-5">
              🏆
            </div>

            <h3 className="text-2xl font-bold">
              No winner claims
            </h3>

            <p className="text-gray-500 mt-2">
              There are currently no winner proof submissions.
            </p>

          </div>
        ) : (
          <div className="space-y-6">

            {claims.map((claim) => {

              const winner = claim.winners;
              const draw = winner?.draws;

              return (
                <div
                  key={claim.id}
                  className="bg-white rounded-3xl shadow-lg overflow-hidden"
                >

                  {/* Claim Header */}
                  <div className="p-6 border-b border-gray-200">

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <h3 className="text-2xl font-bold">
                            {draw?.draw_name || "Unknown Draw"}
                          </h3>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              winner?.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : winner?.status === "claimed"
                                ? "bg-blue-100 text-blue-700"
                                : winner?.status === "verified"
                                ? "bg-green-100 text-green-700"
                                : winner?.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {winner?.status || "unknown"}
                          </span>

                        </div>

                        <p className="text-sm text-gray-500 mt-2">
                          Draw date: {draw?.draw_date || "-"}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-sm text-gray-500">
                          Prize amount
                        </p>

                        <p className="text-3xl font-bold">
                          ₹{formatAmount(winner?.prize_amount)}
                        </p>

                      </div>

                    </div>

                  </div>

                  {/* Claim Details */}
                  <div className="p-6">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                      <div className="bg-[#f7f7f2] rounded-2xl p-5">

                        <p className="text-sm text-gray-500">
                          Match count
                        </p>

                        <p className="text-2xl font-bold mt-1">
                          {winner?.match_count || 0}
                        </p>

                      </div>

                      <div className="bg-[#f7f7f2] rounded-2xl p-5">

                        <p className="text-sm text-gray-500">
                          Submitted
                        </p>

                        <p className="font-semibold mt-1">
                          {formatDate(claim.submitted_at)}
                        </p>

                      </div>

                      <div className="bg-[#f7f7f2] rounded-2xl p-5">

                        <p className="text-sm text-gray-500">
                          Verification
                        </p>

                        <p className="font-semibold mt-1">
                          {claim.verified_at
                            ? formatDate(claim.verified_at)
                            : "Pending"}
                        </p>

                      </div>

                    </div>

                    {/* Proof */}
                    <div className="border border-gray-200 rounded-2xl p-5">

                      <h4 className="font-bold text-lg">
                        Proof submission
                      </h4>

                      <div className="mt-4">

                        <p className="text-sm text-gray-500">
                          Proof URL
                        </p>

                        {claim.proof_url ? (
                          <a
                            href={claim.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline break-all"
                          >
                            {claim.proof_url}
                          </a>
                        ) : (
                          <p className="text-gray-500">
                            No proof URL provided.
                          </p>
                        )}

                      </div>

                      <div className="mt-5">

                        <p className="text-sm text-gray-500">
                          Description
                        </p>

                        <p className="mt-1 whitespace-pre-wrap">
                          {claim.proof_description || "No description provided."}
                        </p>

                      </div>

                    </div>

                    {/* Rejection reason */}
                    {claim.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mt-5">

                        <p className="text-sm font-semibold text-red-700">
                          Rejection reason
                        </p>

                        <p className="text-red-600 mt-1">
                          {claim.rejection_reason}
                        </p>

                      </div>
                    )}

                    {/* Actions */}
                    {winner?.status !== "verified" &&
                      winner?.status !== "paid" && (
                        <div className="mt-6">

                          {rejectingClaimId === claim.id ? (
                            <div className="border border-red-200 rounded-2xl p-5">

                              <h4 className="font-bold">
                                Reject Winner Claim
                              </h4>

                              <textarea
                                value={rejectionReason}
                                onChange={(e) =>
                                  setRejectionReason(e.target.value)
                                }
                                placeholder="Enter the reason for rejecting this claim..."
                                rows={4}
                                className="w-full mt-4 border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-black"
                              />

                              <div className="flex flex-wrap gap-3 mt-4">

                                <button
                                  onClick={() => rejectClaim(claim)}
                                  disabled={saving}
                                  className="bg-red-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
                                >
                                  {saving ? "Rejecting..." : "Confirm Rejection"}
                                </button>

                                <button
                                  onClick={cancelRejecting}
                                  disabled={saving}
                                  className="border border-gray-300 px-5 py-3 rounded-xl font-semibold hover:bg-gray-50"
                                >
                                  Cancel
                                </button>

                              </div>

                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-3">

                              <button
                                onClick={() => approveClaim(claim)}
                                disabled={saving}
                                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
                              >
                                {saving
                                  ? "Processing..."
                                  : "✓ Approve Claim"}
                              </button>

                              <button
                                onClick={() => startRejecting(claim)}
                                disabled={saving}
                                className="border border-red-300 text-red-600 px-6 py-3 rounded-xl font-semibold hover:bg-red-50 disabled:opacity-50"
                              >
                                ✕ Reject Claim
                              </button>

                            </div>
                          )}

                        </div>
                      )}

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </main>

    </div>
  );
}

export default AdminWinnerClaims;