"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import AuthButton from "../auth-button/auth-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function MainNav() {
  const { data: session } = useSession();

  return (
    <div className="w-full flex items-center space-x-4 lg:space-x-6 px-8">
      <Link href="/">
        <h1 className="text-xl font-semibold">Learning Platform</h1>
      </Link>

      <div className="ml-auto flex items-center space-x-4">
        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <AuthButton />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  {session.user.name && (
                    <p className="text-sm font-medium leading-none">
                      {session.user.name}
                    </p>
                  )}
                  {session.user.email && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Профіль</DropdownMenuItem>
              <DropdownMenuItem>Налаштування</DropdownMenuItem>
              <DropdownMenuSeparator />
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