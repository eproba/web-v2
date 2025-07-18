import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/lib/api-client";
import { taskSerializer } from "@/lib/serializers/worksheet";
import { ToastMsg } from "@/lib/toast-msg";
import { cn } from "@/lib/utils";
import { Task } from "@/types/worksheet";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckIcon,
  EditIcon,
  PlusIcon,
  StickyNoteIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

interface TaskNotesProps {
  task: Task;
  worksheetId: string;
  updateTask: (task: Task) => void;
  format?: "overlay" | "mobile";
  className?: string;
}

export function TaskNotes({
  task,
  worksheetId,
  updateTask,
  format = "overlay",
  className,
}: TaskNotesProps) {
  const { apiClient } = useApi();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.notes || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to set cursor position to end when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      // Set cursor to end of text
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
      textarea.focus();
    }
  }, [isEditing]);

  const handleSaveNote = async () => {
    if (editValue.trim() === task.notes?.trim()) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient(
        `/worksheets/${worksheetId}/tasks/${task.id}/note/`,
        {
          method: task.notes ? "PUT" : "POST",
          body: JSON.stringify({ notes: editValue.trim() }),
        },
      );

      const updatedTask = taskSerializer(await response.json());
      updateTask(updatedTask);
      setIsEditing(false);
      toast.success(task.notes ? "Notatka zaktualizowana" : "Notatka dodana");
    } catch (error) {
      toast.error(
        ToastMsg({
          data: {
            title: "Nie udało się zapisać notatki",
            description: error as Error,
          },
        }),
      );
    } finally {
      setIsLoading(false);
      setIsFirstRender(false);
    }
  };

  const handleDeleteNote = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient(
        `/worksheets/${worksheetId}/tasks/${task.id}/note/`,
        {
          method: "DELETE",
        },
      );

      const updatedTask = taskSerializer(await response.json());
      updateTask(updatedTask);
      toast.success("Notatka usunięta");
      setIsDeleteDialogOpen(false);
      setIsPopoverOpen(false);
      setEditValue("");
    } catch (error) {
      toast.error(
        ToastMsg({
          data: {
            title: "Nie udało się usunąć notatki",
            description: error as Error,
          },
        }),
      );
    } finally {
      setIsLoading(false);
      setIsFirstRender(true);
    }
  };

  const handleStartEditing = () => {
    setEditValue(task.notes || "");
    setIsEditing(true);
    setIsFirstRender(false);
  };

  const handleCancelEditing = () => {
    setEditValue(task.notes || "");
    setIsEditing(false);
    setIsFirstRender(false);
    if (format === "overlay" && !task.notes) {
      setIsPopoverOpen(false);
      setIsFirstRender(true);
    }
  };

  if (format === "mobile") {
    return (
      <div className={cn("w-full", className)}>
        <AnimatePresence>
          {task.notes && !isEditing ? (
            <motion.div
              key="display-note"
              initial={{
                opacity: isFirstRender ? 1 : 0,
                height: isFirstRender ? "auto" : 0,
                scale: isFirstRender ? 1 : 0.95,
              }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{
                duration: 0.35,
                ease: [0.4, 0.0, 0.2, 1],
                height: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] },
                scale: { duration: 0.2 },
              }}
              className="overflow-hidden"
            >
              <Card className="bg-accent/50 w-full gap-4 shadow-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StickyNoteIcon className="text-muted-foreground size-4" />
                      <CardTitle className="text-sm">Notatka</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStartEditing}
                        disabled={isLoading}
                      >
                        <EditIcon className="h-3 w-3" />
                      </Button>
                      <Dialog
                        open={isDeleteDialogOpen}
                        onOpenChange={setIsDeleteDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Usuń notatkę</DialogTitle>
                            <DialogDescription>
                              Czy na pewno chcesz usunąć tę notatkę? Ta operacja
                              nie może być cofnięta.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsDeleteDialogOpen(false)}
                              disabled={isLoading}
                            >
                              Anuluj
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDeleteNote}
                              disabled={isLoading}
                            >
                              Usuń
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {task.notes}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : isEditing ? (
            <motion.div
              key="edit-note"
              initial={{
                opacity: isFirstRender ? 1 : 0,
                height: isFirstRender ? "auto" : 0,
                scale: isFirstRender ? 1 : 0.95,
              }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{
                duration: 0.35,
                ease: [0.4, 0.0, 0.2, 1],
                height: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] },
                scale: { duration: 0.2 },
              }}
              className="overflow-hidden"
            >
              <Card className="bg-accent/50 w-full gap-4 shadow-none">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <StickyNoteIcon className="text-muted-foreground size-4" />
                    <CardTitle className="text-sm">
                      {task.notes ? "Edytuj notatkę" : "Dodaj notatkę"}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <Textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Wpisz notatkę..."
                    disabled={isLoading}
                    className="field-sizing-content min-h-[80px] w-full transition-all duration-200"
                    rows={3}
                  />
                  <motion.div
                    className="flex justify-end gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.2 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditing}
                      disabled={isLoading}
                    >
                      <XIcon className="mr-1 h-3 w-3" />
                      Anuluj
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={isLoading || editValue.trim() === ""}
                    >
                      <CheckIcon className="mr-1 h-3 w-3" />
                      Zapisz
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="add-note-button"
              initial={{
                opacity: isFirstRender ? 1 : 0,
                height: isFirstRender ? "auto" : 0,
              }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
                height: { duration: 0.4 },
              }}
              className="flex justify-center overflow-hidden"
            >
              <Button
                variant="ghost"
                onClick={handleStartEditing}
                disabled={isLoading}
              >
                <PlusIcon className="size-4" />
                Dodaj notatkę
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Overlay format for desktop
  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(open) => {
        setIsPopoverOpen(open);
        if (!open) {
          setIsFirstRender(true);
        } else {
          if (!task.notes) {
            setIsEditing(true);
          }
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-8 w-8 p-0 shadow-lg transition-all duration-200 hover:shadow-xl",
            "border-2 bg-white/95 backdrop-blur-sm",
            task.notes
              ? "border-amber-300 bg-amber-50/95 text-amber-600 hover:bg-amber-100/95 hover:text-amber-700"
              : "border-gray-300 bg-white/95 text-gray-600 hover:bg-gray-50/95 hover:text-gray-700",
            "animate-in fade-in-0 slide-in-from-left-2 duration-300",
            className,
          )}
        >
          <StickyNoteIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        <AnimatePresence>
          {!isEditing ? (
            <motion.div
              key="display-note"
              initial={{
                opacity: isFirstRender && isPopoverOpen ? 1 : 0,
                height: isFirstRender && isPopoverOpen ? "auto" : 0,
              }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0.0, 0.2, 1],
                height: { duration: 0.35, ease: [0.4, 0.0, 0.2, 1] },
              }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                  <StickyNoteIcon className="text-muted-foreground size-4" />
                  <h3 className="text-sm font-medium">Notatka</h3>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleStartEditing}
                    disabled={isLoading}
                    className="h-6 w-6 p-0"
                  >
                    <EditIcon className="h-3 w-3" />
                  </Button>
                  <Dialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isLoading}
                        className="h-6 w-6 p-0"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Usuń notatkę</DialogTitle>
                        <DialogDescription>
                          Czy na pewno chcesz usunąć tę notatkę? Ta operacja nie
                          może być cofnięta.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsDeleteDialogOpen(false)}
                          disabled={isLoading}
                        >
                          Anuluj
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteNote}
                          disabled={isLoading}
                        >
                          Usuń
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="px-4 pb-4">
                <p className="text-muted-foreground max-h-40 overflow-y-auto text-sm whitespace-pre-wrap">
                  {task.notes}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="edit-note"
              initial={{
                opacity: isFirstRender && isPopoverOpen ? 1 : 0,
                height: isFirstRender && isPopoverOpen ? "auto" : 0,
              }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0.0, 0.2, 1],
                height: { duration: 0.35, ease: [0.4, 0.0, 0.2, 1] },
              }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 p-4 pb-2">
                <StickyNoteIcon className="text-muted-foreground size-4" />
                <h3 className="text-sm font-medium">
                  {task.notes ? "Edytuj notatkę" : "Dodaj notatkę"}
                </h3>
              </div>
              <div className="space-y-3 px-4 pb-4">
                <Textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Wpisz notatkę..."
                  disabled={isLoading}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEditing}
                    disabled={isLoading}
                  >
                    <XIcon className="mr-1 h-3 w-3" />
                    Anuluj
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={isLoading || editValue.trim() === ""}
                  >
                    <CheckIcon className="mr-1 h-3 w-3" />
                    Zapisz
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
