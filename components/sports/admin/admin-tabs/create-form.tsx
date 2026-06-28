"use client";

import { useMemo, useRef, useState } from "react";
import { Configurator, useConfigurator, RestoreBanner } from "@/components/ui/configurator";
import { FormActionsRow } from "@/components/sports/admin/form-actions-row";
import SessionForm, {
  sessionToFormState,
  type SessionFormState,
} from "@/components/sports/session/session-form";

interface SessionTypeOption {
  value: string;
  label: string;
}

interface CreateFormProps {
  sport: string;
  sessionTabs: SessionTypeOption[];
  defaultTab?: string;
}

export default function CreateForm({ sport, sessionTabs, defaultTab }: CreateFormProps) {
  const defaultSessionType = defaultTab ?? sessionTabs[0]?.value ?? "";
  const serverState = useMemo(
    () => sessionToFormState(undefined, defaultSessionType),
    [defaultSessionType],
  );

  return (
    <Configurator<SessionFormState> draftKey={`session-create:${sport}`} serverState={serverState}>
      <CreateFormInner sport={sport} sessionTabs={sessionTabs} />
    </Configurator>
  );
}

function CreateFormInner({
  sport,
  sessionTabs,
}: {
  sport: string;
  sessionTabs: SessionTypeOption[];
}) {
  const { isDirty, discard } = useConfigurator<SessionFormState>();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-3">
      <RestoreBanner />
      <SessionForm
        sport={sport}
        sessionTabs={sessionTabs}
        formRef={formRef}
        onPendingChange={setPending}
      />
      <FormActionsRow
        isDirty={isDirty}
        isPending={pending}
        onReset={() => discard()}
        onSave={() => formRef.current?.requestSubmit()}
        saveLabel="Create Session"
        pendingLabel="Creating..."
      />
    </div>
  );
}
