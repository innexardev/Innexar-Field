"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@fieldforge/ui";
import {
  formatCentsAsDollarInput,
  isValidDollarDraft,
  parseDollarInputToCents,
} from "@/lib/money";

interface MoneyInputProps {
  id?: string;
  cents: number;
  onChangeCents: (cents: number) => void;
  placeholder?: string;
  required?: boolean;
}

export function MoneyInput({ id, cents, onChangeCents, placeholder, required }: MoneyInputProps) {
  const [draft, setDraft] = useState(() => formatCentsAsDollarInput(cents));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatCentsAsDollarInput(cents));
    }
  }, [cents]);

  function commitDraft(next: string) {
    const parsed = parseDollarInputToCents(next);
    onChangeCents(parsed);
    setDraft(formatCentsAsDollarInput(parsed));
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      required={required}
      value={draft}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        commitDraft(draft);
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (!isValidDollarDraft(next)) return;
        setDraft(next);
        if (next !== "" && next !== ".") {
          onChangeCents(parseDollarInputToCents(next));
        } else {
          onChangeCents(0);
        }
      }}
    />
  );
}
