"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";

type RegisterResponse = { message: string };

function isEmail(s: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function LoginPage() {
    const router = useRouter();
    const [view, setView] = useState<"login" | "register">("login");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [registerForm, setRegisterForm] = useState({
        email: "",
        username: "",
        first_name: "",
        last_name: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [needVerify, setNeedVerify] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    const emailForResend = useMemo(() => {
        const v = identifier.trim();
        return isEmail(v) ? v : null;
    }, [identifier]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setNeedVerify(false);
        setLoading(true);

        try {
            await apiFetch("/api/users/login/", {
                method: "POST",
                json: { identifier, password },
            });

            const next = new URLSearchParams(window.location.search).get("next") || "/friends";
            router.replace(next);
        } catch (err: any) {
            const rawCode = err?.data?.code;
            const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;

            const rawDetail = err?.data?.detail;
            const detail = Array.isArray(rawDetail) ? rawDetail[0] : rawDetail;

            setError(detail || err?.message || "Login failed");

            if (code === "EMAIL_NOT_VERIFIED") {
                setNeedVerify(true);
            }
        } finally {
            setLoading(false);
        }
    }

    async function onResend() {
        setSuccess(null);
        setError(null);

        if (!emailForResend) {
            setError("Please enter your email (not username) to resend verification.");
            return;
        }

        setResendLoading(true);
        try {
            await apiFetch("/api/users/resend-verification/", {
                method: "POST",
                json: { email: emailForResend },
            });

            setSuccess("If the email exists, a verification message has been sent.");
        } catch (err: any) {
            setError(err?.message || "Unable to resend verification email.");
        } finally {
            setResendLoading(false);
        }
    }

    function setRegisterField<K extends keyof typeof registerForm>(key: K, val: string) {
        setRegisterForm((p) => ({ ...p, [key]: val }));
    }

    async function onRegisterSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const data = await apiFetch<RegisterResponse>("/api/users/register/", {
                method: "POST",
                json: registerForm,
            });

            setSuccess(data.message || "Registered successfully. Please sign in.");
            setIdentifier(registerForm.email);
            setPassword("");
            setView("login");
        } catch (err: any) {
            setError(err?.message || "Register failed");
        } finally {
            setLoading(false);
        }
    }

    function switchToRegister() {
        setView("register");
        setError(null);
        setSuccess(null);
        setNeedVerify(false);
    }

    function switchToLogin() {
        setView("login");
        setError(null);
        setSuccess(null);
        setNeedVerify(false);
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <section className="hidden lg:flex flex-col justify-center bg-slate-950 px-12 xl:px-20 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Welcome to</p>
                <h1 className="mt-4 text-5xl xl:text-6xl font-extrabold leading-tight">CThread</h1>
                <p className="mt-6 max-w-md text-slate-300 text-lg leading-relaxed">
                    Connect instantly, share ideas, and keep every conversation in one secure place.
                </p>
            </section>

            <section className="flex items-center justify-center bg-slate-50 px-6 py-12 lg:px-12">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {view === "login" ? "Sign in" : "Create account"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            {view === "login"
                                ? "Use your username or email and password."
                                : "Create a new account to start chatting."}
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
                            {success}
                        </div>
                    )}

                    {view === "login" ? (
                        <>
                            <form onSubmit={onSubmit} className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Username or Email</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Password</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="********"
                                        required
                                    />
                                </div>

                                <button
                                    disabled={loading}
                                    className="w-full rounded-lg bg-slate-900 text-white py-2 font-medium disabled:opacity-60"
                                >
                                    {loading ? "Signing in..." : "Sign in"}
                                </button>
                            </form>

                            {needVerify && (
                                <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                                    <div className="text-sm text-slate-700">Your account is not verified yet.</div>
                                    <button
                                        onClick={onResend}
                                        disabled={resendLoading}
                                        className="w-full rounded-lg border border-slate-300 bg-white py-2 font-medium text-slate-800 disabled:opacity-60"
                                    >
                                        {resendLoading ? "Sending..." : "Resend verification email"}
                                    </button>
                                    {!emailForResend && (
                                        <div className="text-xs text-slate-500">Enter an email address to resend verification.</div>
                                    )}
                                </div>
                            )}

                            <p className="text-sm text-slate-600">
                                Don&apos;t have an account?{" "}
                                <button
                                    type="button"
                                    onClick={switchToRegister}
                                    className="text-slate-900 font-semibold underline"
                                >
                                    Create one
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            <form onSubmit={onRegisterSubmit} className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Email</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                                        value={registerForm.email}
                                        onChange={(e) => setRegisterField("email", e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Username</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                                        value={registerForm.username}
                                        onChange={(e) => setRegisterField("username", e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">First name</label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                                            value={registerForm.first_name}
                                            onChange={(e) => setRegisterField("first_name", e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Last name</label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                                            value={registerForm.last_name}
                                            onChange={(e) => setRegisterField("last_name", e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Password</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                                        type="password"
                                        value={registerForm.password}
                                        onChange={(e) => setRegisterField("password", e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    disabled={loading}
                                    className="w-full rounded-lg bg-slate-900 text-white py-2 font-medium disabled:opacity-60"
                                >
                                    {loading ? "Creating account..." : "Create account"}
                                </button>
                            </form>

                            <p className="text-sm text-slate-600">
                                Already have an account?{" "}
                                <button
                                    type="button"
                                    onClick={switchToLogin}
                                    className="text-slate-900 font-semibold underline"
                                >
                                    Sign in
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
