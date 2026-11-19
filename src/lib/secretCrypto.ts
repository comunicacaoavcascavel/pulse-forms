import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
  const secret = process.env.TENANT_SECRET_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error('TENANT_SECRET_ENCRYPTION_KEY precisa estar configurada no servidor.');
  }

  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptSecret(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(':');

  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Formato de segredo criptografado inválido.');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivValue, 'base64url'),
  );

  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function maskSecret(value?: string | null) {
  if (!value) return 'Não configurada';
  return 'Configurada com segurança';
}
