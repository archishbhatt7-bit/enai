import { useState } from "react";
import { useLocation } from "wouter";
import { useGetAllCustomerBookings, useCancelCustomerBooking } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { ArrowLeft, Scissors, Calendar, Clock, MapPin, X, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed:  { label: "Confirmed",  cls: "bg-green-100 text-green-700" },
    active:     { label: "In Service", cls: "bg-blue-100 text-blue-700" },
    pending:    { label: "Pending",    cls: "bg-yellow-100 text-yellow-700" },
    completed:  { label: "Done",       cls: "bg-slate-100 text-slate-600" },
    cancelled:  { label: "Cancelled",  cls: "bg-red-100 text-red-600" },
    no_show:    { label: "No Show",    cls: "bg-orange-100 text-orange-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

export default function CustomerBookings() {
  const [, navigate] = useLocation();
  const { phone } = useCustomerAuth();
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);

  const { data: bookings = [], isLoading, refetch } = useGetAllCustomerBookings(phone ?? "", {
    query: { enabled: !!phone },
  });

  const cancelMutation = useCancelCustomerBooking({
    mutation: {
      onSuccess: () => {
        setConfirmCancel(null);
        refetch();
      },
    },
  });

  if (!phone) {
    navigate("/customer-login");
    return null;
  }

  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const upcoming = bookings.filter((b) => {
    if (!["confirmed", "active", "pending"].includes(b.status)) return false;
    if (b.slotDate > today) return true;
    if (b.slotDate === today) return b.slotTime >= nowTime;
    return false;
  });

  const past = bookings.filter((b) => !upcoming.includes(b));

  const cancellingId = cancelMutation.isPending ? confirmCancel : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/customer")}
            className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <h1 className="text-2xl font-black text-white">My Bookings</h1>
        <p className="text-slate-400 text-sm mt-0.5">All your appointments</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && bookings.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Scissors className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-600">No bookings yet</p>
            <p className="text-slate-400 text-sm mt-1">Book a slot at a barbershop to get started</p>
            <button
              onClick={() => navigate("/customer")}
              className="mt-4 text-blue-700 font-semibold text-sm hover:text-blue-800"
            >
              Find a shop →
            </button>
          </div>
        )}

        {!isLoading && upcoming.length > 0 && (
          <section>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Upcoming
            </p>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{b.shopName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{b.shopCity}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service</span>
                      <span className="font-semibold text-slate-900">{b.serviceName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</span>
                      <span className="font-semibold text-slate-900">{formatDate(b.slotDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Time</span>
                      <span className="font-semibold text-slate-900">{b.slotTime} – {b.slotEndTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment</span>
                      <span className="font-semibold text-slate-900">
                        ₹{b.amountPaid} paid
                        {b.paymentType === "token" && ` + ₹${b.totalAmount} at shop`}
                      </span>
                    </div>
                  </div>
                  {b.arrivalOtp && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center justify-between mb-3">
                      <span className="text-xs text-blue-800 font-medium">Arrival OTP</span>
                      <span className="text-xl font-black text-slate-900 tracking-widest">{b.arrivalOtp}</span>
                    </div>
                  )}
                  {b.status === "confirmed" && (
                    <button
                      onClick={() => setConfirmCancel(b.id)}
                      className="w-full text-sm font-semibold text-red-600 border border-red-200 rounded-xl py-2 hover:bg-red-50 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {!isLoading && past.length > 0 && (
          <section>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Past Bookings</p>
            <div className="space-y-3">
              {past.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 opacity-80">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Scissors className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{b.shopName}</p>
                      <p className="text-xs text-slate-400">{b.serviceName} · {formatDate(b.slotDate)} at {b.slotTime}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {confirmCancel !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Cancel Booking?</h3>
            <p className="text-sm text-slate-500 text-center mb-5">This action cannot be undone. Your ₹1 platform fee is non-refundable.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Keep it
              </button>
              <button
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ bookingId: confirmCancel, phone })}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {cancelMutation.isPending ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
