import { useState } from "react";
import { ChevronsUpDownIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EmailSignup } from "@/types/content";

const MAX_CHIPS = 12;
const SELECT_ALL_VALUE = "__select_all__";

/**
 * Multiselect of subscribers (CAP-7). "Seleziona tutti" selects every current subscriber,
 * or deselects all when they are already all selected. Value = email_signups ids.
 */
export function RecipientsSelect({
  id,
  subscribers,
  value,
  onChange,
  invalid,
  loading,
}: {
  id?: string;
  subscribers: EmailSignup[];
  value: string[];
  onChange: (ids: string[]) => void;
  invalid?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);
  const allSelected = subscribers.length > 0 && subscribers.every((s) => selected.has(s.id));
  const someSelected = !allSelected && subscribers.some((s) => selected.has(s.id));
  const selectedSubscribers = subscribers.filter((s) => selected.has(s.id));

  const toggle = (subscriberId: string) => {
    onChange(
      selected.has(subscriberId) ? value.filter((v) => v !== subscriberId) : [...value, subscriberId],
    );
  };
  const toggleAll = () => onChange(allSelected ? [] : subscribers.map((s) => s.id));

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            disabled={loading}
            className="w-full justify-between font-normal"
          >
            <span className={selectedSubscribers.length ? "" : "text-muted-foreground"}>
              {loading
                ? "Caricamento iscritti…"
                : allSelected
                  ? `Tutti gli iscritti (${subscribers.length})`
                  : selectedSubscribers.length
                    ? `${selectedSubscribers.length} di ${subscribers.length} iscritti selezionati`
                    : "Seleziona i destinatari"}
            </span>
            <ChevronsUpDownIcon className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Cerca email…" />
            <CommandList>
              <CommandEmpty>Nessun iscritto trovato.</CommandEmpty>
              {subscribers.length > 0 ? (
                <>
                  <CommandGroup>
                    <CommandItem value={SELECT_ALL_VALUE} keywords={["seleziona tutti"]} onSelect={toggleAll}>
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none"
                      />
                      <span className="font-medium">
                        {allSelected ? "Deseleziona tutti" : "Seleziona tutti"}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">{subscribers.length}</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              ) : null}
              <CommandGroup>
                {subscribers.map((subscriber) => (
                  <CommandItem
                    key={subscriber.id}
                    value={subscriber.id}
                    keywords={[subscriber.email]}
                    onSelect={() => toggle(subscriber.id)}
                  >
                    <Checkbox
                      checked={selected.has(subscriber.id)}
                      tabIndex={-1}
                      aria-hidden
                      className="pointer-events-none"
                    />
                    <span className="truncate">{subscriber.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedSubscribers.length > 0 && !allSelected ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedSubscribers.slice(0, MAX_CHIPS).map((subscriber) => (
            <Badge key={subscriber.id} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-56 truncate">{subscriber.email}</span>
              <button
                type="button"
                className="rounded-sm opacity-60 hover:opacity-100"
                aria-label={`Rimuovi ${subscriber.email}`}
                onClick={() => toggle(subscriber.id)}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
          {selectedSubscribers.length > MAX_CHIPS ? (
            <Badge variant="outline">+{selectedSubscribers.length - MAX_CHIPS} altri</Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
