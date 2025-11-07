// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import { keycloakProvider } from "../../../lib/keycloak";

export default NextAuth({
  providers: [keycloakProvider],
  
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.user.id = token.sub;
      return session;
    },
  },
  
  events: {
    async signOut({ token }) {
      // Logout de Keycloak
      if (token.idToken) {
        const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
        const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
        const logoutUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout`;
        
        try {
          await fetch(logoutUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              id_token_hint: token.idToken,
              client_id: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
            }),
          });
        } catch (error) {
          console.error('Error during Keycloak logout:', error);
        }
      }
    },
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  
  secret: process.env.NEXTAUTH_SECRET,
});
