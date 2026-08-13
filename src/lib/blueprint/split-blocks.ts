/**
 * Splits a markdown reply into paragraph-level chunks so long assistant
 * turns render as several short chat bubbles instead of one wall of text.
 * Splits on blank lines only (standard markdown block boundaries), so a
 * numbered/bulleted list — whose items have no blank line between them —
 * stays together as one bubble instead of being torn apart mid-list.
 */
export function splitMarkdownBlocks(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}
