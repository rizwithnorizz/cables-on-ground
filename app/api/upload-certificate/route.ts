import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("certificate");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No certificate file provided" }, { status: 400 });
  }

  const filename = file.name;
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const uploadDir = path.join(process.cwd(), "public", "certificates");

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeFilename);
    await fs.writeFile(filePath, buffer);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save certificate file" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: `/certificates/${safeFilename}` });
}
