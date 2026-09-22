import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function EnterScore() {
  const navigate = useNavigate();

  const [scoreDate, setScoreDate] = useState("");
  const [stablefordScore, setStablefordScore] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // -----------------------------
    // Client-side validation
    // -----------------------------

    if (!scoreDate) {
      setError("Please select a score date.");
      return;
    }

    if (stablefordScore === "") {
      setError("Please enter your Stableford score.");
      return;
    }

    const score = Number(stablefordScore);

    if (!Number.isInteger(score) || score < 1 || score > 45) {
      setError("Stableford score must be between 1 and 45.");
      return;
    }

    setLoading(true);

    try {
      // -----------------------------
      // Get logged-in user
      // -----------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/signin");
        return;
      }

      // -----------------------------
      // Insert score
      // -----------------------------

      const { error: insertError } = await supabase
        .from("scores")
        .insert({
          user_id: user.id,
          score_date: scoreDate,
          stableford_score: score,
          notes: notes.trim() || null,
        });

      // -----------------------------
      // Handle Supabase errors
      // -----------------------------

      if (insertError) {
        console.error("Score insert error:", insertError);

        // Duplicate score for same user/date
        if (insertError.code === "23505") {
          setError(
            "You already have a score for this date. Please choose another date."
          );
        }

        // Stableford score outside 1–45
        else if (insertError.code === "23514") {
          setError("Stableford score must be between 1 and 45.");
        }

        // Other database error
        else {
          setError(
            "Unable to save your score right now. Please try again."
          );
        }

        return;
      }

      // -----------------------------
      // Success
      // -----------------------------

      setSuccess("Score added successfully!");

      setScoreDate("");
      setStablefordScore("");
      setNotes("");

    } catch (err) {
      console.error("Unexpected error:", err);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2]">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          DIGITAL HEROES
        </h1>

        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm font-semibold"
        >
          ← Dashboard
        </button>
      </nav>

      {/* Form */}
      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl shadow-lg p-8">

          <div className="mb-8">
            <h2 className="text-3xl font-bold">
              Enter your score
            </h2>

            <p className="text-gray-500 mt-2">
              Add your latest Stableford score.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Score date
              </label>

              <input
                type="date"
                required
                value={scoreDate}
                onChange={(e) => {
                  setScoreDate(e.target.value);
                  setError("");
                  setSuccess("");
                }}
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
                required
                min="1"
                max="45"
                step="1"
                value={stablefordScore}
                onChange={(e) => {
                  setStablefordScore(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                placeholder="Enter your score"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />

              <p className="text-xs text-gray-500 mt-1">
                Enter a score between 1 and 45.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                placeholder="Optional notes"
                rows="4"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm font-medium">
                  {error}
                </p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-green-600 text-sm font-medium">
                  {success}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save score"}
            </button>

          </form>
        </div>
      </main>
    </div>
  );
}

export default EnterScore;