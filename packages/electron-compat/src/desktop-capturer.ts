export interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail: unknown;
  display_id: string;
  appIcon: unknown;
}

export const desktopCapturer = {
  async getSources(_options: { types: string[] }): Promise<DesktopCapturerSource[]> {
    return [];
  },
};
