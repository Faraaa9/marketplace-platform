import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

// The profile streams inside <Suspense>, where notFound() otherwise left a
// blank page under the header, which read as "this profile is hidden".
export default function ProviderProfileNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState
        title="Meistras nerastas"
        description="Tokio profilio adreso nėra. Patikrinkite nuorodą arba raskite meistrą sąraše."
        action={
          <Link
            href="/meistrai"
            className="inline-flex rounded-xl bg-brand-600 px-6 py-3 text-body-sm font-medium text-white hover:bg-brand-700"
          >
            Visi meistrai
          </Link>
        }
      />
    </div>
  );
}
