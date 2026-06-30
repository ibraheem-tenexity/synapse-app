import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getNextAuthSecret } from "./lib/nextauth-secret";

// Demo user — any password accepted (BR: demo/mock auth)
const DEMO_USER = {
  id: "demo-user-id",
  email: "demo@synapse.app",
  name: "Demo User",
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getNextAuthSecret(),
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;

        if (!email) {
          return null;
        }

        // Demo user: any password is accepted for demo@synapse.app
        if (email === DEMO_USER.email) {
          return DEMO_USER;
        }

        // No other users in demo mode
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
