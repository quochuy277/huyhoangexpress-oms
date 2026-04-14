import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// --- Rate limiting (in-memory) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// --- Validation ---
function validatePhone(phone: string): boolean {
  return /^0\d{9}$/.test(phone.trim());
}

// --- estimatedSize mapping ---
function mapEstimatedSize(
  value?: string
): "SMALL" | "MEDIUM" | "LARGE" | undefined {
  if (!value) return undefined;
  switch (value) {
    case "Dưới 30":
      return "SMALL";
    case "30-100":
      return "MEDIUM";
    case "100-500":
    case "Trên 500":
      return "LARGE";
    default:
      return undefined;
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau vài phút." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();

    // Honeypot check
    if (body.website) {
      // Honeypot field filled → bot
      return NextResponse.json({ success: true }); // Fake success to confuse bot
    }

    const {
      shopName,
      phone,
      contactPerson,
      emailZalo,
      productType,
      estimatedOrders,
      note,
    } = body;

    // Validate required fields
    if (!shopName?.trim()) {
      return NextResponse.json(
        { error: "Tên shop/cửa hàng là bắt buộc" },
        { status: 400 }
      );
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        { error: "Số điện thoại là bắt buộc" },
        { status: 400 }
      );
    }

    if (!validatePhone(phone)) {
      return NextResponse.json(
        { error: "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)" },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await prisma.shopProspect.findFirst({
      where: {
        OR: [
          { phone: phone.trim() },
          { shopName: shopName.trim() },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "duplicate",
          message:
            "Thông tin đã được ghi nhận trước đó. Chúng tôi sẽ sớm liên hệ bạn!",
        },
        { status: 409 }
      );
    }

    // Find assignee: ADMIN first, then MANAGER
    const assignee = await prisma.user.findFirst({
      where: {
        isActive: true,
        role: { in: ["ADMIN", "MANAGER"] },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (!assignee) {
      logger.error("POST /api/landing/register", "No ADMIN/MANAGER user found");
      return NextResponse.json(
        {
          error:
            "Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hotline 0963 537 634.",
        },
        { status: 500 }
      );
    }

    // Build sourceDetail
    const sourceDetails: string[] = [];
    if (productType) sourceDetails.push(`Sản phẩm: ${productType}`);
    if (estimatedOrders)
      sourceDetails.push(`SL đơn/tháng: ${estimatedOrders}`);

    // Create ShopProspect
    const prospect = await prisma.shopProspect.create({
      data: {
        shopName: shopName.trim(),
        phone: phone.trim(),
        contactPerson: contactPerson?.trim() || null,
        email: emailZalo?.trim() || null,
        zalo: emailZalo?.trim() || null,
        source: "LANDING_PAGE",
        sourceDetail: sourceDetails.join(" | ") || null,
        productType: productType || null,
        estimatedSize: mapEstimatedSize(estimatedOrders),
        note: note?.trim() || null,
        stage: "DISCOVERED",
        assigneeId: assignee.id,
      },
    });

    // Create TodoItem notification for assignee
    await prisma.todoItem.create({
      data: {
        title: `Lead mới từ Landing Page: ${shopName.trim()}`,
        description: [
          `SĐT: ${phone.trim()}`,
          contactPerson ? `Liên hệ: ${contactPerson.trim()}` : null,
          productType ? `Sản phẩm: ${productType}` : null,
          estimatedOrders ? `SL đơn/tháng: ${estimatedOrders}` : null,
          note ? `Ghi chú: ${note.trim()}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        assigneeId: assignee.id,
        createdById: assignee.id,
        source: "FROM_CRM",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
        status: "TODO",
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Cảm ơn bạn đã đăng ký! Chúng tôi sẽ liên hệ trong 24 giờ.",
      prospectId: prospect.id,
    });
  } catch (error) {
    logger.error("POST /api/landing/register", "Error", error);
    return NextResponse.json(
      {
        error:
          "Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hotline 0963 537 634.",
      },
      { status: 500 }
    );
  }
}
