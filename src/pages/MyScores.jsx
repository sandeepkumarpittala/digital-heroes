import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function MyScores() {
  const navigate = useNavigate();

  // =========================
  // Scores state
  // =========================

  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================
  // Edit state
  // =========================

  const [editingScore, setEditingScore] = useState(null);

  const [editDate, setEditDate] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // =========================
  // Load scores when page opens
  // =========================

  useEffect(() => {
    fetchScores();
  }, []);

  // =========================
  // Fetch user's scores
  // =========================

  const fetchScores = async () => {
    setLoading(true);
    setError("");

    // Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate("/signin");
      return;
    }

    // Get only this user's scores
    const { data, error: scoresError } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", user.id)
      .order("score_date", { ascending: false });

    if (scoresError) {
      setError(scoresError.message);
      setScores([]);
      setLoading(false);
      return;
    }

    setScores(data || []);
    setLoading(false);
  };

  // =========================
  // Start editing a score
  // =========================

  const handleEdit = (score) => {
    setEditingScore(score);

    setEditDate(score.score_date || "");
    setEditScore(String(score.stableford_score || ""));
    setEditNotes(score.notes || "");

    setActionError("");
    setActionSuccess("");
  };

  // =========================
  // Cancel editing
  // =========================

  const handleCancelEdit = () => {
    setEditingScore(null);

    setEditDate("");
    setEditScore("");
    setEditNotes("");

    setActionError("");
    setActionSuccess("");
  };

  // =========================
  // Save edited score
  // =========================

  const handleSaveEdit = async (e) => {
    e.preventDefault();

    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    // Validate date
    if (!editDate) {
      setActionError("Please select a score date.");
      setActionLoading(false);
      return;
    }

    // Convert score to number
    const scoreNumber = Number(editScore);

    // Validate Stableford score
    if (
      !Number.isInteger(scoreNumber) ||
      scoreNumber < 1 ||
      scoreNumber > 45
    ) {
      setActionError(
        "Stableford score must be a whole number between 1 and 45."
      );

      setActionLoading(false);
      return;
    }

    // Update score in Supabase
    const { error: updateError } = await supabase
      .from("scores")
      .update({
        score_date: editDate,
        stableford_score: scoreNumber,
        notes: editNotes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingScore.id);

    if (updateError) {
      // Duplicate date
      if (updateError.code === "23505") {
        setActionError(
          "You already have a score for this date. Please choose another date."
        );
      } else {
        setActionError(updateError.message);
      }

      setActionLoading(false);
      return;
    }

    // Success
    setActionSuccess("Score updated successfully!");

    setEditingScore(null);

    setEditDate("");
    setEditScore("");
    setEditNotes("");

    // Reload scores
    await fetchScores();

    setActionLoading(false);
  };

  // =========================
  // Delete score
  // =========================

  const handleDelete = async (scoreId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this score?"
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    const { error: deleteError } = await supabase
      .from("scores")
      .delete()
      .eq("id", scoreId);

    if (deleteError) {
      setActionError(deleteError.message);
      setActionLoading(false);
      return;
    }

    setActionSuccess("Score deleted successfully!");

    // Reload scores
    await fetchScores();

    setActionLoading(false);
  };

  // =========================
  // Loading screen
  // =========================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f2]">
        <p className="text-gray-600">
          Loading your scores...
        </p>
      </div>
    );
  }

  // =========================
  // Page
  // =========================

  return (
    <div className="min-h-screen bg-[#f7f7f2]">

      {/* =========================
          Navbar
      ========================= */}

      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">

        <h1 className="text-xl font-bold">
          DIGITAL HEROES
        </h1>

        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm font-semibold hover:underline"
        >
          ← Dashboard
        </button>

      </nav>

      {/* =========================
          Main
      ========================= */}

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* =========================
            Header
        ========================= */}

        <div className="flex items-center justify-between mb-8">

          <div>
            <p className="text-sm text-gray-500 mb-2">
              Score history
            </p>

            <h2 className="text-4xl font-bold">
              My Scores
            </h2>

            <p className="text-gray-500 mt-2">
              View and manage your Stableford scores.
            </p>
          </div>

          <button
            onClick={() => navigate("/enter-score")}
            className="bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
          >
            + Add score
          </button>

        </div>

        {/* =========================
            Global success message
        ========================= */}

        {actionSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 mb-6">
            {actionSuccess}
          </div>
        )}

        {/* =========================
            Global error
        ========================= */}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* =========================
            Edit form
        ========================= */}

        {editingScore && (
          <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">

            <div className="flex items-center justify-between mb-8">

              <div>
                <p className="text-sm text-gray-500 mb-2">
                  Update score
                </p>

                <h3 className="text-2xl font-bold">
                  Edit score
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-sm font-semibold hover:underline"
              >
                Cancel
              </button>

            </div>

            <form
              onSubmit={handleSaveEdit}
              className="space-y-5"
            >

              {/* Date */}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Score date
                </label>

                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Score */}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Stableford score
                </label>

                <input
                  type="number"
                  min="1"
                  max="45"
                  step="1"
                  required
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  placeholder="Enter your score"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                />

                <p className="text-xs text-gray-400 mt-2">
                  Enter a score between 1 and 45.
                </p>
              </div>

              {/* Notes */}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>

                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows="4"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Edit error */}

              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
                  {actionError}
                </div>
              )}

              {/* Buttons */}

              <div className="flex gap-3">

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {actionLoading
                    ? "Saving..."
                    : "Save changes"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>

              </div>

            </form>

          </div>
        )}

        {/* =========================
            Scores card
        ========================= */}

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">

          {/* Card header */}

          <div className="p-6 border-b border-gray-200">

            <h3 className="text-2xl font-bold">
              Score history
            </h3>

            <p className="text-gray-500 mt-1">
              Your scores from newest to oldest.
            </p>

          </div>

          {/* =========================
              Empty state
          ========================= */}

          {scores.length === 0 ? (
            <div className="text-center py-16 px-6">

              <p className="text-gray-500">
                You haven't added any scores yet.
              </p>

              <button
                onClick={() => navigate("/enter-score")}
                className="mt-5 bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
              >
                Add your first score
              </button>

            </div>
          ) : (

            /* =========================
               Table
            ========================= */

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-[#f7f7f2]">

                  <tr>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Date
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Stableford Score
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Notes
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {scores.map((score) => (

                    <tr
                      key={score.id}
                      className="border-t border-gray-200 hover:bg-gray-50"
                    >

                      {/* Date */}

                      <td className="px-6 py-4 text-gray-700">
                        {score.score_date}
                      </td>

                      {/* Score */}

                      <td className="px-6 py-4">

                        <span className="inline-flex items-center justify-center bg-black text-white rounded-xl px-4 py-2 font-bold min-w-[50px]">
                          {score.stableford_score}
                        </span>

                      </td>

                      {/* Notes */}

                      <td className="px-6 py-4 text-gray-600">
                        {score.notes || "—"}
                      </td>

                      {/* Actions */}

                      <td className="px-6 py-4">

                        <div className="flex gap-2">

                          <button
                            onClick={() => handleEdit(score)}
                            disabled={actionLoading}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(score.id)}
                            disabled={actionLoading}
                            className="px-3 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>

        {/* =========================
            Bottom button
        ========================= */}

        <div className="mt-8">

          <button
            onClick={() => navigate("/enter-score")}
            className="w-full bg-black text-white rounded-2xl p-5 text-left hover:bg-gray-800"
          >

            <p className="text-xl font-bold">
              Enter a new score →
            </p>

            <p className="text-gray-300 mt-1">
              Add your latest Stableford score.
            </p>

          </button>

        </div>

      </main>

    </div>
  );
}

export default MyScores;