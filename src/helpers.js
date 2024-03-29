const { exec } = require("child_process");

class Queue {
  constructor(maxLength) {
    this.arr = new Array(maxLength);
    this.maxLength = maxLength;
    this.head = 0;
    this.tail = 0;
  }
  push(line) {
    this.arr[this.tail] = line;
    this.tail = (this.tail + 1) % this.maxLength;
    if (this.tail === this.head) this.head = (this.head + 1) % this.maxLength;
  }
  reset() {
    this.head = 0;
    this.tail = 0;
  }
  get() {
    const res = [];
    let idx = this.head;
    while (idx !== this.tail) {
      res.push(this.arr[idx]);
      idx = (idx + 1) % this.maxLength;
    }
    this.reset();
    return res;
  }
}

class Cache {
  constructor() {
    this.map = new Map();
  }
  get(key) {
    return this.map.get(key);
  }
  set(key, value) {
    this.map.set(key, value);
  }
}

module.exports = {
  adjustDate: (dateStr) => {
    try {
      const date = new Date(dateStr);
      date.setSeconds(date.getSeconds() - 1);
      return date.toISOString();
    } catch (err) {
      return null;
    }
  },
  formatDate: function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    // Format date as dd.mm.yyyy HH:MM
    const formattedDate = date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Calculate relative time
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let relativeTime;

    if (diffDays > 1) {
      relativeTime = `${diffDays} days ago`;
    } else if (diffHours > 1) {
      relativeTime = `${diffHours} hours ago`;
    } else if (diffMinutes > 1) {
      relativeTime = `${diffMinutes} minutes ago`;
    } else {
      relativeTime = "just now";
    }
    return `${formattedDate} (approximately ${relativeTime})`;
  },

  executeCommand: function executeCommand(command, cwd) {
    return new Promise((resolve, reject) => {
      exec(
        command,
        { cwd, maxBuffer: 1024 * 1024 * 10 },
        (error, stdout, stderr) => {
          if (error) reject(error);
          if (stderr) reject(new Error(stderr));
          resolve(stdout);
        }
      );
    });
  },
  Queue,
  Cache,
};
