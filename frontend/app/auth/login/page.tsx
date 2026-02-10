"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";

function isEmail(s: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

type LoginResponse = {
    message: string;
    user: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
    };
};

export default function LoginPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needVerify, setNeedVerify] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMsg, setResendMsg] = useState<string | null>(null);

    const emailForResend = useMemo(() => {
        const v = identifier.trim();
        return isEmail(v) ? v : null;
    }, [identifier]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setNeedVerify(false);
        setResendMsg(null);
        setLoading(true);

        try {
            await apiFetch("/api/users/login/", {
                method: "POST",
                json: { identifier, password },
            });

            const next = new URLSearchParams(window.location.search).get("next") || "/";
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
        setResendMsg(null);
        setError(null);

        if (!emailForResend) {
            setError("Vui lòng nhập email (không phải username) để gửi lại email xác minh.");
            return;
        }

        setResendLoading(true);
        try {
            const resp = await apiFetch("/api/users/resend-verification/", {
                method: "POST",
                json: { email: emailForResend },
            });

            setResendMsg("Nếu email tồn tại, email xác minh đã được gửi.");
        } catch (err: any) {
            setError(err?.message || "Không gửi lại được email xác minh.");
        } finally {
            setResendLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Đăng nhập</h1>
                <p className="text-sm text-slate-600">Nhập email hoặc username và mật khẩu.</p>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                    {error}
                </div>
            )}

            <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-1">
                    <label className="text-sm font-medium">Username hoặc Email</label>
                    <input
                        className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="vd: lvnn hoặc lvn0168...@gmail.com"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium">Password</label>
                    <input
                        className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                </div>

                <button
                    disabled={loading}
                    className="w-full rounded-lg bg-slate-900 text-white py-2 font-medium disabled:opacity-60"
                >
                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
            </form>

            {/* Nếu backend báo chưa verify -> hiện nút resend */}
            {needVerify && (
                <div className="rounded-lg border p-3 space-y-2">
                    <div className="text-sm">
                        Tài khoản của bạn chưa được xác minh email.
                    </div>
                    <button
                        onClick={onResend}
                        disabled={resendLoading}
                        className="w-full rounded-lg border bg-white py-2 font-medium disabled:opacity-60"
                    >
                        {resendLoading ? "Đang gửi lại..." : "Gửi lại email xác minh"}
                    </button>
                    {!emailForResend && (
                        <div className="text-xs text-slate-500">
                            * Bạn đang nhập username. Để gửi lại mail, hãy nhập email.
                        </div>
                    )}
                </div>
            )}

            <p className="text-sm text-slate-600">
                Chưa có tài khoản?{" "}
                <Link className="text-slate-900 font-semibold underline" href="/auth/register">
                    Đăng ký
                </Link>
            </p>
        </div>
    );
}
