export function subjectIcon(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("phys")) return "architecture";
  if (s.includes("chem")) return "experiment";
  if (s.includes("bio")) return "biotech";
  if (s.includes("math")) return "calculate";
  return "menu_book";
}
