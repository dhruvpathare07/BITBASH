// The PDF libraries are big (most of the old download), so they're loaded
// only when someone clicks "Download as PDF" instead of with the game.
export async function loadPdfTools() {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  return { html2canvas, jsPDF };
}
