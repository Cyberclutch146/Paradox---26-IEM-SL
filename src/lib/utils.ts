export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatTimestamp(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatTimeAgo(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function getRiskColor(level: string): string {
  switch (level.toLowerCase()) {
    case "low":
      return "var(--risk-low)";
    case "watch":
      return "var(--risk-watch)";
    case "warning":
      return "var(--risk-warning)";
    case "danger":
      return "var(--risk-danger)";
    default:
      return "var(--text-secondary)";
  }
}

export function getRiskColorClass(level: string): string {
  switch (level.toLowerCase()) {
    case "low":
      return "text-risk-low";
    case "watch":
      return "text-risk-watch";
    case "warning":
      return "text-risk-warning";
    case "danger":
      return "text-risk-danger";
    default:
      return "text-text-secondary";
  }
}

export function getRiskBgClass(level: string): string {
  switch (level.toLowerCase()) {
    case "low":
      return "bg-risk-low/15 text-risk-low border-risk-low/30";
    case "watch":
      return "bg-risk-watch/15 text-risk-watch border-risk-watch/30";
    case "warning":
      return "bg-risk-warning/15 text-risk-warning border-risk-warning/30";
    case "danger":
      return "bg-risk-danger/15 text-risk-danger border-risk-danger/30";
    default:
      return "bg-bg-surface text-text-secondary";
  }
}
