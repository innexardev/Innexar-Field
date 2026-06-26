"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@fieldforge/ui";
import {
  formatQuantityInput,
  isValidQuantityDraft,
  parseQuantityInput,
} from "@/lib/money";

interface QuantityInputProps {
  id?: string;
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
  required?: boolean;
}

export function QuantityInput({ id, quantity, onChangeQuantity, required }: QuantityInputProps) {
  const [draft, setDraft] = useState(() => formatQuantityInput(quantity));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatQuantityInput(quantity));
    }
  }, [quantity]);

  function commitDraft(next: string) {
    const parsed = parseQuantityInput(next);
    onChangeQuantity(parsed);
    setDraft(formatQuantityInput(parsed));
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
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
        if (!isValidQuantityDraft(next)) return;
        setDraft(next);
        if (next !== "" && next !== ".") {
          onChangeQuantity(parseQuantityInput(next));
        } else {
          onChangeQuantity(0);
        }
      }}
    />
  );
}
