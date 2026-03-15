import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Pipeline from "@/pages/Pipeline";
import Clientes from "@/pages/Clientes";
import CalendarioClientes from "@/pages/CalendarioClientes";
import Renovacoes from "@/pages/Renovacoes";
import Mensagens from "@/pages/Mensagens";
import Configuracoes from "@/pages/Configuracoes";
import Login from "@/pages/Login";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <AppLayout>
                    <OutletRoutes />
                  </AppLayout>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

function OutletRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/pipeline" element={<Pipeline />} />
      <Route path="/clientes" element={<Clientes />} />
      <Route path="/calendario-clientes" element={<CalendarioClientes />} />
      <Route path="/renovacoes" element={<Renovacoes />} />
      <Route path="/clientes/:id" element={<Clientes />} />
      <Route path="/mensagens" element={<Mensagens />} />
      <Route path="/configuracoes" element={<Configuracoes />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
