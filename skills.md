paslaugurinka.lt | Complex Logic Patterns

This file contains "blueprints" for the AI to follow when implementing specific complex features.

🔄 Skill: Instant Local Filtering (Zustand)

Scenario: User filters a list of providers by category or location.
Logic Pattern:

Fetch the full current page array from the Server Component.

Store the array in useProviderFilterStore.

Use a computed selector or useMemo to filter the local array in-memory.

DO NOT trigger a router push or network request for these filters.

📸 Skill: Optimized Image Delivery

Scenario: Displaying a provider avatar or portfolio image.
Logic Pattern:

Pass the Cloudinary URL through optimizeCloudinaryUrl().

Wrap in next/image.

Set sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw".

If it's the first image in a list, add priority.

🔔 Skill: Smart Notifications

Scenario: Checking for new messages/bookings.
Logic Pattern:

Use the "Focus-Revalidate" pattern.

Listen for window.onfocus and visibilitychange.

Fetch only the unreadCount to keep payload tiny.

Update the Zustand store which then updates the UI across the whole app instantly.

🧪 Skill: Hydration Error Debugging

Scenario: Client/Server HTML mismatch.
Logic Pattern:

Check for window, localStorage, or document usage inside the render cycle.

Check for nested p tags or div inside span.

Use dynamic(() => ..., { ssr: false }) if the component relies on browser-only state.