import { useEffect, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createMatchLog, listMatchPartners, updateMatchLog } from '@/api/logs';
import type { CreateMatchLogParams, MatchLog, MatchLogPrefill, PartnerSuggestion } from '@/types/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type FormState = {
  playedOn: string;
  partnerName: string | null;
  opponents: string[];
  result: string | null;
  feeling: string | null;
  note: string;
};

const TOTAL_STEPS = 6;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: MatchLog) => void;
  prefill?: MatchLogPrefill;
  editMatch?: MatchLog | null;
  // Assistant chat message that prompted this log entry. Sent to the backend
  // so it can link match_logs → messages and the chat UI can flip the
  // "Log this match" tag to "Logged" persistently.
  messageId?: string;
};

const FEELINGS = [
  { key: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { key: 'meh', label: 'Meh', emoji: '😐' },
  { key: 'good', label: 'Good', emoji: '😊' },
  { key: 'on fire', label: 'On fire', emoji: '🔥' },
  { key: 'tired', label: 'Tired', emoji: '😓' },
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function progressDots(step: Step) {
  return Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => {
    const done = n < step;
    const active = n === step;
    return (
      <View
        key={n}
        style={{
          width: active ? 20 : 8,
          height: 8,
          borderRadius: 4,
          marginHorizontal: 2,
          backgroundColor: done
            ? '#E36414'
            : active
            ? '#0F4C5C'
            : '#D1D5DB',
        }}
      />
    );
  });
}

export function MatchLogForm({ visible, onClose, onSaved, prefill, editMatch, messageId }: Props) {
  const isEditing = editMatch != null;
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    playedOn: todayString(),
    partnerName: null,
    opponents: [],
    result: null,
    feeling: null,
    note: '',
  });
  const [customDate, setCustomDate] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [selectingNew, setSelectingNew] = useState(false);
  const [partners, setPartners] = useState<PartnerSuggestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (editMatch) {
      // Load the existing match into the form. Date stays as YYYY-MM-DD.
      const playedOn = editMatch.played_on.slice(0, 10);
      setForm({
        playedOn,
        partnerName: editMatch.partner_name,
        opponents: editMatch.opponents.slice(0, 2),
        result: editMatch.result,
        feeling: editMatch.feeling,
        note: editMatch.note ?? '',
      });
      const isToday = playedOn === todayString();
      const isYesterday = playedOn === yesterdayString();
      setUseCustomDate(!isToday && !isYesterday);
      setCustomDate(!isToday && !isYesterday ? playedOn : '');
      setNewPartnerName('');
      setSelectingNew(false);
      setStep(1);
    } else {
      // Pre-fill from Marco's match_log token if available; default to manual entry otherwise.
      // played_on must be YYYY-MM-DD before we can skip Step 1 — otherwise the
      // backend rejects on save without the user ever seeing Step 1 to correct it.
      const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;
      const validPlayedOn = prefill?.played_on && isoDateRe.test(prefill.played_on)
        ? prefill.played_on
        : null;
      // Empty / whitespace-only partner names from Marco are treated as absent
      // so the form falls back to manual selection instead of bouncing the user
      // straight into "Someone new" with a blank input.
      const trimmedPartner = prefill?.partner_name?.trim();
      const validPartner = trimmedPartner ? trimmedPartner : null;
      setForm({
        playedOn: validPlayedOn ?? todayString(),
        partnerName: validPartner,
        opponents: (prefill?.opponents ?? []).slice(0, 2),
        result: prefill?.result ?? null,
        feeling: prefill?.feeling ?? null,
        note: prefill?.note ?? '',
      });
      setCustomDate('');
      setUseCustomDate(false);
      setNewPartnerName('');
      setSelectingNew(false);
      setSaveError(null);
      setStep(validPlayedOn ? 2 : 1);
    }

    let cancelled = false;
    listMatchPartners()
      .then((loaded) => {
        if (cancelled) return;
        setPartners(loaded);
        // Treat the prefill partner as "new" only if it's non-empty AND doesn't
        // case-insensitively match an existing partner. Empty/whitespace names
        // (Marco emits these when the partner is unclear) shouldn't flip the
        // form into "Someone new" with a blank input.
        const rawName = editMatch?.partner_name ?? prefill?.partner_name;
        const name = rawName?.trim();
        if (name && !loaded.some((p) => p.partner_name.toLowerCase() === name.toLowerCase())) {
          setSelectingNew(true);
          setNewPartnerName(name);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, prefill, editMatch]);

  const goBack = () => setStep((s) => Math.max(1, s - 1) as Step);

  const goNext = () => {
    if (step === 1) {
      const date = useCustomDate ? customDate.trim() : form.playedOn;
      if (useCustomDate && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      setForm((f) => ({ ...f, playedOn: date }));
    }
    if (step === 2) {
      const name = selectingNew ? newPartnerName.trim() || null : form.partnerName;
      setForm((f) => ({ ...f, partnerName: name }));
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1) as Step);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const cleanedOpponents = form.opponents
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      const trimmedPartner = form.partnerName?.trim();
      const params: CreateMatchLogParams = {
        played_on: form.playedOn,
        result: form.result ?? undefined,
        feeling: form.feeling ?? undefined,
        note: form.note.trim() || undefined,
        // Empty string and whitespace are dropped so the backend stores NULL
        // rather than an empty partner_name (which then confuses Step 2 on edit).
        partner_name: trimmedPartner ? trimmedPartner : undefined,
        opponents: cleanedOpponents,
        // Only sent on create — editing an existing match keeps its original
        // (or absent) message_id link untouched.
        message_id: editMatch ? undefined : messageId,
      };
      const log = editMatch
        ? await updateMatchLog(editMatch.id, params)
        : await createMatchLog(params);
      onSaved(log);
      onClose();
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : "Couldn't save — please try again.";
      setSaveError(message);
      console.warn('match log save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const canContinue = (): boolean => {
    if (step === 1) {
      if (useCustomDate) return /^\d{4}-\d{2}-\d{2}$/.test(customDate.trim());
      return true;
    }
    return true;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: SHEET_HEIGHT,
            backgroundColor: '#FAFAF8',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 20,
          }}
        >
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.bottom + 16}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 1 }}>
              {isEditing ? 'EDIT MATCH' : 'LOG MATCH'} · {step} OF {TOTAL_STEPS}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {progressDots(step)}
            </View>
          </View>

          {/* Step content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 && <StepWhen form={form} setForm={setForm} customDate={customDate} setCustomDate={setCustomDate} useCustomDate={useCustomDate} setUseCustomDate={setUseCustomDate} />}
            {step === 2 && <StepWho form={form} setForm={setForm} partners={partners} selectingNew={selectingNew} setSelectingNew={setSelectingNew} newPartnerName={newPartnerName} setNewPartnerName={setNewPartnerName} />}
            {step === 3 && <StepOpponents form={form} setForm={setForm} />}
            {step === 4 && <StepResult form={form} setForm={setForm} />}
            {step === 5 && <StepFeeling form={form} setForm={setForm} />}
            {step === 6 && <StepNotes form={form} setForm={setForm} />}
          </ScrollView>

          {saveError && (
            <View
              style={{
                marginHorizontal: 24,
                marginBottom: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: '#FEE2E2',
                borderWidth: 1,
                borderColor: '#FCA5A5',
              }}
            >
              <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '600' }}>{saveError}</Text>
            </View>
          )}

          {/* Footer buttons */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              backgroundColor: '#FAFAF8',
            }}
          >
            {step === 1 ? (
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#D1D5DB',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={goBack}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#D1D5DB',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Back</Text>
              </Pressable>
            )}

            {step < TOTAL_STEPS ? (
              <Pressable
                onPress={goNext}
                disabled={!canContinue()}
                style={{
                  flex: 2,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: canContinue() ? '#0F4C5C' : '#D1D5DB',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Continue</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={{
                  flex: 2,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: saving ? '#D1D5DB' : '#0F4C5C',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save'}
                </Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Step 1: When ────────────────────────────────────────────────────────────

type StepWhenProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  customDate: string;
  setCustomDate: (v: string) => void;
  useCustomDate: boolean;
  setUseCustomDate: (v: boolean) => void;
};

function StepWhen({ form, setForm, customDate, setCustomDate, useCustomDate, setUseCustomDate }: StepWhenProps) {
  const today = todayString();
  const yesterday = yesterdayString();
  const options = [
    { label: 'Today', value: today },
    { label: 'Yesterday', value: yesterday },
  ];

  return (
    <View>
      <StepHeader title="When did you play?" subtitle="Pick a day — let's put it on the record." />
      {options.map((o) => {
        const selected = !useCustomDate && form.playedOn === o.value;
        return (
          <SelectRow
            key={o.value}
            label={o.label}
            sublabel={o.value}
            selected={selected}
            onPress={() => { setForm((f) => ({ ...f, playedOn: o.value })); setUseCustomDate(false); }}
          />
        );
      })}
      <Pressable
        onPress={() => setUseCustomDate(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: useCustomDate ? '#0F4C5C' : '#E5E7EB',
          backgroundColor: useCustomDate ? '#EDF4F6' : '#fff',
          marginBottom: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', color: '#0B1416' }}>Custom date</Text>
          {useCustomDate && (
            <TextInput
              value={customDate}
              onChangeText={setCustomDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
              style={{ marginTop: 6, color: '#0B1416', fontSize: 14 }}
              autoFocus
            />
          )}
        </View>
        {useCustomDate && (
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#0F4C5C', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ─── Step 2: Who ─────────────────────────────────────────────────────────────

type StepWhoProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  partners: PartnerSuggestion[];
  selectingNew: boolean;
  setSelectingNew: (v: boolean) => void;
  newPartnerName: string;
  setNewPartnerName: (v: string) => void;
};

function StepWho({ form, setForm, partners, selectingNew, setSelectingNew, newPartnerName, setNewPartnerName }: StepWhoProps) {
  return (
    <View>
      <StepHeader title="Who'd you play with?" subtitle='"Same partner? Or someone new!"' italic />
      {partners.map((p) => {
        const selected = !selectingNew && form.partnerName === p.partner_name;
        return (
          <SelectRow
            key={p.partner_name}
            label={p.partner_name}
            sublabel={`${p.match_count} ${p.match_count === 1 ? 'match' : 'matches'}`}
            selected={selected}
            onPress={() => { setForm((f) => ({ ...f, partnerName: p.partner_name })); setSelectingNew(false); }}
          />
        );
      })}
      <Pressable
        onPress={() => { setSelectingNew(true); setForm((f) => ({ ...f, partnerName: null })); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: selectingNew ? '#0F4C5C' : '#E5E7EB',
          backgroundColor: selectingNew ? '#EDF4F6' : '#fff',
          marginBottom: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', color: '#0B1416' }}>Someone new</Text>
          {selectingNew && (
            <TextInput
              value={newPartnerName}
              onChangeText={setNewPartnerName}
              placeholder="Type their name"
              placeholderTextColor="#9CA3AF"
              style={{ marginTop: 6, color: '#0B1416', fontSize: 14 }}
              autoFocus
            />
          )}
          {!selectingNew && (
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Type their name</Text>
          )}
        </View>
        {selectingNew && (
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#0F4C5C', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ─── Step 3: Opponents ───────────────────────────────────────────────────────

type StepOpponentsProps = { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> };

function StepOpponents({ form, setForm }: StepOpponentsProps) {
  const slots = [0, 1];
  const setOpponent = (idx: number, value: string) => {
    setForm((f) => {
      const next = [...f.opponents];
      next[idx] = value;
      return { ...f, opponents: next };
    });
  };

  return (
    <View>
      <StepHeader title="Who'd you play against?" subtitle="Add up to two opponents — leave blank to skip." />
      {slots.map((idx) => (
        <View
          key={idx}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: form.opponents[idx]?.trim() ? '#0F4C5C' : '#E5E7EB',
            backgroundColor: form.opponents[idx]?.trim() ? '#EDF4F6' : '#fff',
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 0.8 }}>
            OPPONENT {idx + 1}
          </Text>
          <TextInput
            value={form.opponents[idx] ?? ''}
            onChangeText={(v) => setOpponent(idx, v)}
            placeholder="Type their name"
            placeholderTextColor="#9CA3AF"
            style={{ marginTop: 4, color: '#0B1416', fontSize: 15 }}
            autoCapitalize="words"
          />
        </View>
      ))}
    </View>
  );
}

// ─── Step 4: Result ───────────────────────────────────────────────────────────

type StepResultProps = { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> };

function StepResult({ form, setForm }: StepResultProps) {
  const options = [
    { key: 'won', label: 'Won', emoji: '🏆' },
    { key: 'lost', label: 'Lost', emoji: '😔' },
    { key: 'draw', label: 'Draw', emoji: '🤝' },
  ];
  return (
    <View>
      <StepHeader title="How did it go?" subtitle="Win, lose, or draw — it all counts." />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        {options.map((o) => {
          const selected = form.result === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => setForm((f) => ({ ...f, result: o.key }))}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 24,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: selected ? '#0F4C5C' : '#E5E7EB',
                backgroundColor: selected ? '#0F4C5C' : '#fff',
              }}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{o.emoji}</Text>
              <Text style={{ fontWeight: '700', fontSize: 15, color: selected ? '#fff' : '#0B1416' }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 4: Feeling ──────────────────────────────────────────────────────────

type StepFeelingProps = { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> };

function StepFeeling({ form, setForm }: StepFeelingProps) {
  return (
    <View>
      <StepHeader title="How did it feel?" subtitle="Beyond the score — what was your vibe?" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
        {FEELINGS.map((f, i) => {
          const selected = form.feeling === f.key;
          const isLastRow = i >= 3;
          return (
            <Pressable
              key={f.key}
              onPress={() => setForm((prev) => ({ ...prev, feeling: f.key }))}
              style={{
                width: isLastRow ? '47%' : '30%',
                alignItems: 'center',
                paddingVertical: 16,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: selected ? '#0F4C5C' : '#E5E7EB',
                backgroundColor: selected ? '#EDF4F6' : '#fff',
              }}
            >
              <Text style={{ fontSize: 26, marginBottom: 6 }}>{f.emoji}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? '#0F4C5C' : '#374151' }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 5: Notes ────────────────────────────────────────────────────────────

type StepNotesProps = { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> };

function StepNotes({ form, setForm }: StepNotesProps) {
  return (
    <View>
      <StepHeader title="Any notes?" subtitle="Optional — what would you tell yourself before the next one?" />
      <TextInput
        value={form.note}
        onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
        placeholder="What would you tell yourself before the next one?"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        style={{
          backgroundColor: '#fff',
          borderWidth: 1.5,
          borderColor: '#E5E7EB',
          borderRadius: 14,
          padding: 16,
          fontSize: 15,
          color: '#0B1416',
          minHeight: 140,
          marginTop: 8,
        }}
      />
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StepHeader({ title, subtitle, italic }: { title: string; subtitle: string; italic?: boolean }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#0B1416', marginBottom: 6 }}>{title}</Text>
      <Text style={{ fontSize: 14, color: '#E36414', fontStyle: italic ? 'italic' : 'normal' }}>{subtitle}</Text>
    </View>
  );
}

function SelectRow({
  label,
  sublabel,
  selected,
  onPress,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: selected ? '#0F4C5C' : '#E5E7EB',
        backgroundColor: selected ? '#EDF4F6' : '#fff',
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: selected ? '#0F4C5C' : '#E5E7EB',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: selected ? '#fff' : '#6B7280', fontWeight: '700', fontSize: 13 }}>
            {label.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={{ fontWeight: '600', color: '#0B1416' }}>{label}</Text>
          {sublabel && <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{sublabel}</Text>}
        </View>
      </View>
      {selected && (
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#0F4C5C', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}
