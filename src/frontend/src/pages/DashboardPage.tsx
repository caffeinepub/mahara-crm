import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Calendar, Flame, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LeadStatus } from "../backend";
import { useActor } from "../hooks/useActor";

const TEAL = "#14B8A6";
const NAVY = "#0F2A3A";

const STATUS_ORDER = [
  LeadStatus.New,
  LeadStatus.Contacted,
  LeadStatus.VisitBooked,
  LeadStatus.Converted,
  LeadStatus.Dropped,
];

const FUNNEL_COLORS = ["#14B8A6", "#0EA5A4", "#0891B2", "#0369A1", "#64748B"];

const STAT_CARDS = [
  {
    label: "Total Leads",
    key: "totalLeads" as const,
    icon: Users,
    color: NAVY,
    bg: "#EEF2F7",
    trend: "+12% this month",
  },
  {
    label: "Converted Leads",
    key: "convertedCount" as const,
    icon: TrendingUp,
    color: "#16A34A",
    bg: "#F0FDF4",
    trend: "+8% this month",
  },
  {
    label: "Hot Leads",
    key: "hotLeadsCount" as const,
    icon: Flame,
    color: "#DC2626",
    bg: "#FEF2F2",
    trend: "Score ≥ 70",
  },
  {
    label: "Pending Follow-ups",
    key: "pendingFollowUpsCount" as const,
    icon: Calendar,
    color: "#D97706",
    bg: "#FFFBEB",
    trend: "Due soon",
  },
];

export default function DashboardPage() {
  const { actor, isFetching } = useActor();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => (actor ? actor.getDashboardStats() : null),
    enabled: !!actor && !isFetching,
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["allLeads"],
    queryFn: async () => (actor ? actor.getAllLeads() : []),
    enabled: !!actor && !isFetching,
  });

  const { data: followUps, isLoading: fuLoading } = useQuery({
    queryKey: ["pendingFollowUps"],
    queryFn: async () => (actor ? actor.getPendingFollowUps() : []),
    enabled: !!actor && !isFetching,
  });

  const funnelData = useMemo(() => {
    if (!leads) return [];
    return STATUS_ORDER.map((status) => ({
      name: status === LeadStatus.VisitBooked ? "Visit Booked" : status,
      count: leads.filter((l) => l.status === status).length,
    }));
  }, [leads]);

  const recentActivities = useMemo(() => {
    if (!followUps) return [];
    return followUps.slice(0, 8);
  }, [followUps]);

  function formatDate(ts: bigint) {
    return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  const isLoading = statsLoading || leadsLoading;

  return (
    <div className="space-y-6" data-ocid="dashboard.page">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">
            School CRM Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your enrollment funnel in real time
          </p>
        </div>
        <Select defaultValue="march">
          <SelectTrigger
            className="w-36 h-8 text-sm"
            data-ocid="dashboard.month.select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="march">March 2026</SelectItem>
            <SelectItem value="february">February 2026</SelectItem>
            <SelectItem value="january">January 2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        data-ocid="dashboard.stats.section"
      >
        {STAT_CARDS.map((card, i) => {
          const Icon = card.icon;
          const value = stats ? Number(stats[card.key]) : 0;
          return (
            <Card
              key={card.label}
              className="border border-gray-100 shadow-card"
              data-ocid={`dashboard.stats.card.${i + 1}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {card.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="font-display font-bold text-3xl mt-1 text-foreground">
                        {value}
                      </p>
                    )}
                    <p
                      className="text-xs mt-1.5 flex items-center gap-1"
                      style={{ color: card.color }}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      {card.trend}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <Card
          className="border border-gray-100 shadow-card"
          data-ocid="dashboard.funnel.card"
        >
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={STATUS_ORDER[i] ?? i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={funnelData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [v, "Leads"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} minPointSize={4}>
                    {funnelData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card
          className="border border-gray-100 shadow-card"
          data-ocid="dashboard.activity.card"
        >
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">
              Upcoming Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fuLoading ? (
              <div className="space-y-3">
                {["s1", "s2", "s3", "s4"].map((k) => (
                  <Skeleton key={k} className="h-10 w-full" />
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 text-muted-foreground"
                data-ocid="dashboard.activity.empty_state"
              >
                <Calendar className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No pending follow-ups</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((fu, i) => (
                  <div
                    key={`${String(fu.leadId)}-${String(fu.dueDate)}`}
                    className="flex items-start gap-3"
                    data-ocid={`dashboard.activity.item.${i + 1}`}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: TEAL }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {fu.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lead #{Number(fu.leadId)} · Due {formatDate(fu.dueDate)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs shrink-0"
                      style={{ borderColor: TEAL, color: TEAL }}
                    >
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
