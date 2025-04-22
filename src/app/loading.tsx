import { MainNav } from "@/components/main-nav/main-nav";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-14 flex items-center">
          <MainNav />
        </div>
      </header>
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-9 w-1/4" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-52 w-full rounded-lg" />
          <Skeleton className="h-52 w-full rounded-lg" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
      </main>
    </div>
  );
}
