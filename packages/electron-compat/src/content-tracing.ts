export const contentTracing = {
  async getCategories(): Promise<string[]> { return []; },
  async startRecording(_options: unknown): Promise<void> {},
  async stopRecording(_resultFilePath: string): Promise<string> { return _resultFilePath; },
  async getTraceBufferUsage(): Promise<{ value: number; percentage: number }> {
    return { value: 0, percentage: 0 };
  },
};
