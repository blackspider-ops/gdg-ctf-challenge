// Certificate HTML Templates with variable replacement
export const replaceCertificateVariables = (
  htmlTemplate: string,
  recipientName: string,
  eventTitle: string,
  date: string,
  additionalInfo?: string
): string => {
  let html = htmlTemplate;
  
  // Replace simple variables
  html = html.replace(/\{\{RECIPIENT_NAME\}\}/g, recipientName);
  html = html.replace(/\{\{EVENT_TITLE\}\}/g, eventTitle);
  html = html.replace(/\{\{DATE\}\}/g, date);
  
  // Handle conditional blocks for ADDITIONAL_INFO
  if (additionalInfo) {
    // Replace {{#ADDITIONAL_INFO}}...{{/ADDITIONAL_INFO}} with content
    html = html.replace(
      /\{\{#ADDITIONAL_INFO\}\}(.*?)\{\{\/ADDITIONAL_INFO\}\}/gs,
      (match, content) => content.replace(/\{\{ADDITIONAL_INFO\}\}/g, additionalInfo)
    );
    // Remove {{^ADDITIONAL_INFO}}...{{/ADDITIONAL_INFO}} blocks
    html = html.replace(/\{\{\^ADDITIONAL_INFO\}\}.*?\{\{\/ADDITIONAL_INFO\}\}/gs, '');
  } else {
    // Remove {{#ADDITIONAL_INFO}}...{{/ADDITIONAL_INFO}} blocks
    html = html.replace(/\{\{#ADDITIONAL_INFO\}\}.*?\{\{\/ADDITIONAL_INFO\}\}/gs, '');
    // Replace {{^ADDITIONAL_INFO}}...{{/ADDITIONAL_INFO}} with content
    html = html.replace(/\{\{\^ADDITIONAL_INFO\}\}(.*?)\{\{\/ADDITIONAL_INFO\}\}/gs, '$1');
  }
  
  return html;
};

export const generateCertificateHTML = (
  htmlTemplate: string,
  recipientName: string,
  eventTitle: string,
  date: string,
  additionalInfo?: string
): string => {
  return replaceCertificateVariables(
    htmlTemplate,
    recipientName,
    eventTitle,
    date,
    additionalInfo
  );
};
