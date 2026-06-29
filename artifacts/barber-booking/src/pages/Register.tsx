import { useState } from "react";
import { useLocation } from "wouter";
import { useRegisterBarber, useCreateService } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Scissors, ArrowLeft, Check, Plus, Trash2, Camera, MapPin, Navigation } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import LocationPicker from "@/components/LocationPicker";

const PRESET_SERVICES = [
  { name: "Haircut", price: 150, durationMinutes: 30 },
  { name: "Beard Trim", price: 80, durationMinutes: 20 },
  { name: "Shave", price: 60, durationMinutes: 15 },
  { name: "Face Massage", price: 120, durationMinutes: 25 },
  { name: "De-tan", price: 200, durationMinutes: 40 },
  { name: "Hair Color", price: 400, durationMinutes: 60 },
  { name: "Hair Wash", price: 80, durationMinutes: 20 },
];

interface ServiceConfig {
  name: string;
  price: number | "";
  durationMinutes: number | "";
}

type Step = "details" | "photos" | "services" | "done";

const STEPS: Step[] = ["details", "photos", "services", "done"];
const STEP_LABELS: Record<Step, string> = {
  details: "Shop Details",
  photos: "Photos",
  services: "Services",
  done: "Done",
};

export default function Register() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("details");
  const [error, setError] = useState("");
  const [shopSlug, setShopSlug] = useState("");
  const [shopName, setShopName] = useState("");

  const [form, setForm] = useState({
    ownerName: "",
    shopName: "",
    phone: "",
    password: "",
    numChairs: 2 as number | "",
    numBarbers: 2 as number | "",
    city: "",
    address: "",
    openTime: "09:00",
    closeTime: "20:00",
    pincode: "",
    latitude: "",
    longitude: "",
  });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({});
  const [serviceConfigs, setServiceConfigs] = useState<Record<string, ServiceConfig>>(
    Object.fromEntries(PRESET_SERVICES.map((s) => [s.name, { ...s }]))
  );
  const [customServices, setCustomServices] = useState<ServiceConfig[]>([]);

  // Photo state
  const [profilePhotoPaths, setProfilePhotoPaths] = useState<string[]>([]);
  const [interiorPhotoPaths, setInteriorPhotoPaths] = useState<string[]>([]);
  const [photosError, setPhotosError] = useState("");
  const [savingPhotos, setSavingPhotos] = useState(false);

  const registerMutation = useRegisterBarber({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.shop);
        setShopSlug(data.shop.slug);
        setShopName(data.shop.shopName);
        setStep("photos");
      },
      onError: (err: any) => {
        setError(err?.data?.error || "Registration failed. Please try again.");
      },
    },
  });

  const createServiceMutation = useCreateService();

  const handleUseMyLocation = () => {
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocStatus("done");
      },
      () => setLocStatus("error")
    );
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.ownerName || !form.shopName || !form.phone || !form.password || !form.city) {
      setError("Please fill in all required fields.");
      return;
    }
    registerMutation.mutate({
      data: {
        ...form,
        numChairs: Number(form.numChairs) || 0,
        numBarbers: Number(form.numBarbers) || 0,
        pincode: form.pincode || undefined,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
      },
    });
  };

  const handlePhotosSubmit = async () => {
    setPhotosError("");
    if (profilePhotoPaths.length === 0) {
      setPhotosError("Please upload at least one profile photo.");
      return;
    }
    if (interiorPhotoPaths.length === 0) {
      setPhotosError("Please upload at least one interior photo.");
      return;
    }

    setSavingPhotos(true);
    try {
      const res = await fetch(`/api/shops/${shopSlug}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profilePhoto: profilePhotoPaths[0],
          interiorPhotos: interiorPhotoPaths,
        }),
      });
      if (!res.ok) throw new Error("Failed to save photos");
      setStep("services");
    } catch {
      setPhotosError("Failed to save photos. Please try again.");
    } finally {
      setSavingPhotos(false);
    }
  };

  const handleServicesSubmit = async () => {
    const allServices: ServiceConfig[] = [
      ...PRESET_SERVICES.filter((s) => selectedServices[s.name]).map((s) => serviceConfigs[s.name]),
      ...customServices,
    ].map(s => ({ ...s, price: Number(s.price) || 0, durationMinutes: Number(s.durationMinutes) || 0 }));

    for (const service of allServices) {
      await createServiceMutation.mutateAsync({ slug: shopSlug, data: service });
    }
    setStep("done");
  };

  const toggleService = (name: string) => {
    setSelectedServices((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const updateServiceConfig = (name: string, field: "price" | "durationMinutes", value: number | "") => {
    setServiceConfigs((prev) => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }));
  };

  const addCustomService = () => {
    setCustomServices((prev) => [...prev, { name: "", price: 100, durationMinutes: 30 }]);
  };

  const removeCustomService = (i: number) => {
    setCustomServices((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateCustomService = (i: number, field: keyof ServiceConfig, value: string | number) => {
    setCustomServices((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s))
    );
  };

  const currentStepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <span className="font-bold text-slate-900">eNai — Register Shop</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step === s
                  ? "bg-blue-600 border-blue-600 text-slate-900"
                  : currentStepIdx > i
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-slate-300 text-slate-400"
              }`}>
                {currentStepIdx > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${step === s ? "text-slate-900" : "text-slate-400"}`}>
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 ${currentStepIdx > i ? "bg-green-500" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Shop Details */}
        {step === "details" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Shop Details</h2>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Owner Name *</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={form.ownerName}
                    onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Shop Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Raja Barbershop"
                    value={form.shopName}
                    onChange={(e) => setForm((f) => ({ ...f, shopName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Phone Number *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Password *</label>
                  <input
                    type="password"
                    placeholder="Choose a password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">City *</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Address</label>
                  <input
                    type="text"
                    placeholder="Street address"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Pincode</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 400001"
                    value={form.pincode}
                    onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Working Chairs *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.numChairs}
                    onChange={(e) => setForm((f) => ({ ...f, numChairs: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Active Barbers *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.numBarbers}
                    onChange={(e) => setForm((f) => ({ ...f, numBarbers: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Open Time</label>
                  <input
                    type="time"
                    value={form.openTime}
                    onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Close Time</label>
                  <input
                    type="time"
                    value={form.closeTime}
                    onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Shop Location */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Shop Location <span className="text-slate-400 font-normal normal-case">(helps customers find you nearby)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locStatus === "loading"}
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-60"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    {locStatus === "loading" ? "Getting location…" : "Use Live Location"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Select from Map
                  </button>
                </div>
                {locStatus === "error" && (
                  <p className="text-xs text-red-600">Couldn't access location. Please try "Select from Map" instead.</p>
                )}
                {form.latitude && form.longitude && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Location set: <span className="font-mono">{parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}</span></span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-60 mt-4"
              >
                {registerMutation.isPending ? "Creating your shop..." : "Create Shop & Continue"}
              </button>
            </form>
          </div>
        )}

        {showMapPicker && (
          <LocationPicker
            initialLat={form.latitude ? parseFloat(form.latitude) : undefined}
            initialLng={form.longitude ? parseFloat(form.longitude) : undefined}
            onSelect={(lat, lng) => {
              setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
              setLocStatus("done");
            }}
            onClose={() => setShowMapPicker(false)}
          />
        )}

        {/* Step 2: Photos */}
        {step === "photos" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                <Camera className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Shop Photos</h2>
                <p className="text-slate-400 text-xs">Help customers see your shop before visiting</p>
              </div>
            </div>

            {photosError && (
              <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {photosError}
              </div>
            )}

            <div className="mt-6 space-y-6">
              <div>
                <ImageUpload
                  label="Profile / Cover Photo *"
                  multiple={false}
                  maxFiles={1}
                  existingPaths={profilePhotoPaths}
                  onUploaded={(paths) => setProfilePhotoPaths((prev) => [...prev, ...paths].slice(0, 1))}
                  onRemove={() => setProfilePhotoPaths([])}
                />
                <p className="text-xs text-slate-400 mt-1">This will be shown as your shop's main photo. Required.</p>
              </div>

              <div>
                <ImageUpload
                  label="Interior / Salon Photos *"
                  multiple
                  maxFiles={6}
                  existingPaths={interiorPhotoPaths}
                  onUploaded={(paths) => setInteriorPhotoPaths((prev) => [...prev, ...paths].slice(0, 6))}
                  onRemove={(i) => setInteriorPhotoPaths((prev) => prev.filter((_, idx) => idx !== i))}
                />
                <p className="text-xs text-slate-400 mt-1">Show customers what your salon looks like inside. Required (up to 6).</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={handlePhotosSubmit}
                disabled={savingPhotos}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-60"
              >
                {savingPhotos ? "Saving..." : "Save Photos & Continue"}
              </button>
              <button
                type="button"
                onClick={() => setStep("services")}
                className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:border-slate-400 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Services */}
        {step === "services" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Configure Services</h2>
            <p className="text-slate-500 text-sm mb-6">Select the services you offer and set your prices.</p>

            <div className="space-y-3 mb-6">
              {PRESET_SERVICES.map((service) => (
                <div key={service.name} className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  selectedServices[service.name]
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleService(service.name)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedServices[service.name]
                          ? "bg-blue-600 border-blue-600"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedServices[service.name] && <Check className="w-3 h-3 text-slate-900" />}
                    </button>
                    <span
                      className="flex-1 font-medium text-sm text-slate-900 cursor-pointer"
                      onClick={() => toggleService(service.name)}
                    >
                      {service.name}
                    </span>
                    {selectedServices[service.name] && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">₹</span>
                          <input
                            type="number"
                            min={1}
                            value={serviceConfigs[service.name].price}
                            onChange={(e) => updateServiceConfig(service.name, "price", e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-20 px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">min</span>
                          <input
                            type="number"
                            min={5}
                            step={5}
                            value={serviceConfigs[service.name].durationMinutes}
                            onChange={(e) => updateServiceConfig(service.name, "durationMinutes", e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-16 px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {customServices.map((service, i) => (
              <div key={i} className="border border-blue-300 bg-blue-50 rounded-lg p-4 mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Service name"
                    value={service.name}
                    onChange={(e) => updateCustomService(i, "name", e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">₹</span>
                    <input
                      type="number"
                      min={1}
                      value={service.price}
                      onChange={(e) => updateCustomService(i, "price", e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-20 px-2 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">min</span>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={service.durationMinutes}
                      onChange={(e) => updateCustomService(i, "durationMinutes", e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-16 px-2 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <button onClick={() => removeCustomService(i)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addCustomService}
              className="flex items-center gap-2 text-sm text-blue-700 font-medium hover:text-blue-800 mb-6"
            >
              <Plus className="w-4 h-4" /> Add custom service
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleServicesSubmit}
                disabled={createServiceMutation.isPending}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-60"
              >
                {createServiceMutation.isPending ? "Saving..." : "Save Services & Finish"}
              </button>
              <button
                type="button"
                onClick={() => setStep("done")}
                className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:border-slate-400 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">You're all set!</h2>
            <p className="text-slate-500 mb-6">
              Your shop <strong>{shopName}</strong> is live. Share your booking link with customers.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Your Booking Link</p>
              <code className="text-sm text-blue-800 font-mono break-all">
                {window.location.origin}/shop/{shopSlug}
              </code>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate(`/dashboard/${shopSlug}`)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate(`/shop/${shopSlug}`)}
                className="w-full border border-slate-300 text-slate-700 py-3 rounded-lg font-medium text-sm hover:border-slate-400 transition-colors"
              >
                View Shop Page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
