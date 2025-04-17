"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "../ui/button";

export default function AuthButton() {
  const { data: session } = useSession();

  if (session) {
    return session.user?.image ? (
      <img
        src={session.user.image}
        alt="Avatar"
        className="h-8 w-8 rounded-full object-cover"
      />
    ) : (
      <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center">
        {session.user?.name?.charAt(0) ?? "U"}
      </span>
    );
  }

  return (
    <Button
      variant="ghost"
      className="px-4 py-2 border rounded-md text-sm"
      onClick={() => signIn("google")}
    >
      Увійти
    </Button>
  );
}
