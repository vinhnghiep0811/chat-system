"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { MeUser } from "@/lib/types";

type ProfileForm = {
  first_name: string;
  last_name: string;
};

type PasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

const MASKED_PASSWORD = "********";

export default function ProfilePage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    first_name: "",
    last_name: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [passwordEditing, setPasswordEditing] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true);
    setLoadError(null);

    try {
      const me = await apiFetch<MeUser>("/api/users/me/", { method: "GET" });
      setUser(me);
      setProfileForm({
        first_name: me.first_name ?? "",
        last_name: me.last_name ?? "",
      });
    } catch (err: any) {
      setLoadError(err?.message || "Cannot load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function updateProfileField<K extends keyof ProfileForm>(key: K, value: string) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  }

  function updatePasswordField<K extends keyof PasswordForm>(key: K, value: string) {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage(null);
    setProfileError(null);
    setProfileSaving(true);

    try {
      const me = await apiFetch<MeUser>("/api/users/me/", {
        method: "PATCH",
        json: {
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
        },
      });
      setUser(me);
      setProfileMessage("Updated profile successfully.");
    } catch (err: any) {
      setProfileError(err?.message || "Cannot update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function onSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirm password must match.");
      return;
    }

    setPasswordSaving(true);

    try {
      const data = await apiFetch<{ message: string }>("/api/users/change-password/", {
        method: "POST",
        json: {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
      });

      setPasswordMessage(data.message || "Password updated successfully.");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setPasswordEditing(false);
    } catch (err: any) {
      setPasswordError(err?.message || "Cannot update password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  const passwordInputType = showPassword ? "text" : "password";

  return (
    <div className="h-full p-6 md:p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/30 p-6 md:p-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your account information.</p>

        {loading ? (
          <div className="mt-6 text-sm text-slate-300">Loading...</div>
        ) : loadError ? (
          <div className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
            {loadError}
          </div>
        ) : !user ? (
          <div className="mt-6 rounded-lg border border-slate-800 p-3 text-sm text-slate-300">
            Profile not found.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {profileMessage && (
              <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">
                {profileMessage}
              </div>
            )}

            {profileError && (
              <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
                {profileError}
              </div>
            )}

            <form onSubmit={onSaveProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-slate-300">Username</label>
                <input
                  readOnly
                  value={user.username}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-slate-300">Fname</label>
                  <input
                    value={profileForm.first_name}
                    onChange={(e) => updateProfileField("first_name", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-slate-300">Lname</label>
                  <input
                    value={profileForm.last_name}
                    onChange={(e) => updateProfileField("last_name", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-slate-300">Email</label>
                <input
                  readOnly
                  value={user.email}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                {profileSaving ? "Saving..." : "Save profile"}
              </button>
            </form>

            <section className="rounded-xl border border-slate-800 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm text-slate-300">Password</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {showPassword
                      ? passwordForm.current_password || "Enter current password below"
                      : MASKED_PASSWORD}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !showPassword;
                    setShowPassword(next);
                    if (!next) {
                      setPasswordEditing(false);
                    }
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                >
                  {showPassword ? "Hide password" : "Show password"}
                </button>
              </div>

              {showPassword && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordEditing((v) => !v);
                      setPasswordError(null);
                      setPasswordMessage(null);
                    }}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                  >
                    {passwordEditing ? "Cancel editing" : "Edit password"}
                  </button>
                </div>
              )}

              {passwordError && (
                <div className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
                  {passwordError}
                </div>
              )}

              {passwordMessage && (
                <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">
                  {passwordMessage}
                </div>
              )}

              {showPassword && passwordEditing && (
                <form onSubmit={onSavePassword} className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm text-slate-300">Current password</label>
                    <input
                      type={passwordInputType}
                      value={passwordForm.current_password}
                      onChange={(e) => updatePasswordField("current_password", e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-slate-300">New password</label>
                    <input
                      type={passwordInputType}
                      value={passwordForm.new_password}
                      onChange={(e) => updatePasswordField("new_password", e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-slate-300">Confirm new password</label>
                    <input
                      type={passwordInputType}
                      value={passwordForm.confirm_password}
                      onChange={(e) => updatePasswordField("confirm_password", e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    {passwordSaving ? "Saving..." : "Save password"}
                  </button>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
