import { Compass, Clock, Plane, Wallet, User, LifeBuoy, ShieldCheck, type LucideIcon } from "lucide-react"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/today", label: "Today", icon: Compass },
  { to: "/time", label: "Time", icon: Clock },
  { to: "/leave", label: "Leave", icon: Plane },
  { to: "/pay", label: "Pay", icon: Wallet },
  { to: "/me", label: "Me", icon: User },
  { to: "/security", label: "Security", icon: ShieldCheck },
  { to: "/support", label: "Support", icon: LifeBuoy },
]
