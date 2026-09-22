import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function AdminDraws() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [draws, setDraws] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  // Create draw form
  const [drawName, setDrawName] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [jackpotAmount, setJackpotAmount] = useState("");
  const [prizePool, setPrizePool] = useState("");

  useEffect(() => {
    loadAdminDraws();
  }, []);

  const loadAdminDraws = async () => {
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
    const { data: profile, error: profileError } = await supabase
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

    // Get all draws
    const { data: drawData, error: drawError } = await supabase
      .from("draws")
      .select("*")
      .order("draw_date", { ascending: false });

    if (drawError) {
      setError(drawError.message);
      setLoading(false);
      return;
    }

    setDraws(drawData || []);
    setLoading(false);
  };

  const generateWinningNumbers = () => {
    const numbers = [];

    while (numbers.length < 5) {
      const number = Math.floor(Math.random() * 20) + 1;

      if (!numbers.includes(number)) {
        numbers.push(number);
      }
    }

    return numbers.sort((a, b) => a - b);
  };

  const createDraw = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!drawName.trim()) {
      setError("Please enter a draw name.");
      return;
    }

    if (!drawDate) {
      setError("Please select a draw date.");
      return;
    }

    const jackpot = Number(jackpotAmount);
    const pool = Number(prizePool);

    if (!Number.isFinite(jackpot) || jackpot < 0) {
      setError("Please enter a valid jackpot amount.");
      return;
    }

    if (!Number.isFinite(pool) || pool <= 0) {
      setError("Please enter a valid prize pool amount.");
      return;
    }

    if (jackpot > pool) {
      setError("Jackpot cannot be greater than the total prize pool.");
      return;
    }

    setSaving(true);

    // Create draw as DRAFT
    const { data: newDraw, error: drawError } = await supabase
      .from("draws")
      .insert({
        draw_name: drawName.trim(),
        draw_date: drawDate,
        status: "draft",
        draw_numbers: null,
        jackpot_amount: jackpot,
        total_prize_pool: pool,
        created_by: user.id,
      })
      .select()
      .single();

    if (drawError) {
      setError(drawError.message);
      setSaving(false);
      return;
    }

    // Create prize distribution
    const prizeRows = [
      {
        draw_id: newDraw.id,
        match_count: 5,
        pool_percent: 40,
        prize_pool_amount: Number((pool * 0.4).toFixed(2)),
      },
      {
        draw_id: newDraw.id,
        match_count: 4,
        pool_percent: 35,
        prize_pool_amount: Number((pool * 0.35).toFixed(2)),
      },
      {
        draw_id: newDraw.id,
        match_count: 3,
        pool_percent: 25,
        prize_pool_amount: Number((pool * 0.25).toFixed(2)),
      },
    ];

    const { error: prizeError } = await supabase
      .from("prizes")
      .insert(prizeRows);

    if (prizeError) {
      setError(
        `Draw was created, but prize setup failed: ${prizeError.message}`
      );
      setSaving(false);
      await loadAdminDraws();
      return;
    }

    setSuccess("Draw created successfully!");

    setDrawName("");
    setDrawDate("");
    setJackpotAmount("");
    setPrizePool("");

    await loadAdminDraws();

    setSaving(false);
  };

  const publishDraw = async (draw) => {
    setError("");
    setSuccess("");

    const confirmed = window.confirm(
      `Publish "${draw.draw_name}"?\n\nThis will generate 5 winning numbers and make the draw available to users.`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const winningNumbers = generateWinningNumbers();

    const { error: updateError } = await supabase
      .from("draws")
      .update({
        status: "published",
        draw_numbers: winningNumbers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draw.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccess(
      `Draw published successfully! Numbers: ${winningNumbers.join(", ")}`
    );

    await loadAdminDraws();

    setSaving(false);
  };

  const completeDraw = async (draw) => {
  setError("");
  setSuccess("");

  const confirmed = window.confirm(
    `Complete "${draw.draw_name}"?\n\nThis will calculate winners from all submitted entries and then mark the draw as completed.`
  );

  if (!confirmed) {
    return;
  }

  setSaving(true);

  try {
    // 1. Generate winners
    const { data: winnersCreated, error: winnerError } =
      await supabase.rpc("generate_draw_winners", {
        p_draw_id: draw.id,
      });

    if (winnerError) {
      setError(
        `Winner generation failed: ${winnerError.message}`
      );
      setSaving(false);
      return;
    }

    // 2. Mark draw as completed
    const { error: updateError } = await supabase
      .from("draws")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", draw.id);

    if (updateError) {
      setError(
        `Winners were generated, but the draw could not be completed: ${updateError.message}`
      );
      setSaving(false);
      return;
    }

    // 3. Show result
    setSuccess(
      `Draw completed successfully! ${winnersCreated || 0} winner(s) created.`
    );

    await loadAdminDraws();
  } catch (err) {
    setError(
      err?.message || "Something went wrong while completing the draw."
    );
  } finally {
    setSaving(false);
  }
};
  const cancelDraw = async (draw) => {
    setError("");
    setSuccess("");

    const confirmed = window.confirm(
      `Cancel "${draw.draw_name}"?`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("draws")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draw.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccess("Draw cancelled.");

    await loadAdminDraws();

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f2]">
        <p className="text-gray-600">
          Loading admin dashboard...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl shadow-lg p-10 max-w-lg w-full text-center">
          <div className="text-5xl mb-5">
            🔒
          </div>

          <h1 className="text-3xl font-bold">
            Access denied
          </h1>

          <p className="text-gray-500 mt-3">
            You do not have administrator access.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 bg-black text-white px-6 py-3 rounded-xl font-semibold"
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

        <div>
          <h1 className="text-xl font-bold">
            DIGITAL HEROES
          </h1>

          <p className="text-xs text-gray-500">
            Admin Panel
          </p>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm font-semibold hover:underline"
        >
          ← Dashboard
        </button>

      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">

          <p className="text-sm text-gray-500 mb-2">
            Administration
          </p>

          <h2 className="text-4xl font-bold">
            Draw Management
          </h2>

          <p className="text-gray-500 mt-2">
            Create, publish and manage monthly draws.
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

        {/* Create Draw */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">

          <div className="mb-6">

            <p className="text-sm text-gray-500">
              New monthly draw
            </p>

            <h3 className="text-2xl font-bold mt-1">
              Create Draw
            </h3>

          </div>

          <form
            onSubmit={createDraw}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >

            <div>
              <label className="block text-sm font-medium mb-2">
                Draw name
              </label>

              <input
                type="text"
                value={drawName}
                onChange={(e) => setDrawName(e.target.value)}
                placeholder="October 2026 Monthly Draw"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Draw date
              </label>

              <input
                type="date"
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Jackpot amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={jackpotAmount}
                onChange={(e) => setJackpotAmount(e.target.value)}
                placeholder="10000"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Total prize pool
              </label>

              <input
                type="number"
                min="1"
                step="0.01"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="25000"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="md:col-span-2 bg-[#f7f7f2] rounded-2xl p-5">

              <p className="font-semibold">
                Prize distribution
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">

                <div>
                  <p className="text-sm text-gray-500">
                    5-number match
                  </p>
                  <p className="text-xl font-bold">
                    40%
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    4-number match
                  </p>
                  <p className="text-xl font-bold">
                    35%
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    3-number match
                  </p>
                  <p className="text-xl font-bold">
                    25%
                  </p>
                </div>

              </div>

            </div>

            <div className="md:col-span-2">

              <button
                type="submit"
                disabled={saving}
                className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Draft Draw"}
              </button>

            </div>

          </form>

        </div>

        {/* Draw List */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">

          <div className="p-6 border-b border-gray-200">

            <h3 className="text-2xl font-bold">
              All Draws
            </h3>

            <p className="text-gray-500 mt-1">
              Manage existing monthly draws.
            </p>

          </div>

          {draws.length === 0 ? (
            <div className="text-center py-16 px-6">

              <p className="text-gray-500">
                No draws created yet.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-gray-200">

              {draws.map((draw) => (

                <div
                  key={draw.id}
                  className="p-6"
                >

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                    <div>

                      <div className="flex items-center gap-3">

                        <h4 className="text-xl font-bold">
                          {draw.draw_name}
                        </h4>

                        <span className="bg-[#f7f7f2] px-3 py-1 rounded-full text-xs font-semibold uppercase">
                          {draw.status}
                        </span>

                      </div>

                      <div className="text-sm text-gray-500 mt-2 space-y-1">

                        <p>
                          Draw date: {draw.draw_date}
                        </p>

                        <p>
                          Jackpot: ₹
                          {Number(
                            draw.jackpot_amount || 0
                          ).toLocaleString("en-IN")}
                        </p>

                        <p>
                          Prize pool: ₹
                          {Number(
                            draw.total_prize_pool || 0
                          ).toLocaleString("en-IN")}
                        </p>

                      </div>

                      {draw.draw_numbers &&
                        Array.isArray(draw.draw_numbers) &&
                        draw.draw_numbers.length > 0 && (
                          <div className="mt-4">

                            <p className="text-sm font-semibold">
                              Winning numbers
                            </p>

                            <div className="flex gap-2 mt-2">

                              {draw.draw_numbers.map(
                                (number) => (
                                  <span
                                    key={number}
                                    className="bg-black text-white w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                                  >
                                    {number}
                                  </span>
                                )
                              )}

                            </div>

                          </div>
                        )}

                    </div>

                    <div className="flex flex-wrap gap-2">

                      {draw.status === "draft" && (
                        <button
                          onClick={() =>
                            publishDraw(draw)
                          }
                          disabled={saving}
                          className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                        >
                          Publish Draw
                        </button>
                      )}

                      {draw.status === "published" && (
                        <button
                          onClick={() =>
                            completeDraw(draw)
                          }
                          disabled={saving}
                          className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                        >
                          Complete Draw
                        </button>
                      )}

                      {(draw.status === "draft" ||
                        draw.status === "published") && (
                        <button
                          onClick={() =>
                            cancelDraw(draw)
                          }
                          disabled={saving}
                          className="border border-gray-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}

                    </div>

                  </div>

                </div>

              ))}

            </div>
          )}

        </div>

      </main>

    </div>
  );
}

export default AdminDraws;