import { Avatar, Chip, Panel } from "@/components/account/ui";

/** Live preview of how the provider's card reads in search — mirrors the
 *  unsaved form state so edits show up before saving. */
export default function ProfilePreviewCard({
  name,
  headline,
  location,
  images,
  experienceYears,
  priceFrom,
  isActive,
}: {
  name: string;
  headline: string;
  location: string;
  images: string[];
  experienceYears: number | null;
  priceFrom: number | null;
  isActive: boolean;
}) {
  const facts = [
    experienceYears ? `${experienceYears} m. patirtis` : null,
    priceFrom ? `nuo ${priceFrom} €` : null,
  ].filter(Boolean);

  return (
    <Panel className="flex flex-col gap-2.5">
      <span className="text-caption font-normal text-surface-500">Kaip atrodo kortelė paieškoje</span>
      <div className="flex items-center gap-3">
        <Avatar name={name} image={images[0] ?? null} size={52} />
        <div className="min-w-0">
          <strong className="block truncate">{name}</strong>
          <span className="line-clamp-2 text-caption font-normal text-surface-500">
            {[headline || "Antraštė dar neparašyta", location].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
      {facts.length > 0 && <p className="text-caption">{facts.join(" · ")}</p>}
      {images.length > 1 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {images.slice(1, 4).map((url) => (
            <Avatar key={url} name="" image={url} size={72} />
          ))}
        </div>
      ) : (
        <div className="grid h-[90px] place-items-center rounded-lg bg-surface-50 text-caption font-normal text-surface-500 dark:bg-surface-800">
          Čia matysis darbų nuotraukos
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-caption font-normal text-surface-500">Matomas klientams</span>
        <Chip tone={isActive ? "open" : "closed"}>{isActive ? "Įjungta" : "Išjungta"}</Chip>
      </div>
    </Panel>
  );
}
