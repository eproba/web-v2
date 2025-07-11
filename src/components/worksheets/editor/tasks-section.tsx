import React from "react";
import { TaskList } from "@/components/worksheets/editor/task-list";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { type Task, type WorksheetWithTasks } from "@/lib/schemas/worksheet";
import { User } from "@/types/user";

interface TasksSectionProps {
  form: UseFormReturn<WorksheetWithTasks>;
  generalTasks: Task[];
  individualTasks: Task[];
  showDescriptions: boolean;
  enableCategories: boolean;
  onUpdateTask: (
    id: string,
    updates: { field: string; value: string }[],
  ) => void;
  onAddTask: (category: string) => string;
  onRemoveTask: (category: string, id: string) => void;
  onMoveTaskUp: (category: string, taskId: string) => void;
  onMoveTaskDown: (category: string, taskId: string) => void;
  onMoveTaskToCategory: (
    taskId: string,
    fromCategory: string,
    toCategory: string,
  ) => void;
  currentUser: User;
  variant: "template" | "worksheet";
}

export const TasksSection: React.FC<TasksSectionProps> = ({
  form,
  generalTasks,
  individualTasks,
  showDescriptions,
  enableCategories,
  onUpdateTask,
  onAddTask,
  onRemoveTask,
  onMoveTaskUp,
  onMoveTaskDown,
  onMoveTaskToCategory,
  currentUser,
  variant,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row w-full gap-4">
        {/* General Tasks */}
        <TaskList
          title={enableCategories ? "Zadania ogólne" : null}
          tasks={generalTasks}
          category="general"
          showDescriptions={showDescriptions}
          enableCategories={enableCategories}
          onUpdateTask={onUpdateTask}
          onAddTask={onAddTask}
          onRemoveTask={onRemoveTask}
          onMoveTaskUp={onMoveTaskUp}
          onMoveTaskDown={onMoveTaskDown}
          onMoveTaskToCategory={onMoveTaskToCategory}
          form={form}
          currentUser={currentUser}
          variant={variant}
        />

        {/* Individual Tasks (only when categories enabled) */}
        {enableCategories && (
          <TaskList
            title="Próby indywidualne"
            tasks={individualTasks}
            category="individual"
            showDescriptions={showDescriptions}
            enableCategories={enableCategories}
            onUpdateTask={onUpdateTask}
            onAddTask={onAddTask}
            onRemoveTask={onRemoveTask}
            onMoveTaskUp={onMoveTaskUp}
            onMoveTaskDown={onMoveTaskDown}
            onMoveTaskToCategory={onMoveTaskToCategory}
            form={form}
            currentUser={currentUser}
            variant={variant}
          />
        )}
      </div>

      {/* Tasks validation error message */}
      <FormField
        control={form.control}
        name="tasks"
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
