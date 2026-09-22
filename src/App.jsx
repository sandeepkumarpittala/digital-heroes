import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import EnterScore from "./pages/EnterScore";
import MyScores from "./pages/MyScores";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import Draws from "./pages/Draws";
import AdminDraws from "./pages/AdminDraws";
import AdminWinnerClaims from "./pages/AdminWinnerClaims";
import AdminWinnerPayouts from "./pages/AdminWinnerPayouts";
import MyPayouts from "./pages/MyPayouts";
import Charities from "./pages/Charities";
import AdminCharities from "./pages/AdminCharities";
import AdminUsers from "./pages/AdminUsers";
import AdminReports from "./pages/AdminReports";

import "./App.css";


/* =========================================================
   HOME PAGE
========================================================= */

function Home() {
  return (
    <div className="min-h-screen bg-[#f7f7f2]">

      {/* Navbar */}
      <nav className="h-20 bg-white border-b flex items-center justify-between px-8">

        <Link to="/" className="font-bold text-xl">
          DIGITAL HEROES
        </Link>

        <div className="flex items-center gap-6">

          <Link
            to="/signin"
            className="text-sm font-medium"
          >
            Sign in
          </Link>

          <Link
            to="/signup"
            className="bg-black text-white px-5 py-3 rounded-full text-sm font-semibold"
          >
            Join Digital Heroes
          </Link>

        </div>
      </nav>


      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-24">

        <div className="grid md:grid-cols-2 gap-16 items-center">

          <div>

            <p className="text-sm tracking-[0.25em] text-gray-500 mb-6">
              GOLF WITH A PURPOSE
            </p>

            <h1 className="text-6xl font-bold leading-tight">
              Play your game.
              <br />

              <span className="text-[#78906f]">
                Create impact.
              </span>
            </h1>

            <p className="text-lg text-gray-600 mt-6 max-w-xl">
              Track your golf performance, take part in monthly
              rewards, and direct part of your subscription towards
              a cause you care about.
            </p>

            <div className="flex gap-4 mt-8">

              <Link
                to="/signup"
                className="bg-black text-white px-7 py-4 rounded-full font-semibold"
              >
                Start your journey →
              </Link>

              <a
                href="#how-it-works"
                className="border border-gray-300 bg-white px-7 py-4 rounded-full font-semibold"
              >
                Explore how it works →
              </a>

            </div>

          </div>


          {/* Impact Card */}
          <div className="bg-[#11120f] text-white rounded-3xl p-8">

            <p className="text-gray-400 text-sm">
              YOUR IMPACT
            </p>

            <h2 className="text-gray-400 mt-10">
              Your charity contribution
            </h2>

            <p className="text-5xl font-bold mt-2">
              10%
            </p>

            <p className="text-gray-400 mt-3">
              Every subscriber contributes at least 10% of
              their subscription fee to a chosen charity.
            </p>

            <div className="mt-10 bg-[#292a27] rounded-2xl p-5">

              <p className="text-gray-400 text-sm">
                LATEST SCORES
              </p>

              <div className="grid grid-cols-5 gap-2 mt-4">

                {[38, 34, 41, 29, 36].map((score) => (
                  <div
                    key={score}
                    className="bg-[#3a3b37] rounded-xl p-3 text-center"
                  >
                    <p className="text-xl font-bold">
                      {score}
                    </p>

                    <p className="text-xs text-gray-400">
                      SCORE
                    </p>
                  </div>
                ))}

              </div>
            </div>

          </div>

        </div>

      </main>


      {/* How it works */}
      <section
        id="how-it-works"
        className="max-w-6xl mx-auto px-6 py-24"
      >

        <p className="text-sm tracking-[0.25em] text-gray-500">
          HOW IT WORKS
        </p>

        <h2 className="text-4xl font-bold mt-4">
          Three simple steps.
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mt-12">

          {[
            {
              number: "01",
              title: "Become a member",
              text: "Choose a monthly or yearly subscription and create your Digital Heroes profile.",
            },
            {
              number: "02",
              title: "Track your game",
              text: "Enter your latest Stableford scores. Your five most recent scores are retained.",
            },
            {
              number: "03",
              title: "Play with purpose",
              text: "Participate in monthly draws while directing part of your subscription towards a charity.",
            },
          ].map((item) => (

            <div
              key={item.number}
              className="bg-white border border-gray-200 rounded-3xl p-8"
            >

              <p className="text-gray-400 text-sm">
                {item.number}
              </p>

              <h3 className="text-xl font-bold mt-12">
                {item.title}
              </h3>

              <p className="text-gray-500 mt-4 leading-relaxed">
                {item.text}
              </p>

            </div>

          ))}

        </div>

      </section>


      {/* Footer */}
      <footer className="border-t bg-white px-8 py-10">

        <div className="max-w-6xl mx-auto flex justify-between">

          <div>

            <p className="font-bold">
              DIGITAL HEROES
            </p>

            <p className="text-gray-500 text-sm mt-2">
              Play. Win. Give Back.
            </p>

          </div>

          <p className="text-gray-500 text-sm">
            © 2026 Digital Heroes.
          </p>

        </div>

      </footer>

    </div>
  );
}


/* =========================================================
   AUTHENTICATION / SUBSCRIPTION PROTECTION
========================================================= */

function ProtectedRoute({
  children,
  requireSubscription = false,
}) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [redirectTo, setRedirectTo] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {

        /* ---------------------------------------------
           1. Check authentication
        --------------------------------------------- */

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (mounted) {
            setRedirectTo("/signin");
            setLoading(false);
          }

          return;
        }


        /* ---------------------------------------------
           2. If subscription is not required,
              authenticated user can continue.
        --------------------------------------------- */

        if (!requireSubscription) {

          if (mounted) {
            setAllowed(true);
            setLoading(false);
          }

          return;
        }


        /* ---------------------------------------------
           3. Get profile + subscription
        --------------------------------------------- */

        const [profileResult, subscriptionResult] =
          await Promise.all([

            supabase
              .from("profiles")
              .select("role")
              .eq("id", session.user.id)
              .maybeSingle(),

            supabase
              .from("subscriptions")
              .select("status")
              .eq("user_id", session.user.id)
              .order("created_at", {
                ascending: false,
              })
              .limit(1)
              .maybeSingle(),

          ]);


        if (profileResult.error) {
          throw profileResult.error;
        }

        if (subscriptionResult.error) {
          throw subscriptionResult.error;
        }


        /* ---------------------------------------------
           4. Admin bypass
           
           Admins can access member/admin pages even
           if their own membership is cancelled.
        --------------------------------------------- */

        const isAdmin =
          profileResult.data?.role === "admin";


        if (isAdmin) {

          if (mounted) {
            setAllowed(true);
            setLoading(false);
          }

          return;
        }


        /* ---------------------------------------------
           5. Normal users need ACTIVE subscription
        --------------------------------------------- */

        const subscriptionStatus =
          subscriptionResult.data?.status;


        if (subscriptionStatus === "active") {

          if (mounted) {
            setAllowed(true);
            setLoading(false);
          }

          return;
        }


        /* ---------------------------------------------
           6. No active subscription
        --------------------------------------------- */

        if (mounted) {
          setRedirectTo("/subscription");
          setLoading(false);
        }

      } catch (error) {

        console.error(
          "Protected route access check failed:",
          error
        );

        if (mounted) {
          setRedirectTo("/subscription");
          setLoading(false);
        }
      }
    }


    checkAccess();


    return () => {
      mounted = false;
    };

  }, [requireSubscription]);


  /* ---------------------------------------------
     Loading screen
  --------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f2]">

        <div className="text-center">

          <div className="text-2xl font-bold">
            DIGITAL HEROES
          </div>

          <p className="text-gray-500 mt-2">
            Checking your membership...
          </p>

        </div>

      </div>
    );
  }


  /* ---------------------------------------------
     Redirect if access denied
  --------------------------------------------- */

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }


  /* ---------------------------------------------
     Allow page
  --------------------------------------------- */

  if (allowed) {
    return children;
  }


  return null;
}


/* =========================================================
   APP
========================================================= */

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* ============================================
            PUBLIC ROUTES
        ============================================ */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/signin"
          element={<SignIn />}
        />

        <Route
          path="/signup"
          element={<SignUp />}
        />


        {/* ============================================
            AUTHENTICATED ROUTES
        ============================================ */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          }
        />


        {/* ============================================
            MEMBER-ONLY ROUTES
        ============================================ */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireSubscription>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/enter-score"
          element={
            <ProtectedRoute requireSubscription>
              <EnterScore />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-scores"
          element={
            <ProtectedRoute requireSubscription>
              <MyScores />
            </ProtectedRoute>
          }
        />

        <Route
          path="/draws"
          element={
            <ProtectedRoute requireSubscription>
              <Draws />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-payouts"
          element={
            <ProtectedRoute requireSubscription>
              <MyPayouts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/charities"
          element={
            <ProtectedRoute requireSubscription>
              <Charities />
            </ProtectedRoute>
          }
        />


        {/* ============================================
            ADMIN ROUTES
           
            Admin pages already perform their own
            admin authorization checks.
        ============================================ */}

        <Route
          path="/admin/draws"
          element={
            <ProtectedRoute>
              <AdminDraws />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/winner-claims"
          element={
            <ProtectedRoute>
              <AdminWinnerClaims />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/winner-payouts"
          element={
            <ProtectedRoute>
              <AdminWinnerPayouts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/charities"
          element={
            <ProtectedRoute>
              <AdminCharities />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute>
              <AdminReports />
            </ProtectedRoute>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;