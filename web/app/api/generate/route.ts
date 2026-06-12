import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import JSZip from "jszip";
import { PATCH_INFO, LOGO_WIDTH, LOGO_HEIGHT } from "@/lib/patch-info";
import { fullRecords, serializeIps } from "@/lib/ips";

export const runtime = "nodejs";

class ValidationError extends Error {}

async function toRgba(file: File): Promise<Buffer> {
  const input = Buffer.from(await file.arrayBuffer());
  let result;
  try {
    result = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new ValidationError("Das Logo konnte nicht als Bild gelesen werden");
  }
  const { data, info } = result;
  if (info.width !== LOGO_WIDTH || info.height !== LOGO_HEIGHT) {
    throw new ValidationError(
      `Das Logo muss genau ${LOGO_WIDTH}x${LOGO_HEIGHT} Pixel groß sein (erhalten: ${info.width}x${info.height})`
    );
  }
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const logo = formData.get("logo");
    if (!(logo instanceof File)) {
      throw new ValidationError("Es wurde kein Logo hochgeladen");
    }
    const newData = await toRgba(logo);
    const baseRecords = fullRecords(newData);

    const zip = new JSZip();
    const folder = zip.folder("logo")!;
    for (const [buildId, offset] of Object.entries(PATCH_INFO)) {
      folder.file(`${buildId}.ips`, serializeIps(baseRecords, offset));
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="logo.zip"',
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Patches konnten nicht generiert werden" },
      { status: 500 }
    );
  }
}
