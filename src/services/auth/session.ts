/**
 * Who is making this request.
 *
 * The session is read from the cookie store the request carried; nothing here accepts a
 * user identifier from a caller, because a caller-supplied identity is the caller's claim
 * about itself (§2.5). RLS is still the enforcement — this only tells a page whose name to
 * put in the header and which grants to enumerate.
 *
 * `signedInUser` returns null rather than throwing when there is no session. Middleware has
 * already redirected an anonymous visitor by the time a page runs, so a null here means
 * something rarer: a session that expired between the middleware pass and the render. That
 * is worth handling as a state, not as an exception.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SignedInUser {
  readonly id: string
  readonly email: string
  readonly fullName: string
  readonly isOperator: boolean
}

export async function signedInUser(supabase: SupabaseClient): Promise<SignedInUser | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  const { data: profile } = await supabase
    .schema('access')
    .from('user_profiles')
    .select('full_name,email,is_operator,suspended_at')
    .eq('id', data.user.id)
    .maybeSingle()

  // A suspended account keeps a valid token until it expires. Treating it as signed out is
  // the point of suspending it; waiting for the token to lapse is not a suspension.
  if (profile?.suspended_at) return null

  return {
    id: data.user.id,
    email: String(profile?.email ?? data.user.email ?? ''),
    fullName: String(profile?.full_name ?? data.user.email ?? 'Signed in'),
    isOperator: Boolean(profile?.is_operator),
  }
}
