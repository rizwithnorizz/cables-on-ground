import { SupabaseClient } from "@supabase/supabase-js";
import { Trash } from "lucide-react";
import { NextRequest, NextResponse } from "next/server";
type WhatsAppMessagePayload = {
  messaging_product: string;
  to: string;
  type: string;
  template?: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
};

export async function POST(request: NextRequest) {

  try {
    const {
      phoneNumber,
      laborerName,
      laborerId,
    }: {
        phoneNumber: string;
        laborerName: string;
        laborerId: number;
    } = await request.json();

    // Validate required fields
    if (!phoneNumber || !laborerName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      console.error(
        "WhatsApp credentials not configured in environment variables"
      );
      return NextResponse.json(
        { error: "WhatsApp service not configured" },
        { status: 500 }
      );
    }

    const payload: WhatsAppMessagePayload = {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "template",
      template: {
        name: "laborer_ready",
        language: {
          code: "en_US",
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: laborerName,
              },
            ],
          },
        ],
      },
    };

    // Send to Meta WhatsApp API
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to send message" },
        { status: response.status }
      );
    }
    const supabase = new SupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: supabaseRes, error: supabaseError } = await supabase
        .from("laborers")
        .update({ last_initiated: new Date().toISOString() })
        .eq("id", laborerId);
    if (supabaseError) {
      console.error("Supabase update error:", supabaseError);
    }

    return NextResponse.json(
      {
        success: true,
        messageId: data.messages?.[0]?.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("WhatsApp endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}