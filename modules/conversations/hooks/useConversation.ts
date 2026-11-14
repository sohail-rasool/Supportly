"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createConversation,
  deleteConversation,
  getConversations,
  updateConversation,
} from "../actions";

export const conversationKeys = {
  all: ["conversations"] as const,
};

type Conversation = Awaited<ReturnType<typeof getConversations>>[number];

export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.all,
    queryFn: () => getConversations(),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => createConversation(title),
    onSuccess: (conversation) => {
      // Newest first, matching getConversations' orderBy.
      queryClient.setQueryData<Conversation[]>(conversationKeys.all, (old = []) => [
        conversation,
        ...old,
      ]);
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateConversation(id, title),
    // Rename instantly; roll back if the server rejects it.
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.all });
      const previous = queryClient.getQueryData<Conversation[]>(conversationKeys.all);
      queryClient.setQueryData<Conversation[]>(conversationKeys.all, (old) =>
        old?.map((c) => (c.id === id ? { ...c, title } : c))
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(conversationKeys.all, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    // Remove instantly; roll back if the server rejects it.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.all });
      const previous = queryClient.getQueryData<Conversation[]>(conversationKeys.all);
      queryClient.setQueryData<Conversation[]>(conversationKeys.all, (old) =>
        old?.filter((c) => c.id !== id)
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(conversationKeys.all, context?.previous);
    },
    onSuccess: (_result, id) => {
      // Its messages are gone too (cascade delete).
      queryClient.removeQueries({ queryKey: ["messages", id] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
  });
}
