import { Mail } from "lucide-react";
import { useTheme } from "../theme/themeStore";

const sections = [
  {
    title: "Independent project",
    body: "RentyCar is an independent personal/hobby project. It is not affiliated with, endorsed by, sponsored by, or officially connected to any rental car company, airport, automaker, travel provider, booking platform, or other third party mentioned on the site.",
  },
  {
    title: "Trademarks",
    body: "Company names, airport names, vehicle makes, vehicle models, logos, and other marks belong to their respective owners. Any references are for identification and informational purposes only, and RentyCar is not affiliated with them. The colored make badges shown on report cards are stylized text badges created for this site, not official manufacturer logos — brand names and stylized badges are used for identification and interface clarity only.",
  },
  {
    title: "No guarantee",
    body: "RentyCar does not guarantee the accuracy, completeness, timeliness, or reliability of any information shown. Reports may be incorrect, incomplete, outdated, subjective, duplicated, or submitted in error.",
  },
  {
    title: "Not professional advice",
    body: "RentyCar does not provide travel, legal, financial, insurance, automotive, or professional advice. Users should verify rental details directly with the rental company.",
  },
  {
    title: "User-submitted content",
    body: "Users are responsible for the information they submit. License plates are an optional, supported field for vehicle spotting purposes only. Do not submit other private personal information, VINs, payment information, reservation numbers, photos of people without permission, or anything confidential.",
  },
  {
    title: "Moderation/removal",
    body: "RentyCar may edit, hide, or remove content at any time for any reason, including reports that appear inaccurate, inappropriate, abusive, private, or legally problematic.",
  },
  {
    title: "Limitation of liability",
    body: "RentyCar is provided \"as is\" and \"as available.\" To the fullest extent permitted by law, the project owner is not liable for losses, damages, disputes, travel issues, rental issues, missed reservations, vehicle availability problems, or decisions made based on information shown on the site.",
  },
  {
    title: "Contact/removal requests",
    body: "If you believe content should be corrected or removed, contact the project owner.",
  },
];

export function LegalPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className={isDark ? "glass-panel p-6 sm:p-8" : "panel p-6 sm:p-8"}>
        <p className={`text-sm font-semibold uppercase tracking-normal ${isDark ? "text-teal-300" : "text-indigo-700"}`}>
          Legal
        </p>
        <h1
          className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${
            isDark ? "font-display text-white" : "text-slate-950"
          }`}
        >
          Practical disclaimers for early testing.
        </h1>
        <p
          className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${
            isDark ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          This page is a practical disclaimer for an early hobby project and is not legal advice.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className={isDark ? "glass-panel p-5" : "panel p-5"}>
            <h2 className={`text-lg font-semibold ${isDark ? "font-display text-white" : "text-slate-950"}`}>
              {section.title}
            </h2>
            <p className={`mt-3 text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{section.body}</p>
          </article>
        ))}
      </section>

      <section className={isDark ? "glass-panel p-6 sm:p-8" : "panel p-6 sm:p-8"}>
        <h2 className={`text-lg font-semibold ${isDark ? "font-display text-white" : "text-slate-950"}`}>Contact</h2>
        <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          For corrections, removal requests, or other questions about RentyCar, reach out below.
        </p>
        <p
          className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${
            isDark ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          Note: this inbox is not operational yet — this page is still in development.
        </p>
        <a
          className={`${isDark ? "glass-button-primary" : "button-primary"} mt-4 inline-flex w-fit`}
          href="mailto:rentycar@altayatik.com"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Contact rentycar@altayatik.com
        </a>
      </section>
    </div>
  );
}
