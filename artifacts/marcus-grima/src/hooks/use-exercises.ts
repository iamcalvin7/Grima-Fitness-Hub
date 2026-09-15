import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface ExerciseRecord {
  id: string;
  name: string;
  status: "draft" | "active" | "archived";
  primaryMuscle: string;
  muscleGroups: string[];
}

interface ExercisePage {
  exercises: ExerciseRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

async function fetchAllPages(endpoint: string, baseParams: URLSearchParams) {
  let allExercises: ExerciseRecord[] = [];
  let page = 1;
  const limit = 100;
  
  while (true) {
    const params = new URLSearchParams(baseParams);
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    
    const res = await apiRequest<ExercisePage>(`${endpoint}?${params.toString()}`);
    allExercises = allExercises.concat(res.exercises);
    
    if (!res.pagination?.total || allExercises.length >= res.pagination.total || res.exercises.length === 0) {
      break;
    }
    page++;
  }
  
  return allExercises;
}

export function useGetAdminExercises(status?: "active") {
  return useQuery({
    queryKey: ["admin", "exercises", status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      return fetchAllPages("/admin/exercises", params);
    },
  });
}

export function useGetClientExercises() {
  return useQuery({
    queryKey: ["client", "exercises"],
    queryFn: async () => {
      const params = new URLSearchParams();
      return fetchAllPages("/exercises", params);
    },
  });
}
