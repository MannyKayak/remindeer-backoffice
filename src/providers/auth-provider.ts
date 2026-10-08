import type { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "./supabase-client";

const NOT_ADMIN_MESSAGE = "Questo account non ha accesso al backoffice.";

/** Landing end users share this Supabase project: a session alone is not enough. */
async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabaseClient.rpc("is_admin");
  return !error && data === true;
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: "LoginError",
        },
      };
    }

    if (data?.session) {
      if (!(await isAdmin())) {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          error: { message: NOT_ADMIN_MESSAGE, name: "LoginError" },
        };
      }
      return { success: true, redirectTo: "/" };
    }

    return {
      success: false,
      error: { message: "Login failed", name: "LoginError" },
    };
  },
  logout: async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      return {
        success: false,
        error: { message: error.message, name: "LogoutError" },
      };
    }

    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    const { data } = await supabaseClient.auth.getSession();

    if (data?.session) {
      if (await isAdmin()) {
        return { authenticated: true };
      }
      await supabaseClient.auth.signOut();
      return {
        authenticated: false,
        logout: true,
        redirectTo: "/login",
        error: { message: NOT_ADMIN_MESSAGE, name: "Unauthorized" },
      };
    }

    return {
      authenticated: false,
      redirectTo: "/login",
    };
  },
  onError: async (error) => {
    if (error?.code === "PGRST301" || error?.code === 401) {
      return { logout: true };
    }
    return { error };
  },
  getIdentity: async () => {
    const { data } = await supabaseClient.auth.getUser();
    if (!data?.user) return null;
    return { id: data.user.id, email: data.user.email };
  },
};
