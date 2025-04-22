import NextAuth from "next-auth";
import type { NextAuthOptions, User as NextAuthUser, Profile } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import type { AdapterUser } from "next-auth/adapters";

const googleScopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/classroom.profile.emails",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
  "https://www.googleapis.com/auth/classroom.student-submissions.students.readonly",
];

const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: googleScopes.join(" "),
        },
      },
      profile(
        profile: Profile & {
          given_name?: string;
          family_name?: string;
          picture?: string;
        }
      ) {
        const googleSubId = profile.sub!;

        return {
          id: googleSubId,
          name:
            profile.name ??
            `${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim(),
          email: profile.email,
          image: profile.image ?? profile.picture,
          googleUserId: googleSubId,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      const userWithGoogleId = user as (NextAuthUser | AdapterUser) & {
        googleUserId?: string;
      };

      if (userWithGoogleId && profile?.sub) {
        token.id = userWithGoogleId.id;

        try {
          const dbUser = await prisma.user.upsert({
            where: { email: userWithGoogleId.email! },
            update: {
              name: userWithGoogleId.name,
              image: userWithGoogleId.image,
              googleUserId: profile.sub,
            },
            create: {
              email: userWithGoogleId.email!,
              name: userWithGoogleId.name,
              image: userWithGoogleId.image,
              googleUserId: profile.sub,
              role: UserRole.STUDENT,
            },
            select: { id: true, role: true },
          });
          token.internalUserId = dbUser.id;
          token.role = dbUser.role;
        } catch (error) {
          console.error("JWT: Failed to upsert user in DB:", error);
          token.error = "DatabaseUpsertError";
          return token;
        }
      }

      if (account) {
        token.accessToken = account.access_token;
        if (account.refresh_token) {
          token.refreshToken = account.refresh_token;
        }
        token.accessTokenExpires =
          Date.now() + (account.expires_at ?? 0) * 1000;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        if (session.user) {
          session.user.id = token.id;
          session.user.internalUserId = token.internalUserId;
          session.user.role = token.role;
        }
        session.accessToken = token.accessToken;
        session.accessTokenExpires = token.accessTokenExpires;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
