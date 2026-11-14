"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/modules/auth/actions";

/** Only messages in conversations owned by the signed-in user. */
function ownedBy(userId: string) {
  return { conversation: { userId } };
}

export async function getMessages(conversationId: string) {
  const session = await requireAuth();

  return prisma.message.findMany({
    where: { conversationId, ...ownedBy(session.user.id) },
    orderBy: { createdAt: "asc" },
  });
}

export async function createMessage(conversationId: string, content: string) {
  const session = await requireAuth();

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  // One transaction: the conversation update fails (and rolls back the insert)
  // unless this user owns it, and it bumps updatedAt for sidebar sorting.
  const [, message] = await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId, userId: session.user.id },
      data: { updatedAt: new Date() },
    }),
    prisma.message.create({
      data: { conversationId, content: trimmed, role: "USER" },
    }),
  ]);

  return message;
}

export async function updateMessage(id: string, content: string) {
  const session = await requireAuth();

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  return prisma.message.update({
    where: { id, ...ownedBy(session.user.id) },
    data: { content: trimmed },
  });
}

export async function deleteMessage(id: string) {
  const session = await requireAuth();

  return prisma.message.delete({
    where: { id, ...ownedBy(session.user.id) },
  });
}
