"use client";
import { Task, Worksheet } from "@/types/worksheet";
import { Input } from "@/components/ui/input";
import { WorksheetItem } from "@/components/worksheets/worksheet-item";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Simple function to calculate string similarity
const stringSimilarity = (str1: string, str2: string): boolean => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match or contains
  if (s2.includes(s1) || s1.includes(s2)) return true;

  // Check if it's just a minor typo (if input is at least 4 chars)
  if (s1.length >= 4) {
    // Allow one character difference for every 4 characters
    const allowedDiff = Math.floor(s1.length / 4);
    let diff = 0;

    // Check if removing N characters from s1 would make it a substring of s2
    for (let i = 0; i < s1.length && diff <= allowedDiff; i++) {
      const subStr = s1.slice(0, i) + s1.slice(i + 1);
      if (s2.includes(subStr)) return true;
      diff++;
    }
  }

  return false;
};

export function WorksheetList({
  orgWorksheets,
  variant = "user",
  showFilters = false,
  patrols = [],
  currentUserId,
}: {
  orgWorksheets: Worksheet[];
  variant?: "user" | "managed" | "shared" | "archived" | "review";
  showFilters?: boolean;
  patrols?: Record<string, string>[];
  currentUserId?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedPatrol, setSelectedPatrol] = useState<string>("null");
  const [worksheets, setWorksheets] = useState<Worksheet[]>(orgWorksheets);

  function updateTask(worksheetId: string, task: Task) {
    setWorksheets((prevWorksheets) =>
      prevWorksheets.map((w) => {
        if (w.id === worksheetId) {
          return {
            ...w,
            tasks: w.tasks.map((t) => (t.id === task.id ? task : t)),
          };
        }
        return w;
      }),
    );
  }

  function deleteWorksheet(worksheetId: string) {
    setWorksheets((prevWorksheets) =>
      prevWorksheets.filter((w) => w.id !== worksheetId),
    );
  }

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timerId);
  }, [searchQuery]);

  const searchText = useCallback(
    (text: string | undefined): boolean => {
      if (!text || !debouncedSearchQuery) return false;
      return stringSimilarity(debouncedSearchQuery, text);
    },
    [debouncedSearchQuery],
  );

  // Filter worksheets based on search query and selected patrol
  const filteredWorksheets = useMemo(() => {
    // Skip filtering if no filters are applied
    if (debouncedSearchQuery === "" && selectedPatrol === "null") {
      return worksheets || [];
    }

    return worksheets.filter((worksheet) => {
      // Filter by patrol first (quicker check)
      const patrolMatch =
        selectedPatrol === "null" || worksheet.user?.patrol === selectedPatrol;

      if (!patrolMatch || debouncedSearchQuery === "") {
        return patrolMatch;
      }

      // Search in name
      const nameMatch = searchText(worksheet.name);
      if (nameMatch) return true;

      // Only search in tasks if name doesn't match
      return (
        worksheet.tasks?.some(
          (task) =>
            searchText(task.name) ||
            (task.description && searchText(task.description)),
        ) || false
      );
    });
  }, [worksheets, debouncedSearchQuery, selectedPatrol, searchText]);

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex items-center justify-between gap-2">
          <Input
            type="text"
            placeholder="Wyszukaj próbę"
            className="w-full max-w-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select onValueChange={setSelectedPatrol} value={selectedPatrol}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Wybierz zastęp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Wszystkie</SelectItem>
              {patrols.map((patrol) => (
                <SelectItem key={patrol.id} value={patrol.id}>
                  {patrol.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {filteredWorksheets.length === 0 ? (
        variant === "review" ? (
          <Card>
            <CardHeader>
              <CardTitle>Nie masz żadnych zadań do sprawdzenia.</CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Nie znaleziono prób pasujących do podanych kryteriów.
              </CardTitle>
            </CardHeader>
            <CardContent>{/*TODO: Add create worksheet button */}</CardContent>
          </Card>
        )
      ) : (
        filteredWorksheets
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )
          .map((worksheet) => (
            <WorksheetItem
              key={worksheet.id}
              worksheet={worksheet}
              variant={variant}
              updateTask={updateTask}
              deleteWorksheet={() => deleteWorksheet(worksheet.id)}
              currentUserId={currentUserId}
            />
          ))
      )}
    </div>
  );
}
