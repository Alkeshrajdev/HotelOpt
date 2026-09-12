/**
 * What the shell needs to draw itself, read under the caller's own session.
 *
 * Every query here is answered by RLS, so "the client this reader works inside" is the
 * client the database will show them and not a name this module looked up with a wider
 * key. The distinction matters: the rail displays the client name beside the hotel name,
 * and a shell that could name a tenant the reader cannot see would leak the tenancy of
 * the platform through its own furniture.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { ROLE_LABEL, VIEW_ONLY_LABEL } from '@/services/access/vocabulary'
import type { Role } from '@/services/access/vocabulary'
import { currentNavKey, navItems, operatorNavItems, globalNavItems } from './model'
import type { NavItem } from './model'

export interface ShellModel {
  readonly clientName: string
  readonly hotelName: string | null
  readonly roleLabel: string | null
  readonly nav: readonly NavItem[]
  readonly currentKey: string | null
}

/**
 * The client name for a reader who may see more than one.
 *
 * A portfolio admin over two clients has no single client, and inventing one — picking the
 * first, or joining them with a comma — states a scope the reader does not have. The
 * count is stated instead, which is true in every case.
 */
function clientNameFrom(names: readonly string[]): string {
  const first = names[0]
  if (first === undefined) return 'No client'
  if (names.length === 1) return first
  return `${names.length} clients`
}

export async function loadShell(
  supabase: SupabaseClient,
  userId: string,
  hotelId: string | null,
  pathname: string,
): Promise<ShellModel> {
  const [tenantsResult, roleResult, hotelResult] = await Promise.all([
    supabase.schema('core').from('tenants').select('id,name').order('name'),
    supabase
      .schema('access')
      .from('user_role_assignments')
      .select('role,hotel_id,view_only')
      .eq('user_id', userId),
    hotelId === null
      ? Promise.resolve({ data: null, error: null })
      : supabase.schema('core').from('hotels').select('name').eq('id', hotelId).maybeSingle(),
  ])

  const clientName = clientNameFrom(
    (tenantsResult.data ?? []).map((t) => String((t as { name: string }).name)),
  )

  // The grant that applies HERE. A person who is a hotel admin at one property and a
  // viewer at another is not one of those things in general, so the label follows the
  // hotel being looked at, and falls back to their portfolio-wide grant off a hotel page.
  const assignments = (roleResult.data ?? []) as {
    role: string
    hotel_id: string | null
    view_only: boolean
  }[]
  const applicable =
    assignments.find((a) => hotelId !== null && a.hotel_id === hotelId) ??
    assignments.find((a) => a.hotel_id === null) ??
    assignments[0]
  // The flag is part of what the grant IS, so it is part of the label: "Property access"
  // and "Property access · view only" are different things to the person holding them.
  const roleLabel = applicable
    ? `${ROLE_LABEL[applicable.role as Role] ?? applicable.role}${applicable.view_only ? ` · ${VIEW_ONLY_LABEL}` : ''}`
    : null

  if (hotelId === null) {
    // Off a hotel there is no hotel to navigate within, so the rail carries only the
    // screens that are ABOVE one — registering a hotel, publishing a factor set — and only
    // for a reader who holds them at platform scope. For everybody else this is still the
    // empty rail it has always been: the alternative would be items pointing at a hotel
    // they have not chosen.
    const platform = await supabase.schema('access').rpc('my_platform_actions')
    if (platform.error) throw new Error(`nav.platform: ${platform.error.message}`)
    const platformModules = [
      ...new Set(((platform.data ?? []) as { module: string }[]).map((r) => String(r.module))),
    ]
    const operatorItems = [...globalNavItems(null), ...operatorNavItems(platformModules)]

    return {
      clientName,
      hotelName: null,
      roleLabel,
      nav: operatorItems,
      currentKey: currentNavKey(operatorItems, pathname),
    }
  }

  const [actionsResult, pending] = await Promise.all([
    supabase.schema('access').rpc('my_actions', { p_hotel_id: hotelId }),
    pendingApprovalsFor(supabase, userId, hotelId),
  ])
  if (actionsResult.error) throw new Error(`nav.actions: ${actionsResult.error.message}`)

  const heldModules = [
    ...new Set(((actionsResult.data ?? []) as { module: string }[]).map((r) => String(r.module))),
  ]

  const items = [
    ...navItems({ hotelId, heldModules, pendingApprovals: pending }),
    ...globalNavItems(heldModules),
  ]

  return {
    clientName,
    hotelName:
      hotelResult.data === null || hotelResult.data === undefined
        ? null
        : String((hotelResult.data as { name: string }).name),
    roleLabel,
    nav: items,
    currentKey: currentNavKey(items, pathname),
  }
}

/**
 * Months this reader can actually approve at this hotel.
 *
 * Submitted, and NOT submitted by them: data.approve_period refuses a month to the person
 * who submitted it (§2.6), so counting those would put a number on the rail that the
 * reader cannot reduce by doing anything. RLS answers the query, so a reader with no
 * approval grant sees the periods but the count is only ever RENDERED beside an item that
 * exists — and that item exists only where they hold the approval module.
 */
async function pendingApprovalsFor(
  supabase: SupabaseClient,
  userId: string,
  hotelId: string,
): Promise<number> {
  const { count, error } = await supabase
    .schema('data')
    .from('reporting_periods')
    .select('id', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .eq('status', 'submitted')
    .not('submitted_by', 'eq', userId)
  if (error) return 0
  return count ?? 0
}
