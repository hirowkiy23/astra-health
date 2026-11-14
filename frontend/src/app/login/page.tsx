'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'ASTRA — Crew access'; }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    if (!email || !password) {
      setError('Enter your email and password to access the demo dashboard.');
      setLoading(false);
      return;
    }
    // Prototype access only: this is not authentication and accepts no real credentials.
    sessionStorage.setItem('astra-demo-access', 'granted');
    router.push('/dashboard');
  }

  return (
    <main className="mission-bg min-h-screen p-8 lg:p-[62px_80px]">
      <div className="mx-auto grid min-h-[calc(100vh-124px)] max-w-[1280px] gap-16 overflow-hidden rounded-[34px] border border-[#397d91]/60 bg-[#001426]/20 p-6 lg:grid-cols-2 lg:gap-12 lg:p-8">
        <div className="relative hidden min-h-[600px] overflow-hidden rounded-[22px] border border-[#397d91]/50 lg:block">
          <Image src="/orbital-login.png" alt="Orbital spacecraft above Earth" fill priority className="object-cover" />
        </div>
        <section className="flex flex-col justify-center px-4 py-10 sm:px-10 lg:px-14">
          <p className="mb-12 text-xs font-bold uppercase tracking-[.3em] text-[#85bacb]">Mission health system</p>
          <h1 className="text-3xl font-extrabold uppercase tracking-wide text-white lg:text-4xl">Welcome to NASA</h1>
          <p className="mt-4 text-sm leading-6 text-[#b3d2dd]">Crew health monitoring and mission decision support.</p>
          <form onSubmit={submit} className="mt-14 space-y-6">
            <label className="block">
              <span className="mb-3 block text-sm font-semibold text-white">Your Email</span>
              <input name="email" type="email" autoComplete="off" required className="h-14 w-full rounded-xl border border-[#578c9e]/60 bg-[#c5d7df] px-5 text-base font-medium text-[#071e2d] outline-none focus:border-[#6ac2d0] focus:ring-2 focus:ring-[#6ac2d0]/25" />
            </label>
            <label className="block">
              <span className="mb-3 block text-sm font-semibold text-white">Password</span>
              <input name="password" type="password" autoComplete="off" required className="h-14 w-full rounded-xl border border-[#578c9e]/60 bg-[#c5d7df] px-5 text-base text-[#071e2d] outline-none focus:border-[#6ac2d0] focus:ring-2 focus:ring-[#6ac2d0]/25" />
            </label>
            {error && <p role="alert" className="text-sm text-[#ffc0c0]">{error}</p>}
            <button disabled={loading} className="mt-4 h-12 rounded-lg bg-[#b52828] px-12 text-sm font-extrabold uppercase tracking-widest text-white transition hover:bg-[#ce3636] focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-60">{loading ? 'Opening…' : 'Masuk'}</button>
          </form>
          <p className="mt-8 max-w-sm text-[11px] leading-5 text-[#84aaba]">Prototype only. Enter any demo credentials; no credentials are stored or transmitted. Do not use real account passwords.</p>
        </section>
      </div>
    </main>
  );
}
