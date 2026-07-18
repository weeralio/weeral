-- Ajout de l'adresse d'envoi par défaut sur la séquence
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS sender_identity_id UUID REFERENCES sender_identities(id);
