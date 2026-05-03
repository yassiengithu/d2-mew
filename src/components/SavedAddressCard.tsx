import { useEffect, useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Star, Check, User as UserIcon, Phone as PhoneIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  loadSavedAddresses,
  deleteAddress,
  setDefaultAddress,
  CONTACT_UPDATED_EVENT,
  type SavedAddress,
} from "@/lib/contactStorage";
import AddressEditorDialog from "./AddressEditorDialog";

const SavedAddressCard = () => {
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => loadSavedAddresses());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setAddresses(loadSavedAddresses());
    window.addEventListener(CONTACT_UPDATED_EVENT, handler);
    return () => window.removeEventListener(CONTACT_UPDATED_EVENT, handler);
  }, []);

  const openAdd = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (addr: SavedAddress) => {
    setEditing(addr);
    setEditorOpen(true);
  };

  const handleSetDefault = (id: string) => {
    setDefaultAddress(id);
    toast.success("Default address updated");
  };

  const handleDelete = () => {
    if (!confirmDeleteId) return;
    deleteAddress(confirmDeleteId);
    setConfirmDeleteId(null);
    toast.success("Address removed");
  };

  return (
    <>
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <h2 className="text-sm font-bold text-foreground truncate">My Addresses</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1 text-primary"
            onClick={openAdd}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Add</span>
          </Button>
        </div>

        {addresses.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No saved addresses yet. Add one to speed up checkout.
          </p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`rounded-lg border p-3 space-y-2 ${
                  addr.isDefault ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {addr.label && (
                      <span className="text-xs font-bold text-foreground truncate">{addr.label}</span>
                    )}
                    {addr.isDefault && (
                      <Badge className="h-5 px-1.5 gap-1 text-[10px] bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(addr)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                      aria-label="Edit address"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(addr.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Delete address"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">{addr.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PhoneIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground">{addr.phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground leading-relaxed">{addr.address}</span>
                  </div>
                </div>

                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Check className="h-3 w-3" />
                    Set as default
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddressEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
      />

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove it from your saved addresses. You can always add it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SavedAddressCard;
