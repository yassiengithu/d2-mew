import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { upsertAddress, type SavedAddress } from "@/lib/contactStorage";
import { validateContact, type ContactFieldErrors } from "@/lib/contactValidation";

type Errors = ContactFieldErrors;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<SavedAddress> | null;
  showDefaultToggle?: boolean;
  onSaved?: (addr: SavedAddress) => void;
  title?: string;
}

const AddressEditorDialog = ({
  open,
  onOpenChange,
  initial,
  showDefaultToggle = true,
  onSaved,
  title,
}: Props) => {
  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (open) {
      setLabel(initial?.label ?? "");
      setName(initial?.name ?? "");
      setPhone(initial?.phone ?? "");
      setAddress(initial?.address ?? "");
      setIsDefault(Boolean(initial?.isDefault));
      setErrors({});
    }
  }, [open, initial]);

  const handleSave = () => {
    const result = validateContact({ name, phone, address, label });
    if (result.ok) {
      setErrors({});
      const saved = upsertAddress({
        id: initial?.id,
        label: result.data.label,
        name: result.data.name,
        phone: result.data.phone,
        address: result.data.address,
        isDefault,
      });
      toast.success(initial?.id ? "Address updated" : "Address saved");
      onSaved?.(saved);
      onOpenChange(false);
    } else {
      setErrors((result as { ok: false; errors: Errors }).errors);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[92vh] overflow-y-auto p-5 gap-4">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-base">{title ?? (initial?.id ? "Edit Address" : "Add Address")}</DialogTitle>
          <DialogDescription className="text-xs">
            Saved addresses autofill at checkout.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="addr-label" className="text-xs font-medium">Label (optional)</Label>
            <Input
              id="addr-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (errors.label) setErrors((p) => ({ ...p, label: undefined }));
              }}
              maxLength={30}
              placeholder="Home, Office..."
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className={`h-12 text-base ${errors.label ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {errors.label && <p className="text-[11px] text-destructive">{errors.label}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-name" className="text-xs font-medium">Full Name</Label>
            <Input
              id="addr-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              maxLength={100}
              placeholder="Juan Dela Cruz"
              autoComplete="name"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              aria-invalid={!!errors.name}
              className={`h-12 text-base ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-phone" className="text-xs font-medium">Phone Number</Label>
            <Input
              id="addr-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
              }}
              maxLength={15}
              placeholder="09171234567"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
              aria-invalid={!!errors.phone}
              className={`h-12 text-base ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="addr-address" className="text-xs font-medium">Delivery Address</Label>
              <span className="text-[10px] text-muted-foreground tabular-nums">{address.length}/500</span>
            </div>
            <Textarea
              id="addr-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) setErrors((p) => ({ ...p, address: undefined }));
              }}
              maxLength={500}
              placeholder="House #, Street, Barangay, City"
              rows={3}
              autoComplete="street-address"
              autoCapitalize="words"
              enterKeyHint="done"
              aria-invalid={!!errors.address}
              className={`text-base resize-none ${errors.address ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {errors.address && <p className="text-[11px] text-destructive">{errors.address}</p>}
          </div>
          {showDefaultToggle && (
            <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer py-1 select-none">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(v === true)}
                id="addr-default"
                className="h-5 w-5"
              />
              Set as default address
            </label>
          )}
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11 rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 h-11 rounded-xl font-semibold">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddressEditorDialog;
