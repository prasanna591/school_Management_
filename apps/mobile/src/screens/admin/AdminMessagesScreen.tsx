import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, Text, View } from 'react-native';

import { useRealtime } from '../../components/RealtimeProvider';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import {
  conversationTitle,
  displayName,
  isMine,
  participantsSummary,
  truncate,
  unreadBadge,
  type ConversationMessage,
  type ConversationSummary,
} from '../../lib/messages';
import { useAuth } from '../../lib/auth';
import { useAsync } from '../../lib/useAsync';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const THREAD_LIMIT = 50;

/**
 * Messages: pick a conversation, read the thread and reply. Conversation list
 * refreshes on incoming realtime message events.
 */
export function MessagesScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { user } = useAuth();
  const { messageVersion } = useRealtime();

  const listState = useAsync<ConversationSummary[]>(
    () => api.list<ConversationSummary>('/conversations', { limit: 25 }).then((r) => r.items),
    [messageVersion],
  );

  const insets = useSafeAreaInsets();

  if (listState.forbidden) {
    return (
      <View style={{ paddingTop: insets.top }}>
        <EmptyState message="You don't have permission to use messaging." icon="lock" />
      </View>
    );
  }
  if (listState.loading) {
    return (
      <View style={{ paddingTop: insets.top }}>
        <MessagesHeader title="Messages" />
        <SkeletonList rows={4} />
      </View>
    );
  }
  if (listState.error) {
    return (
      <View style={{ paddingTop: insets.top }}>
        <ErrorState message={listState.error} onRetry={listState.reload} />
      </View>
    );
  }

  const conversations = listState.data ?? [];
  const activeId = selectedId ?? conversations[0]?.id ?? null;
  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <MessagesHeader
          title="Messages"
          subtitle={active ? participantsSummary(active, user?.id ?? '') : undefined}
        />

        {conversations.length === 0 ? (
          <EmptyState message="No conversations yet." icon="messages" />
        ) : (
          <>
            <View style={styles.chips}>
              {conversations.map((conversation) => {
                const badge = unreadBadge(conversation.unreadCount);
                const selected = conversation.id === activeId;
                return (
                  <Pressable
                    key={conversation.id}
                    onPress={() => setSelectedId(conversation.id)}
                    style={[styles.chip, selected ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>
                      {conversationTitle(conversation)}
                      {badge ? ` (${badge})` : ''}
                    </Text>
                    {conversation.lastMessage ? (
                      <Text
                        style={[styles.chipSub, selected ? styles.chipTextActive : null]}
                        numberOfLines={1}
                      >
                        {conversation.lastMessage.senderId === user?.id
                          ? 'You: '
                          : `${displayName(conversation.createdBy)}: `}
                        {truncate(conversation.lastMessage.body, 40)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {activeId ? <Thread conversationId={activeId} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Thread({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const { messageVersion } = useRealtime();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const state = useAsync<ConversationMessage[]>(
    () =>
      api
        .list<ConversationMessage>(`/conversations/${conversationId}/messages`, {
          page: 1,
          limit: THREAD_LIMIT,
        })
        .then((r) => r.items),
    [conversationId, messageVersion],
  );

  // Mark the thread as read whenever it is opened (best-effort).
  useEffect(() => {
    void api.patch(`/conversations/${conversationId}/read`).catch(() => undefined);
  }, [conversationId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await api.post(`/conversations/${conversationId}/messages`, { body });
      setDraft('');
      state.reload();
    } catch {
      // Errors surface via a full reload attempt; stay quiet otherwise.
    } finally {
      setSending(false);
    }
  };

  const messages = [...(state.data ?? [])].reverse();

  return (
    <View style={styles.thread}>
      {state.loading ? (
        <SkeletonList rows={3} />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : messages.length === 0 ? (
        <EmptyState message="No messages in this conversation yet." icon="messages" />
      ) : (
        <View style={styles.messageList}>
          {messages.map((message) => {
            const mine = isMine(message, user?.id ?? '');
            return (
              <View key={message.id} style={[styles.message, mine ? styles.messageMine : null]}>
                {!mine ? (
                  <Text style={styles.messageSender}>{displayName(message.sender)}</Text>
                ) : null}
                <Text style={styles.messageBody}>{message.body}</Text>
                <Text style={styles.messageTime}>{formatDateTime(message.createdAt)}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message…"
          placeholderTextColor="#94a3b8"
          multiline
        />
        <Pressable style={styles.sendButton} onPress={() => void send()} disabled={sending}>
          <Text style={styles.sendButtonText}>{sending ? '…' : 'Send'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MessagesHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = {
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    maxWidth: '100%',
  },
  chipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  chipText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  chipSub: {
    color: '#64748b',
    fontSize: 12,
  },
  thread: {
    gap: 10,
  },
  messageList: {
    gap: 6,
  },
  message: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 2,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  messageMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#dbeafe',
    borderColor: '#dbeafe',
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  messageBody: {
    fontSize: 14,
    color: '#0f172a',
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
} as const;
