import { lazy, Suspense, useEffect, useState, type ComponentProps } from "react";

// Sonner runs `document.head.appendChild` at module load, which crashes in the
// SSR (workerd) environment. Lazy-import it so it only evaluates in the browser.
const SonnerToaster = lazy(() =>
  import("sonner").then((m) => ({ default: m.Toaster })),
);

type ToasterProps = ComponentProps<typeof SonnerToaster>;

const Toaster = (props: ToasterProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <SonnerToaster
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          },
        }}
        {...props}
      />
    </Suspense>
  );
};

export { Toaster };
