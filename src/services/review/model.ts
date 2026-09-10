/**
 * What is outstanding at a hotel, and on whom.
 *
 * THE DEFECT. This screen queried months in `submitted` or `returned` and, finding none,
 * said "No month at this hotel is waiting on anyone." At that moment the same hotel's
 * Overview said "September 2026 has not been submitted" under a heading reading Attention
 * required. Both screens were rendered from the same database in the same session, and
 * they contradicted each other.
 *
 * A month nobody has submitted IS waiting on somebody — the person who enters it. The
 * query was right to exclude drafts from an approval queue and the sentence was wrong to
 * claim it had covered everyone. A Hotel Manager opening this page to ask "is anything
 * outstanding here?" was told no, one click from being told yes.
 *
 * WHAT THIS MODULE DECIDES. Which of four queues a month belongs in, and the one sentence
 * at the top that says what the page has and has not looked at. Kept out of the page
 * because the sentence is the part that was wrong, and a sentence assembled inline in JSX
 * is a sentence no test can read.
 *
 * WHOM A MONTH WAITS ON — the whole model in four lines:
 *
 *   draft or returned   the people who enter figures
 *   submitted           an approver who is not the submitter (§2.6)
 *   approved            nobody; it is done and is not on this page
 *   locked              nobody; it is closed
 */

export interface ReviewMonth {
  readonly id: string
  /** YYYY-MM. */
  readonly month: string
  readonly status: string
  readonly submittedByMe: boolean
  readonly returnedReason: string | null
  /** Set where an APPROVED month was reopened: a published figure being restated. */
  readonly reopenedReason: string | null
}

export interface ReviewQueues {
  /** Submitted by somebody else, and this reader may approve. */
  readonly waitingForYou: readonly ReviewMonth[]
  /** Submitted by this reader, so §2.6 puts them beyond their own approval. */
  readonly submittedByYou: readonly ReviewMonth[]
  readonly returned: readonly ReviewMonth[]
  /** Open months nobody has submitted. Not an approval queue; still outstanding. */
  readonly notSubmitted: readonly ReviewMonth[]
  /** What the page covers, and what is outstanding that it is not an approval queue for. */
  readonly headline: string
}

function months(n: number): string {
  return n === 1 ? '1 month' : `${n} months`
}

export function reviewQueues(input: {
  readonly rows: readonly ReviewMonth[]
  readonly canApprove: boolean
}): ReviewQueues {
  const submitted = input.rows.filter((r) => r.status === 'submitted')
  const waitingForYou = input.canApprove ? submitted.filter((r) => !r.submittedByMe) : []
  // Where the reader cannot approve, their own submissions are still theirs and still
  // waiting on somebody; they simply have no counterpart list to sit beside.
  const submittedByYou = submitted.filter((r) => r.submittedByMe)
  const returned = input.rows.filter((r) => r.status === 'returned')
  const notSubmitted = input.rows.filter((r) => r.status === 'draft')

  const inApproval = submitted.length + returned.length

  let headline: string
  if (inApproval === 0 && notSubmitted.length === 0) {
    // Now true, because drafts were counted before it was said.
    headline = 'No month at this hotel is waiting on anyone.'
  } else if (inApproval === 0) {
    // The sentence that used to be missing. Naming the number matters: "some months are
    // open" is not something anybody can act on.
    headline = `No month is waiting for approval. ${months(notSubmitted.length)} ${
      notSubmitted.length === 1 ? 'has' : 'have'
    } not been submitted yet, so ${notSubmitted.length === 1 ? 'it is' : 'they are'} waiting on whoever enters the figures.`
  } else if (notSubmitted.length === 0) {
    headline =
      'A month is opened, entered, submitted and approved. These are the ones between the last two.'
  } else {
    headline = `A month is opened, entered, submitted and approved. These are the ones between the last two, and ${months(
      notSubmitted.length,
    )} that ${notSubmitted.length === 1 ? 'has' : 'have'} not been submitted at all.`
  }

  return { waitingForYou, submittedByYou, returned, notSubmitted, headline }
}
