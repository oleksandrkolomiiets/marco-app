import { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import type { ChatMessageRole } from '@/types/api';

const ORANGE = '#e36414';
const DARK = '#1a2a30';
const SECONDARY = '#4a5560';
const BAR_DIVIDER = '#c7bfb2';
const USER_BUBBLE = '#0F4C5C';

type Props = {
  content: string;
  messageId: string;
  role: ChatMessageRole;
  feedbackScore?: 1 | -1;
  onClose: () => void;
  onFeedback: (score: 1 | -1) => void;
  onRetry: () => void;
  onHide: () => void;
};

export function MessageActionSheet({
  content,
  role,
  feedbackScore,
  onClose,
  onFeedback,
  onRetry,
  onHide,
}: Props) {
  const isUser = role === 'user';
  const handleFeedback = (score: 1 | -1) => { onFeedback(score); onClose(); };
  const handleRetry = () => { onRetry(); onClose(); };
  const handleHide = () => { onHide(); onClose(); };
  const handleCopy = async () => { await Share.share({ message: content }); onClose(); };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      {/* Blurred scrim */}
      <BlurView
        intensity={40}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 28, 0.45)' }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />

      {/* Content — sits above the scrim */}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16, pointerEvents: 'box-none' }}>
        <Pressable onPress={() => {}} style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>

          {/* ── Action bar pill (assistant only) ── */}
          {!isUser && (
            <View style={styles.pillShadow}>
              <View style={styles.pill}>
                <ActionBtn
                  emoji="👍"
                  label="Helpful"
                  active={feedbackScore === 1}
                  onPress={() => handleFeedback(1)}
                />
                <View style={styles.pillDivider} />
                <ActionBtn
                  emoji="👎"
                  label="Off"
                  active={feedbackScore === -1}
                  onPress={() => handleFeedback(-1)}
                />
                <View style={styles.pillDivider} />
                <ActionBtn
                  emoji="↺"
                  label="Retry"
                  active={false}
                  onPress={handleRetry}
                />
              </View>
            </View>
          )}

          {/* ── Message bubble preview ── */}
          <View style={[styles.bubble, isUser && styles.bubbleUser]}>
            <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{content}</Text>
          </View>

          {/* ── Context menu ── */}
          <View style={styles.menu}>
            <MenuItem icon="❐" label="Copy text" onPress={handleCopy} />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="✕"
              label={isUser ? 'Remove message' : 'Hide message'}
              tone="danger"
              onPress={handleHide}
            />
          </View>

        </Pressable>
      </View>
    </Modal>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────

type ActionBtnProps = {
  emoji: string;
  label: string;
  active: boolean;
  onPress: () => void;
};

function ActionBtn({ emoji, label, active, onPress }: ActionBtnProps) {
  const [pressed, setPressed] = useState(false);
  const highlighted = active || pressed;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.actionBtn, highlighted && styles.actionBtnActive]}
    >
      <View style={styles.actionEmojiBox}>
        <Text style={[styles.actionEmoji, highlighted && styles.actionTextActive]}>
          {emoji}
        </Text>
      </View>
      <Text
        style={[
          styles.actionLabel,
          highlighted && styles.actionTextActive,
          !highlighted && { opacity: 0.7 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Menu item ────────────────────────────────────────────────────────────────

type MenuItemProps = {
  icon: string;
  label: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

function MenuItem({ icon, label, tone = 'default', onPress }: MenuItemProps) {
  const [pressed, setPressed] = useState(false);
  const isDanger = tone === 'danger';
  const textColor = pressed ? '#ffffff' : isDanger ? ORANGE : DARK;
  const iconColor = pressed ? '#ffffff' : isDanger ? ORANGE : SECONDARY;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{ backgroundColor: pressed ? ORANGE : 'transparent' }}
    >
      <View style={styles.menuRow}>
        <Text style={[styles.menuIcon, { color: iconColor }]}>{icon}</Text>
        <Text style={[styles.menuText, { color: textColor }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Pill
  pillShadow: {
    borderRadius: 999,
    marginBottom: 8,
    shadowColor: DARK,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
    gap: 4,
  },
  pillDivider: {
    width: 1,
    height: 22,
    backgroundColor: BAR_DIVIDER,
  },

  // Action button
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    gap: 4,
  },
  actionBtnActive: {
    backgroundColor: ORANGE,
  },
  actionEmojiBox: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: {
    fontSize: 18,
    lineHeight: 22,
    color: DARK,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  actionLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.36,
    textTransform: 'uppercase',
    color: DARK,
  },
  actionTextActive: {
    color: '#ffffff',
  },

  // Bubble
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '82%',
    backgroundColor: '#fefbf5',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: DARK,
    shadowOffset: { width: 4, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: USER_BUBBLE,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 18.9,
    color: DARK,
  },
  bubbleTextUser: {
    color: '#ffffff',
  },

  // Context menu
  menu: {
    alignSelf: 'flex-start',
    minWidth: 220,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: DARK,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  menuRowPressed: {
    opacity: 0.6,
  },
  menuRowHighlight: {
    backgroundColor: 'rgba(228, 100, 20, 0.10)',
  },
  menuIcon: {
    fontSize: 14,
    width: 18,
    textAlign: 'center',
    color: SECONDARY,
  },
  menuText: {
    fontSize: 13,
    color: DARK,
  },
  menuDivider: {
    height: 1,
    backgroundColor: ORANGE,
    opacity: 0.45,
  },
});
