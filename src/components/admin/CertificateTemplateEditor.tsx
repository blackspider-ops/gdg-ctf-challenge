import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Eye, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { replaceCertificateVariables } from '@/components/certificates/CertificateTemplates';

interface CertificateTemplate {
  id: number;
  type: string;
  name: string;
  description: string;
  html_template: string;
}

interface CertificateTemplateEditorProps {
  template: CertificateTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export const CertificateTemplateEditor = ({
  template,
  open,
  onOpenChange,
  onSave
}: CertificateTemplateEditorProps) => {
  const [htmlCode, setHtmlCode] = useState(template.html_template);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    setHtmlCode(template.html_template);
  }, [template]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('certificate_templates')
        .update({ html_template: htmlCode })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template saved successfully",
      });
      onSave();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to the saved version?')) {
      setHtmlCode(template.html_template);
      setPreviewKey(prev => prev + 1);
    }
  };

  const getPreviewHTML = () => {
    return replaceCertificateVariables(
      htmlCode,
      'John Doe',
      'GDG CTF Challenge 2026',
      new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      'Secured 1st place with 500 points in 45 minutes'
    );
  };

  const handlePreviewRefresh = () => {
    setPreviewKey(prev => prev + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit {template.name}</DialogTitle>
          <DialogDescription>
            Edit the HTML template. Use variables: {'{'}{'{'} RECIPIENT_NAME {'}'}{'}'},  {'{'}{'{'} EVENT_TITLE {'}'}{'}'},  {'{'}{'{'} DATE {'}'}{'}'},  {'{'}{'{'} ADDITIONAL_INFO {'}'}{'}'} 
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="editor" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor">
              <Code className="w-4 h-4 mr-2" />
              HTML Editor
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Live Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 overflow-hidden mt-4">
            <div className="h-full flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label>HTML Template Code</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                    className="btn-cyber"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePreviewRefresh}
                    className="btn-cyber"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Refresh Preview
                  </Button>
                </div>
              </div>
              <Textarea
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                className="flex-1 font-mono text-sm resize-none"
                placeholder="Enter HTML template code..."
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <div><strong>Available Variables:</strong></div>
                <div>• {'{'}{'{'} RECIPIENT_NAME {'}'}{'}'}  - Recipient's full name</div>
                <div>• {'{'}{'{'} EVENT_TITLE {'}'}{'}'}  - Event title</div>
                <div>• {'{'}{'{'} DATE {'}'}{'}'}  - Certificate date</div>
                <div>• {'{'}{'{'} ADDITIONAL_INFO {'}'}{'}'}  - Custom achievement text</div>
                <div className="mt-2"><strong>Conditional Blocks:</strong></div>
                <div>• {'{'}{'{'} #ADDITIONAL_INFO {'}'}{'}'}  ...content... {'{'}{'{'} /ADDITIONAL_INFO {'}'}{'}'}  - Show if additional info exists</div>
                <div>• {'{'}{'{'} ^ADDITIONAL_INFO {'}'}{'}'}  ...content... {'{'}{'{'} /ADDITIONAL_INFO {'}'}{'}'}  - Show if additional info doesn't exist</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
            <div className="h-full flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label>Preview (Sample Data)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePreviewRefresh}
                  className="btn-cyber"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <div className="flex-1 border border-border rounded-lg overflow-auto bg-muted/20">
                <iframe
                  key={previewKey}
                  srcDoc={getPreviewHTML()}
                  className="w-full h-full border-0"
                  title="Certificate Preview"
                  sandbox="allow-same-origin"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Preview uses sample data: John Doe, GDG CTF Challenge 2026, with achievement text
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="btn-neon"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
