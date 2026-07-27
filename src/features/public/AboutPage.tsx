import { ArrowRight, ClipboardCheck, Compass, Mail, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Callout, Card, Reveal, SectionHeader } from "../../components/ui";

const steps = [
  {
    icon: Users,
    title: "Create a free account",
    body: "Pick a username and a nickname. An email is optional, but it's the only way to reset a forgotten password.",
    tone: "var(--runway)",
    tint: "var(--runway-tint)",
  },
  {
    icon: ShieldCheck,
    title: "Get cleared",
    body: "New accounts are reviewed before their first post goes live. An invite code skips the queue entirely.",
    tone: "var(--sodium)",
    tint: "var(--sodium-tint)",
  },
  {
    icon: ClipboardCheck,
    title: "Log what you see",
    body: "Make, model, year, mileage, tyres, fuel, driver-assist kit — as much or as little as you noticed.",
    tone: "var(--go)",
    tint: "var(--go-tint)",
  },
  {
    icon: Compass,
    title: "Collect stamps",
    body: "Every airport you report from earns a stamp. Add friends and compare who has covered more ground.",
    tone: "var(--safety)",
    tint: "var(--safety-tint)",
  },
];

const legalSections = [
  {
    title: "Independent project",
    body: "RentyCar is an independent personal/hobby project. It is not affiliated with, endorsed by, sponsored by, or officially connected to any rental car company, airport, automaker, travel provider, booking platform, or other third party mentioned on the site.",
  },
  {
    title: "Trademarks",
    body: "Company names, airport names, vehicle makes, vehicle models, logos, and other marks belong to their respective owners. Any references are for identification and informational purposes only. The coloured make badges are stylized text created for this site, not official manufacturer logos.",
  },
  {
    title: "No guarantee",
    body: "RentyCar does not guarantee the accuracy, completeness, timeliness, or reliability of any information shown. Reports may be incorrect, incomplete, outdated, subjective, duplicated, or submitted in error.",
  },
  {
    title: "Not professional advice",
    body: "RentyCar does not provide travel, legal, financial, insurance, automotive, or professional advice. Verify rental details directly with the rental company.",
  },
  {
    title: "User-submitted content",
    body: "Users are responsible for what they submit. License plates are an optional field for vehicle spotting only. Do not submit other private personal information, VINs, payment details, reservation numbers, photos of people without permission, or anything confidential.",
  },
  {
    title: "Moderation and removal",
    body: "RentyCar may edit, hide, or remove content at any time for any reason, including reports that appear inaccurate, inappropriate, abusive, private, or legally problematic. Accounts may be held for review, suspended, or removed at the operator's discretion.",
  },
  {
    title: "Accounts and data",
    body: "Accounts require a username, a nickname, and a password. An email address is optional and used solely for password recovery. RentyCar does not sell user data or run advertising.",
  },
  {
    title: "Limitation of liability",
    body: 'RentyCar is provided "as is" and "as available." To the fullest extent permitted by law, the project owner is not liable for losses, damages, disputes, travel issues, rental issues, missed reservations, vehicle availability problems, or decisions made based on information shown on the site.',
  },
];

export function AboutPage() {
  return (
    <div className="space-y-16">
      {/* ------------------------------- Hero ------------------------------ */}
      <section className="about-hero animate-rise">
        <p className="product-kicker">Why RentyCar exists</p>
        <h1>The useful details live beyond <span>“or similar.”</span></h1>
        <div>
          <p>
            Rental sites sell categories. Travelers receive actual cars. RentyCar closes that gap
            with a public, community-built record of what left the lot.
          </p>
          <strong>Independent. Private by default. Built for curious renters.</strong>
        </div>
      </section>

      {/* ---------------------------- How it works ------------------------- */}
      <Reveal as="section" className="space-y-5">
        <SectionHeader eyebrow="How it works" title="Four steps" />
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step.title} className="bay card-hover relative overflow-hidden p-5">
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ background: step.tone }}
                aria-hidden="true"
              />
              <span className="ghost-num -right-2 -top-4 text-[5rem]" style={{ color: step.tone }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className="relative flex h-10 w-10 items-center justify-center rounded-xs"
                style={{ background: step.tint, color: step.tone }}
              >
                <step.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="h2 relative mt-4">{step.title}</h3>
              <p className="muted relative mt-2 text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ------------------------------ Honesty ---------------------------- */}
      <Reveal as="section" className="space-y-5">
        <SectionHeader eyebrow="Straight up" title="What this is, and isn't" />
        <Card className="space-y-4 p-6 text-base leading-relaxed sm:p-8">
          <p className="muted">
            RentyCar is an independent hobby project. It is <strong className="text-ink">not</strong>{" "}
            affiliated with, endorsed by, sponsored by, or connected to any rental car company, airport,
            automaker, travel agency, booking platform, or mapping provider.
          </p>
          <p className="muted">
            Everything here is user-submitted, so it may be incomplete, inaccurate, outdated, or plain
            subjective. Fleets rotate constantly. Confirm rental details with the rental company before
            you make travel decisions.
          </p>
          <p className="muted">
            Reporter identities are never shown on public pages. Your username is visible only to
            friends you have accepted.
          </p>
        </Card>
      </Reveal>

      {/* ------------------------------- Legal ----------------------------- */}
      <Reveal as="section" className="space-y-5">
        <div id="legal" className="scroll-mt-24">
          <SectionHeader eyebrow="The fine print" title="Legal" />
        </div>

        <Callout tone="gold" title="Not legal advice">
          This section is a practical disclaimer for an early hobby project.
        </Callout>

        <div className="grid gap-3 md:grid-cols-2">
          {legalSections.map((section) => (
            <div key={section.title} className="card card-hover p-5">
              <h3 className="h3">{section.title}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <Card className="p-6 sm:p-8">
          <h3 className="h2">Corrections and removals</h3>
          <p className="muted mt-2 text-sm leading-relaxed">
            If something on the site is wrong about you or your vehicle, ask and it comes down.
          </p>
          <div className="mt-4">
            <Callout tone="gold">
              This inbox is not monitored yet — the contact flow is still in development.
            </Callout>
          </div>
          <a className="btn btn-secondary mt-5 w-fit" href="mailto:rentycar@altayatik.com">
            <Mail className="h-4 w-4" aria-hidden="true" />
            rentycar@altayatik.com
          </a>
        </Card>
      </Reveal>

      <section>
        <Link className="btn btn-accent btn-lg" to="/">
          Browse the register
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
