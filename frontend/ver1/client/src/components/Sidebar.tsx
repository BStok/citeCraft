import { Link, useLocation } from "wouter";
import { GooglyEyes } from "@/components/GooglyEyes";
import { Search, Scale, Library, Plus, LayoutDashboard, BookOpen, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollections, useCreateCollection } from "@/hooks/use-collections";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { clearToken } from "@shared/routes";
import { useLocation as useNav } from "wouter";
import { z } from "zod";

const collectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export function Sidebar() {
  const [location] = useLocation();
  const [, navigate] = useNav();
  const { data: collections } = useCollections();
  const createCollection = useCreateCollection();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const username = localStorage.getItem("username") || "User";
  const initials = username.slice(0, 2).toUpperCase();

  const handleCreate = () => {
    if (!name.trim()) return;
    createCollection.mutate({ name, description }, {
      onSuccess: () => {
        setOpen(false);
        setName("");
        setDescription("");
      },
    });
  };

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("username");
    navigate("/login");
  };

  const navItems = [
    { name: "Paper Retrieval",    icon: Search,   href: "/"            },
    { name: "Comparison",         icon: Scale,    href: "/compare"     },
    { name: "Paper Understanding",icon: BookOpen, href: "/understand"  },
    { name: "History",            icon: History,  href: "/history"     },
  ];

  return (
    <div className="w-64 border-r border-border h-screen bg-card flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <h1 className="text-xl font-display font-bold text-primary flex items-center gap-2">
          <GooglyEyes size={25} />
          CiteCraft
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Tools
        </p>
        {navItems.map((item) => (
          <Link key={item.name} href={item.href}>
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              location === item.href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <item.icon className="w-4 h-4" />
              {item.name}
            </div>
          </Link>
        ))}

        <div className="pt-8">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Collections
            </p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Collection</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input
                    placeholder="Collection name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <Button onClick={handleCreate} disabled={createCollection.isPending} className="w-full">
                    {createCollection.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            {collections?.map((collection: any) => (
              <Link key={collection.id} href={`/collections/${collection.id}`}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  location === `/collections/${collection.id}`
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <Library className="w-4 h-4" />
                  <span className="truncate">{collection.name}</span>
                </div>
              </Link>
            ))}
            {!collections?.length && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center border-2 border-dashed border-border rounded-lg mx-2">
                No collections yet
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {initials}
            </div>
            <div className="text-sm">
              <p className="font-medium">{username}</p>
              <p className="text-xs text-muted-foreground">Researcher</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}