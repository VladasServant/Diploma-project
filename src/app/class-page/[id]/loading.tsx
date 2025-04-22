import { MainNav } from "@/components/main-nav/main-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClassPageLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-14 flex items-center">
          <MainNav />
        </div>
      </header>

      <main className="p-8">
        <Skeleton className="h-9 w-1/2 mb-2" />
        <Skeleton className="h-6 w-1/3 mb-6" />

        <Tabs defaultValue="grades" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="overview" disabled>
              Огляд
            </TabsTrigger>
            <TabsTrigger value="students" disabled>
              Студенти
            </TabsTrigger>
            <TabsTrigger value="assignments" disabled>
              Завдання
            </TabsTrigger>
            <TabsTrigger value="grades" disabled>
              Оцінки
            </TabsTrigger>
            <TabsTrigger value="reports" disabled>
              Звітність
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grades" className="mt-4">
            <Skeleton className="h-8 w-1/4 mb-4" />
            <div className="rounded-md border">
              <div className="p-4 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
