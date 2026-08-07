import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCargoDriver } from "@/lib/cargo/registry";
import { toOrderStatus } from "@/lib/cargo/types";

// Kargo şirkətinin status bildirişi (webhook). Next 16: dinamik `params` Promise-dır.
// Payload DATA-dır, əmr deyil — yalnız tracking/status çıxarılır (təhlükəsizlik).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ driver: string }> },
) {
  const { driver: driverKey } = await params;
  const driver = await getCargoDriver(driverKey);
  // Naməlum driver — sükutla ack (təkrar göndərilməsin deyə 200).
  if (!driver) {
    return NextResponse.json({ ok: false, reason: "unknown_driver" }, { status: 200 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const result = await driver.parseWebhook(payload, request.headers);
  if (!result.trackingCode) {
    return NextResponse.json({ ok: false, reason: "no_tracking" }, { status: 200 });
  }

  // Tracking koduna görə sifarişi tap və statusu yenilə.
  const order = await prisma.order.findFirst({
    where: { tracking: result.trackingCode },
    select: { id: true },
  });

  if (order) {
    const data: { status: string; deliveryDate?: Date } = {
      status: toOrderStatus(result.status),
    };
    if (result.status === "delivered") data.deliveryDate = new Date();
    await prisma.order.update({ where: { id: order.id }, data });
  }

  // Sifariş tapılmasa belə 200 (ack) — webhook təkrar cəhd etməsin.
  return NextResponse.json({ ok: true, matched: Boolean(order) }, { status: 200 });
}
