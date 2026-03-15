import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, FileText, ExternalLink, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollections, useAddPaperToCollection } from "@/hooks/use-collections";
import { useSavePaper } from "@/hooks/use-papers";

interface PaperProps {
  paper: any;
  onSelect?: (checked: boolean) => void;
  selected?: boolean;
}

export function PaperCard({ paper, onSelect, selected }: PaperProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: collections } = useCollections();
  const savePaper = useSavePaper();
  const addToCollection = useAddPaperToCollection();

  const handleAddToCollection = async (collectionId: number) => {
    // First ensure paper is saved to DB
    let paperId = paper.id;
    if (!paper.id || typeof paper.id !== 'number') { // Mock check
       // In a real app, we'd check if we need to save first.
       // For this demo, assume we save then add.
       try {
         const saved = await savePaper.mutateAsync(paper);
         paperId = saved.id;
       } catch (e) {
         console.error("Failed to save paper first", e);
         return;
       }
    }
    
    addToCollection.mutate({ collectionId, paperId });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-border/60">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Badge variant="secondary" className="font-normal">{paper.category || "Research"}</Badge>
              <span>{paper.publicationDate}</span>
              <span className="text-border">|</span>
              <span>{paper.source || "Unknown Source"}</span>
            </div>
            <CardTitle className="text-lg font-display leading-tight">
              <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                {paper.title}
              </a>
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              {paper.authors}
            </CardDescription>
          </div>
          {onSelect && (
             <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`select-${paper.doi}`} 
                  checked={selected}
                  onCheckedChange={(c) => onSelect(c === true)}
                />
             </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {expanded ? paper.abstract : `${paper.abstract?.substring(0, 180)}...`}
        </div>
        
        {paper.abstract && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 h-auto p-0 text-primary hover:text-primary/80 font-medium"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <span className="flex items-center gap-1">Show Less <ChevronUp className="w-3 h-3"/></span>
            ) : (
              <span className="flex items-center gap-1">Read Abstract <ChevronDown className="w-3 h-3"/></span>
            )}
          </Button>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex justify-between border-t border-border/40 mt-4 p-4 bg-muted/10">
        <div className="flex gap-2">
          {paper.pdfLink && (
            <Button variant="outline" size="sm" asChild className="h-8 gap-2">
              <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer">
                <FileText className="w-3.5 h-3.5" /> PDF
              </a>
            </Button>
          )}
          {paper.doi && (
            <Button variant="ghost" size="sm" asChild className="h-8 gap-2 text-muted-foreground">
              <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" /> DOI
              </a>
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="default" className="h-8 gap-2">
              <Plus className="w-3.5 h-3.5" /> Add to Collection
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {collections?.map((collection) => (
              <DropdownMenuItem 
                key={collection.id}
                onClick={() => handleAddToCollection(collection.id)}
              >
                {collection.name}
              </DropdownMenuItem>
            ))}
            {!collections?.length && (
              <DropdownMenuItem disabled>No collections created</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
