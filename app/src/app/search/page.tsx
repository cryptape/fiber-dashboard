"use client";

import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/features/dashboard/hooks/useDashboard";
import { Skeleton } from "@/shared/components/ui/skeleton";
import SearchResults from "@/features/search/components/SearchResults";

export default function SearchPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults />
      </Suspense>
    </QueryClientProvider>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
