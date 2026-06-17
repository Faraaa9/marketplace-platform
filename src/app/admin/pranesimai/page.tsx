import AnnouncementsCard from "./AnnouncementsCard";

export default function AdminAnnouncementsPage() {
  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-2">
        Pranešimai
      </h1>
      <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-8">
        Kortelės, rodomos tiekėjų ir klientų skydeliuose. Galima pasirinkti, kam rodyti.
      </p>
      <AnnouncementsCard />
    </div>
  );
}
