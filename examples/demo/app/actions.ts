'use server'

export interface SubmitResult {
  readonly picked: readonly string[]
}

/**
 * Runs on the server and reads the widget's value straight out of FormData —
 * no client-side serialisation, no hidden state bridge.
 */
export async function submitStack(
  _previous: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  return { picked: formData.getAll('stack').map(String) }
}
