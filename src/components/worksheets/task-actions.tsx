import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApi } from "@/lib/api-client";
import { RequiredFunctionLevel } from "@/lib/const";
import { publicUserSerializer } from "@/lib/serializers/user";
import { taskSerializer } from "@/lib/serializers/worksheet";
import { ToastMsg } from "@/lib/toast-msg";
import { cn } from "@/lib/utils";
import { PublicUser, User } from "@/types/user";
import { Task, TaskStatus } from "@/types/worksheet";
import { composeEventHandlers } from "@radix-ui/primitive";
import {
  CloudUploadIcon,
  EraserIcon,
  PenOffIcon,
  SendIcon,
  SignatureIcon,
  TicketXIcon,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "react-toastify";

type TaskAction = "submit" | "unsubmit" | "accept" | "reject" | "clear";

const ACTION_MESSAGES: Record<TaskAction, string> = {
  submit: "Zgłoszenie wysłane",
  unsubmit: "Zgłoszenie wycofane",
  accept: "Zadanie zatwierdzone",
  reject: "Zadanie odrzucone",
  clear: "Status zadania wyczyszczony",
};

const ERROR_MESSAGES: Record<TaskAction, string> = {
  submit: "Nie udało się zgłosić zadania",
  unsubmit: "Nie udało się wycofać zgłoszenia",
  accept: "Nie udało się zatwierdzić zadania",
  reject: "Nie udało się odrzucić zadania",
  clear: "Nie udało się wyczyścić statusu zadania",
};

interface TaskActionsProps {
  worksheetId: string;
  task: Task;
  variant: "user" | "managed" | "review";
  updateTask: (task: Task) => void;
  closeDrawer?: () => void;
  format?: "icon" | "button";
  onClick?: (event: React.MouseEvent) => void;
  currentUser?: User;
}

const LoadingIcon = () => (
  <div className="relative flex w-full items-center justify-center">
    <CloudUploadIcon className="absolute size-5 animate-ping text-gray-500" />
    <CloudUploadIcon className="size-5 text-gray-500" />
  </div>
);

const LoadingIndicator = ({ format }: { format: "icon" | "button" }) =>
  format === "button" ? (
    <Button
      variant="outline"
      className="pointer-events-none w-full"
      size="icon"
    >
      <LoadingIcon />
    </Button>
  ) : (
    <LoadingIcon />
  );

const ActionButton = ({
  icon: Icon,
  color,
  tooltip,
  variant,
  children,
  ref,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  tooltip?: string;
  variant: "ghost" | "default";
  children?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
} & React.ComponentPropsWithoutRef<typeof Button>) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button ref={ref} {...props} variant={variant}>
          <Icon className={cn("size-5", color)} />
          {children}
        </Button>
      </TooltipTrigger>
      {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
  </TooltipProvider>
);

const SubmitDialog = ({
  worksheetId,
  task,
  children,
  onSuccess,
}: {
  worksheetId: string;
  task: Task;
  children: React.ReactNode;
  onSuccess: (id: string) => void;
}) => {
  const { apiClient } = useApi();
  const [approvers, setApprovers] = useState<PublicUser[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const fetchApprovers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient(
        `/worksheets/${worksheetId}/tasks/${task.id}/approvers/`,
      );
      const data = (await response.json()).map(publicUserSerializer);
      setApprovers(data);
      if (data.length === 1) setSelectedApprover(data[0].id);
    } catch (error) {
      toast.error(
        ToastMsg({
          data: {
            title: "Nie można pobrać osób do zgłoszenia",
            description: error as Error,
          },
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) =>
        open ? fetchApprovers() : setSelectedApprover(undefined)
      }
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Do kogo chcesz zgłosić to zadanie?</DialogTitle>
          <DialogDescription>
            Wybierz osobę, do której chcesz zgłosić wykonanie zadania{" "}
            <q>{task.name}</q>.
          </DialogDescription>
          <Select
            value={selectedApprover ?? ""}
            onValueChange={setSelectedApprover}
            disabled={!approvers.length || isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  isLoading
                    ? "Ładowanie..."
                    : approvers.length
                      ? "Wybierz osobę"
                      : "Brak dostępnych osób"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {approvers.map((approver) => (
                <SelectItem key={approver.id} value={approver.id}>
                  {approver.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Anuluj</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                onClick={() => onSuccess(selectedApprover ?? "")}
                disabled={!selectedApprover}
              >
                Wyślij
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

const useTaskActions = ({
  worksheetId,
  task,
  updateTask,
  closeDrawer,
}: Pick<
  TaskActionsProps,
  "worksheetId" | "task" | "updateTask" | "closeDrawer"
>) => {
  const { apiClient } = useApi();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: TaskAction, body?: object) => {
    setIsLoading(true);
    try {
      const response = await apiClient(
        `/worksheets/${worksheetId}/tasks/${task.id}/${action === "clear" ? "clear-status" : action}/`,
        body
          ? { method: "POST", body: JSON.stringify(body) }
          : { method: "POST" },
      );
      toast.success(ACTION_MESSAGES[action]);
      updateTask(taskSerializer(await response.json()));
      closeDrawer?.();
    } catch (error) {
      toast.error(
        ToastMsg({
          data: {
            title: ERROR_MESSAGES[action],
            description: error as Error,
          },
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, handleAction };
};

export function TaskActions({
  worksheetId,
  task,
  variant,
  updateTask,
  closeDrawer,
  format = "icon",
  onClick,
  currentUser,
}: TaskActionsProps) {
  const { isLoading, handleAction } = useTaskActions({
    worksheetId,
    task,
    updateTask,
    closeDrawer,
  });

  if (isLoading) {
    return <LoadingIndicator format={format} />;
  }

  const handleSubmit = (approverId: string) => {
    handleAction("submit", { approver: approverId });
  };

  const userActions = {
    [TaskStatus.TODO]: (
      <SubmitDialog
        worksheetId={worksheetId}
        task={task}
        onSuccess={handleSubmit}
      >
        <ActionButton
          icon={SendIcon}
          color="text-blue-500"
          tooltip="Zgłoś wykonanie"
          className="w-full sm:w-fit"
          variant={format === "button" ? "default" : "ghost"}
          onClick={onClick}
        >
          {format === "button" && "Zgłoś wykonanie"}
        </ActionButton>
      </SubmitDialog>
    ),
    [TaskStatus.REJECTED]: (
      <SubmitDialog
        worksheetId={worksheetId}
        task={task}
        onSuccess={handleSubmit}
      >
        <ActionButton
          icon={SendIcon}
          color="text-blue-500"
          tooltip="Wyślij ponownie"
          className="w-full sm:w-fit"
          variant={format === "button" ? "default" : "ghost"}
          onClick={onClick}
        >
          {format === "button" && "Wyślij ponownie"}
        </ActionButton>
      </SubmitDialog>
    ),
    [TaskStatus.AWAITING_APPROVAL]: (
      <ActionButton
        icon={TicketXIcon}
        color="text-red-500"
        tooltip="Wycofaj zgłoszenie"
        className="w-full sm:w-fit"
        variant={format === "button" ? "default" : "ghost"}
        onClick={composeEventHandlers(() => handleAction("unsubmit"), onClick)}
      >
        {format === "button" && "Wycofaj zgłoszenie"}
      </ActionButton>
    ),
    [TaskStatus.APPROVED]: null,
  };

  const managedActions = {
    [TaskStatus.TODO]: (
      <ActionButton
        icon={SignatureIcon}
        color="text-green-500"
        tooltip="Podpisz zadanie"
        className="w-full sm:w-fit"
        variant={format === "button" ? "default" : "ghost"}
        onClick={composeEventHandlers(() => handleAction("accept"), onClick)}
      >
        {format === "button" && "Podpisz zadanie"}
      </ActionButton>
    ),
    [TaskStatus.APPROVED]: (
      <ActionButton
        icon={PenOffIcon}
        color="text-red-500"
        tooltip="Anuluj wykonanie zadania"
        className="w-full sm:w-fit"
        variant={format === "button" ? "default" : "ghost"}
        onClick={composeEventHandlers(() => handleAction("reject"), onClick)}
      >
        {format === "button" && "Anuluj wykonanie zadania"}
      </ActionButton>
    ),
    [TaskStatus.AWAITING_APPROVAL]: (
      <div className="grid w-full grid-cols-2 gap-2">
        <ActionButton
          icon={SignatureIcon}
          color="text-green-500"
          tooltip="Zatwierdź zadanie"
          variant={format === "button" ? "default" : "ghost"}
          onClick={composeEventHandlers(() => handleAction("accept"), onClick)}
        >
          {format === "button" && "Zatwierdź zadanie"}
        </ActionButton>
        <ActionButton
          icon={PenOffIcon}
          color="text-red-500"
          tooltip="Odrzuć zadanie"
          variant={format === "button" ? "default" : "ghost"}
          onClick={composeEventHandlers(() => handleAction("reject"), onClick)}
        >
          {format === "button" && "Odrzuć zadanie"}
        </ActionButton>
      </div>
    ),
    [TaskStatus.REJECTED]: (
      <div className="grid w-full grid-cols-2 gap-2">
        <ActionButton
          icon={SignatureIcon}
          color="text-green-500"
          tooltip="Podpisz zadanie"
          variant={format === "button" ? "default" : "ghost"}
          onClick={composeEventHandlers(() => handleAction("accept"), onClick)}
        >
          {format === "button" && "Podpisz zadanie"}
        </ActionButton>
        <ActionButton
          icon={EraserIcon}
          color="text-gray-500"
          tooltip="Wyczyść status"
          variant={format === "button" ? "default" : "ghost"}
          onClick={composeEventHandlers(() => handleAction("clear"), onClick)}
        >
          {format === "button" && "Wyczyść status"}
        </ActionButton>
      </div>
    ),
  };

  switch (variant) {
    case "user":
      return userActions[task.status] || null;
    case "managed":
    case "review":
      if (!currentUser) {
        return null; // No actions available without current user context
      }
      switch (task.category) {
        case "individual":
          if (
            currentUser.function.numberValue >=
              RequiredFunctionLevel.INDIVIDUAL_TASKS_MANAGEMENT ||
            task.approver === currentUser.id // Override for if the user is the approver, it shouldn't ever happen but just in case i mess something up
          ) {
            return managedActions[task.status] || null;
          }
          return null;
        case "general":
          if (
            currentUser.function.numberValue >=
              RequiredFunctionLevel.WORKSHEET_MANAGEMENT ||
            task.approver === currentUser.id
          ) {
            return managedActions[task.status] || null;
          }
          return null;
        default:
          return null;
      }
  }
}
