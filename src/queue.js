import { sleep, debug } from './utils.js';

const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export class ActionQueue {
  constructor(minDelay = 2000, maxDelay = 4500) {
    this.queue = [];
    this.processing = false;
    this.minDelay = Number(minDelay);
    this.maxDelay = Number(maxDelay);
  }

  enqueue(task) {
    this.queue.push(task);
    if (!this.processing) this.process();
  }

  async process() {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      try {
        await sleep(randomDelay(this.minDelay, this.maxDelay));
        await task();
      } catch (err) {
        debug('[Queue Task Error]', err.message);
      }
    }
    this.processing = false;
  }
}
