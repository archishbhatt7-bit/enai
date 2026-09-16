import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Store } from "lucide-react";
import { useLoginBarber } from "@workspace/api-client-react";
import BrandMark from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const [, navigate] = useLocation();
  const { login, isAuthenticated, shop } = useAuth();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const mutation = useLoginBarber({
    mutation: {
      onSuccess: (data: any) => {
        login(data.token, data.owner, data.shop);
        navigate(data.shop ? `/dashboard/${data.shop.slug}` : "/create-shop");
      },
      onError: () => setError("That phone number or password does not match our records."),
    },
  });

  if (isAuthenticated) {
    navigate(shop ? `/dashboard/${shop.slug}` : "/create-shop", { replace: true });
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.phone || !form.password) {
      setError("Enter your phone number and password to continue.");
      return;
    }
    mutation.mutate({ data: form });
  };

  return (
    <main className="min-h-screen bg-[#f7f2eb] px-5 py-5 sm:grid sm:place-items-center sm:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-[#ded2c6] bg-[#fffaf5] shadow-[0_22px_55px_rgba(71,50,37,.12)] sm:min-h-0 sm:grid sm:grid-cols-[.9fr_1.1fr]">
        <section className="bg-[#24201d] p-6 text-[#fffaf5] sm:flex sm:flex-col sm:justify-between sm:p-10">
          <div>
            <BrandMark tone="paper" withWordmark className="text-2xl [&_span:last-child]:text-[#fffaf5]" />
            <p className="mt-12 max-w-sm text-3xl font-semibold leading-[1.05] tracking-[-.05em] sm:text-4xl">Your day, all your chairs, in one calm view.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#d7cdc3]">Sign in to manage bookings, availability, and the customers arriving next.</p>
          </div>
          <button onClick={() => navigate("/customer-login")} className="mt-10 flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm font-medium text-[#e9b29a] transition-colors hover:text-white">
            Looking to book instead? <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        <section className="flex flex-1 flex-col p-6 sm:p-10">
          <button onClick={() => navigate("/")} className="-ml-2 flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[#756b62] transition-colors hover:bg-[#f1e7dd] hover:text-[#24201d]"><ArrowLeft className="h-4 w-4" /> Back to home</button>
          <div className="my-auto max-w-md pb-6 pt-10 sm:py-12">
            <p className="text-sm font-medium text-[#8a4a32]">Shop owner access</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[#24201d]">Welcome back.</h1>
            <p className="mt-3 text-[0.95rem] leading-6 text-[#625951]">Sign in to your eNai workspace.</p>
            {error && <div role="alert" className="mt-6 rounded-xl border border-[#e6b7ab] bg-[#fff0ec] px-4 py-3 text-sm font-medium text-[#9d3926]">{error}</div>}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="barber-phone" className="mb-2 block text-sm font-semibold text-[#403a35]">Mobile number</label>
                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 border-r border-[#ded2c6] pr-3 text-sm font-medium text-[#756b62]">+91</span><input id="barber-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))} className="min-h-13 w-full rounded-xl border border-[#cfc2b6] bg-white pl-16 pr-4 text-base font-semibold tracking-[.06em] text-[#24201d] placeholder:tracking-normal placeholder:text-[#a1968d]" /></div>
              </div>
              <div>
                <label htmlFor="barber-password" className="mb-2 block text-sm font-semibold text-[#403a35]">Password</label>
                <div className="relative"><input id="barber-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Your password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="min-h-13 w-full rounded-xl border border-[#cfc2b6] bg-white px-4 pr-12 text-base text-[#24201d] placeholder:text-[#a1968d]" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-[#756b62] hover:bg-[#f1e7dd] hover:text-[#403a35]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              </div>
              <button type="submit" disabled={mutation.isPending} className="mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#b85434] px-5 text-base font-semibold text-white transition-colors hover:bg-[#9f4529] disabled:cursor-not-allowed disabled:opacity-45">{mutation.isPending ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4" /></>}</button>
            </form>
            <div className="mt-8 border-t border-[#e5dbd1] pt-6"><p className="text-sm text-[#625951]">New to eNai?</p><button onClick={() => navigate("/register")} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#8a4a32] underline decoration-[#c99a86] underline-offset-4 hover:text-[#6e3020]"><Store className="h-4 w-4" /> Create your shop account</button></div>
          </div>
        </section>
      </div>
    </main>
  );
}
