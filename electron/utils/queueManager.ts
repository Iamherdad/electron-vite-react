class QueueManager {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  async addTask(task: () => Promise<void>) {
    this.queue.push(task);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const task = this.queue.shift();
    if (task) {
      await task();
    }
    this.isProcessing = false;
    this.processQueue();
  }
}

export default QueueManager;
