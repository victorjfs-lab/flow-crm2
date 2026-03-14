import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SyncContactsButton() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sync/hubspot", {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Nao foi possivel atualizar os contatos.");
      }

      return payload as { imported: number; found: number; message: string };
    },
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["crm-clientes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-pipeline-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-dashboard-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-renovacoes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-calendario-page"] }),
      ]);

      toast({
        title: "Contatos atualizados",
        description: `${payload.imported} registros sincronizados de ${payload.found} encontrados no HubSpot.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar contatos",
        description: error instanceof Error ? error.message : "Nao foi possivel sincronizar o HubSpot.",
        variant: "destructive",
      });
    },
  });

  return (
    <button
      type="button"
      onClick={() => void syncMutation.mutateAsync()}
      disabled={syncMutation.isPending}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
      {syncMutation.isPending ? "Atualizando..." : "Atualizar contatos"}
    </button>
  );
}
