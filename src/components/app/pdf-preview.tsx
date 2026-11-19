import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PdfPreview({ preview, onClose }: { preview: { title: string; url: string } | null; onClose: () => void }) {
  return (
    <Dialog open={!!preview} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="h-[90vh] max-w-5xl gap-3 p-4">
        <DialogHeader><DialogTitle className="pr-8">{preview?.title}</DialogTitle></DialogHeader>
        {preview && <iframe src={preview.url} title={preview.title} className="h-full w-full rounded-xl border bg-muted" />}
      </DialogContent>
    </Dialog>
  );
}
