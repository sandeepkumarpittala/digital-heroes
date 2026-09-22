import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Draws() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [draws, setDraws] = useState([]);
  const [entries, setEntries] = useState({});

  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [activeDraw, setActiveDraw] = useState(null);

  const [loading, setLoading] = useState(true);
  const [entryLoading, setEntryLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const NUMBER_COUNT = 5;

  useEffect(() => {
    loadDraws();
  }, []);

  const loadDraws = async () => {
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

    // Get draws
    const {
      data: drawData,
      error: drawError,
    } = await supabase
      .from("draws")
      .select("*")
      .order("draw_date", { ascending: true });

    if (drawError) {
      setError(drawError.message);
      setLoading(false);
      return;
    }

    setDraws(drawData || []);

    // Get user's entries
    const {
      data: entryData,
      error: entryError,
    } = await supabase
      .from("draw_entries")
      .select("*")
      .eq("user_id", user.id);

    if (entryError) {
      setError(entryError.message);
      setLoading(false);
      return;
    }

    const entryMap = {};

    (entryData || []).forEach((entry) => {
      entryMap[entry.draw_id] = entry;
    });

    setEntries(entryMap);

    setLoading(false);
  };

  const openNumberSelector = (draw) => {
    setActiveDraw(draw);
    setSelectedNumbers([]);
    setError("");
    setSuccess("");
  };

  const closeNumberSelector = () => {
    setActiveDraw(null);
    setSelectedNumbers([]);
    setError("");
  };

  const toggleNumber = (number) => {
    setError("");

    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(
        selectedNumbers.filter((item) => item !== number)
      );
      return;
    }

    if (selectedNumbers.length >= NUMBER_COUNT) {
      setError(
        `Please select exactly ${NUMBER_COUNT} numbers.`
      );
      return;
    }

    setSelectedNumbers(
      [...selectedNumbers, number].sort((a, b) => a - b)
    );
  };

  const handleSubmitEntry = async () => {
    setError("");
    setSuccess("");

    if (!activeDraw) {
      return;
    }

    if (selectedNumbers.length !== NUMBER_COUNT) {
      setError(
        `Please select exactly ${NUMBER_COUNT} numbers.`
      );
      return;
    }

    if (entries[activeDraw.id]) {
      setError(
        "You have already entered this draw."
      );
      return;
    }

    setEntryLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/signin");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("draw_entries")
      .insert({
        draw_id: activeDraw.id,
        user_id: user.id,
        selected_numbers: selectedNumbers,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        setError(
          "You have already entered this draw."
        );
      } else {
        setError(insertError.message);
      }

      setEntryLoading(false);
      return;
    }

    setEntries((previous) => ({
      ...previous,
      [activeDraw.id]: data,
    }));

    setSuccess(
      "Your draw entry has been submitted successfully!"
    );

    setSelectedNumbers([]);
    setActiveDraw(null);
    setEntryLoading(false);
  };

  const getDrawNumbers = (draw) => {
    if (
      !draw.draw_numbers ||
      !Array.isArray(draw.draw_numbers) ||
      draw.draw_numbers.length === 0
    ) {
      return [];
    }

    return draw.draw_numbers;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f2]">
        <p className="text-gray-600">
          Loading draws...
        </p>
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

        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm font-semibold hover:underline"
        >
          ← Dashboard
        </button>

      </nav>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">

          <p className="text-sm text-gray-500 mb-2">
            Monthly rewards
          </p>

          <h2 className="text-4xl font-bold">
            Monthly Draws
          </h2>

          <p className="text-gray-500 mt-2">
            Enter the monthly draw and choose your numbers.
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

        {/* No draws */}
        {draws.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">

            <div className="text-5xl mb-5">
              🎁
            </div>

            <h3 className="text-2xl font-bold">
              No draws available
            </h3>

            <p className="text-gray-500 mt-2">
              There are currently no monthly draws available.
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {draws.map((draw) => {

              const existingEntry = entries[draw.id];

              const drawNumbers = getDrawNumbers(draw);

              return (
                <div
                  key={draw.id}
                  className="bg-white rounded-3xl shadow-lg p-7"
                >

                  {/* Status */}
                  <div className="flex items-center justify-between">

                    <span className="bg-[#f7f7f2] px-3 py-1 rounded-full text-xs font-semibold uppercase">
                      {draw.status}
                    </span>

                    <span className="text-sm text-gray-500">
                      {draw.draw_date}
                    </span>

                  </div>

                  {/* Draw name */}
                  <h3 className="text-2xl font-bold mt-6">
                    {draw.draw_name}
                  </h3>

                  {/* Jackpot */}
                  <div className="bg-black text-white rounded-2xl p-5 mt-6">

                    <p className="text-gray-400 text-sm">
                      Jackpot
                    </p>

                    <p className="text-3xl font-bold mt-1">
                      ₹{Number(
                        draw.jackpot_amount || 0
                      ).toLocaleString("en-IN")}
                    </p>

                  </div>

                  {/* Prize pool */}
                  <div className="grid grid-cols-2 gap-4 mt-5">

                    <div className="bg-[#f7f7f2] rounded-2xl p-4">

                      <p className="text-xs text-gray-500">
                        Prize pool
                      </p>

                      <p className="text-lg font-bold mt-1">
                        ₹{Number(
                          draw.total_prize_pool || 0
                        ).toLocaleString("en-IN")}
                      </p>

                    </div>

                    <div className="bg-[#f7f7f2] rounded-2xl p-4">

                      <p className="text-xs text-gray-500">
                        Draw date
                      </p>

                      <p className="text-lg font-bold mt-1">
                        {draw.draw_date}
                      </p>

                    </div>

                  </div>

                  {/* Existing entry */}
                  {existingEntry ? (
                    <div className="mt-6">

                      <div className="bg-green-50 border border-green-200 rounded-2xl p-5">

                        <p className="text-green-700 font-semibold">
                          ✓ Entry submitted
                        </p>

                        <p className="text-sm text-gray-500 mt-2">
                          Your numbers
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">

                          {(existingEntry.selected_numbers || []).map(
                            (number) => (
                              <span
                                key={number}
                                className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold"
                              >
                                {number}
                              </span>
                            )
                          )}

                        </div>

                      </div>

                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        openNumberSelector(draw)
                      }
                      disabled={draw.status !== "published"}
                      className="w-full mt-6 bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Enter Draw →
                    </button>
                  )}

                  {/* Published draw numbers */}
                  {drawNumbers.length > 0 && (
                    <div className="mt-6">

                      <p className="text-sm font-semibold">
                        Published numbers
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3">

                        {drawNumbers.map((number) => (
                          <span
                            key={number}
                            className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold"
                          >
                            {number}
                          </span>
                        ))}

                      </div>

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </main>

      {/* Number Selection Modal */}
      {activeDraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50">

          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Enter draw
                </p>

                <h3 className="text-2xl font-bold mt-1">
                  {activeDraw.draw_name}
                </h3>
              </div>

              <button
                onClick={closeNumberSelector}
                className="text-gray-500 text-xl"
              >
                ×
              </button>

            </div>

            <div className="mt-6">

              <p className="text-sm text-gray-500">
                Select exactly {NUMBER_COUNT} numbers.
              </p>

              <p className="text-sm font-semibold mt-1">
                Selected: {selectedNumbers.length}/{NUMBER_COUNT}
              </p>

            </div>

            {/* Number grid */}
            <div className="grid grid-cols-5 gap-3 mt-6">

              {Array.from(
                { length: 20 },
                (_, index) => index + 1
              ).map((number) => {

                const selected =
                  selectedNumbers.includes(number);

                return (
                  <button
                    key={number}
                    onClick={() =>
                      toggleNumber(number)
                    }
                    className={`h-12 rounded-xl font-bold border ${
                      selected
                        ? "bg-black text-white border-black"
                        : "bg-white text-black border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {number}
                  </button>
                );
              })}

            </div>

            {/* Selected */}
            <div className="mt-6 bg-[#f7f7f2] rounded-2xl p-4">

              <p className="text-xs text-gray-500">
                Your selection
              </p>

              <div className="flex gap-2 mt-3">

                {selectedNumbers.length === 0 ? (
                  <span className="text-sm text-gray-400">
                    No numbers selected
                  </span>
                ) : (
                  selectedNumbers.map((number) => (
                    <span
                      key={number}
                      className="bg-black text-white w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    >
                      {number}
                    </span>
                  ))
                )}

              </div>

            </div>

            <button
              onClick={handleSubmitEntry}
              disabled={
                entryLoading ||
                selectedNumbers.length !== NUMBER_COUNT
              }
              className="w-full mt-6 bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-40"
            >
              {entryLoading
                ? "Submitting..."
                : "Submit Entry"}
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default Draws;