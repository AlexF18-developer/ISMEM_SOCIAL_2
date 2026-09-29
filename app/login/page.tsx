"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.ok) {
      router.push("/");
      return;
    }

    setError("Correo o contraseña incorrectos");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-bold text-[#1877F2]">
          ISMEM SOCIAL
        </h1>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-[#CED0D4] px-4 py-3 text-[#050505] placeholder-[#65676B] focus:border-[#1877F2] focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            />

            <input
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-[#CED0D4] px-4 py-3 text-[#050505] placeholder-[#65676B] focus:border-[#1877F2] focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-md bg-[#1877F2] py-2.5 text-lg font-bold text-white transition hover:bg-[#166FE5] disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {error && (
            <p className="mt-3 text-center text-sm font-medium text-[#E41E3F]">{error}</p>
          )}

          <hr className="my-5 border-[#DADDE1]" />

          <div className="text-center">
            <Link
              href="/register"
              className="inline-block rounded-md bg-[#42B72A] px-4 py-2 font-semibold text-white transition hover:bg-[#36A420]"
            >
              Crear cuenta nueva
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}