"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerSignature } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, Input } from "@fieldforge/ui";
import { MobileModulePage } from "@/components/mobile-module-page";
import { SignaturePad } from "@/components/mobile/signature-pad";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@fieldforge/platform";
import { capturePhotoDataUrl, isCameraAvailable } from "@/lib/mobile/camera";
import { enqueueSignature, postOrEnqueue } from "@/lib/mobile/offline-queue";

export default function MobileSignaturePage() {
  const { token, client } = useAuth();
  const t = useTranslations("modules.mobileSignature");
  const { isOnline, isNative } = usePlatform();
  const router = useRouter();
  const [signerName, setSignerName] = useState("");
  const [jobId, setJobId] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [source, setSource] = useState<"pad" | "camera">("pad");
  const [recent, setRecent] = useState<CustomerSignature[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  useEffect(() => {
    if (!token || !isOnline) return;
    client
      .listSignatures()
      .then((res) => setRecent(res.data ?? []))
      .catch(() => setRecent([]));
  }, [token, client, isOnline]);

  async function onCapturePhoto() {
    setCapturing(true);
    setError(null);
    try {
      const dataUrl = await capturePhotoDataUrl();
      if (!dataUrl) {
        setError("Could not capture photo");
        return;
      }
      setImageData(dataUrl);
      setSource("camera");
    } finally {
      setCapturing(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signerName.trim() || !imageData) return;

    setSubmitting(true);
    setQueued(false);
    setError(null);

    const body = {
      signer_name: signerName.trim(),
      image_data: imageData,
      source,
      ...(jobId.trim() ? { job_id: jobId.trim() } : {}),
    };

    try {
      if (isOnline) {
        try {
          const saved = await client.createSignature(body);
          setRecent((prev) => [saved, ...prev].slice(0, 20));
        } catch (submitErr) {
          const message = submitErr instanceof Error ? submitErr.message : "Failed to save signature";
          enqueueSignature(body, "failed", message);
          setQueued(true);
          setError(message);
          return;
        }
      } else {
        const result = await postOrEnqueue({
          path: "/scheduling/signatures",
          body,
          label: `Signature: ${body.signer_name}`,
          kind: "signature",
          isOnline: false,
        });
        if (result.queued) setQueued(true);
      }

      setSignerName("");
      setJobId("");
      setImageData(null);
      setSource("pad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card className="mobile-detail-card">
        <CardContent>
          <form onSubmit={(event) => void onSubmit(event)} className="mobile-form">
            <label className="mobile-form__label" htmlFor="signature-signer">
              Customer name
            </label>
            <Input
              id="signature-signer"
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              placeholder="Who is signing?"
              required
            />
            <label className="mobile-form__label" htmlFor="signature-job">
              Job ID (optional)
            </label>
            <Input
              id="signature-job"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              placeholder="Link to completed job"
            />

            <p className="mobile-form__label">Sign below</p>
            <SignaturePad
              disabled={source === "camera"}
              onChange={(dataUrl) => {
                if (dataUrl) {
                  setImageData(dataUrl);
                  setSource("pad");
                } else if (source === "pad") {
                  setImageData(null);
                }
              }}
            />

            {imageData && source === "camera" && (
              <img src={imageData} alt="Captured signature" className="signature-pad__preview" />
            )}

            {isCameraAvailable() && (
              <Button type="button" variant="secondary" disabled={capturing || submitting} onClick={() => void onCapturePhoto()}>
                {capturing ? "Opening camera…" : isNative ? "Capture with camera" : "Take photo"}
              </Button>
            )}

            <div className="mobile-sync-status__row">
              <span>Connection</span>
              <Badge tone={isOnline ? "success" : "warning"}>{isOnline ? "Online" : "Offline"}</Badge>
            </div>

            <Button type="submit" disabled={submitting || !imageData || !signerName.trim()}>
              {submitting ? "Saving…" : isOnline ? "Save signature" : "Queue signature"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {queued && (
        <p className="mobile-queued-hint">
          Signature queued — will sync when back online. Check <a href="/m/sync">Sync</a>.
        </p>
      )}
      {error && <p className="mobile-queue-item__error">{error}</p>}

      {recent.length > 0 && (
        <>
          <p className="mobile-section-title">Recent signatures</p>
          <Card className="mobile-detail-card">
            <CardContent className="mobile-sync-status">
              {recent.map((item) => (
                <div key={item.id} className="mobile-sync-status__row">
                  <span>{item.signer_name}</span>
                  <span className="mobile-sync-status__value">
                    {new Date(item.captured_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </MobileModulePage>
  );
}
