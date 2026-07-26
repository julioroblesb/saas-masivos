export interface WhatsAppConnectionState {
  state: string;
}

export interface WhatsAppQrCode {
  qrCode: string | null;
}

export interface WhatsAppMessageReceipt {
  providerMessageId: string | null;
}

export interface WhatsAppProvider {
  createInstance(instanceName: string): Promise<WhatsAppQrCode>;
  configureWebhook(
    instanceName: string,
    webhookUrl: string,
    secret: string,
    companyId: string,
  ): Promise<void>;
  getConnectionState(instanceName: string): Promise<WhatsAppConnectionState>;
  getQrCode(instanceName: string): Promise<WhatsAppQrCode>;
  sendText(instanceName: string, number: string, text: string): Promise<WhatsAppMessageReceipt>;
  sendMedia(
    instanceName: string,
    number: string,
    mediaUrl: string,
    caption: string,
  ): Promise<WhatsAppMessageReceipt>;
  logoutInstance(instanceName: string): Promise<void>;
  deleteInstance(instanceName: string): Promise<void>;
}
