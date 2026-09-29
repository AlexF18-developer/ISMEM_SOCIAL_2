"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Error al registrarse");
      setLoading(false);
      return;
    }

    const loginRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (loginRes?.ok) {
      router.push("/");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-bold text-[#1877F2]">
          ISMEM SOCIAL
        </h1>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-center text-lg font-semibold text-[#050505]">
            Crear cuenta nueva
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-[#CED0D4] px-4 py-3 text-[#050505] placeholder-[#65676B] focus:border-[#1877F2] focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            />

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
              className="mt-1 rounded-md bg-[#42B72A] py-2.5 text-lg font-bold text-white transition hover:bg-[#36A420] disabled:opacity-60"
            >
              {loading ? "Creando..." : "Registrarse"}
            </button>
          </form>

          {error && (
            <p className="mt-3 text-center text-sm font-medium text-[#E41E3F]">{error}</p>
          )}

          <hr className="my-5 border-[#DADDE1]" />

          <div className="text-center">
            <Link href="/login" className="text-sm font-semibold text-[#1877F2] hover:underline">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}