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
    body: "Users are responsible for the information they submit. Do not submit private personal information, license plates, VINs, payment information, reservation numbers, photos of people without permission, or anything confidential.",
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
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="panel p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Practical disclaimers for early testing.
        </h1>
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          This page is a practical disclaimer for an early hobby project and is not legal advice.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="panel p-5">
            <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
