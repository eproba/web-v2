import { auth } from "@/auth";
import { API_URL } from "@/lib/api";
import { Worksheet } from "@/types/worksheet";
import { LoginRequired } from "@/components/login-required";
import { worksheetSerializer } from "@/lib/serializers/worksheet";
import { handleError } from "@/lib/error-alert-handler";
import { WorksheetList } from "@/components/worksheets/worksheet-list";

export default async function UserWorksheets() {
  const session = await auth();
  if (!session || !session.user) {
    return <LoginRequired />;
  }

  const response = await fetch(`${API_URL}/worksheets/?user`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!response.ok) {
    return await handleError(response);
  }

  const data = (await response.json()).reduce(
    (acc: Worksheet[], worksheet: Worksheet) => {
      const serializedWorksheet = worksheetSerializer(worksheet);
      if (serializedWorksheet) {
        acc.push(serializedWorksheet);
      }
      return acc;
    },
    [],
  ) as Worksheet[];

  const activeWorksheets = data.filter((worksheet) => !worksheet.isArchived);
  const archivedWorksheets = data.filter((worksheet) => worksheet.isArchived);

  return (
    <div className="space-y-4">
      <WorksheetList orgWorksheets={activeWorksheets} variant="user" />
      {archivedWorksheets?.length > 0 && (
        <div className="space-y-4 mt-8">
          <h2 className="text-2xl font-semibold">Archiwum</h2>
          <WorksheetList orgWorksheets={archivedWorksheets} variant="shared" />
        </div>
      )}
    </div>
  );
}
