import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useSendOtp, useVerifyOtp, customFetch } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { ArrowLeft, Phone, Scissors } from "lucide-react";

declare global {
  interface Window {
    initSendOTP: (config: any) => void;
    sendOtp: (args: any) => Promise<any>;
    verifyOtp: (args: any) => Promise<any>;
    retryOtp: (args: any) => Promise<any>;
  }
}

type Step = "phone" | "otp";

export default function CustomerLogin() {
  const [, navigate] = useLocation();
  const { loginCustomer, isLoggedIn } = useCustomerAuth();
  const [step, setStep] = useState<Step>("phone");
  
  // If already logged in, bounce to dashboard immediately
  if (isLoggedIn) {
    navigate("/customer", { replace: true });
    return null; // Don't render the form
  }

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reqId, setReqId] = useState<string | null>(null);
  const [msg91Verifying, setMsg91Verifying] = useState(false);
  const otpProvider = import.meta.env.VITE_OTP_PROVIDER || "internal";

  const phoneRef = useRef(phone);
  useEffect(() => {
    phoneRef.current = phone;
  }, [phone]);

  const doMsg91Verify = async (msg91Token: string) => {
    setMsg91Verifying(true);
    try {
      const data = await customFetch<{ verified: boolean; token?: string; error?: string }>("/auth/verify-msg91", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneRef.current, msg91Token }),
      });
      if (data.verified && data.token) {
         loginCustomer(phoneRef.current, data.token);
         navigate("/customer");
      } else {
         setError(data.error || "Verification failed on backend");
      }
    } catch (e: any) {
      setError(e?.message || (typeof e === "string" ? e : "Network error during verification"));
    } finally {
      setMsg91Verifying(false);
    }
  };

  useEffect(() => {
    const configuration = {
      widgetId: "366773707859333133323432",
      tokenAuth: "552017Td8Qszz8w6a5cfaffP1",
      exposeMethods: true,
      success: (data: any) => {
        console.log("MSG91 success", data);
        if (data.message) {
          doMsg91Verify(data.message);
        }
      },
      failure: (error: any) => {
        console.log("MSG91 failure", error);
        setError(error?.message || (typeof error === "string" ? error : "MSG91 Widget Error"));
        setMsg91Verifying(false);
      },
    };

    const urls = [
      'https://verify.msg91.com/otp-provider.js',
      'https://verify.phone91.com/otp-provider.js'
    ];
    let i = 0;
    function attempt() {
        if (document.getElementById('msg91-script')) return; // Already loading
        const s = document.createElement('script');
        s.id = 'msg91-script';
        s.src = urls[i];
        s.async = true;
        s.onload = () => {
            if (typeof window.initSendOTP === 'function') {
                window.initSendOTP(configuration);
            }
        };
        s.onerror = () => {
            i++;
            if (i < urls.length) {
                attempt();
            }
        };
        document.head.appendChild(s);
    }
    attempt();
  }, []);

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: (data: any) => {
        if (data.otp) setDemoOtp(data.otp);
        setStep("otp");
        setError("");
      },
      onError: () => setError("Failed to send OTP. Try again."),
    },
  });

  const verifyOtpMutation = useVerifyOtp({
    mutation: {
      onSuccess: (data: any) => {
        loginCustomer(phone, data.token);
        navigate("/customer");
      },
      onError: () => setError("Wrong OTP. Please try again."),
    },
  });

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (phone.length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    
    if (window.sendOtp) {
      try {
        window.sendOtp("91" + phone);
        setStep("otp");
      } catch (err: any) {
        setError(err?.message || (typeof err === "string" ? err : "Failed to send OTP via MSG91"));
      }
    } else {
      // Fallback if MSG91 is blocked/down
      sendOtpMutation.mutate({ data: { phone } });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (window.verifyOtp && reqId) {
      setMsg91Verifying(true);
      try {
        await window.verifyOtp({ otp, reqId });
        // The success callback in configuration will handle the rest!
      } catch (err: any) {
        setMsg91Verifying(false);
        setError(err.message || "Invalid OTP");
      }
    } else {
      // Fallback
      verifyOtpMutation.mutate({ data: { phone, otp } });
    }
  };

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col">
      {/* Header strip */}
      <div className="px-5 pt-12 pb-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl mb-5">
          <Scissors className="w-8 h-8 text-slate-900" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">eNai</h1>
        <p className="text-slate-400 text-sm mt-1">Customer Login / Sign up</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8 pb-10">
        <button
          onClick={() => step === "otp" ? setStep("phone") : navigate("/")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {step === "phone" && (
          <>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Login / Sign up</h2>
            <p className="text-slate-400 text-sm mb-8">We'll send a 6-digit OTP to verify you</p>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {otpProvider === "msg91" ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <Msg91Widget onSuccess={handleMsg91Success} />
              </div>
            ) : (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-slate-400 font-semibold text-sm">+91</span>
                      <div className="w-px h-5 bg-slate-200" />
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full pl-16 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 font-semibold text-lg focus:outline-none focus:border-blue-600 tracking-widest"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={phone.length < 10 || sendOtpMutation.isPending}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-base hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {sendOtpMutation.isPending ? "Sending…" : "Send OTP →"}
                </button>
              </form>
            )}
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Enter OTP</h2>
            <p className="text-slate-400 text-sm mb-2">Sent to <strong>+91 {phone}</strong></p>

            {demoOtp && (
              <div className="mb-5 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Demo — Your OTP</p>
                <p className="text-4xl font-black text-blue-800 tracking-[0.3em]">{demoOtp}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="· · · · · ·"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 font-black text-4xl text-center focus:outline-none focus:border-blue-600 tracking-[0.3em]"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={otp.length !== 6 || verifyOtpMutation.isPending || msg91Verifying}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-base hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifyOtpMutation.isPending || msg91Verifying ? "Verifying…" : "Verify & Continue →"}
              </button>

              <button
                type="button"
                onClick={() => sendOtpMutation.mutate({ data: { phone } })}
                className="w-full text-slate-400 text-sm py-2 hover:text-slate-600 transition-colors"
              >
                Resend OTP
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
