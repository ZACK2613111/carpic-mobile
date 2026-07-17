import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  signedUrl,
  updateProject,
} from './projects.api';
import type { Project, ProjectPatch } from './types';

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['project', id] as const,
  signed: (path: string | null) => ['signed-url', path] as const,
};

export function useProjects() {
  return useQuery({ queryKey: projectKeys.all, queryFn: listProjects });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id ?? ''),
    queryFn: () => getProject(id as string),
    enabled: Boolean(id),
  });
}

export function useSignedUrl(path: string | null) {
  return useQuery({
    queryKey: projectKeys.signed(path),
    queryFn: () => signedUrl(path),
    enabled: Boolean(path),
    staleTime: 45 * 60 * 1000, // signed URLs last 1h; refetch a bit before
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createProject(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjectPatch }) => updateProject(id, patch),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      qc.setQueryData(projectKeys.detail(project.id), project);
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    // Optimistic: drop the card immediately, roll back if the delete fails.
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: projectKeys.all });
      const previous = qc.getQueryData<Project[]>(projectKeys.all);
      qc.setQueryData<Project[]>(projectKeys.all, (list) => (list ?? []).filter((p) => p.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(projectKeys.all, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
