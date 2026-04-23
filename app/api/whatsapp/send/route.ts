import { Trash } from "lucide-react";
import { NextRequest, NextResponse } from "next/server";

type WhatsAppMessagePayload = {
  messaging_product: string;
  recipient_type: string;
  laborer: string;
  to: string;
  type: string;
  text?: {
    preview_url: boolean;
    body: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const {
      phoneNumber,
      transactionRef,
      items,
      brands,
      types,
      laborerName,
    }: {
        transactionRef: string;
        phoneNumber: string;
        items: {
            brand: number;
            type: number;
            size: string;
            available: number;
            cutLength: string;
            refNo?: string;
        }[];
        brands: { id: number; brand_name: string }[];
        types: { id: number; type_name: string }[];
        laborerName: string;
    } = await request.json();

    // Validate required fields
    if (!phoneNumber || !items || items.length === 0) {
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

    // Format the message
    const message = `
    Hello ${laborerName},
    New Cable Cutting Request:  
    Reference: ${transactionRef || "N/A"}
    ${items
      .map(
        (item, index) =>
        `\n${index + 1}. ${brands.find((b) => b.id === item.brand)?.brand_name}
        ${item.size} - ${types.find((t) => t.id === item.type)?.type_name}
        Drum: ${item.available}m 
        Customer: ${item.cutLength}m
        Balance: ${item.available - parseFloat(item.cutLength)}m`
        )
        .join("\n")}
    `.trim();

    const payload: WhatsAppMessagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      laborer: laborerName,
      type: "text",
      text: {
        preview_url: false,
        body: message,
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