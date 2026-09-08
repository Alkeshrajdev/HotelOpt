/**
 * The documents library — SPEC-03H · H3, Guide §14.7.
 *
 * A document is linked, not filed. The library lists every document of a property with
 * what it is linked to, who uploaded it, when, and when it expires; expiring first. It
 * never sets a status anywhere (§14.7): a file is evidence someone must still read.
 */
import { expiryState } from '@/services/certification'

export interface LibraryDocument {
  readonly id: string
  readonly storagePath: string
  readonly documentType: string
  readonly checksum: string
  readonly uploadedBy: string | null
  readonly uploadedAt: string
  readonly expiresAt: string | null
  readonly expiry: 'current' | 'expiring' | 'expired'
  readonly linkedTo: readonly string[]
  /** The bytes are not in the store: a placeholder from the seed, or a lost upload. */
  readonly retrievable: boolean | null
}

export interface LibraryModel {
  readonly hotelName: string
  readonly mayUpload: boolean
  readonly documents: readonly LibraryDocument[]
  readonly expiringSoon: number
  readonly expired: number
  readonly types: readonly string[]
  readonly periods: readonly { readonly id: string; readonly month: string }[]
  /** The retention that applies, in words: the contract's and the schemes' (W-02). */
  readonly retention: string
}

export function orderForLibrary(docs: readonly LibraryDocument[]): LibraryDocument[] {
  const weight = (d: LibraryDocument) =>
    d.expiry === 'expired' ? 0 : d.expiry === 'expiring' ? 1 : 2
  return [...docs].sort((a, b) => weight(a) - weight(b) || (a.uploadedAt < b.uploadedAt ? 1 : -1))
}

export { expiryState }
