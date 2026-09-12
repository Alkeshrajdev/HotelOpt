/**
 * Calculation snapshots and traces — §19.4, §23.2, O-01.
 *
 * "Every value that reaches an approved report stores a FULL INPUT SNAPSHOT, not merely
 * version references. Versions are stored alongside it." (§23.2)
 *
 * And §30: "Recomputation from the stored input snapshot matches the published value
 * exactly at full precision."
 *
 * Those two together mean a snapshot that merely DESCRIBES a calculation is not enough.
 * A snapshot naming "DEFRA v2024.1" is worthless once that factor set is superseded and
 * the row is gone. So a snapshot here is EXECUTABLE: it stores the ordered operations
 * with their literal operands, and `recompute` replays them with no access to the
 * factor catalogue, the methodology, or the code that produced the original figure.
 *
 * That is what makes O-01 real — an approved figure stays reproducible years later even
 * if every factor set and methodology has moved on.
 */
import { Decimal, dec, percentage } from '../rounding'
import type { QuantityKind } from '../rounding'
import { present } from '../rounding'

/**
 * One step of the calculation. Every operand is a literal captured at the time, never a
 * reference resolved later.
 */
export type Operation =
  | {
      readonly op: 'literal'
      readonly value: string
      readonly label: string
      readonly unit: string
    }
  | {
      readonly op: 'multiply'
      readonly by: string
      readonly label: string
      readonly resultUnit: string
      readonly factorRef?: FactorRef | undefined
    }
  | {
      readonly op: 'divide'
      readonly by: string
      readonly label: string
      readonly resultUnit: string
      readonly factorRef?: FactorRef | undefined
    }
  | { readonly op: 'add'; readonly value: string; readonly label: string }
  | { readonly op: 'subtract'; readonly value: string; readonly label: string }
  /** Consolidation share, applied as a percentage (§11.2). */
  | { readonly op: 'apply_share'; readonly sharePercent: string; readonly label: string }

export interface FactorRef {
  readonly factorSetCode: string
  readonly scope: string
  readonly version: string
  readonly source: string
}

export interface Provenance {
  readonly methodVersion: string
  readonly factorSetVersions: Readonly<Record<string, string>>
  readonly modelVersion?: string | undefined
  /** A code change altering a number is detectable in the audit trail (§24.6). */
  readonly engineVersionHash: string
  readonly gwpVintage?: string | undefined
}

export interface CalculationSnapshot {
  readonly metric: string
  readonly hotelId: string
  readonly period: string
  /** The ordered operations, beginning with a literal. */
  readonly operations: readonly Operation[]
  /** The unrounded result, at full precision. */
  readonly value: string
  /** The rounded figure as published, and the precision used. */
  readonly publishedValue: string
  readonly quantityKind: QuantityKind
  readonly provenance: Provenance
  /** Evidence supporting the source records (§19.3). */
  readonly evidenceReferences: readonly string[]
  readonly boundaryNote?: string | undefined
}

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SnapshotError'
  }
}

/**
 * Replay a snapshot's operations at full precision.
 *
 * Takes nothing but the snapshot: no factor catalogue, no methodology, no engine
 * internals. If this cannot reproduce the value, the snapshot was never reproducible.
 */
export function replay(operations: readonly Operation[]): Decimal {
  if (operations.length === 0) throw new SnapshotError('a snapshot has at least one operation')
  const first = operations[0] as Operation
  if (first.op !== 'literal') {
    throw new SnapshotError('a snapshot begins with a literal input, not an operation on nothing')
  }

  let acc = dec(first.value)
  for (const step of operations.slice(1)) {
    switch (step.op) {
      case 'literal':
        throw new SnapshotError('a literal may appear only as the first operation')
      case 'multiply':
        acc = acc.times(step.by)
        break
      case 'divide': {
        const by = dec(step.by)
        if (by.isZero()) throw new SnapshotError(`division by zero at step "${step.label}"`)
        acc = acc.div(by)
        break
      }
      case 'add':
        acc = acc.plus(step.value)
        break
      case 'subtract':
        acc = acc.minus(step.value)
        break
      case 'apply_share':
        acc = acc.times(step.sharePercent).div(100)
        break
    }
  }
  return acc
}

export interface VerificationResult {
  readonly reproduced: string
  readonly stored: string
  /** Exact at full precision — the internal requirement (§30). */
  readonly exact: boolean
  /** Cross-implementation tolerance: 0.01% or the last stored decimal (§30). */
  readonly withinCrossImplementationTolerance: boolean
  readonly differencePercent: string | null
}

/** Cross-implementation and test-dataset tolerance (§30). */
export const CROSS_IMPLEMENTATION_TOLERANCE_PERCENT = '0.01'

/**
 * Verify that a snapshot reproduces its own stored value.
 *
 * Internal recomputation must match EXACTLY at full precision. The 0.01% tolerance
 * exists only for cross-implementation comparison and test datasets, and is reported
 * separately so the two are never conflated.
 */
export function verifySnapshot(snapshot: CalculationSnapshot): VerificationResult {
  const reproduced = replay(snapshot.operations)
  const stored = dec(snapshot.value)
  const difference = percentage(reproduced.minus(stored), stored)

  return {
    reproduced: reproduced.toFixed(),
    stored: stored.toFixed(),
    exact: reproduced.equals(stored),
    withinCrossImplementationTolerance:
      difference === null
        ? reproduced.equals(stored)
        : difference.abs().lessThanOrEqualTo(CROSS_IMPLEMENTATION_TOLERANCE_PERCENT),
    differencePercent: difference?.toFixed() ?? null,
  }
}

/**
 * Build a snapshot and verify it before it is stored.
 *
 * A snapshot that cannot reproduce its own value is worse than none — it looks like
 * evidence and is not — so this refuses to produce one.
 */
export function createSnapshot(
  input: Omit<CalculationSnapshot, 'value' | 'publishedValue'>,
): CalculationSnapshot {
  const value = replay(input.operations)
  const displayed = present(value, input.quantityKind)
  const snapshot: CalculationSnapshot = {
    ...input,
    value: value.toFixed(),
    publishedValue: displayed.display,
  }

  const check = verifySnapshot(snapshot)
  if (!check.exact) {
    throw new SnapshotError(
      `snapshot does not reproduce its own value: replayed ${check.reproduced} against ${check.stored}`,
    )
  }
  return snapshot
}

/**
 * The §19.4 trace, in the order the guide specifies:
 *
 *   activity value and unit → conversions applied → factor, source and version →
 *   boundary and consolidation share → intermediate values at full precision →
 *   rounded published value → the approval, model and methodology versions in force.
 *
 * This is the same artifact the platform uses internally for reproducibility, not a
 * separate presentation of it.
 */
export function renderTrace(s: CalculationSnapshot): readonly string[] {
  const lines: string[] = []
  let acc: Decimal | null = null

  for (const step of s.operations) {
    switch (step.op) {
      case 'literal':
        acc = dec(step.value)
        lines.push(`${step.label}: ${step.value} ${step.unit}`)
        break
      case 'multiply':
        acc = (acc as Decimal).times(step.by)
        lines.push(
          `× ${step.by} — ${step.label}${step.factorRef ? ` (${step.factorRef.source}, ${step.factorRef.factorSetCode} ${step.factorRef.version}, ${step.factorRef.scope})` : ''} = ${acc.toFixed()} ${step.resultUnit}`,
        )
        break
      case 'divide':
        acc = (acc as Decimal).div(step.by)
        lines.push(
          `÷ ${step.by} — ${step.label}${step.factorRef ? ` (${step.factorRef.source}, ${step.factorRef.version})` : ''} = ${acc.toFixed()} ${step.resultUnit}`,
        )
        break
      case 'add':
        acc = (acc as Decimal).plus(step.value)
        lines.push(`+ ${step.value} — ${step.label} = ${acc.toFixed()}`)
        break
      case 'subtract':
        acc = (acc as Decimal).minus(step.value)
        lines.push(`− ${step.value} — ${step.label} = ${acc.toFixed()}`)
        break
      case 'apply_share':
        acc = (acc as Decimal).times(step.sharePercent).div(100)
        lines.push(`× ${step.sharePercent}% — ${step.label} = ${acc.toFixed()}`)
        break
    }
  }

  if (s.boundaryNote !== undefined) lines.push(`Boundary: ${s.boundaryNote}`)
  lines.push(`Unrounded: ${s.value}`)
  lines.push(`Published: ${s.publishedValue}`)
  lines.push(
    `Methodology ${s.provenance.methodVersion}${s.provenance.gwpVintage ? `, GWP ${s.provenance.gwpVintage}` : ''}${s.provenance.modelVersion ? `, model ${s.provenance.modelVersion}` : ''}, engine ${s.provenance.engineVersionHash}`,
  )
  if (s.evidenceReferences.length > 0) {
    lines.push(`Evidence: ${s.evidenceReferences.join(', ')}`)
  }
  return lines
}
