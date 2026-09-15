import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface ExercisePrescription {
  position: number;
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
}

export interface ProgrammeDay {
  dayNumber: number;
  name: string;
  estimatedMinutes: number | null;
  exercises: ExercisePrescription[];
}

export interface ProgrammeWriteInput {
  name?: string;
  description?: string;
  difficulty?: string;
  goal?: string;
  days?: {
    name: string;
    estimatedMinutes?: number | null;
    exercises: {
      exerciseId: string;
      sets: number;
      reps: string;
      restSeconds?: number;
      notes?: string;
    }[];
  }[];
}

export interface ProgrammeRevision {
  id: string;
  revisionNumber: number;
  version: number;
  name: string;
  description?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | string;
  goal: string;
  days: ProgrammeDay[];
}

export interface ProgrammeTemplate {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived";
  version: number;
  revision: ProgrammeRevision | null; // For client list/detail

  // For admin list/detail
  revisions?: ProgrammeRevision[];
  draftRevision?: ProgrammeRevision | null;
  publishedRevision?: ProgrammeRevision | null;
}

// Client Hooks
export function useGetProgrammes() {
  return useQuery({
    queryKey: ["programmes"],
    queryFn: async () => {
      const res = await apiRequest<{ programmes: ProgrammeTemplate[] }>("/programmes");
      return res.programmes;
    },
  });
}

export function useGetProgramme(id: string) {
  return useQuery({
    queryKey: ["programmes", id],
    queryFn: async () => {
      const res = await apiRequest<{ programme: ProgrammeTemplate }>(`/programmes/${id}`);
      return res.programme;
    },
    enabled: !!id,
  });
}

// Admin Hooks
export function useGetAdminProgrammes() {
  return useQuery({
    queryKey: ["admin", "programmes"],
    queryFn: async () => {
      const res = await apiRequest<{ programmes: ProgrammeTemplate[] }>("/admin/programmes");
      return res.programmes;
    },
  });
}

export function useGetAdminProgramme(id: string) {
  return useQuery({
    queryKey: ["admin", "programmes", id],
    queryFn: async () => {
      const res = await apiRequest<{ programme: ProgrammeTemplate }>(`/admin/programmes/${id}`);
      return res.programme;
    },
    enabled: !!id,
  });
}

export function useCreateProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProgrammeWriteInput) => {
      const res = await apiRequest<{ programme: ProgrammeTemplate }>("/admin/programmes", {
        method: "POST",
        body: data,
      });
      return res.programme;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "programmes", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes"] });
    },
  });
}

export function useUpdateProgrammeDraft(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, version }: { data: ProgrammeWriteInput; version: number }) => {
      const res = await apiRequest<{ programme: ProgrammeTemplate }>(`/admin/programmes/${id}/draft`, {
        method: "PATCH",
        body: data,
        headers: {
          "If-Match": version.toString(),
        },
      });
      return res.programme;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "programmes", id], data);
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes"] });
    },
  });
}

export function useCreateReplacementDraft(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest<{ programme: ProgrammeTemplate }>(`/admin/programmes/${id}/replacement-draft`, {
        method: "POST",
      });
      return res.programme;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "programmes", id], data);
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes"] });
    },
  });
}

export function usePublishProgramme(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (version: number) => {
      const res = await apiRequest<{ programme: ProgrammeTemplate }>(`/admin/programmes/${id}/publish`, {
        method: "POST",
        headers: {
          "If-Match": version.toString(),
        },
      });
      return res.programme;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "programmes", id], data);
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes"] });
      queryClient.invalidateQueries({ queryKey: ["programmes"] });
    },
  });
}

export function useArchiveProgramme(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ version, reason }: { version: number; reason: string }) => {
      const res = await apiRequest<{ programme: ProgrammeTemplate }>(`/admin/programmes/${id}/archive`, {
        method: "POST",
        body: { reason },
        headers: {
          "If-Match": version.toString(),
        },
      });
      return res.programme;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "programmes", id], data);
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes"] });
      queryClient.invalidateQueries({ queryKey: ["programmes"] });
    },
  });
}
