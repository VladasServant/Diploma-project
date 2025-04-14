"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthButton from "../auth-button/auth-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MainNav() {
  const { data: session } = useSession();

  return (
    <div className="w-full flex items-center space-x-4 lg:space-x-6 px-8">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/">
          <Menu className="h-6 w-6" />
        </Link>
      </Button>

      <h1 className="text-xl font-semibold">Learning Platform</h1>

      <div className="ml-auto flex items-center space-x-4">
        {session ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <AuthButton />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Профіль</DropdownMenuItem>
              <DropdownMenuItem>Налаштування</DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                Вийти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <AuthButton />
        )}
      </div>
    </div>
  );
}
