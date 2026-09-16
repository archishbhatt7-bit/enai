import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRegisterBarber } from "@workspace/api-client-react";
import BrandMark from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";

export default function Register() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ownerName: "", phone: "", password: "" });
  const registerMutation = useRegisterBarber({
    mutation: {
      onSuccess: (data: any) => {
        login(data.token, data.owner, data.shop || null);
        navigate("/create-shop");
      },
      onError: (err: any) => setError(err?.data?.error || "We could not create your account. Please try again."),
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.ownerName || !form.phone || !form.password) return setError("Complete all three fields to create your account.");
    if (form.phone.length !== 10) return setError("Enter a valid 10-digit mobile number.");
    if (form.password.length < 6) return setError("Your password needs at least 6 characters.");
    registerMutation.mutate({ data: { ...form, otp: "" } });
  };

  return (
    <main className="min-h-screen bg-[#f7f2eb] px-5 py-5 sm:grid sm:place-items-center sm:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-[#ded2c6] bg-[#fffaf5] shadow-[0_22px_55px_rgba(71,50,37,.12)] sm:min-h-0 sm:grid sm:grid-cols-[.9fr_1.1fr]">
        <section className="bg-[#24201d] p-6 text-[#fffaf5] sm:flex sm:flex-col sm:justify-between sm:p-10">
          <div>
            <BrandMark tone="paper" withWordmark className="text-2xl [&_span:last-child]:text-[#fffaf5]" />
            <p className="mt-12 max-w-sm text-3xl font-semibold leading-[1.05] tracking-[-.05em] sm:text-4xl">Let customers book around your day.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#d7cdc3]">Create your account first. We’ll help you add your shop, services, and opening hours next.</p>
          </div>
          <ul className="mt-10 space-y-3 text-sm text-[#d7cdc3]">
            {["Set your services and prices", "Share your booking link", "See every appointment in one place"].map((item) => <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#e9b29a]" /> {item}</li>)}
          </ul>
        </section>
        <section className="flex flex-1 flex-col p-6 sm:p-10">
          <button onClick={() => navigate("/")} className="-ml-2 flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[#756b62] transition-colors hover:bg-[#f1e7dd] hover:text-[#24201d]"><ArrowLeft className="h-4 w-4" /> Back to home</button>
          <div className="my-auto max-w-md pb-6 pt-10 sm:py-12">
            <p className="text-sm font-medium text-[#8a4a32]">For shop owners</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[#24201d]">Create your account.</h1>
            <p className="mt-3 text-[0.95rem] leading-6 text-[#625951]">This takes a minute. You’ll add shop details right after.</p>
            {error && <div role="alert" className="mt-6 rounded-xl border border-[#e6b7ab] bg-[#fff0ec] px-4 py-3 text-sm font-medium text-[#9d3926]">{error}</div>}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div><label htmlFor="owner-name" className="mb-2 block text-sm font-semibold text-[#403a35]">Your name</label><input id="owner-name" type="text" autoComplete="name" placeholder="e.g. Rahul Sharma" value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} className="min-h-13 w-full rounded-xl border border-[#cfc2b6] bg-white px-4 text-base text-[#24201d] placeholder:text-[#a1968d]" /></div>
              <div><label htmlFor="owner-phone" className="mb-2 block text-sm font-semibold text-[#403a35]">Mobile number</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 border-r border-[#ded2c6] pr-3 text-sm font-medium text-[#756b62]">+91</span><input id="owner-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))} className="min-h-13 w-full rounded-xl border border-[#cfc2b6] bg-white pl-16 pr-4 text-base font-semibold tracking-[.06em] text-[#24201d] placeholder:tracking-normal placeholder:text-[#a1968d]" /></div></div>
              <div><label htmlFor="owner-password" className="mb-2 block text-sm font-semibold text-[#403a35]">Create a password</label><input id="owner-password" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="min-h-13 w-full rounded-xl border border-[#cfc2b6] bg-white px-4 text-base text-[#24201d] placeholder:text-[#a1968d]" /></div>
              <button type="submit" disabled={registerMutation.isPending} className="mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#b85434] px-5 text-base font-semibold text-white transition-colors hover:bg-[#9f4529] disabled:cursor-not-allowed disabled:opacity-45">{registerMutation.isPending ? "Creating account…" : <>Continue to shop setup <ArrowRight className="h-4 w-4" /></>}</button>
            </form>
            <p className="mt-8 border-t border-[#e5dbd1] pt-6 text-sm text-[#625951]">Already use eNai? <button onClick={() => navigate("/login")} className="font-semibold text-[#8a4a32] underline decoration-[#c99a86] underline-offset-4 hover:text-[#6e3020]">Sign in</button></p>
          </div>
        </section>
      </div>
    </main>
  );
}
