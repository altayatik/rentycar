import {
  Building2,
  Car,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Tag,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, Tabs } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/authStore";
import { AdminCatalog } from "./AdminCatalog";
import { AdminInvites } from "./AdminInvites";
import { AdminOverview } from "./AdminOverview";
import { AdminReports } from "./AdminReports";
import { AdminUsers } from "./AdminUsers";

type Tab =
  | "overview"
  | "users"
  | "reports"
  | "invites"
  | "airports"
  | "companies"
  | "makes"
  | "models";

export function AdminPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [pendingCount, setPendingCount] = useState(0);

  // Badge the Members tab so an approval queue never sits unnoticed.
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const load = async () => {
      const { count } = await client
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count ?? 0);
    };

    void load();
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, [tab]);

  return (
    <div className="space-y-8">
      <section className="animate-rise pt-2">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <span className="ghost-num -right-4 -top-8 text-[9rem]" style={{ color: "var(--gold)" }}>
            ADM
          </span>
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow" style={{ color: "var(--gold)" }}>
                Control panel
              </p>
              <h1 className="h-display mt-2">
                Mission <span style={{ color: "var(--gold)" }}>control</span>
              </h1>
              <p className="muted mt-3 max-w-lg">
                Everything about RentyCar that only you should be able to touch.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone="gold">Signed in as @{profile?.username}</Badge>
              {pendingCount > 0 ? <Badge tone="danger">{pendingCount} awaiting approval</Badge> : null}
            </div>
          </div>
        </Card>
      </section>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
          { id: "users", label: "Members", icon: <Users className="h-3.5 w-3.5" />, count: pendingCount },
          { id: "reports", label: "Reports", icon: <ClipboardList className="h-3.5 w-3.5" /> },
          { id: "invites", label: "Invites", icon: <Ticket className="h-3.5 w-3.5" /> },
          { id: "airports", label: "Airports", icon: <MapPin className="h-3.5 w-3.5" /> },
          { id: "companies", label: "Companies", icon: <Building2 className="h-3.5 w-3.5" /> },
          { id: "makes", label: "Makes", icon: <Tag className="h-3.5 w-3.5" /> },
          { id: "models", label: "Models", icon: <Car className="h-3.5 w-3.5" /> },
        ]}
      />

      <div key={tab} className="animate-fade">
        {tab === "overview" ? <AdminOverview onJumpToUsers={() => setTab("users")} /> : null}
        {tab === "users" ? <AdminUsers /> : null}
        {tab === "reports" ? <AdminReports /> : null}
        {tab === "invites" ? <AdminInvites /> : null}
        {tab === "airports" ? <AdminCatalog table="airports" /> : null}
        {tab === "companies" ? <AdminCatalog table="rental_companies" /> : null}
        {tab === "makes" ? <AdminCatalog table="car_makes" /> : null}
        {tab === "models" ? <AdminCatalog table="car_models" /> : null}
      </div>
    </div>
  );
}
