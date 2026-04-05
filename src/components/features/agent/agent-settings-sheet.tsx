import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useShallow } from 'zustand/react/shallow';
import useAgentStore, { selectAgentList } from '@/hooks/use-agent-store';
import { AVATAR_OPTIONS } from '@/lib/agent-avatars';
import type { IAgentInfo } from '@/types/agent';

interface IAgentSettingsSheetProps {
  agent: IAgentInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteClick: () => void;
}

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

interface ISettingsFormProps {
  agent: IAgentInfo;
  onClose: () => void;
  onDeleteClick: () => void;
}

const SettingsForm = ({ agent, onClose, onDeleteClick }: ISettingsFormProps) => {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [avatar, setAvatar] = useState(agent.avatar ?? '');
  const [soul, setSoul] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSoul, setIsLoadingSoul] = useState(true);

  const agents = useAgentStore(useShallow(selectAgentList));
  const updateAgent = useAgentStore((s) => s.updateAgent);

  useEffect(() => {
    const fetchSoul = async () => {
      try {
        const res = await fetch(`/api/agent/${agent.id}`);
        if (res.ok) {
          const data = await res.json();
          setSoul(data.soul ?? '');
        }
      } catch { /* ignore */ }
      setIsLoadingSoul(false);
    };
    fetchSoul();
  }, [agent.id]);

  const validateName = useCallback(
    (value: string) => {
      if (!value) {
        setNameError('이름을 입력해주세요');
        return false;
      }
      if (value.length > 30) {
        setNameError('30자 이내로 입력해주세요');
        return false;
      }
      if (!NAME_PATTERN.test(value)) {
        setNameError('영문 소문자, 숫자, 하이픈만 사용 가능합니다');
        return false;
      }
      if (agents.some((a) => a.name === value && a.id !== agent.id)) {
        setNameError('이미 사용 중인 이름입니다');
        return false;
      }
      setNameError('');
      return true;
    },
    [agents, agent.id],
  );

  const handleSave = async () => {
    if (!validateName(name)) return;
    setIsSaving(true);

    const success = await updateAgent(agent.id, {
      name,
      role,
      soul,
      avatar,
    });

    setIsSaving(false);
    if (success) onClose();
  };

  const canSave = name.length > 0 && !nameError && !isSaving;

  return (
    <>
      <SheetHeader>
        <SheetTitle>에이전트 설정</SheetTitle>
        <SheetDescription>{agent.name} 설정을 수정합니다</SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto px-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">아바타</Label>
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-full ring-2 ring-offset-2 ring-offset-background transition-all ${!avatar ? 'ring-primary' : 'ring-transparent hover:ring-muted-foreground/30'}`}
              onClick={() => setAvatar('')}
            >
              <Avatar size="default">
                <AvatarFallback>{name ? name[0]?.toUpperCase() : '?'}</AvatarFallback>
              </Avatar>
            </button>
            {AVATAR_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`rounded-full ring-2 ring-offset-2 ring-offset-background transition-all ${avatar === opt ? 'ring-primary' : 'ring-transparent hover:ring-muted-foreground/30'}`}
                onClick={() => setAvatar(opt)}
              >
                <Avatar size="default">
                  <AvatarImage src={opt} alt={opt} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">이름</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) validateName(e.target.value);
            }}
            onBlur={() => { if (name) validateName(name); }}
            aria-invalid={!!nameError}
          />
          {nameError && (
            <p className="text-xs text-destructive">{nameError}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">역할</Label>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="역할을 입력하세요"
            maxLength={100}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Soul</Label>
          <p className="text-xs text-muted-foreground">에이전트의 성격, 행동 방식, 커뮤니케이션 스타일을 정의합니다</p>
          {isLoadingSoul ? (
            <div className="flex h-32 items-center justify-center rounded-md border">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <textarea
              value={soul}
              onChange={(e) => setSoul(e.target.value)}
              className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="## Core Truths\n- ...\n\n## Vibe\n- ..."
            />
          )}
        </div>

      </div>

      <div className="flex flex-col gap-3 border-t p-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                저장 중
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={onDeleteClick}
          disabled={isSaving}
        >
          에이전트 삭제
        </Button>
      </div>
    </>
  );
};

const AgentSettingsSheet = ({ agent, open, onOpenChange, onDeleteClick }: IAgentSettingsSheetProps) => {
  const handleClose = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        {agent && (
          <SettingsForm
            key={agent.id}
            agent={agent}
            onClose={handleClose}
            onDeleteClick={onDeleteClick}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AgentSettingsSheet;
