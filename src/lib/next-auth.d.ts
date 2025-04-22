import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT, JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User extends DefaultUser {
     id: string;
     internalUserId?: string;
     role?: UserRole;
  }

  interface Session {
    user: User;
    accessToken?: string;
    accessTokenExpires?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
     id: string;
     internalUserId?: string;
     role?: UserRole;
     accessToken?: string;
     refreshToken?: string;
     accessTokenExpires?: number;
  }
}