import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Subscription() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => {
    const loadSubscription = async () => {
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

      const { data, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError) {
        setError(subscriptionError.message);
        setLoading(false);
        return;
      }

      setSubscription(data);
      setLoading(false);
    };

    loadSubscription();
  }, [navigate]);

  // ============================================================
  // CHANGE SUBSCRIPTION PLAN
  // ============================================================

  const handleChoosePlan = async (plan) => {
    if (!user) return;

    setSaving(plan);
    setError("");

    const { data, error } = await supabase.rpc(
      "change_subscription_plan",
      {
        p_plan: plan,
      }
    );

    if (error) {
      console.error("Subscription change error:", error);
      setError(error.message);
      setSaving("");
      return;
    }

    setSubscription(data);
    setSaving("");

    navigate("/dashboard");
  };

  // ============================================================
  // CANCEL SUBSCRIPTION
  // ============================================================

  const handleCancelSubscription = async () => {
    if (!subscription || !user) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel your membership?"
    );

    if (!confirmed) return;

    setSaving("cancel");
    setError("");

    const { data, error } = await supabase.rpc(
      "cancel_subscription"
    );

    if (error) {
      console.error("Subscription cancellation error:", error);
      setError(error.message);
      setSaving("");
      return;
    }

    setSubscription(data);
    setSaving("");
  };

  // ============================================================
  // SIGN OUT
  // ============================================================

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f2]">
        <p className="text-gray-600">
          Loading subscription...
        </p>
      </div>
    );
  }

  const currentPlan =
    subscription?.status === "active"
      ? subscription.plan
      : null;

  return (
    <div className="min-h-screen bg-[#f7f7f2]">

      {/* ======================================================
          NAVBAR
      ====================================================== */}

      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">

        <h1 className="text-xl font-bold">
          DIGITAL HEROES
        </h1>

        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate("/dashboard")}
            className="border border-gray-300 px-5 py-2 rounded-xl font-semibold hover:bg-gray-50"
          >
            Dashboard
          </button>

          <button
            onClick={handleSignOut}
            className="bg-black text-white px-5 py-2 rounded-xl font-semibold hover:bg-gray-800"
          >
            Sign out
          </button>

        </div>
      </nav>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Heading */}

        <div className="text-center mb-10">

          <p className="text-sm text-gray-500 uppercase tracking-wider">
            Membership
          </p>

          <h2 className="text-4xl font-bold mt-2">
            Your Digital Heroes Membership
          </h2>

          <p className="text-gray-600 mt-2">
            Track your game and create an impact.
          </p>

        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 mb-8">
            {error}
          </div>
        )}

        {/* ====================================================
            CURRENT SUBSCRIPTION
        ==================================================== */}

        {subscription && (
          <div className="bg-black text-white rounded-3xl p-8 mb-10">

            <p className="text-sm text-gray-400 uppercase tracking-wider">
              Current membership
            </p>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mt-4">

              <div>

                <h3 className="text-3xl font-bold capitalize">
                  {subscription.plan} Plan
                </h3>

                <p className="text-gray-400 mt-2">
                  {subscription.status === "active"
                    ? "Your membership is currently active."
                    : subscription.status === "cancelled"
                    ? "Your membership has been cancelled."
                    : "Your membership is not currently active."}
                </p>

              </div>

              <div className="text-left md:text-right">

                <p className="text-sm text-gray-400">
                  Status
                </p>

                <p className="text-xl font-bold capitalize">
                  {subscription.status}
                </p>

              </div>

            </div>

            {/* Subscription details */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">

              <div>
                <p className="text-gray-400 text-sm">
                  Plan
                </p>

                <p className="font-semibold capitalize mt-1">
                  {subscription.plan}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">
                  Amount
                </p>

                <p className="font-semibold mt-1">
                  ₹{subscription.amount}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">
                  Currency
                </p>

                <p className="font-semibold mt-1">
                  {subscription.currency}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">
                  Charity
                </p>

                <p className="font-semibold mt-1">
                  {subscription.charity_contribution_percent}%
                </p>
              </div>

            </div>

            {/* Current period */}

            {subscription.current_period_end && (
              <div className="mt-6">

                <p className="text-gray-400 text-sm">
                  Current period ends
                </p>

                <p className="font-semibold mt-1">
                  {new Date(
                    subscription.current_period_end
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>

              </div>
            )}

            {/* Cancel button */}

            {(subscription.status === "active" ||
              subscription.status === "past_due") && (
              <button
                onClick={handleCancelSubscription}
                disabled={saving === "cancel"}
                className="mt-8 w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {saving === "cancel"
                  ? "Cancelling..."
                  : "Cancel Membership"}
              </button>
            )}

          </div>
        )}

        {/* ====================================================
            PLANS
        ==================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ==================================================
              MONTHLY
          ================================================== */}

          <div
            className={`rounded-3xl p-8 shadow-lg border ${
              currentPlan === "monthly"
                ? "bg-black text-white border-black"
                : "bg-white border-gray-200"
            }`}
          >

            <p
              className={`text-sm uppercase tracking-wider ${
                currentPlan === "monthly"
                  ? "text-gray-400"
                  : "text-gray-500"
              }`}
            >
              Monthly
            </p>

            <h3 className="text-2xl font-bold mt-2">
              Monthly Plan
            </h3>

            <p
              className={`mt-2 ${
                currentPlan === "monthly"
                  ? "text-gray-400"
                  : "text-gray-500"
              }`}
            >
              Flexible monthly membership.
            </p>

            <div className="mt-6">

              <span className="text-4xl font-bold">
                ₹499
              </span>

              <span
                className={
                  currentPlan === "monthly"
                    ? "text-gray-400"
                    : "text-gray-500"
                }
              >
                /month
              </span>

            </div>

            <div className="mt-6 space-y-3 text-sm">

              <p>✓ Track your Stableford scores</p>
              <p>✓ View your score history</p>
              <p>✓ Digital Heroes profile</p>
              <p>✓ 10% charity contribution</p>

            </div>

            <button
              disabled={
                currentPlan === "monthly" ||
                saving === "monthly"
              }
              onClick={() =>
                handleChoosePlan("monthly")
              }
              className={`w-full mt-8 py-3 rounded-xl font-semibold ${
                currentPlan === "monthly"
                  ? "bg-gray-700 text-gray-300 cursor-not-allowed"
                  : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              {saving === "monthly"
                ? "Saving..."
                : currentPlan === "monthly"
                ? "Current Plan"
                : "Choose Monthly"}
            </button>

          </div>

          {/* ==================================================
              YEARLY
          ================================================== */}

          <div
            className={`rounded-3xl p-8 shadow-lg border ${
              currentPlan === "yearly"
                ? "bg-black text-white border-black"
                : "bg-white border-gray-200"
            }`}
          >

            <p
              className={`text-sm uppercase tracking-wider ${
                currentPlan === "yearly"
                  ? "text-gray-400"
                  : "text-gray-500"
              }`}
            >
              Yearly
            </p>

            <h3 className="text-2xl font-bold mt-2">
              Yearly Plan
            </h3>

            <p
              className={`mt-2 ${
                currentPlan === "yearly"
                  ? "text-gray-400"
                  : "text-gray-500"
              }`}
            >
              Annual Digital Heroes membership.
            </p>

            <div className="mt-6">

              <span className="text-4xl font-bold">
                ₹4,999
              </span>

              <span
                className={
                  currentPlan === "yearly"
                    ? "text-gray-400"
                    : "text-gray-500"
                }
              >
                /year
              </span>

            </div>

            <div className="mt-6 space-y-3 text-sm">

              <p>✓ Track your Stableford scores</p>
              <p>✓ View your score history</p>
              <p>✓ Digital Heroes profile</p>
              <p>✓ 10% charity contribution</p>

            </div>

            <button
              disabled={
                currentPlan === "yearly" ||
                saving === "yearly"
              }
              onClick={() =>
                handleChoosePlan("yearly")
              }
              className={`w-full mt-8 py-3 rounded-xl font-semibold ${
                currentPlan === "yearly"
                  ? "bg-gray-700 text-gray-300 cursor-not-allowed"
                  : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              {saving === "yearly"
                ? "Saving..."
                : currentPlan === "yearly"
                ? "Current Plan"
                : "Choose Yearly"}
            </button>

          </div>

        </div>

        {/* ====================================================
            PROTOTYPE NOTICE
        ==================================================== */}

        <div className="text-center mt-8">

          <p className="text-sm text-gray-500">
            Prototype membership management is handled securely
            through Supabase. Real payment processing will be
            connected after a payment provider is configured.
          </p>

        </div>

      </main>

    </div>
  );
}

export default Subscription;