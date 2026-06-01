import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Docs:
 * 1. https://authjs.dev/getting-started/authentication/oauth
 * 2. https://authjs.dev/guides/extending-the-session#with-jwt
 */

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized: async ({ auth }) => {
      // Logged in users without a session error are authenticated, otherwise
      // redirect to login page.
      return auth != null && auth.error == null;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token; // GitHub personal access token
        token.githubId = profile.id; // GitHub user ID
        token.githubLogin = String(profile.login); // GitHub username

        // Expiry date of GitHub personal access token in ms
        if (account.expires_at) {
          token.expiresAt = account.expires_at * 1000;
        }
      }
      return token;
    },
    session({ session, token }) {
      // If the GitHub personal access token has expired, set session.error
      // as a flag that we can check in the client-side and authorized callback.
      if (!token.expiresAt || new Date().getTime() > token.expiresAt) {
        session.error = "AccessTokenExpired";
      }
      session.user.githubId = token.githubId;
      session.user.githubLogin = token.githubLogin;
      return session;
    },
  },
});
