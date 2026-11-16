"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { conversationKeys } from "@/modules/conversations/hooks/useConversation";
import { createMessage, deleteMessage, getMessages, updateMessage } from "../actions";

export const messageKeys = {
  list: (conversationId: string | null) => ["messages", conversationId] as const,
};

export type ChatMessage = Awaited<ReturnType<typeof getMessages>>[number];
type Message = ChatMessage;

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: messageKeys.list(conversationId),
    queryFn: () => getMessages(conversationId!),
    enabled: !!conversationId,
  });
}

export function useCreateMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const queryKey = messageKeys.list(conversationId);

  return useMutation({
    mutationFn: (content: string) => createMessage(conversationId, content),
    // Show the message immediately with a temporary id; replaced by the saved
    // one when the server responds, removed if it fails.
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Message[]>(queryKey);
      const now = new Date();
      const optimistic: Message = {
        id: `temp-${crypto.randomUUID()}`,
        conversationId,
        role: "USER",
        content: content.trim(),
        agentName: null,
        toolsUsed: [],
        createdAt: now,
        updatedAt: now,
      };
      queryClient.setQueryData<Message[]>(queryKey, (old = []) => [...old, optimistic]);
      return { previous, optimisticId: optimistic.id };
    },
    onSuccess: (message, _content, context) => {
      queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
        old.map((m) => (m.id === context?.optimisticId ? message : m))
      );
    },
    onError: (_error, _content, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      // The conversation moved to the top (updatedAt was bumped).
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
}

export function useUpdateMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const queryKey = messageKeys.list(conversationId);

  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateMessage(id, content),
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Message[]>(queryKey);
      queryClient.setQueryData<Message[]>(queryKey, (old) =>
        old?.map((m) => (m.id === id ? { ...m, content: content.trim() } : m))
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const queryKey = messageKeys.list(conversationId);

  return useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Message[]>(queryKey);
      queryClient.setQueryData<Message[]>(queryKey, (old) =>
        old?.filter((m) => m.id !== id)
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
