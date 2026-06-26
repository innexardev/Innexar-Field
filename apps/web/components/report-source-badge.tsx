import { Badge } from "@fieldforge/ui";
import type { ReportDataSource } from "@fieldforge/sdk";

export function ReportSourceBadge({ source }: { source?: ReportDataSource }) {
  if (source === "live") {
    return (
      <Badge tone="success" className="text-xs">
        Live data
      </Badge>
    );
  }
  if (source === "stub") {
    return (
      <Badge tone="warning" className="text-xs">
        Sample data
      </Badge>
    );
  }
  return null;
}
