/**
 * "May this reader do this?" asked of the database, in one place — §2.4.
 *
 * Seven services each wrote their own call to `access.may`, and every one of them named
 * the fourth argument `p_category`. The function's argument is `p_data_category`, so
 * PostgREST could not find the function, the call came back with an error and no data,
 * and `Boolean(r.data)` turned that into "no". Every action on capture, certification,
 * assurance, documents, surveys, compensation and reports was hidden from every reader,
 * on every screen, silently.
 *
 * Two things follow. The call lives here once, so the argument names are written once.
 * And a check that CANNOT RUN throws rather than answering: a broken permission check is
 * an error, and the screens have an error state for exactly this. Denying quietly looks
 * identical to a correct refusal, which is how this survived being deployed.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type DataCategory =
  | 'activity'
  | 'energy'
  | 'water'
  | 'fuel'
  | 'waste'
  | 'refrigerants'
  | 'generation'
  | 'cost'
  | 'procurement'
  | 'assets'
  | 'certification'
  | 'surveys'
  | 'events'
  | 'evidence'
  | 'travel'

export async function may(
  supabase: SupabaseClient,
  module: string,
  action: string,
  hotelId: string,
  category: DataCategory | null = null,
): Promise<boolean> {
  const { data, error } = await supabase.schema('access').rpc('may', {
    p_module: module,
    p_action: action,
    p_hotel_id: hotelId,
    p_data_category: category,
  })
  if (error) throw new Error(`access.may(${module}, ${action}): ${error.message}`)
  return data === true
}
