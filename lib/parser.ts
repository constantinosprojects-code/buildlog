import type { EntryTag, ParsedNote, Project } from "@/types/buildlog";

export function parseRawNote(raw: string | null | undefined): ParsedNote {
  const text = (raw || "").trim();
  if (!text) return { title: "Untitled entry", tag: "Prototype", specs: [] };

  // Title: first sentence or first 60 chars.
  let title = text.split(/[.!?\n]/)[0].trim();
  if (title.length > 60) title = `${title.slice(0, 57)}…`;
  if (!title) title = "Untitled entry";

  // Tag detection keeps the prototype's original priority order.
  const lower = text.toLowerCase();
  let tag: EntryTag = "Prototype";
  if (/\b(fried|smoke|failed|failure|broke|broken|crash|error|bug|stall|overcurrent|magic smoke|died|burnt|shorted)\b/.test(lower)) {
    tag = "Failure";
  } else if (/\b(fixed|solved|added|breakthrough|works|working|success|resolved|improved|no more)\b/.test(lower)) {
    tag = "Breakthrough";
  } else if (/\b(final|locked|spec|production|shipped|done|complete|v1\.0)\b/.test(lower)) {
    tag = "Final";
  } else if (/\b(idea|concept|sketch|brainstorm|initial|thinking)\b/.test(lower)) {
    tag = "Idea";
  }

  const specCandidates =
    text.match(/\b([A-Z]{2,}[0-9]*[A-Z0-9\-]*|[A-Z][a-z]+ ?[0-9]+[A-Za-z]*|Fusion 360|SolidWorks|KiCad|Arduino|Raspberry Pi|ESP32|STM32|PLA|ABS|PETG|INA[0-9]+|TB[0-9]+|MOSFET|RPLidar|BNO[0-9]+|VL53[A-Z0-9]+|OpenCV|PyTorch|TensorFlow)\b/g) || [];
  const specs = [...new Set(specCandidates)].slice(0, 6);

  return { title, tag, specs };
}

export function compressImage(
  file: File,
  maxWidth = 720,
  quality = 0.75,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.onload = () => {
      const source = reader.result;
      if (typeof source !== "string") {
        reject(new Error("The selected image could not be read."));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error("The selected file is not a valid image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Your browser could not create an image canvas."));
          return;
        }
        context.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = source;
    };

    reader.readAsDataURL(file);
  });
}

export function generateReadme(project: Project | null | undefined): string {
  if (!project) return "";

  const failures = project.entries.filter((entry) => entry.tag === "Failure");
  const breakthroughs = project.entries.filter((entry) => entry.tag === "Breakthrough");

  return `# ${project.name}

${project.description}

## Iteration Log

${project.entries
  .map(
    (entry) =>
      `### ${entry.date} — ${entry.title} [${entry.tag}]
${entry.note}${entry.specs?.length ? "\nSpecs: " + entry.specs.join(", ") : ""}`,
  )
  .join("\n\n")}

## Key Trade-offs
${failures.map((entry) => `- ${entry.title}: ${entry.note}`).join("\n") || "- None recorded yet"}

## Breakthroughs
${breakthroughs.map((entry) => `- ${entry.title}: ${entry.note}`).join("\n") || "- None recorded yet"}

---
Generated with [BuildLog](https://buildlog.app) — Proof of Work portfolio
`;
}

export function generateSummary(project: Project | null | undefined): string {
  if (!project) return "";
  const last = project.entries[project.entries.length - 1];
  const failures = project.entries.filter((entry) => entry.tag === "Failure").length;

  return `${project.name}: ${project.description}. Through ${project.entries.length} iterations (${failures} documented failures), the project evolved from early prototypes to a working system. Key engineering decisions included material choices, sensor selection, and power management trade-offs. Latest state: ${last?.title || "In progress"}. Full build log available on request.`;
}
