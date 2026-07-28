import axe from 'axe-core'

/**
 * Runs an axe audit and returns the rule ids that failed.
 *
 * Automated auditing catches structural ARIA mistakes — wrong roles, broken
 * parent/child relationships, missing names. It does not replace testing with
 * a real screen reader.
 */
export async function violations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { region: { enabled: false } },
  })

  return results.violations.map((violation) => `${violation.id}: ${violation.help}`)
}
