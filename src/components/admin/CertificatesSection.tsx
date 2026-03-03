import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Award, Eye, Send, Edit } from 'lucide-react';
import { useCertificates } from '@/hooks/useCertificates';
import { supabase } from '@/integrations/supabase/client';
import { CertificateTemplateEditor } from './CertificateTemplateEditor';

interface CertificateTemplate {
  id: number;
  type: string;
  name: string;
  description: string;
  html_template: string;
}

interface User {
  user_id: string;
  full_name: string;
  email: string;
  challenges_solved: number;
  total_points: number;
}

interface CertificatesSectionProps {
  users: User[];
  eventTitle: string;
}

export const CertificatesSection = ({ users, eventTitle }: CertificatesSectionProps) => {
  const { generateAndSendCertificate, previewCertificate, loading } = useCertificates();
  const [selectedUser, setSelectedUser] = useState('');
  const [certificateType, setCertificateType] = useState<'participation' | 'winner' | 'special'>('participation');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('certificate_templates')
      .select('*')
      .order('type');
    
    if (!error && data) {
      setTemplates(data);
    }
  };

  const handleSendCertificate = async () => {
    const user = users.find(u => u.user_id === selectedUser);
    const template = templates.find(t => t.type === certificateType);
    if (!user || !template) return;

    const result = await generateAndSendCertificate(
      user.user_id,
      user.full_name,
      user.email,
      certificateType,
      eventTitle,
      template.html_template,
      additionalInfo || undefined
    );

    if (result.success) {
      setDialogOpen(false);
      setSelectedUser('');
      setCertificateType('participation');
      setAdditionalInfo('');
    }
  };

  const handlePreview = () => {
    const user = users.find(u => u.user_id === selectedUser);
    const template = templates.find(t => t.type === certificateType);
    if (!user || !template) return;

    previewCertificate(
      certificateType,
      user.full_name,
      eventTitle,
      template.html_template,
      additionalInfo || undefined
    );
  };

  const handleEditTemplate = (type: string) => {
    const template = templates.find(t => t.type === type);
    if (template) {
      setEditingTemplate(template);
      setEditorOpen(true);
    }
  };

  const certificateTemplates = [
    {
      type: 'participation' as const,
      title: 'Participation Certificate',
      description: 'For all participants who completed the event',
      color: 'from-blue-500 to-blue-600',
      icon: '🎓',
      preview: 'Dark blue theme with GDG branding'
    },
    {
      type: 'winner' as const,
      title: 'Winner Certificate',
      description: 'For top performers and challenge winners',
      color: 'from-yellow-500 to-yellow-600',
      icon: '🏆',
      preview: 'Gold theme with trophy and achievement highlights'
    },
    {
      type: 'special' as const,
      title: 'Special Recognition',
      description: 'For outstanding contributions and special achievements',
      color: 'from-purple-500 to-pink-500',
      icon: '⭐',
      preview: 'Gradient theme with star and custom recognition'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gradient-cyber">Digital Certificates</h2>
          <p className="text-muted-foreground mt-1">Generate and send HTML certificates via email</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-neon">
              <Award className="w-4 h-4 mr-2" />
              Generate Certificate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate & Send Certificate</DialogTitle>
              <DialogDescription>
                Create a digital certificate and send it directly to the recipient's email
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* User Selection */}
              <div className="space-y-2">
                <Label>Select Recipient</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{user.full_name}</span>
                          <span className="text-xs text-muted-foreground ml-4">
                            {user.challenges_solved} solved • {user.total_points} pts
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedUser && (
                  <p className="text-xs text-muted-foreground">
                    Email: {users.find(u => u.user_id === selectedUser)?.email}
                  </p>
                )}
              </div>

              {/* Certificate Type Selection */}
              <div className="space-y-3">
                <Label>Certificate Template</Label>
                <div className="grid grid-cols-1 gap-3">
                  {certificateTemplates.map((template) => (
                    <button
                      key={template.type}
                      onClick={() => setCertificateType(template.type)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        certificateType === template.type
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{template.icon}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-base">{template.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Design: {template.preview}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-2">
                <Label>Additional Information (Optional)</Label>
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder={
                    certificateType === 'winner'
                      ? 'e.g., "Secured 1st place with 500 points in 45 minutes"'
                      : certificateType === 'special'
                      ? 'e.g., "For exceptional creativity in solving advanced challenges"'
                      : 'e.g., "Completed 8 out of 10 challenges"'
                  }
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This text will appear in the certificate description
                </p>
              </div>

              {/* Preview Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="font-medium">Certificate will be sent to:</span>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  {selectedUser ? (
                    <>
                      <div>{users.find(u => u.user_id === selectedUser)?.full_name}</div>
                      <div>{users.find(u => u.user_id === selectedUser)?.email}</div>
                    </>
                  ) : (
                    <div>Select a user to continue</div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!selectedUser || loading}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button
                className="btn-neon"
                onClick={handleSendCertificate}
                disabled={!selectedUser || loading}
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Generate & Send'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {certificateTemplates.map((template) => (
          <Card key={template.type} className="card-cyber overflow-hidden">
            <div className={`h-32 bg-gradient-to-br ${template.color} flex items-center justify-center text-6xl`}>
              {template.icon}
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2">{template.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
              <div className="text-xs text-muted-foreground mb-3">
                <div className="font-medium mb-1">Features:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Professional HTML design</li>
                  <li>GDG branding & colors</li>
                  <li>Printable & shareable</li>
                  <li>Sent via email instantly</li>
                </ul>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full btn-cyber"
                onClick={() => handleEditTemplate(template.type)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Editor Dialog */}
      {editingTemplate && (
        <CertificateTemplateEditor
          template={editingTemplate}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onSave={() => {
            fetchTemplates();
            setEditorOpen(false);
          }}
        />
      )}

      {/* Info Section */}
      <Card className="card-cyber">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            How It Works
          </h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <div className="font-medium text-foreground">Select a recipient</div>
                <div>Choose from the list of participants</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <div className="font-medium text-foreground">Choose a template</div>
                <div>Pick from Participation, Winner, or Special Recognition</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <div className="font-medium text-foreground">Add custom details</div>
                <div>Include specific achievements or recognition text</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                4
              </div>
              <div>
                <div className="font-medium text-foreground">Generate & send</div>
                <div>Certificate is generated and sent via email using Resend</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
