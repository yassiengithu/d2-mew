import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DownloadLabelButtonProps {
  labelUrl: string | null | undefined;
  /** Used for the downloaded filename, e.g. tracking number or shipment ID. */
  filenameHint?: string | null;
  className?: string;
}

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);

const DownloadLabelButton = ({
  labelUrl,
  filenameHint,
  className,
}: DownloadLabelButtonProps) => {
  const [downloading, setDownloading] = useState(false);

  if (!labelUrl) {
    return (
      <Button variant="outline" disabled className={className}>
        <Download className="mr-2 h-4 w-4" />
        Label not ready
      </Button>
    );
  }

  const openInNewTab = () => {
    window.open(labelUrl, "_blank", "noopener,noreferrer");
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch(labelUrl, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = filenameHint ? sanitize(filenameHint) : "shipping-label";
      a.download = `${base}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // CORS-restricted hosts (common with carrier label CDNs) — fall back to new tab.
      console.warn("Direct download failed, opening in new tab:", err);
      toast.info("Opening label in a new tab — use your browser to save as PDF.");
      openInNewTab();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <Button onClick={downloadPdf} disabled={downloading}>
        {downloading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Downloading…
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Download Label
          </>
        )}
      </Button>
      <Button variant="outline" onClick={openInNewTab}>
        <ExternalLink className="mr-2 h-4 w-4" />
        Open in new tab
      </Button>
    </div>
  );
};

export default DownloadLabelButton;
