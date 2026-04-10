"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { saveInquiryForm, loadInquiryForm, clearInquiryForm } from "@/lib/inquiry-form-persist";
import Link from "next/link";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { formatRelativeDate } from "@/lib/utils";
import {
  MapPin,
  Shield,
  MessageSquare,
  Calendar,
  Globe,
  ArrowLeft,
  Clock,
  CheckCircle,
  ArrowRight,
  Award,
  Zap,
  UserCheck,
  Star,
  Euro,
  FileCheck,
  Wrench,
  Send,
  X,
  Mail,
  RefreshCw,
  LogIn,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface StoryData {
  id: string;
  imageUrl: string;
  text: string | null;
  createdAt: string;
  expiresAt: string;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  clientName: string | null;
  requestTitle: string;
  requestCategory: string;
}

interface ProviderData {
  id: string;
  name: string;
  image: string | null;
  images: string[];
  description: string | null;
  headline: string | null;
  services: string | null;
  priceFrom: number | null;
  experienceYears: number | null;
  offersInvoices: boolean;
  availableForUrgent: boolean;
  specializations: string[];
  location: string | null;
  website: string | null;
  planType: string;
  badge: string | null;
  responseCount: number;
  acceptedCount: number;
  avgResponseTimeHours: number | null;
  profileCompleteness: number;
  avgRating: number | null;
  totalReviews: number;
  reviews: ReviewData[];
  lastActiveAt: string;
  memberSince: string;
}

export default function PublicProviderProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const searchParams = useSearchParams();

  // Direct inquiry form state
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    description: "",
    budget: "",
    senderEmail: "",
    senderPhone: "",
    senderName: "",
  });
  const [inquirySending, setInquirySending] = useState(false);
  const [inquiryResult, setInquiryResult] = useState<{ success: boolean; message: string } | null>(null);
  const [inquiryError, setInquiryError] = useState("");
  const inquiryRef = useRef<HTMLDivElement>(null);

  // 2-step verification state (guest only)
  type VerifyStep = "form" | "code" | "needsLogin";
  const [verifyStep, setVerifyStep] = useState<VerifyStep>("form");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Story state
  const [stories, setStories] = useState<StoryData[]>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);

  useEffect(() => {
    fetch(`/api/tiekejai/${params.id}/stories`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStories(data.data || []);
      })
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    fetch(`/api/tiekejai/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setProvider(data.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Auto-open form when returning from login redirect (?inquiry=1)
  useEffect(() => {
    if (!provider) return;
    if (searchParams.get("inquiry") === "1") {
      const saved = loadInquiryForm(provider.id);
      if (saved) {
        setInquiryForm({
          description: saved.description,
          budget: saved.budget,
          senderEmail: saved.senderEmail,
          senderPhone: saved.senderPhone,
          senderName: saved.senderName,
        });
        clearInquiryForm();
      }
      setShowInquiry(true);
      setTimeout(() => inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    }
  }, [provider, searchParams]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (loading) return <LoadingSpinner />;
  if (error || !provider) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="Tiekėjas nerastas" description="Šis profilis neegzistuoja arba yra neaktyvus." />
      </div>
    );
  }

  const categoryLabel = (val: string) =>
    SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;

  const daysSinceActive = Math.floor(
    (Date.now() - new Date(provider.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isRecentlyActive = daysSinceActive <= 7;

  const responseTimeLabel = (hours: number | null) => {
    if (hours === null) return null;
    if (hours < 1) return "< 1 val.";
    if (hours < 24) return `~${hours} val.`;
    const days = Math.round(hours / 24);
    return `~${days} d.`;
  };

  const memberMonths = Math.max(
    1,
    Math.floor((Date.now() - new Date(provider.memberSince).getTime()) / (1000 * 60 * 60 * 24 * 30))
  );

  // Acceptance rate for CTA context
  const acceptanceRate = provider.responseCount > 0
    ? Math.round((provider.acceptedCount / provider.responseCount) * 100)
    : null;

  const isLoggedIn = !!session?.user;
  const isSelf = session?.user?.id === provider.id;

  // Authenticated user: direct send
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setInquiryError("");
    setInquiryResult(null);

    if (inquiryForm.description.length < 20) {
      setInquiryError("Žinutė turi būti bent 20 simbolių");
      return;
    }

    setInquirySending(true);
    try {
      const res = await fetch("/api/direct-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          description: inquiryForm.description,
          budget: inquiryForm.budget || undefined,
          senderPhone: inquiryForm.senderPhone || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiryResult({ success: true, message: "Žinutė išsiųsta!" });
        setInquiryForm({ description: "", budget: "", senderEmail: "", senderPhone: "", senderName: "" });
      } else {
        setInquiryResult({ success: false, message: data.error || "Nepavyko išsiųsti žinutės" });
      }
    } catch {
      setInquiryResult({ success: false, message: "Tinklo klaida. Pabandykite dar kartą." });
    } finally {
      setInquirySending(false);
    }
  }

  // Guest user step 1: initiate (send verification code)
  async function handleGuestInitiate(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setInquiryError("");
    setInquiryResult(null);

    if (inquiryForm.description.length < 20) {
      setInquiryError("Žinutė turi būti bent 20 simbolių");
      return;
    }
    if (!inquiryForm.senderEmail) {
      setInquiryError("El. pašto adresas privalomas");
      return;
    }

    setInquirySending(true);
    try {
      const res = await fetch("/api/direct-inquiry/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          description: inquiryForm.description,
          budget: inquiryForm.budget || undefined,
          senderEmail: inquiryForm.senderEmail,
          senderPhone: inquiryForm.senderPhone || undefined,
          senderName: inquiryForm.senderName || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingId(data.data.pendingId);
        setMaskedEmail(data.data.maskedEmail);
        setVerifyStep("code");
        setVerifyCode("");
        setVerifyError("");
        if (data.data.alreadyPending) {
          setVerifyError("Kodas jau buvo išsiųstas. Galite naudoti jį arba siųsti naują.");
        }
      } else if (data.needsLogin) {
        // Email belongs to existing account — save form and redirect
        saveInquiryForm({ ...inquiryForm, providerId: provider.id });
        setVerifyStep("needsLogin");
      } else {
        setInquiryError(data.error || "Nepavyko pradėti užklausos");
      }
    } catch {
      setInquiryError("Tinklo klaida. Pabandykite dar kartą.");
    } finally {
      setInquirySending(false);
    }
  }

  // Guest user step 2: verify code
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingId) return;
    setVerifyError("");
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/direct-inquiry/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId, code: verifyCode }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyStep("form");
        setInquiryResult({ success: true, message: "Žinutė išsiųsta!" });
        setInquiryForm({ description: "", budget: "", senderEmail: "", senderPhone: "", senderName: "" });
        setPendingId(null);
        setVerifyCode("");
      } else {
        if (data.expired) {
          // Code expired or too many attempts — reset to form
          setVerifyStep("form");
          setInquiryError(data.error || "Kodas nebegalioja. Pabandykite iš naujo.");
          setPendingId(null);
        } else {
          setVerifyError(data.error || "Neteisingas kodas");
        }
      }
    } catch {
      setVerifyError("Tinklo klaida. Pabandykite dar kartą.");
    } finally {
      setVerifyLoading(false);
    }
  }

  // Resend code
  async function handleResendCode() {
    if (!pendingId || resendCooldown > 0) return;
    setVerifyError("");
    try {
      const res = await fetch("/api/direct-inquiry/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId }),
      });
      const data = await res.json();
      if (data.success) {
        setResendCooldown(60);
        setVerifyError("");
        setVerifyCode("");
      } else {
        if (data.cooldown) {
          setResendCooldown(data.cooldown);
        }
        setVerifyError(data.error || "Nepavyko išsiųsti kodo");
      }
    } catch {
      setVerifyError("Tinklo klaida");
    }
  }

  function openInquiryForm() {
    setShowInquiry(true);
    setInquiryResult(null);
    setInquiryError("");
    setVerifyStep("form");
    setVerifyCode("");
    setVerifyError("");
    setPendingId(null);
    setTimeout(() => inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }

  function closeInquiryForm() {
    setShowInquiry(false);
    setInquiryResult(null);
    setInquiryError("");
    setVerifyStep("form");
    setVerifyCode("");
    setVerifyError("");
    setPendingId(null);
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/tiekejai"
          className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Visi tiekėjai
        </Link>

        {/* Header card */}
        <div className="rounded-2xl border border-surface-200/60 bg-white p-6 sm:p-8 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Avatar */}
            <button
              type="button"
              onClick={() => { if (stories.length > 0) { setStoryIndex(0); setStoryViewerOpen(true); } }}
              className={`shrink-0 rounded-2xl p-[3px] transition-all ${stories.length > 0 ? "bg-gradient-to-tr from-brand-500 via-violet-500 to-amber-400 cursor-pointer hover:scale-105" : "bg-transparent cursor-default"}`}
              disabled={stories.length === 0}
            >
              <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-[13px] bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center overflow-hidden ${stories.length > 0 ? "ring-2 ring-white dark:ring-surface-900" : ""}`}>
                {provider.image ? (
                  <img src={provider.image} alt={provider.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-bold text-brand-600 dark:text-brand-400">
                    {provider.name[0].toUpperCase()}
                  </span>
                )}
              </div>
            </button>

            <div className="flex-1 min-w-0">
              {/* Name + badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white">
                  {provider.name}
                </h1>
                {provider.badge && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-micro font-medium ${
                    provider.planType === "PRO"
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}>
                    <Shield className="h-3 w-3" />
                    {provider.badge}
                  </span>
                )}
              </div>

              {/* Headline */}
              {provider.headline && (
                <p className="text-body-sm text-surface-500 dark:text-surface-400 mt-1">
                  {provider.headline}
                </p>
              )}

              {/* Rating - separate row for clarity */}
              {provider.avgRating !== null && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(provider.avgRating!)
                            ? "fill-amber-400 text-amber-400"
                            : "text-surface-200 dark:text-surface-700"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-body-sm font-semibold text-surface-900 dark:text-white">
                    {provider.avgRating}
                  </span>
                  <span className="text-body-sm text-surface-400">
                    ({provider.totalReviews} {provider.totalReviews === 1 ? "atsiliepimas" : provider.totalReviews < 10 ? "atsiliepimai" : "atsiliepimų"})
                  </span>
                </div>
              )}

              {/* Meta info */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-surface-500">
                {provider.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {provider.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Narys nuo {new Date(provider.memberSince).toLocaleDateString("lt-LT", { year: "numeric", month: "long" })}
                </span>
                {provider.website && (
                  <a
                    href={provider.website.startsWith("http") ? provider.website : `https://${provider.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Svetainė
                  </a>
                )}
                {isRecentlyActive && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Clock className="h-3.5 w-3.5" />
                    Aktyvus šią savaitę
                  </span>
                )}
              </div>

              {/* Quick action — send message */}
              {!isSelf && (
                <div className="mt-3">
                  {inquiryResult?.success ? (
                    <Button size="sm" variant="outline" disabled>
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      Žinutė išsiųsta
                    </Button>
                  ) : (
                    <InteractiveHoverButton
                      icon={<Send className="h-3.5 w-3.5" />}
                      onClick={openInquiryForm}
                      disabled={showInquiry}
                    >
                      Rašyti žinutę
                    </InteractiveHoverButton>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trust stats — single consolidated grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <TrustStat
            label="Pasiūlymų pateikta"
            value={String(provider.responseCount)}
            icon={<MessageSquare className="h-4 w-4 text-brand-500" />}
          />
          <TrustStat
            label="Klientų pasirinktas"
            value={String(provider.acceptedCount)}
            icon={<Award className="h-4 w-4 text-emerald-500" />}
          />
          <TrustStat
            label="Atsakymo laikas"
            value={responseTimeLabel(provider.avgResponseTimeHours) || "—"}
            icon={<Zap className="h-4 w-4 text-blue-500" />}
          />
          <TrustStat
            label="Platformoje"
            value={memberMonths >= 12 ? `${Math.floor(memberMonths / 12)} m.` : `${memberMonths} mėn.`}
            icon={<UserCheck className="h-4 w-4 text-violet-500" />}
          />
        </div>

        {/* Professional quick facts */}
        {(provider.experienceYears || provider.priceFrom || provider.offersInvoices || provider.availableForUrgent) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {provider.experienceYears && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200/60 bg-white px-3 py-1.5 text-body-sm text-surface-700 dark:border-surface-700/50 dark:bg-surface-900/50 dark:text-surface-300">
                <Clock className="h-3.5 w-3.5 text-violet-500" />
                {provider.experienceYears} m. patirtis
              </span>
            )}
            {provider.priceFrom !== null && provider.priceFrom > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200/60 bg-white px-3 py-1.5 text-body-sm text-surface-700 dark:border-surface-700/50 dark:bg-surface-900/50 dark:text-surface-300">
                <Euro className="h-3.5 w-3.5 text-emerald-500" />
                Nuo {provider.priceFrom} €
              </span>
            )}
            {provider.offersInvoices && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200/60 bg-white px-3 py-1.5 text-body-sm text-surface-700 dark:border-surface-700/50 dark:bg-surface-900/50 dark:text-surface-300">
                <FileCheck className="h-3.5 w-3.5 text-blue-500" />
                Sąskaitos faktūros
              </span>
            )}
            {provider.availableForUrgent && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/60 bg-amber-50 px-3 py-1.5 text-body-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-300">
                <Zap className="h-3.5 w-3.5" />
                Skubūs darbai
              </span>
            )}
          </div>
        )}

        {/* Services */}
        {provider.services && (
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-surface-400" />
              Teikiamos paslaugos
            </h2>
            <p className="text-body text-surface-600 dark:text-surface-400 whitespace-pre-wrap leading-relaxed">
              {provider.services}
            </p>
          </div>
        )}

        {/* Description */}
        {provider.description && (
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-3">Apie tiekėją</h2>
            <p className="text-body text-surface-600 dark:text-surface-400 whitespace-pre-wrap leading-relaxed">
              {provider.description}
            </p>
          </div>
        )}

        {/* Specializations */}
        {provider.specializations.length > 0 && (
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-3">Specializacijos</h2>
            <div className="flex flex-wrap gap-2">
              {provider.specializations.map((spec) => (
                <Link
                  key={spec}
                  href={`/tiekejai?category=${spec}`}
                  className="rounded-lg bg-brand-50 px-3 py-1.5 text-body-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                >
                  {categoryLabel(spec)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Images/portfolio */}
        {provider.images.length > 0 && (
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-3">Darbų pavyzdžiai</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {provider.images.map((img, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800">
                  <img src={img} alt={`${provider.name} darbas ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
              Atsiliepimai {provider.totalReviews > 0 && `(${provider.totalReviews})`}
            </h2>
            {provider.avgRating !== null && (
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(provider.avgRating!)
                          ? "fill-amber-400 text-amber-400"
                          : "text-surface-200 dark:text-surface-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-body-sm font-semibold text-surface-900 dark:text-white">
                  {provider.avgRating}
                </span>
              </div>
            )}
          </div>

          {provider.reviews.length > 0 ? (
            <div className="space-y-4">
              {provider.reviews.map((review) => (
                <div key={review.id} className="border-b border-surface-100 pb-4 last:border-0 last:pb-0 dark:border-surface-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                        <span className="text-micro font-semibold text-surface-500">
                          {(review.clientName || "K")[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-body-sm font-medium text-surface-900 dark:text-white">
                        {review.clientName || "Klientas"}
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-surface-200 dark:text-surface-700"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-micro text-surface-400">
                      {formatRelativeDate(review.createdAt)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-body-sm text-surface-600 dark:text-surface-400 leading-relaxed ml-9">
                      {review.comment}
                    </p>
                  )}
                  <p className="mt-1 text-micro text-surface-400 ml-9">
                    {categoryLabel(review.requestCategory)}: {review.requestTitle}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <Star className="h-8 w-8 text-surface-200 dark:text-surface-700 mx-auto mb-2" />
              <p className="text-body-sm text-surface-400">
                Atsiliepimų kol kas nėra
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50/80 to-white p-6 sm:p-8 dark:border-brand-800/40 dark:from-brand-950/50 dark:to-surface-900/50">
          <div className="text-center">
            <h3 className="text-heading-3 font-bold text-surface-900 dark:text-white mb-2">
              Reikia {provider.name} paslaugų?
            </h3>
            <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-5 max-w-md mx-auto">
              Pateikite nemokamą užklausą arba parašykite tiekėjui tiesiogiai.
            </p>

            {/* Trust micro-signals */}
            <div className="flex flex-wrap justify-center gap-3 mb-5 text-micro text-surface-500">
              <span className="inline-flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                Nemokama užklausa
              </span>
              {provider.avgResponseTimeHours !== null && (
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-blue-500" />
                  Atsako per {responseTimeLabel(provider.avgResponseTimeHours)}
                </span>
              )}
              {acceptanceRate !== null && acceptanceRate > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-emerald-500" />
                  {acceptanceRate}% priimtų pasiūlymų
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/uzklausos/nauja">
                <Button size="lg">
                  Pateikti užklausą
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
              {!isSelf && (
                inquiryResult?.success ? (
                  <Button size="lg" variant="outline" disabled>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Žinutė išsiųsta
                  </Button>
                ) : (
                  <InteractiveHoverButton
                    icon={<Send className="h-4 w-4" />}
                    onClick={openInquiryForm}
                    disabled={showInquiry}
                    className="h-12 px-6"
                  >
                    Rašyti žinutę
                  </InteractiveHoverButton>
                )
              )}
            </div>
          </div>
        </div>

        {/* Direct inquiry form */}
        {showInquiry && (
          <div ref={inquiryRef} className="mt-6 rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-brand-500" />
                Žinutė tiekėjui {provider.name}
              </h3>
              <button
                onClick={closeInquiryForm}
                className="rounded-lg p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Success state */}
            {inquiryResult?.success ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center dark:bg-emerald-500/10 dark:border-emerald-800/40">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-body-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">
                  Žinutė išsiųsta!
                </p>
                <p className="text-micro text-emerald-700/70 dark:text-emerald-400/70 mb-4">
                  Tiekėjas gaus jūsų žinutę ir galės su jumis susisiekti el. paštu.
                </p>
                <Button size="sm" variant="outline" onClick={closeInquiryForm}>
                  Uždaryti
                </Button>
              </div>

            /* Guest: needs login — email belongs to existing account */
            ) : !isLoggedIn && verifyStep === "needsLogin" ? (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 text-center dark:bg-blue-500/10 dark:border-blue-800/40">
                <LogIn className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-body-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                  Šis el. paštas jau registruotas
                </p>
                <p className="text-micro text-blue-700/70 dark:text-blue-400/70 mb-4">
                  Prisijunkite prie savo paskyros ir žinutė bus išsiųsta automatiškai.
                </p>
                <Link
                  href={`/prisijungti?callbackUrl=${encodeURIComponent(`/tiekejai/${provider.id}?inquiry=1`)}`}
                >
                  <Button size="sm">
                    <LogIn className="h-4 w-4" />
                    Prisijungti
                  </Button>
                </Link>
                <button
                  onClick={() => { setVerifyStep("form"); setInquiryError(""); }}
                  className="block mx-auto mt-3 text-micro text-surface-400 hover:text-surface-600 transition-colors"
                >
                  Naudoti kitą el. paštą
                </button>
              </div>

            /* Guest: code verification step */
            ) : !isLoggedIn && verifyStep === "code" ? (
              <div>
                <div className="rounded-xl bg-brand-50/50 border border-brand-200/60 p-4 mb-4 dark:bg-brand-950/30 dark:border-brand-800/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-brand-500" />
                    <p className="text-body-sm font-medium text-surface-900 dark:text-white">
                      Patvirtinimo kodas išsiųstas
                    </p>
                  </div>
                  <p className="text-micro text-surface-500 dark:text-surface-400">
                    Įveskite 6 skaitmenų kodą, išsiųstą adresu <span className="font-medium">{maskedEmail}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Patvirtinimo kodas
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      autoFocus
                      required
                      className="w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-center text-xl font-bold tracking-[0.3em] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                    />
                  </div>

                  {verifyError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-body-sm text-red-700 dark:bg-red-500/10 dark:border-red-800/40 dark:text-red-300">
                      {verifyError}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0}
                      className="inline-flex items-center gap-1.5 text-body-sm text-brand-600 hover:text-brand-700 disabled:text-surface-400 disabled:cursor-not-allowed transition-colors dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {resendCooldown > 0 ? `Siųsti dar kartą (${resendCooldown}s)` : "Siųsti dar kartą"}
                    </button>
                    <Button type="submit" isLoading={verifyLoading} disabled={verifyLoading || verifyCode.length !== 6}>
                      Patvirtinti
                    </Button>
                  </div>
                </form>

                <button
                  onClick={() => { setVerifyStep("form"); setPendingId(null); setVerifyCode(""); setVerifyError(""); }}
                  className="mt-3 text-micro text-surface-400 hover:text-surface-600 transition-colors"
                >
                  Grįžti atgal
                </button>
              </div>

            /* Form step (auth user or guest step 1) */
            ) : (
              <form onSubmit={isLoggedIn ? handleAuthSubmit : handleGuestInitiate} className="space-y-4">
                {/* Guest-only fields */}
                {!isLoggedIn && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Jūsų vardas
                      </label>
                      <input
                        type="text"
                        value={inquiryForm.senderName}
                        onChange={(e) => setInquiryForm((f) => ({ ...f, senderName: e.target.value }))}
                        placeholder="Vardas"
                        className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        El. paštas <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={inquiryForm.senderEmail}
                        onChange={(e) => setInquiryForm((f) => ({ ...f, senderEmail: e.target.value }))}
                        placeholder="jusu@pastas.lt"
                        required
                        className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Jūsų žinutė <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={inquiryForm.description}
                    onChange={(e) => setInquiryForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    placeholder="Aprašykite ko jums reikia — kokia paslauga, apimtis, terminai..."
                    required
                    minLength={20}
                    maxLength={2000}
                    className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                  />
                  <p className="mt-1 text-micro text-surface-400">
                    {inquiryForm.description.length}/2000 (min. 20)
                  </p>
                </div>

                {/* Budget + Phone row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Biudžetas
                    </label>
                    <input
                      type="text"
                      value={inquiryForm.budget}
                      onChange={(e) => setInquiryForm((f) => ({ ...f, budget: e.target.value }))}
                      placeholder="pvz. 500-1000 €"
                      maxLength={100}
                      className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Telefonas
                    </label>
                    <input
                      type="tel"
                      value={inquiryForm.senderPhone}
                      onChange={(e) => setInquiryForm((f) => ({ ...f, senderPhone: e.target.value }))}
                      placeholder="+370..."
                      maxLength={20}
                      className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Error */}
                {(inquiryError || (inquiryResult && !inquiryResult.success)) && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-body-sm text-red-700 dark:bg-red-500/10 dark:border-red-800/40 dark:text-red-300">
                    {inquiryError || inquiryResult?.message}
                  </div>
                )}

                {/* Submit */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-micro text-surface-400 max-w-[200px] sm:max-w-none">
                    {isLoggedIn
                      ? "Tiekėjas gaus jūsų žinutę ir el. paštą"
                      : "Išsiųsime patvirtinimo kodą į jūsų el. paštą"}
                  </p>
                  <Button type="submit" isLoading={inquirySending} disabled={inquirySending}>
                    <Send className="h-4 w-4" />
                    {isLoggedIn ? "Siųsti" : "Tęsti"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Story viewer modal */}
      {storyViewerOpen && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          index={storyIndex}
          providerName={provider.name}
          providerImage={provider.image}
          onClose={() => setStoryViewerOpen(false)}
          onIndexChange={setStoryIndex}
        />
      )}
    </div>
  );
}

function StoryViewer({
  stories,
  index,
  providerName,
  providerImage,
  onClose,
  onIndexChange,
}: {
  stories: StoryData[];
  index: number;
  providerName: string;
  providerImage: string | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const story = stories[index];
  const hasNext = index < stories.length - 1;
  const hasPrev = index > 0;
  const touchStartX = useRef(0);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Auto-advance timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasNext) onIndexChange(index + 1);
      else onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [index, hasNext, onIndexChange, onClose]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, hasNext, hasPrev, onClose, onIndexChange]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && hasNext) onIndexChange(index + 1);
      if (diff < 0 && hasPrev) onIndexChange(index - 1);
    }
  }

  function timeAgo(dateStr: string) {
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins} min.`;
    const hours = Math.floor(mins / 60);
    return `${hours} val.`;
  }

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div
        className="relative w-full max-w-md mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="flex gap-1 mb-3 px-1">
          {stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-white"
                style={
                  i < index
                    ? { width: "100%" }
                    : i === index
                      ? { animation: "story-progress 6s linear forwards" }
                      : { width: "0%" }
                }
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center overflow-hidden">
            {providerImage ? (
              <img src={providerImage} alt={providerName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-brand-600">{providerName[0].toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{providerName}</p>
            <p className="text-xs text-white/60">{timeAgo(story.createdAt)}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Story image */}
        <div
          className="relative aspect-[9/16] max-h-[70vh] rounded-2xl overflow-hidden bg-surface-900"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img src={story.imageUrl} alt="" className="h-full w-full object-cover" />

          {/* Text overlay */}
          {story.text && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
              <p className="text-sm text-white leading-relaxed">{story.text}</p>
            </div>
          )}

          {/* Tap zones for navigation */}
          {hasPrev && (
            <button
              onClick={() => onIndexChange(index - 1)}
              className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-start pl-2"
            >
              <ChevronLeft className="h-8 w-8 text-white/50 hover:text-white/90 transition-colors drop-shadow" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => onIndexChange(index + 1)}
              className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-end pr-2"
            >
              <ChevronRight className="h-8 w-8 text-white/50 hover:text-white/90 transition-colors drop-shadow" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-200/60 bg-white p-4 text-center dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="flex justify-center mb-1.5">{icon}</div>
      <p className="text-lg font-bold text-surface-900 dark:text-white">{value}</p>
      <p className="text-micro text-surface-500 dark:text-surface-400">{label}</p>
    </div>
  );
}
