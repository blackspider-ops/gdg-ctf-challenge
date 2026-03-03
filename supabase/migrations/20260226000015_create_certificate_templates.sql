-- Create certificate templates table
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id bigserial PRIMARY KEY,
  type text NOT NULL UNIQUE CHECK (type IN ('participation', 'winner', 'special')),
  name text NOT NULL,
  description text,
  html_template text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read templates
CREATE POLICY "Anyone can read certificate templates"
  ON public.certificate_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update templates
CREATE POLICY "Admins can update certificate templates"
  ON public.certificate_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Insert default templates
INSERT INTO public.certificate_templates (type, name, description, html_template) VALUES
('participation', 'Participation Certificate', 'For all participants who completed the event', '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url(''https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Roboto:wght@300;400&display=swap'');
    body { margin: 0; padding: 0; font-family: ''Roboto'', sans-serif; }
    .certificate { 
      width: 1200px; 
      height: 850px; 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      position: relative;
      overflow: hidden;
    }
    .border { 
      position: absolute;
      inset: 30px;
      border: 3px solid #4285F4;
      border-radius: 20px;
    }
    .inner-border {
      position: absolute;
      inset: 45px;
      border: 1px solid rgba(66, 133, 244, 0.3);
      border-radius: 15px;
    }
    .title {
      position: absolute;
      top: 160px;
      width: 100%;
      text-align: center;
      font-family: ''Playfair Display'', serif;
      font-size: 56px;
      color: #4285F4;
      letter-spacing: 4px;
    }
    .subtitle {
      position: absolute;
      top: 230px;
      width: 100%;
      text-align: center;
      font-size: 20px;
      color: #FBBC04;
      letter-spacing: 8px;
      text-transform: uppercase;
    }
    .recipient {
      position: absolute;
      top: 340px;
      width: 100%;
      text-align: center;
      font-size: 48px;
      color: #ffffff;
      font-weight: 300;
    }
    .recipient-name {
      font-family: ''Playfair Display'', serif;
      font-weight: 700;
      color: #4285F4;
      display: block;
      margin-top: 10px;
      font-size: 56px;
    }
    .description {
      position: absolute;
      top: 500px;
      width: 100%;
      text-align: center;
      font-size: 18px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.6;
      padding: 0 150px;
    }
    .event-name {
      color: #34A853;
      font-weight: 400;
    }
    .footer {
      position: absolute;
      bottom: 80px;
      width: 100%;
      display: flex;
      justify-content: space-around;
      padding: 0 200px;
    }
    .signature {
      text-align: center;
    }
    .signature-line {
      width: 200px;
      height: 2px;
      background: rgba(66, 133, 244, 0.5);
      margin: 0 auto 10px;
    }
    .signature-name {
      font-size: 16px;
      color: #ffffff;
      font-weight: 400;
    }
    .signature-title {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }
    .date {
      position: absolute;
      bottom: 40px;
      right: 80px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }
    .gdg-colors {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: linear-gradient(90deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%);
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="border"></div>
    <div class="inner-border"></div>
    <div class="title">CERTIFICATE</div>
    <div class="subtitle">OF PARTICIPATION</div>
    <div class="recipient">
      This is to certify that
      <span class="recipient-name">{{RECIPIENT_NAME}}</span>
    </div>
    <div class="description">
      has successfully participated in <span class="event-name">{{EVENT_TITLE}}</span><br>
      demonstrating enthusiasm and commitment to learning cybersecurity<br>
      and problem-solving skills through Capture The Flag challenges.
      {{#ADDITIONAL_INFO}}<br><br>{{ADDITIONAL_INFO}}{{/ADDITIONAL_INFO}}
    </div>
    <div class="footer">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-name">GDG Penn State</div>
        <div class="signature-title">Organizing Team</div>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-name">Event Coordinator</div>
        <div class="signature-title">Google Developers Group</div>
      </div>
    </div>
    <div class="date">{{DATE}}</div>
    <div class="gdg-colors"></div>
  </div>
</body>
</html>'),

('winner', 'Winner Certificate', 'For top performers and challenge winners', '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url(''https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Roboto:wght@300;400&display=swap'');
    body { margin: 0; padding: 0; font-family: ''Roboto'', sans-serif; }
    .certificate { 
      width: 1200px; 
      height: 850px; 
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      position: relative;
      overflow: hidden;
    }
    .trophy-bg {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 400px;
      opacity: 0.05;
      color: #FBBC04;
    }
    .border { 
      position: absolute;
      inset: 30px;
      border: 4px solid #FBBC04;
      border-radius: 20px;
      box-shadow: inset 0 0 30px rgba(251, 188, 4, 0.3);
    }
    .inner-border {
      position: absolute;
      inset: 45px;
      border: 2px solid rgba(251, 188, 4, 0.5);
      border-radius: 15px;
    }
    .title {
      position: absolute;
      top: 140px;
      width: 100%;
      text-align: center;
      font-family: ''Playfair Display'', serif;
      font-size: 64px;
      color: #FBBC04;
      letter-spacing: 6px;
      text-shadow: 0 0 20px rgba(251, 188, 4, 0.5);
    }
    .subtitle {
      position: absolute;
      top: 220px;
      width: 100%;
      text-align: center;
      font-size: 24px;
      color: #EA4335;
      letter-spacing: 10px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .trophy {
      position: absolute;
      top: 280px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 60px;
    }
    .recipient {
      position: absolute;
      top: 370px;
      width: 100%;
      text-align: center;
      font-size: 42px;
      color: #ffffff;
      font-weight: 300;
    }
    .recipient-name {
      font-family: ''Playfair Display'', serif;
      font-weight: 700;
      color: #FBBC04;
      display: block;
      margin-top: 10px;
      font-size: 58px;
      text-shadow: 0 0 15px rgba(251, 188, 4, 0.4);
    }
    .description {
      position: absolute;
      top: 520px;
      width: 100%;
      text-align: center;
      font-size: 20px;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.8;
      padding: 0 150px;
    }
    .event-name {
      color: #4285F4;
      font-weight: 400;
    }
    .achievement {
      color: #34A853;
      font-weight: 700;
    }
    .footer {
      position: absolute;
      bottom: 80px;
      width: 100%;
      display: flex;
      justify-content: space-around;
      padding: 0 200px;
    }
    .signature {
      text-align: center;
    }
    .signature-line {
      width: 200px;
      height: 2px;
      background: rgba(251, 188, 4, 0.7);
      margin: 0 auto 10px;
    }
    .signature-name {
      font-size: 16px;
      color: #ffffff;
      font-weight: 400;
    }
    .signature-title {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }
    .date {
      position: absolute;
      bottom: 40px;
      right: 80px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }
    .gdg-colors {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 10px;
      background: linear-gradient(90deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%);
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="trophy-bg">🏆</div>
    <div class="border"></div>
    <div class="inner-border"></div>
    <div class="title">CHAMPION</div>
    <div class="subtitle">CERTIFICATE OF EXCELLENCE</div>
    <div class="trophy">🏆</div>
    <div class="recipient">
      Awarded to
      <span class="recipient-name">{{RECIPIENT_NAME}}</span>
    </div>
    <div class="description">
      for <span class="achievement">outstanding performance</span> in <span class="event-name">{{EVENT_TITLE}}</span><br>
      {{#ADDITIONAL_INFO}}{{ADDITIONAL_INFO}}{{/ADDITIONAL_INFO}}
      {{^ADDITIONAL_INFO}}demonstrating exceptional problem-solving skills and technical expertise{{/ADDITIONAL_INFO}}
    </div>
    <div class="footer">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-name">GDG Penn State</div>
        <div class="signature-title">Organizing Team</div>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-name">Event Coordinator</div>
        <div class="signature-title">Google Developers Group</div>
      </div>
    </div>
    <div class="date">{{DATE}}</div>
    <div class="gdg-colors"></div>
  </div>
</body>
</html>'),

('special', 'Special Recognition', 'For outstanding contributions and special achievements', '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url(''https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Roboto:wght@300;400&display=swap'');
    body { margin: 0; padding: 0; font-family: ''Roboto'', sans-serif; }
    .certificate { 
      width: 1200px; 
      height: 850px; 
      background: linear-gradient(135deg, #141E30 0%, #243B55 100%);
      position: relative;
      overflow: hidden;
    }
    .star-bg {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 500px;
      opacity: 0.04;
      color: #EA4335;
    }
    .border { 
      position: absolute;
      inset: 30px;
      border: 3px solid;
      border-image: linear-gradient(135deg, #4285F4, #EA4335, #FBBC04, #34A853) 1;
      border-radius: 20px;
    }
    .inner-border {
      position: absolute;
      inset: 45px;
      border: 1px solid rgba(234, 67, 53, 0.4);
      border-radius: 15px;
    }
    .title {
      position: absolute;
      top: 150px;
      width: 100%;
      text-align: center;
      font-family: ''Playfair Display'', serif;
      font-size: 58px;
      background: linear-gradient(90deg, #4285F4, #EA4335, #FBBC04, #34A853);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 5px;
    }
    .subtitle {
      position: absolute;
      top: 225px;
      width: 100%;
      text-align: center;
      font-size: 22px;
      color: #EA4335;
      letter-spacing: 9px;
      text-transform: uppercase;
    }
    .star {
      position: absolute;
      top: 290px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 50px;
    }
    .recipient {
      position: absolute;
      top: 370px;
      width: 100%;
      text-align: center;
      font-size: 44px;
      color: #ffffff;
      font-weight: 300;
    }
    .recipient-name {
      font-family: ''Playfair Display'', serif;
      font-weight: 700;
      background: linear-gradient(90deg, #4285F4, #EA4335);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: block;
      margin-top: 10px;
      font-size: 56px;
    }
    .description {
      position: absolute;
      top: 510px;
      width: 100%;
      text-align: center;
      font-size: 19px;
      color: rgba(255, 255, 255, 0.85);
      line-height: 1.7;
      padding: 0 120px;
    }
    .event-name {
      color: #34A853;
      font-weight: 400;
    }
    .special-text {
      color: #FBBC04;
      font-weight: 700;
    }
    .footer {
      position: absolute;
      bottom: 80px;
      width: 100%;
      display: flex;
      justify-content: space-around;
      padding: 0 200px;
    }
    .signature {
      text-align: center;
    }
    .signature-line {
      width: 200px;
      height: 2px;
      background: linear-gradient(90deg, #4285F4, #EA4335);
      margin: 0 auto 10px;
    }
    .signature-name {
      font-size: 16px;
      color: #ffffff;
      font-weight: 400;
    }
    .signature-title {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }
    .date {
      position: absolute;
      bottom: 40px;
      right: 80px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }
    .gdg-colors {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 10px;
      background: linear-gradient(90deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%);
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="star-bg">⭐</div>
    <div class="border"></div>
    <div class="inner-border"></div>
    <div class="title">SPECIAL RECOGNITION</div>
    <div class="subtitle">CERTIFICATE OF ACHIEVEMENT</div>
    <div class="star">⭐</div>
    <div class="recipient">
      Presented to
      <span class="recipient-name">{{RECIPIENT_NAME}}</span>
    </div>
    <div class="description">
      for <span class="special-text">exceptional contribution</span> to <span class="event-name">{{EVENT_TITLE}}</span><br>
      {{#ADDITIONAL_INFO}}{{ADDITIONAL_INFO}}{{/ADDITIONAL_INFO}}
      {{^ADDITIONAL_INFO}}demonstrating remarkable dedication, creativity, and technical excellence{{/ADDITIONAL_INFO}}
    </div>
    <div class="footer">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-name">GDG Penn State</div>
        <div class="signature-title">Organizing Team</div>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-name">Event Coordinator</div>
        <div class="signature-title">Google Developers Group</div>
      </div>
    </div>
    <div class="date">{{DATE}}</div>
    <div class="gdg-colors"></div>
  </div>
</body>
</html>');

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_certificate_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certificate_template_updated_at
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_certificate_template_updated_at();
