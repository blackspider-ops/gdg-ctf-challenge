import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateCertificateHTML } from '@/components/certificates/CertificateTemplates';
import { useToast } from './use-toast';

export const useCertificates = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateAndSendCertificate = async (
    userId: string,
    userName: string,
    userEmail: string,
    type: 'participation' | 'winner' | 'special',
    eventTitle: string,
    htmlTemplate: string,
    additionalInfo?: string
  ) => {
    setLoading(true);
    try {
      // Generate certificate HTML
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const certificateHTML = generateCertificateHTML(
        htmlTemplate,
        userName,
        eventTitle,
        date,
        additionalInfo
      );

      // Save certificate record to database
      const { data: certData, error: certError } = await supabase
        .from('certificates')
        .insert([{
          user_id: userId,
          type: type === 'winner' ? 'champion' : type,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Certificate`,
          description: additionalInfo || `Certificate for ${eventTitle}`,
          status: 'approved',
          certificate_url: null, // We're sending via email, not storing
        }])
        .select()
        .single();

      if (certError) throw certError;

      // Send certificate via email - use anon key for Edge Functions
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jayrsxmujxwnnxvizfuo.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-certificate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          recipientEmail: userEmail,
          recipientName: userName,
          certificateHTML,
          certificateType: type,
          eventTitle,
          certificateId: certData.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function error:', errorText);
        throw new Error(`Failed to send certificate: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      console.log('Certificate sent successfully:', data);

      toast({
        title: "Success!",
        description: `Certificate sent to ${userName} at ${userEmail}`,
      });

      return { success: true, data: certData };
    } catch (error: any) {
      console.error('Error generating/sending certificate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate and send certificate",
        variant: "destructive"
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const previewCertificate = (
    type: 'participation' | 'winner' | 'special',
    userName: string,
    eventTitle: string,
    htmlTemplate: string,
    additionalInfo?: string
  ) => {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const certificateHTML = generateCertificateHTML(
      htmlTemplate,
      userName,
      eventTitle,
      date,
      additionalInfo
    );

    // Open in new window
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(certificateHTML);
      previewWindow.document.close();
    }
  };

  return {
    generateAndSendCertificate,
    previewCertificate,
    loading
  };
};
