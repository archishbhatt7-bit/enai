import { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle, XCircle } from "lucide-react";

interface PendingShop {
  id: number;
  slug: string;
  shopName: string;
  city: string;
  ownerId: number;
  createdAt: string;
}

const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://enai-api-server.vercel.app" : "");
export default function Admin() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<PendingShop[]>([]);

  useEffect(() => {
    if (token) {
      fetchShops();
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      
      setToken(data.token);
      localStorage.setItem("admin_token", data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchShops = async () => {
    try {
      const res = await fetch(`${apiBase}/api/admin/shops/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setToken(null);
        localStorage.removeItem("admin_token");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setShops(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAction = async (id: number, action: "approve" | "reject") => {
    if (!confirm(`Are you sure you want to ${action} this shop?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/shops/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to ${action}`);
      setShops(shops.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Admin Portal</h1>
          <p className="text-slate-500 text-sm mb-6 font-medium">Enter your admin password to continue.</p>
          
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200">{error}</div>}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Admin Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-500 transition-colors disabled:opacity-60 shadow-lg shadow-red-600/30"
            >
              {loading ? "Verifying..." : "Login to Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 font-medium">Manage pending shop registrations</p>
          </div>
          <button
            onClick={() => {
              setToken(null);
              localStorage.removeItem("admin_token");
            }}
            className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300"
          >
            Logout
          </button>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200">{error}</div>}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Pending Verification ({shops.length})</h2>
            <button onClick={fetchShops} className="text-sm font-bold text-blue-600 hover:text-blue-700">Refresh</button>
          </div>
          
          {shops.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              No shops pending verification.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {shops.map(shop => (
                <div key={shop.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">{shop.shopName}</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">
                      City: <span className="font-bold text-slate-700">{shop.city}</span> &middot; Slug: <span className="font-mono text-slate-700">{shop.slug}</span>
                    </p>
                    <p className="text-slate-400 text-xs mt-1">Registered: {new Date(shop.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-3 mt-4 md:mt-0">
                    <button
                      onClick={() => handleAction(shop.id, "approve")}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-6 py-3 rounded-2xl font-black text-sm transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" /> Approve
                    </button>
                    <button
                      onClick={() => handleAction(shop.id, "reject")}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-6 py-3 rounded-2xl font-black text-sm transition-colors"
                    >
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
