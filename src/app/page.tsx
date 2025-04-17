import { MainNav } from "@/components/main-nav/main-nav";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

const classes = [
  {
    id: 1,
    name: "Mathematics 101",
    teacher: "Dr. Smith",
    banner:
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    name: "Introduction to Physics",
    teacher: "Prof. Johnson",
    banner:
      "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    name: "World History",
    teacher: "Ms. Davis",
    banner:
      "https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&q=80",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-14 flex items-center">
          <MainNav />
        </div>
      </header>

      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Your classes</h2>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Import class
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="overflow-hidden">
              <div
                className="h-32 bg-cover bg-center"
                style={{ backgroundImage: `url(${classItem.banner})` }}
              />
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl">{classItem.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {classItem.teacher}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex justify-between">
                <Link href={`/class-page/${classItem.id}`} passHref>
                  <Button variant="ghost">View Class</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
