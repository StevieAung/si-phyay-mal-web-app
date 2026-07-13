import { createFileRoute } from "@tanstack/react-router";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
        ဆီဖြည့်မယ်
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Fuel up with ease
      </p>
    </div>
  );
}
