import { createFileRoute } from "@tanstack/react-router";
import { CommandPage } from "@/components/pages";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "DisasterShield — Emergency Command Centre" },
    { name: "description", content: "Live disaster detection, verification, decision support and response coordination." },
    { property: "og:title", content: "DisasterShield — Emergency Command Centre" },
    { property: "og:description", content: "Live disaster detection, verification, decision support and response coordination." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CommandPage,
});
