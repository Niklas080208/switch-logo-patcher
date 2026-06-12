"use client";

import { useCallback, useRef, useState } from "react";

const LOGO_WIDTH = 308;
const LOGO_HEIGHT = 350;

interface PickedImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<PickedImage> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({ file, previewUrl, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error("Diese Datei konnte nicht als Bild gelesen werden."));
    };
    img.src = previewUrl;
  });
}

function ImagePicker({
  label,
  hint,
  picked,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  picked: PickedImage | null;
  onPick: (image: PickedImage) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      try {
        const image = await loadImage(file);
        if (image.width !== LOGO_WIDTH || image.height !== LOGO_HEIGHT) {
          URL.revokeObjectURL(image.previewUrl);
          setError(
            `Das Bild muss ${LOGO_WIDTH}x${LOGO_HEIGHT} Pixel groß sein, dieses ist ${image.width}x${image.height}.`
          );
          return;
        }
        onPick(image);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Bild konnte nicht geladen werden."
        );
      }
    },
    [onPick]
  );

  const sizeOk =
    picked !== null &&
    picked.width === LOGO_WIDTH &&
    picked.height === LOGO_HEIGHT;

  return (
    <div className="picker">
      <div className="picker-header">
        <span className="picker-label">{label}</span>
        {picked && (
          <button type="button" className="clear-btn" onClick={onClear}>
            Entfernen
          </button>
        )}
      </div>
      <div
        className={`dropzone${dragOver ? " drag-over" : ""}${picked ? " has-image" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        {picked ? (
          <div className="preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={picked.previewUrl} alt={`Vorschau: ${label}`} />
            <div className="preview-meta">
              <span className="filename">{picked.file.name}</span>
              <span className={`dimensions${sizeOk ? " ok" : ""}`}>
                {picked.width}x{picked.height} px
              </span>
            </div>
          </div>
        ) : (
          <div className="dropzone-empty">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.5-3.5L9 20" />
            </svg>
            <span>Bild hierher ziehen oder klicken zum Auswählen</span>
            <span className="hint">{hint}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default function Home() {
  const [newLogo, setNewLogo] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const generate = async () => {
    if (!newLogo || busy) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const formData = new FormData();
      formData.append("logo", newLogo.file);

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? `Anfrage fehlgeschlagen (${response.status})`
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "logo.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Etwas ist schiefgelaufen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/niklascfw.png" alt="NiklasCFW" className="brand-logo" />
      <div className="card">
        <header>
          <h1>Switch Logo Patcher</h1>
          <p className="subtitle">
            Lade ein {LOGO_WIDTH}x{LOGO_HEIGHT} Bild hoch und erhalte
            IPS-Patches, die das Bootlogo der Nintendo Switch ersetzen,
            gebündelt als <code>logo.zip</code>.
          </p>
        </header>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/demo.gif"
          alt="Demo: Nintendo Switch mit ausgetauschtem Bootlogo"
          className="demo-gif"
        />

        <ImagePicker
          label="Neues Logo"
          hint={`Erforderlich, genau ${LOGO_WIDTH}x${LOGO_HEIGHT} px`}
          picked={newLogo}
          onPick={setNewLogo}
          onClear={() => setNewLogo(null)}
        />

        <button
          type="button"
          className="generate-btn"
          disabled={!newLogo || busy}
          onClick={generate}
        >
          {busy ? "Wird generiert…" : "Logo generieren"}
        </button>

        {error && <p className="status error">{error}</p>}
        {done && !error && (
          <p className="status success">
            logo.zip wurde heruntergeladen. Entpacke die Datei, sodass die
            Patches in einem <code>logo</code> Ordner landen.
          </p>
        )}

        <footer>
          Fork von{" "}
          <a
            href="https://github.com/Niklas080208"
            target="_blank"
            rel="noopener noreferrer"
          >
            NiklasCFW
          </a>
          , Originales Repo:{" "}
          <a
            href="https://github.com/friedkeenan/switch-logo-patcher"
            target="_blank"
            rel="noopener noreferrer"
          >
            friedkeenan/switch-logo-patcher
          </a>
        </footer>
      </div>
    </main>
  );
}
