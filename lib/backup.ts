import { AppState, createBackup } from "@/lib/store";

export function downloadBackup(state: AppState) {
  const blob = new Blob([createBackup(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `hisaab-kitaab-backup-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
