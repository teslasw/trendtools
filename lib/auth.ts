import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/dashboard",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            userGroups: {
              include: {
                group: true,
              },
            },
            advisor: true,
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        if (user.status === "SUSPENDED") {
          throw new Error("Account suspended");
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
          role: user.role,
          image: user.image,
          groups: user.userGroups.map(ug => ug.group.name),
          advisorId: user.advisorId,
          advisor: user.advisor ? {
            id: user.advisor.id,
            firstName: user.advisor.firstName,
            lastName: user.advisor.lastName,
            title: user.advisor.title,
            profileImageUrl: user.advisor.profileImageUrl,
            email: user.advisor.email,
            phone: user.advisor.phone,
            calendlyUrl: user.advisor.calendlyUrl,
          } : null,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            profile(profile) {
              return {
                id: profile.sub,
                email: profile.email,
                name: profile.name,
                image: profile.picture,
                role: "CUSTOMER",
              };
            },
          }),
        ]
      : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
            profile(profile) {
              return {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                image: profile.picture.data.url,
                role: "CUSTOMER",
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.groups = (user as any).groups || [];
        token.advisorId = (user as any).advisorId;
        token.advisor = (user as any).advisor;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      // Fetch fresh group data on token refresh
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: {
            userGroups: {
              include: { group: true },
            },
            advisor: true,
          },
        });
        if (dbUser) {
          token.groups = dbUser.userGroups.map(ug => ug.group.name);
          token.advisorId = dbUser.advisorId;
          token.advisor = dbUser.advisor ? {
            id: dbUser.advisor.id,
            firstName: dbUser.advisor.firstName,
            lastName: dbUser.advisor.lastName,
            title: dbUser.advisor.title,
            profileImageUrl: dbUser.advisor.profileImageUrl,
            email: dbUser.advisor.email,
            phone: dbUser.advisor.phone,
            calendlyUrl: dbUser.advisor.calendlyUrl,
          } : null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).groups = token.groups || [];
        (session.user as any).advisorId = token.advisorId;
        (session.user as any).advisor = token.advisor;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      // Log sign-in activity
      await prisma.activityLog.create({
        data: {
          userId: user.id!,
          action: "SIGN_IN",
          metadata: {
            provider: account?.provider || "credentials",
          },
        },
      });
    },
    async signOut({ token }) {
      // Log sign-out activity
      if (token?.id) {
        await prisma.activityLog.create({
          data: {
            userId: token.id as string,
            action: "SIGN_OUT",
          },
        });
      }
    },
  },
};