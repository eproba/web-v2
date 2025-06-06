import React from "react";
import { WorksheetEditor } from "@/components/worksheets/editor/worksheet-editor";
import { fetchCurrentUser, fetchTemplate } from "@/lib/server-api";

interface WorksheetCreatePageProps {
  searchParams: Promise<{
    templateId?: string;
  }>;
}

const WorksheetCreatePage = async ({
  searchParams,
}: WorksheetCreatePageProps) => {
  const { templateId } = await searchParams;

  const { user, error: userError } = await fetchCurrentUser();
  if (userError) {
    return userError;
  }

  if (templateId) {
    const { template, error: templateError } = await fetchTemplate(templateId);
    if (templateError) {
      return templateError;
    }

    return (
      <WorksheetEditor
        mode="create"
        redirectTo={`/worksheets/templates#${templateId}`}
        initialData={template}
        currentUser={user!}
      />
    );
  }

  return (
    <WorksheetEditor
      mode="create"
      redirectTo="/worksheets"
      currentUser={user!}
    />
  );
};

export default WorksheetCreatePage;
