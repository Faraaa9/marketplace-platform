import "server-only";
import { cache } from "react";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderAvatarImage } from "@/lib/provider-image";
import type { ResponseData } from "./components/types";

/**
 * Server-side data access for the public request tracker. Mirrors the shape
 * returned by `/api/requests/[id]` (kept for the edit page + guest banner) but
 * lets the page stream as Server Components: the cheap summary feeds the header
 * and body, while the expensive proposals query streams on its own boundary.
 *
 * The route param named `[id]` is actually the request's tracking token.
 */

export interface TrackerSummary {
  id: string;
  title: string;
  description: string;
  /** Primary category display name (legacy single field). */
  category: string;
  /** All category names, primary first. */
  categoryNames: string[];
  location: string;
  budget: string | null;
  deadline: string | null;
  attachmentUrls: string[];
  status: string;
  moderationStatus: string;
  acceptedResponseId: string | null;
  clientId: string | null;
  createdAt: string;
  viewCount: number;
  responseCount: number;
}

export interface TrackerProposals {
  id: string;
  status: string;
  acceptedResponseId: string | null;
  clientId: string | null;
  clientName: string;
  responses: ResponseData[];
}

/**
 * Light header/body data — no responses or messages, so it resolves in
 * ~100ms and the header can paint first. `cache()` dedupes the read so the
 * header and body boundaries share a single query within one request.
 */
export const getTrackedRequestSummary = cache(
  async (trackingToken: string): Promise<TrackerSummary | null> => {
    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken },
      select: {
        id: true,
        title: true,
        description: true,
        categoryRef: { select: { name: true } },
        categories: {
          select: { category: { select: { name: true } } },
          orderBy: { sortOrder: "asc" as const },
        },
        location: true,
        budget: true,
        deadline: true,
        attachmentUrls: true,
        status: true,
        moderationStatus: true,
        acceptedResponseId: true,
        clientId: true,
        createdAt: true,
        _count: { select: { views: true, responses: true } },
      },
    });
    if (!request) return null;

    // Prefer the join table; fall back to the legacy categoryRef so rows
    // written before the multi-category migration still render.
    const joinedNames = request.categories
      .map((link) => link.category?.name?.trim() ?? "")
      .filter((name) => name.length > 0);
    const categoryNames =
      joinedNames.length > 0
        ? joinedNames
        : request.categoryRef?.name
          ? [request.categoryRef.name]
          : [];

    return {
      id: request.id,
      title: request.title,
      description: request.description,
      category: request.categoryRef?.name ?? "",
      categoryNames,
      location: request.location,
      budget: request.budget,
      deadline: request.deadline,
      attachmentUrls: request.attachmentUrls,
      status: request.status,
      moderationStatus: request.moderationStatus,
      acceptedResponseId: request.acceptedResponseId,
      clientId: request.clientId,
      createdAt: request.createdAt.toISOString(),
      viewCount: request._count.views,
      responseCount: request._count.responses,
    };
  },
);

/**
 * Heavy proposals data — responses, their providers and full message threads.
 * This is the slow query (300-700ms depending on proposal count), so it lives
 * on its own Suspense boundary and streams in last. Client read receipts are
 * deferred via `after()` so the write never blocks the stream.
 */
export async function getTrackedRequestProposals(
  trackingToken: string,
): Promise<TrackerProposals | null> {
  const request = await prisma.serviceRequest.findUnique({
    where: { trackingToken },
    select: {
      id: true,
      status: true,
      acceptedResponseId: true,
      clientId: true,
      clientName: true,
      reviews: { select: { responseId: true } },
      responses: {
        select: {
          id: true,
          providerId: true,
          message: true,
          price: true,
          createdAt: true,
          providerLastReadAt: true,
          clientLastReadAt: true,
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              providerProfile: {
                select: {
                  location: true,
                  isVerified: true,
                  isPremium: true,
                  isYoungTalent: true,
                  isGoat: true,
                  images: true,
                  heroImageUrl: true,
                },
              },
            },
          },
          messages: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
              senderName: true,
              sender: { select: { id: true, name: true, image: true } },
            },
            orderBy: { createdAt: "asc" as const },
          },
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
  });
  if (!request) return null;

  after(async () => {
    try {
      await prisma.response.updateMany({
        where: { requestId: request.id },
        data: { clientLastReadAt: new Date() },
      });
    } catch {
      // Read receipts must never block (or fail) the tracking page.
    }
  });

  const reviewedResponseIds = new Set(request.reviews.map((r) => r.responseId));

  const responses: ResponseData[] = request.responses.map((resp) => {
    const profile = resp.provider.providerProfile;
    return {
      id: resp.id,
      providerId: resp.providerId,
      message: resp.message,
      price: resp.price ?? undefined,
      createdAt: resp.createdAt.toISOString(),
      providerLastReadAt: resp.providerLastReadAt?.toISOString() ?? null,
      clientLastReadAt: resp.clientLastReadAt?.toISOString() ?? null,
      providerBadge: profile?.isVerified ? "Patikimas" : null,
      hasReview: reviewedResponseIds.has(resp.id),
      provider: {
        id: resp.provider.id,
        name: resp.provider.name ?? "",
        image: getProviderAvatarImage(resp.provider),
        providerProfile: profile
          ? {
              location: profile.location ?? "",
              isVerified: profile.isVerified,
              isPremium: profile.isPremium,
              isYoungTalent: profile.isYoungTalent,
              isGoat: profile.isGoat,
            }
          : undefined,
      },
      messages: resp.messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        senderId: m.senderId,
        senderName: m.senderName ?? undefined,
        sender: m.sender
          ? { id: m.sender.id, name: m.sender.name ?? "", image: m.sender.image }
          : undefined,
      })),
    };
  });

  return {
    id: request.id,
    status: request.status,
    acceptedResponseId: request.acceptedResponseId,
    clientId: request.clientId,
    clientName: request.clientName,
    responses,
  };
}
