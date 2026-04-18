"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ConfirmationModal } from "@/components/confirmation-modal";

type Laborer = {
  id: number;
  created_at: string;
  name: string;
  mobile_no: string;
  default: boolean;
};

type LaborerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLaborersChange?: (laborers: Laborer[]) => void;
};

export default function LaborerModal({
  isOpen,
  onClose,
  onLaborersChange,
}: LaborerModalProps) {
  const supabase = createClient();

  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [selectedLaborers, setSelectedLaborers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states for new laborer
  const [newName, setNewName] = useState("");
  const [newMobileNo, setNewMobileNo] = useState("");
  const [newDefault, setNewDefault] = useState(false);
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLaborers(data || []);
    } catch (error) {
      console.error("Error fetching laborers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLaborer = (laborerId: number) => {
    setSelectedLaborers((prev) =>
      prev.includes(laborerId)
        ? prev.filter((id) => id !== laborerId)
        : [...prev, laborerId],
    );
  };

  const handleSelectAll = () => {
    if (selectedLaborers.length === laborers.length) {
      setSelectedLaborers([]);
    } else {
      setSelectedLaborers(laborers.map((l) => l.id));
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
          default: newDefault,
        })
        .select()
        .single();

      if (error) throw error;

      const newLaborerData = data as Laborer;
      setLaborers((prev) => [newLaborerData, ...prev]);
      setNewName("");
      setNewMobileNo("");
      setNewDefault(false);
      setIsAddingNew(false);

      if (onLaborersChange) {
        onLaborersChange([newLaborerData, ...laborers]);
      }
    } catch (error) {
      console.error("Error creating laborer:", error);
      setCreateError("Failed to create laborer. Please try again.");
    } finally {
      setIsCreating(false);
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

      setLaborers((prev) => prev.filter((l) => l.id !== laborerToDelete.id));
      setSelectedLaborers((prev) =>
        prev.filter((id) => id !== laborerToDelete.id),
      );
      setShowDeleteConfirm(false);
      setLaborerToDelete(null);

      const updatedLaborers = laborers.filter(
        (l) => l.id !== laborerToDelete.id,
      );
      if (onLaborersChange) {
        onLaborersChange(updatedLaborers);
      }
    } catch (error) {
      console.error("Error deleting laborer:", error);
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

          {/* Add New Laborer Section */}
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

              <div className="flex items-center gap-2">
                <Checkbox
                  id="laborer-default"
                  checked={newDefault}
                  onCheckedChange={(checked) => setNewDefault(checked === true)}
                  disabled={isCreating}
                />
                <Label
                  htmlFor="laborer-default"
                  className="text-sm cursor-pointer"
                >
                  Set as default
                </Label>
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
                    setNewDefault(false);
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground dark:text-white">
                Laborers ({laborers.length})
              </h3>
              {laborers.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={
                      selectedLaborers.length === laborers.length &&
                      laborers.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-xs text-muted-foreground">
                    Select All
                  </span>
                </label>
              )}
            </div>

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
                    <Checkbox
                      checked={selectedLaborers.includes(laborer.id)}
                      onCheckedChange={() => handleSelectLaborer(laborer.id)}
                    />

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

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLaborer(laborer)}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </Button>
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
            {selectedLaborers.length > 0 && (
              <Button disabled className="opacity-50">
                {selectedLaborers.length} Selected
              </Button>
            )}
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
