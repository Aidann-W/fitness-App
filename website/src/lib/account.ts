import { supabase } from './supabase';

export interface Account {
  email: string | null;
  isAnonymous: boolean;
}

export async function getAccount(): Promise<Account | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  return {
    email: session.user.email ?? null,
    isAnonymous: session.user.is_anonymous ?? false,
  };
}

// Turns the anonymous user into a real one, so their existing data stays attached.
// Returns true when Supabase is waiting for the user to confirm their email.
export async function createAccount(email: string, password: string) {
  const { data, error } = await supabase.auth.updateUser({ email, password });
  if (error) throw error;
  return Boolean(data.user.new_email);
}

export async function logIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function logOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
