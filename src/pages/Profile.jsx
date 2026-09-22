import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
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

    // Get profile
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, phone, role, avatar_url")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setFullName(data?.full_name || "");
    setPhone(data?.phone || "");

    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setMessage("Profile updated successfully!");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f2]">
        <p className="text-gray-600">
          Loading profile...
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
          className="text-sm font-semibold"
        >
          ← Dashboard
        </button>

      </nav>

      {/* Profile */}
      <main className="max-w-2xl mx-auto px-6 py-10">

        <div className="bg-white rounded-3xl shadow-lg p-8">

          <div className="mb-8">

            <p className="text-sm text-gray-500 mb-2">
              Account
            </p>

            <h2 className="text-3xl font-bold">
              My Profile
            </h2>

            <p className="text-gray-500 mt-2">
              Manage your Digital Heroes profile.
            </p>

          </div>

          <form
            onSubmit={handleSave}
            className="space-y-6"
          >

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Email
              </label>

              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-500"
              />

              <p className="text-xs text-gray-400 mt-2">
                Email is managed by your authentication account.
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Full name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Account role
              </label>

              <input
                type="text"
                value="User"
                disabled
                className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-500"
              />
            </div>

            {/* Success */}
            {message && (
              <p className="text-green-600 text-sm">
                {message}
              </p>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-600 text-sm">
                {error}
              </p>
            )}

            {/* Save */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>

          </form>

        </div>

      </main>

    </div>
  );
}

export default Profile;