import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState(null);

  // Charity
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [charityContribution, setCharityContribution] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
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

      setUser(user);

      // Get user's scores
      const {
        data: scoreData,
        error: scoresError,
      } = await supabase
        .from("scores")
        .select("*")
        .eq("user_id", user.id)
        .order("score_date", { ascending: false });

      if (scoresError) {
        setError(scoresError.message);
        setLoading(false);
        return;
      }

      setScores(scoreData || []);

      // Get active subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      setSubscription(subData);

      // Get user's active charity
      const {
        data: charityData,
        error: charityError,
      } = await supabase
        .from("user_charities")
        .select(
          `
          contribution_percent,
          charity_id,
          charities (
            id,
            name,
            description,
            category,
            image_url,
            website_url
          )
        `
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (charityError) {
        setError(charityError.message);
        setLoading(false);
        return;
      }

      if (charityData) {
        setSelectedCharity(charityData.charities);
        setCharityContribution(charityData.contribution_percent);
      } else {
        setSelectedCharity(null);
        setCharityContribution(null);
      }

      setLoading(false);
    };

    loadDashboard();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  // Calculate statistics
  const totalScores = scores.length;

  const averageScore =
    totalScores > 0
      ? (
          scores.reduce(
            (total, score) =>
              total + Number(score.stableford_score),
            0
          ) / totalScores
        ).toFixed(1)
      : "0.0";

  const latestScore =
    totalScores > 0 ? scores[0].stableford_score : "—";

  const recentScores = scores.slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f2]">
        <p className="text-gray-600">
          Loading dashboard...
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

        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate("/profile")}
            className="border border-gray-300 bg-white text-black px-5 py-2 rounded-xl font-semibold hover:bg-gray-100"
          >
            Profile
          </button>

          <button
            onClick={handleSignOut}
            className="bg-black text-white px-5 py-2 rounded-xl font-semibold hover:bg-gray-800"
          >
            Sign out
          </button>

        </div>

      </nav>

      {/* Dashboard */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* Welcome */}
        <div className="mb-8">

          <p className="text-sm text-gray-500 mb-2">
            Welcome back
          </p>

          <h2 className="text-4xl font-bold">
            Digital Heroes Dashboard
          </h2>

          <p className="text-gray-600 mt-2">
            Track your golf performance and create an impact.
          </p>

        </div>

        {/* Profile */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">

          <p className="text-sm text-gray-500">
            Logged in as
          </p>

          <p className="font-semibold mt-1">
            {user?.email}
          </p>

        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* Total Scores */}
          <div className="bg-white rounded-3xl shadow-lg p-6">

            <p className="text-sm text-gray-500">
              Total scores
            </p>

            <p className="text-4xl font-bold mt-3">
              {totalScores}
            </p>

          </div>

          {/* Average */}
          <div className="bg-white rounded-3xl shadow-lg p-6">

            <p className="text-sm text-gray-500">
              Average Stableford
            </p>

            <p className="text-4xl font-bold mt-3">
              {averageScore}
            </p>

          </div>

          {/* Latest */}
          <div className="bg-black text-white rounded-3xl shadow-lg p-6">

            <p className="text-sm text-gray-400">
              Latest score
            </p>

            <p className="text-4xl font-bold mt-3">
              {latestScore}
            </p>

          </div>

        </div>

        {/* Membership */}
        <div className="bg-black text-white rounded-3xl shadow-lg p-8 mb-8">

          <p className="text-sm text-gray-400 uppercase tracking-wider">
            Membership
          </p>

          <div className="mt-4">

            <h3 className="text-3xl font-bold capitalize">
              {subscription
                ? `${subscription.plan} Plan`
                : "No Active Plan"}
            </h3>

            <div className="grid grid-cols-2 gap-6 mt-6">

              <div>
                <p className="text-gray-400 text-sm">
                  Status
                </p>

                <p className="text-xl font-semibold capitalize">
                  {subscription?.status || "None"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">
                  Amount
                </p>

                <p className="text-xl font-semibold">
                  {subscription
                    ? `₹${subscription.amount}`
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">
                  Charity Contribution
                </p>

                <p className="text-xl font-semibold">
                  {subscription
                    ? `${subscription.charity_contribution_percent}%`
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">
                  Currency
                </p>

                <p className="text-xl font-semibold">
                  {subscription?.currency || "—"}
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* Selected Charity */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider">
                Your Impact
              </p>

              <h3 className="text-2xl font-bold mt-2">
                Selected Charity
              </h3>
            </div>

            <button
              onClick={() => navigate("/charities")}
              className="border border-gray-300 px-4 py-2 rounded-xl font-semibold hover:bg-gray-100"
            >
              Change Charity
            </button>

          </div>

          {selectedCharity ? (
            <div className="mt-6 bg-[#f7f7f2] rounded-2xl p-6">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                <div className="flex items-center gap-5">

                  {/* Charity Image */}
                  {selectedCharity.image_url ? (
                    <img
                      src={selectedCharity.image_url}
                      alt={selectedCharity.name}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center text-3xl">
                      ❤️
                    </div>
                  )}

                  <div>

                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      {selectedCharity.category || "Charity"}
                    </p>

                    <h4 className="text-xl font-bold mt-1">
                      {selectedCharity.name}
                    </h4>

                    <p className="text-gray-500 text-sm mt-2 max-w-xl">
                      {selectedCharity.description ||
                        "Thank you for supporting this cause."}
                    </p>

                  </div>

                </div>

                <div className="bg-white rounded-2xl p-5 min-w-[150px]">

                  <p className="text-xs text-gray-500">
                    Your contribution
                  </p>

                  <p className="text-3xl font-bold mt-1">
                    {charityContribution ?? 10}%
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    of membership
                  </p>

                </div>

              </div>

              <div className="flex flex-wrap gap-3 mt-6">

                <button
                  onClick={() => navigate("/charities")}
                  className="bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
                >
                  Change Charity →
                </button>

                {selectedCharity.website_url && (
                  <a
                    href={selectedCharity.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-gray-300 bg-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-100"
                  >
                    Visit Website
                  </a>
                )}

              </div>

            </div>
          ) : (
            <div className="mt-6 bg-[#f7f7f2] rounded-2xl p-8 text-center">

              <div className="text-4xl mb-4">
                ❤️
              </div>

              <h4 className="text-xl font-bold">
                Choose a charity
              </h4>

              <p className="text-gray-500 mt-2">
                Select a charity to direct part of your membership
                contribution towards a cause you care about.
              </p>

              <button
                onClick={() => navigate("/charities")}
                className="mt-5 bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800"
              >
                Choose Charity →
              </button>

            </div>
          )}

        </div>

        {/* Recent Scores */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">

          <div className="flex items-center justify-between mb-6">

            <div>
              <h3 className="text-2xl font-bold">
                Latest scores
              </h3>

              <p className="text-gray-500 mt-1">
                Your five most recent Stableford scores.
              </p>
            </div>

            <button
              onClick={() => navigate("/my-scores")}
              className="text-sm font-semibold underline"
            >
              View all
            </button>

          </div>

          {recentScores.length === 0 ? (
            <div className="text-center py-8">

              <p className="text-gray-500">
                You haven't added any scores yet.
              </p>

              <button
                onClick={() => navigate("/enter-score")}
                className="mt-4 bg-black text-white px-5 py-3 rounded-xl font-semibold"
              >
                Add your first score
              </button>

            </div>
          ) : (
            <div className="space-y-3">

              {recentScores.map((score) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between bg-[#f7f7f2] rounded-2xl p-4"
                >

                  <div>
                    <p className="font-semibold">
                      {score.score_date}
                    </p>

                    <p className="text-sm text-gray-500">
                      {score.notes || "No notes"}
                    </p>
                  </div>

                  <div className="bg-black text-white rounded-xl px-4 py-2 font-bold">
                    {score.stableford_score}
                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <button
            onClick={() => navigate("/enter-score")}
            className="bg-black text-white rounded-2xl p-6 text-left hover:bg-gray-800"
          >

            <p className="text-2xl font-bold">
              Enter a score →
            </p>

            <p className="text-gray-300 mt-2">
              Add your latest Stableford score.
            </p>

          </button>

          <button
            onClick={() => navigate("/my-scores")}
            className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:bg-gray-50"
          >

            <p className="text-2xl font-bold">
              My scores →
            </p>

            <p className="text-gray-500 mt-2">
              View your complete score history.
            </p>

          </button>

          <button
            onClick={() => navigate("/charities")}
            className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:bg-gray-50"
          >

            <p className="text-2xl font-bold">
              My charity →
            </p>

            <p className="text-gray-500 mt-2">
              View or change your selected charity.
            </p>

          </button>

        </div>

      </main>

    </div>
  );
}

export default Dashboard;