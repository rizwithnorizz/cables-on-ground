import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("certificate");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No certificate file provided" }, { status: 400 });
    }

    // Initialize Supabase client for test certificates project
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const filename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const bucketName = "test_certificates";

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(safeFilename, buffer, {
        contentType: file.type,
      });

    if (error) {
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(safeFilename);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error("Certificate upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
