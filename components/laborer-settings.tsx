"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { toast } from "react-hot-toast";

type Laborer = {
  id: number;
  created_at: string;
  name: string;
  mobile_no: string;
  default: boolean;
};

type LaborerSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  onLaborersUpdated?: (laborers: Laborer[]) => void;
};

export default function LaborerSettings({
  isOpen,
  onClose,
  onLaborersUpdated,
}: LaborerSettingsProps) {
  const supabase = createClient();

  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states for new laborer
  const [newName, setNewName] = useState("");
  const [newMobileNo, setNewMobileNo] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [laborerToDelete, setLaborerToDelete] = useState<Laborer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLaborers();
    }
  }, [isOpen]);

  const fetchLaborers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("laborer")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setLaborers(data || []);
    } catch (error) {
      console.error("Error fetching laborers:", error);
      toast.error("Failed to load laborers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLaborer = async () => {
    if (!newName.trim() || !newMobileNo.trim()) {
      setCreateError("Name and mobile number are required");
      return;
    }

    try {
      setIsCreating(true);
      setCreateError("");

      const { data, error } = await supabase
        .from("laborer")
        .insert({
          name: newName.trim(),
          mobile_no: newMobileNo.trim(),
          default: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newLaborerData = data as Laborer;
      const updatedLaborers = [...laborers, newLaborerData];
      setLaborers(updatedLaborers);
      setNewName("");
      setNewMobileNo("");
      setIsAddingNew(false);
      toast.success("Laborer created successfully");

      if (onLaborersUpdated) {
        onLaborersUpdated(updatedLaborers);
      }
    } catch (error) {
      console.error("Error creating laborer:", error);
      setCreateError("Failed to create laborer. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetDefault = async (laborerId: number) => {
    try {
      // Remove default from all laborers
      const { error: updateError } = await supabase
        .from("laborer")
        .update({ default: false })
        .neq("id", laborerId);

      if (updateError) throw updateError;

      // Set new default
      const { error: setDefaultError } = await supabase
        .from("laborer")
        .update({ default: true })
        .eq("id", laborerId);

      if (setDefaultError) throw setDefaultError;

      // Update local state
      const updatedLaborers = laborers.map((l) => ({
        ...l,
        default: l.id === laborerId,
      }));
      setLaborers(updatedLaborers);
      toast.success("Default laborer updated");

      if (onLaborersUpdated) {
        onLaborersUpdated(updatedLaborers);
      }
    } catch (error) {
      console.error("Error setting default laborer:", error);
      toast.error("Failed to set default laborer");
    }
  };

  const handleDeleteLaborer = async (laborer: Laborer) => {
    setLaborerToDelete(laborer);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!laborerToDelete) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("laborer")
        .delete()
        .eq("id", laborerToDelete.id);

      if (error) throw error;

      const updatedLaborers = laborers.filter(
        (l) => l.id !== laborerToDelete.id
      );
      setLaborers(updatedLaborers);
      setShowDeleteConfirm(false);
      setLaborerToDelete(null);
      toast.success("Laborer deleted successfully");

      if (onLaborersUpdated) {
        onLaborersUpdated(updatedLaborers);
      }
    } catch (error) {
      console.error("Error deleting laborer:", error);
      toast.error("Failed to delete laborer");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-card dark:bg-[#111827] border border-gray-200 dark:border-[#0047FF]/30 rounded-lg p-6 shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <h2 className="text-lg font-semibold text-foreground dark:text-white mb-4">
            Manage Laborers
          </h2>

            {!isAddingNew ? (
              <Button onClick={() => setIsAddingNew(true)} className="mb-3">
                + Add New Laborer
              </Button>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground dark:text-white">
                  Create New Laborer
                </h3>

                <div>
                  <Label htmlFor="laborer-name" className="text-xs">
                    Name *
                  </Label>
                  <Input
                    id="laborer-name"
                    placeholder="Enter name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={isCreating}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="laborer-mobile" className="text-xs">
                    Mobile Number *
                  </Label>
                  <Input
                    id="laborer-mobile"
                    placeholder="Enter mobile number"
                    value={newMobileNo}
                    onChange={(e) => setNewMobileNo(e.target.value)}
                    disabled={isCreating}
                    className="mt-1"
                  />
                </div>

                {createError && (
                  <p className="text-xs text-red-500">{createError}</p>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewName("");
                      setNewMobileNo("");
                      setCreateError("");
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLaborer} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            )}

          {/* Laborers List */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-3">
              Laborers ({laborers.length})
            </h3>

            {loading ? (
              <p className="text-xs text-muted-foreground py-4">
                Loading laborers...
              </p>
            ) : laborers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">
                No laborers created yet.
              </p>
            ) : (
              <div className="space-y-2">
                {laborers.map((laborer) => (
                  <div
                    key={laborer.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1a2332] rounded-lg border border-gray-200 dark:border-[#0047FF]/20"
                  >
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground dark:text-white">
                          {laborer.name}
                        </p>
                        {laborer.default && (
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        {laborer.mobile_no}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!laborer.default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(laborer.id)}
                          className="text-xs"
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLaborer(laborer)}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-[#0047FF]/20">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Laborer"
        message={`Are you sure you want to delete "${laborerToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setLaborerToDelete(null);
        }}
      />
    </>
  );
}
