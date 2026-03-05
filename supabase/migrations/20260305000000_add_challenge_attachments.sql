-- Add attachment support to challenges table
ALTER TABLE challenges 
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_filename TEXT,
ADD COLUMN attachment_description TEXT;

-- Add comment
COMMENT ON COLUMN challenges.attachment_url IS 'URL to uploaded file attachment for the challenge';
COMMENT ON COLUMN challenges.attachment_filename IS 'Original filename of the attachment';
COMMENT ON COLUMN challenges.attachment_description IS 'Description of what the attachment contains';
