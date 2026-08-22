import { useQuery } from "@tanstack/react-query"
import { useAuth } from "./auth"
import {
  apiGetAnnouncements,
  apiGetAttendance,
  apiGetAttentionItems,
  apiGetDocuments,
  apiGetLeaveBalances,
  apiGetLeaveRequests,
  apiGetPaySlips,
  apiGetPolicies,
  apiGetProfile,
  apiGetTickets,
} from "./mockApi"

export function useAttendanceQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["attendance", user?.id],
    queryFn: () => apiGetAttendance(user!.id),
    enabled: !!user,
  })
}

export function useAttentionQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["attention", user?.id],
    queryFn: () => apiGetAttentionItems(user!.id),
    enabled: !!user,
  })
}

export function useLeaveBalancesQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["leave-balances", user?.id],
    queryFn: () => apiGetLeaveBalances(user!.id),
    enabled: !!user,
  })
}

export function useLeaveRequestsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["leave-requests", user?.id],
    queryFn: () => apiGetLeaveRequests(user!.id),
    enabled: !!user,
    refetchInterval: (query) => {
      const data = query.state.data
      const hasActive = data?.some((r) => r.status === "pending")
      return hasActive ? 2000 : false
    },
  })
}

export function usePaySlipsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["pay-slips", user?.id],
    queryFn: () => apiGetPaySlips(user!.id),
    enabled: !!user,
  })
}

export function useProfileQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => apiGetProfile(user!.id),
    enabled: !!user,
  })
}

export function useDocumentsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["documents", user?.id],
    queryFn: () => apiGetDocuments(user!.id),
    enabled: !!user,
  })
}

export function useTicketsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["tickets", user?.id],
    queryFn: () => apiGetTickets(user!.id),
    enabled: !!user,
  })
}

export function usePoliciesQuery() {
  return useQuery({ queryKey: ["policies"], queryFn: apiGetPolicies })
}

export function useAnnouncementsQuery() {
  return useQuery({ queryKey: ["announcements"], queryFn: apiGetAnnouncements })
}
