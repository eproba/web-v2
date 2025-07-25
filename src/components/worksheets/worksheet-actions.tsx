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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorksheetNotesDialog } from "@/components/worksheets/worksheet-notes-dialog";
import { API_URL } from "@/lib/api";
import { useApi } from "@/lib/api-client";
import { RequiredFunctionLevel } from "@/lib/const";
import { ToastMsg } from "@/lib/toast-msg";
import { User } from "@/types/user";
import { Worksheet } from "@/types/worksheet";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  EllipsisVerticalIcon,
  LucideIcon,
  PrinterIcon,
  Share2Icon,
  SquareArrowOutUpRightIcon,
  SquarePenIcon,
  StickyNoteIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type WorksheetAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  handler?: () => void;
  href?: string;
  variant: ("managed" | "archived" | "user" | "review")[];
  userFilter?: (user: User) => boolean;
  renderContent?: (action: WorksheetAction, baseUrl: string) => React.ReactNode;
};

export function WorksheetActions({
  worksheet,
  variant,
  removeWorksheet,
  updateWorksheet,
  currentUser,
}: {
  worksheet: Worksheet;
  variant: "user" | "managed" | "shared" | "archived" | "review";
  removeWorksheet?: (worksheetId: string) => void;
  updateWorksheet?: (worksheet: Worksheet) => void;
  currentUser?: User;
}) {
  const router = useRouter();
  const { apiClient } = useApi();
  const [baseUrl, setBaseUrl] = useState("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  function copyLink() {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(`${baseUrl}/worksheets/${worksheet.id}`);
      toast.success("Link skopiowany do schowka");
    }
  }

  async function handleDeleteWorksheet() {
    try {
      await apiClient(
        `/worksheets/${worksheet.id}/${worksheet.isArchived ? "?archived" : ""}`,
        {
          method: "DELETE",
        },
      );
      toast.success("Próba została usunięta");
      if (removeWorksheet) {
        removeWorksheet(worksheet.id);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(
        ToastMsg({
          data: {
            title: "Nie można usunąć próby",
            description: error as Error,
          },
        }),
      );
    } finally {
      setShowDeleteAlert(false);
    }
  }

  async function handleArchiveWorksheet() {
    try {
      await apiClient(`/worksheets/${worksheet.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_archived: true }),
      });
      toast.success("Próba została przeniesiona do archiwum");
      if (removeWorksheet) {
        removeWorksheet(worksheet.id);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(
        ToastMsg({
          data: {
            title: "Nie można przenieść próby do archiwum",
            description: error as Error,
          },
        }),
      );
    }
  }

  async function handleUnarchiveWorksheet() {
    try {
      await apiClient(`/worksheets/${worksheet.id}/?archived`, {
        method: "PATCH",
        body: JSON.stringify({ is_archived: false }),
      });
      toast.success("Próba została przywrócona z archiwum");
      if (removeWorksheet) {
        removeWorksheet(worksheet.id);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(
        ToastMsg({
          data: {
            title: "Nie można przywrócić próby z archiwum",
            description: error as Error,
          },
        }),
      );
    }
  }

  const worksheetActions: WorksheetAction[] = [
    {
      id: "notes",
      label: "Notatka",
      icon: StickyNoteIcon,
      variant: ["managed", "archived", "user"],
      userFilter: (user) =>
        (user.function.numberValue >=
          RequiredFunctionLevel.WORKSHEET_NOTES_ACCESS ||
          user.id === worksheet.supervisor) &&
        user.id !== worksheet.user.id,
      renderContent: (action) => (
        <Tooltip>
          <WorksheetNotesDialog
            worksheet={worksheet}
            updateWorksheet={updateWorksheet || (() => {})}
            format="overlay"
          >
            <TooltipTrigger asChild>
              <action.icon
                className={`cursor-pointer ${
                  worksheet.notes
                    ? "text-amber-600 hover:text-amber-700"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                size={20}
              />
            </TooltipTrigger>
          </WorksheetNotesDialog>
          <TooltipContent>
            <p>{action.label}</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: "edit",
      label: "Edytuj",
      icon: SquarePenIcon,
      href: `/worksheets/${worksheet.id}/edit`,
      variant: ["managed"],
      userFilter: (user) =>
        user.function.numberValue >= worksheet.user.function.numberValue ||
        user.function.numberValue >= 4 ||
        user.id === worksheet.supervisor,
    },
    {
      id: "share",
      label: "Skopiuj link",
      icon: Share2Icon,
      handler: copyLink,
      variant: ["managed", "archived", "user"],
    },
    {
      id: "print",
      label: "Drukuj",
      icon: PrinterIcon,
      href: `${API_URL}/worksheets/${worksheet.id}/pdf/`,
      variant: ["managed", "archived", "user"],
    },
    {
      id: "archive",
      label:
        variant === "archived" ? "Przywróć z archiwum" : "Przenieś do archiwum",
      icon: worksheet.isArchived ? ArchiveRestoreIcon : ArchiveIcon,
      handler: worksheet.isArchived
        ? handleUnarchiveWorksheet
        : handleArchiveWorksheet,
      variant: ["managed", "archived"],
      userFilter: (user) =>
        user.function.numberValue >= worksheet.user.function.numberValue ||
        user.function.numberValue >= 4 ||
        user.id === worksheet.supervisor,
    },
    {
      id: "delete",
      label: "Usuń",
      icon: TrashIcon,
      handler: () => setShowDeleteAlert(true),
      variant: ["managed", "archived"],
      userFilter: (user) =>
        user.function.numberValue >= worksheet.user.function.numberValue ||
        user.function.numberValue >= 4 ||
        user.id === worksheet.supervisor,
    },
    {
      id: "open-in-manage",
      label: "Skocz do próby",
      icon: SquareArrowOutUpRightIcon,
      href: `/worksheets/manage#${worksheet.id}`,
      variant: ["review"],
    },
  ];

  const filteredActions = worksheetActions.filter(
    (action) =>
      action.variant.includes(
        variant as "managed" | "archived" | "user" | "review",
      ) &&
      (!action.userFilter || (currentUser && action.userFilter(currentUser))),
  );

  const renderActionIcon = (action: WorksheetAction) => {
    if (action.renderContent) {
      return action.renderContent(action, baseUrl);
    }

    if (action.href) {
      return (
        <Link href={action.href}>
          <action.icon className="text-muted-foreground" size={20} />
        </Link>
      );
    }

    return (
      <action.icon
        className="text-muted-foreground cursor-pointer"
        size={20}
        onClick={action.handler}
      />
    );
  };

  const renderDesktopIcons = () => (
    <div className="hidden gap-2 md:flex">
      {filteredActions.map((action) => (
        <TooltipProvider key={action.id}>
          <Tooltip>
            <TooltipTrigger asChild>{renderActionIcon(action)}</TooltipTrigger>
            <TooltipContent>
              <p>{action.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );

  const renderMobileMenu = () =>
    // Only show dropdown when there are multiple actions
    filteredActions.length > 1 ? (
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="data-[state=open]:bg-muted size-8 p-0"
            >
              <EllipsisVerticalIcon className="size-5" />
              <span className="sr-only">Otwórz menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {filteredActions.map((action) => {
              // Special case for notes in mobile view - open as drawer
              if (action.id === "notes") {
                return (
                  <DropdownMenuItem key={action.id} asChild>
                    <WorksheetNotesDialog
                      worksheet={worksheet}
                      updateWorksheet={updateWorksheet || (() => {})}
                      format="mobile"
                    >
                      <div className="hover:bg-accent hover:text-accent-foreground flex h-auto w-full cursor-pointer items-center justify-start px-2 py-1.5 text-sm">
                        <StickyNoteIcon className="mr-2 size-4" />
                        {worksheet.notes ? "Notatka" : "Dodaj notatkę"}
                      </div>
                    </WorksheetNotesDialog>
                  </DropdownMenuItem>
                );
              }

              return (
                <DropdownMenuItem
                  key={action.id}
                  onSelect={action.handler}
                  asChild={!!action.href}
                >
                  {action.href ? (
                    <Link href={action.href} className="flex items-center">
                      <action.icon className="size-4" />
                      {action.label}
                    </Link>
                  ) : (
                    <div className="flex items-center">
                      <action.icon className="mr-2 size-4" />
                      {action.label}
                    </div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ) : (
      // For single action on mobile, render the icon directly
      <div className="md:hidden">
        {filteredActions.map((action) => (
          <TooltipProvider key={action.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                {renderActionIcon(action)}
              </TooltipTrigger>
              <TooltipContent>
                <p>{action.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );

  // Only render for managed or archived variants
  if (!["managed", "archived", "user", "review"].includes(variant)) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        {renderDesktopIcons()}
        {renderMobileMenu()}
      </div>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć tę próbę?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Próba <q>{worksheet.name}</q> zostanie usunięta na stałe i nie
              będzie można jej przywrócić.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteWorksheet}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
