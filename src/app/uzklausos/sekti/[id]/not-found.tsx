import EmptyState from "@/components/ui/EmptyState";

export default function RequestTrackerNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <EmptyState
        title="Užklausa nerasta"
        description="Tokios užklausos nėra arba nuoroda nebegalioja."
      />
    </div>
  );
}
