import { supabase } from '@/lib/supabase';

export async function isAdminAuthenticated(): Promise<boolean> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user) {
    return false;
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.user_id);
}

export async function adminLogin(email: string, password: string): Promise<boolean> {
  const normalizedEmail = email.trim();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return false;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    return false;
  }

  return await isAdminAuthenticated();
}

export async function adminLogout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}