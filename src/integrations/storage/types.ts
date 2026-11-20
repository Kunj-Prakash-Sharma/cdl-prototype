export interface StorageProvider {
  uploadUrl(key: string, contentType: string, expiresInSec: number): Promise<string>;
  downloadUrl(key: string, expiresInSec: number): Promise<string>;
  remove(key: string): Promise<void>;
}
