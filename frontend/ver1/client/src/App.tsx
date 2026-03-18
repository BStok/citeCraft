import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Compare from "@/pages/Compare";
import Understand from "@/pages/Understand";
import Collection from "@/pages/Collection";
import Login from "@/pages/Login";
import { getToken } from "@shared/routes";
import History from "@/pages/History";


function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const token = getToken();
  if (!token) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/compare" component={() => <ProtectedRoute component={Compare} />} />
      <Route path="/understand" component={Understand} />
      <Route path="/collections/:id" component={() => <ProtectedRoute component={Collection} />} />
      <Route path="/history" component={() => <ProtectedRoute component={History} />} />

      <Route component={NotFound} />
    </Switch>
  );
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;