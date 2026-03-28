export interface PublicConfig {
  whatsappLink: string | null;
  whatsappNumber: string | null;
  welcomeMessage: string | null;
}

interface PublicConfigResponse {
  whatsappNumber?: string | null;
  welcomeMessage?: string | null;
}

export async function getPublicConfig(): Promise<PublicConfig> {
  const response = await fetch('/api/public-config');
  if (!response.ok) {
    throw new Error('Unable to load public configuration.');
  }

  const payload = (await response.json()) as PublicConfigResponse;
  const whatsappNumber = typeof payload.whatsappNumber === 'string' ? payload.whatsappNumber.replace(/\D/g, '') : '';
  const welcomeMessage = typeof payload.welcomeMessage === 'string' ? payload.welcomeMessage : '';

  return {
    whatsappNumber: whatsappNumber || null,
    welcomeMessage: welcomeMessage || null,
    whatsappLink: whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(welcomeMessage || 'Hi! I need help from JanVaani')}` : null,
  };
}
