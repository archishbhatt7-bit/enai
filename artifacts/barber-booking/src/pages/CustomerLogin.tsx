import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { customFetch, useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import BrandMark from "@/components/BrandMark";
import { useCustomerAuth } from "@/lib/customerAuth";

declare global {
  interface Window {
    initSendOTP?: (config: any) => void;
    sendOtp?: (args: string) => Promise<any>;
    verifyOtp?: (args: string) => Promise<any>;
  }
}

type Step = "phone" | "otp";

export default function CustomerLogin() {
  const [, navigate] = useLocation();
  const { loginCustomer, isLoggedIn } = useCustomerAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [msg91Verifying, setMsg91Verifying] = useState(false);
  const phoneRef = useRef(phone);

  useEffect(() => {
    phoneRef.current = phone;
  }, [phone]);

  const doMsg91Verify = async (msg91Token: string) => {
    setMsg91Verifying(true);
    try {
      const data = await customFetch<{ verified: boolean; token?: string; error?: string }>("/api/auth/verify-msg91", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneRef.current, msg91Token }),
      });
      if (!data.verified || !data.token) throw new Error(data.error || "We could not verify that code.");
      loginCustomer(phoneRef.current, data.token);
      navigate("/customer");
    } catch (err: any) {
      setError(err?.message || "We could not verify that code. Please try again.");
    } finally {
      setMsg91Verifying(false);
    }
  };

  useEffect(() => {
    const configuration = {
      widgetId: "366773707859333133323432",
      tokenAuth: "552017Td8Qszz8w6a5cfaffP1",
      exposeMethods: true,
      success: (data: { message?: string }) => data.message && doMsg91Verify(data.message),
      failure: (msg91Error: any) => {
        setError(msg91Error?.message || "The verification service is unavailable. Please try again.");
        setMsg91Verifying(false);
      },
    };
    if (document.getElementById("msg91-script")) return;
    const script = document.createElement("script");
    script.id = "msg91-script";
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.async = true;
    script.onload = () => window.initSendOTP?.(configuration);
    document.head.appendChild(script);
  }, []);

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: (data: any) => {
        if (data.otp) setDemoOtp(data.otp);
        setStep("otp");
        setError("");
      },
      onError: () => setError("We could not send your code. Please try again."),
    },
  });
  const verifyOtpMutation = useVerifyOtp({
    mutation: {
      onSuccess: (data: any) => {
        loginCustomer(phone, data.token);
        navigate("/customer");
      },
      onError: () => setError("That code does not match. Please check it and try again."),
    },
  });

  if (isLoggedIn) {
    navigate("/customer", { replace: true });
    return null;
  }

  const handleSendOtp = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (window.sendOtp) {
      setSendingOtp(true);
      window.sendOtp(`91${phone}`)
        .then(() => { setSendingOtp(false); setStep("otp"); })
        .catch(() => { setSendingOtp(false); setError("We could not send your code. Please try again."); });
      return;
    }
    sendOtpMutation.mutate({ data: { phone } });
  };

  const handleVerify = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (window.verifyOtp) {
      setMsg91Verifying(true);
      window.verifyOtp(otp).catch(() => {
        setMsg91Verifying(false);
        setError("That code does not match. Please try again.");
      });
      return;
    }
    verifyOtpMutation.mutate({ data: { phone, otp } });
  };

  const back = () => {
    setError("");
    step === "otp" ? setStep("phone") : navigate("/");
  };

  return (
    <main className="min-h-screen bg-[#f7f2eb] px-5 py-5 sm:grid sm:place-items-center sm:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-[#ded2c6] bg-[#fffaf5] shadow-[0_22px_55px_rgba(71,50,37,.12)] sm:min-h-0 sm:grid-cols-[.9fr_1.1fr] sm:grid">
        <section className="bg-[#24201d] p-6 text-[#fffaf5] sm:flex sm:flex-col sm:justify-between sm:p-10">
          <div>
            <BrandMark tone="paper" withWordmark className="text-2xl [&_span:last-child]:text-[#fffaf5]" />
            <p className="mt-12 max-w-xs text-3xl font-semibold leading-[1.05] tracking-[-.05em] sm:text-4xl">A proper slot starts with a quick sign-in.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#d7cdc3]">Use your phone number to keep appointments, arrival details, and confirmations in one place.</p>
          </div>
          <p className="mt-10 flex items-center gap-2 text-sm text-[#d7cdc3]"><ShieldCheck className="h-4 w-4 text-[#e9b29a]" /> Your number is used only for your booking.</p>
        </section>

        <section className="flex flex-1 flex-col p-6 sm:p-10">
          <button onClick={back} className="-ml-2 flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[#756b62] transition-colors hover:bg-[#f1e7dd] hover:text-[#24201d]">
            <ArrowLeft className="h-4 w-4" /> {step === "otp" ? "Change number" : "Back to home"}
          </button>
          <div className="my-auto max-w-md pb-6 pt-10 sm:py-12">
            <p className="text-sm font-medium text-[#8a4a32]">Customer access</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[#24201d]">{step === "phone" ? "What’s your mobile number?" : "Enter the code we sent."}</h1>
            <p className="mt-3 text-[0.95rem] leading-6 text-[#625951]">
              {step === "phone" ? "We’ll use it to confirm your appointment and keep your booking details handy." : <>We sent a 6-digit code to <strong className="font-semibold text-[#403a35]">+91 {phone}</strong>.</>}
            </p>

            {error && <div role="alert" className="mt-6 rounded-xl border border-[#e6b7ab] bg-[#fff0ec] px-4 py-3 text-sm font-medium text-[#9d3926]">{error}</div>}

            {step === "phone" ? (
              <form onSubmit={handleSendOtp} className="mt-8 space-y-5">
                <label className="block text-sm font-semibold text-[#403a35]" htmlFor="customer-phone">Mobile number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 border-r border-[#ded2c6] pr-3 text-sm font-medium text-[#756b62]">+91</span>
                  <input id="customer-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} className="min-h-14 w-full rounded-xl border border-[#cfc2b6] bg-white pl-16 pr-4 text-lg font-semibold tracking-[.08em] text-[#24201d] placeholder:tracking-normal placeholder:text-[#a1968d]" />
                </div>
                <button type="submit" disabled={phone.length !== 10 || sendOtpMutation.isPending || sendingOtp} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#b85434] px-5 text-base font-semibold text-white transition-colors hover:bg-[#9f4529] disabled:cursor-not-allowed disabled:opacity-45">
                  {(sendOtpMutation.isPending || sendingOtp) ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending code…</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="mt-8 space-y-5">
                {demoOtp && <div className="rounded-xl border border-[#e4c0af] bg-[#f9e9df] p-4"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#8a4a32]">Demo code</p><p className="mt-1 text-3xl font-semibold tracking-[.25em] text-[#6e3020]">{demoOtp}</p></div>}
                <label className="block text-sm font-semibold text-[#403a35]" htmlFor="customer-otp">6-digit code</label>
                <input id="customer-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="· · · · · ·" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="min-h-16 w-full rounded-xl border border-[#cfc2b6] bg-white px-4 text-center text-3xl font-semibold tracking-[.34em] text-[#24201d] placeholder:tracking-[.18em] placeholder:text-[#b4aaa1]" autoFocus />
                <button type="submit" disabled={otp.length !== 6 || verifyOtpMutation.isPending || msg91Verifying} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#b85434] px-5 text-base font-semibold text-white transition-colors hover:bg-[#9f4529] disabled:cursor-not-allowed disabled:opacity-45">
                  {verifyOtpMutation.isPending || msg91Verifying ? "Checking code…" : <>Continue to eNai <ArrowRight className="h-4 w-4" /></>}
                </button>
                <button type="button" onClick={() => sendOtpMutation.mutate({ data: { phone } })} className="min-h-11 text-sm font-semibold text-[#8a4a32] underline decoration-[#c99a86] underline-offset-4 hover:text-[#6e3020]">Send a new code</button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
