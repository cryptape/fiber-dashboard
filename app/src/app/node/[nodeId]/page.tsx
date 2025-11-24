"use client";

import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/features/dashboard/hooks/useDashboard";
// import Dashboard from "@/features/dashboard/components/Dashboard";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { NodeDetail } from "@/features/nodes/components/NodeDetail";

export default function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Hero Section */}
      {/* <section className="py-10"> */}
        {/* Dashboard Content */}
        <Suspense fallback={<DashboardSkeleton />}>
          {/* <Dashboard /> */}
          <NodeDetail />
        </Suspense>
      {/* </section> */}
    </QueryClientProvider>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card-zed p-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-zed p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="card-zed p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>

      <div className="card-zed p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
