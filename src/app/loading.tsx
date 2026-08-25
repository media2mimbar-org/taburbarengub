import { PageSkeleton } from '@/components/ui/page-skeleton'

// Boundary paling luar: nutup navigasi yang layout ter-dalam bersamanya adalah
// root layout — yaitu ke '/' (landing) dan '/app' serta semua route tanpa
// layout sendiri ((auth)/*, sesi/[id], logout, complete-profile).
export default function Loading() {
  return <PageSkeleton />
}
