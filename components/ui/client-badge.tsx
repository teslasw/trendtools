import { Badge } from "@/components/ui/badge";
import { Lock, Crown } from "lucide-react";

export function ClientOnlyBadge() {
  return (
    <Badge variant="secondary" className="ml-1 bg-gradient-to-r from-[#00ada7] to-[#2285c5] text-white border-0 text-xs">
      <Lock className="w-3 h-3 mr-1" />
      Clients Only
    </Badge>
  );
}

export function PremiumBadge() {
  return (
    <Badge variant="secondary" className="ml-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs">
      <Crown className="w-3 h-3 mr-1" />
      Premium
    </Badge>
  );
}